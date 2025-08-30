// GET lista; POST crea sala { name }
import { ensureDB, seedOnce } from "../social/_db";
export default function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  const DB = ensureDB(); seedOnce(DB);
  if (req.method==="GET") return res.status(200).json({ ok:true, items: DB.rooms });
  if (req.method==="POST") {
    const user = req.headers["x-user-id"] || "usuario";
    const { name } = req.body || {};
    const r = { id: DB.nextRoomId++, name: name || "Mi Sala", owner: user, members: [user], posts: [] };
    DB.rooms.push(r); return res.status(201).json({ ok:true, room:r });
  }
  res.setHeader("Allow",["GET","POST"]); return res.status(405).end("Method Not Allowed");
}
