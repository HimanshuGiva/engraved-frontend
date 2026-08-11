import { CanvasElement } from '../types';

export type EnhanceOption = 'photo_lineart' | 'stylize';

export interface EnhanceOptionDef {
  id: EnhanceOption;
  label: string;
  description: string;
}

export const ENHANCE_OPTIONS: EnhanceOptionDef[] = [
  {
    id: 'photo_lineart',
    label: 'Photo to line art',
    description: 'Converts photos into engraving-ready lines',
  },
  {
    id: 'stylize',
    label: 'Clean & stylize',
    description: 'AI cleanup into bold icon-like line art',
  },
];

export function defaultEnhanceOptions(el?: CanvasElement): EnhanceOption[] {
  if (!el) {
    return ['stylize'];
  }
  switch (el.type) {
    case 'uploaded_image':
      return ['photo_lineart'];
    default:
      return ['stylize'];
  }
}

export function toggleEnhanceOption(
  selected: EnhanceOption[],
  option: EnhanceOption
): EnhanceOption[] {
  if (selected.includes(option)) {
    return selected.filter((o) => o !== option);
  }
  return [...selected, option];
}
