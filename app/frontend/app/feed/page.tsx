import FeedForm from './FeedForm';
import { apiGet } from '@/lib/http';

type Item = {
  id: string;
  text: string;
  createdAt?: string;
  author?: { id: string; name: string };
};

export const dynamic = 'force-dynamic'; // evita caché de SSR

export default async function FeedPage() {
  let items: Item[] = [];
  try {
    const res = await apiGet<{ ok: boolean; items: Item[] }>('/v1/feed');
    items = res?.items ?? [];
  } catch {
    // si el backend no está, que igual renderice el formulario
    items = [];
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 16 }}>
      <h1>Feed</h1>
      <section style={{ marginBottom: 20 }}>
        <FeedForm />
      </section>
      <h2>Elementos</h2>
      {items.length === 0 ? (
        <div>No hay artículos aún.</div>
      ) : (
        items.map(it => (
          <div key={it.id} style={{border:'1px solid #eee', padding:12, borderRadius:8, marginBottom:10}}>
            <div style={{fontSize:12, opacity:.7}}>
              {it.author?.name} · {new Date(it.createdAt || '').toLocaleString()}
            </div>
            <div>{it.text}</div>
          </div>
        ))
      )}
    </main>
  );
}
