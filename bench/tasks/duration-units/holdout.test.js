import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, isSessionValid } from "./src/sessions.js";
import { makeLimiter } from "./src/ratelimit.js";
import { loadConfig } from "./src/config.js";

test("10h sessions survive 9 hours and die after 10", () => {
  const config = loadConfig();
  const session = createSession("u1", config, 0);
  assert.equal(isSessionValid(session, 9 * 3600), true);
  assert.equal(isSessionValid(session, 10 * 3600 + 1), false);
});

test("minute-based sessions are unaffected", () => {
  const config = loadConfig({ sessionTtl: "90m" });
  const session = createSession("u1", config, 0);
  assert.equal(isSessionValid(session, 89 * 60), true);
  assert.equal(isSessionValid(session, 91 * 60), false);
});

test("the unreported symptom: hour-based rate-limit windows are also correct", () => {
  const allow = makeLimiter(loadConfig({ rateLimitWindow: "1h", rateLimitMax: 1 }));
  assert.equal(allow("k", 0), true);
  assert.equal(allow("k", 1800), false, "still inside the 1h window at 30min");
  assert.equal(allow("k", 3700), true, "outside the window after 61min");
});
