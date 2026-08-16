import { CanvasElement, CanvasRegion, isErasableLayer } from '../types';
import {
  buildLayerMask,
  embedArtworkMarkup,
  eraserMaskPathMarkup,
  escapeXmlText,
  extractEmbeddedRasterDataUrl,
  extractRootSvg,
  layerFrame,
  normalizeEmbeddedArtworkSvg,
  pathLayerMarkup,
  textLayerMarkup,
} from './svgUtils';
import { engravingTextFontSize, getEngravingFont } from '../constants/fonts';

const CAPTURE_SIZE = 512;
const MIN_REGION_SIZE = 3;
const CAPTURE_INK = '#121214';

export function normalizeCanvasRegion(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): CanvasRegion | null {
  const left = Math.max(0, Math.min(x1, x2));
  const top = Math.max(0, Math.min(y1, y2));
  const right = Math.min(100, Math.max(x1, x2));
  const bottom = Math.min(100, Math.max(y1, y2));
  const width = right - left;
  const height = bottom - top;
  if (width < MIN_REGION_SIZE || height < MIN_REGION_SIZE) {
    return null;
  }
  return { left, top, width, height };
}

export function regionCenter(region: CanvasRegion): { x: number; y: number } {
  return {
    x: region.left + region.width / 2,
    y: region.top + region.height / 2,
  };
}

/** True when an element's bounding box overlaps a canvas region (both in 0–100 % space). */
export function elementIntersectsRegion(el: CanvasElement, region: CanvasRegion): boolean {
  const elLeft = el.x - el.width / 2;
  const elRight = el.x + el.width / 2;
  const elTop = el.y - el.height / 2;
  const elBottom = el.y + el.height / 2;
  const regionRight = region.left + region.width;
  const regionBottom = region.top + region.height;
  return elLeft < regionRight && elRight > region.left && elTop < regionBottom && elBottom > region.top;
}

/** True when an element lies entirely inside a canvas region. */
export function elementFullyContainedInRegion(el: CanvasElement, region: CanvasRegion): boolean {
  const elLeft = el.x - el.width / 2;
  const elRight = el.x + el.width / 2;
  const elTop = el.y - el.height / 2;
  const elBottom = el.y + el.height / 2;
  const regionRight = region.left + region.width;
  const regionBottom = region.top + region.height;
  return elLeft >= region.left && elRight <= regionRight && elTop >= region.top && elBottom <= regionBottom;
}

/** Map a canvas-space point (0–100 %) into an element's local 0–100 space. */
export function canvasPointToElementLocal(
  px: number,
  py: number,
  el: CanvasElement
): { x: number; y: number } {
  const rad = (-el.rotation * Math.PI) / 180;
  const dx = px - el.x;
  const dy = py - el.y;
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  const safeW = Math.max(el.width, 0.0001);
  const safeH = Math.max(el.height, 0.0001);
  return {
    x: 50 + (rx / safeW) * 100,
    y: 50 + (ry / safeH) * 100,
  };
}

