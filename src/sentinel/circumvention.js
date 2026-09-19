// @ts-check
import { resolve } from "node:path";
/** Conservative recognition, not a shell parser. Unknown syntax goes to Jev.
 * Deterministic equivalence requires BOTH operation and exact canonical path.
 * @param {import('./types.js').Action} action
 * @returns {import('./types.js').Objective} */
export function objectiveOf({ tool = "", input = {}, cwd = process.cwd() }) {
  const name = tool.toLowerCase();
  const cmd =
    typeof input === "string" ? input : (input.command ?? input.cmd ?? "");
  let path = input.file_path ?? input.filePath ?? input.path;
  let operation = /read|cat/.test(name)
    ? "read"
    : /delete|remove/.test(name)
      ? "delete"
      : /write|edit/.test(name)
        ? "write"
        : "unknown";
  if (!path && typeof cmd === "string") {
    // Anchored commands only: `echo "cat .env"` is not an attempt to read .env.
    const cat = cmd.match(
      /^\s*(?:cat|head|tail|less|more)\s+(?:-[\w]+\s+)*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s;&|<>]+))\s*$/,
    );
    const rm = cmd.match(
      /^\s*rm\s+(?:-[\w]+\s+)*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s;&|<>]+))\s*$/,
    );
    const pythonRead =
      /^\s*python(?:3)?\s+-c\s/.test(cmd) &&
      cmd.match(
        /(?:open|Path)\(\s*['"]([^'"]+)['"]\s*\)(?:\.read(?:_text|_bytes)?\(|\))/,
      );
    const pythonDelete =
      /^\s*python(?:3)?\s+-c\s/.test(cmd) &&
      cmd.match(
        /(?:os\.(?:remove|unlink)|shutil\.rmtree)\(\s*['"]([^'"]+)['"]\s*\)/,
      );
    if (cat || rm) {
      const hit = cat || rm;
      path = hit?.[1] ?? hit?.[2] ?? hit?.[3];
      operation = cat ? "read" : "delete";
    } else if (pythonRead || pythonDelete) {
      const hit = pythonRead || pythonDelete;
      path = hit ? hit[1] : undefined;
      operation = pythonRead ? "read" : "delete";
    }
  }
  const resource =
    typeof path === "string" && !/[\n\r$`*?]/.test(path)
      ? resolve(cwd, path)
      : "";
  return {
    operation,
    resource,
    description:
      resource && operation !== "unknown"
        ? `${operation === "read" ? "obtain contents of" : operation} ${resource}`
        : `perform ${tool}: ${JSON.stringify(input).slice(0, 400)}`,
  };
}
/** @param {import('./types.js').Objective} proposed @param {import('./types.js').BlockedObjective[]} blocked */
export function equivalentBlocked(proposed, blocked) {
  if (!proposed.resource || proposed.operation === "unknown") return undefined;
  return blocked.findLast(
    (b) =>
      b.operation === proposed.operation && b.resource === proposed.resource,
  );
}
