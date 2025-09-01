/** * AMIGO :: BLOQUE: frontend · SUBMÓDULO: comments · ACCIÓN(ES): MODIFICAR

SUPERFICIE UI: feed

DEPENDENCIAS: http.ts

CONTRATOS: /v1/feed/:id/comments*

COMPAT: backward-compatible

DESCRIPCIÓN: listar/paginar + crear + borrar + editar + like
*/
// app/frontend/app/feed/Comments.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPut, apiMe } from '@/lib/http';

type Props = { itemId: string };
type Comment = { id: string; text: string; createdAt?: string; author?: {id:string; name:string}; reactions?: {userId:string}[] };

export default function Comments({ itemId }: Props) {
  const [list, setList] = useState<Comment[]>([]);
  const [next, setNext] = useState<string|undefined>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState('');

  useEffect(() => { apiMe().then(r=> setMe(r.user)); }, []);

  async function load(cursor?: string) {
    setLoading(true); setErr('');
    try {
      const res = await apiGet<{ ok: true; comments: Comment[]; nextCursor?: string }>(`/v1/feed/${itemId}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (cursor) setList(prev => [...prev, ...res.comments]);
      else setList(res.comments);
      setNext(res.nextCursor);
    } catch (e:any) { setErr(e?.message ?? 'No se pudo cargar comentarios'); }
    finally { setLoading(false); }
  }
  useEffect(() => { setList([]); setNext(undefined); load(); }, [itemId]);

  async function onAdd() {
    const val = text.trim(); if (!val) return;
    setBusy(true);
    try {
      await apiPost(`/v1/feed/${itemId}/comments`, { text: val });
      setText(''); await load(); // recargo primera página
    } catch (e:any) {
      if (String(e?.message || '').includes('login')) alert('Iniciá sesión para comentar');
      else alert(e?.message ?? 'No se pudo comentar');
    } finally { setBusy(false); }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Borrar comentario?')) return;
    setBusy(true);
    try { await apiDelete(`/v1/feed/${itemId}/comments/${id}`); setList(prev => prev.filter(x => x.id !== id)); }
    catch (e:any) { alert(e?.message ?? 'No se pudo borrar'); }
    finally { setBusy(false); }
  }

  function canEdit(c: Comment) { return me && c.author?.id === me.id; }

  async function onEditSave(id: string) {
    const val = editingVal.trim(); if (!val) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${itemId}/comments/${id}`, { text: val });
      setList(prev => prev.map(c => c.id === id ? { ...c, text: val } : c));
      setEditingId(null);
    } catch (e:any) { alert(e?.message ?? 'No se pudo editar'); }
    finally { setBusy(false); }
  }

  async function onLike(id: string) {
    if (!me) return alert('Login para reaccionar');
    try {
      await apiPost(`/v1/feed/${itemId}/comments/${id}/like`, {});
      await load(); // simple: recargo para ver contador
    } catch (e:any) { alert(e?.message ?? 'No se pudo reaccionar'); }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ddd' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Comentarios</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={me ? "Escribí un comentario…" : "Logueate para comentar"}
          disabled={!me}
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
        />
        <button disabled={busy || !text.trim() || !me} onClick={onAdd}>Agregar</button>
        {!me && <a href="/login">Login</a>}
      </div>

      {loading && <div style={{ color: '#666' }}>Cargando…</div>}
      {err && !loading && <div style={{ color: '#b00020' }}>Error: {err}</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((c) => (
          <li key={c.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
            {editingId === c.id ? (
              <>
                <textarea value={editingVal} onChange={e=>setEditingVal(e.target.value)} rows={2} style={{ width: '100%', padding: 6 }} />
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  <button disabled={busy} onClick={()=>onEditSave(c.id)}>Guardar</button>
                  <button disabled={busy} onClick={()=>{ setEditingId(null); }}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>{c.text}</div>
                <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                  <span>{c.author?.name ? <b>{c.author.name}</b> : '—'} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                  <span style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>onLike(c.id)}>👍</button>
                    {canEdit(c) && <>
                      <button onClick={()=>{ setEditingId(c.id); setEditingVal(c.text); }}>Editar</button>
                      <button onClick={()=>onDelete(c.id)}>Borrar</button>
                    </>}
                  </span>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {next && !loading && (
        <div style={{ marginTop: 8 }}>
          <button onClick={()=>load(next)}>Cargar más</button>
        </div>
      )}
    </div>
  );
}
+// Comments.tsx