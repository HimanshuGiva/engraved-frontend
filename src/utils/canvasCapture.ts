import { CanvasElement, CanvasRegion, isErasableLayer } from '../types';

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

function buildCanvasCompositeMarkup(elements: CanvasElement[]): { defs: string; content: string } {
  const sorted = [...elements].filter((el) => el.type !== 'eraser').sort((a, b) => a.zIndex - b.zIndex);
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
        .map(
          (e) =>
            `<path d="${e.content}" fill="none" stroke="black" stroke-width="${e.strokeWidth ?? 8}" stroke-linecap="round" stroke-linejoin="round"/>`
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
        const match = el.content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const inner = match ? match[1] : el.content;
        content += `<g transform="${transform}"><g${maskAttr}>${inner}</g></g>`;
      } else {
        content += `<g transform="${transform}"><g${maskAttr}><path d="${el.content}" fill="none" stroke="#121214" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
      }
    } else if (el.type === 'text') {
      const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      const fontSize = Math.min(32, 160 / Math.max(el.content.length, 1));
      content += `<g transform="${transform}"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#121214" font-weight="bold" font-family="serif">${escapeXml(el.content)}</text></g>`;
    }
  }

  return { defs, content };
}

function buildRegionCaptureSvg(elements: CanvasElement[], region: CanvasRegion): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements);
  const { left, top, width, height } = region;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${CAPTURE_SIZE}" height="${CAPTURE_SIZE}">
  <rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#FAF8F5"/>
  <defs>${defs}</defs>
  <g>${content}</g>
</svg>`;
}

/** Build vector SVG content for a canvas region, normalized to local 0–100 space. */
export function buildRegionVectorSvg(elements: CanvasElement[], region: CanvasRegion): string {
  const { defs, content } = buildCanvasCompositeMarkup(elements);
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
    const content = el.content.trim();
    if (content.startsWith('<svg')) {
      return content
        .replace(/<\?xml[^>]*>/gi, '')
        .replace(/<svg([^>]*)>/i, '<svg$1 x="0" y="0" width="100" height="100">');
    }
    return content;
  }

  if (el.type === 'text') {
    const fontSize = Math.min(32, 160 / Math.max(el.content.length, 1));
    return `<text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#121214" font-weight="bold" font-family="serif">${escapeXml(el.content)}</text>`;
  }

  return `<path d="${el.content}" fill="none" stroke="#121214" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function buildCaptureSvg(element: CanvasElement, eraserLayers: CanvasElement[]): string {
  const artwork = buildArtworkMarkup(element);
  let maskBlock = '';
  let maskRef = '';

  if (eraserLayers.length > 0) {
    const strokes = eraserLayers
      .map(
        (e) =>
          `<path d="${e.content}" fill="none" stroke="black" stroke-width="${e.strokeWidth ?? 8}" stroke-linecap="round" stroke-linejoin="round"/>`
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
  region: CanvasRegion
): Promise<string> {
  const svg = buildRegionCaptureSvg(elements, region);
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

/** Rasterize a canvas element (with optional eraser masks) to a PNG data URL. */
export async function captureElementAsPngDataUrl(
  element: CanvasElement,
  eraserLayers: CanvasElement[] = []
): Promise<string> {
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

export function defaultEnhanceMode(el: CanvasElement): 'ai_generated' | 'manual' {
  if (el.type === 'freehand_draw' || el.type === 'handwriting') {
    return 'manual';
  }
  return 'ai_generated';
}
