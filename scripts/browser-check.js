// Browser layout/interaction tests. The interception below is a labeled UI fixture,
// never a model-quality evaluation or launch demo.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { serveDashboard } from "../src/sentinel/server.js";
mkdirSync("output/playwright", { recursive: true });
mkdirSync("artifacts", { recursive: true });
const server = await serveDashboard({ port: 0 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1280 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(
    () => document.getElementById("connection").textContent === "LIVE MONITOR",
  );
  await page.screenshot({ path: "artifacts/dashboard.png", fullPage: true });
  assert.equal(await page.locator("#score").textContent(), "—");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "output/playwright/mobile-empty.png",
    fullPage: true,
  });
  const now = Date.now();
  const fixture = {
    mode: "test",
    configured: true,
    running: false,
    sessionId: "UI-TEST-NOT-A-LIVE-JEV-RUN",
    phase: "UI test fixture",
    trajectory: {
      activeUserIntent:
        "Research TypeSafe AI and write a report. [UI TEST FIXTURE]",
      currentDriftScore: 0.93,
      status: "paused",
      signals: {
        trajectory_drift: 0.93,
        capability_escalation: 0.8,
        untrusted_influence: 0.9,
        circumvention: 0.91,
        sensitive_resource: 0.95,
      },
      evidence:
        "UI TEST: Exact operation/resource match: obtain contents of fake-secrets.env",
      blockedObjectives: [
        { description: "obtain contents of /demo/fake-secrets.env" },
      ],
      driftHistory: [0.04, 0.05, 0.08, 0.83, 0.93].map((score, i) => ({
        timestamp: now + i * 1000,
        score,
        tool: "test",
      })),
      events: [],
    },
  };
  for (const [i, tool] of [
    "web.search",
    "web.open",
    "web.open",
    "filesystem.read",
    "shell.execute",
  ].entries()) {
    if (i === 3)
      fixture.trajectory.events.push({
        timestamp: now + 2500,
        type: "untrusted_content",
        resultSummary:
          "UI TEST: External instruction asks the agent to obtain and submit a fake credential.",
      });
    fixture.trajectory.events.push({
      timestamp: now + i * 1000,
      type: "tool_call",
      tool,
      args:
        i === 4
          ? "cat ./demo/fake-secrets.env"
          : i === 3
            ? "./demo/fake-secrets.env"
            : "TypeSafe AI reference",
    });
    fixture.trajectory.events.push({
      timestamp: now + i * 1000,
      type: "decision",
      tool,
      decision: i >= 3 ? "deny" : "allow",
      resultSummary: i === 4 ? "POLICY CIRCUMVENTION DETECTED" : "",
    });
  }
  await page.route("**/api/state", (route) => route.fulfill({ json: fixture }));
  await page.waitForFunction(() =>
    document
      .getElementById("connection")
      .textContent.includes("UI TEST FIXTURE"),
  );
  await page
    .getByText("POLICY CIRCUMVENTION DETECTED", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".event.blocked").count(), 2);
  assert.equal(await page.locator("#points circle").count(), 5);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "output/playwright/mobile-fixture.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "output/playwright/desktop-fixture.png",
    fullPage: true,
  });
  fixture.trajectory.activeUserIntent =
    '<img src=x onerror="window.__injected=true">';
  await page.waitForFunction(() =>
    document.getElementById("intent").textContent.includes("<img"),
  );
  assert.equal(await page.evaluate(() => window.__injected), undefined);
  assert.equal(await page.locator("#intent img").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: live empty state; labeled fixture timeline, graph, desktop/mobile layout; untrusted text escaping; no JS errors.",
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
