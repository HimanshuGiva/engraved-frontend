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

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new ApiError('VITE_ENGRAVING_API_URL is not set', 0, 'config_error');
  }

  const headers = new Headers(init.headers);
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
