// app/frontend/app/feed/FeedItem.tsx
'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete, apiPut, apiMe } from '@/lib/http';
import Comments from './Comments';

type Props = {
  id: string;
  text: string;
  createdAt?: string;
  author?: { id: string; name: string };
};

export default function FeedItem({ id, text, createdAt, author }: Props) {
  const router = useRouter();

  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const [displayText, setDisplayText] = useState(text);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);

  useEffect(() => { apiMe().then(r => setMe(r.user)); }, []);
  const canEdit = !!(me && author && me.id === author.id);

  async function onSave() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await apiPut(`/feed/${id}`, { text: value });
      setDisplayText(value);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e:any) {
      alert(e?.message || 'No se pudo guardar');
    } finally { setBusy(false); }
  }

  async function onDelete() {
    if (!confirm('¿Borrar este ítem?')) return;
    setBusy(true);
    try {
      await apiDelete(`/feed/${id}`);
      startTransition(() => router.refresh());
    } catch (e:any) {
      alert(e?.message || 'No se pudo borrar');
    } finally { setBusy(false); }
  }

  if (editing) {
    return (
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled={busy} onClick={onSave}>Guardar</button>
          <button disabled={busy} onClick={() => { setEditing(false); setValue(displayText); }}>
            Cancelar
          </button>
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
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setEditing(true)}>Editar</button>
          <button onClick={onDelete}>Borrar</button>
        </div>
      )}

      <Comments itemId={id} />
    </div>
  );
}
