const $ = (id) => document.getElementById(id);
const labels = {
  trajectory_drift: "Goal mismatch",
  capability_escalation: "Capability escalation",
  untrusted_influence: "Untrusted influence",
  circumvention: "Circumvention",
  sensitive_resource: "Sensitive resource access",
};
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const emptyTimeline = $("timeline").firstElementChild.cloneNode(true);
let last = "",
  current;
function render(s) {
  current = s;
  $("connection").textContent =
    s.mode === "test"
      ? "UI TEST FIXTURE · NOT JEV"
      : s.mode === "replay"
        ? "RECORDED REPLAY"
        : "LIVE MONITOR";
  $("run").disabled =
    s.running || (!!s.sessionId && s.phase === "Watching agent session");
  $("run").firstChild.textContent = s.running
    ? "Demo running "
    : s.mode === "replay"
      ? "Replay captured demo "
      : "Run attack demo ";
  $("mode").textContent =
    s.mode === "replay"
      ? `Real Jev capture · ${s.capturedAt ?? "replay"}`
      : "Scripted actor. Real Jev judgments.";
  $("phase").textContent = s.phase;
  $("error").hidden = !s.error && s.configured;
  $("error").textContent =
    s.error ??
    (!s.configured
      ? "Connect Jev to run the demo. Configure OPENROUTER_API_KEY, JEV_API_KEY, or AI_GATEWAY_API_KEY locally, or use sentinel key. Scores remain empty until real judgments arrive."
      : "");
  const t = s.trajectory;
  $("intent").textContent =
    t?.activeUserIntent ||
    s.intent ||
    "Waiting for the agent’s current user intent.";
  $("session").textContent = s.sessionId ?? "Awaiting session";
  document.body.dataset.status = t?.status ?? "healthy";
  $("status").textContent =
    t?.currentDriftScore != null ? t.status.toUpperCase() : "AWAITING DATA";
  $("score").textContent =
    t?.currentDriftScore == null ? "—" : Math.round(t.currentDriftScore * 100);
  $("percent").hidden = t?.currentDriftScore == null;
  $("meter").style.width = `${(t?.currentDriftScore ?? 0) * 100}%`;
  $("meter").style.background =
    t?.status === "paused"
      ? "var(--danger)"
      : t?.status === "healthy"
        ? "var(--safe)"
        : "var(--watch)";
  $("score-note").textContent = t?.signals
    ? `Effective drift = max(Jev drift ${Math.round(t.signals.trajectory_drift * 100)}%, circumvention ${Math.round(t.signals.circumvention * 100)}%). Exact objective matches independently block.`
    : "A judgment appears after the next proposed action.";
  $("signals").replaceChildren(
    ...Object.entries(labels).map(([key, label]) => {
      const row = el("div", "signal");
      const p = t?.signals?.[key];
      const value = el(
        "span",
        "",
        p == null
          ? "—"
          : `${p >= 0.85 ? "CRITICAL" : p >= 0.65 ? "HIGH" : p >= 0.4 ? "ELEVATED" : "LOW"} · ${Math.round(p * 100)}%`,
      );
      if (p >= 0.65)
        value.style.color = p >= 0.85 ? "var(--danger)" : "var(--watch)";
      row.append(el("span", "", label), value);
      return row;
    }),
  );
  $("evidence").textContent =
    t?.evidence ??
    "Current intent, recent actions, and prior denials are evaluated together.";
  const blocked = t?.blockedObjectives?.at(-1);
  $("objective-box").hidden = !blocked;
  $("objective").textContent = blocked?.description ?? "";
  const circumvention = t?.reasons?.includes("POLICY CIRCUMVENTION DETECTED");
  $("objective-heading").textContent = circumvention
    ? "POLICY CIRCUMVENTION DETECTED"
    : "PREVIOUSLY BLOCKED OBJECTIVE";
  $("objective-heading").style.color = circumvention ? "var(--danger)" : "";
  if (t?.events?.length) {
    const rows = [];
    let step = 0;
    for (let i = 0; i < t.events.length; i++) {
      const e = t.events[i];
      if (!["tool_call", "untrusted_content"].includes(e.type)) continue;
      const d =
        e.type !== "tool_call"
          ? null
          : e.actionId
            ? t.events.find(
                (d) => d.type === "decision" && d.actionId === e.actionId,
              )
            : t.events[i + 1]?.type === "decision"
              ? t.events[i + 1]
              : null;
      const point =
        e.type !== "tool_call"
          ? null
          : e.actionId
            ? t.driftHistory.find((p) => p.actionId === e.actionId)
            : t.driftHistory[step++];
      const row = el(
        "article",
        `event ${e.type === "untrusted_content" ? "flag" : d?.decision === "deny" ? "blocked" : ""}`,
      );
      row.append(
        el(
          "time",
          "",
          new Date(e.timestamp).toLocaleTimeString("en-GB", { hour12: false }),
        ),
      );
      const body = el("div");
      const top = el("div", "top");
      top.append(
        el(
          "span",
          "tool",
          e.type === "untrusted_content"
            ? "UNTRUSTED INSTRUCTION DETECTED"
            : e.tool,
        ),
      );
      if (d)
        top.append(
          el(
            "span",
            "verdict",
            d.decision === "deny"
              ? "BLOCKED"
              : d.decision === "ask"
                ? "APPROVAL REQUIRED"
                : "ALLOW",
          ),
        );
      body.append(
        top,
        el(
          "p",
          "args",
          e.type === "untrusted_content" ? e.resultSummary : e.args,
        ),
      );
      if (point)
        body.append(
          el(
            "div",
            "drift-label",
            `TRAJECTORY DRIFT ${Math.round(point.score * 100)}%`,
          ),
        );
      if (d?.resultSummary) body.append(el("p", "finding", d.resultSummary));
      row.append(body);
      rows.push(row);
    }
    $("timeline").replaceChildren(
      ...(rows.length ? rows : [emptyTimeline.cloneNode(true)]),
    );
  } else $("timeline").replaceChildren(emptyTimeline.cloneNode(true));
  const history = t?.driftHistory ?? [];
  $("actions").textContent = `${history.length} actions`;
  const coords = history.map((p, i) => [
    30 + (i / Math.max(1, history.length - 1)) * 360,
    112 - p.score * 100,
  ]);
  $("drift-path").setAttribute(
    "d",
    coords.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" "),
  );
  $("points").replaceChildren(
    ...coords.map(([x, y]) => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", 4);
      return circle;
    }),
  );
}
$("run").addEventListener("click", async () => {
  $("run").disabled = true;
  try {
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    last = "";
  } catch (error) {
    render({ ...current, error: error.message, running: false });
  }
});
async function poll() {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("Monitor unavailable");
    const s = await response.json();
    const hash = JSON.stringify(s);
    if (hash !== last) {
      last = hash;
      render(s);
    }
  } catch {
    $("connection").textContent = "DISCONNECTED";
  }
  setTimeout(poll, 500);
}
poll();
