// app/frontend/lib/http.ts
const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8080";

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET failed (${r.status})`);
  return r.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST failed (${r.status})`);
  return r.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE failed (${r.status})`);
  return r.json();
}

