import { useState } from "react";
import axios from "axios";

export default function BotsAdmin() {
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState("");
  const [content, setContent] = useState("");
  const [moderation, setModeration] = useState(null);

  const handleReply = async () => {
    const res = await axios.post("/api/bots/reply", { message: msg });
    setReply(res.data.reply);
  };

  const handleModerate = async () => {
    const res = await axios.post("/api/bots/moderate", { content });
    setModeration(res.data);
  };

  return (
    <main>
      <h2>Admin Bots</h2>
      <div>
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Mensaje para bot" />
        <button onClick={handleReply}>Probar Chatbot</button>
        {reply && <p>Respuesta: {reply}</p>}
      </div>
      <div>
        <input value={content} onChange={e => setContent(e.target.value)} placeholder="Texto para moderar" />
        <button onClick={handleModerate}>Probar Moderación</button>
        {moderation && <pre>{JSON.stringify(moderation, null, 2)}</pre>}
      </div>
    </main>
  );
}
