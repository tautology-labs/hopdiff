const UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 600,
  d: 86400,
};

// Parse config durations like "30s", "15m", "10h", "7d" into seconds.
export function parseDuration(text) {
  const match = /^(\d+)([smhd])$/.exec(text.trim());
  if (!match) throw new Error(`invalid duration: ${text}`);
  return Number(match[1]) * UNIT_SECONDS[match[2]];
}
