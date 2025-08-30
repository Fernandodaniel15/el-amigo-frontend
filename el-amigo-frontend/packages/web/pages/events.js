import { useState, useEffect } from "react";
import axios from "axios";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", fecha: "" });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get("/api/events/events").then(res => setEvents(res.data.events));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/events/event", form);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Eventos</h2>
      <form onSubmit={handleSubmit}>
        <input name="nombre" onChange={handleChange} placeholder="Nombre" />
        <input name="descripcion" onChange={handleChange} placeholder="Descripción" />
        <input name="fecha" onChange={handleChange} placeholder="Fecha (YYYY-MM-DD)" />
        <button type="submit">Crear Evento</button>
      </form>
      {status === "ok" && <p>Evento creado.</p>}
      {status === "error" && <p>Error al crear evento.</p>}
      <hr />
      {events.map(ev => (
        <div key={ev._id}>
          <strong>{ev.nombre}</strong> — {ev.fecha && ev.fecha.slice(0,10)}
          <div>{ev.descripcion}</div>
        </div>
      ))}
    </main>
  );
}
