'use client';
import { useEffect, useState } from 'react';
import { apiPost, apiMe } from '@/lib/http';
import { useRouter } from 'next/navigation';

export default function FeedForm() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const router = useRouter();

  useEffect(() => { apiMe().then(r => setMe(r.user ?? null)); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = text.trim();
    if (!val) return;
    setBusy(true);
    try {
      await apiPost('/v1/feed', { text: val });
      setText('');
      router.refresh();
    } catch (e:any) {
      alert(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        rows={3}
        placeholder={me ? 'Escribí algo...' : 'Login para publicar'}
        disabled={!me}
        style={{ width: '100%', padding: 8 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={busy || !me} type="submit">Enviar</button>
        {!me && <a href="/login">Ir a login</a>}
      </div>
    </form>
  );
}
