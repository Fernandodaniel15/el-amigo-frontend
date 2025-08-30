import { useState } from "react";

export default function Marketplace() {
  const [items] = useState([
    { id: 1, nombre: "Sticker NFT", precio: 10, moneda: "AMG" },
    { id: 2, nombre: "Entrada Evento", precio: 50, moneda: "AMG" }
  ]);
  return (
    <main>
      <h2>Marketplace</h2>
      {items.map(it => (
        <div key={it.id}>{it.nombre} - {it.precio} {it.moneda} <button>Comprar</button></div>
      ))}
    </main>
  );
}
