import { useState } from "react";
import axios from "axios";

export default function Post() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/social/post", { content });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Crear Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea value={content} onChange={e => setContent(e.target.value)} />
        <button type="submit">Publicar</button>
      </form>
      {status === "ok" && <p>Publicado.</p>}
      {status === "error" && <p>Error al publicar.</p>}
    </main>
  );
}