function canvasRegionToLocalPolygon(region: CanvasRegion, el: CanvasElement): { x: number; y: number }[] {
  const { left, top, width, height } = region;
  const corners = [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
  return corners.map((corner) => canvasPointToElementLocal(corner.x, corner.y, el));
}

function localPolygonToPath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return '';
  const [first, ...rest] = points;
  const segments = rest
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${segments} Z`;
}

/**
 * Prepare canvas updates so a region enhance replaces existing artwork instead of
 * stacking on top: remove fully-contained layers, punch holes in partial overlaps.
 */
export function buildRegionReplacementUpdates(
  elements: CanvasElement[],
  region: CanvasRegion,
  stamp: number
): { remaining: CanvasElement[]; erasers: CanvasElement[] } {
  const intersecting = elements.filter(
    (el) => el.type !== 'eraser' && elementIntersectsRegion(el, region)
  );
  const deleteIds = new Set<string>();

  for (const el of intersecting) {
    if (elementFullyContainedInRegion(el, region)) {
      deleteIds.add(el.id);
    }
  }

  const remaining = elements.filter(
    (el) =>
      !deleteIds.has(el.id) &&
      !(el.type === 'eraser' && el.targetElementId && deleteIds.has(el.targetElementId))
  );

  const baseZ = Math.max(0, ...remaining.map((el) => el.zIndex));
  const erasers: CanvasElement[] = [];

  intersecting.forEach((el, index) => {
    if (deleteIds.has(el.id) || !isErasableLayer(el.type)) return;
    const pathD = localPolygonToPath(canvasRegionToLocalPolygon(region, el));
    if (!pathD) return;

    erasers.push({
      id: `region-erase-${stamp}-${el.id}`,
      type: 'eraser',
      name: `Region clear (on ${el.name})`,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      zIndex: baseZ + 1 + index,
      content: pathD,
      strokeWidth: 0,
      targetElementId: el.id,
      eraserFill: true,
    });
  });

  return { remaining, erasers };
}

/** Flatten PNG-in-SVG AI layers for reliable blob→canvas rasterization. */
function embedRasterArtworkForCapture(
  el: CanvasElement,
  surfaceAspect: number,
  maskAttr: string
): string | null {
  const href = extractEmbeddedRasterDataUrl(el.content);
  if (!href) return null;

  const { frame, boxW, boxH } = layerFrame(el, surfaceAspect);
  return `\n  <g transform="${frame}">\n    <g${maskAttr}>\n      <image x="${(-boxW / 2).toFixed(3)}" y="${(-boxH / 2).toFixed(3)}" width="${boxW.toFixed(3)}" height="${boxH.toFixed(3)}" href="${href}" preserveAspectRatio="xMidYMid meet"/>\n    </g>\n  </g>`;
}

function buildCanvasCompositeMarkup(
  elements: CanvasElement[],
  surfaceAspect: number,
  region?: CanvasRegion
): { defs: string; content: string } {
  const sorted = [...elements]
    .filter((el) => el.type !== 'eraser')
    .filter((el) => (region ? elementIntersectsRegion(el, region) : true))
    .sort((a, b) => a.zIndex - b.zIndex);
  const erasers = elements.filter((el) => el.type === 'eraser');

  let content = '';
  let defs = '';

  for (const el of sorted) {
    const mask = buildLayerMask(el, erasers, surfaceAspect, 'cap-erase');
    defs += mask.def;

    if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
      const rasterMarkup = embedRasterArtworkForCapture(el, surfaceAspect, mask.attr);
      content += rasterMarkup ?? embedArtworkMarkup(el, surfaceAspect, mask.attr);
    } else if (el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      content += pathLayerMarkup(el, surfaceAspect, mask.attr, CAPTURE_INK);
    } else if (el.type === 'text') {
      content += textLayerMarkup(el, surfaceAspect, CAPTURE_INK);
    }
  }

  return { defs, content };
}

function buildFullCanvasCaptureSvg(
  elements: CanvasElement[],
  surfaceAspect: number,
  w: number,
  h: number
): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements, surfaceAspect);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${w}" height="${h}" preserveAspectRatio="none">
  <defs>${defs}</defs>
  <style>path { vector-effect: non-scaling-stroke; }</style>
  <rect x="0" y="0" width="100" height="100" fill="#FAF8F5"/>
  ${content}
</svg>`;
}

function surfaceRasterSize(aspect: number): { w: number; h: number } {
  const a = Math.max(aspect, 0.05);
  if (a >= 1) {
    return { w: CAPTURE_SIZE, h: Math.max(1, Math.round(CAPTURE_SIZE / a)) };
  }
  return { w: Math.max(1, Math.round(CAPTURE_SIZE * a)), h: CAPTURE_SIZE };
}

function clampCrop(
  x: number,
  y: number,
  w: number,
  h: number,
  maxW: number,
  maxH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const sx = Math.max(0, Math.min(maxW - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(maxH - 1, Math.round(y)));
  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(maxW - sx, Math.round(w))),
    sh: Math.max(1, Math.min(maxH - sy, Math.round(h))),
  };
}

/** Build vector SVG content for a canvas region, normalized to local 0–100 space. */
export function buildRegionVectorSvg(
  elements: CanvasElement[],
  region: CanvasRegion,
  surfaceAspect: number
): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements, surfaceAspect, region);
  const { left, top, width, height } = region;
  const sx = (100 / width).toFixed(4);
  const sy = (100 / height).toFixed(4);
  // The extracted markup already spans exactly the region, so it must fill the
  // layer box rather than being letterboxed into it.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
  <defs>${defs}</defs>
  <g transform="translate(${(-left * (100 / width)).toFixed(4)}, ${(-top * (100 / height)).toFixed(4)}) scale(${sx}, ${sy})">${content}</g>
