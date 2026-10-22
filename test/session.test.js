import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSession, remember, sessionFile } from "../src/session.js";
import { emptyTrajectory } from "../src/sentinel/trajectory.js";

test("invalid session shapes fail instead of becoming an empty history", () => {
  const previous = process.env.SENTINEL_SESSIONS;
  const dir = mkdtempSync(join(tmpdir(), "sentinel-session-schema-"));
  process.env.SENTINEL_SESSIONS = dir;
  try {
    const trajectory = emptyTrajectory("invalid");
    for (const state of [
      null, [], false, 7, "not a session",
      { prompts: null }, { flags: {} }, { calls: [null] },
      { trajectory: null }, { trajectory: [] },
      { trajectory: { ...trajectory, blockedObjectives: null } },
      { trajectory: { ...trajectory, events: [null] } },
      { trajectory: { ...trajectory, blockedObjectives: [{}] } },
    ]) {
      writeFileSync(sessionFile("invalid"), JSON.stringify(state));
      assert.throws(() => readSession("invalid"), /refusing to silently forget denials/,
        JSON.stringify(state));
    }
    assert.deepEqual(readSession("missing").prompts, []);
    writeFileSync(sessionFile("legacy"), JSON.stringify({ prompts: [{ text: "Research" }] }));
    assert.equal(readSession("legacy").prompts[0].text, "Research");
    assert.deepEqual(readSession("legacy").flags, []);
    remember("current", "prompts", { text: "Inspect source" });
    assert.match(readSession("current").trajectory.activeUserIntent, /Inspect source/);
  } finally {
    if (previous === undefined) delete process.env.SENTINEL_SESSIONS;
    else process.env.SENTINEL_SESSIONS = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
