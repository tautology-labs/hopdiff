import { getOrder, saveOrder } from "./store.js";
import { calcRefundable } from "./policy.js";

export function refundOrder(orderId, amount) {
  const order = getOrder(orderId);
  if (!order) return { ok: false, reason: "not_found" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  const refundable = calcRefundable(order);
  if (amount > refundable) {
    return { ok: false, reason: "exceeds_refundable", refundable };
  }
  order.refunds.push({
    id: `r_${order.refunds.length + 1}`,
    paymentId: order.payments[0]?.id,
    amount,
    status: "settled",
  });
  saveOrder(order);
  return { ok: true, refunded: amount };
}
