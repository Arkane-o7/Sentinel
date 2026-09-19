# Contributing to Sentinel

Keep the focus on trajectory drift and semantic circumvention. Preserve upstream adapters and license notices. Add a regression test for meaningful policy or integration changes.

Run `npm ci` and `npm run verify`. Unit tests are explicitly mocked. Live detection claims require `npm run demo -- --headless` and `npm run evaluate` with real Jev credentials; include actual model/backend and results, including failures. Never commit API credentials, private session state, or real secrets. Demo values must remain fake.

The README and NOTICE identify inherited work. Archived upstream material is historical context, not Sentinel verification evidence. Update adapter coverage and limitations when behavior changes. Keep local runtime dependencies small and do not add a service dependency merely for visual polish.
