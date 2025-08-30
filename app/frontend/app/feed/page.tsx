// app/frontend/app/feed/page.tsx
import FeedForm from "./FeedForm";
import { apiGet } from "@/lib/http";

type Item = { id: string; text: string; createdAt?: string };

export default async function FeedPage() {
  // Trae los items del backend
  const res = (await apiGet("/v1/feed")) as { items?: Item[] };
  const items: Item[] = res?.items ?? [];

  return (
    <main style={{ padding: 28, fontFamily: "system-ui", maxWidth: 860 }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 24 }}>
        Para alimentar
      </h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Nuevo artículo</h2>
        <FeedForm />
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Elementos
        </h2>

        {items.length === 0 ? (
          <p>No hay artículos aún.</p>
        ) : (
          <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0 }}>
            {items.map((it) => (
              <li
                key={it.id}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: 14,
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                {it.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
