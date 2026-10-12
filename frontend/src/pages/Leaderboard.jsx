import { useEffect, useState } from "react";
import { api } from "../api.js";

const fmt = (v, d = 2) => (v === null || v === undefined ? "–" : Number(v).toFixed(d));

export default function Leaderboard({ student }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getLeaderboard()
      .then((r) => { setRows(r); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <section>
      <div className="row-between">
        <div>
          <h1>Leaderboard</h1>
          <p className="lede">
            Lower is better. The score blends daily energy use and daily CO₂ equally.
            Students who finished both calculations rank first.
          </p>
        </div>
        <button className="btn ghost" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table className="board">
          <thead>
            <tr>
              <th>Rank</th><th>Student</th><th>Roll no</th><th>Branch</th><th>Yr</th><th>Sec</th>
              <th>Energy (kWh/day)</th><th>CO₂ (kg/day)</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.roll_no} className={student?.roll_no === r.roll_no ? "me" : ""}>
                <td className="rank">{r.rank}</td>
                <td>{r.name}</td>
                <td>{r.roll_no}</td>
                <td>{r.branch}</td>
                <td>{r.year}</td>
                <td>{r.section}</td>
                <td className="num">{fmt(r.daily_kwh)}</td>
                <td className="num">{fmt(r.daily_co2_kg)}</td>
                <td className="num">{fmt(r.score, 1)}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan="9" className="empty">No one has taken part yet. Be the first on the board.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
