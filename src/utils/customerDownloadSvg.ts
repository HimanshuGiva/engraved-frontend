import { getJewelrySurfaceAspect } from '../constants/engravingSurface';
import { EngravingConstraints, JewelryItem } from '../types';
import { extractRootSvg } from './svgUtils';

/** Long edge (px) for customer-facing SVG — readable in browsers and design tools. */
export const CUSTOMER_DOWNLOAD_MAX_PX = 1600;

export const CUSTOMER_DOWNLOAD_BACKGROUND = '#FAF8F5';

type DownloadConstraints = Pick<
  EngravingConstraints,
  'safeWidthMm' | 'safeHeightMm' | 'shape'
>;

/** Pixel width×height preserving catalog physical aspect ratio. */
export function getCustomerDownloadPixelSize(constraints: DownloadConstraints): {
  w: number;
  h: number;
} {
  const aspect = getJewelrySurfaceAspect(constraints);
  const a = Math.max(aspect, 0.05);
  if (a >= 1) {
    return {
      w: CUSTOMER_DOWNLOAD_MAX_PX,
      h: Math.max(1, Math.round(CUSTOMER_DOWNLOAD_MAX_PX / a)),
    };
  }
  return {
    w: Math.max(1, Math.round(CUSTOMER_DOWNLOAD_MAX_PX * a)),
    h: CUSTOMER_DOWNLOAD_MAX_PX,
  };
}

function replaceRootDimensions(svg: string, w: number, h: number): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/i, '')
      .replace(/\s+height="[^"]*"/i, '');
    return `<svg${cleaned} width="${w}" height="${h}">`;
  });
}

function replaceDesc(svg: string, desc: string): string {
  if (/<desc\b/i.test(svg)) {
    return svg.replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/i, `<desc>${desc}</desc>`);
  }
  return svg.replace(/(<svg\b[^>]*>)/i, `$1\n  <desc>${desc}</desc>`);
}

function injectBackground(svg: string, fill: string): string {
  const marker = `fill="${fill}"`;
  if (svg.includes(marker)) return svg;
  return svg.replace(/(<svg\b[^>]*>)/i, `$1\n  <rect x="0" y="0" width="100" height="100" fill="${fill}"/>`);
}

/**
 * Re-wrap laser production SVG at screen-readable pixel size.
 * viewBox and layer geometry are unchanged — only root dimensions and background differ.
 */
export function toCustomerDownloadSvg(
  productionSvg: string,
  jewelry: Pick<JewelryItem, 'sku' | 'constraints'>
): string {
  const { w, h } = getCustomerDownloadPixelSize(jewelry.constraints);
  const { safeWidthMm, safeHeightMm } = jewelry.constraints;

  let svg = extractRootSvg(productionSvg);
  svg = replaceRootDimensions(svg, w, h);

  const physical =
    safeWidthMm > 0 && safeHeightMm > 0
      ? `${safeWidthMm}mm × ${safeHeightMm}mm physical engraving area`
      : 'physical engraving area';

  svg = replaceDesc(
    svg,
    `GIVA Live-Engrave Customer Download - SKU: ${jewelry.sku} - ${w}×${h}px display export - ${physical}`
  );

  return injectBackground(svg, CUSTOMER_DOWNLOAD_BACKGROUND);
}
