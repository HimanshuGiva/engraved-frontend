import { CanvasElement, JewelryItem } from '../types';

/**
 * Preset outline paths for the Shapes tool, authored in a local 0-100
 * coordinate space centered at (50, 50) — the same convention used by
 * freehand drawings and AI vectors, so shapes scale/rotate/export exactly
 * like every other element type.
 */
export const SHAPE_PRESETS: Record<string, string> = {
  rectangle: 'M10,10 H90 V90 H10 Z',
  circle: 'M10,50 A40,40 0 1,0 90,50 A40,40 0 1,0 10,50 Z',
  triangle: 'M50,10 L90,90 L10,90 Z',
  diamond: 'M50,10 L90,50 L50,90 L10,50 Z',
  star: 'M50,10 L59.40,37.06 L88.04,37.64 L65.22,54.94 L73.51,82.36 L50,66 L26.49,82.36 L34.78,54.94 L11.96,37.64 L40.60,37.06 Z',
  heart: 'M50,82 C50,82 18,58 18,36 C18,22 28,16 38,20 C45,23 50,30 50,30 C50,30 55,23 62,20 C72,16 82,22 82,36 C82,58 50,82 50,82 Z',
};

export const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle',
  circle: 'Circle',
  triangle: 'Triangle',
  diamond: 'Diamond',
  star: 'Star',
  heart: 'Heart',
};

/**
 * Builds a CSS mask (data-URI SVG) that punches transparent holes wherever
 * an eraser layer's stroke passes, without ever touching the target
 * element's own artwork. Used identically by the live canvas preview and
 * (in path form) by the production export, so what the customer sees while
 * erasing matches what gets engraved.
 */
