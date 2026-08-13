import { CanvasElement, CanvasRegion, isErasableLayer } from '../types';
import {
  embedArtworkMarkup,
  eraserMaskPathMarkup,
  extractEmbeddedRasterDataUrl,
  normalizeEmbeddedArtworkSvg,
} from './svgUtils';

const CAPTURE_SIZE = 512;
const MIN_REGION_SIZE = 3;

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
  rotation: string,
  maskAttr: string
): string | null {
  const href = extractEmbeddedRasterDataUrl(el.content);
  if (!href) return null;

  const halfW = (el.width / 2).toFixed(2);
  const halfH = (el.height / 2).toFixed(2);

  return `\n  <g transform="translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation})">\n    <g${maskAttr}>\n      <image x="${-halfW}" y="${-halfH}" width="${el.width}" height="${el.height}" href="${href}" preserveAspectRatio="xMidYMid meet"/>\n    </g>\n  </g>`;
}

function buildCanvasCompositeMarkup(
  elements: CanvasElement[],
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
    const sx = el.width / 100;
    const sy = el.height / 100;
    const rotation = el.rotation.toFixed(2);

    const relatedErasers = erasers.filter((e) => e.targetElementId === el.id);
    let maskAttr = '';
    if (isErasableLayer(el.type) && relatedErasers.length > 0) {
      const maskId = `cap-erase-${el.id}`;
      const strokes = relatedErasers
        .map((e) =>
          eraserMaskPathMarkup({
            content: e.content,
            strokeWidth: e.strokeWidth ?? 8,
            filled: e.eraserFill,
          })
        )
        .join('');
      defs += `<mask id="${maskId}" maskContentUnits="userSpaceOnUse"><rect x="0" y="0" width="100" height="100" fill="white"/>${strokes}</mask>`;
      maskAttr = ` mask="url(#${maskId})"`;
    }

    if (el.type === 'svg_ai' || el.type === 'uploaded_image' || el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      const shiftX = (-50 * sx).toFixed(3);
      const shiftY = (-50 * sy).toFixed(3);
      const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) translate(${shiftX}, ${shiftY}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

      if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
        const rasterMarkup = embedRasterArtworkForCapture(el, rotation, maskAttr);
        content += rasterMarkup ?? embedArtworkMarkup(el, rotation, maskAttr);
      } else {
        content += `<g transform="${transform}"><g${maskAttr}><path d="${el.content}" fill="none" stroke="#121214" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g></g>`;
      }
    } else if (el.type === 'text') {
      const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      const fontSize = Math.min(32, 160 / Math.max(el.content.length, 1));
      content += `<g transform="${transform}"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#121214" font-weight="bold" font-family="serif">${escapeXml(el.content)}</text></g>`;
    }
  }

  return { defs, content };
}

function buildFullCanvasCaptureSvg(elements: CanvasElement[], w: number, h: number): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements);
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
export function buildRegionVectorSvg(elements: CanvasElement[], region: CanvasRegion): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements, region);
  const { left, top, width, height } = region;
  const sx = (100 / width).toFixed(4);
  const sy = (100 / height).toFixed(4);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>${defs}</defs>
  <g transform="translate(${(-left * (100 / width)).toFixed(4)}, ${(-top * (100 / height)).toFixed(4)}) scale(${sx}, ${sy})">${content}</g>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    const fontSize = Math.min(32, 160 / Math.max(el.content.length, 1));
    return `<text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#121214" font-weight="bold" font-family="serif">${escapeXml(el.content)}</text>`;
  }

  return `<path d="${el.content}" fill="none" stroke="#121214" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
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
  const svg = buildFullCanvasCaptureSvg(elements, w, h);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const full = document.createElement('canvas');
    full.width = w;
    full.height = h;
    const fullCtx = full.getContext('2d');
    if (!fullCtx) {
      throw new Error('Could not create canvas context');
    }
    fullCtx.drawImage(img, 0, 0, w, h);

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
  } finally {
    URL.revokeObjectURL(url);
  }
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

  const svg = buildCaptureSvg(element, eraserLayers);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_SIZE;
    canvas.height = CAPTURE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    ctx.drawImage(img, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize element'));
    img.src = src;
  });
}

/** Rasterize inline SVG to PNG for API calls (enhance expects raster input — not vectorization). */
export async function rasterizeSvgMarkupToPng(svgMarkup: string, size = CAPTURE_SIZE): Promise<string> {
  const normalized = svgMarkup.trim().startsWith('<svg')
    ? svgMarkup
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgMarkup}</svg>`;
  const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas not available');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
