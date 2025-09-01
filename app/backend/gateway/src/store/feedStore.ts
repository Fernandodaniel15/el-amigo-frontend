/**
 * AMIGO :: feed store (JSON + paginación + reacciones)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { User } from '../plugins/auth.js';

export type Author  = User;
export type Reaction = string; // userId

export type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author?: Author;
  reactions: Reaction[];
};

export type Item = {
  id: string;
  text: string;
  createdAt: string;
  author?: Author;
  comments: Comment[];
  reactions: Reaction[];
};

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
      const raw  = await fs.readFile(DB_FILE, 'utf8');
      const data = JSON.parse(raw) as DB;
      const items = Array.isArray(data.items) ? data.items : [];
      // normalizamos campos nuevos (reactions)
      for (const it of items) {
        it.reactions ||= [];
        it.comments ||= [];
        for (const c of it.comments) c.reactions ||= [];
      }
      cache = { items };
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

export async function removeItem(id: string): Promise<void> {
  const items = await getAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;
  items.splice(idx, 1);
  await save();
}

export async function addComment(itemId: string, comment: Comment): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  it.comments.push(comment);
  await save();
}

export async function updateComment(itemId: string, commentId: string, newText: string): Promise<Comment | undefined> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const idx = it.comments.findIndex(c => c.id === commentId);
  if (idx === -1) throw new Error('comentario no existe');
  it.comments[idx] = { ...it.comments[idx], text: newText };
  await save();
  return it.comments[idx];
}

export async function removeComment(itemId: string, commentId: string): Promise<void> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const idx = it.comments.findIndex(c => c.id === commentId);
  if (idx === -1) throw new Error('comentario no existe');
  it.comments.splice(idx, 1);
  await save();
}

export async function toggleItemLike(itemId: string, userId: string): Promise<Item> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const i = it.reactions.indexOf(userId);
  if (i >= 0) it.reactions.splice(i, 1); else it.reactions.push(userId);
  await save();
  return it;
}

export async function toggleCommentLike(itemId: string, commentId: string, userId: string): Promise<Comment> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const c = it.comments.find(x => x.id === commentId);
  if (!c) throw new Error('comentario no existe');
  const i = c.reactions.indexOf(userId);
  if (i >= 0) c.reactions.splice(i, 1); else c.reactions.push(userId);
  await save();
  return c;
}

/**
 * Paginación basada en cursor "<createdAt>|<id>" (orden desc por createdAt, id tie-break).
 */
export function paginate<T extends { createdAt: string; id: string }>(
  arr: T[], limit: number, cursor?: string
): { items: T[]; nextCursor?: string } {
  const sorted = [...arr].sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.id < b.id ? 1 : -1; // desc
    return a.createdAt < b.createdAt ? 1 : -1; // desc
  });

  let start = 0;
  if (cursor) {
    const [cAt, cId] = cursor.split('|');
    start = sorted.findIndex(x => x.createdAt === cAt && x.id === cId);
    if (start >= 0) start = start + 1; // empiezar después del cursor
    else start = 0;
  }

  const slice = sorted.slice(start, start + limit);
  const last = slice[slice.length - 1];
  const nextCursor = slice.length === limit && last ? `${last.createdAt}|${last.id}` : undefined;
  return { items: slice, nextCursor };
}
