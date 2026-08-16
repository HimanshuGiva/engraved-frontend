import { normalizeFulfillmentStatus } from '../constants/fulfillmentStatus';
import { fetchJewelryCatalog, findJewelryByBackendSku } from '../services/catalogService';
import { AppEngravingOrder } from '../services/orderService';
import { CanvasElement, JewelryItem, OrderChannel, SavedDesignBundle } from '../types';

export function buildSavedDesignBundle(input: {
  orderId: string;
  createdAt: string;
  channel?: OrderChannel;
  jewelry: JewelryItem;
  elements: CanvasElement[];
  compositeSvg: string;
  messageId?: string;
  fulfillmentStatus?: string;
  jobError?: string | null;
}): SavedDesignBundle {
  const channel = input.channel ?? 'pos';
  return {
    designId: input.orderId,
    createdAt: input.createdAt,
    channel,
    jewelry: input.jewelry,
    elements: input.elements,
    compositeSvg: input.compositeSvg,
    totalPriceInr: input.jewelry.priceInr + input.jewelry.engravingFeeInr,
    messageId: input.messageId,
    fulfillmentStatus: input.fulfillmentStatus
      ? normalizeFulfillmentStatus(input.fulfillmentStatus, channel)
      : undefined,
    jobError: input.jobError,
  };
}

export function bundleFromOrder(
  order: AppEngravingOrder,
  jobError?: string | null
): SavedDesignBundle | null {
  const jewelry = findJewelryByBackendSku(order.sku_code);
  if (!jewelry) return null;

  return buildSavedDesignBundle({
    orderId: order.id,
    createdAt: order.created_at,
    channel: order.channel,
    jewelry,
    elements: [],
    compositeSvg: order.final_svg,
    messageId: order.message_id ?? undefined,
    fulfillmentStatus: order.fulfillment_status,
    jobError,
  });
}

/** Ensures catalog is loaded from the API, then builds a design bundle. */
export async function bundleFromOrderAsync(
  order: AppEngravingOrder,
  jobError?: string | null
): Promise<SavedDesignBundle | null> {
  await fetchJewelryCatalog();
  return bundleFromOrder(order, jobError);
}
