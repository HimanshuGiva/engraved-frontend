export interface FontOption {
  id: string;
  name: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'serif', name: 'Cormorant (Classy Serif)' },
  { id: 'sans', name: 'Jakarta (Modern Sans)' },
  { id: 'script', name: 'Script (Romantic Cursive)' },
  { id: 'mono', name: 'JetBrains (Tech Precision)' },
];

export interface EngravingFont {
  family: string;
  style: 'normal' | 'italic';
  weight: number;
}

/**
 * Typeface used for engraved text on the canvas, in the preview and in the
 * laser file. These are stated explicitly rather than taken from the app's
 * Tailwind classes because every one of them must resolve to a font file we
 * actually ship (see FONT_URLS in utils/textToPath) — otherwise the customer
 * designs in one typeface and a different one gets cut.
 */
export function getEngravingFont(fontId?: string): EngravingFont {
  switch (fontId) {
    case 'sans':
      return { family: "'Plus Jakarta Sans', system-ui, sans-serif", style: 'normal', weight: 600 };
    case 'script':
      return { family: "'Cormorant Garamond', Georgia, serif", style: 'italic', weight: 600 };
    case 'mono':
      return { family: "'JetBrains Mono', ui-monospace, monospace", style: 'normal', weight: 600 };
    case 'serif':
    default:
      return { family: "'Cormorant Garamond', Georgia, serif", style: 'normal', weight: 600 };
  }
}

/**
 * Text is auto-fitted to its layer box, so longer strings render smaller.
 * Shared by the canvas and every composite so a layer never changes size
 * between the studio and the preview.
 */
export function engravingTextFontSize(content: string): number {
  return Math.min(32, 160 / Math.max(content.length, 1));
}

export const TEXT_SUGGESTIONS = [
  'Forever & Always',
  'A ❤ M',
  '20.10.2024',
  'Blessed',
  'GIVA Silver',
  'My Love',
  'Hope & Faith',
];
