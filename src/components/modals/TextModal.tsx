import React, { useState, useEffect } from 'react';
import { Type, Check, Sparkles } from 'lucide-react';
import { FONT_OPTIONS, TEXT_SUGGESTIONS } from '../../constants/fonts';

interface TextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddText: (text: string, fontFamily: string) => void;
}

export const TextModal: React.FC<TextModalProps> = ({ isOpen, onClose, onAddText }) => {
  const [textInput, setTextInput] = useState('Forever');
  const [selectedFont, setSelectedFont] = useState('serif');

  useEffect(() => {
    if (isOpen) {
      setTextInput('Forever');
      setSelectedFont('serif');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onAddText(textInput.trim(), selectedFont);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl max-w-md w-full p-6 text-[#121214] shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#C5A059] flex items-center justify-center font-bold">
              <Type className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#121214]">Add Engraving Text</h2>
              <p className="text-[#6E6A63] text-xs">Laser engrave custom names, initials, or dates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] flex items-center justify-center font-mono transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C]">
              Your Text / Monogram
            </label>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Always & Forever"
              maxLength={30}
              className="w-full bg-[#FAF8F5] border border-[#E8E2D5] focus:border-[#C5A059] focus:outline-none rounded-xl px-4 py-3 text-sm text-[#121214] font-medium"
              autoFocus
            />
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C] flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#C5A059]" />
              <span>Popular Ideas</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTextInput(sug)}
                  className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#FBF8F1] border border-[#E8E2D5] hover:border-[#C5A059] rounded-full text-[11px] text-[#121214] font-medium transition-all"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Font Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C]">
              Font Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((f) => {
                const isSel = selectedFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFont(f.id)}
                    className={`p-3 rounded-xl border text-xs text-left transition-all ${
                      isSel
                        ? 'bg-[#121214] text-[#C5A059] border-[#121214] font-bold shadow-2xs'
                        : 'bg-[#FAF8F5] text-[#121214] border-[#E8E2D5] hover:border-[#C5A059]'
                    }`}
                  >
                    <span className={`block text-xs ${f.fontClass}`}>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Tile */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C]">
              Engraving Preview
            </label>
            <div className="w-full h-20 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl flex items-center justify-center p-3 text-center">
              <span className={`text-xl font-bold text-[#121214] ${FONT_OPTIONS.find(f => f.id === selectedFont)?.fontClass}`}>
                {textInput || 'Your Text Here'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full border border-[#E8E2D5] text-[#121214] font-bold text-xs uppercase tracking-wider hover:bg-[#FAF8F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="flex-1 py-3 px-4 rounded-full bg-[#121214] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#C5A059] transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-[#C5A059]" />
              <span>Add to Canvas</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
