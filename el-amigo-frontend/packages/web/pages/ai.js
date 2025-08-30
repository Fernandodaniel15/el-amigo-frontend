import { useState } from "react";
import axios from "axios";

export default function AIPage() {
  const [audio, setAudio] = useState(null);
  const [texto, setTexto] = useState("");
  const [recommend, setRecommend] = useState([]);

  const handleTranscribe = async () => {
    // Demo: usar input type file real
    const res = await axios.post("/api/ai/transcribe", { audio });
    setTexto(res.data.texto);
  };

  const handleRecommend = async () => {
    const res = await axios.post("/api/ai/recommend", { userId: "1" });
    setRecommend(res.data.posts);
  };

  return (
    <main>
      <h2>IA y Analítica</h2>
      <div>
        <button onClick={handleTranscribe}>Transcribir Audio</button>
        {texto && <div>Texto: {texto}</div>}
      </div>
      <div>
        <button onClick={handleRecommend}>Recomendar Feed</button>
        <ul>
          {recommend.map(pid => <li key={pid}>{pid}</li>)}
        </ul>
      </div>
    </main>
  );
}
