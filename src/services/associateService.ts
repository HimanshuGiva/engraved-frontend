import { apiFetchHeaders, ApiError } from './apiClient';
import type { AppEngravingOrder } from './orderService';
import type { EngravingJob, LaserStation } from './associateTypes';

const API_BASE = (import.meta.env.VITE_ENGRAVING_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const ASSOCIATE_KEY = (import.meta.env.VITE_ASSOCIATE_API_KEY as string | undefined) ?? '';

export interface AssociateOrderLookup {
  order: AppEngravingOrder;
  job: EngravingJob | null;
}

export interface POSQueueItem {
  job: EngravingJob;
  order: AppEngravingOrder;
}

async function associateFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new ApiError('VITE_ENGRAVING_API_URL is not set', 0, 'config_error');
  }
  if (!ASSOCIATE_KEY) {
    throw new ApiError('VITE_ASSOCIATE_API_KEY is not set', 0, 'config_error');
  }

  const headers = apiFetchHeaders(init.headers);
  headers.set('xassociatekey', ASSOCIATE_KEY);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 204) {
    return undefined as T;
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      message = errBody?.error?.message ?? message;
      code = errBody?.error?.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return res.json() as Promise<T>;
}

export async function lookupAssociateOrder(orderId: string): Promise<AssociateOrderLookup> {
  return associateFetch<AssociateOrderLookup>(`/v1/associate/orders/${encodeURIComponent(orderId)}`);
}

export async function listAssociateQueue(): Promise<POSQueueItem[]> {
  return associateFetch<POSQueueItem[]>('/v1/associate/queue');
}

export async function listAssociateStations(storeId?: string): Promise<LaserStation[]> {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return associateFetch<LaserStation[]>(`/v1/associate/stations${query}`);
}

export async function requeueAssociateOrder(orderId: string): Promise<EngravingJob> {
  return associateFetch<EngravingJob>(`/v1/associate/orders/${encodeURIComponent(orderId)}/requeue`, {
    method: 'POST',
  });
}

export async function cancelAssociateOrder(orderId: string): Promise<AppEngravingOrder> {
  return associateFetch<AppEngravingOrder>(`/v1/associate/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
  });
}

export async function confirmAssociateMark(
  orderId: string,
  decision: 'approve' | 'reject'
): Promise<{ ok: boolean; decision: string }> {
  return associateFetch(`/v1/associate/orders/${encodeURIComponent(orderId)}/confirm-mark`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}

export function hasAssociateApiAccess(): boolean {
  return Boolean(API_BASE && ASSOCIATE_KEY);
}

export function associateTerminalUrl(orderId?: string): string {
  const base = `${window.location.origin}/associate`;
  return orderId ? `${base}?order=${encodeURIComponent(orderId)}` : base;
}
