// app/frontend/app/feed/page.tsx
import FeedForm from "./FeedForm";
import { apiGet } from "@/lib/http";
import FeedItem from "./FeedItem";

type Item = { id: string; text: string; createdAt?: string };

export default async function FeedPage() {
  const res = (await apiGet<{ items?: Item[] }>("/v1/feed"));
  const items: Item[] = res?.items ?? [];

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 40, marginBottom: 12 }}>Para alimentar</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Nuevo artículo</h2>
        <FeedForm />
      </section>

      <section>
        <h2>Elementos</h2>
        {items.length === 0 && <p>No hay artículos aún.</p>}
        {items.map(it => (
          <FeedItem key={it.id} id={it.id} text={it.text} createdAt={it.createdAt} />
        ))}
      </section>
    </main>
  );
}
