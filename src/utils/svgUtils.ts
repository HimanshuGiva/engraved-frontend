import { CanvasElement, JewelryItem, JewelryMaterial, isErasableLayer } from '../types';
import { engravingTextFontSize, getEngravingFont } from '../constants/fonts';
import { getEngravingSurfaceAspect } from '../constants/engravingSurface';

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
 * Potrace / sidecar SVGs often arrive with an XML prolog and a DOCTYPE that
 * points at w3.org. Browsers refuse to paint that as an <img>, which is how
 * enhance-preview capture works — so strip it before we embed or rasterize.
 */
export function stripSvgPreamble(content: string): string {
  let s = content.replace(/^\uFEFF/, '').trim();
  for (let i = 0; i < 4; i++) {
    if (/^<\?xml\b/i.test(s)) {
      const end = s.indexOf('?>');
      if (end < 0) break;
      s = s.slice(end + 2).trim();
      continue;
    }
    if (/^<!DOCTYPE\b/i.test(s)) {
      const end = s.indexOf('>');
      if (end < 0) break;
      s = s.slice(end + 1).trim();
      continue;
    }
    break;
  }
  return s;
}

/** Root <svg>…</svg> if present, otherwise the cleaned markup. */
export function extractRootSvg(content: string): string {
  const cleaned = stripSvgPreamble(content);
  const start = cleaned.search(/<svg\b/i);
  if (start < 0) return cleaned;
  const end = cleaned.toLowerCase().lastIndexOf('</svg>');
  if (end < 0) return cleaned.slice(start);
  return cleaned.slice(start, end + 6);
}

