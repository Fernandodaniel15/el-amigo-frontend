import { useEffect, useState } from "react";
import axios from "axios";

export default function PulsePage() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [user, setUser] = useState("usuario");

  async function load() { const r = await axios.get("/api/pulse"); setItems(r.data.items || []); }
  useEffect(() => { load(); const id=setInterval(load,2500); return ()=>clearInterval(id); }, []);

  async function createTopic(e){ e.preventDefault(); if(!title.trim()) return; await axios.post("/api/pulse",{title}); setTitle(""); load(); }
  async function vote(id,choice){ await axios.post("/api/pulse/vote",{topicId:id,choice},{headers:{"X-User-Id":user}}); load(); }

  return (
    <main style={{ padding:20, fontFamily:"sans-serif" }}>
      <h1>OpinionPulse</h1>
      <div style={{display:"flex", gap:10, alignItems:"center"}}>
        <label>Usuario:</label>
        <input value={user} onChange={e=>setUser(e.target.value||"usuario")} style={{padding:6,border:"1px solid #bbb",borderRadius:6}} />
      </div>
      <form onSubmit={createTopic} style={{margin:"12px 0", display:"flex", gap:8}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nuevo tema…" style={{flex:1, padding:8, border:"1px solid #bbb", borderRadius:8}} />
        <button>Crear</button>
      </form>

      {items.map(t => (
        <article key={t.id} style={{border:"1px solid #ddd",borderRadius:8,padding:10, margin:"8px 0"}}>
          <b>{t.title}</b>
          <div style={{display:"flex", gap:8, marginTop:6}}>
            {["love","no_interest","disapprove"].map(ch => (
              <button key={ch} onClick={()=>vote(t.id,ch)} style={{padding:"6px 10px"}}>{
                ch==="love" ? "💜 Me encanta" : ch==="no_interest" ? "😴 No me interesa" : "🚫 Desapruebo"
              }</button>
            ))}
          </div>
          <div style={{marginTop:8}}>
            {["love","no_interest","disapprove"].map(ch => (
              <div key={ch} style={{margin:"4px 0"}}>
                <small style={{display:"inline-block", width:140}}>{
                  ch==="love" ? "💜 Me encanta" : ch==="no_interest" ? "😴 No me interesa" : "🚫 Desapruebo"
                }</small>
                <div style={{display:"inline-block", width:"60%", border:"1px solid #ccc", borderRadius:6}}>
                  <div style={{width:`${t.pct[ch]}%`, height:12, background:"#ddd"}} />
                </div>
                <small style={{marginLeft:6}}>{t.pct[ch]}%</small>
              </div>
            ))}
          </div>
        </article>
      ))}
    </main>
  );
}
