/** * AMIGO :: BLOQUE: frontend · SUBMÓDULO: feed-item · ACCIÓN(ES): MODIFICAR

SUPERFICIE UI: feed

DEPENDENCIAS: http.ts

CONTRATOS: /v1/feed/*, /auth/me

COMPAT: backward-compatible

DESCRIPCIÓN: edición optimista + like item
*/
//app/frontend/app/feed/FeedItem.tsx
'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete, apiPut, apiPost, apiMe } from '@/lib/http';
import Comments from './Comments';

type Props = {
  id: string;
  text: string;
  createdAt?: string;
  author?: { id: string; name: string };
  reactionsCount?: number;
  likedByMe?: boolean;
};

export default function FeedItem({ id, text, createdAt, author, reactionsCount = 0, likedByMe = false }: Props) {
  const router = useRouter();
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const [displayText, setDisplayText] = useState(text);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const [likes, setLikes] = useState(reactionsCount);
  const [liked, setLiked] = useState(likedByMe);

  useEffect(() => { apiMe().then(r => setMe(r.user)); }, []);
  const canEdit = !!(me && author && me.id === author.id);

  async function onSave() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${id}`, { text: value });
      setDisplayText(value);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e:any) { alert(e?.message || 'No se pudo guardar'); }
    finally { setBusy(false); }
  }
  async function onDelete() {
    if (!confirm('¿Borrar este ítem?')) return;
    setBusy(true);
    try { await apiDelete(`/v1/feed/${id}`); startTransition(() => router.refresh()); }
    catch (e:any) { alert(e?.message || 'No se pudo borrar'); }
    finally { setBusy(false); }
  }
  async function onLike() {
    if (!me) return alert('Login para reaccionar');
    // optimista
    setLiked(v => !v);
    setLikes(n => (liked ? n-1 : n+1));
    try {
      await apiPost(`/v1/feed/${id}/like`, {});
      startTransition(() => router.refresh());
    } catch {
      // rollback
      setLiked(v => !v);
      setLikes(n => (liked ? n+1 : n-1));
    }
  }

  if (editing) {
    return (
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} style={{ width: '100%', padding: 8 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled={busy} onClick={onSave}>Guardar</button>
          <button disabled={busy} onClick={() => { setEditing(false); setValue(displayText); }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>{displayText}</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
        {author?.name ? <b>{author.name}</b> : '—'} · {createdAt ? new Date(createdAt).toLocaleString() : ''}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={onLike}>{liked ? '❤️ Quitar' : '🤍 Me gusta'} ({likes})</button>
        {canEdit && <>
          <button onClick={() => setEditing(true)}>Editar</button>
          <button onClick={onDelete}>Borrar</button>
        </>}
      </div>

      <Comments itemId={id} />
    </div>
  );
}
// FeedItem.tsx