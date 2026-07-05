# the loop, at toy scale

A runnable sketch of the drift engine described in [DESIGN.md](../../DESIGN.md) — not
product code. The extractor here is a deliberately naive regex stand-in for hopdiff's
real graph; everything else (the intent format, the asymmetric diff, the physics check,
the exit-code semantics) is the actual design in miniature.

```sh
node reconcile.mjs
```

Prints a drift report with all three planted findings — an undeclared edge (violation,
with file:line receipt), a declared-but-unimplemented edge (work queue), and a declared
rate exceeding a published, cited ceiling (physics) — and exits 1, because violations
and physics failures gate; an unfinished to-do list doesn't.
