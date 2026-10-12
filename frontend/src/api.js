const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = "Something went wrong. Try again.";
    if (typeof data.detail === "string") msg = data.detail;
    else if (Array.isArray(data.detail))
      msg = data.detail.map((d) => `${d.loc.slice(-1)[0]}: ${d.msg}`).join("; ");
    throw new Error(msg);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  saveStudent: (s) => post("/api/students", s),
  saveEnergy: (b) => post("/api/energy", b),
  saveCarbon: (b) => post("/api/carbon", b),
  getSummary: (roll) => request(`/api/students/${encodeURIComponent(roll)}/summary`),
  getLeaderboard: () => request("/api/leaderboard"),
};
