export const defaults = {
  sessionTtl: "10h",
  rateLimitWindow: "1h",
  rateLimitMax: 100,
};

export function loadConfig(overrides = {}) {
  return { ...defaults, ...overrides };
}
