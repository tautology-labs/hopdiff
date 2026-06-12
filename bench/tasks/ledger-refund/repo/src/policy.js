// Refund policy: a refund may never exceed what remains captured on the order.
export function calcRefundable(order) {
  return sumCaptured(order) - sumRefunded(order);
}

function sumCaptured(order) {
  return order.payments
    .filter((p) => p.status === "captured")
    .reduce((total, p) => total + p.amount, 0);
}

function sumRefunded(order) {
  return order.refunds.reduce(
    (total, r) => total + (r.status === "failed" ? 0 : settledAmount(order, r)),
    0,
  );
}

function settledAmount(order, refund) {
  const payment = order.payments.find((p) => p.id === refund.paymentId);
  return payment ? payment.amount : refund.amount;
}
