import React, { useState } from 'react';
import { JewelryItem, CanvasElement } from '../../types';
import { generatePreviewCompositeSvg } from '../../utils/svgUtils';
import { ENGRAVING_SURFACE_RADIUS, getEngravingSurfaceAspect } from '../../constants/engravingSurface';

import { Sparkles, ArrowLeft, Check, ZoomIn, ShieldCheck } from 'lucide-react';

interface JewelryPreviewProps {
  jewelry: JewelryItem;
  elements: CanvasElement[];
  onBackToEdit: () => void;
  onConfirmDesign: () => Promise<void>;
}

function getMaterialLayers(material: JewelryItem['material']) {
  switch (material) {
    case '18k_gold':
      return {
        base: 'radial-gradient(ellipse 110% 90% at 50% 58%, #e8c56a 0%, #c9973a 55%, #9a7028 100%)',
        highlight:
          'radial-gradient(ellipse 70% 45% at 50% 18%, rgba(255, 248, 220, 0.85) 0%, rgba(255, 248, 220, 0) 72%)',
        rim: 'rgba(154, 112, 40, 0.35)',
      };
    case 'rose_gold':
      return {
        base: 'radial-gradient(ellipse 110% 90% at 50% 58%, #e8b0a0 0%, #c98575 55%, #a06858 100%)',
        highlight:
          'radial-gradient(ellipse 70% 45% at 50% 18%, rgba(255, 230, 222, 0.8) 0%, rgba(255, 230, 222, 0) 72%)',
        rim: 'rgba(160, 104, 88, 0.32)',
      };
    case 'platinum':
      return {
        base: 'radial-gradient(ellipse 110% 90% at 50% 58%, #eceef1 0%, #b8bec6 55%, #8a929c 100%)',
        highlight:
          'radial-gradient(ellipse 70% 45% at 50% 18%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 72%)',
        rim: 'rgba(100, 108, 118, 0.28)',
      };
    case 'silver':
    default:
      return {
        base: 'radial-gradient(ellipse 110% 90% at 50% 58%, #eef2f5 0%, #b8c2cc 55%, #8a98a6 100%)',
        highlight:
          'radial-gradient(ellipse 70% 45% at 50% 18%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 72%)',
        rim: 'rgba(90, 104, 118, 0.3)',
      };
  }
}

function getBailStyle(material: JewelryItem['material']) {
  switch (material) {
    case '18k_gold':
      return {
        background: 'linear-gradient(180deg, #f0d080 0%, #b8892e 100%)',
        borderColor: '#a67828',
      };
    case 'rose_gold':
      return {
        background: 'linear-gradient(180deg, #edb5a5 0%, #b87362 100%)',
        borderColor: '#a06858',
      };
    case 'platinum':
      return {
        background: 'linear-gradient(180deg, #e8eaee 0%, #9aa3ad 100%)',
        borderColor: '#8a929c',
      };
    case 'silver':
    default:
      return {
        background: 'linear-gradient(180deg, #e8edf1 0%, #9aaab8 100%)',
        borderColor: '#8a98a6',
      };
  }
}

export const JewelryPreview: React.FC<JewelryPreviewProps> = ({
  jewelry,
  elements,
  onBackToEdit,
  onConfirmDesign,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const previewSvg = generatePreviewCompositeSvg(elements, jewelry);
  const shape = jewelry.constraints.shape;
  const shapeRadius = ENGRAVING_SURFACE_RADIUS[shape];
  const surfaceAspect = getEngravingSurfaceAspect(shape);
  const material = getMaterialLayers(jewelry.material);
  const bail = getBailStyle(jewelry.material);

  const pendantShadow = `
    0 28px 56px -16px rgba(0, 0, 0, 0.28),
    0 8px 20px -8px rgba(0, 0, 0, 0.18),
    inset 0 1px 1px rgba(255, 255, 255, 0.55),
    inset 0 -3px 10px rgba(0, 0, 0, 0.14)
  `;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
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
        <div className="lg:col-span-7 bg-white border border-[#E8E2D5] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col items-center space-y-6">
          <div className="w-full flex items-center justify-between text-xs text-[#6E6A63] border-b border-[#E8E2D5] pb-3.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
              <span className="font-medium text-[11px] uppercase tracking-wider text-[#121214]">
                Metal & Engraving Simulation
              </span>
            </div>

            <button
              onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : 1)}
              className="p-1.5 px-3 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#121214] hover:border-[#C5A059] flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{zoomLevel === 1 ? 'Zoom Detail' : 'Reset Zoom'}</span>
            </button>
          </div>

          <div className="relative w-full flex flex-col items-center justify-center p-4">
            {/* Bail */}
            <div
              className="w-5 h-7 -mb-0.5 rounded-t-full border-2 z-10 flex-shrink-0"
              style={{
                background: bail.background,
                borderColor: bail.borderColor,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }}
            />

            {/* Pendant — scaled to fit the page, same aspect as the studio canvas */}
            <div
              className="relative flex-shrink-0 transition-transform duration-500"
              style={{
                aspectRatio: `${surfaceAspect}`,
                width: `min(100%, calc(min(50vh, 360px) * ${surfaceAspect}))`,
                maxHeight: 'min(50vh, 360px)',
                borderRadius: shapeRadius,
                transform: `scale(${zoomLevel}) translateZ(0)`,
                transformOrigin: 'center top',
                boxShadow: pendantShadow,
                isolation: 'isolate',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Polished metal base */}
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: shapeRadius,
                  background: material.base,
                }}
              />

              {/* Laser engraving — recessed matte etch (preview simulation) */}
              <div
                className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
                style={{
                  borderRadius: shapeRadius,
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />

              {/* Soft studio specular — brightens polished metal, not the matte grooves */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: shapeRadius,
                  background: material.highlight,
                  opacity: 0.42,
                  mixBlendMode: 'soft-light',
                }}
              />

              {/* Gentle edge vignette for curved-metal depth */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: shapeRadius,
                  boxShadow: `
                    inset 0 0 20px rgba(0, 0, 0, 0.06),
                    inset 0 0 1px ${material.rim}
                  `,
                }}
              />

              {/* Micro surface grain — breaks up flat digital look */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
                style={{
                  borderRadius: shapeRadius,
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/></filter><rect width="120" height="120" filter="url(#n)" opacity="0.55"/></svg>'
                  )}")`,
                  backgroundSize: '120px 120px',
                }}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E8E2D5] rounded-3xl p-6 sm:p-8 space-y-6 text-[#121214] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div>
            <span className="text-xs font-mono text-[#C5A059] uppercase tracking-widest font-bold">{jewelry.sku}</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121214] mt-0.5">{jewelry.name}</h2>
            <p className="text-[#6E6A63] text-xs mt-1">{jewelry.description}</p>
          </div>

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
