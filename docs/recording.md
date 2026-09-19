# Reproducible launch recording

The recording must be based on real saved judgments. Do not use unit-test fixtures as launch footage.

```bash
npm ci
# Set JEV_API_KEY or AI_GATEWAY_API_KEY locally.
npm run demo -- --headless
# Must exit 0 and write artifacts/demo-run.json with passed:true.
npx playwright install chromium
npm run record
```

The recorder opens an isolated headless browser at 1440×1280, starts a visibly labeled replay of the successful capture, compresses the captured timeline to 31 seconds, holds the final frame for five seconds, and writes `artifacts/sentinel-demo.webm`. If ffmpeg is installed it also creates `artifacts/sentinel-demo.mp4`. Total footage is approximately 39 seconds. API latency is not misrepresented as live latency because the UI labels this as recorded replay.

If the automated recorder is unavailable:

1. Run `npm run demo -- --replay` after the successful live run.
2. Open http://127.0.0.1:4317 at a desktop width of at least 1280px.
3. Start screen recording, hold the initial task for 2–3 seconds, then click **Replay captured demo**.
4. The replay advances through allowed research, detected untrusted instructions, the denied fake-secret read, and the denied workaround using original captured decisions and scores.
5. Hold the final complete timeline and graph for 5 seconds. The page already includes “Your agent didn't go rogue in one tool call. Sentinel watches the trajectory.”
6. Export as `artifacts/sentinel-demo.mp4`. Do not crop away the replay label.

For a live presentation, use `npm run demo` instead. Live Jev outcomes are probabilistic; the script reports a failed scenario instead of inventing the expected verdicts. Run and inspect the demo before presenting publicly.
