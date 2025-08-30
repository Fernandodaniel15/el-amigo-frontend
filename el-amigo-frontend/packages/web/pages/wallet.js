import { useState, useEffect } from "react";
import axios from "axios";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [destino, setDestino] = useState("");
  const [monto, setMonto] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get("/api/economy/wallet/1").then(res => setWallet(res.data.wallet)); // userId fijo para demo
  }, []);

  const transferir = async e => {
    e.preventDefault();
    try {
      await axios.post("/api/economy/transfer", { fromUserId: "1", toUserId: destino, monto: Number(monto) });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>Billetera Digital</h2>
      {wallet && (
        <div>
          <div>Saldo: {wallet.saldo} {wallet.moneda}</div>
          <form onSubmit={transferir}>
            <input placeholder="Usuario destino" value={destino} onChange={e => setDestino(e.target.value)} />
            <input type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value)} />
            <button type="submit">Transferir</button>
          </form>
          {status === "ok" && <p>Transferencia realizada.</p>}
          {status === "error" && <p>Error al transferir.</p>}
        </div>
      )}
    </main>
  );
}
