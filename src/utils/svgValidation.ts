import type { CanvasElement, JewelryItem } from '../types';
import { isRasterArtwork } from './svgUtils';

export interface SvgProductionIssue {
  code: 'raster' | 'thin_stroke' | 'empty';
  message: string;
}

/** Client-side checks before submitting an engraving order. */
export function collectProductionIssues(
  elements: CanvasElement[],
  jewelry: JewelryItem
): SvgProductionIssue[] {
  const issues: SvgProductionIssue[] = [];
  const visible = elements.filter((el) => el.type !== 'eraser');

  if (visible.length === 0) {
    issues.push({ code: 'empty', message: 'Add at least one design element before confirming.' });
  }

  for (const el of visible) {
    if ((el.type === 'svg_ai' || el.type === 'uploaded_image') && isRasterArtwork(el.content)) {
      issues.push({
        code: 'raster',
        message: `"${el.name}" still has a raster image — enhance/vectorize it first.`,
      });
    }

    if (
      (el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') &&
      el.strokeWidth != null &&
      jewelry.constraints.safeWidthMm > 0
    ) {
      const strokeMm = (el.strokeWidth / 100) * jewelry.constraints.safeWidthMm;
      if (strokeMm + 1e-9 < jewelry.constraints.minStrokeWidthMm) {
        issues.push({
          code: 'thin_stroke',
          message: `"${el.name}" stroke ~${strokeMm.toFixed(2)}mm is below minimum ${jewelry.constraints.minStrokeWidthMm}mm.`,
        });
      }
    }
  }

  return issues;
}
