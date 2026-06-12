import { parseDuration } from "./clock.js";

export function createSession(userId, config, nowSeconds) {
  return {
    userId,
    createdAt: nowSeconds,
    expiresAt: nowSeconds + parseDuration(config.sessionTtl),
  };
}

export function isSessionValid(session, nowSeconds) {
  return nowSeconds < session.expiresAt;
}
