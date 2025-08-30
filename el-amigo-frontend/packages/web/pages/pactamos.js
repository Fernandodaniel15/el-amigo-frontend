export default function Pactamos() {
  return (
    <main>
      <h2>PACTAMOS</h2>
      {/* Contratos digitales P2P */}
    </main>
  );
}
import { useState } from "react";
import axios from "axios";

export default function Pactamos() {
  const [form, setForm] = useState({ userA: "", userB: "", terms: "" });
  const [status, setStatus] = useState(null);
  const [audit, setAudit] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/legal/sign", form);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const handleAudit = async id => {
    try {
      const res = await axios.get(`/api/legal/audit/${id}`);
      setAudit(res.data.pact);
    } catch {
      setAudit("No encontrado");
    }
  };

  return (
    <main>
      <h2>Pactamos - Contratos Digitales</h2>
      <form onSubmit={handleSubmit}>
        <input name="userA" onChange={handleChange} placeholder="Usuario A" />
        <input name="userB" onChange={handleChange} placeholder="Usuario B" />
        <textarea name="terms" onChange={handleChange} placeholder="Términos" />
        <button type="submit">Firmar Contrato</button>
      </form>
      {status === "ok" && <p>Contrato creado y firmado.</p>}
      {status === "error" && <p>Error al firmar.</p>}
      <hr />
      <div>
        <input placeholder="ID Contrato" onBlur={e => handleAudit(e.target.value)} />
        {audit && <pre>{JSON.stringify(audit, null, 2)}</pre>}
      </div>
    </main>
  );
}
