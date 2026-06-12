export function ratioFor(events, predicate) {
  if (events.length === 0) return 0;
  return events.filter(predicate).length / events.length;
}

export function countFor(events, predicate) {
  return events.filter(predicate).length;
}
