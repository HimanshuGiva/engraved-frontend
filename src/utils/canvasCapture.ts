import { CanvasElement } from '../types';

const CAPTURE_SIZE = 512;

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
