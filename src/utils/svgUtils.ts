import { CanvasElement, JewelryItem, JewelryMaterial, isErasableLayer } from '../types';

/** One eraser stroke in the target element's local 0–100 coordinate space. */
export type EraserStroke = { content: string; strokeWidth: number; filled?: boolean };

export function eraserStrokesFromElements(erasers: CanvasElement[]): EraserStroke[] {
  return erasers.map((e) => ({
    content: e.content,
    strokeWidth: e.strokeWidth ?? 8,
    filled: e.eraserFill,
  }));
}

export function eraserMaskPathMarkup(stroke: EraserStroke): string {
  if (stroke.filled) {
    return `<path d="${stroke.content}" fill="black" stroke="none"/>`;
  }
  return `<path d="${stroke.content}" fill="none" stroke="black" stroke-width="${stroke.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
}

function eraserStrokePathMarkup(stroke: EraserStroke): string {
  return eraserMaskPathMarkup(stroke);
}

/**
 * Builds a CSS mask (data-URI SVG) that punches transparent holes wherever
 * an eraser layer's stroke passes, without ever touching the target
 * element's own artwork. Used for HTML/SVG-AI wrappers on the live canvas;
 * vector paths use inline SVG <mask> instead. Also used by production export
 * so what the customer sees while erasing matches what gets engraved.
 */
export function buildEraserMaskDataUri(
  erasers: CanvasElement[],
  liveStroke?: EraserStroke
): string | null {
  const strokes = [...eraserStrokesFromElements(erasers)];
  if (liveStroke) strokes.push(liveStroke);
  if (!strokes.length) return null;
  const strokeMarkup = strokes.map(eraserStrokePathMarkup).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><mask id="erase-hole" maskContentUnits="userSpaceOnUse"><rect x="0" y="0" width="100" height="100" fill="white"/>${strokeMarkup}</mask></defs><rect x="0" y="0" width="100" height="100" fill="white" mask="url(#erase-hole)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Converts freehand drawn path points into SVG Path 'd' attribute with quadratic bezier smoothing
 */
export function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`;
  }

  if (points.length > 2) {
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  }

  return d;
}

/** Split canvas-space erase points into per-element local subpaths. */
export function canvasPointsToLocalSubpaths(
  canvasPoints: { x: number; y: number }[],
  el: CanvasElement,
  pointInBounds: (px: number, py: number, element: CanvasElement) => boolean,
  toLocal: (px: number, py: number, element: CanvasElement) => { x: number; y: number }
): { x: number; y: number }[][] {
  const subpaths: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  for (const p of canvasPoints) {
    if (pointInBounds(p.x, p.y, el)) {
      current.push(toLocal(p.x, p.y, el));
    } else if (current.length > 0) {
      if (current.length > 1) subpaths.push(current);
      current = [];
    }
  }
  if (current.length > 1) subpaths.push(current);
  return subpaths;
}

export function subpathsToSvgPath(subpaths: { x: number; y: number }[][]): string {
  return subpaths
    .map((stroke) => pointsToSvgPath(stroke))
    .filter(Boolean)
    .join(' ');
}

export function buildFreehandSessionData(
  strokes: { x: number; y: number }[][]
): { content: string; x: number; y: number; width: number; height: number } | null {
  const allPoints = strokes.flat();
  if (allPoints.length < 2) return null;

  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Same 2% padding convention as the single-stroke path, so line caps/edges
  // of every stroke in the session stay clear of the bounding box edge.
  const pad = 2;
  const minXPad = Math.max(0, minX - pad);
  const maxXPad = Math.min(100, maxX + pad);
  const minYPad = Math.max(0, minY - pad);
  const maxYPad = Math.min(100, maxY + pad);

  const bw = Math.max(6, maxXPad - minXPad);
  const bh = Math.max(6, maxYPad - minYPad);
  const cx = minXPad + bw / 2;
  const cy = minYPad + bh / 2;

  const normalizeStroke = (stroke: { x: number; y: number }[]) =>
    stroke.map((p) => ({
      x: ((p.x - minXPad) / bw) * 100,
      y: ((p.y - minYPad) / bh) * 100,
    }));

  const content = strokes
    .filter((stroke) => stroke.length > 1)
    .map((stroke) => pointsToSvgPath(normalizeStroke(stroke)))
    .filter(Boolean)
    .join(' ');

  if (!content) return null;

  return { content, x: cx, y: cy, width: bw, height: bh };
}

/**
 * Fit canvas artwork into an element box using the same layout as the live
 * canvas (centered rect with meet) — NOT a uniform scale() which skews AI art.
 */
