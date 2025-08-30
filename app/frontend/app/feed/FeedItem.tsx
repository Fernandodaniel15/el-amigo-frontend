'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete, apiPut } from '@/lib/http';

type Props = { id: string; text: string; createdAt?: string };

export default function FeedItem({ id, text, createdAt }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSave() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${id}`, { text: value });
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert('No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm('¿Borrar este ítem?')) return;
    setBusy(true);
    try {
      await apiDelete(`/v1/feed/${id}`);
      router.refresh();
    } catch {
      alert('No se pudo borrar');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled={busy} onClick={onSave}>Guardar</button>
          <button disabled={busy} onClick={() => { setEditing(false); setValue(text); }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ marginBottom: 6 }}>{text}</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
        {createdAt ? new Date(createdAt).toLocaleString() : ''}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditing(true)}>Editar</button>
        <button onClick={onDelete}>Borrar</button>
      </div>
    </div>
  );
}
// app/frontend/app/feed/FeedItem.tsx