export function buildEraserMaskDataUri(erasers: CanvasElement[]): string | null {
  if (!erasers.length) return null;
  // vector-effect="non-scaling-stroke" is the precision fix: this mask gets
  // stretched non-uniformly by CSS (mask-size 100% 100%) to match whatever
  // width x height box the target element actually renders at, which for
  // any non-square element (nearly every hand-drawn stroke or AI vector)
  // would otherwise distort a uniform stroke-width into a fat, lopsided
  // ellipse — erasing a visibly larger area than the thin, constant-width
  // pink line the user actually saw while dragging (that preview path uses
  // the same non-scaling-stroke trick, which is why it looked precise while
  // the committed erase didn't). This keeps the two in exact sync.
  const strokes = erasers
    .map(
      (e) =>
        `<path d="${e.content}" fill="none" stroke="black" stroke-width="${e.strokeWidth ?? 8}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
    )
    .join('');
  // The erased holes need to be REAL transparent pixels (alpha 0) in the
  // rendered raster, not just "visually black" — when this data URI is fed
  // straight to CSS `mask-image` (rather than referenced as an SVG <mask>
  // element via `mask="url(#id)"`), browsers default `mask-mode` to `alpha`
  // for plain images, per the CSS Masking spec's `match-source` behavior
  // ("if it [the mask reference] is an image, this value is treated as
  // alpha"). A flat white rect + opaque black strokes is 100% opaque
  // everywhere, so under alpha-mode masking nothing gets erased at all: the
  // eraser stroke previews correctly but the release never actually cuts a
  // hole. Wrapping the strokes in an inner SVG <mask> (which is ALWAYS
  // luminance-evaluated per SVG semantics, independent of the outer CSS
  // mask-mode) and painting a masked rect bakes real alpha=0 into the
  // stroke area before it's ever exposed to CSS masking, so it erases
  // correctly under both alpha and luminance CSS mask-mode.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><mask id="erase-hole" maskContentUnits="userSpaceOnUse"><rect x="0" y="0" width="100" height="100" fill="white"/>${strokes}</mask></defs><rect x="0" y="0" width="100" height="100" fill="white" mask="url(#erase-hole)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Sanitizes and cleans SVG code from AI or user upload
 * Removes raster images, script tags, invalid attributes, gradients/filters
 */
export function sanitizeSvg(svgCode: string): string {
  if (!svgCode) return '';

  // Remove XML declaration and doctype
  let clean = svgCode.replace(/<\?xml[^>]*\?>/gi, '');
  clean = clean.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove script, style, image, filter tags
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<image[\s\S]*?<\/image>/gi, '');
  clean = clean.replace(/<filter[\s\S]*?<\/filter>/gi, '');
  clean = clean.replace(/<linearGradient[\s\S]*?<\/linearGradient>/gi, '');
  clean = clean.replace(/<radialGradient[\s\S]*?<\/radialGradient>/gi, '');

  // Ensure viewBox exists
  if (!clean.includes('viewBox')) {
    clean = clean.replace('<svg', '<svg viewBox="0 0 100 100"');
  }

  // Ensure stroke/fill color compatibility
  clean = clean.replace(/stroke="[^"]*"/gi, 'stroke="currentColor"');
  
  return clean;
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

/**
 * Combines all canvas elements into a single clean, production-ready vector SVG file.
 */
export function generateCompositeSvg(elements: CanvasElement[], jewelry: JewelryItem): string {
  // Eraser layers never render themselves — they exist only to punch masked
  // holes into whichever element they target, so the original artwork stays
  // fully intact underneath (deleting the eraser layer instantly restores it).
  const sorted = [...elements].filter((el) => el.type !== 'eraser').sort((a, b) => a.zIndex - b.zIndex);
  const erasers = elements.filter((el) => el.type === 'eraser');

  let elementsContent = '';
  let maskDefs = '';

  for (const el of sorted) {
    const sx = el.width / 100;
    const sy = el.height / 100;
    const rotation = el.rotation.toFixed(2);

    // Any eraser strokes targeting this element get baked into a per-element
    // <mask> so the exported production vector matches exactly what the
    // customer saw while erasing on the live canvas.
    const relatedErasers = erasers.filter((e) => e.targetElementId === el.id);
    let maskAttr = '';
    if (relatedErasers.length > 0) {
      const maskId = `erase-mask-${el.id}`;
      const strokes = relatedErasers
        .map(
          (e) =>
            `<path d="${e.content}" fill="none" stroke="black" stroke-width="${e.strokeWidth ?? 8}" stroke-linecap="round" stroke-linejoin="round" />`
        )
        .join('\n      ');
      maskDefs += `\n    <mask id="${maskId}" maskContentUnits="userSpaceOnUse">\n      <rect x="0" y="0" width="100" height="100" fill="white" />\n      ${strokes}\n    </mask>`;
      maskAttr = ` mask="url(#${maskId})"`;
    }

    if (el.type === 'svg_ai' || el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') {
      // AI/uploaded artwork, freehand strokes, and shapes are authored in a
      // local 0-100 coordinate space whose own visual center sits at local
      // (50, 50) — the same way the live editing canvas centers them via
      // `transform: translate(-50%, -50%)`. So after scaling to the element's
      // actual width/height we must re-center the shape on the origin BEFORE
      // rotating/translating to (x, y). Without this, `translate(x, y)` places
      // the artwork's local (0, 0) — not its center — at (x, y), shifting
      // every such element down-and-right by roughly half its own box (e.g. a
      // 50%-wide default element lands ~25 canvas units off), which is why
      // designs looked wrong/misplaced (or clipped out of the safe area
      // entirely) on the jewelry preview, the SVG download, and the store
      // associate view.
      const shiftX = (-50 * sx).toFixed(3);
      const shiftY = (-50 * sy).toFixed(3);
      const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) translate(${shiftX}, ${shiftY}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

      if (el.type === 'svg_ai') {
        let svgBody = el.content;
        // Extract inner contents of <svg>...</svg>
        const match = svgBody.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const inner = match ? match[1] : svgBody;
        elementsContent += `\n  <g transform="${transform}">\n    <g${maskAttr}>\n    ${inner}\n    </g>\n  </g>`;
      } else {
        elementsContent += `\n  <g transform="${transform}">\n    <g${maskAttr}>\n    <path d="${el.content}" fill="none" stroke="#111111" stroke-width="${el.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" />\n    </g>\n  </g>`;
      }
    } else if (el.type === 'text') {
      // Text is drawn at local (0, 0) with text-anchor/dominant-baseline set
      // to "middle", so (0, 0) already IS its own visual center — a plain
      // translate(x, y) places it correctly, no re-centering needed.
      const transform = `translate(${el.x.toFixed(2)}, ${el.y.toFixed(2)}) rotate(${rotation}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      elementsContent += `\n  <g transform="${transform}">\n    <g${maskAttr}>\n    <text x="0" y="0" font-family="'Playfair Display', serif" font-size="16" font-weight="600" fill="#111111" text-anchor="middle" dominant-baseline="middle">${el.content}</text>\n    </g>\n  </g>`;
    }
  }

  const composite = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1000" height="1000">
  <desc>GIVA Live-Engrave Production Vector Export - SKU: ${jewelry.sku} - Safe Area: ${jewelry.constraints.safeWidthMm}mm x ${jewelry.constraints.safeHeightMm}mm</desc>
  <defs>${maskDefs}
  </defs>
  <style>
    path, circle, rect, polygon, text { vector-effect: non-scaling-stroke; }
  </style>
  <g id="production-engraving-layer" fill="none" stroke="#111111">
    ${elementsContent}
  </g>
</svg>`;

  return composite;
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
