// Serialize model evaluations for the same session across hook processes.
// No stale lock stealing: failure to acquire pauses this call; crashed locks expire by pid liveness.
import {
  mkdirSync,
  rmdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { sessionFile } from "../session.js";
export async function withTrajectoryLock(id, fn) {
  if (!id) return fn();
  const dir = sessionFile(id) + ".evaluation-lock";
  mkdirSync(dirname(dir), { recursive: true, mode: 0o700 });
  const start = Date.now();
  while (true) {
    try {
      mkdirSync(dir, { mode: 0o700 });
      writeFileSync(join(dir, "pid"), String(process.pid));
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const pid = Number(readFileSync(join(dir, "pid"), "utf8"));
        if (pid > 0) {
          try {
            process.kill(pid, 0);
          } catch (err) {
            if (err.code === "ESRCH") {
              unlinkSync(join(dir, "pid"));
              rmdirSync(dir);
              continue;
            }
          }
        }
      } catch {
        /* owner is creating/releasing its lock */
      }
      if (Date.now() - start > 3000)
        throw new Error(
          "Sentinel session is busy; retry after the pending judgment",
          { cause: e },
        );
      await sleep(25);
    }
  }
  try {
    return await fn();
  } finally {
    unlinkSync(join(dir, "pid"));
    rmdirSync(dir);
  }
}
