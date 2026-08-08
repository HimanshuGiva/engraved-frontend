import { apiFetch } from './apiClient';

export interface AppEngravingOrder {
  id: string;
  user_id: string;
  sku_code: string;
  final_svg: string;
  message_id?: string | null;
  factory_status: string;
  created_at: string;
  updated_at: string;
}

export async function createAppOrder(input: {
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
