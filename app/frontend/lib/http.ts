/**
 * AMIGO :: http wrapper (BASE dual + headers seguros)
 * - No envía Content-Type en GET/DELETE para evitar preflights innecesarios.
 * - Mantiene cookies (credentials: 'include').
 */
const PUBLIC_BASE   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const INTERNAL_BASE = process.env.BACKEND_INTERNAL_URL || PUBLIC_BASE;
// SSR usa INTERNAL (docker: http://gateway:8080), browser usa PUBLIC (http://localhost:8080)
const BASE = typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE;

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const method = ((init.method || 'GET') as Method).toUpperCase() as Method;

  // Headers mínimos: solo Content-Type cuando hay body (POST/PUT).
  const baseHeaders: Record<string, string> = {};
  if ((method === 'POST' || method === 'PUT') && init.body !== undefined) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    method,
    headers: { ...baseHeaders, ...(init.headers as Record<string, string> | undefined) },
    credentials: 'include',
    cache: 'no-store',
  });

  // Intenta parsear JSON si corresponde
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      (data && (data as any).message) ||
      (data as any).error ||
      res.statusText ||
      'error';
    throw new Error(msg);
  }
  return data as T;
}

// Helpers
export const apiGet    = <T=any>(path: string) => request<T>(path, { method: 'GET' });
export const apiPost   = <T=any>(path: string, body?: any) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const apiPut    = <T=any>(path: string, body?: any) =>
  request<T>(path, { method: 'PUT',  body: JSON.stringify(body ?? {}) });
export const apiDelete =   <T=any>(path: string) =>
  request<T>(path, { method: 'DELETE' });

// auth helpers
export const apiMe     = () => apiGet<{ ok: true; user: { id: string; name: string } | null }>('/auth/me');
export const apiLogin  = (id?: string, name?: string) => apiPost('/auth/login', { id, name });
export const apiLogout = () => apiPost('/auth/logout', {});
