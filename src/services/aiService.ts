import { AiOption, JewelryItem } from '../types';

export async function fetchAiEngravingOptions(
  prompt: string,
  jewelry: JewelryItem
): Promise<{ title: string; options: AiOption[] }> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        jewelryType: jewelry.name,
        safeArea: jewelry.engravingAreaLabel,
      }),
    });

    if (!res.ok) {
      throw new Error('AI Service temporary issue');
    }

    const data = await res.json();

    const options: AiOption[] = [
      {
        id: `opt-a-${Date.now()}`,
        title: 'Option A — Minimal Line Contour',
        svgCode: data.optionA,
        styleTag: 'Minimalist & Clean',
      },
      {
        id: `opt-b-${Date.now()}`,
        title: 'Option B — Expressive Crest',
        svgCode: data.optionB,
        styleTag: 'Bold Engraving',
      },
    ];

    return {
      title: data.title || prompt,
      options,
    };
  } catch (error) {
    console.warn('Using client-side fallback AI options', error);

    // Fallback if offline
    return {
      title: prompt,
      options: [
        {
          id: `opt-a-fallback-${Date.now()}`,
          title: 'Option A — Minimal Line-Art',
          styleTag: 'Minimalist',
          svgCode: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,15 L58,30 L75,25 L70,40 L85,50 L70,60 L75,75 L58,70 L50,85 L42,70 L25,75 L30,60 L15,50 L30,40 L25,25 L42,30 Z" fill="none" stroke="#111111" stroke-width="3.5" stroke-linejoin="round"/>
            <circle cx="38" cy="45" r="4" fill="#111111"/>
            <circle cx="62" cy="45" r="4" fill="#111111"/>
            <polygon points="50,52 44,60 56,60" fill="#111111"/>
            <path d="M44,68 C47,72 53,72 56,68" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round"/>
          </svg>`,
        },
        {
          id: `opt-b-fallback-${Date.now()}`,
          title: 'Option B — Medallion Silhouette',
          styleTag: 'Bold Contour',
          svgCode: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#111111" stroke-width="3"/>
            <path d="M50,22 C35,22 25,34 25,50 C25,66 38,78 50,78 C62,78 75,66 75,50 C75,34 65,22 50,22 Z" fill="none" stroke="#111111" stroke-width="3.5"/>
            <polygon points="50,52 42,62 58,62" fill="#111111"/>
          </svg>`,
        },
      ],
    };
  }
}

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
  } catch (e) {
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