export function svgToDataUrl(svgCode: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(extractRootSvg(svgCode))}`;
}

function svgInnerMarkup(content: string): { viewBox: string; fit: string; inner: string } {
  const root = extractRootSvg(content);
  const viewBox = root.match(/viewBox=["']([^"']+)["']/i)?.[1] ?? '0 0 100 100';
  const fit = root.match(/preserveAspectRatio=["']([^"']+)["']/i)?.[1] ?? 'xMidYMid meet';
  const match = root.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/i);
  return { viewBox, fit, inner: match ? match[1] : root };
}

export function normalizeEmbeddedArtworkSvg(content: string): string {
  const { viewBox, inner } = svgInnerMarkup(content);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

export function isRasterArtwork(content: string): boolean {
  return /<image[\s/>]/i.test(content);
}

/** Force SVG artwork to fill its element box (used when applying a region enhance). */
export function svgToFillElementBox(svgCode: string): string {
  const trimmed = extractRootSvg(svgCode);
  if (!/^<svg\b/i.test(trimmed)) return svgCode;
  return trimmed
    .replace(/\s+preserveAspectRatio="[^"]*"/i, '')
    .replace(/<svg\b/i, '<svg preserveAspectRatio="none"');
}

/** Pull an embedded PNG/JPEG data URL out of SVG artwork (common for AI enhance results). */
export function extractEmbeddedRasterDataUrl(content: string): string | null {
  const match = content.match(/(?:href|xlink:href)=["'](data:image\/[^"']+)["']/i);
  return match?.[1] ?? null;
}

export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Local-space anchor of canvas text — matches the <text x/y> used by the canvas. */
const TEXT_ANCHOR_X = 50;
const TEXT_ANCHOR_Y = 52;

/**
 * A composite stretches its 100×100 viewBox across the whole engraving surface,
 * so one user unit is not the same size in x and y. Anything that has to stay
 * isotropic — a layer's rotation, and the aspect-preserving fit the canvas gives
 * to text and imported artwork — is therefore expressed in a corrected space:
 * `frame` puts the origin at the layer centre there, and boxW/boxH are the
 * layer's box measured in the same space.
 */
interface LayerFrame {
  frame: string;
  boxW: number;
  boxH: number;
}

export function layerFrame(el: CanvasElement, surfaceAspect: number): LayerFrame {
  const aspect = Math.max(surfaceAspect, 0.05);
  return {
    frame: `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) scale(${(1 / aspect).toFixed(4)}, 1) rotate(${el.rotation.toFixed(2)})`,
    boxW: el.width * aspect,
    boxH: el.height,
  };
}

/** Maps a layer's local 0–100 space onto its box, as preserveAspectRatio="none" does. */
function boxTransform({ boxW, boxH }: LayerFrame): string {
  return `translate(${(-boxW / 2).toFixed(3)}, ${(-boxH / 2).toFixed(3)}) scale(${(boxW / 100).toFixed(4)}, ${(boxH / 100).toFixed(4)})`;
}

/** Uniform fit of the local 0–100 space inside the box, as `xMidYMid meet` does. */
function fitTransform({ boxW, boxH }: LayerFrame): string {
  const k = Math.min(boxW, boxH) / 100;
  return `translate(${(-50 * k).toFixed(3)}, ${(-50 * k).toFixed(3)}) scale(${k.toFixed(4)})`;
}

function wrapLayer(frame: LayerFrame, maskAttr: string, inner: string): string {
  return `\n  <g transform="${frame.frame}">\n    <g${maskAttr}>${inner}\n    </g>\n  </g>`;
}

/**
 * Eraser strokes are authored in the layer's local 0–100 space, but the mask is
 * applied in the layer frame, so its contents need the same box mapping.
 */
export function eraserMaskDef(
  maskId: string,
  el: CanvasElement,
  surfaceAspect: number,
  strokes: string
): string {
  const transform = boxTransform(layerFrame(el, surfaceAspect));
  return `\n    <mask id="${maskId}" maskContentUnits="userSpaceOnUse">\n      <g transform="${transform}">\n        <rect x="0" y="0" width="100" height="100" fill="white" />\n        ${strokes}\n      </g>\n    </mask>`;
}

/**
 * Imported artwork keeps its own proportions inside the layer box, exactly as
 * the browser does for the raw SVG the canvas drops into that box.
 */
export function embedArtworkMarkup(
  el: CanvasElement,
  surfaceAspect: number,
  maskAttr: string
): string {
  const { viewBox, fit, inner } = svgInnerMarkup(el.content);

  const frame = layerFrame(el, surfaceAspect);
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" x="${(-frame.boxW / 2).toFixed(3)}" y="${(-frame.boxH / 2).toFixed(3)}" width="${frame.boxW.toFixed(3)}" height="${frame.boxH.toFixed(3)}" preserveAspectRatio="${fit}">${inner}</svg>`;

  return wrapLayer(frame, maskAttr, `\n    ${artwork}`);
}

/** Stroked vector layers stretch to fill their box, as they do on the canvas. */
export function pathLayerMarkup(
  el: CanvasElement,
  surfaceAspect: number,
  maskAttr: string,
  stroke: string
): string {
  const frame = layerFrame(el, surfaceAspect);
  const inner = `\n    <g transform="${boxTransform(frame)}">\n      <path d="${el.content}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" />\n    </g>`;
  return wrapLayer(frame, maskAttr, inner);
}

export function textLayerMarkup(el: CanvasElement, surfaceAspect: number, fill: string): string {
  const frame = layerFrame(el, surfaceAspect);
  const font = getEngravingFont(el.color);
  const fontSize = engravingTextFontSize(el.content);
  const inner = `\n    <g transform="${fitTransform(frame)}">\n      <text x="${TEXT_ANCHOR_X}" y="${TEXT_ANCHOR_Y}" font-family="${font.family}" font-style="${font.style}" font-size="${fontSize.toFixed(3)}" font-weight="${font.weight}" fill="${fill}" stroke="none" text-anchor="middle" dominant-baseline="middle">${escapeXmlText(el.content)}</text>\n    </g>`;
  return wrapLayer(frame, '', inner);
}

