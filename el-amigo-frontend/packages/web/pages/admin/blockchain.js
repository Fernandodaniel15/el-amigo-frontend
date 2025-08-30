import { useState } from "react";
import axios from "axios";

export default function BlockchainAdmin() {
  const [data, setData] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);

  const notarize = async () => {
    await axios.post("/api/blockchain/notarize", { data });
    setResult("Notarizado en blockchain");
  };
  const verify = async () => {
    const res = await axios.post("/api/blockchain/verify", { hash });
    setResult(res.data.ok ? "Verificado OK" : "No existe");
  };

  return (
    <main>
      <h2>Blockchain</h2>
      <input value={data} onChange={e => setData(e.target.value)} placeholder="Data a notarizar" />
      <button onClick={notarize}>Notarizar</button>
      <input value={hash} onChange={e => setHash(e.target.value)} placeholder="Hash para verificar" />
      <button onClick={verify}>Verificar</button>
      {result && <p>{result}</p>}
    </main>
  );
}