export function embedArtworkMarkup(
  el: CanvasElement,
  rotation: string,
  maskAttr: string
): string {
  const trimmed = el.content.trim();
  const viewBoxMatch = trimmed.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch?.[1] ?? '0 0 100 100';

  let inner: string;
  if (trimmed.startsWith('<svg')) {
    const match = trimmed.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    inner = match ? match[1] : trimmed;
  } else {
    inner = trimmed;
  }

  const halfW = (el.width / 2).toFixed(2);
  const halfH = (el.height / 2).toFixed(2);

  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" x="${-halfW}" y="${-halfH}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

  return `\n  <g transform="translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation})">\n    <g${maskAttr}>\n    ${artwork}\n    </g>\n  </g>`;
}

export function normalizeEmbeddedArtworkSvg(content: string): string {
  const trimmed = content.trim();
  const viewBoxMatch = trimmed.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch?.[1] ?? '0 0 100 100';

  let inner: string;
  if (trimmed.startsWith('<svg')) {
    const match = trimmed.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    inner = match ? match[1] : trimmed;
  } else {
    inner = trimmed;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

export function isRasterArtwork(content: string): boolean {
  return /<image[\s/>]/i.test(content);
}

/** Force SVG artwork to fill its element box (used when applying a region enhance). */
export function svgToFillElementBox(svgCode: string): string {
  const trimmed = svgCode.trim();
  if (!trimmed.startsWith('<svg')) return svgCode;
  return trimmed
    .replace(/\s+preserveAspectRatio="[^"]*"/i, '')
    .replace(/<svg\b/i, '<svg preserveAspectRatio="none"');
}

/** Pull an embedded PNG/JPEG data URL out of SVG artwork (common for AI enhance results). */
export function extractEmbeddedRasterDataUrl(content: string): string | null {
  const match = content.match(/(?:href|xlink:href)=["'](data:image\/[^"']+)["']/i);
  return match?.[1] ?? null;
}

interface CompositeLayers {
  maskDefs: string;
  vectorContent: string;
  rasterContent: string;
}

function buildCompositeLayers(elements: CanvasElement[], _jewelry: JewelryItem): CompositeLayers {
  const sorted = [...elements].filter((el) => el.type !== 'eraser').sort((a, b) => a.zIndex - b.zIndex);
  const erasers = elements.filter((el) => el.type === 'eraser');

  let vectorContent = '';
  let rasterContent = '';
  let maskDefs = '';

  for (const el of sorted) {
    const sx = el.width / 100;
    const sy = el.height / 100;
    const rotation = el.rotation.toFixed(2);

    const relatedErasers = erasers.filter((e) => e.targetElementId === el.id);
    let maskAttr = '';
    if (isErasableLayer(el.type) && relatedErasers.length > 0) {
      const maskId = `erase-mask-${el.id}`;
      const strokes = relatedErasers.map((e) => eraserMaskPathMarkup({
        content: e.content,
        strokeWidth: e.strokeWidth ?? 8,
        filled: e.eraserFill,
      })).join('\n      ');
      maskDefs += `\n    <mask id="${maskId}" maskContentUnits="userSpaceOnUse">\n      <rect x="0" y="0" width="100" height="100" fill="white" />\n      ${strokes}\n    </mask>`;
      maskAttr = ` mask="url(#${maskId})"`;
    }

    const shiftX = (-50 * sx).toFixed(3);
    const shiftY = (-50 * sy).toFixed(3);
    const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) translate(${shiftX}, ${shiftY}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

    if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
      const markup = embedArtworkMarkup(el, rotation, maskAttr);
      if (isRasterArtwork(el.content)) {
        rasterContent += markup;
      } else {
        vectorContent += markup;
      }
    } else if (el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      vectorContent += `\n  <g transform="${transform}">\n    <g${maskAttr}>\n    <path d="${el.content}" fill="none" stroke="#111111" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" />\n    </g>\n  </g>`;
    } else if (el.type === 'text') {
      vectorContent += `\n  <g transform="${transform}">\n    <text x="0" y="0" font-family="'Playfair Display', serif" font-size="16" font-weight="600" fill="#111111" text-anchor="middle" dominant-baseline="middle">${el.content}</text>\n  </g>`;
    }
  }

  return { maskDefs, vectorContent, rasterContent };
}

/**
 * Combines all canvas elements into a single clean, production-ready vector SVG file.
 */
export function generateCompositeSvg(elements: CanvasElement[], jewelry: JewelryItem): string {
  const { maskDefs, vectorContent, rasterContent } = buildCompositeLayers(elements, jewelry);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" overflow="visible">
  <desc>GIVA Live-Engrave Production Vector Export - SKU: ${jewelry.sku} - Safe Area: ${jewelry.constraints.safeWidthMm}mm x ${jewelry.constraints.safeHeightMm}mm</desc>
  <defs>${maskDefs}
  </defs>
  <style>
    path, circle, rect, polygon, text { vector-effect: non-scaling-stroke; }
  </style>
  <g id="production-engraving-layer" fill="none" stroke="#111111">
    ${vectorContent}${rasterContent}
  </g>
</svg>`;
}

/** Preview-only palette — laser etch reads as matte charcoal/brown, never flat black. */
interface EtchPalette {
  groove: string;
  shadow: string;
  highlight: string;
}

function getEtchPalette(material: JewelryMaterial): EtchPalette {
  switch (material) {
    case '18k_gold':
      return { groove: '#5a4528', shadow: '#2e2214', highlight: '#f5e6c8' };
    case 'rose_gold':
      return { groove: '#5a3f38', shadow: '#352520', highlight: '#fde8e0' };
    case 'platinum':
      return { groove: '#454b54', shadow: '#252930', highlight: '#f0f2f5' };
    case 'silver':
    default:
      return { groove: '#434b53', shadow: '#23282d', highlight: '#eef2f6' };
  }
}

/** SVG filter simulating recessed laser grooves with inner shadow + edge highlight. */
function buildLaserEtchFilter(id: string, palette: EtchPalette): string {
  return `
    <filter id="${id}" filterUnits="objectBoundingBox" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feOffset in="SourceAlpha" dx="0.008" dy="0.01" result="offShadow"/>
      <feGaussianBlur in="offShadow" stdDeviation="0.006" result="blurShadow"/>
      <feFlood flood-color="${palette.shadow}" flood-opacity="0.55" result="shadowColor"/>
      <feComposite in="shadowColor" in2="blurShadow" operator="in" result="innerShadow"/>

      <feOffset in="SourceAlpha" dx="-0.006" dy="-0.008" result="offHi"/>
      <feGaussianBlur in="offHi" stdDeviation="0.004" result="blurHi"/>
      <feFlood flood-color="${palette.highlight}" flood-opacity="0.32" result="hiColor"/>
      <feComposite in="hiColor" in2="blurHi" operator="in" result="innerHi"/>

      <feFlood flood-color="${palette.groove}" flood-opacity="0.9" result="grooveColor"/>
      <feComposite in="grooveColor" in2="SourceAlpha" operator="in" result="groove"/>
      <feGaussianBlur in="groove" stdDeviation="0.003" result="softGroove"/>

      <feMerge>
        <feMergeNode in="innerShadow"/>
        <feMergeNode in="softGroove"/>
        <feMergeNode in="innerHi"/>
      </feMerge>
    </filter>`;
}

/** Darken/desaturate raster AI artwork so it reads as a laser mark, not a sticker. */
function buildRasterEtchFilter(id: string, palette: EtchPalette): string {
  return `
    <filter id="${id}" filterUnits="objectBoundingBox" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0.34 0.34 0.34 0 0.05
                0.30 0.30 0.30 0 0.04
                0.26 0.26 0.26 0 0.03
                0    0    0    0.92 0" result="etched"/>
      <feGaussianBlur in="etched" stdDeviation="0.08" result="softEtched"/>
      <feMerge>
        <feMergeNode in="softEtched"/>
      </feMerge>
    </filter>`;
}

/**
 * Preview-only composite SVG — same geometry as production export but with a
 * laser-etch filter so artwork reads as recessed oxidized grooves in metal,
 * not flat black ink on the surface.
 */
export function generatePreviewCompositeSvg(elements: CanvasElement[], jewelry: JewelryItem): string {
  const { maskDefs, vectorContent, rasterContent } = buildCompositeLayers(elements, jewelry);
  const palette = getEtchPalette(jewelry.material);
  const vectorFilter = buildLaserEtchFilter('preview-laser-etch', palette);
  const rasterFilter = buildRasterEtchFilter('preview-raster-etch', palette);

  const vectorLayer = vectorContent
    ? `\n  <g filter="url(#preview-laser-etch)" fill="none" stroke="#111111">${vectorContent}\n  </g>`
    : '';
  const rasterLayer = rasterContent
    ? `\n  <g filter="url(#preview-raster-etch)">${rasterContent}\n  </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" overflow="visible">
  <desc>GIVA Live-Engrave Preview Simulation - SKU: ${jewelry.sku}</desc>
  <defs>${maskDefs}${vectorFilter}${rasterFilter}
  </defs>
  <style>
    path, circle, rect, polygon, text { vector-effect: non-scaling-stroke; }
  </style>
  <g id="production-engraving-layer">${vectorLayer}${rasterLayer}
  </g>
</svg>`;
}

/**
 * Downloads text as file in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'image/svg+xml') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
