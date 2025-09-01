'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, apiMe } from '@/lib/http';

export default function FeedForm() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const router = useRouter();

  // cargar estado de auth en primer render
  useState(() => { apiMe().then(r => setMe(r.user ?? null)); });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = text.trim();
    if (!val) return;
    setBusy(true);
    setErr('');
    try {
      await apiPost('/v1/feed', { text: val });
      setText('');
      router.refresh();
    } catch (e:any) {
      setErr(e?.message || 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      {err && <div style={{ color: '#b00020', marginBottom: 8 }}>Error: {err}</div>}
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={me ? 'Escribí algo...' : 'Iniciá sesión para publicar'}
        disabled={!me}
        rows={3}
        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
      />
      <div style={{ marginTop: 8 }}>
        <button disabled={busy || !me || !text.trim()} type="submit">Enviar</button>
        {!me && <a href="/login" style={{ marginLeft: 8 }}>Login</a>}
      </div>
    </form>
  );
}
