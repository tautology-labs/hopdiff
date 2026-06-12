Bug report:

Invoice totals are coming out a cent low for certain prices. A single line item of $19.99 with no tax bills as $19.98. Other prices (like $10.00 or $5.25) are exact. Finance is unhappy.

Layout note: this billing service (your working directory) and its shared money library `@acme/money` are checked out side by side — the library lives at `../lib` relative to this repo, and the service's `node_modules/@acme/money` links to it. The defect may be in either codebase; fix it where it belongs.

Find the root cause and fix it. When you are done, state the root cause in one sentence.