/** Same placement as textLayerMarkup, for text already converted to outlines. */
function textPathMarkup(el: CanvasElement, d: string, surfaceAspect: number, fill: string): string {
  const frame = layerFrame(el, surfaceAspect);
  const inner = `\n    <g transform="${fitTransform(frame)}">\n      <path d="${d}" transform="translate(${TEXT_ANCHOR_X}, ${TEXT_ANCHOR_Y})" fill="${fill}" stroke="none" />\n    </g>`;
  return wrapLayer(frame, '', inner);
}

interface CompositeLayers {
  maskDefs: string;
  vectorContent: string;
  rasterContent: string;
}

/** Engraved marks are drawn as ink here; the preview filter turns them into grooves. */
const ENGRAVE_INK = '#111111';

export function buildLayerMask(
  el: CanvasElement,
  erasers: CanvasElement[],
  surfaceAspect: number,
  idPrefix = 'erase-mask'
): { def: string; attr: string } {
  const related = erasers.filter((e) => e.targetElementId === el.id);
  if (!isErasableLayer(el.type) || related.length === 0) return { def: '', attr: '' };

  const maskId = `${idPrefix}-${el.id}`;
  const strokes = related
    .map((e) =>
      eraserMaskPathMarkup({
        content: e.content,
        strokeWidth: e.strokeWidth ?? 8,
        filled: e.eraserFill,
      })
    )
    .join('\n        ');

  return {
    def: eraserMaskDef(maskId, el, surfaceAspect, strokes),
    attr: ` mask="url(#${maskId})"`,
  };
}

async function buildCompositeLayers(
  elements: CanvasElement[],
  jewelry: JewelryItem,
  options: { convertTextToPaths: boolean; allowRaster: boolean }
): Promise<CompositeLayers> {
  const sorted = [...elements].filter((el) => el.type !== 'eraser').sort((a, b) => a.zIndex - b.zIndex);
  const erasers = elements.filter((el) => el.type === 'eraser');
  const surfaceAspect = getEngravingSurfaceAspect(jewelry.constraints.shape);

  let vectorContent = '';
  let rasterContent = '';
  let maskDefs = '';

  for (const el of sorted) {
    const mask = buildLayerMask(el, erasers, surfaceAspect);
    maskDefs += mask.def;

    if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
      if (isRasterArtwork(el.content)) {
        if (!options.allowRaster) {
          throw new Error(
            `Layer "${el.name}" contains an embedded raster image. Vectorize or remove it before engraving.`
          );
        }
        rasterContent += embedArtworkMarkup(el, surfaceAspect, mask.attr);
      } else {
        vectorContent += embedArtworkMarkup(el, surfaceAspect, mask.attr);
      }
    } else if (el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      vectorContent += pathLayerMarkup(el, surfaceAspect, mask.attr, ENGRAVE_INK);
    } else if (el.type === 'text') {
      if (options.convertTextToPaths) {
        const { textToSvgPath } = await import('./textToPath');
        const d = await textToSvgPath(el.content, el.color, engravingTextFontSize(el.content));
        vectorContent += textPathMarkup(el, d, surfaceAspect, ENGRAVE_INK);
      } else {
        vectorContent += textLayerMarkup(el, surfaceAspect, ENGRAVE_INK);
      }
    }
  }

  return { maskDefs, vectorContent, rasterContent };
}

