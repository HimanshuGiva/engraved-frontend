import type { CSSProperties } from 'react';
import { JewelryItem } from '../types';

/** Shared engraving-area frame — canvas and preview must use identical sizing. */
export type EngravingShape = JewelryItem['constraints']['shape'];

type JewelryConstraints = JewelryItem['constraints'];

export const ENGRAVING_SURFACE_CLASS: Record<EngravingShape, string> = {
  circle: 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-full',
  squircle: 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-[28%]',
  bar: 'w-40 h-80 sm:w-52 sm:h-[416px] rounded-2xl',
  heart: 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-[30%]',
  oval: 'w-64 h-80 sm:w-72 sm:h-[360px] rounded-[50%]',
  rectangle: 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-2xl',
};

export const ENGRAVING_SURFACE_RADIUS: Record<EngravingShape, string> = {
  circle: '9999px',
  squircle: '28%',
  bar: '1rem',
  heart: '30%',
  oval: '50%',
  rectangle: '1rem',
};

/**
 * Width ÷ height of the engraving area. Every breakpoint in
 * ENGRAVING_SURFACE_CLASS must keep this ratio, otherwise a design laid out on
 * the canvas is stretched when the preview re-renders it at this aspect.
 */
export const ENGRAVING_SURFACE_ASPECT: Record<EngravingShape, number> = {
  circle: 1,
  squircle: 1,
  bar: 40 / 80,
  heart: 1,
  oval: 64 / 80,
  rectangle: 1,
};

export function getEngravingSurfaceAspect(shape: EngravingShape): number {
  return ENGRAVING_SURFACE_ASPECT[shape];
}

/**
 * Physical width÷height from catalog engraving_mm — used for canvas, preview,
 * export, and download so all stages share one aspect ratio per SKU.
 */
export function getJewelrySurfaceAspect(
  constraints: Pick<JewelryConstraints, 'safeWidthMm' | 'safeHeightMm' | 'shape'>
): number {
  const { safeWidthMm, safeHeightMm, shape } = constraints;
  if (safeWidthMm > 0 && safeHeightMm > 0) {
    return safeWidthMm / safeHeightMm;
  }
  return ENGRAVING_SURFACE_ASPECT[shape];
}

/** Max pendant height (px) per shape — width is derived from catalog aspect. */
const SURFACE_MAX_HEIGHT_PX: Record<EngravingShape, number> = {
  circle: 420,
  squircle: 420,
  bar: 416,
  heart: 420,
  oval: 360,
  rectangle: 420,
};

/** Inline surface frame so canvas matches preview and exported SVG geometry. */
export function getEngravingSurfaceStyle(
  constraints: JewelryConstraints,
  maxHeightPx = SURFACE_MAX_HEIGHT_PX[constraints.shape]
): CSSProperties {
  const aspect = getJewelrySurfaceAspect(constraints);
  return {
    aspectRatio: `${aspect}`,
    width: `min(100%, calc(${maxHeightPx}px * ${aspect}))`,
    maxHeight: `${maxHeightPx}px`,
    borderRadius: ENGRAVING_SURFACE_RADIUS[constraints.shape],
  };
}

/** Pixel width÷height of a canvas % box on this jewelry surface. */
export function canvasBoxPixelAspect(
  widthPct: number,
  heightPct: number,
  surfaceAspect: number
): number {
  return (
    (Math.max(widthPct, 0.0001) / Math.max(heightPct, 0.0001)) * Math.max(surfaceAspect, 0.05)
  );
}
