import { test } from "node:test";
import assert from "node:assert/strict";
import { driftThresholds } from "../src/sentinel/policy.js";

test("explicitly blank thresholds are invalid rather than interpreted as zero", () => {
  for (const key of [
    "SENTINEL_WATCH", "SENTINEL_ASK", "SENTINEL_DENY",
    "SENTINEL_CIRCUMVENTION", "SENTINEL_INFLUENCE",
  ]) {
    for (const value of ["", " ", "\t\n"]) {
      assert.throws(() => driftThresholds({ [key]: value }),
        new RegExp(`${key} must be`), `${key}=${JSON.stringify(value)}`);
    }
  }
});

test("unset thresholds retain defaults and explicit zero remains valid", () => {
  assert.deepEqual(driftThresholds({}), {
    watch: 0.4, ask: 0.65, deny: 0.8, circumvention: 0.85, influence: 0.85,
  });
  assert.equal(driftThresholds({ SENTINEL_WATCH: "0" }).watch, 0);
  assert.equal(driftThresholds({ SENTINEL_CIRCUMVENTION: "0" }).circumvention, 0);
  assert.equal(driftThresholds({ SENTINEL_INFLUENCE: " 0.9 " }).influence, 0.9);
});
