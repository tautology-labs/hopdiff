import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceTotal, lineTotal } from "./packages/billing/src/invoice.js";

test("float-hostile prices bill exactly", () => {
  assert.equal(lineTotal({ price: 19.99 }), 19.99);
  assert.equal(invoiceTotal([{ price: 19.99 }], 0), 19.99);
  assert.equal(invoiceTotal([{ price: 0.29 }, { price: 0.7 }], 0), 0.99);
});

test("round prices still bill exactly", () => {
  assert.equal(invoiceTotal([{ price: 10 }, { price: 5.25 }], 0), 15.25);
});

test("tax applies to the corrected subtotal", () => {
  assert.equal(invoiceTotal([{ price: 19.99 }], 0.1), 21.99);
});
