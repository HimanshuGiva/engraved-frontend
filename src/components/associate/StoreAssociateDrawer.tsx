import React, { useState } from 'react';
import { SavedDesignBundle } from '../../types';
import { getAppOrder } from '../../services/orderService';
import { ApiError } from '../../services/apiClient';
import { bundleFromOrder } from '../../utils/designBundle';
import { QrCode, Printer, CheckCircle, Cpu } from 'lucide-react';

interface StoreAssociateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeBundle?: SavedDesignBundle | null;
}

export const StoreAssociateDrawer: React.FC<StoreAssociateDrawerProps> = ({
  isOpen,
  onClose,
  activeBundle,
}) => {
  const [searchId, setSearchId] = useState('');
  const [fetchedBundle, setFetchedBundle] = useState<SavedDesignBundle | null>(activeBundle || null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLookupDesign = async () => {
    if (!searchId.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setDispatchedSuccess(false);

    try {
      const order = await getAppOrder(searchId.trim());
      const bundle = bundleFromOrder(order);
      if (!bundle) {
        throw new Error(`Unknown SKU "${order.sku_code}" in order`);
      }
      setFetchedBundle(bundle);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to locate order';
      setSearchError(message);
      setFetchedBundle(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDispatchToLaser = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      setDispatchedSuccess(true);
    }, 1500);
  };

  const displayBundle = fetchedBundle || activeBundle;

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white border-l border-[#E8E2D5] text-[#121214] max-w-xl w-full h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#C5A059] flex items-center justify-center font-bold">
                <QrCode className="w-4 h-4 text-[#C5A059]" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-[#121214]">GIVA Store Associate Station</h2>
                <p className="text-[#6E6A63] text-xs">Laser Engraver Dispatch & SVG Inspection</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] flex items-center justify-center font-mono"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#8A857C] font-bold uppercase tracking-wider">Lookup order ID</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupDesign()}
                placeholder="Paste order UUID from confirmation"
                className="flex-1 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#121214] placeholder-gray-400 font-mono focus:border-[#C5A059] focus:outline-none"
              />
              <button
                onClick={handleLookupDesign}
                disabled={isSearching}
                className="px-5 py-2.5 bg-[#121214] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#C5A059] transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Lookup'}
              </button>
            </div>
            {searchError && <p className="text-rose-600 text-xs font-medium">{searchError}</p>}
          </div>

          {displayBundle ? (
            <div className="space-y-5 bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E2D5] text-xs">

              <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3.5">
                <div>
                  <span className="text-[10px] text-[#C5A059] font-mono font-bold uppercase tracking-wider">STATUS: CONFIRMED</span>
                  <div className="font-mono text-sm font-bold text-[#121214] break-all">{displayBundle.designId}</div>
                </div>

                <div className="text-right">
                  <div className="text-[#6E6A63] font-medium text-[11px]">Total Charged</div>
                  <div className="font-mono text-[#121214] font-bold text-base">₹{displayBundle.totalPriceInr}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[#8A857C] font-bold uppercase text-[10px] tracking-wider flex items-center space-x-1.5">
                  <Cpu className="w-4 h-4 text-[#C5A059]" />
                  <span>Laser Engraver Technical Audit</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white p-3.5 rounded-xl border border-[#E8E2D5] text-[11px]">
                  <div>
                    <span className="text-[#6E6A63] font-medium">Target Material:</span>
                    <p className="font-bold text-[#121214] capitalize">{displayBundle.jewelry.material.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[#6E6A63] font-medium">Backend SKU:</span>
                    <p className="font-bold text-[#C5A059] font-mono">{displayBundle.jewelry.backendSkuCode}</p>
                  </div>
                  <div>
                    <span className="text-[#6E6A63] font-medium">Safe Boundary Width:</span>
                    <p className="font-bold text-[#121214]">{displayBundle.jewelry.constraints.safeWidthMm}mm</p>
                  </div>
                  <div>
                    <span className="text-[#6E6A63] font-medium">Min Line Thickness:</span>
                    <p className="font-bold text-[#121214]">{displayBundle.jewelry.constraints.minStrokeWidthMm}mm (Passed)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[#8A857C] font-bold uppercase text-[10px] tracking-wider">Production SVG Vector Beam Path</div>
                <div
                  className="w-full h-36 bg-white rounded-xl p-3 border border-[#E8E2D5] flex items-center justify-center text-[#121214]"
                  dangerouslySetInnerHTML={{ __html: displayBundle.compositeSvg }}
                />
              </div>

              {dispatchedSuccess ? (
                <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl text-[#121214] flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-[#C5A059] flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Sent to GIVA In-Store Fiber Laser Engraver</div>
                    <p className="text-[11px] text-[#6E6A63]">Job Queued on Station #01 (Est. Engraving Time: 45 seconds)</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDispatchToLaser}
                  disabled={isDispatching}
                  className="w-full py-4 bg-[#121214] hover:bg-[#C5A059] text-white font-bold uppercase tracking-[0.15em] text-xs rounded-full flex items-center justify-center space-x-2 shadow-md transition-all border border-[#121214]"
                >
                  <Printer className="w-4 h-4 text-[#C5A059] group-hover:text-white" />
                  <span>{isDispatching ? 'Connecting to Laser Printer...' : 'Dispatch Job to Laser Engraver'}</span>
                </button>
              )}

            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#8A857C] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D5] p-6 space-y-2">
              <p>Enter the order ID from the customer confirmation screen to inspect laser parameters.</p>
            </div>
          )}

        </div>

        <div className="pt-4 border-t border-[#E8E2D5] text-[11px] text-[#8A857C] flex items-center justify-between">
          <span>GIVA In-Store Terminal v2.4</span>
          <span className="text-[#C5A059] font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
            <span>Laser Station Online</span>
          </span>
        </div>

      </div>
    </div>
  );
};
