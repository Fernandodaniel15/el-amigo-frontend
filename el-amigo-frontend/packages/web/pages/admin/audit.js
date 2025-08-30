import { useState } from "react";
import axios from "axios";

export default function AuditAdmin() {
  const [userId, setUserId] = useState("");
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await axios.get("/api/audit/list", { params: { userId } });
    setLogs(res.data.logs || []);
  };

  return (
    <main>
      <h2>Auditoría</h2>
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="UserID" />
      <button onClick={fetchLogs}>Buscar Logs</button>
      <pre>{JSON.stringify(logs, null, 2)}</pre>
    </main>
  );
}
