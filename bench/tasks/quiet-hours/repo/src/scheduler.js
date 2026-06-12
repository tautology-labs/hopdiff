import { groupByUser, buildDigest } from "./digest.js";
import { shouldSend } from "./quiet.js";
import { deliver } from "./transport.js";

export function flushQueue(queue, users, now) {
  const grouped = groupByUser(queue);
  const sent = [];
  for (const [userId, items] of grouped) {
    const user = users.find((u) => u.id === userId);
    if (!user) continue;
    if (!shouldSend(user, now)) continue;
    deliver(user, buildDigest(user, items));
    sent.push(userId);
  }
  return sent;
}
