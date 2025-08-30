import { ensureDB, seedOnce } from "../social/_db";
export default function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method!=="POST"){ res.setHeader("Allow",["POST"]); return res.status(405).end("Method Not Allowed"); }
  const DB = ensureDB(); seedOnce(DB);
  const { roomId } = req.body || {}; const user = req.headers["x-user-id"] || "usuario";
  const r = DB.rooms.find(x=>x.id===Number(roomId)); if(!r) return res.status(404).json({error:"sala no encontrada"});
  if(!r.members.includes(user)) r.members.push(user);
  return res.status(200).json({ ok:true, room:r });
}
