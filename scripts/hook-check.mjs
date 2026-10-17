// Claude Code hooks (see .claude/settings.json). A failure prints its message and exits 2 so the agent sees and fixes it;
// a pass prints nothing. Humans never need to run this.
//   edit   after a file in src/ is edited: build + lint (about a second)
//   stop   when the agent finishes: tests for the changed files, skipped if nothing changed since the last green run
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { changedFiles, run } from './test-changed.mjs';

const mode = process.argv[2];
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) {}
const quiet = (fn) => { const log = console.log; let out = ''; console.log = (s) => { out += s + '\n'; }; try { return [fn(), out]; } finally { console.log = log; } };

if (mode === 'edit') {
  const f = (input.tool_input && input.tool_input.file_path) || '';
  if (!/\/src\//.test(f)) process.exit(0);
  for (const s of ['build', 'lint']) {
    const r = spawnSync('node', ['scripts/' + s + '.mjs'], { encoding: 'utf8' });
    if (r.status) { console.error((r.stdout + r.stderr).trim().split('\n').slice(-30).join('\n')); process.exit(2); }
  }
} else if (mode === 'stop') {
  if (input.stop_hook_active) process.exit(0);   // already asked once: never loop
  const files = changedFiles().filter((f) => /^(src|scripts|tests)\//.test(f));
  if (!files.length) process.exit(0);
  const h = crypto.createHash('sha1');
  files.sort().forEach((f) => { h.update(f); if (fs.existsSync(f)) h.update(fs.readFileSync(f)); });
  const stamp = 'node_modules/.cache/last-green', now = h.digest('hex');
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === now) process.exit(0);
  const [code, out] = quiet(() => run(changedFiles()));
  if (code) { console.error('Tests for your changes fail. Fix them (do not skip or weaken a test):\n' + out); process.exit(2); }
  fs.mkdirSync('node_modules/.cache', { recursive: true });
  fs.writeFileSync(stamp, now);
}
