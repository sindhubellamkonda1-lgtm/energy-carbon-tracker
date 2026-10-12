// Horizontal bars. items = [{ label, value }], unit = "kWh" | "kg"
export default function Breakdown({ items, unit }) {
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <ul className="bars">
      {items.map((i) => (
        <li key={i.label}>
          <div className="bar-head">
            <span>{i.label}</span>
            <strong>{i.value.toFixed(2)} {unit}</strong>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
