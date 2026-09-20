# Configuration

Environment values are strings. Thresholds must be finite in `[0,1]`, with watch < ask < deny. Invalid trajectory thresholds fail the judgment instead of quietly weakening policy.

| Setting | Default | Meaning |
| --- | --- | --- |
| `SENTINEL_MODE` | `trajectory` | `action-local` reproduces upstream action checks and read-only skip behavior |
| `SENTINEL_WATCH` | `0.40` | Watching boundary |
| `SENTINEL_ASK` | `0.65` | Ask/pause boundary |
| `SENTINEL_DENY` | `0.80` | Deny boundary |
| `SENTINEL_CIRCUMVENTION` | `0.85` | Semantic circumvention override |
| `SENTINEL_INFLUENCE` | `0.85` | Untrusted influence override with drift >= ask |
| `SENTINEL_FAIL_OPEN` | unset | Set exactly `1` to allow action judgment errors; not recommended for enforcement |
| `SENTINEL_CONFIG` | `~/.sentinel/config.json` | Credential configuration path; upstream config is fallback when no explicit path is set |
| `SENTINEL_SESSIONS` | `~/.sentinel/sessions` | Local private state directory |
| `SENTINEL_PORT` | `4317` | Dashboard port, bound to 127.0.0.1 |
| `OPENROUTER_API_KEY` | unset | OpenRouter credential (first environment precedence) |
| `JEV_API_KEY` | unset | TypeSafe credential |
| `AI_GATEWAY_API_KEY` | unset | Vercel AI Gateway credential |
| `VERCEL_OIDC_TOKEN` | unset | Gateway OIDC credential |
| `JEV_MODEL` | backend default | `typesafe/jev-1.13` OpenRouter / `jev-latest` direct / `typesafe-ai/jev` gateway |
| `JEV_GUARD_TIMEOUT_MS` | `20000` | Total request budget, including up to two retries |
| `JEV_GUARD_DENY_SCORE` | `2.5` | Upstream critical risk boundary on 0–3 scale |
| `JEV_GUARD_ASK_SCORE` | `1.5` | Upstream approval risk boundary |
| `JEV_GUARD_ASK_P` | `0.75` | Upstream approval probability |
| `JEV_GUARD_USER_P` | `0.85` | Explicit-user-request threshold |
| `JEV_GUARD_UNTRUSTED_P` | `0.70` | Upstream untrusted-instruction denial |
| `JEV_GUARD_INJECT_P` | `0.60` | External-content flagging |
| `JEV_GUARD_SKILL_P` | `0.80` | Unexpected instruction side effects |
| `JEV_GUARD_SKILL_SERIOUS_P` | `0.45` | Serious instruction-file finding |
| `JEV_GUARD_SKIP_TOOLS` | empty | Comma-separated upstream local-check skips; does **not** skip trajectory checking |
| `JEV_GUARD_SKIP_SCAN` | empty | Comma-separated content scan skips |
| `JEV_GUARD_CONFIG` | unset | Compatibility alias for configuration file |
| `JEV_GUARD_SESSIONS` | unset | Compatibility alias for session directory |
| `JEV_GUARD_SCAN_CACHE` | `~/.sentinel/scan-cache.json` | Upstream instruction-scan cache |
| `JEV_GUARD_FAIL_CLOSED` | unset | In action-local compatibility mode, retain upstream fail-open unless set |

Session flags retain 10 sources, objectives 24, events 60, and chart history 100 judgments. Jev receives smaller bounded subsets. Upstream pruning removes week-old sessions only when the session count exceeds 200; it is not a guaranteed seven-day deletion policy. Users can delete session files to reset history, which also removes circumvention memory. Do so only when no hooks for that session are running.

The dashboard takes a host session ID, not a state-file path. State filenames are hashes and are not exposed as a directory listing. The dashboard serves bounded result excerpts, paths, argument summaries and user intent, which can remain sensitive despite best-effort redaction. It does not serve API credentials or entire raw result bodies.

## Provider selection

Explicit environment credentials win over saved configuration: `OPENROUTER_API_KEY`, then `JEV_API_KEY`, then `AI_GATEWAY_API_KEY`, then `VERCEL_OIDC_TOKEN`. Without one, saved `openRouterApiKey`, `jevApiKey`, then `aiGatewayApiKey` are tried in that order. A failed request never silently switches providers.

OpenRouter sends native `state` and `questions` to `https://openrouter.ai/api/alpha/decisions`, with model `typesafe/jev-1.13`. This is an alpha API, so its contract may change. TypeSafe uses `https://api.typesafe.ai/v1/systemone`; Vercel uses `https://ai-gateway.vercel.sh/v4/ai/evaluation-model`. Only the Vercel request includes the inherited zero-data-retention option; do not infer equivalent retention policies for other providers.
