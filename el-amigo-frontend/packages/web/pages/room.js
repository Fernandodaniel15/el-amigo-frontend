import { useState, useEffect } from "react";
import axios from "axios";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("chat");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get("/api/community/rooms").then(res => setRooms(res.data.rooms));
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/community/room", { nombre, tipo });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Salas y Clubes</h2>
      <form onSubmit={handleCreate}>
        <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
        <select value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="chat">Chat</option>
          <option value="stream">Streaming</option>
          <option value="radio">Radio</option>
          <option value="club">Club</option>
        </select>
        <button type="submit">Crear Sala</button>
      </form>
      {status === "ok" && <p>Sala creada.</p>}
      {status === "error" && <p>Error.</p>}
      <hr />
      {rooms.map(r => (
        <div key={r._id}>
          <strong>{r.nombre}</strong> ({r.tipo})
        </div>
      ))}
    </main>
  );
}
