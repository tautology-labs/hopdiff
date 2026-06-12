Bug report:

`eslint --fix` is corrupting files. When a single file has two auto-fixable problems whose edits sit immediately next to each other (the first edit ends exactly where the second begins), this version applies both edits in the same pass and the result is wrong — characters get dropped or duplicated. Previously, when two fixes touched like this, eslint applied one and left the other for the next pass, so the output stayed correct. Fixes that are well separated still work, and a file with only one fixable problem is fine.

Find the root cause and fix it. Do not change any public API, and don't weaken the surrounding protections (genuinely overlapping fixes and negative-range fixes must still be held back). When you are done, state the root cause in one sentence.
