import { useEffect, useState } from "react";
import axios from "axios";

export default function RadioPage(){
  const [items,setItems]=useState([]); const [name,setName]=useState(""); const [user,setUser]=useState("usuario");
  const [playing,setPlaying]=useState(null); const [amount,setAmount]=useState(1);

  async function load(){ const r=await axios.get("/api/radio"); setItems(r.data.items||[]); }
  useEffect(()=>{ load(); const id=setInterval(load,2000); return ()=>clearInterval(id); },[]);

  async function create(e){ e.preventDefault(); await axios.post("/api/radio",{name},{headers:{"X-User-Id":user}}); setName(""); load(); }
  async function play(id){ await axios.post("/api/radio/play",{stationId:id}); setPlaying(id); load(); }
  async function stop(id){ await axios.post("/api/radio/stop",{stationId:id}); if(playing===id) setPlaying(null); load(); }
  async function tip(id){ await axios.post("/api/tips",{kind:"radio", id, amount:Number(amount)||1},{headers:{"X-User-Id":user}}); load(); }

  return (
    <main style={{padding:20, fontFamily:"sans-serif"}}>
      <h1>Radio Social</h1>
      <div style={{display:"flex", gap:10, alignItems:"center"}}>
        <label>Usuario:</label>
        <input value={user} onChange={e=>setUser(e.target.value||"usuario")} style={{padding:6,border:"1px solid #bbb",borderRadius:6}} />
      </div>
      <form onSubmit={create} style={{margin:"12px 0", display:"flex", gap:8}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de radio…" style={{flex:1, padding:8, border:"1px solid #bbb", borderRadius:8}} />
        <button>Crear</button>
      </form>
      <div>
        {items.map(r=>(
          <article key={r.id} style={{border:"1px solid #ddd", borderRadius:8, padding:10, margin:"8px 0"}}>
            <b>{r.name}</b> — owner: {r.owner} — 👂 oyentes: <b>{r.listeners||0}</b> — 💸 ${r.income?.total||0} ({r.income?.tips||0} tips)
            <div style={{marginTop:6, display:"flex", gap:8}}>
              {playing===r.id ? <button onClick={()=>stop(r.id)}>⏹️ Stop</button> : <button onClick={()=>play(r.id)}>▶️ Play</button>}
              <input type="number" min={1} value={amount} onChange={e=>setAmount(e.target.value)} style={{width:80}} />
              <button onClick={()=>tip(r.id)}>💸 Propina</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
