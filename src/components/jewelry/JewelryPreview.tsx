import React, { useState } from 'react';
import { JewelryItem, CanvasElement, visibleLayers } from '../../types';
import { generateCompositeSvg } from '../../utils/svgUtils';
import { Sparkles, ArrowLeft, Check, ZoomIn, RotateCw, ShieldCheck } from 'lucide-react';

interface JewelryPreviewProps {
  jewelry: JewelryItem;
  elements: CanvasElement[];
  onBackToEdit: () => void;
  onConfirmDesign: () => Promise<void>;
}

export const JewelryPreview: React.FC<JewelryPreviewProps> = ({
  jewelry,
  elements,
  onBackToEdit,
  onConfirmDesign,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [lightingAngle, setLightingAngle] = useState<number>(45);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const compositeSvg = generateCompositeSvg(elements, jewelry);
  const displayLayers = visibleLayers(elements);

  const getShapeClasses = () => {
    switch (jewelry.constraints.shape) {
      case 'circle':
        return {
          outer: 'w-64 h-64 sm:w-72 sm:h-72 rounded-full p-6 sm:p-8',
          inner: 'rounded-full p-4',
          lighting: 'rounded-full',
        };
      case 'squircle':
        return {
          outer: 'w-64 h-64 sm:w-72 sm:h-72 rounded-[28%] p-6 sm:p-8',
          inner: 'rounded-[22%] p-4',
          lighting: 'rounded-[22%]',
        };
      case 'bar':
        return {
          outer: 'w-32 h-72 sm:w-36 sm:h-80 rounded-2xl p-4 sm:p-5',
          inner: 'rounded-xl p-3',
          lighting: 'rounded-xl',
        };
      case 'rectangle':
      default:
        return {
          outer: 'w-64 h-64 sm:w-72 sm:h-72 rounded-2xl p-6 sm:p-8',
          inner: 'rounded-xl p-4',
          lighting: 'rounded-xl',
        };
    }
  };

  const getBailGradient = () => {
    switch (jewelry.material) {
      case '18k_gold':
        return 'from-amber-200 via-amber-300 to-amber-500 border-amber-400';
      case 'rose_gold':
        return 'from-rose-200 via-rose-300 to-rose-400 border-rose-300';
      case 'silver':
      default:
        return 'from-slate-200 via-slate-300 to-slate-400 border-slate-300';
    }
  };

  const shapeStyle = getShapeClasses();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D5] pb-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs text-[#C5A059] font-bold uppercase tracking-[0.2em] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D5] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Laser Preview</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121214]">Your design. Made real.</h1>
          <p className="text-[#6E6A63] text-xs sm:text-sm mt-1">
            Realistic physical laser engraving simulation on solid {jewelry.name}.
          </p>
        </div>

        <button
          onClick={onBackToEdit}
          className="px-5 py-2.5 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] text-xs font-semibold flex items-center space-x-2 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
          <span>Edit Design</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Realistic Jewelry 3D Simulation Viewer (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E8E2D5] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col items-center space-y-6">
          
          {/* Controls Bar */}
          <div className="w-full flex items-center justify-between text-xs text-[#6E6A63] border-b border-[#E8E2D5] pb-3.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
              <span className="font-medium text-[11px] uppercase tracking-wider text-[#121214]">Metal & Engraving Simulation</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : 1)}
                className="p-1.5 px-3 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#121214] hover:border-[#C5A059] flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{zoomLevel === 1 ? 'Zoom Detail' : 'Reset Zoom'}</span>
              </button>

              <button
                onClick={() => setLightingAngle((prev) => (prev + 45) % 360)}
                className="p-1.5 px-3 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#121214] hover:border-[#C5A059] flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Rotate Light</span>
              </button>
            </div>
          </div>

          {/* Jewelry Display Frame */}
          <div className="relative w-full max-w-md min-h-[360px] flex flex-col items-center justify-center p-6 overflow-hidden">
            
            {/* Pendant Chain Loop / Bail */}
            <div className={`w-5 h-7 -mb-1 rounded-t-full border-2 bg-gradient-to-b ${getBailGradient()} z-10 shadow-xs flex-shrink-0`} />

            {/* Outer Metallic Bezel — real product photo as the physical jewelry base */}
            <div
              className={`relative ${shapeStyle.outer} shadow-md transition-transform duration-500 flex items-center justify-center border-4 border-white/60 flex-shrink-0 bg-cover bg-center`}
              style={{
                transform: `scale(${zoomLevel})`,
                boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.15), inset 0 2px 10px rgba(255, 255, 255, 0.8)`,
                backgroundImage: `url(${jewelry.imageUrl})`,
              }}
            >
              {/* Inner High Polish Engraving Canvas over the photo */}
              <div className={`relative w-full h-full ${shapeStyle.inner} flex items-center justify-center border border-white/40 overflow-hidden`}>

                {/* Physical Laser Engraved Composite SVG Overlay */}
                <div
                  className="w-full h-full transition-all duration-300"
                  style={{
                    filter: `drop-shadow(1px 1px 1px rgba(0,0,0,0.4)) drop-shadow(-0.5px -0.5px 0.5px rgba(255,255,255,0.6))`,
                    mixBlendMode: 'multiply',
                  }}
                  dangerouslySetInnerHTML={{ __html: compositeSvg }}
                />

                {/* Metallic Specular Lighting Reflection */}
                <div
                  className={`absolute inset-0 ${shapeStyle.lighting} pointer-events-none opacity-40`}
                  style={{
                    background: `linear-gradient(${lightingAngle}deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.2) 100%)`,
                  }}
                />
              </div>
            </div>

          </div>

          <div className="text-center text-xs text-[#8A857C] max-w-sm font-medium">
            Realistic simulation showing oxidized laser contrast and micro-beveling depth on physical {jewelry.material.replace('_', ' ')}.
          </div>
        </div>

        {/* Order Details & Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E8E2D5] rounded-3xl p-6 sm:p-8 space-y-6 text-[#121214] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          
          <div>
            <span className="text-xs font-mono text-[#C5A059] uppercase tracking-widest font-bold">{jewelry.sku}</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121214] mt-0.5">{jewelry.name}</h2>
            <p className="text-[#6E6A63] text-xs mt-1">{jewelry.description}</p>
          </div>


          {/* Pricing Breakdown */}
          <div className="space-y-2.5 border-t border-[#E8E2D5] pt-4 text-xs">
            <div className="flex justify-between text-[#6E6A63]">
              <span>Base Jewelry Item</span>
              <span className="font-mono text-[#121214] font-semibold">₹{jewelry.priceInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#6E6A63]">
              <span>GIVA Live-Engrave Customization Fee</span>
              <span className="font-mono text-[#121214] font-semibold">₹{jewelry.engravingFeeInr}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-[#121214] pt-3.5 border-t border-[#E8E2D5]">
              <span className="font-serif text-lg">Total Price</span>
              <span className="font-mono text-[#121214] font-extrabold text-xl">
                ₹{(jewelry.priceInr + jewelry.engravingFeeInr).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Confirm CTA */}
          {confirmError && (
            <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {confirmError}
            </p>
          )}
          <button
            onClick={async () => {
              setIsConfirming(true);
              setConfirmError(null);
              try {
                await onConfirmDesign();
              } catch (e) {
                setConfirmError(e instanceof Error ? e.message : 'Failed to submit order');
              } finally {
                setIsConfirming(false);
              }
            }}
            disabled={isConfirming}
            className="w-full py-4 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] transition-all font-bold uppercase tracking-[0.2em] text-xs shadow-md flex items-center justify-center space-x-2 border border-[#121214] disabled:opacity-50"
          >
            <Check className="w-5 h-5 text-[#C5A059] group-hover:text-white" />
            <span>{isConfirming ? 'Submitting order...' : 'Confirm & Submit Order'}</span>
          </button>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-[#6E6A63]">
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span>Guaranteed GIVA Laser Engraving Precision Certificate</span>
          </div>

        </div>

      </div>

    </div>
  );
};

