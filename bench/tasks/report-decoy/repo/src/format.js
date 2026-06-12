// Formatting for the weekly summary report. Ratios arrive as fractions
// (0–1) from metrics and must be scaled for display.
export function formatPercent(ratio) {
  return `${Math.round(ratio * 10) / 10}%`;
}

export function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
