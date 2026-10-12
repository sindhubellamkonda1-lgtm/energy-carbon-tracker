import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Breakdown from "../components/Breakdown.jsx";

const TRANSPORT = [
  ["walk", "Walk"], ["cycle", "Cycle"], ["bus", "Bus"], ["metro", "Metro"], ["train", "Train"],
  ["electric_scooter", "Electric scooter"], ["two_wheeler", "Petrol bike / scooter"],
  ["auto", "Auto-rickshaw"], ["car", "Car"],
];
const DIET = [
  ["vegan", "Vegan"], ["vegetarian", "Vegetarian"],
  ["eggetarian", "Vegetarian + eggs"], ["non_vegetarian", "Non-vegetarian"],
];

export default function Carbon({ student }) {
  const [form, setForm] = useState({
    electricity_kwh_per_day: "",
    transport_mode: "bus",
    transport_km_per_day: "",
    diet: "vegetarian",
    lpg_kg_per_month: "",
  });
  const [prefilled, setPrefilled] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Reuse the electricity figure from the Energy page when it exists
  useEffect(() => {
    api.getSummary(student.roll_no).then((s) => {
      if (s.energy) {
        setForm((f) => ({ ...f, electricity_kwh_per_day: String(s.energy.daily_kwh) }));
        setPrefilled(true);
      }
    }).catch(() => {});
  }, [student.roll_no]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const saved = await api.saveCarbon({
        roll_no: student.roll_no,
        electricity_kwh_per_day: Number(form.electricity_kwh_per_day || 0),
        transport_mode: form.transport_mode,
        transport_km_per_day: Number(form.transport_km_per_day || 0),
        diet: form.diet,
        lpg_kg_per_month: Number(form.lpg_kg_per_month || 0),
      });
      setResult(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const b = result?.breakdown_kg_per_day;

  return (
    <section className="split carbon">
      <div>
        <h1>Carbon emissions</h1>
        <p className="lede">Tell us about a normal day. We turn it into kilograms of CO₂.</p>

        <form className="card form-grid" onSubmit={submit}>
          <label className="full">Electricity used per day (kWh)
            <input type="number" min="0" step="0.01" required value={form.electricity_kwh_per_day} onChange={set("electricity_kwh_per_day")} />
            <small>{prefilled ? "Filled from your Energy page. You can change it." : "Calculate it on the Energy page, or enter it here."}</small>
          </label>
          <label>How you travel
            <select value={form.transport_mode} onChange={set("transport_mode")}>
              {TRANSPORT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Distance per day (km)
            <input type="number" min="0" step="0.1" required value={form.transport_km_per_day} onChange={set("transport_km_per_day")} />
          </label>
          <label>What you eat
            <select value={form.diet} onChange={set("diet")}>
              {DIET.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>LPG used per month (kg)
            <input type="number" min="0" step="0.1" required value={form.lpg_kg_per_month} onChange={set("lpg_kg_per_month")} />
            <small>A 14.2 kg cylinder = 14.2. Enter 0 if you don't cook.</small>
          </label>

          {error && <p className="error full">{error}</p>}
          <button className="btn full" disabled={busy}>{busy ? "Saving…" : "Calculate and save"}</button>
        </form>
      </div>

      <aside className="panel">
        <p className="panel-label">Your daily footprint</p>
        <p className="big">{result ? result.daily_co2_kg.toFixed(2) : "–"}<span> kg CO₂</span></p>
        {result ? (
          <div className="result">
            <p className="muted">{result.monthly_co2_kg} kg a month · {result.yearly_co2_kg} kg a year</p>
            <Breakdown
              unit="kg"
              items={[
                { label: "Electricity", value: b.electricity },
                { label: "Transport", value: b.transport },
                { label: "Food", value: b.food },
                { label: "Cooking (LPG)", value: b.cooking },
              ]}
            />
            <Link className="btn" to="/leaderboard">See the leaderboard</Link>
          </div>
        ) : (
          <p className="muted">Fill in the form to see your result.</p>
        )}
      </aside>
    </section>
  );
}
