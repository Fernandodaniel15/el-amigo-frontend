import { useState, useEffect } from "react";
import axios from "axios";

export default function Education() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ titulo: "", descripcion: "", mentor: "" });
  const [status, setStatus] = useState(null);
  const [joinId, setJoinId] = useState("");

  useEffect(() => {
    axios.get("/api/education/courses").then(res => setCourses(res.data.courses || []));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/education/course", form);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const handleJoin = async id => {
    try {
      await axios.post("/api/education/course/join", { courseId: id, userId: "1" });
      setStatus("joined");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Academia / Cursos</h2>
      <form onSubmit={handleSubmit}>
        <input name="titulo" onChange={handleChange} placeholder="Título" />
        <input name="descripcion" onChange={handleChange} placeholder="Descripción" />
        <input name="mentor" onChange={handleChange} placeholder="Mentor" />
        <button type="submit">Crear Curso</button>
      </form>
      {status === "ok" && <p>Curso creado.</p>}
      {status === "joined" && <p>Inscripto al curso.</p>}
      {status === "error" && <p>Error.</p>}
      <hr />
      <h3>Cursos</h3>
      {courses.map(c => (
        <div key={c._id}>
          <strong>{c.titulo}</strong> — Mentor: {c.mentor}
          <button onClick={() => handleJoin(c._id)}>Inscribirse</button>
        </div>
      ))}
    </main>
  );
}
