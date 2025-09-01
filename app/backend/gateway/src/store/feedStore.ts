/**
 * AMIGO :: BLOQUE: feed · SUBMÓDULO: gateway-store · ACCIÓN(ES): MODIFICAR
 * SUPERFICIE UI: feed
 * DEPENDENCIAS: FS local data/db.json
 * CONTRATOS: REST feed+comments v1 · COMPAT: backward-compatible
 * SLOs: p95<200ms (I/O local)
 * IDEMP: llamada a nivel rutas
 * PRIVACIDAD: datos locales dev (gitignored)
 * OBSERVABILIDAD: n/a
 * INVARIANTES: items[].id únicos; comments[].id únicos por item
 * RIESGOS MITIGADOS: corrupción por I/O parcial (write atómico por archivo)
 * DESCRIPCIÓN: almacén JSON con cache en memoria, soporta author opcional
 */
// app/backend/gateway/src/store/feedStore.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { User } from '../plugins/auth.js';

export type Author = User; // { id, name }
export type Reaction = { userId: string }; // simple “like” por usuario
export type Comment = { id: string; text: string; createdAt: string; author?: Author; reactions?: Reaction[] };
export type Item = { id: string; text: string; createdAt: string; author?: Author; comments: Comment[]; reactions?: Reaction[] };

type DB = { items: Item[] };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let cache: DB | null = null;
let loading: Promise<void> | null = null;

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}
async function loadOnce() {
  if (cache) return;
  if (loading) return loading;
  loading = (async () => {
    await ensureDir();
    try {
      const raw = await fs.readFile(DB_FILE, 'utf8');
      const data = JSON.parse(raw) as DB;
      cache = { items: Array.isArray(data.items) ? data.items : [] };
      // retro-compat: asegurar arrays
      for (const it of cache.items) {
        it.comments ||= [];
        it.reactions ||= [];
        for (const c of it.comments) c.reactions ||= [];
      }
    } catch {
      cache = { items: [] };
      await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
    }
  })();
  await loading; loading = null;
}
async function save() {
  if (!cache) return;
  await ensureDir();
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

// ---------- Lectura base ----------
export async function getAll(): Promise<Item[]> { await loadOnce(); return (cache as DB).items; }
export async function getById(id: string): Promise<Item | undefined> { return (await getAll()).find(i => i.id === id); }

// ---------- Items ----------
export async function addItem(item: Item): Promise<void> {
  const items = await getAll();
  item.reactions ||= [];
  items.push(item);
  await save();
}
export async function updateItem(id: string, partial: Partial<Item>): Promise<Item | undefined> {
  const items = await getAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  const updated: Item = { ...items[idx], ...partial, id: items[idx].id };
  updated.reactions ||= items[idx].reactions || [];
  updated.comments ||= items[idx].comments || [];
  items[idx] = updated;
  await save();
  return updated;
}
export async function removeItem(id: string): Promise<Item | undefined> {
  const items = await getAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  const [removed] = items.splice(idx, 1);
  await save();
  return removed;
}

// ---------- Comentarios ----------
export async function addComment(itemId: string, comment: Comment): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  comment.reactions ||= [];
  it.comments.push(comment);
  await save();
}
export async function updateComment(itemId: string, cid: string, text: string): Promise<Comment> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const c = it.comments.find(x => x.id === cid);
  if (!c) throw new Error('comentario no existe');
  c.text = text;
  await save();
  return c;
}
export async function removeComment(itemId: string, commentId: string): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const idx = it.comments.findIndex(c => c.id === commentId);
  if (idx === -1) throw new Error('comentario no existe');
  it.comments.splice(idx, 1);
  await save();
}

// ---------- Reacciones ----------
function toggle(list: Reaction[], userId: string) {
  const i = list.findIndex(r => r.userId === userId);
  if (i >= 0) list.splice(i, 1);
  else list.push({ userId });
}
export async function toggleItemLike(itemId: string, userId: string): Promise<Item> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  it.reactions ||= [];
  toggle(it.reactions, userId);
  await save();
  return it;
}
export async function toggleCommentLike(itemId: string, cid: string, userId: string): Promise<Comment> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const c = it.comments.find(x => x.id === cid);
  if (!c) throw new Error('comentario no existe');
  c.reactions ||= [];
  toggle(c.reactions, userId);
  await save();
  return c;
}

// ---------- Paginación util ----------
export type Page<T> = { items: T[]; nextCursor?: string };
export function paginate<T extends { createdAt: string; id: string }>(
  arr: T[],
  limit = 10,
  cursor?: string
): Page<T> {
  // ordenar más nuevos primero
  const sorted = [...arr].sort((a,b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : (a.id < b.id ? 1 : -1)));
  let start = 0;
  if (cursor) {
    const idx = sorted.findIndex(x => `${x.createdAt}|${x.id}` === cursor);
    if (idx >= 0) start = idx + 1;
  }
  const slice = sorted.slice(start, start + limit);
  const next = slice.length === limit ? `${slice[slice.length-1].createdAt}|${slice[slice.length-1].id}` : undefined;
  return { items: slice, nextCursor: next };
}
