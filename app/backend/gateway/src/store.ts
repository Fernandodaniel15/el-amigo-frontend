// app/backend/gateway/src/store.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type Comment = { id: string; text: string; createdAt: string };
export type Item = { id: string; text: string; createdAt: string; comments: Comment[] };

type DB = { items: Item[] };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// cache en memoria para evitar IO excesivo
let cache: DB | null = null;
let loading: Promise<void> | null = null;

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function loadOnce() {
  if (cache) return;
  if (loading) return loading;
  loading = (async () => {
    await ensureDataDir();
    try {
      const raw = await fs.readFile(DB_FILE, 'utf8');
      cache = JSON.parse(raw) as DB;
      if (!cache.items) cache.items = [];
    } catch {
      cache = { items: [] };
      await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
    }
  })();
  await loading;
  loading = null;
}

async function save() {
  if (!cache) return;
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export async function dbGetAll(): Promise<Item[]> {
  await loadOnce();
  return (cache as DB).items;
}

export async function dbSetAll(items: Item[]) {
  await loadOnce();
  (cache as DB).items = items;
  await save();
}

export async function dbUpsert(item: Item) {
  await loadOnce();
  const items = (cache as DB).items;
  const idx = items.findIndex(i => i.id === item.id);
  if (idx === -1) items.push(item);
  else items[idx] = item;
  await save();
}

export async function dbDelete(id: string) {
  await loadOnce();
  const items = (cache as DB).items;
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    await save();
  }
}
