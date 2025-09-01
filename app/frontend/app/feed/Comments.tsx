'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPut, apiMe } from '@/lib/http';

type Props = { itemId: string };
type User = { id: string; name: string };
type Comment = {
  id: string;
  text: string;
  createdAt?: string;
  author?: User;
  reactionsCount?: number;
  likedByMe?: boolean;
};

export default function Comments({ itemId }: Props) {
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [moreBusy, setMoreBusy] = useState(false);

  useEffect(() => { apiMe().then(r=> setMe((r as any).user ?? null)); }, []);

  async function load(initial = false) {
    try {
      if (initial) { setLoading(true); setList([]); setCursor(undefined); }
      setErr('');
      const qs = new URLSearchParams();
      qs.set('limit','10');
      if (!initial && cursor) qs.set('cursor', cursor);
      const res = await apiGet<{ ok: true; comments: Comment[]; nextCursor?: string }>(`/v1/feed/${itemId}/comments?${qs.toString()}`);
      setList(prev => (initial ? res.comments : [...prev, ...res.comments]));
      setCursor(res.nextCursor);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cargar comentarios');
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [itemId]);

  async function onAdd() {
    const val = text.trim();
    if (!val) return;
    setBusy(true);
    try {
      await apiPost(`/v1/feed/${itemId}/comments`, { text: val });
      setText('');
      await load(true);
    } catch (e: any) {
      alert(String(e?.message || '').includes('login') ? 'Iniciá sesión para comentar' : (e?.message ?? 'No se pudo comentar'));
    } finally { setBusy(false); }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Borrar comentario?')) return;
    setBusy(true);
    try {
      await apiDelete(`/v1/feed/${itemId}/comments/${id}`);
      setList(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo borrar');
    } finally { setBusy(false); }
  }

  async function onLike(id: string, likedByMe: boolean) {
    if (!me) return alert('Login para reaccionar');
    // optimista
    setList(prev => prev.map(c => c.id === id
      ? { ...c, likedByMe: !likedByMe, reactionsCount: (c.reactionsCount || 0) + (likedByMe ? -1 : 1) }
      : c
    ));
    try {
      await apiPost(`/v1/feed/${itemId}/comments/${id}/like`, {});
    } catch {
      // rollback
      setList(prev => prev.map(c => c.id === id
        ? { ...c, likedByMe, reactionsCount: (c.reactionsCount || 0) + (likedByMe ? 0 : -1) + (likedByMe ? 1 : 0) }
        : c
      ));
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditVal(c.text);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditVal('');
  }
  async function saveEdit(id: string) {
    const val = editVal.trim();
    if (!val) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${itemId}/comments/${id}`, { text: val });
      setList(prev => prev.map(c => c.id === id ? { ...c, text: val } : c));
      cancelEdit();
    } catch (e:any) {
      alert(e?.message || 'No se pudo editar');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ddd' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Comentarios</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={me ? 'Escribí un comentario…' : 'Logueate para comentar'}
          disabled={!me}
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
        />
        <button disabled={busy || !text.trim() || !me} onClick={onAdd}>Agregar</button>
        {!me && <a href="/login">Login</a>}
      </div>

      {loading && <div style={{ color: '#666' }}>Cargando…</div>}
      {err && !loading && <div style={{ color: '#b00020' }}>Error: {err}</div>}

      {!loading && list.length === 0 ? (
        <div style={{ color: '#666' }}>No hay comentarios.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c) => {
            const iCanEdit = !!(me && c.author && me.id === c.author.id);
            const iCanDelete = iCanEdit;
            const isEditing = editingId === c.id;
            return (
              <li key={c.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                {!isEditing ? (
                  <>
                    <div style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>{c.text}</div>
                    <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span>
                        {c.author?.name ? <b>{c.author.name}</b> : '—'} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={()=>onLike(c.id, !!c.likedByMe)}>{c.likedByMe ? '❤️ Quitar' : '🤍 Me gusta'} ({c.reactionsCount || 0})</button>
                        {iCanEdit && <button onClick={()=>startEdit(c)}>Editar</button>}
                        {iCanDelete && <button disabled={busy} onClick={() => onDelete(c.id)}>Borrar</button>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <textarea value={editVal} onChange={e=>setEditVal(e.target.value)} rows={2} style={{ width: '100%', padding: 6 }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button disabled={busy} onClick={()=>saveEdit(c.id)}>Guardar</button>
                      <button disabled={busy} onClick={cancelEdit}>Cancelar</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!cursor && (
        <div style={{ marginTop: 10 }}>
          <button disabled={moreBusy} onClick={async ()=>{ setMoreBusy(true); await load(false); setMoreBusy(false); }}>
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
}
