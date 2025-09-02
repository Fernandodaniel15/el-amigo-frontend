/**
 * AMIGO :: feed store — JSON + paginación + likes clásicos + reacciones por emoji (single-choice)
 * Retro-compat TOTAL con modelo previo.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { User } from '../plugins/auth.js';

export type Author = User;

// 👍 Like clásico (existente): string[] de userId
export type Reaction = string;

// 🟡 Nuevas reacciones por emoji (single-choice por usuario)
export type ReactionType = '❤' | '👎' | '👍' | '😂' | '🎉' | '😢' | '😡';
export type EmojiReaction = { userId: string; type: ReactionType };

export type ImageMedia = { url: string; filter?: string; caption?: string };
export type VideoMedia = { url: string; poster?: string; filter?: string; overlayText?: { text: string; x?: number; y?: number; font?: string } };
export type AudioMedia = { url: string; transcription?: string; effect?: 'none'|'fast'|'slow'|'robot' };

export type Media = {
  images?: ImageMedia[];
  videos?: VideoMedia[];
  audios?: AudioMedia[];
};

export type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author?: Author;
  reactions: Reaction[];            // like clásico (se mantiene)
  emojiReactions?: EmojiReaction[]; // single-choice por user
  media?: Media;
};

export type Item = {
  id: string;
  text: string;
  createdAt: string;
  author?: Author;
  comments: Comment[];
  reactions: Reaction[];            // like clásico
  emojiReactions?: EmojiReaction[]; // single-choice por user
  media?: Media;
};

type DB = { items: Item[] };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

let cache: DB | null = null;
let loading: Promise<void> | null = null;

async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {} }

// Normaliza posibles modelos intermedios (tipadas) a esquema final retro-compat
function normalizeEmojiAny(arr: any): EmojiReaction[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((r) => {
      if (r && typeof r.userId === 'string' && typeof r.type === 'string') {
        const type = r.type as ReactionType;
        if (['❤','👎','👍','😂','🎉','😢','😡'].includes(type)) return { userId: r.userId, type };
      }
      return null;
    })
    .filter(Boolean) as EmojiReaction[];
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

      for (const it of items) {
        // compat con modelos previos
        it.reactions = Array.isArray((it as any).reactions)
          ? (typeof (it as any).reactions[0] === 'string'
              ? (it as any).reactions as string[]
              : []) // si vinieron tipadas, las ignoramos para mantener "like clásico" intacto
          : [];
        it.emojiReactions = normalizeEmojiAny((it as any).emojiReactions) || [];
        it.comments  = Array.isArray(it.comments) ? it.comments : [];
        it.media     = it.media || undefined;

        for (const c of it.comments) {
          c.reactions = Array.isArray((c as any).reactions)
            ? (typeof (c as any).reactions[0] === 'string' ? (c as any).reactions as string[] : [])
            : [];
          c.emojiReactions = normalizeEmojiAny((c as any).emojiReactions) || [];
          c.media = c.media || undefined;
        }
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

export async function getAll(): Promise<Item[]> { await loadOnce(); return (cache as DB).items; }
export async function getById(id: string): Promise<Item | undefined> { return (await getAll()).find(i => i.id === id); }

export async function addItem(item: Item): Promise<void> {
  const items = await getAll();
  items.push({
    ...item,
    reactions: item.reactions ?? [],
    emojiReactions: item.emojiReactions ?? [],
    media: item.media || undefined,
    comments: (item.comments ?? []).map(c => ({
      ...c,
      reactions: c.reactions ?? [],
      emojiReactions: c.emojiReactions ?? [],
      media: c.media || undefined,
    })),
  });
  await save();
}

export async function updateItem(id: string, partial: Partial<Item>): Promise<Item | undefined> {
  const items = await getAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  const prev = items[idx];
  const updated: Item = {
    ...prev,
    ...partial,
    id: prev.id,
    reactions: partial.reactions ?? prev.reactions,
    emojiReactions: partial.emojiReactions ?? prev.emojiReactions ?? [],
    comments: prev.comments, // comentarios por helpers
    media: partial.media ?? prev.media,
  };
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
  it.comments.push({
    ...comment,
    reactions: comment.reactions ?? [],
    emojiReactions: comment.emojiReactions ?? [],
    media: comment.media || undefined,
  });
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

// ============ Likes clásicos (compat) ============
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

// ============ NUEVAS reacciones por emoji (single-choice por usuario) ============
function setSingleEmoji(arr: EmojiReaction[], userId: string, type: ReactionType) {
  const prev = arr.find(r => r.userId === userId);
  if (prev && prev.type === type) {
    const i = arr.findIndex(r => r.userId === userId && r.type === type);
    if (i >= 0) arr.splice(i, 1);
    return;
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].userId === userId) arr.splice(i, 1);
  }
  arr.push({ userId, type });
}

export async function toggleItemEmoji(itemId: string, userId: string, type: ReactionType): Promise<Item> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  it.emojiReactions ||= [];
  setSingleEmoji(it.emojiReactions, userId, type);
  await save();
  return it;
}

export async function toggleCommentEmoji(itemId: string, commentId: string, userId: string, type: ReactionType): Promise<Comment> {
  const it = await getById(itemId);
  if (!it) throw new Error('item no existe');
  const c = it.comments.find(x => x.id === commentId);
  if (!c) throw new Error('comentario no existe');
  c.emojiReactions ||= [];
  setSingleEmoji(c.emojiReactions, userId, type);
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
    start = start >= 0 ? start + 1 : 0;
  }

  const slice = sorted.slice(start, start + limit);
  const last = slice[slice.length - 1];
  const nextCursor = slice.length === limit && last ? `${last.createdAt}|${last.id}` : undefined;
  return { items: slice, nextCursor };
}
