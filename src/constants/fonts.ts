export interface FontOption {
  id: string;
  name: string;
  fontClass: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'serif', name: 'Playfair (Classy Serif)', fontClass: 'font-serif' },
  { id: 'sans', name: 'Jakarta (Modern Sans)', fontClass: 'font-sans' },
  { id: 'script', name: 'Script (Romantic Cursive)', fontClass: 'italic font-serif' },
  { id: 'mono', name: 'Monospace (Tech Precision)', fontClass: 'font-mono' },
];

export function getFontClass(fontId?: string): string {
  switch (fontId) {
    case 'sans':
      return 'font-sans';
    case 'script':
      return 'font-serif italic';
    case 'mono':
      return 'font-mono';
    case 'serif':
    default:
      return 'font-serif';
  }
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
