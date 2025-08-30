const BASE = process.env.NEXT_PUBLIC_API ?? 'http://localhost:8080';

async function handle<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    const msg = (data.message || data.error || r.statusText || 'request failed') as string;
    throw new Error(msg);
  }
  return r.json();
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  return handle<T>(r);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': cryptoRandom() },
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(r);
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(r);
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  return handle<T>(r);
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}
