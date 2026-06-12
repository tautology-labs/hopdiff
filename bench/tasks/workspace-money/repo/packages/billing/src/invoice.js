import {
  toCents,
  fromCents,
  addCents,
  applyTaxCents,
} from "../../money/src/index.js";

export function invoiceTotal(lineItems, taxRate) {
  const subtotal = addCents(...lineItems.map((item) => toCents(item.price)));
  return fromCents(applyTaxCents(subtotal, taxRate));
}

export function lineTotal(item) {
  return fromCents(toCents(item.price));
}
