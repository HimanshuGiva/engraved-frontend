import { JewelryItem, JewelryMaterial, JewelryType } from '../types';

/** Backend catalog shape from GET /v1/catalog (config/catalog.json). */
export interface BackendCatalogSku {
  code: string;
  name: string;
  material_code: string;
  engraving_mm: {
    sku_code?: string;
    safe_width_mm: number;
    safe_height_mm: number;
    min_stroke_width_mm: number;
    shape: string;
  };
  engraving_zone: Record<string, number>;
  display?: {
    id: string;
    sku: string;
    type: string;
    price_inr: number;
    engraving_fee_inr: number;
    image_url: string;
    engraving_area_label: string;
    description: string;
    popular_suggestion?: string;
    max_complexity_score: number;
    max_characters: number;
    surface_texture: string;
  };
  laser?: {
    template_key: string;
    placement: {
      offset_x: number;
      offset_y: number;
      offset_z: number;
      pen_no: number;
    };
  };
}

export interface BackendCatalog {
  canvas: { width: number; height: number; unit: string };
  skus: BackendCatalogSku[];
  upload_constraints: { max_bytes: number; content_types: string[] };
}

const SHAPES = new Set(['rectangle', 'circle', 'heart', 'oval', 'bar', 'squircle']);
const MATERIALS = new Set(['18k_gold', 'silver', 'rose_gold', 'platinum']);
const TYPES = new Set(['pendant', 'ring', 'locket', 'bracelet', 'coin']);

function asMaterial(code: string): JewelryMaterial {
  return (MATERIALS.has(code) ? code : 'silver') as JewelryMaterial;
}

function asType(type: string): JewelryType {
  return (TYPES.has(type) ? type : 'pendant') as JewelryType;
}

function asShape(shape: string): JewelryItem['constraints']['shape'] {
  return (SHAPES.has(shape) ? shape : 'rectangle') as JewelryItem['constraints']['shape'];
}

/** Maps a backend SKU into the studio JewelryItem model. */
export function mapSkuToJewelryItem(sku: BackendCatalogSku): JewelryItem {
  const d = sku.display;
  return {
    id: d?.id ?? sku.code.toLowerCase(),
    sku: d?.sku ?? sku.code,
    backendSkuCode: sku.code,
    name: sku.name,
    type: asType(d?.type ?? 'pendant'),
    material: asMaterial(sku.material_code),
    priceInr: d?.price_inr ?? 0,
    engravingFeeInr: d?.engraving_fee_inr ?? 0,
    imageUrl: d?.image_url ?? '',
    engravingAreaLabel:
      d?.engraving_area_label ??
      `${sku.engraving_mm.safe_width_mm}mm × ${sku.engraving_mm.safe_height_mm}mm`,
    description: d?.description ?? '',
    popularSuggestion: d?.popular_suggestion,
    constraints: {
      minStrokeWidthMm: sku.engraving_mm.min_stroke_width_mm,
      maxComplexityScore: d?.max_complexity_score ?? 120,
      maxCharacters: d?.max_characters ?? 20,
      safeWidthMm: sku.engraving_mm.safe_width_mm,
      safeHeightMm: sku.engraving_mm.safe_height_mm,
      shape: asShape(sku.engraving_mm.shape),
      surfaceTexture: d?.surface_texture ?? 'polished',
    },
  };
}

export function mapCatalogToJewelryItems(catalog: BackendCatalog): JewelryItem[] {
  return catalog.skus.map(mapSkuToJewelryItem);
}
