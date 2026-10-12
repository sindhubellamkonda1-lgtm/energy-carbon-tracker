import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Register from "./pages/Register.jsx";
import Energy from "./pages/Energy.jsx";
import Carbon from "./pages/Carbon.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";

function loadStudent() {
  try {
    return JSON.parse(localStorage.getItem("student"));
  } catch {
    return null;
  }
}

export default function App() {
  const [student, setStudent] = useState(loadStudent);

  const save = (s) => {
    localStorage.setItem("student", JSON.stringify(s));
    setStudent(s);
  };
  const signOut = () => {
    localStorage.removeItem("student");
    setStudent(null);
  };

  return (
    <BrowserRouter>
      <header className="topbar">
        <NavLink to="/" className="brand">Watt &amp; Carbon</NavLink>
        <nav>
          <NavLink to="/energy">Energy</NavLink>
          <NavLink to="/carbon">Carbon</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
        </nav>
        {student && (
          <div className="who">
            <span>{student.name} · {student.roll_no}</span>
            <button className="link" onClick={signOut}>Switch student</button>
          </div>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Register student={student} onSave={save} />} />
          <Route path="/energy" element={student ? <Energy student={student} /> : <Navigate to="/" />} />
          <Route path="/carbon" element={student ? <Carbon student={student} /> : <Navigate to="/" />} />
          <Route path="/leaderboard" element={<Leaderboard student={student} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
