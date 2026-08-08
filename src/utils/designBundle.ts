import { JEWELRY_CATALOG } from '../data/jewelryCatalog';
import { AppEngravingOrder } from '../services/orderService';
import { CanvasElement, JewelryItem, SavedDesignBundle } from '../types';

export function buildSavedDesignBundle(input: {
  orderId: string;
  createdAt: string;
  jewelry: JewelryItem;
  elements: CanvasElement[];
  compositeSvg: string;
  messageId?: string;
}): SavedDesignBundle {
  return {
    designId: input.orderId,
    createdAt: input.createdAt,
    jewelry: input.jewelry,
    elements: input.elements,
    compositeSvg: input.compositeSvg,
    totalPriceInr: input.jewelry.priceInr + input.jewelry.engravingFeeInr,
    messageId: input.messageId,
  };
}

export function bundleFromOrder(order: AppEngravingOrder): SavedDesignBundle | null {
  const jewelry = JEWELRY_CATALOG.find((j) => j.backendSkuCode === order.sku_code);
  if (!jewelry) return null;

  return buildSavedDesignBundle({
    orderId: order.id,
    createdAt: order.created_at,
    jewelry,
    elements: [],
    compositeSvg: order.final_svg,
    messageId: order.message_id ?? undefined,
  });
}
