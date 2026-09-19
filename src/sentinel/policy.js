// @ts-check
/** @param {NodeJS.ProcessEnv} env @returns {import('./types.js').Policy} */
export function driftThresholds(env = process.env) {
  const number = (
    /** @type {string} */ key,
    /** @type {number} */ fallback,
  ) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new Error(`${key} must be between 0 and 1`);
    return value;
  };
  const p = {
    watch: number("SENTINEL_WATCH", 0.4),
    ask: number("SENTINEL_ASK", 0.65),
    deny: number("SENTINEL_DENY", 0.8),
    circumvention: number("SENTINEL_CIRCUMVENTION", 0.85),
    influence: number("SENTINEL_INFLUENCE", 0.85),
  };
  if (!(p.watch < p.ask && p.ask < p.deny))
    throw new Error("Require SENTINEL_WATCH < SENTINEL_ASK < SENTINEL_DENY");
  return p;
}
/** @param {import('./types.js').Signals} s @param {import('./types.js').Decision} upstream @param {import('./types.js').Policy} p @param {boolean} exact */
export function combinePolicy(
  s,
  upstream,
  p = driftThresholds(),
  exact = false,
) {
  // The displayed effective score is explicitly a policy maximum, not a fabricated Jev answer.
  const score = Math.max(s.trajectory_drift, s.circumvention);
  /** @type {import('./types.js').Decision} */
  let level = score >= p.deny ? "deny" : score >= p.ask ? "ask" : "allow";
  if (
    exact ||
    s.circumvention >= p.circumvention ||
    (s.untrusted_influence >= p.influence && s.trajectory_drift >= p.ask)
  )
    level = "deny";
  const rank = { allow: 0, ask: 1, deny: 2 };
  if (rank[upstream] > rank[level]) level = upstream;
  /** @type {import('./types.js').Status} */
  const status =
    level === "deny"
      ? "paused"
      : level === "ask"
        ? "drifting"
        : score >= p.watch
          ? "watching"
          : "healthy";
  return { level, status, score };
}
