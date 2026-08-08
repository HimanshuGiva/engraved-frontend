import { AiOption, JewelryItem } from '../types';
import { rasterizeSvgMarkupToPng } from '../utils/canvasCapture';
import { svgToDataUrl } from '../utils/svg/dataUrl';
import { apiFetch } from './apiClient';

interface BackendGenerateImage {
  svg: string;
}

interface BackendGenerateResponse {
  images: BackendGenerateImage[];
  provider: string;
}

const STYLE_TAGS = ['Minimalist & Clean', 'Bold Engraving', 'Detailed Contour', 'Line Art'];

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

  const options: AiOption[] = data.images.slice(0, 2).map((img, idx) => {
    if (!img.svg) {
      throw new Error('AI returned no vector SVG');
    }
    return {
      id: `opt-${idx}-${Date.now()}`,
      title: idx === 0 ? 'Option A' : 'Option B',
      svgCode: img.svg,
      previewUrl: svgToDataUrl(img.svg),
      styleTag: STYLE_TAGS[idx] ?? 'AI Generated',
    };
  });

  return { title: prompt, options };
}

export type EnhanceMode = 'ai_generated' | 'manual';

interface BackendEnhanceResponse {
  svg: string;
  provider: string;
}

/** Send a raster snapshot to the backend; AI enhance + vectorization happen server-side only. */
export async function fetchAiEnhance(
  imageDataUrl: string,
  mode: EnhanceMode,
  prompt: string
): Promise<{ svgCode: string; previewUrl: string; provider: string }> {
  const data = await apiFetch<BackendEnhanceResponse>('/v1/ai/enhance', {
    method: 'POST',
    body: JSON.stringify({
      image_b64: imageDataUrl,
      mode,
      prompt: prompt.trim(),
    }),
  });

  if (!data.svg) {
    throw new Error('AI returned no enhanced vector');
  }

  return {
    svgCode: data.svg,
    previewUrl: svgToDataUrl(data.svg),
    provider: data.provider,
  };
}

/** Refine existing canvas SVG via one enhance pass (single server-side vectorization). */
export async function fetchAiRefineOptions(
  currentSvg: string,
  instruction: string,
  _jewelry: JewelryItem
): Promise<AiOption[]> {
  const pngDataUrl = await rasterizeSvgMarkupToPng(currentSvg);
  const hint = instruction.trim() || 'Refine for laser engraving';
  const result = await fetchAiEnhance(pngDataUrl, 'ai_generated', hint);

  return [
    {
      id: `refine-${Date.now()}`,
      title: 'Refined design',
      svgCode: result.svgCode,
      previewUrl: result.previewUrl,
      styleTag: 'Refined',
    },
  ];
}
