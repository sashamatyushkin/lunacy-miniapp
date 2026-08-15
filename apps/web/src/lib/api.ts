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
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api-endpoint.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const cfg = (await res.json()) as { url?: string };
      if (cfg.url) {
        BASE = cfg.url.replace(/\/$/, '');
        return;
      }
    } catch {
      // повторим — статика на Pages обычно доступна сразу
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Туннель на dev-машине изредка отдаёт 502/504 или рвёт соединение в момент
 *  переподключения. Такие сбои временные — молча повторяем, чтобы пользователь
 *  не видел «нет соединения» из-за одной неудачной секунды. */
function transient(status: number) {
  return status === 0 || status === 502 || status === 503 || status === 504;
}

export async function api<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
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
    if (attempt < 4) {
      await sleep(600 * (attempt + 1));
      return api<T>(path, init, attempt + 1);
    }
    throw new ApiError('нет соединения с сервером', 0);
  }

  if (transient(res.status) && attempt < 4) {
    await sleep(600 * (attempt + 1));
    return api<T>(path, init, attempt + 1);
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError('сессия истекла', 401);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  // Туннель на сбое может вернуть HTML-страницу вместо JSON — не роняемся на парсинге.
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (attempt < 4) {
      await sleep(600 * (attempt + 1));
      return api<T>(path, init, attempt + 1);
    }
    throw new ApiError('нет соединения с сервером', 0);
  }

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
