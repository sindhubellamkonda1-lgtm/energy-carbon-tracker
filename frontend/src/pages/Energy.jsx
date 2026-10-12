import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Breakdown from "../components/Breakdown.jsx";

const PRESETS = [
  { name: "LED bulb", watts: 9 },
  { name: "Tube light", watts: 36 },
  { name: "Ceiling fan", watts: 75 },
  { name: "Table fan", watts: 50 },
  { name: "Laptop", watts: 60 },
  { name: "Desktop computer", watts: 150 },
  { name: "Phone charger", watts: 10 },
  { name: "Wi-Fi router", watts: 10 },
  { name: "Television", watts: 100 },
  { name: "Air cooler", watts: 150 },
  { name: "Air conditioner", watts: 1500 },
  { name: "Refrigerator", watts: 150 },
  { name: "Water heater / geyser", watts: 2000 },
  { name: "Electric kettle", watts: 1500 },
  { name: "Iron box", watts: 1000 },
].map((p) => ({ ...p, quantity: 1, hours_per_day: 0 }));

const kwh = (r) => (Number(r.watts) * Number(r.quantity) * Number(r.hours_per_day)) / 1000 || 0;

export default function Energy({ student }) {
  const [rows, setRows] = useState(PRESETS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => rows.reduce((s, r) => s + kwh(r), 0), [rows]);

  const update = (i, k, v) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const add = () => setRows([...rows, { name: "", watts: 0, quantity: 1, hours_per_day: 0 }]);

  const submit = async () => {
    setError("");
    const used = rows.filter((r) => r.name.trim() && kwh(r) > 0);
    if (!used.length) return setError("Enter hours for at least one appliance.");
    setBusy(true);
    try {
      const saved = await api.saveEnergy({
        roll_no: student.roll_no,
        appliances: used.map((r) => ({
          name: r.name.trim(),
          watts: Number(r.watts),
          quantity: Number(r.quantity),
          hours_per_day: Number(r.hours_per_day),
        })),
      });
      setResult(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="split energy">
      <div>
        <h1>Energy consumption</h1>
        <p className="lede">
          Enter how many hours each appliance runs on a normal day. Leave the rest at 0.
          Edit the watts if your appliance is different.
        </p>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Appliance</th><th>Watts</th><th>Qty</th><th>Hours/day</th><th>kWh/day</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Appliance" /></td>
                  <td><input type="number" min="0" value={r.watts} onChange={(e) => update(i, "watts", e.target.value)} /></td>
                  <td><input type="number" min="0" value={r.quantity} onChange={(e) => update(i, "quantity", e.target.value)} /></td>
                  <td><input type="number" min="0" max="24" step="0.5" value={r.hours_per_day} onChange={(e) => update(i, "hours_per_day", e.target.value)} /></td>
                  <td className="num">{kwh(r).toFixed(2)}</td>
                  <td><button className="link" onClick={() => remove(i)} aria-label={`Remove ${r.name || "row"}`}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn ghost" onClick={add}>Add another appliance</button>
      </div>

      <aside className="panel">
        <p className="panel-label">Your daily use</p>
        <p className="big">{total.toFixed(2)}<span> kWh</span></p>
        <p className="muted">About {(total * 30).toFixed(0)} kWh a month</p>

        {error && <p className="error">{error}</p>}
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Calculate and save"}
        </button>

        {result && (
          <div className="result">
            <h3>Saved</h3>
            <p><strong>{result.daily_kwh} kWh</strong> per day · <strong>{result.monthly_kwh} kWh</strong> per month</p>
            <Breakdown
              unit="kWh"
              items={[...result.appliances].sort((a, b) => b.daily_kwh - a.daily_kwh).slice(0, 6)
                .map((a) => ({ label: a.name, value: a.daily_kwh }))}
            />
            <Link className="btn" to="/carbon">Next: carbon emissions</Link>
          </div>
        )}
      </aside>
    </section>
  );
}
