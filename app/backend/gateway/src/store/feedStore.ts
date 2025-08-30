// app/backend/gateway/src/store/feedStore.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type Comment = { id: string; text: string; createdAt: string };
export type Item = { id: string; text: string; createdAt: string; comments: Comment[] };
type State = { items: Item[] };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'feed.json');

let state: State = { items: [] };
let loaded = false;

async function ensureDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<void> {
  if (loaded) return;
  await ensureDir();
  try {
    const buf = await readFile(FILE);
    state = JSON.parse(buf.toString()) as State;
    if (!state?.items) state = { items: [] };
  } catch {
    // primera corrida: archivo no existe
    state = { items: [] };
    await save();
  }
  loaded = true;
}

async function save(): Promise<void> {
  await ensureDir();
  const json = JSON.stringify(state, null, 2);
  await writeFile(FILE, json);
}

// API del store
export async function getAll(): Promise<Item[]> {
  await load();
  return state.items;
}

export async function getById(id: string): Promise<Item | undefined> {
  await load();
  return state.items.find((x) => x.id === id);
}

export async function addItem(it: Item): Promise<void> {
  await load();
  state.items.push(it);
  await save();
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item | undefined> {
  await load();
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx === -1) return;
  state.items[idx] = { ...state.items[idx], ...patch };
  await save();
  return state.items[idx];
}

export async function removeItem(id: string): Promise<Item | undefined> {
  await load();
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const [removed] = state.items.splice(idx, 1);
  await save();
  return removed;
}

export async function addComment(itemId: string, c: Comment): Promise<void> {
  await load();
  const it = state.items.find((x) => x.id === itemId);
  if (!it) throw new Error('item no existe');
  it.comments.push(c);
  await save();
}

export async function removeComment(itemId: string, cid: string): Promise<void> {
  await load();
  const it = state.items.find((x) => x.id === itemId);
  if (!it) throw new Error('item no existe');
  const idx = it.comments.findIndex((x) => x.id === cid);
  if (idx === -1) throw new Error('comentario no existe');
  it.comments.splice(idx, 1);
  await save();
}
