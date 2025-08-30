// app/frontend/app/feed/Comments.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/http';

type Props = { itemId: string };
type Comment = { id: string; text: string; createdAt?: string };

export default function Comments({ itemId }: Props) {
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    try {
      setErr('');
      setLoading(true);
      const res = await apiGet<{ comments: Comment[] }>(`/v1/feed/${itemId}/comments`);
      setList(res.comments ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cargar comentarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [itemId]);

  async function onAdd() {
    const val = text.trim();
    if (!val) return;
    setBusy(true);
    try {
      await apiPost(`/v1/feed/${itemId}/comments`, { text: val });
      setText('');
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo comentar');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Borrar comentario?')) return;
    setBusy(true);
    try {
      await apiDelete(`/v1/feed/${itemId}/comments/${id}`);
      setList(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo borrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ddd' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Comentarios</div>

      {/* Nuevo comentario */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un comentario…"
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
        />
        <button disabled={busy || !text.trim()} onClick={onAdd}>
          Agregar
        </button>
      </div>

      {/* Estado */}
      {loading && <div style={{ color: '#666' }}>Cargando…</div>}
      {err && !loading && <div style={{ color: '#b00020' }}>Error: {err}</div>}

      {/* Lista */}
      {(!loading && list.length === 0) ? (
        <div style={{ color: '#666' }}>No hay comentarios.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c) => (
            <li key={c.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
              <div style={{ marginBottom: 4 }}>{c.text}</div>
              <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                <button disabled={busy} onClick={() => onDelete(c.id)}>Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
