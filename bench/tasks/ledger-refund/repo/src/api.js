import { refundOrder } from "./refunds.js";

export function handleRefundRequest(body) {
  if (typeof body.orderId !== "string" || typeof body.amount !== "number") {
    return { status: 400, body: { error: "bad_request" } };
  }
  const result = refundOrder(body.orderId, body.amount);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 422;
    return { status, body: { error: result.reason } };
  }
  return { status: 200, body: { refunded: result.refunded } };
}
