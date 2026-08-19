import React, { useState } from 'react';
import { Sparkles, Mic, MicOff, RefreshCw, ArrowRight } from 'lucide-react';
import { AiOption, JewelryItem } from '../../types';
import { fetchAiEngravingOptions, fetchAiRefineOptions } from '../../services/aiService';
import { extractRootSvg } from '../../utils/svgUtils';

interface AiCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  jewelry: JewelryItem;
  onSelectOption: (option: AiOption) => void;
  initialPrompt?: string;
  refiningSvg?: string;
}

export const AiCreateModal: React.FC<AiCreateModalProps> = ({
  isOpen,
  onClose,
  jewelry,
  onSelectOption,
  initialPrompt = '',
  refiningSvg,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<AiOption[]>([]);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset inspiration prompts
  const presets = [
    'Minimalist lion face with crown',
    'Intertwined infinity hearts',
    'Crescent moon with star cluster',
    'Zodiac Leo constellation',
    'Graceful rose & butterfly',
    'Monogram crest with laurel',
  ];

  // Speech Recognition handler
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in this browser tab. Please type your prompt.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      setIsRecording(true);

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setPrompt(transcript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleGenerate = async (queryText?: string) => {
    const textToUse = queryText || prompt;
    if (!textToUse.trim()) return;

    setIsLoading(true);
    setOptions([]);
    setErrorMessage(null);

    try {
      if (refiningSvg) {
        const refined = await fetchAiRefineOptions(refiningSvg, textToUse, jewelry);
        setOptions(refined);
        setActiveTabTitle(`Refined: "${textToUse}"`);
      } else {
        const result = await fetchAiEngravingOptions(textToUse, jewelry);
        setOptions(result.options);
        setActiveTabTitle(result.title);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E8E2D5] text-[#121214] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#E8E2D5] pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs text-[#C5A059] font-bold uppercase tracking-[0.2em] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D5] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{refiningSvg ? 'Refine Selected Element' : 'Engraving AI Studio'}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121214]">
              {refiningSvg ? 'How would you like to refine this artwork?' : 'What do you want to create?'}
            </h2>
            <p className="text-[#6E6A63] text-xs mt-1">
              {refiningSvg
                ? 'The server enhances your selection and returns one engraving-ready vector.'
                : 'AI generates two distinct vector options optimized for physical laser engraving.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] hover:border-[#121214] text-[#121214] flex items-center justify-center transition-colors font-mono"
          >
            ✕
          </button>
        </div>

        {/* Input & Voice Controls */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder={refiningSvg ? 'e.g., Make it more minimal, make lines thicker...' : 'e.g., A minimal lion face with a small crown...'}
              className="w-full bg-[#FAF8F5] border border-[#E8E2D5] focus:border-[#C5A059] rounded-2xl py-3.5 pl-4 pr-32 text-sm text-[#121214] placeholder-[#A39E93] focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all"
            />

            <div className="absolute right-2 top-2 flex items-center space-x-1.5">
              {/* Voice Button */}
              <button
                onClick={handleVoiceInput}
                className={`p-2 rounded-xl text-xs transition-colors ${
                  isRecording ? 'bg-[#121214] text-[#C5A059] animate-pulse' : 'bg-white border border-[#E8E2D5] text-[#121214] hover:bg-[#FAF8F5]'
                }`}
                title="Voice input"
              >
                {isRecording ? <MicOff className="w-4 h-4 text-[#C5A059]" /> : <Mic className="w-4 h-4 text-[#C5A059]" />}
              </button>

              {/* Generate Button */}
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading || !prompt.trim()}
                className="px-3.5 py-2 bg-[#121214] text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-[#C5A059] hover:text-white disabled:opacity-40 transition-colors flex items-center space-x-1"
              >
                <span>Generate</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          {!refiningSvg && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[#8A857C] text-[10px] whitespace-nowrap font-bold uppercase tracking-widest">Try:</span>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p);
                    handleGenerate(p);
                  }}
                  className="px-3 py-1 bg-[#FAF8F5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] border border-[#E8E2D5] rounded-full whitespace-nowrap transition-colors text-[11px] font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Output Area — EXACTLY TWO OPTIONS */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#6E6A63]">
            <div className="w-10 h-10 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-[#C5A059] font-bold tracking-wider">
              {refiningSvg
                ? `Refining artwork for ${jewelry.name}...`
                : `Crafting 2 vector engraving options for ${jewelry.name}...`}
            </p>
          </div>
        ) : options.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-[#121214]">
                  Which design resonates best?
                </h3>
                {activeTabTitle && (
                  <p className="text-[11px] text-[#8A857C] mt-0.5">{activeTabTitle}</p>
                )}
              </div>
              <button
                onClick={() => handleGenerate()}
                className="text-xs text-[#C5A059] font-bold uppercase tracking-widest hover:underline flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{refiningSvg ? 'Try again' : 'Try 2 more'}</span>
              </button>
            </div>

            {/* Exactly 2 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.slice(0, 2).map((opt, idx) => (
                <div
                  key={opt.id}
                  className="bg-[#FAF8F5] border border-[#E8E2D5] hover:border-[#C5A059] rounded-2xl p-4 flex flex-col justify-between space-y-4 group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-serif font-bold text-[#121214]">
                        {idx === 0 ? 'Option A' : 'Option B'}
                      </span>
                      <span className="text-[10px] bg-white border border-[#E8E2D5] text-[#8A857C] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                        {opt.styleTag}
                      </span>
                    </div>

                    <div className="w-full h-44 bg-white rounded-xl p-4 flex items-center justify-center border border-[#E8E2D5] overflow-hidden group-hover:scale-102 transition-transform">
                      {opt.svgCode ? (
                        <div
                          className="w-full h-full text-[#121214] [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                          dangerouslySetInnerHTML={{ __html: extractRootSvg(opt.svgCode) }}
                        />
                      ) : (
                        <img
                          src={opt.previewUrl}
                          alt={opt.title}
                          className="max-w-full max-h-full w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectOption(opt);
                      onClose();
                    }}
                    className="w-full py-3 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <span>Use {idx === 0 ? 'Option A' : 'Option B'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C5A059] group-hover:text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D5] p-6 text-center text-xs text-[#6E6A63] space-y-2">
            {errorMessage ? (
              <p className="text-red-600 font-medium">{errorMessage}</p>
            ) : (
              <>
                <p>Type your idea above (or tap microphone) and click <strong>Generate</strong>.</p>
                <p className="text-[#8A857C]">You can scale, rotate, draw, and add handwriting after placing on canvas.</p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

