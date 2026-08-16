import { apiFetch } from './apiClient';
import {
  BackendCatalog,
  mapCatalogToJewelryItems,
  mapSkuToJewelryItem,
} from '../utils/catalogMapper';
import type { JewelryItem } from '../types';

let cachedCatalog: BackendCatalog | null = null;
let cachedJewelry: JewelryItem[] | null = null;

export async function fetchCatalog(force = false): Promise<BackendCatalog> {
  if (cachedCatalog && !force) {
    return cachedCatalog;
  }
  cachedCatalog = await apiFetch<BackendCatalog>('/v1/catalog');
  cachedJewelry = mapCatalogToJewelryItems(cachedCatalog);
  return cachedCatalog;
}

export async function fetchJewelryCatalog(force = false): Promise<JewelryItem[]> {
  await fetchCatalog(force);
  return cachedJewelry ?? [];
}

export function getCachedJewelryCatalog(): JewelryItem[] {
  return cachedJewelry ?? [];
}

export function findJewelryByBackendSku(skuCode: string): JewelryItem | undefined {
  const fromCache = cachedJewelry?.find((j) => j.backendSkuCode === skuCode);
  if (fromCache) return fromCache;
  if (!cachedCatalog) return undefined;
  const sku = cachedCatalog.skus.find((s) => s.code === skuCode);
  return sku ? mapSkuToJewelryItem(sku) : undefined;
}

export async function getUploadConstraints(): Promise<BackendCatalog['upload_constraints']> {
  const catalog = cachedCatalog ?? (await fetchCatalog());
  return catalog.upload_constraints;
}

export type { BackendCatalog };
