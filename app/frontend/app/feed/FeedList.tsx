'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/http';
import FeedForm from './FeedForm';
import FeedItem from './FeedItem';

type ItemDTO = {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string; name: string };
  reactionsCount?: number;
  likedByMe?: boolean;
};

export default function FeedList() {
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');

  async function load(initial = false) {
    try {
      if (initial) { setLoading(true); setItems([]); setCursor(undefined); }
      setError('');
      const qs = new URLSearchParams();
      qs.set('limit', '10');
      if (!initial && cursor) qs.set('cursor', cursor);
      const res = await apiGet<{ ok: true; items: ItemDTO[]; nextCursor?: string }>(`/v1/feed?${qs.toString()}`);
      setItems(prev => (initial ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => { load(true); }, []);

  return (
    <section>
      <FeedForm />

      {loading && <div>Cargando…</div>}
      {error && !loading && <div style={{ color: '#b00020' }}>Error: {error}</div>}
      {(!loading && items.length === 0) && <div>No hay posts.</div>}

      {items.map(it => (
        <FeedItem
          key={it.id}
          id={it.id}
          text={it.text}
          createdAt={it.createdAt}
          author={it.author}
          reactionsCount={it.reactionsCount || 0}
          likedByMe={!!it.likedByMe}
        />
      ))}

      {!!cursor && (
        <div style={{ marginTop: 12 }}>
          <button
            disabled={moreBusy}
            onClick={async () => { setMoreBusy(true); await load(false); setMoreBusy(false); }}
          >
            Cargar más
          </button>
        </div>
      )}
    </section>
  );
}
