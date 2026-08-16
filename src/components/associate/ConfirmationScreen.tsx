import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { SavedDesignBundle } from '../../types';
import {
  getFulfillmentStatusMeta,
  isTerminalFulfillmentStatus,
} from '../../constants/fulfillmentStatus';
import {
  hasAssociateApiAccess,
  lookupAssociateOrder,
} from '../../services/associateService';
import { bundleFromOrderAsync } from '../../utils/designBundle';
import { downloadFile } from '../../utils/svgUtils';
import { Download, CheckCircle, RefreshCw } from 'lucide-react';

interface ConfirmationScreenProps {
  bundle: SavedDesignBundle;
  onNewDesign: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  bundle,
  onNewDesign,
}) => {
  const [liveBundle, setLiveBundle] = useState(bundle);

  useEffect(() => {
    setLiveBundle(bundle);
  }, [bundle]);

  useEffect(() => {
    if (!hasAssociateApiAccess()) return;
    const status = liveBundle.fulfillmentStatus ?? 'queued';
    if (isTerminalFulfillmentStatus(status)) return;

    const interval = window.setInterval(async () => {
      try {
        const { order, job } = await lookupAssociateOrder(liveBundle.designId);
        const updated = await bundleFromOrderAsync(order, job?.error_message ?? null);
        if (updated) setLiveBundle(updated);
      } catch {
        // ignore poll errors
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [liveBundle.designId, liveBundle.fulfillmentStatus]);

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C5A059', '#121214', '#E8E2D5', '#FAF8F5'],
    });
  }, []);

  const handleDownloadSvg = () => {
    downloadFile(
      liveBundle.compositeSvg,
      `${liveBundle.designId}-${liveBundle.jewelry.sku}.svg`,
      'image/svg+xml'
    );
  };

  const channel = liveBundle.channel ?? 'pos';
  const statusMeta = getFulfillmentStatusMeta(liveBundle.fulfillmentStatus ?? 'queued', channel);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-[#FAF8F5] text-[#C5A059] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] border border-[#E8E2D5]">
          <CheckCircle className="w-4 h-4 text-[#C5A059]" />
          <span>Design Confirmed</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#121214] tracking-tight">
          You just created something no one else has.
        </h1>

        <p className="text-[#6E6A63] text-sm max-w-xl mx-auto">
          {channel === 'pos'
            ? 'Your design is queued for automated in-store laser engraving.'
            : 'Your design has been sent to the GIVA factory for production.'}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6E6A63]">
          {(liveBundle.fulfillmentStatus === 'queued' || liveBundle.fulfillmentStatus === 'marking') && (
            <RefreshCw className="w-3.5 h-3.5 text-[#C5A059] animate-spin" />
          )}
          <span className="font-bold text-[#C5A059] uppercase tracking-wider">{statusMeta.label}</span>
        </div>
      </div>

      <div className="bg-white border border-[#E8E2D5] rounded-3xl p-8 text-[#121214] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
        <div className="border-b border-[#E8E2D5] pb-6">
          <div>
            <span className="text-xs font-mono text-[#C5A059] uppercase tracking-widest font-bold">Order ID</span>
            <div className="font-mono text-lg sm:text-xl font-extrabold text-[#121214] tracking-wider mt-1 break-all">
              {liveBundle.designId}
            </div>
            <p className="text-[#6E6A63] text-xs mt-1">
              Created on {new Date(liveBundle.createdAt).toLocaleDateString()} •{' '}
              {channel === 'pos' ? 'In-Store POS' : 'GIVA App'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#E8E2D5] space-y-1">
            <div className="text-[#8A857C] uppercase tracking-wider text-[10px] font-bold">Physical Jewelry SKU</div>
            <div className="font-bold text-sm text-[#121214]">{liveBundle.jewelry.name}</div>
            <div className="text-[#C5A059] font-mono font-bold text-[11px]">{liveBundle.jewelry.engravingAreaLabel}</div>
          </div>

          <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#E8E2D5] space-y-1">
            <div className="text-[#8A857C] uppercase tracking-wider text-[10px] font-bold">Total Price (Inc. Engraving)</div>
            <div className="font-bold text-xl text-[#121214] font-mono">
              ₹{liveBundle.totalPriceInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[#C5A059] font-bold text-[11px]">Laser Manufacturing Clearance Verified</div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-4">
          <button
            onClick={handleDownloadSvg}
            className="flex-1 py-4 px-6 rounded-full bg-[#121214] hover:bg-[#C5A059] text-white font-bold uppercase tracking-[0.15em] text-xs flex items-center justify-center space-x-2 transition-all shadow-md border border-[#121214]"
          >
            <Download className="w-4 h-4 text-[#C5A059] group-hover:text-white" />
            <span>Download Your Art</span>
          </button>

          <button
            onClick={onNewDesign}
            className="py-4 px-6 rounded-full bg-[#FAF8F5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] font-bold text-xs uppercase tracking-wider transition-colors border border-[#E8E2D5]"
          >
            Create Another Design
          </button>
        </div>
      </div>
    </div>
  );
};
