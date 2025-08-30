import { useState } from "react";
import axios from "axios";

export default function ExportAdmin() {
  const [users, setUsers] = useState([]);
  const [tx, setTx] = useState([]);

  const exportUsers = async () => {
    const res = await axios.get("/api/export/users");
    setUsers(res.data.data || []);
  };
  const exportTx = async () => {
    const res = await axios.get("/api/export/transactions");
    setTx(res.data.data || []);
  };

  return (
    <main>
      <h2>Exportación de Datos</h2>
      <button onClick={exportUsers}>Exportar Usuarios</button>
      <pre>{JSON.stringify(users, null, 2)}</pre>
      <button onClick={exportTx}>Exportar Transacciones</button>
      <pre>{JSON.stringify(tx, null, 2)}</pre>
    </main>
  );
}
