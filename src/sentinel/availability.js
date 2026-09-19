// Sentinel defaults to pausing on unavailable judgment. Upstream compatibility mode retains its policy.
export function failClosed(env = process.env) {
  return env.SENTINEL_MODE === "action-local"
    ? !!env.JEV_GUARD_FAIL_CLOSED
    : env.SENTINEL_FAIL_OPEN !== "1";
}
