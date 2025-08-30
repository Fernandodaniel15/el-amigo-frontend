import { useState } from "react";
import axios from "axios";

export default function InfluencerPanel() {
  const [campaña, setCampaña] = useState({ nombre: "", objetivo: "" });
  const [status, setStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [infId, setInfId] = useState("");

  const handleChange = e => setCampaña({ ...campaña, [e.target.name]: e.target.value });

  const crearCampaña = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/influencer/campaign", { influencerId: infId, campaña });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const verMétricas = async () => {
    const res = await axios.get(`/api/influencer/metrics/${infId}`);
    setMetrics(res.data.metrics);
  };

  return (
    <main>
      <h2>Panel Influencer</h2>
      <input placeholder="ID Influencer" value={infId} onChange={e => setInfId(e.target.value)} />
      <form onSubmit={crearCampaña}>
        <input name="nombre" onChange={handleChange} placeholder="Nombre campaña" />
        <input name="objetivo" onChange={handleChange} placeholder="Objetivo" />
        <button type="submit">Crear Campaña</button>
      </form>
      {status === "ok" && <p>Campaña creada.</p>}
      {status === "error" && <p>Error al crear campaña.</p>}
      <button onClick={verMétricas}>Ver Métricas</button>
      {metrics && <pre>{JSON.stringify(metrics, null, 2)}</pre>}
    </main>
  );
}
