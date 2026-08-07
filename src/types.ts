export type JewelryMaterial = '18k_gold' | 'silver' | 'rose_gold' | 'platinum';
export type JewelryType = 'pendant' | 'ring' | 'locket' | 'bracelet' | 'coin';

export interface EngravingConstraints {
  minStrokeWidthMm: number; // e.g. 0.25mm
  maxComplexityScore: number; // Max path nodes
  maxCharacters: number;
  safeWidthMm: number;
  safeHeightMm: number;
  shape: 'rectangle' | 'circle' | 'heart' | 'oval' | 'bar' | 'squircle';
  surfaceTexture: string;
}

export interface JewelryItem {
  id: string;
  sku: string;
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

/** Rectangular marquee on the engraving surface, in canvas percent (0–100). */
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
  x: number; // relative to canvas % (0 - 100)
  y: number; // relative to canvas % (0 - 100)
  width: number; // relative %
  height: number; // relative %
  rotation: number; // degrees
  zIndex: number;
  content: string; // SVG code, path data string, or plain text
  strokeWidth?: number;
  color?: string;
  isAiGenerated?: boolean;
  isCustomerHandwriting?: boolean;
  // For type 'eraser' only: id of the element this eraser stroke masks. The
  // eraser never touches the target's own `content` — it lives as its own
  // independent, deletable layer and is applied on top as a non-destructive
  // mask, so erasing is always fully reversible (delete this layer to
  // instantly restore the original artwork underneath).
  targetElementId?: string;
}

export interface ValidationIssue {
  id: string;
  elementId?: string;
  severity: 'warning' | 'error';
  title: string;
  message: string;
  type: 'thin_lines' | 'out_of_bounds' | 'high_complexity' | 'text_too_small';
  fixActionLabel: string;
  canAutoFix: boolean;
}

export interface AiOption {
  id: string;
  title: string;
  svgCode: string;
  /** PNG data URL for reliable modal previews */
  previewUrl: string;
  styleTag: string;
}

export interface SavedDesignBundle {
  designId: string;
  createdAt: string;
  jewelry: JewelryItem;
  elements: CanvasElement[];
  compositeSvg: string;
  validationPassed: boolean;
  totalPriceInr: number;
  messageId?: string;
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
