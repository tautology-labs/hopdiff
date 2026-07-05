// The reconciler. Deterministic: no model anywhere in here.
// Diffs desired state (system.mjs) against observed state (extract.mjs),
// checks declared rates against physics (limits.json), and emits the
// drift report — which is simultaneously a linter (violations), a
// backlog (work queue), and the codegen agent's work order.

import { readFileSync } from 'node:fs';
import { system } from './system.mjs';
import { extract } from './extract.mjs';

const limits = JSON.parse(readFileSync(new URL('./limits.json', import.meta.url)));
const actual = extract(new URL('./services', import.meta.url).pathname);

const key = (e) => `${e.from} -> ${e.to}`;
const intentKeys = new Set(system.edges.map(key));
const actualKeys = new Set(actual.edges.map(key));

const drift = { violations: [], workQueue: [], physics: [] };

// in code, not in intent -> violation (undeclared dependency)
for (const e of actual.edges) {
  if (!intentKeys.has(key(e))) {
    drift.violations.push({
      edge: key(e),
      confidence: e.confidence,
      evidence: e.site,
      ask: `Undeclared ${e.via === 'iac-binding' ? 'consumer binding' : 'call'}. ` +
           `Either remove it, or a human adds this edge to system.mjs.`,
    });
  }
}

// in intent, not in code -> work queue ("implement this")
for (const e of system.edges) {
  if (!actualKeys.has(key(e))) {
    drift.workQueue.push({
      edge: key(e),
      contract: e.schema ?? null,
      ask: `Declared but unimplemented. Implement: ${e.from} must ` +
           `${system.nodes[e.from].kind === 'queue' ? 'be consumed by' : 'send to'} ${e.to}` +
           (e.schema ? ` using schema ${e.schema}.` : '.'),
    });
  }
}

// declared rates vs published ceilings -> physics
for (const e of system.edges) {
  if (!e.rate) continue;
  const construct = system.nodes[e.to]?.construct;
  const ceiling = limits[construct]?.sendRate?.[e.rate.batched ? 'batched' : 'unbatched'];
  if (ceiling?.value != null && e.rate.msgsPerSec > ceiling.value) {
    drift.physics.push({
      edge: key(e),
      declared: `${e.rate.msgsPerSec} msgs/sec (${e.rate.batched ? 'batched' : 'unbatched'})`,
      ceiling: `${ceiling.value} ${ceiling.unit} — ${limits[construct].adjustable} limit`,
      source: `${limits[construct].source} (as of ${limits[construct].asOf})`,
      ask: `Declared rate exceeds the published ceiling. Batch the sends, ` +
           `shard the queue, or lower the declared rate.`,
    });
  }
}

// ---- render: this text is the prompt artifact the codegen agent receives ----

const n = drift.violations.length + drift.workQueue.length + drift.physics.length;
console.log(`\ndrift report — ${n} item${n === 1 ? '' : 's'} (intent: system.mjs, observed: services/)\n`);

const section = (title, items, render) => {
  if (!items.length) return;
  console.log(`  ${title}`);
  for (const it of items) render(it);
  console.log();
};

section('VIOLATION — in code, not in intent', drift.violations, (v) =>
  console.log(`    ✗ ${v.edge}   [${v.confidence}]  ${v.evidence}\n      ${v.ask}`));

section('WORK QUEUE — in intent, not in code', drift.workQueue, (w) =>
  console.log(`    ○ ${w.edge}${w.contract ? `   contract: ${w.contract}` : ''}\n      ${w.ask}`));

section('PHYSICS — declared rate vs published ceiling', drift.physics, (p) =>
  console.log(`    ⚡ ${p.edge}\n      declared ${p.declared}  >  ceiling ${p.ceiling}\n      ${p.source}\n      ${p.ask}`));

if (n === 0) console.log('  ✓ zero drift — code matches intent, intent fits physics\n');
process.exit(drift.violations.length + drift.physics.length ? 1 : 0);  // CI gate: work queue doesn't fail the build; lies and physics do
