import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFilesAt, WORKTREE } from "./git.js";

function git(args: string[], cwd: string): void {
  execFileSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@test", ...args],
    { cwd, stdio: "ignore" },
  );
}

test("readFilesAt batch-reads files at a commit and on the worktree", (t) => {
  const repo = mkdtempSync(join(tmpdir(), "flowdiff-git-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  // Multibyte content makes the byte-size header differ from the
  // character count, exercising the buffer-offset parsing.
  const snowman = "export const snow = '☃ naïve';\n";
  writeFileSync(join(repo, "a.ts"), "export function a() {}\n");
  writeFileSync(join(repo, "b.ts"), snowman);
  git(["init"], repo);
  git(["add", "."], repo);
  git(["commit", "-m", "init"], repo);

  const atHead = readFilesAt("HEAD", ["a.ts", "b.ts", "gone.ts"], repo);
  assert.equal(atHead.get("a.ts"), "export function a() {}\n");
  assert.equal(atHead.get("b.ts"), snowman);
  assert.equal(atHead.get("gone.ts"), null);

  // Worktree reads come straight from disk, including uncommitted files.
  writeFileSync(join(repo, "new.ts"), "export const fresh = 1;\n");
  const atWorktree = readFilesAt(WORKTREE, ["new.ts", "gone.ts"], repo);
  assert.equal(atWorktree.get("new.ts"), "export const fresh = 1;\n");
  assert.equal(atWorktree.get("gone.ts"), null);

  assert.equal(readFilesAt("HEAD", [], repo).size, 0);
});
