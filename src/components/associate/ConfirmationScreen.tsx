import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SavedDesignBundle } from '../../types';
import { downloadFile } from '../../utils/svgUtils';
import { Download, Store, CheckCircle } from 'lucide-react';

interface ConfirmationScreenProps {
  bundle: SavedDesignBundle;
  onOpenStoreAssociate: () => void;
  onNewDesign: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  bundle,
  onOpenStoreAssociate,
  onNewDesign,
}) => {
  useEffect(() => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C5A059', '#121214', '#E8E2D5', '#FAF8F5'],
    });
  }, []);

  const handleDownloadSvg = () => {
    downloadFile(
      bundle.compositeSvg,
      `${bundle.designId}-${bundle.jewelry.sku}.svg`,
      'image/svg+xml'
    );
  };

  // QR Code SVG representation for Store Associate Scan
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${bundle.designId}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Celebratory Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-[#FAF8F5] text-[#C5A059] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] border border-[#E8E2D5]">
          <CheckCircle className="w-4 h-4 text-[#C5A059]" />
          <span>Design Confirmed</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#121214] tracking-tight">
          You just created something no one else has.
        </h1>

        <p className="text-[#6E6A63] text-sm max-w-xl mx-auto">
          Your unique jewelry design is saved and ready for GIVA in-store physical laser engraving.
        </p>
      </div>

      {/* Design ID & QR Card */}
      <div className="bg-white border border-[#E8E2D5] rounded-3xl p-8 text-[#121214] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#E8E2D5] pb-6">
          <div>
            <span className="text-xs font-mono text-[#C5A059] uppercase tracking-widest font-bold">Order ID</span>
            <div className="font-mono text-lg sm:text-xl font-extrabold text-[#121214] tracking-wider mt-1 break-all">
              {bundle.designId}
            </div>
            <p className="text-[#6E6A63] text-xs mt-1">Created on {new Date(bundle.createdAt).toLocaleDateString()} • GIVA Atelier</p>
          </div>

          {/* QR Code Container */}
          <div className="bg-[#FAF8F5] border border-[#E8E2D5] p-3 rounded-2xl shadow-2xs flex flex-col items-center space-y-1">
            <img src={qrSvgUrl} alt="Design QR" className="w-28 h-28 object-contain" />
            <span className="text-[10px] font-mono text-[#121214] font-bold tracking-wider">SCAN IN STORE</span>
          </div>
        </div>

        {/* Jewelry Specifications Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#E8E2D5] space-y-1">
            <div className="text-[#8A857C] uppercase tracking-wider text-[10px] font-bold">Physical Jewelry SKU</div>
            <div className="font-bold text-sm text-[#121214]">{bundle.jewelry.name}</div>
            <div className="text-[#C5A059] font-mono font-bold text-[11px]">{bundle.jewelry.engravingAreaLabel}</div>
          </div>

          <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#E8E2D5] space-y-1">
            <div className="text-[#8A857C] uppercase tracking-wider text-[10px] font-bold">Total Price (Inc. Engraving)</div>
            <div className="font-bold text-xl text-[#121214] font-mono">
              ₹{bundle.totalPriceInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[#C5A059] font-bold text-[11px]">Laser Manufacturing Clearance Verified</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap gap-4">
          <button
            onClick={onOpenStoreAssociate}
            className="flex-1 py-4 px-6 rounded-full bg-[#121214] hover:bg-[#C5A059] text-white font-bold uppercase tracking-[0.15em] text-xs flex items-center justify-center space-x-2 transition-all shadow-md border border-[#121214]"
          >
            <Store className="w-4 h-4 text-[#C5A059] group-hover:text-white" />
            <span>Hand Off to Store Associate</span>
          </button>

          <button
            onClick={handleDownloadSvg}
            className="py-4 px-6 rounded-full bg-[#FAF8F5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors border border-[#E8E2D5]"
          >
            <Download className="w-4 h-4 text-[#C5A059]" />
            <span>Download Production SVG</span>
          </button>

          <button
            onClick={onNewDesign}
            className="py-4 px-6 rounded-full bg-white hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214] font-bold text-xs uppercase tracking-wider transition-colors border border-[#E8E2D5]"
          >
            Create Another Design
          </button>
        </div>

      </div>

    </div>
  );
};

