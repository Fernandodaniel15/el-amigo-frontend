// app/backend/gateway/src/store/feedStore.ts
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

export type FeedItem = { id: string; text: string; createdAt: string };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'feed.json');

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function readAll(): Promise<FeedItem[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as FeedItem[];
  } catch {
    // Si el archivo está corrupto, lo reseteamos
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }
}

async function writeAll(items: FeedItem[]) {
  // Escritura atómica básica
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), 'utf-8');
  await fs.rename(tmp, DATA_FILE);
}

export async function list(): Promise<FeedItem[]> {
  return readAll();
}

export async function create(text: string): Promise<FeedItem> {
  const items = await readAll();
  const item: FeedItem = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  items.unshift(item);
  await writeAll(items);
  return item;
}

export async function remove(id: string): Promise<boolean> {
  const items = await readAll();
  const next = items.filter(i => i.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}
