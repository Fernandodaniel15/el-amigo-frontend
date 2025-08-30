import { useState } from "react";
import axios from "axios";

export default function WebhooksAdmin() {
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState("");
  const [status, setStatus] = useState(null);

  const register = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/webhooks/register", { userId: "1", url, event });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const send = async () => {
    try {
      await axios.post("/api/webhooks/send", { url, event: { tipo: event, data: "test" } });
      setStatus("enviado");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Admin Webhooks</h2>
      <form onSubmit={register}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Webhook URL" />
        <input value={event} onChange={e => setEvent(e.target.value)} placeholder="Tipo Evento" />
        <button type="submit">Registrar Webhook</button>
      </form>
      <button onClick={send}>Enviar Test Event</button>
      {status && <p>{status}</p>}
    </main>
  );
}
