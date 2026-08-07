import { AiOption, JewelryItem } from '../types';
import { apiFetch } from './apiClient';

interface BackendGenerateImage {
  b64: string;
  content_type: string;
}

interface BackendGenerateResponse {
  images: BackendGenerateImage[];
  provider: string;
}

const STYLE_TAGS = ['Minimalist & Clean', 'Bold Engraving', 'Detailed Contour', 'Line Art'];

/** Wrap backend PNG (base64) in an SVG so canvas + export can render it. */
export function pngB64ToSvgWrapper(b64: string, contentType = 'image/png'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
  <image width="100" height="100" href="data:${contentType};base64,${b64}"/>
</svg>`;
}

export async function fetchAiEngravingOptions(
  prompt: string,
  _jewelry: JewelryItem
): Promise<{ title: string; options: AiOption[] }> {
  const data = await apiFetch<BackendGenerateResponse>('/v1/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, n: 2 }),
  });

  if (!data.images?.length) {
    throw new Error('AI returned no images');
  }

  const options: AiOption[] = data.images.slice(0, 2).map((img, idx) => ({
    id: `opt-${idx}-${Date.now()}`,
    title: idx === 0 ? 'Option A' : 'Option B',
    svgCode: pngB64ToSvgWrapper(img.b64, img.content_type || 'image/png'),
    styleTag: STYLE_TAGS[idx] ?? 'AI Generated',
  }));

  return {
    title: prompt,
    options,
  };
}

export type EnhanceMode = 'ai_generated' | 'manual';

interface BackendEnhanceResponse {
  b64: string;
  content_type: string;
  provider: string;
}

/** Enhance a rasterized region/element via POST /v1/ai/enhance. */
export async function fetchAiEnhance(
  imageDataUrl: string,
  mode: EnhanceMode,
  prompt: string
): Promise<{ svgCode: string; provider: string }> {
  const data = await apiFetch<BackendEnhanceResponse>('/v1/ai/enhance', {
    method: 'POST',
    body: JSON.stringify({
      image_b64: imageDataUrl,
      mode,
      prompt: prompt.trim(),
    }),
  });

  if (!data.b64) {
    throw new Error('AI returned no enhanced image');
  }

  return {
    svgCode: pngB64ToSvgWrapper(data.b64, data.content_type || 'image/png'),
    provider: data.provider,
  };
}

/** Refine — not wired to backend yet (uses legacy mock). */
export async function fetchAiRefineOptions(
  currentSvg: string,
  instruction: string,
  jewelry: JewelryItem
): Promise<AiOption[]> {
  try {
    const res = await fetch('/api/ai/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentSvg,
        instruction,
        jewelryType: jewelry.name,
      }),
    });

    const data = await res.json();
    return [
      {
        id: `refine-a-${Date.now()}`,
        title: 'Option A — Simplified',
        svgCode: data.optionA,
        styleTag: 'Refined Line',
      },
      {
        id: `refine-b-${Date.now()}`,
        title: 'Option B — Bolder Details',
        svgCode: data.optionB,
        styleTag: 'High Contrast',
      },
    ];
  } catch {
    return [
      {
        id: `refine-fallback-a-${Date.now()}`,
        title: 'Refined Option A',
        svgCode: currentSvg,
        styleTag: 'Refined',
      },
      {
        id: `refine-fallback-b-${Date.now()}`,
        title: 'Refined Option B',
        svgCode: currentSvg,
        styleTag: 'Alternative',
      },
    ];
  }
}
