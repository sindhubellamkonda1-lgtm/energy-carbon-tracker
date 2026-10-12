
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator

load_dotenv()

# ---------- Configuration ----------
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "energy_carbon_db")

ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173"
).split(",")

ORIGINS = [origin.strip() for origin in ORIGINS if origin.strip()]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

students_col = db["students"]
energy_col = db["energy_records"]
carbon_col = db["carbon_records"]


# ---------- Emission Factors (approximate, India) ----------
GRID_EF = 0.82  # kg CO2 per kWh of grid electricity

TRANSPORT_EF = {
    "walk": 0.0,
    "cycle": 0.0,
    "bus": 0.05,
    "metro": 0.03,
    "train": 0.04,
    "electric_scooter": 0.02,
    "two_wheeler": 0.045,
    "auto": 0.10,
    "car": 0.17,
}

DIET_EF = {
    "vegan": 1.5,
    "vegetarian": 1.7,
    "eggetarian": 2.0,
    "non_vegetarian": 2.5,
}

LPG_EF = 3.0  # kg CO2 per kg of LPG burned


# ---------- Application Lifespan ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await students_col.create_index("roll_no", unique=True)

    await energy_col.create_index(
        [("roll_no", 1), ("created_at", -1)]
    )

    await carbon_col.create_index(
        [("roll_no", 1), ("created_at", -1)]
    )

    yield

    client.close()


