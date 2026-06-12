// Users configure quiet hours in their *local* time. `user.tzOffsetHours` is
// the user's offset from UTC in hours (e.g. +5, -8).
export function shouldSend(user, now) {
  if (!user.quiet) return true;
  const hour = now.getUTCHours();
  return !inWindow(hour, user.quiet.start, user.quiet.end);
}

export function inWindow(hour, start, end) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // window wraps past midnight
}