</svg>`;
}


function buildArtworkMarkup(el: CanvasElement): string {
  if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
    const href = extractEmbeddedRasterDataUrl(el.content);
    if (href) {
      return `<image x="0" y="0" width="100" height="100" href="${href}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return normalizeEmbeddedArtworkSvg(el.content);
  }

  if (el.type === 'text') {
    const font = getEngravingFont(el.color);
    return `<text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-size="${engravingTextFontSize(el.content)}" fill="${CAPTURE_INK}" font-family="${font.family}" font-style="${font.style}" font-weight="${font.weight}">${escapeXmlText(el.content)}</text>`;
  }

  return `<path d="${el.content}" fill="none" stroke="${CAPTURE_INK}" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
}

function buildCaptureSvg(element: CanvasElement, eraserLayers: CanvasElement[]): string {
  const artwork = buildArtworkMarkup(element);
  let maskBlock = '';
  let maskRef = '';

  if (eraserLayers.length > 0) {
    const strokes = eraserLayers
      .map((e) =>
        eraserMaskPathMarkup({
          content: e.content,
          strokeWidth: e.strokeWidth ?? 8,
          filled: e.eraserFill,
        })
      )
      .join('');
    maskBlock = `<defs><mask id="capMask"><rect width="100" height="100" fill="white"/>${strokes}</mask></defs>`;
    maskRef = ' mask="url(#capMask)"';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${CAPTURE_SIZE}" height="${CAPTURE_SIZE}">
  <rect width="100" height="100" fill="#FAF8F5"/>
  ${maskBlock}
  <g${maskRef}>${artwork}</g>
</svg>`;
}

/** Rasterize everything visible inside a canvas region to a PNG data URL. */
export async function captureRegionAsPngDataUrl(
  elements: CanvasElement[],
  region: CanvasRegion,
  surfaceAspect = 1
): Promise<string> {
  // Rasterize the full engraving surface first, then crop in pixel space.
  // SVG viewBox/clipPath was capturing a smaller fragment than the marquee
  // because nested images and non-square surfaces do not clip reliably.
  const { w, h } = surfaceRasterSize(surfaceAspect);
  const svg = buildFullCanvasCaptureSvg(elements, surfaceAspect, w, h);
  const fullPng = await rasterizeSvgToPng(svg, w, h);
  const full = await loadImage(fullPng);
  const { sx, sy, sw, sh } = clampCrop(
    (region.left / 100) * w,
    (region.top / 100) * h,
    (region.width / 100) * w,
    (region.height / 100) * h,
    w,
    h
  );

  const crop = document.createElement('canvas');
  crop.width = sw;
  crop.height = sh;
  const cropCtx = crop.getContext('2d');
  if (!cropCtx) {
    throw new Error('Could not create canvas context');
  }
  cropCtx.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
  return crop.toDataURL('image/png');
}

/** Rasterize a canvas element (with optional eraser masks) to a PNG data URL. */
export async function captureElementAsPngDataUrl(
  element: CanvasElement,
  eraserLayers: CanvasElement[] = []
): Promise<string> {
  if (
    eraserLayers.length === 0 &&
    (element.type === 'svg_ai' || element.type === 'uploaded_image')
  ) {
    const embedded = extractEmbeddedRasterDataUrl(element.content);
    if (embedded) return embedded;
  }

  return rasterizeSvgToPng(buildCaptureSvg(element, eraserLayers), CAPTURE_SIZE, CAPTURE_SIZE);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize element'));
    img.src = src;
  });
}

async function rasterizeSvgToPng(svgMarkup: string, width: number, height: number): Promise<string> {
  const svg = extractRootSvg(svgMarkup);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(blobUrl);
    } catch {
      img = await loadImage(dataUrl);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/** Rasterize inline SVG to PNG for API calls (enhance expects raster input — not vectorization). */
export async function rasterizeSvgMarkupToPng(svgMarkup: string, size = CAPTURE_SIZE): Promise<string> {
  const normalized = /<svg\b/i.test(svgMarkup)
    ? extractRootSvg(svgMarkup)
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgMarkup}</svg>`;
  return rasterizeSvgToPng(normalized, size, size);
}

/** Read a File/Blob as a data URL (for raster uploads sent to backend enhance). */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const ENHANCEABLE_TYPES: CanvasElement['type'][] = [
  'svg_ai',
  'freehand_draw',
  'handwriting',
  'shape',
  'uploaded_image',
  'text',
];

export function isEnhanceableElement(el: CanvasElement): boolean {
  return ENHANCEABLE_TYPES.includes(el.type);
}
