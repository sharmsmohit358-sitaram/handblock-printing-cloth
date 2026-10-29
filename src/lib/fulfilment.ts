// Order fulfilment workflow (admin).
// Allowed status transitions, so an order cannot jump backwards or skip
// the fulfilment chain by accident. Cancellation is NOT here — it has its
// own route (/api/orders/cancel) with stock + refund-intent handling.
// SHIPPED via Bigship is also separate (/api/admin/shipments, which sets
// SHIPPED + AWB); this workflow covers the manual / pre-shipment steps
// and the post-shipment steps (out for delivery, delivered, failed, RTO).
export const FULFILMENT_TRANSITIONS: Record<string, string[]> = {
  PLACED: ["CONFIRMED", "PROCESSING"],
  CONFIRMED: ["PROCESSING", "PACKED", "SHIPPED"],
  PROCESSING: ["PACKED", "SHIPPED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY", "RTO"],
  FAILED_DELIVERY: ["OUT_FOR_DELIVERY", "RETURNED", "RTO"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  RTO: [],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (FULFILMENT_TRANSITIONS[from] || []).includes(to);
}

export const FULFILMENT_STATUSES = Object.keys(FULFILMENT_TRANSITIONS);
