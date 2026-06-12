# bench — does graph traversal help agents fix bugs?

Hypothesis: frontier models lose the thread following logic across a call stack because they read files while a call stack is a graph. If that's true, giving an agent flowdiff's MCP tools (`function_info`, `flow_diff`, …) should improve its ability to fix bugs whose **cause sits several call-hops away from the symptom** — and that's measurable.

## Method

Each task in `tasks/` is a small fixture repo containing a planted multi-hop bug, a `task.md` bug report (what the agent sees), and a `holdout.test.js` the agent never sees. The runner copies the repo to a temp dir, runs headless `claude -p` with the bug report — the **flowdiff condition** gets the MCP server plus one steering sentence, the **control** gets nothing extra (`--strict-mcp-config` keeps stray user-level servers out of both) — then copies in the held-out tests and grades with `node --test`. Agents generate, scripts grade: pass/fail comes from an exit code, not a judge.

Held-out tests are written to catch wrong fixes too: every task has guard tests that fail if the agent "fixes" the bug by deleting the protection it lives in.

```sh
node bench/run.mjs                          # all tasks × both conditions
node bench/run.mjs --seeds 3                # 3 runs per cell + aggregate summary
node bench/run.mjs --task ledger-refund --cond flowdiff
```

Results land in `bench/results/run-<timestamp>.json` with pass/fail, cost, turns, and wall time per run.

## The task matrix

Each task isolates a variable; grep and graph traversal should diverge where connectivity beats lexical search.

| task | kind | what it isolates |
|---|---|---|
| `ledger-refund` | fixture | baseline: multi-hop bug, toy scale |
| `quiet-hours` | fixture | baseline: multi-hop bug, toy scale |
| `report-decoy` | fixture | **scent trap**: two same-named functions, the symptom's wording points at the wrong one; only callers prove which is on the symptomatic path. Guard test fails if the decoy is "fixed". |
| `duration-units` | fixture | **fix generality**: one root cause, two symptoms, only one reported. Holdout tests both — a symptom-site hack fails the unreported one. |
| `workspace-money` | fixture | **boundary, rung 1**: bug in a sibling package, same git repo (flowdiff traverses across packages) |
| `billing-rounding` | multi-repo | **boundary, rung 2**: the *same* bug as workspace-money, but the library is a separate git repo linked through node_modules — flowdiff's graph is blind past the boundary. Deliberately adversarial; measures the cost of the blind spot. |
| `express-etag` | real repo | real codebase, **strong scent** (symptom names the mechanism) |
| `express-trust` | real repo | real codebase, **weak scent** (security symptom describes behavior only; cause is an off-by-one in `compileTrust`, hops from any keyword in the report) |
| `eslint-autofix` | real repo | **big repo, weak scent** (~380 source files; symptom is "`--fix` corrupts touching edits"; cause is `>=`→`>` deep in `source-code-fixer.js`, many hops below the lint API, no keyword to grep) |

The `workspace-money` / `billing-rounding` pair is the controlled comparison: identical defect, identical symptom, only the repo boundary differs. If the flowdiff condition degrades on rung 2, that quantifies the value of multi-root graph support before it's built.

## What the runs show so far

At every scale tested through ~200 files, **pass rate saturates at 100% for both conditions** — and where everything passes, the only measurable axis is cost, on which the flowdiff condition consistently *loses* (~30–50% more turns: the tools' schemas and traversal are overhead the agent doesn't need when it can just read the whole repo). The one-time express-etag run where flowdiff looked cheaper was n=1 noise; 3 seeds erased it. This is the expected shape: the thesis only predicts an advantage where the agent would otherwise **get lost**, which can't happen in a repo small enough to read end to end. `eslint-autofix` is the first task whose repo is plausibly too big for that — it's the cell that can actually move pass rate, not just cost.

## Honest limitations

- Most tasks saturate pass rate, so they measure cost, not capability. The interesting result lives at a scale where the control sometimes *fails* — that's what `eslint-autofix` (and bigger) are for.
- The flowdiff condition is *steered* (one sentence pointing at the tools). That measures capability ("does traversal help when used"), not adoption ("do agents reach for it unprompted"). Both matter; unsteered runs are a flag away.
- Tasks were authored knowing the tool being tested. Defended by the script grader and guard tests, but task-selection bias is real until tasks come from organic sources (real regressions, other people's repos).
- `eslint-autofix`'s cause and its catching test live in the same module; the *agent's* traversal distance (behavioral symptom → fixer internals) is the point, not the test's distance.
