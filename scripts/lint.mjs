// Lints the browser script and the Worker exactly as they ship (each is one script, so a function
// defined in another file counts as defined). Catches calls to functions that no longer exist,
// handlers in index.html with no function behind them, and a few other real mistakes.
//   npm run lint
import { ESLint } from 'eslint';
import globals from 'globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemble } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES = { 'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error', 'no-dupe-args': 'error' };

export async function lint() {
  const { js, serverJs } = assemble();
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [
    { files: ['**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } }, rules: RULES },
    { files: ['**/*.mjs'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.serviceworker } }, rules: RULES }
  ] });
  const problems = [];
  const [client] = await eslint.lintText(js, { filePath: 'client.js' });
  client.messages.forEach((m) => problems.push('client script line ' + m.line + ': ' + m.message));
  // the Worker is a module (it has `export default`) and gets HTML from the generated header
  const [server] = await eslint.lintText('const HTML = "";\n' + serverJs, { filePath: 'worker.mjs' });
  server.messages.forEach((m) => problems.push('worker line ' + (m.line - 1) + ': ' + m.message));

  // every inline handler in the page must call a function that exists
  const html = fs.readFileSync(path.join(root, 'src/client/index.html'), 'utf8');
  const called = new Set([...html.matchAll(/\son(?:click|change|input|submit)="\s*([A-Za-z_]\w*)\(/g)].map((m) => m[1]));
  const defined = new Set([...js.matchAll(/function\s+([A-Za-z_]\w*)/g)].map((m) => m[1]));
  called.forEach((n) => { if (!defined.has(n)) problems.push('index.html calls ' + n + '() but no such function exists'); });
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = await lint();
  if (problems.length) { console.error(problems.slice(0, 40).join('\n') + (problems.length > 40 ? '\n…and ' + (problems.length - 40) + ' more' : '')); process.exit(1); }
  console.log('lint: no problems');
}
