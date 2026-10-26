// Kiezen uit je eigen stukken: alle outfits per moment, zelf kiezen,
// compact laten kiezen, en de keuze blijft staan.
// node tests/tas-kies.test.cjs
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': typen[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
}).listen(8768, '127.0.0.1');
const { chromium } = require('playwright');
let fout = 0;
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fout++; };
const plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const url = 'http://127.0.0.1:8768/#tas';
  await p.goto(url); await p.waitForSelector('#pak');

  await p.fill('#start', plus(3)); await p.dispatchEvent('#start', 'change'); await p.waitForTimeout(200);
  for (const n of [0, 1, 2]) { await p.fill(`[data-temp="${n}"]`, '12'); await p.dispatchEvent(`[data-temp="${n}"]`, 'change'); }
  await p.selectOption('[data-doen="1|dag"]', 'sport'); await p.waitForTimeout(150);
  await p.click('[data-modus="kies"]'); await p.waitForTimeout(150);
  ok(/Laat alle outfits zien/.test(await p.textContent('#pak')), 'knop wordt "Laat alle outfits zien"');

  // meerdere stukken in één keer kiezen: tops en broeken, geen schoenen of jas
  await p.click('#kies-mm');
  for (const z of ['blouse', 'trui', 'jeans', 'pantalon']) {
    await p.fill('#zz', z); await p.waitForTimeout(50);
    const n = await p.$$eval('.blad .tegel', x => x.length);
    for (let k = 1; k <= Math.min(2, n); k++) await p.click(`.blad .tegel:nth-child(${k})`);
  }
  ok(/Klaar \(\d+\)/.test(await p.textContent('#zk')), 'teller in de kiezer loopt mee');
  await p.click('#zk'); await p.waitForTimeout(200);
  const aantal = await p.$$eval('[data-mm]', x => x.length);
  ok(aantal >= 6, 'meerdere stukken gekozen (' + aantal + ')');

  await p.click('#pak'); await p.waitForSelector('[data-kies]', { timeout: 20000 });
  const momenten = await p.$$eval('#uitkomst [data-p]', x => x.length);
  const metOpties = await p.$$eval('#uitkomst [data-p]', x => x.filter(k => k.querySelector('[data-kies]')).length);
  ok(momenten > 0 && metOpties === momenten, `elk moment heeft opties (${metOpties}/${momenten})`);
  const regels = await p.$$eval('.stuk-rij', x => x.map(y => y.textContent.replace(/\s+/g, ' ').trim()));
  ok(regels.some(t => /uit je kast erbij/.test(t)), 'schoenen of jas komen uit de kast erbij, en dat staat erbij');
  ok(regels.every(t => /in \d+ outfit|past nergens bij/.test(t)), 'per stuk staat in hoeveel outfits het kan');
  ok(!(await p.$('.paklijst')), 'nog geen paklijst zolang je niets koos');

  // zelf kiezen
  await p.click('[data-p="0"] [data-kies]'); await p.waitForTimeout(150);
  ok(await p.$('[data-p="0"] .stukken') && /1 van/.test(await p.textContent('#uitkomst h2')), 'gekozen outfit staat er, teller 1');
  ok(await p.$('.paklijst li'), 'paklijst verschijnt met je keuze');

  // compact
  await p.click('#compact'); await p.waitForTimeout(200);
  const gekozen = await p.$$eval('#uitkomst [data-p] .stukken', x => x.length);
  ok(gekozen === momenten, 'compact kiest voor elk moment');
  const sport = await p.$$eval('#uitkomst [data-p]', x => x.map(k => k.textContent).find(t => /Sport/i.test(t)) || '');
  ok(/legging|sport|sneaker|New Balance|Nike|Adidas/i.test(sport), 'bij sporten sportspullen');
  const pak = await p.$$eval('.paklijst li span', x => x.map(y => y.textContent));
  await p.waitForTimeout(300);

  // opnieuw openen: keuze blijft
  await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('#pak');
  await p.waitForSelector('.paklijst li', { timeout: 20000 });
  ok(await p.$eval('[data-modus="kies"]', x => x.classList.contains('aan')), 'keuzemodus blijft aan');
  ok(JSON.stringify(await p.$$eval('.paklijst li span', x => x.map(y => y.textContent))) === JSON.stringify(pak), 'gekozen outfits en paklijst blijven staan');

  // andere kiezen
  await p.click('[data-los="0"]'); await p.waitForTimeout(150);
  ok(await p.$('[data-p="0"] [data-kies]'), '"Andere kiezen" laat de opties weer zien');
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'tas-kies.png'), fullPage: true });
  ok(!errs.length, 'geen fouten ' + errs.join(' '));
  await b.close(); server.close(); process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
