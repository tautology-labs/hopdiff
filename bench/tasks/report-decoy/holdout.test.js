import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWeeklySummary } from "./src/report.js";
import { axisLabels } from "./src/charts.js";

const events = (ok, fail) => [
  ...Array.from({ length: ok }, () => ({ ok: true })),
  ...Array.from({ length: fail }, () => ({ ok: false })),
];

test("report shows ratios as percentages", () => {
  assert.match(buildWeeklySummary(events(1, 1)), /Success rate: 50%/);
  assert.match(buildWeeklySummary(events(3, 1)), /Success rate: 75%/);
});

test("chart axis labels are unchanged (values arrive pre-scaled)", () => {
  assert.deepEqual(axisLabels(100, 4), ["0%", "25%", "50%", "75%", "100%"]);
});

test("error counts still format", () => {
  assert.match(buildWeeklySummary(events(0, 1500)), /Errors: 1\.5k/);
});
