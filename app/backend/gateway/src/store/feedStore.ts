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

export type Author  = { id: string; name: string };
export type Comment = { id: string; text: string; createdAt: string; author?: Author };
export type Item    = { id: string; text: string; createdAt: string; author?: Author; comments: Comment[] };
type DB = { items: Item[] };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

let cache: DB | null = null;
let loading: Promise<void> | null = null;

async function ensureDataDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}

async function loadOnce() {
  if (cache) return;
  if (loading) return loading;
  loading = (async () => {
    await ensureDataDir();
    try {
      const raw = await fs.readFile(DB_FILE, 'utf8');
      const data = JSON.parse(raw) as DB;
      cache = { items: Array.isArray(data.items) ? data.items : [] };
    } catch {
      cache = { items: [] };
      await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
    }
  })();
  await loading; loading = null;
}

async function save() {
  if (!cache) return;
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export async function getAll(): Promise<Item[]> {
  await loadOnce();
  return (cache as DB).items;
}

export async function getById(id: string): Promise<Item | undefined> {
  const items = await getAll();
  return items.find(i => i.id === id);
}

export async function addItem(item: Item): Promise<void> {
  const items = await getAll();
  items.push(item);
  await save();
}

export async function updateItem(id: string, partial: Partial<Item>): Promise<Item | undefined> {
  const items = await getAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  const updated: Item = { ...items[idx], ...partial, id: items[idx].id };
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

export async function addComment(itemId: string, comment: Comment): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  it.comments.push(comment);
  await save();
}

export async function removeComment(itemId: string, commentId: string): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const idx = it.comments.findIndex(c => c.id === commentId);
  if (idx === -1) throw new Error('comentario no existe');
  it.comments.splice(idx, 1);
  await save();
}