/** Display composite: text stays as <text> and rasters are kept, so it stays sync. */
function buildDisplayLayers(elements: CanvasElement[], surfaceAspect: number): CompositeLayers {
  const sorted = [...elements].filter((el) => el.type !== 'eraser').sort((a, b) => a.zIndex - b.zIndex);
  const erasers = elements.filter((el) => el.type === 'eraser');

  let maskDefs = '';
  let vectorContent = '';
  let rasterContent = '';

  for (const el of sorted) {
    const mask = buildLayerMask(el, erasers, surfaceAspect);
    maskDefs += mask.def;

    if (el.type === 'svg_ai' || el.type === 'uploaded_image') {
      const markup = embedArtworkMarkup(el, surfaceAspect, mask.attr);
      if (isRasterArtwork(el.content)) rasterContent += markup;
      else vectorContent += markup;
    } else if (el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      vectorContent += pathLayerMarkup(el, surfaceAspect, mask.attr, ENGRAVE_INK);
    } else if (el.type === 'text') {
      vectorContent += textLayerMarkup(el, surfaceAspect, ENGRAVE_INK);
    }
  }

  return { maskDefs, vectorContent, rasterContent };
}

/**
 * Preview / canvas composite — may include &lt;text&gt; and rasters for display.
 */
export function generateCompositeSvg(elements: CanvasElement[], jewelry: JewelryItem): string {
  const { maskDefs, vectorContent, rasterContent } = buildDisplayLayers(
    elements,
    getEngravingSurfaceAspect(jewelry.constraints.shape)
  );
  return wrapProductionSvg(jewelry, maskDefs, vectorContent + rasterContent);
}

/**
 * Laser-ready SVG: text converted to paths, rasters rejected.
 */
export async function generateProductionSvg(
  elements: CanvasElement[],
  jewelry: JewelryItem
): Promise<string> {
  const { maskDefs, vectorContent } = await buildCompositeLayers(elements, jewelry, {
    convertTextToPaths: true,
    allowRaster: false,
  });
  return wrapProductionSvg(jewelry, maskDefs, vectorContent);
}

