import { apiFetch } from './apiClient';

export interface BackendCatalog {
  canvas: { width: number; height: number; unit: string };
  skus: { code: string; name: string; engraving_zone: Record<string, number> }[];
  upload_constraints: { max_bytes: number; content_types: string[] };
}

let cachedCatalog: BackendCatalog | null = null;

export async function fetchCatalog(force = false): Promise<BackendCatalog> {
  if (cachedCatalog && !force) {
    return cachedCatalog;
  }
  cachedCatalog = await apiFetch<BackendCatalog>('/v1/catalog');
  return cachedCatalog;
}

export async function getUploadConstraints(): Promise<BackendCatalog['upload_constraints']> {
  const catalog = cachedCatalog ?? (await fetchCatalog());
  return catalog.upload_constraints;
}
