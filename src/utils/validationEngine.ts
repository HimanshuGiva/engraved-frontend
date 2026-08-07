import { CanvasElement, JewelryItem, ValidationIssue } from '../types';

/**
 * Validates canvas elements against SKU engraving constraints in real time.
 */
export function validateEngravingDesign(
  elements: CanvasElement[],
  jewelry: JewelryItem
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (elements.length === 0) return issues;

  for (const el of elements) {
    // Eraser layers are masks applied to another element, not physical marks
    // of their own — they have no independent bounds, thickness, or
    // character count to validate.
    if (el.type === 'eraser') continue;

    // 1. Boundary Check: Is element spilling outside safe area?
    const minX = 8;
    const maxX = 92;
    const minY = 8;
    const maxY = 92;

    const elLeft = el.x - el.width / 2;
    const elRight = el.x + el.width / 2;
    const elTop = el.y - el.height / 2;
    const elBottom = el.y + el.height / 2;

    if (elLeft < minX || elRight > maxX || elTop < minY || elBottom > maxY) {
      issues.push({
        id: `boundary-${el.id}`,
        elementId: el.id,
        severity: 'warning',
        title: 'Element outside safe area',
        message: `Your "${el.name}" extends slightly outside the safe ${jewelry.constraints.safeWidthMm}mm physical engraving zone.`,
        type: 'out_of_bounds',
        fixActionLabel: 'Move into safe area',
        canAutoFix: true,
      });
    }

    // 2. Stroke Width Check: Is stroke too thin for clear physical laser engraving?
    if ((el.type === 'freehand_draw' || el.type === 'handwriting') && (el.strokeWidth || 3) < 2.2) {
      issues.push({
        id: `stroke-${el.id}`,
        elementId: el.id,
        severity: 'warning',
        title: 'Thin lines detected',
        message: `Your handwritten "${el.name}" has very fine lines that might not show up clearly on ${jewelry.material.replace('_', ' ')}.`,
        type: 'thin_lines',
        fixActionLabel: 'Thicken stroke lines',
        canAutoFix: true,
      });
    }

    // 3. Text Size / Character count check
    if (el.type === 'text' && el.content.length > jewelry.constraints.maxCharacters) {
      issues.push({
        id: `text-${el.id}`,
        elementId: el.id,
        severity: 'warning',
        title: 'Text length limit',
        message: `Text "${el.content}" exceeds maximum ${jewelry.constraints.maxCharacters} characters recommended for this ${jewelry.type}.`,
        type: 'text_too_small',
        fixActionLabel: 'Shorten text',
        canAutoFix: false,
      });
    }
  }

  // 4. Density / Element count check (eraser mask layers don't count as
  // extra visual density on the physical surface)
  const densityCount = elements.filter((el) => el.type !== 'eraser').length;
  if (densityCount > 8) {
    issues.push({
      id: 'high-density',
      severity: 'warning',
      title: 'High design density',
      message: 'You have many overlapping elements on a small physical surface. Consider simplifying for the cleanest finish.',
      type: 'high_complexity',
      fixActionLabel: 'Optimize spacing',
      canAutoFix: true,
    });
  }

  return issues;
}

/**
 * Automatically corrects all fixable issues on elements
 */
export function autoFixEngravingDesign(
  elements: CanvasElement[],
  jewelry: JewelryItem
): { fixedElements: CanvasElement[]; summaryMessage: string } {
  let changesMadeCount = 0;

  const fixedElements = elements.map((el) => {
    let updated = { ...el };

    // Eraser layers mirror their target's box only for bookkeeping — they
    // render inside the target's own local space, so repositioning them
    // independently would desync that bookkeeping without changing
    // anything visually. Leave them untouched.
    if (updated.type === 'eraser') return updated;

    // Fix stroke width if too thin
    if ((updated.type === 'freehand_draw' || updated.type === 'handwriting') && (updated.strokeWidth || 3) < 3) {
      updated.strokeWidth = 3.2;
      changesMadeCount++;
    }

    // Fix boundary out of bounds
    const halfW = updated.width / 2;
    const halfH = updated.height / 2;
    const minSafeX = 12 + halfW;
    const maxSafeX = 88 - halfW;
    const minSafeY = 12 + halfH;
    const maxSafeY = 88 - halfH;

    if (updated.x - halfW < 8 || updated.x + halfW > 92) {
      updated.x = Math.max(minSafeX, Math.min(maxSafeX, updated.x));
      // Scale down slightly if too wide (compute the ratio before width is overwritten)
      if (updated.width > 70) {
        const scaleRatio = 65 / updated.width;
        updated.width = 65;
        updated.height = updated.height * scaleRatio;
      }
      changesMadeCount++;
    }

    if (updated.y - halfH < 8 || updated.y + halfH > 92) {
      updated.y = Math.max(minSafeY, Math.min(maxSafeY, updated.y));
      changesMadeCount++;
    }

    return updated;
  });

  const summaryMessage = changesMadeCount > 0
    ? `We automatically thickened fine strokes and centered your elements inside the ${jewelry.constraints.safeWidthMm}mm safe engraving area.`
    : 'Your design is already fully within physical engraving specifications!';

  return { fixedElements, summaryMessage };
}
