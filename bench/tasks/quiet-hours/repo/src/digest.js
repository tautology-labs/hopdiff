export function groupByUser(queue) {
  const grouped = new Map();
  for (const item of queue) {
    const list = grouped.get(item.userId);
    if (list) list.push(item);
    else grouped.set(item.userId, [item]);
  }
  return grouped;
}

export function buildDigest(user, items) {
  const lines = items.map((i) => `- ${i.message}`);
  return `Hi ${user.name}, you have ${items.length} update(s):\n${lines.join("\n")}`;
}
