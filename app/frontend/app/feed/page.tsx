// app/frontend/app/feed/page.tsx
import FeedForm from "./FeedForm";
import FeedItem from "./FeedItem";
import { apiGet } from "@/lib/http";

type Item = {
  id: string;
  text: string;
  createdAt?: string;
  author?: { id: string; name: string };
};

export default async function FeedPage() {
  const res = await apiGet<{ items: Item[] }>('/v1/feed');
  const items: Item[] = res?.items ?? [];

  return (
    <main style={{ padding: 20 }}>
      <h1>Feed</h1>

      <section style={{ marginBottom: 20 }}>
        <FeedForm />
      </section>

      <h2>Elementos</h2>
      {items.length === 0 ? (
        <div>No hay artículos aún.</div>
      ) : (
        items.map(it => (
          <FeedItem
            key={it.id}
            id={it.id}
            text={it.text}
            createdAt={it.createdAt}
            author={it.author}
          />
        ))
      )}
    </main>
  );
}
// app/frontend/pages/feed.tsx