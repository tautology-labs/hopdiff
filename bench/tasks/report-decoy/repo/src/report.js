import { ratioFor, countFor } from "./metrics.js";
import { formatPercent, formatCount } from "./format.js";

export function buildWeeklySummary(events) {
  const successRate = ratioFor(events, (e) => e.ok);
  const errors = countFor(events, (e) => !e.ok);
  return [
    `Success rate: ${formatPercent(successRate)}`,
    `Errors: ${formatCount(errors)}`,
  ].join("\n");
}
