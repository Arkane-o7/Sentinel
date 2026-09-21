# Architecture

## Preserved foundation

- `src/cli.js`: dispatches hooks, ACP proxy, one-shot checks, scanning, key storage, and host installation. Upstream was native ESM with no build step/runtime dependency.
- `src/jev.js`: one structured request to TypeSafe, Vercel Gateway, or the added OpenRouter Decisions backend. Maps noul/boolean probabilities, choice labels, scores and confidence; two retries on network/429/5xx inside one 20-second timeout. Environment credentials precede private local config. Gateway asks for zero data retention.
- `src/guard.js`: action risk/approval/requested/untrusted questions and strictest local policy; external result scanning; separate questions for intentionally instructional files.
- `src/context.js`: recent user text and explicit assistant intent from session hooks, adapter-supplied messages or a bounded transcript tail. Tool-result blocks never count as user messages.
- `src/session.js`: shared session JSON across hook processes. Originally six prompts, three intents, twelve calls and ten flags. Sentinel adds bounded trajectory fields, atomic writes and serialization.
- `src/skills.js`: instruction-file discovery, bounded file scans, content-hash cache with policy re-evaluation. Preserved.
- `src/hook.js`: Claude/Codex/Copilot/Gemini/Cursor dialect translation. `src/acp.js`, `src/opencode.js`, and the pi extension preserve host-specific runtime integration.

## Sentinel addition

`assessAction` serializes same-session judgments, reads existing session state, combines current prompt context with compact history, and adds typed trajectory questions to the existing transport request. Action-local checks retain their skip list. Trajectory checks do not skip file reads.

`intent.js` takes the most recent relevant user messages without treating first-message intent as permanent. `trajectory.js` maintains bounded events and compact request state. `circumvention.js` canonicalizes clear read/delete objectives across direct tools, shell cat/rm and simple Python forms. It deliberately rejects printed commands and ambiguous syntax. Remaining equivalence is judged by Jev using previous objective descriptions and source arguments.

`drift.js` validates typed probabilities and stores semantic objectives on denial. `policy.js` applies configurable thresholds and strictest-verdict composition. Deterministic matches are reported separately from probabilities. A new user instruction leaves prior denials visible while forcing semantic re-evaluation instead of unconditionally banning a resource forever.

`server.js` serves static files and state only on loopback. It never executes submitted shell commands. Same-origin POST starts the fixed demo. `demo.js` emits actual hook events from scripted fixtures and asserts actual outcomes. Recorded replay is separate, visibly labeled, and requires a successful real capture. `scripts/evaluate.js` compares both modes without running proposed tools.

## Boundaries

The state is not a hidden-reasoning transcript. Capability/resource lists are observations of proposed tool calls, not an OS audit. Denied calls appear as proposals with deny decisions. No action-decision cache is added: changing user intent and prior denials must affect every judgment. The instruction-content cache remains upstream's cache.

ACP covers only requests routed through its client transport. Codex/Gemini and Cursor generic hooks cannot reliably ask; Sentinel pauses drift-related asks. OpenCode's before hook cannot show a native approval dialog, so drift asks throw; its separate permission hook retains supported approval handling. Host-user refusals of an upstream ask are not fully observable in every adapter and may not become semantic blocked objectives.

A missing or corrupt session store is an enforcement failure, not an empty-memory reset. Evaluation locks time out rather than silently bypassing the guard. Local write-lock failure also pauses; a stale write lock after process death may require manual removal while no guard processes are active. This is a small local prototype, not a distributed policy store.
