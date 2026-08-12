import React, { useCallback, useEffect, useState } from 'react';
import { SavedDesignBundle } from '../types';
import { isTerminalFulfillmentStatus } from '../constants/fulfillmentStatus';
import {
  hasAssociateApiAccess,
  listAssociateQueue,
  listAssociateStations,
  lookupAssociateOrder,
  type POSQueueItem,
} from '../services/associateService';
import { isStationOnline, type LaserStation } from '../services/associateTypes';
import { getAppOrder } from '../services/orderService';
import { ApiError } from '../services/apiClient';
import { bundleFromOrder } from '../utils/designBundle';
import { parseAssociateOrderId } from '../utils/routing';
import { AssociateOrderPanel } from '../components/associate/AssociateOrderPanel';
import { QrCode, RefreshCw, Radio, ListOrdered } from 'lucide-react';

export const AssociateTerminal: React.FC = () => {
  const initialOrderId = parseAssociateOrderId(window.location.search) ?? '';

  const [searchId, setSearchId] = useState(initialOrderId);
  const [activeBundle, setActiveBundle] = useState<SavedDesignBundle | null>(null);
  const [queue, setQueue] = useState<POSQueueItem[]>([]);
  const [stations, setStations] = useState<LaserStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isRefreshingMeta, setIsRefreshingMeta] = useState(false);

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

  const refreshMeta = useCallback(async () => {
    if (!hasAssociateApiAccess()) return;
    setIsRefreshingMeta(true);
    try {
      const [queueItems, stationList] = await Promise.all([
        listAssociateQueue(),
        listAssociateStations(),
      ]);
      setQueue(queueItems);
      setStations(stationList);
    } catch {
      // keep last known queue/stations on refresh failure
    } finally {
      setIsRefreshingMeta(false);
    }
  }, []);

  const handleLookup = useCallback(
    async (orderId: string) => {
      if (!orderId.trim()) return;
      setIsSearching(true);
      setSearchError('');
      try {
        const bundle = await fetchOrderStatus(orderId.trim());
        setActiveBundle(bundle);
        const url = new URL(window.location.href);
        url.searchParams.set('order', orderId.trim());
        window.history.replaceState({}, '', url.pathname + url.search);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to locate order';
        setSearchError(message);
        setActiveBundle(null);
      } finally {
        setIsSearching(false);
      }
    },
    [fetchOrderStatus]
  );

  useEffect(() => {
    void refreshMeta();
    const interval = window.setInterval(() => {
      void refreshMeta();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refreshMeta]);

  useEffect(() => {
    if (initialOrderId) {
      void handleLookup(initialOrderId);
    }
  }, [initialOrderId, handleLookup]);

  useEffect(() => {
    const orderId = activeBundle?.designId;
    if (!orderId) return;
    const status = activeBundle.fulfillmentStatus ?? 'submitted';
    if (isTerminalFulfillmentStatus(status)) return;

    const interval = window.setInterval(async () => {
      try {
        const bundle = await fetchOrderStatus(orderId);
        setActiveBundle(bundle);
      } catch {
        // keep last known state on poll failure
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeBundle?.designId, activeBundle?.fulfillmentStatus, fetchOrderStatus]);

  const onlineStations = stations.filter(isStationOnline);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#121214] flex flex-col">
      <header className="border-b border-[#E8E2D5] bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#121214] text-[#C5A059] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold">GIVA Store Associate Terminal</h1>
              <p className="text-[#6E6A63] text-xs">Laser queue monitor & order lookup</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                hasAssociateApiAccess()
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasAssociateApiAccess() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {hasAssociateApiAccess() ? 'Associate API connected' : 'Set VITE_ASSOCIATE_API_KEY'}
            </span>
            <a
              href="/"
              className="px-3 py-1.5 rounded-full border border-[#E8E2D5] bg-white hover:bg-[#121214] hover:text-[#C5A059] font-bold uppercase tracking-wider text-[10px] transition-colors"
            >
              Customer Studio
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <section className="bg-white border border-[#E8E2D5] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A857C]">
                <Radio className="w-4 h-4 text-[#C5A059]" />
                <span>Laser Stations</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshMeta()}
                disabled={isRefreshingMeta}
                className="text-[#C5A059] hover:text-[#121214] disabled:opacity-50"
                aria-label="Refresh stations"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingMeta ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {stations.length === 0 ? (
              <p className="text-xs text-[#8A857C]">No stations registered. Start the LaserAgent service.</p>
            ) : (
              <ul className="space-y-2">
                {stations.map((station) => {
                  const online = isStationOnline(station);
                  return (
                    <li
                      key={station.id}
                      className="flex items-center justify-between bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#121214]">{station.name}</div>
                        <div className="text-[10px] text-[#8A857C] font-mono truncate max-w-[180px]">{station.id}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          online ? 'text-emerald-700' : 'text-[#8A857C]'
                        }`}
                      >
                        {online ? station.status : 'offline'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[10px] text-[#8A857C]">
              {onlineStations.length} of {stations.length} station(s) online
            </p>
          </section>

          <section className="bg-white border border-[#E8E2D5] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A857C]">
              <ListOrdered className="w-4 h-4 text-[#C5A059]" />
              <span>Active POS Queue</span>
            </div>

            {queue.length === 0 ? (
              <p className="text-xs text-[#8A857C]">No jobs waiting or in progress.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {queue.map(({ job, order }) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchId(order.id);
                        void handleLookup(order.id);
                      }}
                      className="w-full text-left bg-[#FAF8F5] hover:bg-[#121214] hover:text-white border border-[#E8E2D5] rounded-xl px-3 py-2 transition-colors group"
                    >
                      <div className="font-mono text-[11px] font-bold break-all group-hover:text-white">{order.id}</div>
                      <div className="flex items-center justify-between mt-1 text-[10px] uppercase tracking-wider">
                        <span className="text-[#C5A059] group-hover:text-[#C5A059]">{order.sku_code}</span>
                        <span className="font-bold">{job.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section className="space-y-4">
          <div className="bg-white border border-[#E8E2D5] rounded-2xl p-4 space-y-2">
            <label className="text-[10px] font-mono text-[#8A857C] font-bold uppercase tracking-wider">
              Lookup order ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleLookup(searchId)}
                placeholder="Paste order UUID from confirmation QR"
                className="flex-1 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs font-mono focus:border-[#C5A059] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleLookup(searchId)}
                disabled={isSearching}
                className="px-5 py-2.5 bg-[#121214] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#C5A059] transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching…' : 'Lookup'}
              </button>
            </div>
            {searchError && <p className="text-rose-600 text-xs font-medium">{searchError}</p>}
          </div>

          {activeBundle ? (
            <AssociateOrderPanel
              bundle={activeBundle}
              onBundleUpdated={setActiveBundle}
            />
          ) : (
            <div className="py-16 text-center text-xs text-[#8A857C] bg-white rounded-2xl border border-dashed border-[#E8E2D5] p-6 space-y-2">
              <p>Scan the customer confirmation QR or enter an order ID to inspect laser parameters and live status.</p>
              <p className="text-[#C5A059] font-mono">/associate?order=&lt;uuid&gt;</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
