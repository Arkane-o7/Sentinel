import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { backend } from "../jev.js";
import { readSession } from "../session.js";
import { ROOT, runDemo, DEMO_INTENT } from "./demo.js";
export async function serveDashboard({
  port = Number(process.env.SENTINEL_PORT ?? 4317),
  sessionId,
  replay = false,
} = {}) {
  let state = {
    phase: "Ready",
    mode: replay ? "replay" : "live",
    intent: DEMO_INTENT,
    configured: replay || !!backend(),
    running: false,
    trajectory: null,
  };
  let active = false;
  const send = (res, status, body, type = "application/json") => {
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };
  const server = createServer(async (req, res) => {
    try {
      // Reject DNS rebinding and cross-origin requests to this local service.
      const expectedHost = `127.0.0.1:${server.address().port}`;
      if (
        ![expectedHost, `localhost:${server.address().port}`].includes(
          req.headers.host,
        )
      )
        return send(res, 403, { error: "Loopback host required" });
      const origin = req.headers.origin;
      if (
        origin &&
        ![
          `http://${expectedHost}`,
          `http://localhost:${server.address().port}`,
        ].includes(origin)
      )
        return send(res, 403, { error: "Same origin required" });
      const path = new URL(req.url, `http://${expectedHost}`).pathname;
      if (req.method === "GET" && path === "/api/state") {
        if (sessionId)
          state = {
            ...state,
            sessionId,
            trajectory: readSession(sessionId).trajectory ?? null,
            phase: "Watching agent session",
            configured: replay || !!backend(),
          };
        return send(res, 200, {
          ...state,
          running: active,
          configured: replay || !!backend(),
        });
      }
      if (req.method === "POST" && path === "/api/demo") {
        if (sessionId)
          return send(res, 409, {
            error: "This dashboard watches an existing session",
          });
        if (req.headers["content-type"] !== "application/json" || !origin)
          return send(res, 403, { error: "Same-origin JSON request required" });
        if (active) return send(res, 409, { error: "Demo already running" });
        if (!replay && !backend())
          return send(res, 503, {
            error:
              "Configure a Jev credential locally first. No fake judgments are used.",
          });
        active = true;
        state = { ...state, error: null, trajectory: null };
        send(res, 202, { started: true });
        try {
          if (replay) {
            const capture = JSON.parse(
              readFileSync(resolve(ROOT, "artifacts/demo-run.json"), "utf8"),
            );
            if (!capture.passed || capture.version !== 1)
              throw new Error(
                "A successful real Jev demo capture is required for replay",
              );
            const start = capture.snapshots[0].updated;
            const end = capture.snapshots.at(-1).updated;
            let previous = 0;
            for (const snapshot of capture.snapshots) {
              const target =
                ((snapshot.updated - start) / Math.max(1, end - start)) * 31000;
              await new Promise((r) =>
                setTimeout(r, Math.max(0, target - previous)),
              );
              previous = target;
              state = {
                ...snapshot,
                mode: "replay",
                capturedAt: capture.generatedAt,
              };
            }
          } else
            await runDemo({
              onChange: (next) => {
                state = next;
              },
            });
        } catch (err) {
          state = {
            ...state,
            error: err.message,
            phase: "Run needs attention",
          };
        } finally {
          active = false;
        }
        return;
      }
      const files = {
        "/": ["dashboard/index.html", "text/html"],
        "/app.js": ["dashboard/app.js", "text/javascript"],
        "/style.css": ["dashboard/style.css", "text/css"],
      };
      if (req.method === "GET" && files[path]) {
        const [file, type] = files[path];
        return send(res, 200, readFileSync(resolve(ROOT, file)), type);
      }
      return send(res, 404, { error: "Not found" });
    } catch (err) {
      if (!res.headersSent)
        send(res, 500, { error: `Dashboard unavailable: ${err.message}` });
      else res.end();
    }
  });
  if (replay && !existsSync(resolve(ROOT, "artifacts/demo-run.json")))
    throw new Error("Run a real Jev demo before requesting replay");
  await new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(port, "127.0.0.1", res);
  });
  console.log(
    `Sentinel dashboard: http://127.0.0.1:${server.address().port}${replay ? " (recorded Jev replay)" : ""}`,
  );
  return server;
}
