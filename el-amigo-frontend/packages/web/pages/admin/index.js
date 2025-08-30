import { useState, useEffect } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [modulo, setModulo] = useState("identity");

  useEffect(() => {
    axios.get(`/api/admin/logs?modulo=${modulo}`).then(res => setLogs(res.data.logs || []));
  }, [modulo]);

  return (
    <main>
      <h2>Panel Admin - Logs</h2>
      <select value={modulo} onChange={e => setModulo(e.target.value)}>
        <option value="identity">Identity</option>
        <option value="social">Social</option>
        <option value="economy">Economy</option>
        <option value="events">Events</option>
        <option value="ai">AI</option>
        <option value="legal">Legal</option>
        <option value="gamification">Gamification</option>
        <option value="education">Education</option>
      </select>
      <hr />
      {logs.map(l => (
        <div key={l._id}>
          <strong>{l.modulo}</strong> — {l.accion} — {l.userId} — {l.fecha && l.fecha.slice(0,10)}
          <div>{l.detalle}</div>
        </div>
      ))}
    </main>
  );
}
