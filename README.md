# Watt & Carbon: Energy and Carbon Tracker

React + FastAPI + MongoDB.

## 1. MongoDB
Run MongoDB locally (or use a MongoDB Atlas URL).
Optional: `mongosh < database/mongo-init.js` to create collections and indexes
(the API also creates the indexes on startup).

## 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # edit MONGO_URL if needed
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

## 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:5173

## Collections
- `students`: name, year, roll_no (unique), branch, section, email
- `energy_records`: roll_no, appliances[], daily_kwh, monthly_kwh, created_at
- `carbon_records`: roll_no, inputs, breakdown_kg_per_day, daily_co2_kg, monthly_co2_kg, yearly_co2_kg, created_at

Each submission is stored as a new record; the leaderboard uses each student's latest one.

## Emission factors (backend/main.py, edit as needed)
Grid 0.82 kg CO2/kWh; transport per km: bus 0.05, metro 0.03, train 0.04, e-scooter 0.02,
bike 0.045, auto 0.10, car 0.17; diet per day: vegan 1.5, veg 1.7, veg+eggs 2.0, non-veg 2.5;
LPG 3.0 kg CO2/kg. These are approximate averages, so cite your own sources if you publish results.
