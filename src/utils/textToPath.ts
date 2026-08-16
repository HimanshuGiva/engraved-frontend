import opentype, { type Font } from 'opentype.js';

/** Font files for production text→path conversion (hosted under /fonts). */
const FONT_URLS: Record<string, string> = {
  serif: '/fonts/PlayfairDisplay-SemiBold.ttf',
  sans: '/fonts/PlusJakartaSans-SemiBold.ttf',
  script: '/fonts/PlayfairDisplay-Italic.ttf',
  mono: '/fonts/PlusJakartaSans-SemiBold.ttf',
};

const fontCache = new Map<string, Font>();

async function loadFont(fontId: string): Promise<Font> {
  const key = fontId in FONT_URLS ? fontId : 'serif';
  const cached = fontCache.get(key);
  if (cached) return cached;

  const url = FONT_URLS[key];
  const buffer = await fetch(url).then(async (res) => {
    if (!res.ok) {
      throw new Error(`Failed to load font ${url} (${res.status})`);
    }
    return res.arrayBuffer();
  });
  const font = opentype.parse(buffer);
  fontCache.set(key, font);
  return font;
}

/**
 * Converts a text string to an SVG path centered at (0,0) in local element space.
 * Font size is in viewBox user units (same as canvas text).
 */
export async function textToSvgPath(
  text: string,
  fontId: string | undefined,
  fontSize = 16
): Promise<string> {
  const font = await loadFont(fontId ?? 'serif');
  const path = font.getPath(text, 0, 0, fontSize);
  const bbox = path.getBoundingBox();
  const cx = (bbox.x1 + bbox.x2) / 2;
  const cy = (bbox.y1 + bbox.y2) / 2;
  const centered = font.getPath(text, -cx, -cy, fontSize);
  const d = centered.toPathData(2);
  if (!d) {
    throw new Error('Text produced an empty path — try different characters');
  }
  return d;
}