function wrapProductionSvg(jewelry: JewelryItem, maskDefs: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" overflow="visible">
  <desc>GIVA Live-Engrave Production Vector Export - SKU: ${jewelry.sku} - Safe Area: ${jewelry.constraints.safeWidthMm}mm x ${jewelry.constraints.safeHeightMm}mm</desc>
  <defs>${maskDefs}
  </defs>
  <style>
    path, circle, rect, polygon, text { vector-effect: non-scaling-stroke; }
  </style>
  <g id="production-engraving-layer" color="${ENGRAVE_INK}">
    ${content}
  </g>
</svg>`;
}

/**
 * Preview-only etch palette.
 *
 * A laser mark is a recessed groove in polished metal, not ink on top of it:
 * the floor is a shallow matte veil that still shows the metal tone underneath,
 * while the walls read much darker and the lower rim catches the light. Colours
 * are therefore semi-transparent so they composite over the metal gradient
 * instead of replacing it with a flat swatch.
 */
interface EtchPalette {
  floor: string;
  floorOpacity: number;
  wall: string;
  wallOpacity: number;
  rim: string;
  rimOpacity: number;
}

function getEtchPalette(material: JewelryMaterial): EtchPalette {
  switch (material) {
    case '18k_gold':
      return {
        floor: '#3a2a0c',
        floorOpacity: 0.56,
        wall: '#43310f',
        wallOpacity: 0.55,
        rim: '#fff4d6',
        rimOpacity: 0.42,
      };
    case 'rose_gold':
      return {
        floor: '#3a231c',
        floorOpacity: 0.56,
        wall: '#432a21',
        wallOpacity: 0.55,
        rim: '#ffe9e2',
        rimOpacity: 0.42,
      };
    case 'platinum':
      return {
        floor: '#272d34',
        floorOpacity: 0.58,
        wall: '#313944',
        wallOpacity: 0.55,
        rim: '#ffffff',
        rimOpacity: 0.42,
      };
    case 'silver':
    default:
      return {
        floor: '#2a323b',
        floorOpacity: 0.58,
        wall: '#333c45',
        wallOpacity: 0.55,
        rim: '#ffffff',
        rimOpacity: 0.42,
      };
  }
}

function hexChannels(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

/**
 * Recessed-groove filter. Wall slivers are derived by subtracting an offset
 * copy of the shape from itself, so their width is fixed in surface units
 * rather than proportional to the stroke. A hairline stroke is therefore
 * almost entirely wall (reads as a dark etched line), while a thick stroke
 * keeps a matte metal floor in the middle with shaded edges — which is how a
 * wide engraved area actually looks.
 *
 * Offsets/blurs are in the 0–100 viewBox user space shared by every layer.
 */
function buildLaserEtchFilter(id: string, palette: EtchPalette): string {
  return `
    <filter id="${id}" x="-14%" y="-14%" width="128%" height="128%" color-interpolation-filters="sRGB">
      <feFlood flood-color="${palette.floor}" flood-opacity="${palette.floorOpacity}" result="floorColor"/>
      <feComposite in="floorColor" in2="SourceAlpha" operator="in" result="floor"/>

      <feOffset in="SourceAlpha" dx="-0.22" dy="-0.7" result="liftAlpha"/>
      <feGaussianBlur in="liftAlpha" stdDeviation="0.6" result="liftBlur"/>
      <feComposite in="SourceAlpha" in2="liftBlur" operator="out" result="lowerWallMask"/>
      <feFlood flood-color="${palette.rim}" flood-opacity="${palette.rimOpacity}" result="rimColor"/>
      <feComposite in="rimColor" in2="lowerWallMask" operator="in" result="lowerWall"/>

      <feOffset in="SourceAlpha" dx="0.24" dy="0.72" result="dropAlpha"/>
      <feGaussianBlur in="dropAlpha" stdDeviation="0.8" result="dropBlur"/>
      <feComposite in="SourceAlpha" in2="dropBlur" operator="out" result="upperWallMask"/>
      <feFlood flood-color="${palette.wall}" flood-opacity="${palette.wallOpacity}" result="wallColor"/>
      <feComposite in="wallColor" in2="upperWallMask" operator="in" result="upperWall"/>

      <feMerge>
        <feMergeNode in="floor"/>
        <feMergeNode in="lowerWall"/>
        <feMergeNode in="upperWall"/>
      </feMerge>
    </filter>`;
}

/**
 * Raster artwork can't be given groove walls, so darkness is mapped to etch
 * depth instead: dark pixels become an opaque wall-toned mark, light pixels
 * fade out entirely so the metal shows through.
 */
function buildRasterEtchFilter(id: string, palette: EtchPalette): string {
  const [wr, wg, wb] = hexChannels(palette.wall);
  return `
    <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0 0 0 0 ${wr.toFixed(3)}
                0 0 0 0 ${wg.toFixed(3)}
                0 0 0 0 ${wb.toFixed(3)}
                -0.33 -0.33 -0.33 1 0" result="depth"/>
      <feComponentTransfer in="depth" result="etched">
        <feFuncA type="linear" slope="0.82" intercept="0"/>
      </feComponentTransfer>
      <feGaussianBlur in="etched" stdDeviation="0.05"/>
    </filter>`;
}

/**
 * Preview-only composite SVG — same geometry as production export but with a
 * laser-etch filter so artwork reads as recessed oxidized grooves in metal,
 * not flat black ink on the surface.
 */
export function generatePreviewCompositeSvg(elements: CanvasElement[], jewelry: JewelryItem): string {
  const { maskDefs, vectorContent, rasterContent } = buildDisplayLayers(
    elements,
    getEngravingSurfaceAspect(jewelry.constraints.shape)
  );

  const palette = getEtchPalette(jewelry.material);
  const vectorFilter = buildLaserEtchFilter('preview-laser-etch', palette);
  const rasterFilter = buildRasterEtchFilter('preview-raster-etch', palette);

  const vectorLayer = vectorContent
    ? `\n  <g filter="url(#preview-laser-etch)" color="${ENGRAVE_INK}">${vectorContent}\n  </g>`
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
