import type { FulfillmentStatus, OrderChannel } from './constants/fulfillmentStatus';

export type { OrderChannel, FulfillmentStatus };

export type JewelryMaterial = '18k_gold' | 'silver' | 'rose_gold' | 'platinum';
export type JewelryType = 'pendant' | 'ring' | 'locket' | 'bracelet' | 'coin';

export interface EngravingConstraints {
  minStrokeWidthMm: number;
  maxComplexityScore: number;
  maxCharacters: number;
  safeWidthMm: number;
  safeHeightMm: number;
  shape: 'rectangle' | 'circle' | 'heart' | 'oval' | 'bar' | 'squircle';
  surfaceTexture: string;
}

export interface JewelryItem {
  id: string;
  sku: string;
  backendSkuCode: string;
  name: string;
  type: JewelryType;
  material: JewelryMaterial;
  priceInr: number;
  engravingFeeInr: number;
  imageUrl: string;
  engravingAreaLabel: string;
  constraints: EngravingConstraints;
  description: string;
  popularSuggestion?: string;
}

export interface CanvasRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CanvasElementType = 'svg_ai' | 'freehand_draw' | 'handwriting' | 'text' | 'shape' | 'uploaded_image' | 'eraser';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string;
  strokeWidth?: number;
  color?: string;
  isAiGenerated?: boolean;
  isCustomerHandwriting?: boolean;
  targetElementId?: string;
}

export const ERASABLE_LAYER_TYPES: CanvasElementType[] = [
  'svg_ai',
  'freehand_draw',
  'handwriting',
  'shape',
  'uploaded_image',
];

export function isErasableLayer(type: CanvasElementType): boolean {
  return ERASABLE_LAYER_TYPES.includes(type);
}

export function isVisibleLayer(el: CanvasElement): boolean {
  return el.type !== 'eraser';
}

export function visibleLayers(elements: CanvasElement[]): CanvasElement[] {
  return elements.filter(isVisibleLayer);
}

export interface AiOption {
  id: string;
  title: string;
  svgCode: string;
  previewUrl: string;
  styleTag: string;
}

export interface SavedDesignBundle {
  designId: string;
  createdAt: string;
  channel: OrderChannel;
  jewelry: JewelryItem;
  elements: CanvasElement[];
  compositeSvg: string;
  totalPriceInr: number;
  messageId?: string;
  fulfillmentStatus?: FulfillmentStatus;
  jobError?: string | null;
}

export type MessageContentType = 'text' | 'photo' | 'video';

export interface GiftMessage {
  id: string;
  short_id: string;
  view_url: string;
  content_type: MessageContentType;
  content: string;
  media_url?: string | null;
  qr_svg_url?: string | null;
  created_at?: string;
}
