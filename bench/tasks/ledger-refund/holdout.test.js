import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleRefundRequest } from "./src/api.js";
import { saveOrder, reset } from "./src/store.js";

beforeEach(() => {
  reset();
  saveOrder({
    id: "o1",
    payments: [{ id: "p1", status: "captured", amount: 100 }],
    refunds: [{ id: "r0", paymentId: "p1", amount: 30, status: "settled" }],
  });
});

test("remaining balance can be refunded after a partial refund", () => {
  const res = handleRefundRequest({ orderId: "o1", amount: 70 });
  assert.equal(res.status, 200);
  assert.equal(res.body.refunded, 70);
});

test("over-refunding is still rejected", () => {
  const res = handleRefundRequest({ orderId: "o1", amount: 71 });
  assert.equal(res.status, 422);
});

test("two partial refunds cannot exceed the captured total", () => {
  assert.equal(handleRefundRequest({ orderId: "o1", amount: 50 }).status, 200);
  assert.equal(handleRefundRequest({ orderId: "o1", amount: 21 }).status, 422);
  assert.equal(handleRefundRequest({ orderId: "o1", amount: 20 }).status, 200);
});

test("failed refunds do not count against the refundable balance", () => {
  reset();
  saveOrder({
    id: "o2",
    payments: [{ id: "p1", status: "captured", amount: 50 }],
    refunds: [{ id: "r0", paymentId: "p1", amount: 20, status: "failed" }],
  });
  assert.equal(handleRefundRequest({ orderId: "o2", amount: 50 }).status, 200);
});
