import { apiFetch } from './apiClient';
import type { FulfillmentStatus, OrderChannel } from '../constants/fulfillmentStatus';

export interface AppEngravingOrder {
  id: string;
  user_id: string;
  channel: OrderChannel;
  sku_code: string;
  final_svg: string;
  message_id?: string | null;
  fulfillment_status: FulfillmentStatus | string;
  created_at: string;
  updated_at: string;
}

export async function createAppOrder(input: {
  channel?: OrderChannel;
  sku_code: string;
  final_svg: string;
  message_id?: string;
}): Promise<AppEngravingOrder> {
  return apiFetch<AppEngravingOrder>('/v1/app/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAppOrder(id: string): Promise<AppEngravingOrder> {
  return apiFetch<AppEngravingOrder>(`/v1/app/orders?id=${encodeURIComponent(id)}`);
}
