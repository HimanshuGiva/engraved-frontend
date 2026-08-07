import React, { useEffect, useState } from 'react';
import { Sparkles, Wand2, ArrowRight, RefreshCw } from 'lucide-react';
import { CanvasElement } from '../types';
import { fetchAiEnhance, EnhanceMode } from '../services/aiService';
import {
  captureElementAsPngDataUrl,
  defaultEnhanceMode,
} from '../utils/canvasCapture';

interface AiEnhanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: CanvasElement;
  eraserLayers: CanvasElement[];
  onApply: (svgCode: string) => void;
}

export const AiEnhanceModal: React.FC<AiEnhanceModalProps> = ({
  isOpen,
  onClose,
  element,
  eraserLayers,
  onApply,
}) => {
  const [mode, setMode] = useState<EnhanceMode>(() => defaultEnhanceMode(element));
  const [prompt, setPrompt] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [resultSvg, setResultSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMode(defaultEnhanceMode(element));
    setPrompt('');
    setResultSvg(null);
    setErrorMessage(null);

    let cancelled = false;
    captureElementAsPngDataUrl(element, eraserLayers)
      .then((url) => {
        if (!cancelled) setPreviewDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage('Could not capture element preview');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, element, eraserLayers]);

  if (!isOpen) return null;

  const handleEnhance = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setResultSvg(null);

    try {
      const imageDataUrl = previewDataUrl ?? (await captureElementAsPngDataUrl(element, eraserLayers));
      const result = await fetchAiEnhance(imageDataUrl, mode, prompt);
      setResultSvg(result.svgCode);
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
              <span>AI Enhance</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#121214]">
              Polish for engraving
            </h2>
            <p className="text-[#6E6A63] text-xs mt-1">
              Cleans noise and sharpens line art on <strong className="text-[#121214]">{element.name}</strong> for laser engraving.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] hover:border-[#121214] text-[#121214] flex items-center justify-center transition-colors font-mono"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">Before</span>
            <div className="h-36 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] flex items-center justify-center overflow-hidden">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">Enhanced</span>
            <div className="h-36 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] flex items-center justify-center overflow-hidden">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              ) : resultSvg ? (
                <div
                  className="w-full h-full p-3 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
                  dangerouslySetInnerHTML={{ __html: resultSvg }}
                />
              ) : (
                <span className="text-[10px] text-[#8A857C] text-center px-2">Run enhance to preview</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">Enhance mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('ai_generated')}
                className={`py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  mode === 'ai_generated'
                    ? 'bg-[#121214] text-[#C5A059] border-[#121214]'
                    : 'bg-white text-[#6E6A63] border-[#E8E2D5] hover:border-[#C5A059]'
                }`}
              >
                AI / Vector
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  mode === 'manual'
                    ? 'bg-[#121214] text-[#C5A059] border-[#121214]'
                    : 'bg-white text-[#6E6A63] border-[#E8E2D5] hover:border-[#C5A059]'
                }`}
              >
                Hand-drawn
              </button>
            </div>
            <p className="text-[10px] text-[#8A857C] leading-relaxed">
              {mode === 'manual'
                ? 'Keeps sketch character — cleans noise and thickens hairlines.'
                : 'Stylizes into clean, icon-like engraving line art.'}
            </p>
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
              placeholder="e.g., Thicker lines, simplify details..."
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
              disabled={isLoading || !previewDataUrl}
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
                disabled={isLoading}
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
