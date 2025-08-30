// app/frontend/lib/http.ts
const BASE = process.env.NEXT_PUBLIC_API || 'http://localhost:8080/v1';

async function handle(r: Response) {
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = err?.message || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return r.json();
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store', credentials: 'include' });
  return handle(r);
}
export async function apiPost<T = unknown>(path: string, body?: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  return handle(r);
}
export async function apiPut<T = unknown>(path: string, body?: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  return handle(r);
}
export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  return handle(r);
}

// auth helpers
export async function apiMe() {
  try { return await apiGet<{ ok: boolean; user?: { id: string; name: string } }>('/auth/me'); }
  catch { return { ok: false } as const; }
}
export async function apiLogin(name: string) {
  return apiPost('/auth/login', { name });
}
export async function apiLogout() {
  return apiPost('/auth/logout', {});
}
