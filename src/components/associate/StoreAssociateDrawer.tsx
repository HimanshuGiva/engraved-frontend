import React, { useCallback, useEffect, useState } from 'react';
import { SavedDesignBundle } from '../../types';
import { isTerminalFulfillmentStatus } from '../../constants/fulfillmentStatus';
import {
  associateTerminalUrl,
  hasAssociateApiAccess,
  lookupAssociateOrder,
} from '../../services/associateService';
import { getAppOrder } from '../../services/orderService';
import { ApiError } from '../../services/apiClient';
import { bundleFromOrder } from '../../utils/designBundle';
import { AssociateOrderPanel } from './AssociateOrderPanel';
import { Search, ExternalLink } from 'lucide-react';

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

  const fetchOrderStatus = useCallback(async (orderId: string) => {
    if (hasAssociateApiAccess()) {
      const { order, job } = await lookupAssociateOrder(orderId);
      const bundle = bundleFromOrder(order, job?.error_message ?? null);
      if (!bundle) {
        throw new Error(`Unknown SKU "${order.sku_code}" in order`);
      }
      return bundle;
    }

    const order = await getAppOrder(orderId);
    const bundle = bundleFromOrder(order);
    if (!bundle) {
      throw new Error(`Unknown SKU "${order.sku_code}" in order`);
    }
    return bundle;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setFetchedBundle(activeBundle || null);
  }, [isOpen, activeBundle]);

  useEffect(() => {
    const orderId = fetchedBundle?.designId;
    if (!isOpen || !orderId) return;
    const status = fetchedBundle?.fulfillmentStatus ?? 'submitted';
    if (isTerminalFulfillmentStatus(status)) return;

    const interval = window.setInterval(async () => {
      try {
        const bundle = await fetchOrderStatus(orderId);
        setFetchedBundle(bundle);
      } catch {
        // keep last known state on poll failure
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isOpen, fetchedBundle?.designId, fetchedBundle?.fulfillmentStatus, fetchOrderStatus]);

  if (!isOpen) return null;

  const handleSearchDesign = async () => {
    if (!searchId.trim()) return;
    setIsSearching(true);
    setSearchError('');

    try {
      const bundle = await fetchOrderStatus(searchId.trim());
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

  const displayBundle = fetchedBundle || activeBundle;

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white border-l border-[#E8E2D5] text-[#121214] max-w-xl w-full h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#C5A059] flex items-center justify-center font-bold">
                <Search className="w-4 h-4 text-[#C5A059]" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-[#121214]">GIVA Store Associate Station</h2>
                <p className="text-[#6E6A63] text-xs">Quick search — open full terminal for queue view</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] flex items-center justify-center font-mono"
            >
              ✕
            </button>
          </div>

          <a
            href={associateTerminalUrl(displayBundle?.designId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#E8E2D5] bg-[#FAF8F5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Full Associate Terminal
          </a>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#8A857C] font-bold uppercase tracking-wider">
              Search order ID
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearchDesign()}
                placeholder="Enter order ID"
                className="flex-1 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#121214] placeholder-gray-400 font-mono focus:border-[#C5A059] focus:outline-none"
              />
              <button
                onClick={() => void handleSearchDesign()}
                disabled={isSearching}
                className="px-5 py-2.5 bg-[#121214] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#C5A059] transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {searchError && <p className="text-rose-600 text-xs font-medium">{searchError}</p>}
          </div>

          {displayBundle ? (
            <AssociateOrderPanel
              bundle={displayBundle}
              onBundleUpdated={setFetchedBundle}
              compact
            />
          ) : (
            <div className="py-12 text-center text-xs text-[#8A857C] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D5] p-6 space-y-2">
              <p>Enter the order ID from the customer confirmation screen to inspect laser parameters and live status.</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E8E2D5] text-[11px] text-[#8A857C] flex items-center justify-between">
          <span>GIVA In-Store Terminal v2.6</span>
          <span className="text-[#C5A059] font-bold flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                hasAssociateApiAccess() ? 'bg-[#C5A059] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{hasAssociateApiAccess() ? 'Associate API connected' : 'Set VITE_ASSOCIATE_API_KEY'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
