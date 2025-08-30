
import { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  const [quests, setQuests] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [recompensa, setRecompensa] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get("/api/gamification/quests?userId=1").then(res => setQuests(res.data.quests || []));
  }, []);

  const crearQuest = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/gamification/quest", { titulo, descripcion, recompensa, userId: "1" });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const completarQuest = async questId => {
    try {
      await axios.post("/api/gamification/quest/complete", { questId, userId: "1" });
      setStatus("quest-completed");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Gamificación: Quests</h2>
      <form onSubmit={crearQuest}>
        <input placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />
        <input placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        <input placeholder="Recompensa" value={recompensa} onChange={e => setRecompensa(e.target.value)} />
        <button type="submit">Crear Quest</button>
      </form>
      {status === "ok" && <p>Quest creada.</p>}
      {status === "quest-completed" && <p>Quest completada.</p>}
      {status === "error" && <p>Error.</p>}
      <hr />
      <h3>Mis Quests</h3>
      {quests.map(q => (
        <div key={q._id}>
          <strong>{q.titulo}</strong> — {q.estado}
          <button onClick={() => completarQuest(q._id)}>Completar</button>
        </div>
      ))}
    </main>
  );
}
