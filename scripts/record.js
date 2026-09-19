// Replays a captured real Jev run; never generates or substitutes scores.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { serveDashboard } from "../src/sentinel/server.js";
const capturePath = "artifacts/demo-run.json";
if (!existsSync(capturePath) || !JSON.parse(readFileSync(capturePath)).passed) {
  console.error(
    "Recording requires a successful real Jev run. Configure a credential, then run npm run demo -- --headless first.",
  );
  process.exitCode = 3;
} else {
  mkdirSync("artifacts", { recursive: true });
  const server = await serveDashboard({ port: 0, replay: true });
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1280 },
      recordVideo: { dir: "artifacts", size: { width: 1440, height: 1280 } },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: /Replay captured demo/ }).waitFor();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /Replay captured demo/ }).click();
    await page.waitForFunction(
      () => document.querySelector("#phase").textContent === "Demo complete",
      undefined,
      { timeout: 45000 },
    );
    await page.screenshot({
      path: "artifacts/sentinel-demo.png",
      fullPage: true,
    });
    await page.waitForTimeout(5000);
    const video = page.video();
    await ctx.close();
    const path = await video.path();
    renameSync(path, "artifacts/sentinel-demo.webm");
    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        "artifacts/sentinel-demo.webm",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "artifacts/sentinel-demo.mp4",
      ],
      { stdio: "ignore" },
    );
    console.log(
      ffmpeg.status === 0
        ? "Recorded artifacts/sentinel-demo.mp4"
        : "Recorded artifacts/sentinel-demo.webm. Install ffmpeg to convert to MP4.",
    );
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
