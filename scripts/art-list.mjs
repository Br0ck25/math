// Lists every buddy id with its name and show, and marks the ones that have art in art/buddies/.   npm run art
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, loadWorker, fakeKV, openGame } from '../tests/helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'art/buddies');
const have = new Set(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => f.replace(/\.[a-z]+$/i, '').toLowerCase()) : []);
const browser = await launch();
const { page } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { fast: true });
const rows = await page.evaluate(() => allBuddies().map((b) => ({ id: b.id, name: b.name, show: b.show || '', pack: packOf(b).name, mythic: !!b.mythic })));
await browser.close();
const only = process.argv.includes('--shows');
const list = only ? rows.filter((r) => r.show) : rows;
list.forEach((r) => console.log((have.has(r.id) ? '[x] ' : '[ ] ') + r.id.padEnd(20) + r.name.padEnd(18) + (r.show ? '(' + r.show + ') ' : '') + '· ' + r.pack));
console.log('\n' + have.size + ' of ' + rows.length + ' buddies have art. Use "npm run art -- --shows" to list only the show characters.');
