/** * AMIGO :: BLOQUE: frontend · SUBMÓDULO: http · ACCIÓN(ES): MODIFICAR

SUPERFICIE UI: feed/login

DEPENDENCIAS: gateway :8080

CONTRATOS: REST /auth/* y /v1/*

COMPAT: backward-compatible

DESCRIPCIÓN: wrapper fetch (cookies + errores)
*/
// app/frontend/lib/http.ts
const PUBLIC_BASE   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const INTERNAL_BASE = process.env.BACKEND_INTERNAL_URL || PUBLIC_BASE;

// Si corre en el servidor de Next (SSR/RSC) usamos la URL interna (gateway:8080).
// Si corre en el navegador usamos la pública (localhost:8080).
const BASE = typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE;

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    credentials: 'include',
    cache: 'no-store',
  });

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && (data as any).message) || (data as any).error || res.statusText || 'error';
    throw new Error(msg);
  }
  return data as T;
}

export const apiGet    = <T=any>(path: string) => request<T>(path);
export const apiPost   = <T=any>(path: string, body?: any) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const apiPut    = <T=any>(path: string, body?: any) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body || {}) });
export const apiDelete =  <T=any>(path: string) =>
  request<T>(path, { method: 'DELETE' });

// auth helpers
export const apiMe     = () => apiGet<{ ok: true; user: { id: string; name: string } | null }>('/auth/me');
export const apiLogin  = (id?: string, name?: string) => apiPost('/auth/login', { id, name });
export const apiLogout = () => apiPost('/auth/logout', {});
