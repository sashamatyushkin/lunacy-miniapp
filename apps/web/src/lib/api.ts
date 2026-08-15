/**
 * Адрес API.
 *
 * В разработке пусто — Vite проксирует /api в Fastify на том же origin.
 * На GitHub Pages фронтенд статичен, а API живёт на туннеле, чей адрес меняется.
 * Вшивать его в бандл нельзя (иначе каждая смена = пересборка), поэтому он
 * лежит в api-endpoint.json рядом со статикой и читается один раз при старте.
 */
let BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function resolveApiBase(): Promise<void> {
  if (BASE) return;
  const sameOrigin = import.meta.env.DEV || window.location.hostname === 'localhost';
  if (sameOrigin) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api-endpoint.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    const cfg = (await res.json()) as { url?: string };
    if (cfg.url) BASE = cfg.url.replace(/\/$/, '');
  } catch {
    // оставляем пустой BASE — запросы упадут с понятной ошибкой сети
  }
}

let token: string | null = localStorage.getItem('lunacy_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('lunacy_token', t);
  else localStorage.removeItem('lunacy_token');
}

export function getToken() {
  return token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        // localtunnel показывает браузерам страницу-предупреждение; этот
        // заголовок её отключает. Для других хостов он просто игнорируется.
        'bypass-tunnel-reminder': '1',
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('нет соединения с сервером', 0);
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError('сессия истекла', 401);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? 'что-то пошло не так';
    throw new ApiError(msg, res.status, data as Record<string, unknown> | null);
  }
  return data as T;
}

export const get = <T,>(p: string) => api<T>(p);
export const post = <T,>(p: string, body?: unknown) =>
  api<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T,>(p: string, body?: unknown) =>
  api<T>(p, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });
export const del = <T,>(p: string) => api<T>(p, { method: 'DELETE' });
