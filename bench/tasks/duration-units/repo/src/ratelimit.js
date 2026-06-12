import { parseDuration } from "./clock.js";

export function makeLimiter(config) {
  const hits = new Map();
  const windowSeconds = parseDuration(config.rateLimitWindow);
  return function allow(key, nowSeconds) {
    const cutoff = nowSeconds - windowSeconds;
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= config.rateLimitMax) return false;
    recent.push(nowSeconds);
    hits.set(key, recent);
    return true;
  };
}
