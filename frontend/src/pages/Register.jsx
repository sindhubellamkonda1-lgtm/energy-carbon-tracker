
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const empty = {
  name: "",
  year: "1",
  roll_no: "",
  branch: "",
  section: "",
  email: "",
  phone: "",
};

export default function Register({ student, onSave }) {
  const [form, setForm] = useState(
    student
      ? {
          ...empty,
          ...student,
          year: String(student.year),
          phone: student.phone || "",
        }
      : empty
  );

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const saved = await api.saveStudent({
        ...form,
        year: Number(form.year),
        phone: form.phone.trim(),
      });

      onSave(saved);
      navigate("/energy");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <h1>How much power do you use in a day?</h1>

      <p className="lede">
        Enter your details once, then calculate your electricity use
        and your carbon footprint. Your results go on the leaderboard.
      </p>

      <form className="card form-grid" onSubmit={submit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Full name"
          />
        </label>

        <label>
          Roll number
          <input
            required
            value={form.roll_no}
            onChange={set("roll_no")}
            placeholder="e.g. 22251A0201"
          />
        </label>

        <label>
          Year
          <select
            value={form.year}
            onChange={set("year")}
          >
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label>
          Branch
          <input
            required
            value={form.branch}
            onChange={set("branch")}
            placeholder="e.g. EEE"
          />
        </label>

        <label>
          Section
          <input
            required
            value={form.section}
            onChange={set("section")}
            placeholder="e.g. A"
          />
        </label>

        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@college.edu"
          />
        </label>

        
<label>
  Phone Number
  <input
    required
    type="tel"
    value={form.phone}
    onChange={set("phone")}
    placeholder="Enter 10-digit mobile number"
    pattern="[0-9]{10}"
    maxLength={10}
    minLength={10}
    title="Please enter exactly 10 digits"
  />
</label>


        {error && <p className="error full">{error}</p>}

        <button className="btn full" disabled={busy}>
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </section>
  );
}
