import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { flushQueue } from "./src/scheduler.js";
import { outbox, resetOutbox } from "./src/transport.js";

const at = (utcHour) => new Date(Date.UTC(2026, 5, 11, utcHour, 0, 0));
const queueFor = (id) => [{ userId: id, message: "hello" }];

beforeEach(resetOutbox);

test("UTC+5 user is quiet at 23:00 local even though it is 18:00 UTC", () => {
  const user = { id: "u1", name: "A", tzOffsetHours: 5, quiet: { start: 22, end: 7 } };
  const sent = flushQueue(queueFor("u1"), [user], at(18));
  assert.deepEqual(sent, []);
  assert.equal(outbox.length, 0);
});

test("UTC-8 user receives digests during their local afternoon", () => {
  const user = { id: "u2", name: "B", tzOffsetHours: -8, quiet: { start: 22, end: 7 } };
  const sent = flushQueue(queueFor("u2"), [user], at(23)); // 15:00 local
  assert.deepEqual(sent, ["u2"]);
});

test("UTC user quiet window still works", () => {
  const user = { id: "u3", name: "C", tzOffsetHours: 0, quiet: { start: 22, end: 7 } };
  assert.deepEqual(flushQueue(queueFor("u3"), [user], at(23)), []);
  assert.deepEqual(flushQueue(queueFor("u3"), [user], at(12)), ["u3"]);
});

test("users without quiet hours always receive digests", () => {
  const user = { id: "u4", name: "D", tzOffsetHours: 9 };
  assert.deepEqual(flushQueue(queueFor("u4"), [user], at(3)), ["u4"]);
});
