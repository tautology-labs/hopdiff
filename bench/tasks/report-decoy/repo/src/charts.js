// Chart rendering. Axis values arrive pre-scaled (0–100) from the
// aggregation pipeline, so they are formatted as-is.
export function formatPercent(value) {
  return `${roundTo(value, 1)}%`;
}

export function axisLabels(maxValue, steps) {
  const labels = [];
  for (let i = 0; i <= steps; i++) {
    labels.push(formatPercent((maxValue / steps) * i));
  }
  return labels;
}

function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
