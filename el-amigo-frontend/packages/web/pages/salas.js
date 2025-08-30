import { useEffect, useState } from "react";
import axios from "axios";

export default function SalasPage(){
  const [rooms,setRooms]=useState([]); const [name,setName]=useState(""); const [user,setUser]=useState("usuario");
  const [active,setActive]=useState(null); const [text,setText]=useState("");
  async function load(){ const r=await axios.get("/api/rooms"); setRooms(r.data.items||[]); }
  useEffect(()=>{ load(); },[]);
  async function crear(e){ e.preventDefault(); await axios.post("/api/rooms",{name},{headers:{"X-User-Id":user}}); setName(""); load(); }
  async function join(id){ await axios.post("/api/rooms/join",{roomId:id},{headers:{"X-User-Id":user}}); load(); setActive(id); }
  async function postear(e){ e.preventDefault(); if(!active||!text.trim()) return; await axios.post("/api/rooms/post",{roomId:active,text},{headers:{"X-User-Id":user}}); setText(""); load(); }

  const room = rooms.find(r => r.id===active);
  return (
    <main style={{padding:20,fontFamily:"sans-serif"}}>
      <h1>Salas</h1>
      <div style={{display:"flex", gap:10, alignItems:"center"}}>
        <label>Usuario:</label>
        <input value={user} onChange={e=>setUser(e.target.value||"usuario")} style={{padding:6,border:"1px solid #bbb",borderRadius:6}} />
      </div>
      <form onSubmit={crear} style={{margin:"12px 0", display:"flex", gap:8}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de sala…" style={{flex:1, padding:8, border:"1px solid #bbb", borderRadius:8}} />
        <button>Crear</button>
      </form>
      <div style={{display:"flex", gap:16}}>
        <section style={{flex:"0 0 300px"}}>
          <h3>Listado</h3>
          <ul>
            {rooms.map(r=>(
              <li key={r.id} style={{marginBottom:8}}>
                <b>{r.name}</b> — owner: {r.owner} — miembros: {r.members?.length||0}
                <div><button onClick={()=>join(r.id)}>{active===r.id?"Entraste":"Entrar"}</button></div>
              </li>
            ))}
          </ul>
        </section>
        <section style={{flex:1}}>
          <h3>Contenido</h3>
          {!room ? <div>Elegí una sala…</div> : (
            <>
              <form onSubmit={postear} style={{display:"flex", gap:8}}>
                <input value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe algo…" style={{flex:1, padding:8, border:"1px solid #bbb", borderRadius:8}} />
                <button>Publicar</button>
              </form>
              <ul>
                {(room.posts||[]).slice().reverse().map((p,i)=>(
                  <li key={i} style={{margin:"6px 0"}}><b>{p.by}</b>: {p.text}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
