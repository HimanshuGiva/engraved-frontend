import React, { useEffect, useState } from 'react';
import { Sparkles, Wand2, ArrowRight, RefreshCw, Check } from 'lucide-react';
import { CanvasElement, CanvasRegion } from '../../types';
import { fetchAiEnhance } from '../../services/aiService';
import {
  ENHANCE_OPTIONS,
  EnhanceOption,
  defaultEnhanceOptions,
  toggleEnhanceOption,
} from '../../constants/enhanceOptions';
import { canvasBoxPixelAspect } from '../../constants/engravingSurface';
import {
  captureElementAsPngDataUrl,
  captureRegionAsPngDataUrl,
} from '../../utils/canvasCapture';

interface AiEnhanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  element?: CanvasElement;
  eraserLayers?: CanvasElement[];
  region?: CanvasRegion;
  canvasElements?: CanvasElement[];
  surfaceAspect?: number;
  onApply: (svgCode: string) => void;
}

export const AiEnhanceModal: React.FC<AiEnhanceModalProps> = ({
  isOpen,
  onClose,
  label,
  element,
  eraserLayers = [],
  region,
  canvasElements = [],
  surfaceAspect = 1,
  onApply,
}) => {
  const isRegionMode = Boolean(region);
  const [selectedOptions, setSelectedOptions] = useState<EnhanceOption[]>(['stylize']);
  const [prompt, setPrompt] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [resultSvg, setResultSvg] = useState<string | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedOptions(defaultEnhanceOptions(element));
    setPrompt('');
    setResultSvg(null);
    setResultPreviewUrl(null);
    setErrorMessage(null);
    setPreviewDataUrl(null);

    let cancelled = false;

    const capturePreview = async () => {
      try {
        if (isRegionMode && region) {
          const url = await captureRegionAsPngDataUrl(canvasElements, region, surfaceAspect);
          if (!cancelled) setPreviewDataUrl(url);
        } else if (element) {
          const url = await captureElementAsPngDataUrl(element, eraserLayers);
          if (!cancelled) setPreviewDataUrl(url);
        }
      } catch {
        if (!cancelled) setErrorMessage('Could not capture preview');
      }
    };

    capturePreview();

    return () => {
      cancelled = true;
    };
  }, [isOpen, element, eraserLayers, region, canvasElements, surfaceAspect, isRegionMode]);

  const previewAspect =
    isRegionMode && region
      ? canvasBoxPixelAspect(region.width, region.height, surfaceAspect)
      : element
        ? canvasBoxPixelAspect(element.width, element.height, surfaceAspect)
        : 1;
  const previewFrameStyle: React.CSSProperties = {
    aspectRatio: `${previewAspect}`,
    width: `min(100%, calc(11rem * ${previewAspect}))`,
    maxHeight: '11rem',
  };

  if (!isOpen) return null;

  const captureForEnhance = async (): Promise<string> => {
    if (isRegionMode && region) {
      return captureRegionAsPngDataUrl(canvasElements, region, surfaceAspect);
    }
    if (element) {
      return captureElementAsPngDataUrl(element, eraserLayers);
    }
    throw new Error('Nothing to enhance');
  };

  const handleEnhance = async () => {
    if (selectedOptions.length === 0) {
      setErrorMessage('Select at least one option');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResultSvg(null);
    setResultPreviewUrl(null);

    try {
      const imageDataUrl = previewDataUrl ?? (await captureForEnhance());
      const result = await fetchAiEnhance(imageDataUrl, selectedOptions, prompt);
      setResultSvg(result.svgCode);
      setResultPreviewUrl(result.previewUrl);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Enhancement failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E8E2D5] text-[#121214] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        <div className="flex items-start justify-between border-b border-[#E8E2D5] pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs text-[#C5A059] font-bold uppercase tracking-[0.2em] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D5] mb-2">
              <Wand2 className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Enhance</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#121214]">
              {label}
            </h2>
            <p className="text-[#6E6A63] text-xs mt-1">
              Choose an AI style to improve{' '}
              <strong className="text-[#121214]">{label}</strong> for laser engraving.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] hover:border-[#121214] text-[#121214] flex items-center justify-center transition-colors font-mono"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="space-y-1.5 min-w-0 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C] self-start">Before</span>
            <div
              className="bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] flex items-center justify-center overflow-hidden p-1.5"
              style={previewFrameStyle}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Original"
                  className="w-full h-full min-w-0 min-h-0 object-contain"
                />
              ) : errorMessage ? (
                <span className="text-[10px] text-rose-700 text-center px-2">{errorMessage}</span>
              ) : (
                <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C] self-start">Enhanced</span>
            <div
              className="bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] flex items-center justify-center overflow-hidden p-1.5"
              style={previewFrameStyle}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              ) : resultPreviewUrl ? (
                <img
                  src={resultPreviewUrl}
                  alt="Enhanced preview"
                  className="w-full h-full min-w-0 min-h-0 object-contain"
                />
              ) : (
                <span className="text-[10px] text-[#8A857C] text-center px-2">Run enhance to preview</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">
              AI style <span className="font-normal normal-case tracking-normal">(select one or both)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENHANCE_OPTIONS.map((opt) => {
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptions(toggleEnhanceOption(selectedOptions, opt.id))}
                    className={`py-2.5 px-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#121214] text-white border-[#121214]'
                        : 'bg-white text-[#6E6A63] border-[#E8E2D5] hover:border-[#C5A059]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedOptions.length > 0 && (
              <p className="text-[10px] text-[#8A857C] leading-relaxed">
                {ENHANCE_OPTIONS.filter((o) => selectedOptions.includes(o.id))
                  .map((o) => o.description)
                  .join(' · ')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">
              Optional hint
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleEnhance()}
              placeholder="e.g., bolder outer lines..."
              className="w-full bg-[#FAF8F5] border border-[#E8E2D5] focus:border-[#C5A059] rounded-xl py-3 px-4 text-sm text-[#121214] placeholder-[#A39E93] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {!resultSvg ? (
            <button
              onClick={handleEnhance}
              disabled={isLoading || !previewDataUrl || selectedOptions.length === 0}
              className="flex-1 py-3.5 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 disabled:opacity-40 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enhancing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Enhance</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleEnhance}
                disabled={isLoading || selectedOptions.length === 0}
                className="py-3.5 px-4 rounded-full bg-[#FAF8F5] text-[#121214] border border-[#E8E2D5] hover:border-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Retry</span>
              </button>
              <button
                onClick={() => {
                  onApply(resultSvg);
                  onClose();
                }}
                className="flex-1 py-3.5 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Apply to canvas</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
