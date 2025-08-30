// POST contenido a sala { roomId, text, images?:[], audioUrl?:string }
import { ensureDB, seedOnce } from "../social/_db";
export default function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method!=="POST"){ res.setHeader("Allow",["POST"]); return res.status(405).end("Method Not Allowed"); }
  const DB = ensureDB(); seedOnce(DB);
  const { roomId, text, images = [], audioUrl = null } = req.body || {};
  const user = req.headers["x-user-id"] || "usuario";
  const r = DB.rooms.find(x=>x.id===Number(roomId)); if(!r) return res.status(404).json({error:"sala no encontrada"});
  r.posts.push({ by:user, text:String(text||""), at:Date.now(), images:Array.isArray(images)?images:[], audioUrl:audioUrl||null });
  return res.status(201).json({ ok:true, count:r.posts.length });
}
