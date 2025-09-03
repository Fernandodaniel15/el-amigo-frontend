// lib/http.ts
/**
 * AMIGO :: http wrapper (BASE robusta + timeout + cookies + logs útiles)
 */

const ENV_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim();
function detectBase(): string {
  // Si hay env, úsala
  if (ENV_BASE) return ENV_BASE;

  // Fallback: si estamos en http://localhost:3001 -> usar 8080 mismo host
  if (typeof window !== 'undefined') {
    try {
      const u = new URL(window.location.href);
      const host = u.hostname; // conserva localhost vs 127.0.0.1
      return `${u.protocol}//${host}:8080`;
    } catch {
      /* ignore */
    }
  }
  // Último recurso:
  return 'http://localhost:8080';
}

const API_BASE = detectBase();

function urlFor(path: string) {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 15_000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function handle<T = unknown>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.toLowerCase().includes('application/json');
  const payload = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg =
      (isJson ? ((payload as any)?.message || (payload as any)?.error) : String(payload)) ||
      res.statusText ||
      'error';
    throw new Error(msg);
  }
  return payload as T;
}

function logFail(err: unknown, input: RequestInfo | URL) {
  // Log claro en consola con la URL exacta
  // @ts-ignore
  const url = typeof input === 'string' ? input : (input?.toString?.() ?? '');
  // eslint-disable-next-line no-console
  console.error('HTTP FAIL ⇒', { url, base: API_BASE, error: err });
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const url = urlFor(path);
  try {
    const res = await fetchWithTimeout(url, { credentials: 'include', cache: 'no-store' });
    return await handle<T>(res);
  } catch (e) {
    logFail(e, url);
    throw e instanceof Error ? e : new Error('fetch failed');
  }
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const url = urlFor(path);
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    return await handle<T>(res);
  } catch (e) {
    logFail(e, url);
    throw e instanceof Error ? e : new Error('fetch failed');
  }
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const url = urlFor(path);
  try {
    const res = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    return await handle<T>(res);
  } catch (e) {
    logFail(e, url);
    throw e instanceof Error ? e : new Error('fetch failed');
  }
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const url = urlFor(path);
  try {
    const res = await fetchWithTimeout(url, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    });
    return await handle<T>(res);
  } catch (e) {
    logFail(e, url);
    throw e instanceof Error ? e : new Error('fetch failed');
  }
}

// auth
export const apiMe     = () => apiGet<{ ok: true; user: { id: string; name: string } | null }>('/auth/me');
export const apiLogin  = (id?: string, name?: string) => apiPost('/auth/login', { id, name });
export const apiLogout = () => apiPost('/auth/logout', {});
