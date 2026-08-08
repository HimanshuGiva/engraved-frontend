/** Preset outline paths in local 0–100 space centered at (50, 50). */
export const SHAPE_PRESETS: Record<string, string> = {
  rectangle: 'M10,10 H90 V90 H10 Z',
  circle: 'M10,50 A40,40 0 1,0 90,50 A40,40 0 1,0 10,50 Z',
  triangle: 'M50,10 L90,90 L10,90 Z',
  diamond: 'M50,10 L90,50 L50,90 L10,50 Z',
  star: 'M50,10 L59.40,37.06 L88.04,37.64 L65.22,54.94 L73.51,82.36 L50,66 L26.49,82.36 L34.78,54.94 L11.96,37.64 L40.60,37.06 Z',
  heart: 'M50,82 C50,82 18,58 18,36 C18 22 28 16 38 20 C45 23 50 30 50 30 C50 30 55 23 62 20 C72 16 82 22 82 36 C82 58 50 82 50 82 Z',
};

export const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle',
  circle: 'Circle',
  triangle: 'Triangle',
  diamond: 'Diamond',
  star: 'Star',
  heart: 'Heart',
};

export const SHAPE_KEYS = Object.keys(SHAPE_PRESETS);
