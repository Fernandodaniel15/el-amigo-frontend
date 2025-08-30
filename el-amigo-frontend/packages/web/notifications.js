import { useState, useEffect } from "react";
import axios from "axios";

export default function Notifications() {
  const [notis, setNotis] = useState([]);

  useEffect(() => {
    axios.get("/api/notification/list?userId=1").then(res => setNotis(res.data.notifications || []));
  }, []);

  const marcarLeida = async id => {
    await axios.post("/api/notification/mark", { id });
    setNotis(notis.map(n => n._id === id ? { ...n, leido: true } : n));
  };

  return (
    <main>
      <h2>Notificaciones</h2>
      {notis.map(n => (
        <div key={n._id} style={{ opacity: n.leido ? 0.5 : 1 }}>
          <strong>{n.tipo}</strong> — {n.mensaje} 
          <button disabled={n.leido} onClick={() => marcarLeida(n._id)}>Marcar Leída</button>
        </div>
      ))}
    </main>
  );
}