# ---------- FastAPI Application ----------
app = FastAPI(
    title="Energy & Carbon Tracker API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------
class StudentIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    year: int = Field(ge=1, le=4)
    roll_no: str = Field(min_length=3, max_length=30)
    branch: str = Field(min_length=1, max_length=40)
    section: str = Field(min_length=1, max_length=10)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=13)

    @field_validator("name", "branch")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("roll_no", "section")
    @classmethod
    def upper_text(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()

        if not re.fullmatch(r"\+?[0-9]{10,12}", v):
            raise ValueError(
                "Enter a valid phone number with 10-12 digits, "
                "optionally starting with +"
            )

        return v


class Appliance(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    watts: float = Field(ge=0, le=10000)
    quantity: int = Field(ge=0, le=100)
    hours_per_day: float = Field(ge=0, le=24)


class EnergyIn(BaseModel):
    roll_no: str
    appliances: List[Appliance] = Field(min_length=1)


class CarbonIn(BaseModel):
    roll_no: str
    electricity_kwh_per_day: float = Field(ge=0, le=500)
    transport_mode: Literal[tuple(TRANSPORT_EF.keys())]
    transport_km_per_day: float = Field(ge=0, le=500)
    diet: Literal[tuple(DIET_EF.keys())]
    lpg_kg_per_month: float = Field(ge=0, le=50)


# ---------- Helpers ----------
def norm_roll(roll_no: str) -> str:
    return roll_no.strip().upper()


def now() -> datetime:
    return datetime.now(timezone.utc)


async def require_student(roll_no: str) -> dict:
    student = await students_col.find_one(
        {"roll_no": roll_no},
        {"_id": 0},
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found. Register first.",
        )

    return student


# ---------- Health Check ----------
@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------- Student Registration ----------
@app.post("/api/students")
async def save_student(payload: StudentIn):
    """Create a student or update details for an existing roll number."""

    data = payload.model_dump()
    data["roll_no"] = norm_roll(data["roll_no"])

    await students_col.update_one(
        {"roll_no": data["roll_no"]},
        {
            "$set": data,
            "$setOnInsert": {"created_at": now()},
        },
        upsert=True,
    )

    return await students_col.find_one(
        {"roll_no": data["roll_no"]},
        {"_id": 0},
    )


# ---------- Energy Calculation ----------
@app.post("/api/energy")
async def save_energy(payload: EnergyIn):
    roll = norm_roll(payload.roll_no)

    await require_student(roll)

    breakdown = []

    for appliance in payload.appliances:
        kwh = (
            appliance.watts
            * appliance.quantity
            * appliance.hours_per_day
            / 1000
        )

        breakdown.append({
            **appliance.model_dump(),
            "daily_kwh": round(kwh, 3),
        })

    daily = round(
        sum(item["daily_kwh"] for item in breakdown),
        3,
    )

    doc = {
        "roll_no": roll,
        "appliances": breakdown,
        "daily_kwh": daily,
        "monthly_kwh": round(daily * 30, 2),
        "created_at": now(),
    }

    await energy_col.insert_one(doc.copy())

    return doc


# ---------- Carbon Footprint Calculation ----------
@app.post("/api/carbon")
async def save_carbon(payload: CarbonIn):
    roll = norm_roll(payload.roll_no)

    await require_student(roll)

    electricity = (
        payload.electricity_kwh_per_day * GRID_EF
    )

    transport = (
        payload.transport_km_per_day
        * TRANSPORT_EF[payload.transport_mode]
    )

    food = DIET_EF[payload.diet]

    cooking = (
        payload.lpg_kg_per_month / 30 * LPG_EF
    )

    daily = electricity + transport + food + cooking

    doc = {
        "roll_no": roll,
        "inputs": payload.model_dump(exclude={"roll_no"}),
        "breakdown_kg_per_day": {
            "electricity": round(electricity, 3),
            "transport": round(transport, 3),
            "food": round(food, 3),
            "cooking": round(cooking, 3),
        },
        "daily_co2_kg": round(daily, 3),
        "monthly_co2_kg": round(daily * 30, 2),
        "yearly_co2_kg": round(daily * 365, 1),
        "created_at": now(),
    }

    await carbon_col.insert_one(doc.copy())

    return doc


# ---------- Student Summary ----------
@app.get("/api/students/{roll_no}/summary")
async def student_summary(roll_no: str):
    roll = norm_roll(roll_no)

    student = await require_student(roll)

    energy = await energy_col.find_one(
        {"roll_no": roll},
        {"_id": 0},
        sort=[("created_at", -1)],
    )

    carbon = await carbon_col.find_one(
        {"roll_no": roll},
        {"_id": 0},
        sort=[("created_at", -1)],
    )

    return {
        "student": student,
        "energy": energy,
        "carbon": carbon,
    }


# ---------- Leaderboard Helpers ----------
def _norm(value, lo, hi):
    return 0.0 if hi == lo else (value - lo) / (hi - lo)


# ---------- Leaderboard ----------
@app.get("/api/leaderboard")
async def leaderboard():
    """
    Uses each student's latest energy and carbon record.

    Score (0-100, lower is better):
    50% normalized energy + 50% normalized CO2.

    Students with both calculations rank before students
    with only one calculation.
    """

    latest_energy = {
        d["_id"]: d["daily_kwh"]
        async for d in energy_col.aggregate([
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$roll_no",
                    "daily_kwh": {"$first": "$daily_kwh"},
                }
            },
        ])
    }

    latest_carbon = {
        d["_id"]: d["daily_co2_kg"]
        async for d in carbon_col.aggregate([
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$roll_no",
                    "daily_co2_kg": {"$first": "$daily_co2_kg"},
                }
            },
        ])
    }

    entries = []

    async for student in students_col.find({}, {"_id": 0}):
        roll = student["roll_no"]

        energy = latest_energy.get(roll)
        carbon = latest_carbon.get(roll)

        if energy is None and carbon is None:
            continue

        entries.append({
            "name": student["name"],
            "roll_no": roll,
            "year": student["year"],
            "branch": student["branch"],
            "section": student["section"],
            "daily_kwh": energy,
            "daily_co2_kg": carbon,
            "score": None,
        })

    e_vals = list(latest_energy.values())
    c_vals = list(latest_carbon.values())

    e_lo, e_hi = (
        (min(e_vals), max(e_vals))
        if e_vals else (0, 0)
    )

    c_lo, c_hi = (
        (min(c_vals), max(c_vals))
        if c_vals else (0, 0)
    )

    for row in entries:
        energy = row["daily_kwh"]
        carbon = row["daily_co2_kg"]

        if energy is not None and carbon is not None:
            row["score"] = round(
                50 * _norm(energy, e_lo, e_hi)
                + 50 * _norm(carbon, c_lo, c_hi),
                2,
            )

    def sort_key(row):
        complete = row["score"] is not None

        return (
            0 if complete else 1,
            row["score"] if complete else 0,
            (
                row["daily_co2_kg"]
                if row["daily_co2_kg"] is not None
                else float("inf")
            ),
            (
                row["daily_kwh"]
                if row["daily_kwh"] is not None
                else float("inf")
            ),
        )

    entries.sort(key=sort_key)

    for rank, row in enumerate(entries, start=1):
        row["rank"] = rank

    return entries
