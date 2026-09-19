import { cpSync, mkdirSync, rmSync } from "node:fs";
// A relocatable runtime bundle; upstream remains directly executable without transpilation.
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const file of [
  "src",
  "dashboard",
  "demo",
  "hooks",
  "extensions",
  "package.json",
  "LICENSE",
  "README.md",
  "NOTICE",
  "plugin.json",
  "gemini-extension.json",
  ".claude-plugin",
  ".codex-plugin",
  ".cursor-plugin",
])
  cpSync(file, `dist/${file}`, { recursive: true });
console.log("Built dist/ (Node runtime, hooks, dashboard, safe demo fixtures)");
