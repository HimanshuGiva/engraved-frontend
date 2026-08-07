import React from 'react';
import { AlertTriangle, Sparkles, Check, RotateCcw } from 'lucide-react';
import { ValidationIssue } from '../types';

interface ValidationBannerProps {
  issues: ValidationIssue[];
  onAutoFix: () => void;
  fixedMessage?: string | null;
  onUndoFix?: () => void;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  issues,
  onAutoFix,
  fixedMessage,
  onUndoFix,
}) => {
  if (fixedMessage) {
    return (
      <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-4 text-[#121214] shadow-2xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center space-x-2.5 text-xs">
          <div className="w-6 h-6 rounded-full bg-[#121214] text-[#C5A059] flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <p className="font-semibold text-xs text-[#121214]">{fixedMessage}</p>
        </div>

        {onUndoFix && (
          <button
            onClick={onUndoFix}
            className="px-3.5 py-1 rounded-full bg-white border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Fix</span>
          </button>
        )}
      </div>
    );
  }

  if (issues.length === 0) return null;

  const primaryIssue = issues[0];

  return (
    <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-4 text-[#121214] shadow-2xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center space-x-3 max-w-xl">
        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E2D5] flex items-center justify-center text-[#C5A059] flex-shrink-0 shadow-2xs">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-serif font-bold text-[#121214]">{primaryIssue.title}</div>
          <p className="text-[#6E6A63] leading-normal">{primaryIssue.message}</p>
        </div>
      </div>

      {primaryIssue.canAutoFix && (
        <button
          onClick={onAutoFix}
          className="px-4 py-2 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center space-x-1.5 shadow-2xs transition-colors border border-[#121214]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Fix automatically</span>
        </button>
      )}
    </div>
  );
};

