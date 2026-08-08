const API_BASE = (import.meta.env.VITE_ENGRAVING_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const ACCESS_TOKEN = (import.meta.env.VITE_ACCESS_TOKEN as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Headers needed for browser fetches to ngrok tunnels (avoids HTML interstitial). */
export function apiFetchHeaders(extra?: HeadersInit, urlHint?: string): Headers {
  const headers = new Headers(extra);
  const hint = urlHint ?? API_BASE;
  if (hint.includes('ngrok')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return headers;
}

/** GET binary/text from the engraving API (public routes, no auth required). */
export async function apiFetchText(pathOrUrl: string): Promise<string> {
  if (!API_BASE && !pathOrUrl.startsWith('http')) {
    throw new ApiError('VITE_ENGRAVING_API_URL is not set', 0, 'config_error');
  }

  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API_BASE}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;

  const res = await fetch(url, { headers: apiFetchHeaders(undefined, url) });
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return res.text();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new ApiError('VITE_ENGRAVING_API_URL is not set', 0, 'config_error');
  }

  const headers = apiFetchHeaders(init.headers);
  if (ACCESS_TOKEN) {
    headers.set('xaccesstoken', ACCESS_TOKEN);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      message = errBody?.error?.message ?? message;
      code = errBody?.error?.code;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
