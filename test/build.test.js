import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("relocated runtime bundle includes manifest assets and marketplace metadata", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const staging = mkdtempSync(join(tmpdir(), "sentinel-bundle-"));
  try {
    for (const file of [
      "src", "dashboard", "demo", "hooks", "extensions", "package.json",
      "LICENSE", "README.md", "NOTICE", "plugin.json", "gemini-extension.json",
      ".claude-plugin", ".codex-plugin", ".cursor-plugin", ".agents",
    ]) cpSync(join(root, file), join(staging, file), { recursive: true });
    mkdirSync(join(staging, "assets"));
    for (const file of ["icon.svg", "icon-512.png", "works-with.svg"])
      cpSync(join(root, "assets", file), join(staging, "assets", file));
    execFileSync(process.execPath, [join(root, "scripts/build.js")], { cwd: staging });
    const bundle = join(staging, "dist");
    const manifest = JSON.parse(readFileSync(join(bundle, ".cursor-plugin/plugin.json"), "utf8"));
    assert.ok(existsSync(join(bundle, manifest.logo)), `Missing manifest asset: ${manifest.logo}`);
    assert.ok(existsSync(join(bundle, ".agents/plugins/marketplace.json")));
    assert.match(execFileSync(process.execPath, [join(bundle, "src/cli.js")],
      { cwd: tmpdir(), encoding: "utf8" }), /Sentinel/);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
});
