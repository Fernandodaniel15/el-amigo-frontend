/** 
 * AMIGO :: BLOQUE: feed · SUBMÓDULO: frontend-http · ACCIÓN(ES): MODIFICAR 
 * SUPERFICIE UI: feed 
 * DEPENDENCIAS: gateway :8080 
 * CONTRATOS: REST /v1/* · COMPAT: backward-compatible 
 * SLOs: p95<200ms (BFF) · IDEMP: X-Idempotency-Key en creaciones 
 * PRIVACIDAD: cookies (include) 
 * OBSERVABILIDAD: (client) n/a 
 * RIESGOS MITIGADOS: base duplicada (/v1) 
 * DESCRIPCIÓN: wrapper fetch único; evita BASE con /v1 duplicado 
 */
 // app/frontend/lib/http.ts
const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/v1';

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    credentials: 'include', // cookies para auth
    cache: 'no-store',
  });

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || 'error';
    throw new Error(msg);
  }
  return data as T;
}

export const apiGet    = <T=any>(path: string)            => request<T>(path);
export const apiPost   = <T=any>(path: string, body?: any)=> request<T>(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const apiPut    = <T=any>(path: string, body?: any)=> request<T>(path, { method: 'PUT',  body: JSON.stringify(body || {}) });
export const apiDelete = <T=any>(path: string)            => request<T>(path, { method: 'DELETE' });

// auth helpers
export const apiMe    = () => apiGet<{ ok: true; user: { id: string; name: string } | null }>('/auth/me');
export const apiLogin = (id?: string, name?: string) => apiPost('/auth/login', { id, name });
export const apiLogout= () => apiPost('/auth/logout', {});
