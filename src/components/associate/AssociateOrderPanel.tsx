import React, { useState } from 'react';
import { SavedDesignBundle } from '../../types';
import {
  getFulfillmentStatusMeta,
  isActiveLaserStatus,
} from '../../constants/fulfillmentStatus';
import {
  cancelAssociateOrder,
  hasAssociateApiAccess,
  requeueAssociateOrder,
} from '../../services/associateService';
import { ApiError } from '../../services/apiClient';
import { CheckCircle, Cpu, AlertCircle, RefreshCw } from 'lucide-react';

interface AssociateOrderPanelProps {
  bundle: SavedDesignBundle;
  onBundleUpdated: (bundle: SavedDesignBundle) => void;
  compact?: boolean;
}

export const AssociateOrderPanel: React.FC<AssociateOrderPanelProps> = ({
  bundle,
  onBundleUpdated,
  compact = false,
}) => {
  const [isRequeueing, setIsRequeueing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  const fulfillmentStatus = bundle.fulfillmentStatus ?? 'submitted';
  const channel = bundle.channel ?? 'pos';
  const statusMeta = getFulfillmentStatusMeta(fulfillmentStatus, channel);
  const canManageLaser = hasAssociateApiAccess() && channel === 'pos';

  const statusToneClass =
    statusMeta.tone === 'success'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : statusMeta.tone === 'error'
        ? 'text-rose-700 bg-rose-50 border-rose-200'
        : statusMeta.tone === 'active'
          ? 'text-[#C5A059] bg-[#FAF8F5] border-[#E8E2D5]'
          : 'text-[#6E6A63] bg-white border-[#E8E2D5]';

  const handleRequeue = async () => {
    if (!bundle.designId || !canManageLaser) return;
    setIsRequeueing(true);
    setActionError('');
    try {
      await requeueAssociateOrder(bundle.designId);
      onBundleUpdated({ ...bundle, fulfillmentStatus: 'queued', jobError: null });
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to requeue job'
      );
    } finally {
      setIsRequeueing(false);
    }
  };

  const handleCancel = async () => {
    if (!bundle.designId || !canManageLaser) return;
    if (!window.confirm('Cancel this engraving order?')) return;
    setIsCancelling(true);
    setActionError('');
    try {
      await cancelAssociateOrder(bundle.designId);
      onBundleUpdated({ ...bundle, fulfillmentStatus: 'cancelled', jobError: null });
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to cancel order'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className={`space-y-5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D5] text-xs ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3.5">
        <div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider ${statusToneClass}`}
          >
            {statusMeta.label}
          </span>
          <div className="font-mono text-sm font-bold text-[#121214] break-all mt-1.5">{bundle.designId}</div>
        </div>

        <div className="text-right">
          <div className="text-[#6E6A63] font-medium text-[11px]">Total Charged</div>
          <div className="font-mono text-[#121214] font-bold text-base">₹{bundle.totalPriceInr}</div>
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
            <p className="font-bold text-[#121214] capitalize">{bundle.jewelry.material.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="text-[#6E6A63] font-medium">Backend SKU:</span>
            <p className="font-bold text-[#C5A059] font-mono">{bundle.jewelry.backendSkuCode}</p>
          </div>
          <div>
            <span className="text-[#6E6A63] font-medium">Safe Zone:</span>
            <p className="font-bold text-[#121214]">
              {bundle.jewelry.constraints.safeWidthMm}×{bundle.jewelry.constraints.safeHeightMm}mm
            </p>
          </div>
          <div>
            <span className="text-[#6E6A63] font-medium">Min Line Thickness:</span>
            <p className="font-bold text-[#121214]">{bundle.jewelry.constraints.minStrokeWidthMm}mm</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[#8A857C] font-bold uppercase text-[10px] tracking-wider">Production SVG Vector Beam Path</div>
        <div
          className="w-full h-36 bg-white rounded-xl p-3 border border-[#E8E2D5] flex items-center justify-center text-[#121214]"
          dangerouslySetInnerHTML={{ __html: bundle.compositeSvg }}
        />
      </div>

      {channel === 'pos' && isActiveLaserStatus(fulfillmentStatus) ? (
        <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl text-[#121214] flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 text-[#C5A059] flex-shrink-0 animate-spin" />
          <div>
            <div className="font-bold text-xs">
              {fulfillmentStatus === 'marking' ? 'Laser is engraving this piece' : 'Waiting for laser station'}
            </div>
            <p className="text-[11px] text-[#6E6A63]">
              Job is automated — place jewelry in fixture; marking starts when the agent picks up the job.
            </p>
          </div>
        </div>
      ) : null}

      {channel === 'app' ? (
        <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl text-[#121214]">
          <div className="font-bold text-xs">App order — central factory fulfillment</div>
          <p className="text-[11px] text-[#6E6A63] mt-1">
            This order is not engraved in-store. Status: {statusMeta.label}.
          </p>
        </div>
      ) : null}

      {fulfillmentStatus === 'completed' ? (
        <div className="p-4 bg-white border border-emerald-200 rounded-xl text-emerald-900 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-bold text-xs">Engraving complete</div>
            <p className="text-[11px] text-emerald-700">Remove the piece from the fixture and hand it to the customer.</p>
          </div>
        </div>
      ) : null}

      {fulfillmentStatus === 'failed' ? (
        <div className="space-y-2">
          <div className="p-4 bg-white border border-rose-200 rounded-xl text-rose-900 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs">Engraving failed</div>
              <p className="text-[11px] text-rose-700">
                {bundle.jobError ?? 'The laser agent reported an error. Check the station PC logs.'}
              </p>
            </div>
          </div>
          {canManageLaser ? (
            <button
              onClick={handleRequeue}
              disabled={isRequeueing}
              className="w-full py-3 bg-[#121214] hover:bg-[#C5A059] text-white font-bold uppercase tracking-[0.12em] text-xs rounded-full transition-colors disabled:opacity-50"
            >
              {isRequeueing ? 'Requeueing…' : 'Requeue for Laser'}
            </button>
          ) : null}
        </div>
      ) : null}

      {canManageLaser &&
      fulfillmentStatus !== 'completed' &&
      fulfillmentStatus !== 'cancelled' &&
      fulfillmentStatus !== 'failed' ? (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-full py-2.5 bg-white hover:bg-rose-50 text-rose-700 font-bold uppercase tracking-[0.12em] text-[10px] rounded-full transition-colors border border-rose-200 disabled:opacity-50"
        >
          {isCancelling ? 'Cancelling…' : 'Cancel Order'}
        </button>
      ) : null}

      {actionError && <p className="text-rose-600 text-xs">{actionError}</p>}
    </div>
  );
};
