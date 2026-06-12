// Shared money math. All arithmetic happens in integer cents.
export function toCents(amount) {
  return Math.trunc(amount * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

export function addCents(...cents) {
  return cents.reduce((sum, c) => sum + c, 0);
}

export function applyTaxCents(cents, rate) {
  return cents + Math.round(cents * rate);
}
