import React from 'react';
import { Store, QrCode } from 'lucide-react';
import { JewelryItem } from '../types';

interface NavbarProps {
  currentStep: 'select' | 'studio' | 'preview' | 'confirm';
  selectedJewelry: JewelryItem | null;
  onStepChange: (step: 'select' | 'studio' | 'preview' | 'confirm') => void;
  onOpenAssociateMode: () => void;
  designId?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  selectedJewelry,
  onStepChange,
  onOpenAssociateMode,
  designId,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md text-[#121214] border-b border-[#E8E2D5] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Atelier Title */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onStepChange('select')}>
          <div className="w-8 h-8 bg-[#121214] border border-[#C5A059]/40 flex items-center justify-center rounded-lg shadow-2xs group-hover:border-[#C5A059] transition-colors">
            <span className="text-[#C5A059] font-serif font-bold text-lg">G</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-serif tracking-[0.25em] text-base font-semibold uppercase text-[#121214]">GIVA</span>
            <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-[#F7F4EE] text-[#C5A059] border border-[#E8E2D5]">
              Atelier
            </span>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-xs font-medium">
          <button
            onClick={() => onStepChange('select')}
            className={`flex items-center space-x-2 transition-all ${
              currentStep === 'select'
                ? 'opacity-100 font-bold text-[#121214]'
                : 'opacity-50 hover:opacity-100 text-[#6E6A63]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              currentStep === 'select' ? 'bg-[#C5A059] text-white shadow-2xs' : 'border border-[#C5A059]/50 text-[#6E6A63]'
            }`}>1</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold">Jewelry</span>
          </button>

          <span className="w-4 h-px bg-[#E8E2D5]" />

          <button
            onClick={() => selectedJewelry && onStepChange('studio')}
            disabled={!selectedJewelry}
            className={`flex items-center space-x-2 transition-all ${
              currentStep === 'studio'
                ? 'opacity-100 font-bold text-[#121214]'
                : selectedJewelry
                ? 'opacity-50 hover:opacity-100 text-[#6E6A63]'
                : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              currentStep === 'studio' ? 'bg-[#C5A059] text-white shadow-2xs' : 'border border-[#C5A059]/50 text-[#6E6A63]'
            }`}>2</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold">Studio</span>
          </button>

          <span className="w-4 h-px bg-[#E8E2D5]" />

          <button
            onClick={() => selectedJewelry && onStepChange('preview')}
            disabled={!selectedJewelry}
            className={`flex items-center space-x-2 transition-all ${
              currentStep === 'preview'
                ? 'opacity-100 font-bold text-[#121214]'
                : selectedJewelry
                ? 'opacity-50 hover:opacity-100 text-[#6E6A63]'
                : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              currentStep === 'preview' ? 'bg-[#C5A059] text-white shadow-2xs' : 'border border-[#C5A059]/50 text-[#6E6A63]'
            }`}>3</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold">Preview</span>
          </button>

          <span className="w-4 h-px bg-[#E8E2D5]" />

          <button
            onClick={() => designId && onStepChange('confirm')}
            disabled={!designId}
            className={`flex items-center space-x-2 transition-all ${
              currentStep === 'confirm'
                ? 'opacity-100 font-bold text-[#121214]'
                : designId
                ? 'opacity-50 hover:opacity-100 text-[#6E6A63]'
                : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              currentStep === 'confirm' ? 'bg-[#C5A059] text-white shadow-2xs' : 'border border-[#C5A059]/50 text-[#6E6A63]'
            }`}>4</span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold">Confirm</span>
          </button>
        </nav>

        {/* Store Location & Associate Mode Button */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 text-xs font-medium uppercase tracking-wider bg-white px-3.5 py-1.5 rounded-full border border-[#E8E2D5] shadow-2xs">
            <Store className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="text-[#121214]">Indiranagar Atelier</span>
          </div>

          <button
            onClick={onOpenAssociateMode}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#121214] text-white hover:bg-[#C5A059] transition-all border border-[#121214] shadow-2xs"
            title="GIVA Store Associate Handoff Mode"
          >
            <QrCode className="w-3.5 h-3.5 text-[#C5A059] group-hover:text-white" />
            <span className="hidden sm:inline">Store Staff</span>
          </button>
        </div>

      </div>
    </header>
  );
};

