# Verification status

Verified locally on 2026-09-20 with Node.js 22.23.1. This is an implementation report, not a claim of live model accuracy.

| Check | Actual outcome |
| --- | --- |
| Upstream baseline before edits | 12/13 passed; installer depended on checkout directory name |
| Inherited action-local regression suite | 13/13 passed after installer correction and rebranding |
| Sentinel unit/integration suite | 21/21 passed (explicitly mocked Jev responses) |
| Combined `npm test` | 34/34 passed |
| `npm run typecheck` | Passed; strict JSDoc checks on trajectory core and TS types |
| `npm run lint` | Passed on runtime, tests, dashboard and scripts |
| `npm run build` | Passed; native manifest and runnable CLI present in dist |
| `npm run test:browser` | Passed; Chromium desktop/mobile, graph/timeline, text escaping, no JS errors |
| Visual inspection | Desktop and 390px mobile screenshots inspected; populated states labeled UI test fixtures |
| Package dry run | Required runtime, demo fixtures, evaluation inputs, extension and license present; no private session/config data |
| MIT license | Byte-for-byte unchanged from upstream main/base commit |
| Branding audit | Runtime branding is Sentinel; retained upstream references are attribution, historical materials and compatibility variables/config fallback |
| Live demo | Attempted with a configured Gateway credential; exits 3 on provider HTTP 403 (`customer_verification_required`) |
| Small synthetic evaluation | Attempted: 38 of 40 mode/case runs failed on provider HTTP 403; two action-local cases completed entirely via upstream read-only skips. Zero successful model-backed cases; no accuracy conclusions. |
| Launch recording | Attempted; correctly refuses without a successful real Jev capture |

Local evidence: [verification log](../artifacts/verification.log), [browser checks](../artifacts/browser-check.log), and [unscored dashboard screenshot](../artifacts/dashboard.png). The evaluation runner writes `artifacts/evaluation.json` (ignored by Git) and records provider errors separately from completed cases. The two skip-only baseline completions are not evidence of model quality.

## What remains before a public launch

1. Resolve Gateway account verification or configure another working Jev backend. The credential is stored locally outside the repository; no secret is committed.
2. Run `npm run demo -- --headless` and inspect the real verdicts. All normal steps must allow, content must be flagged, and both credential attempts must deny with circumvention detected on the retry.
3. Run `npm run evaluate`; inspect actual detection/false-block rates and per-step errors. Tune transparent thresholds only with recorded evidence, then rerun changed cases and the full small set.
4. Run `npm run record` to produce the labeled real-capture replay video, or follow the exact manual recording flow.
5. Update the README's live validation status and add the resulting video. Publish the fork only when those checks meet the intended demo behavior.

No live agent application has been installed or reconfigured on the user's machine by this task. Installer tests use isolated temporary homes. Integration claims are limited to payload/API tests until independently exercised with real hosts.
