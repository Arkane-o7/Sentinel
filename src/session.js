// Shared upstream session schema, extended with a bounded Sentinel trajectory.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync, renameSync, rmdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { emptyTrajectory, appendEvent, compact } from './sentinel/trajectory.js';
import { activeIntent } from './sentinel/intent.js';
const DIR = () => process.env.SENTINEL_SESSIONS ?? process.env.JEV_GUARD_SESSIONS ?? join(homedir(), '.sentinel', 'sessions');
const CAPS = { prompts: 6, intents: 3, calls: 20, flags: 10, results: 12 };
const EMPTY = () => ({ prompts: [], intents: [], calls: [], flags: [], results: [] });
export function sessionFile(id) { return join(DIR(), createHash('sha256').update(String(id)).digest('hex').slice(0, 32) + '.json'); }
export function readSession(id) {
  if (!id) return EMPTY();
  try { return { ...EMPTY(), ...JSON.parse(readFileSync(sessionFile(id), 'utf8')) }; }
  catch (err) { if (err.code === 'ENOENT') return EMPTY(); throw new Error('Sentinel session state is unreadable; refusing to silently forget denials', { cause: err }); }
}
// Serialize short read/modify/write transactions separately from long model calls.
function mutate(id, fn) {
  if (!id) return;
  mkdirSync(DIR(), { recursive: true, mode: 0o700 });
  const file = sessionFile(id), lock = file + '.write-lock', started = Date.now();
  while (true) {
    try { mkdirSync(lock, { mode: 0o700 }); break; }
    catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() - started > 1500) throw new Error('Sentinel state write lock is busy', { cause: err });
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    const state = readSession(id); fn(state); state.updated = Date.now();
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(state), { mode: 0o600 }); renameSync(temp, file);
  } finally { rmdirSync(lock); }
}
export function remember(id, key, item) {
  if (!id || !item) return;
  if (!(key in CAPS)) throw new Error(`Unknown session list: ${key}`);
  mutate(id, s => {
    const at = Date.now();
    s[key] = [...s[key], { ...item, at }].slice(-CAPS[key]);
    const t = s.trajectory ??= emptyTrajectory(id);
    if (key === 'prompts') {
      t.activeUserIntent = activeIntent(s.prompts.map(p => p.text));
      appendEvent(t, { timestamp: at, type: 'user_prompt', resultSummary: compact(item.text, 2000) });
    }
    if (key === 'flags') {
      const summary = compact(`${item.kind} from ${item.source ?? item.tool}: ${item.excerpt ?? ''}`);
      t.untrustedSources = [...new Set([...t.untrustedSources, summary])].slice(-10);
      appendEvent(t, { timestamp: at, type: 'untrusted_content', tool: item.tool, source: item.source, resultSummary: summary });
    }
    if (key === 'results') appendEvent(t, { timestamp: at, type: 'tool_result', tool: item.tool, source: item.source, resultSummary: compact(item.summary) });
  });
  prune();
}
export function update(id, patch) {
  mutate(id, s => {
    // Preserve result/flag/prompt events arriving while a Jev judgment was in flight.
    if (patch.trajectory && s.trajectory) {
      const t = patch.trajectory;
      const unique = new Map([...s.trajectory.events, ...t.events].map(e => [JSON.stringify(e), e]));
      t.events = [...unique.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-60);
      t.untrustedSources = [...new Set([...s.trajectory.untrustedSources, ...t.untrustedSources])].slice(-10);
    }
    Object.assign(s, patch);
  });
}
export function markReported(id) { mutate(id, s => { s.flags = s.flags.map(f => ({ ...f, reported: true })); }); }
function prune() {
  let files; try { files = readdirSync(DIR()).filter(f => f.endsWith('.json')); } catch { return; }
  if (files.length < 200) return;
  const cutoff = Date.now() - 7 * 86_400_000;
  for (const f of files) { const p = join(DIR(), f); try { if (statSync(p).mtimeMs < cutoff) unlinkSync(p); } catch { /* best effort */ } }
}
