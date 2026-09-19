# Security

Sentinel is a guardrail and research prototype, not a security sandbox. Jev judgments are probabilistic, integrations can potentially be bypassed, and false positives/negatives are possible.

Sentinel sends action arguments, recent user context, bounded trajectory state and scanned tool content to TypeSafe or Vercel AI Gateway. Do not assume local redaction prevents sensitive data from reaching the model provider. The dashboard binds to loopback and applies same-origin checks; it is not designed for remote/multi-user hosting.

Action judgment failures pause by default in Sentinel mode. `SENTINEL_FAIL_OPEN=1` explicitly weakens that behavior. Action-local compatibility mode preserves upstream's failure policy. Post-tool hooks cannot undo an action that already completed.

Before publishing this fork, enable private security reporting on its GitHub repository. Report security findings privately to that repository's maintainers; do not include real credentials or private transcripts in a public issue. This local checkout has no published Sentinel reporting endpoint yet. Upstream vulnerabilities can be reported through [jev-guard's private advisory flow](https://github.com/leepokai/jev-guard/security/advisories/new).
