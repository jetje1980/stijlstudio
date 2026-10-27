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
  await p.click('#compact'); await p.waitForTimeout(200);

  // extra outfits met wat over is
  await p.click('#extra-aan'); await p.waitForSelector('[data-extra]', { timeout: 10000 });
  const voorPak = await p.$$eval('.paklijst li', x => x.length);
  await p.click('[data-extra="0"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('#uitkomst [data-extraweg]', x => x.length) === 1, 'extra outfit staat erbij in je plan');
  ok(await p.$$eval('.paklijst li', x => x.length) >= voorPak, 'paklijst groeit mee (of blijft gelijk)');
  // tas en muts bij koud weer
  const tassen = await p.$$eval('#uitkomst [data-p]', ks => ks.filter(k => k.querySelector('.stukken') && !/sport/i.test(k.querySelector('.moment-kop').textContent)).map(k => !!k.querySelector('[data-slot="tas"]')));
  ok(tassen.length && tassen.every(Boolean), `elke outfit heeft een tas, behalve bij het sporten (${tassen.length})`);

  // verras me: analyse en tips
  await p.click('#verras'); await p.waitForSelector('.blad h2');
  const vt = await p.textContent('.blad');
  ok(/Je tas is/.test(vt) && /Tip om te kopen/.test(vt), 'verras me: analyse en een koop-tip');
  const neem = await p.$('.blad [data-vk], .blad [data-vr]');
  if (neem) { await neem.click(); await p.waitForTimeout(300); ok(!(await p.$('.blad-achter.open')) && await p.$('#uitkomst [data-p] .stukken'), 'verras-tip toegepast'); }
  else { await p.click('.blad-dicht'); await p.waitForTimeout(300); ok(true, 'geen verras-tip uit de kast bij deze tas'); }
  // lichter: voorstel, ja zeggen, minder stukken
  const voorL = await p.$$eval('.paklijst li', x => x.length);
  await p.click('#lichter'); await p.waitForSelector('.blad h2');
  if (await p.$('#lt-ok')) {
    ok(/→/.test(await p.textContent('#lt-tel')), 'lichter: teller van nu naar straks');
    await p.click('#lt-ok'); await p.waitForTimeout(300);
    ok(await p.$$eval('.paklijst li', x => x.length) < voorL, `lichter: paklijst kleiner (${voorL} → ${await p.$$eval('.paklijst li', x => x.length)})`);
  } else { ok(/al compact/.test(await p.textContent('.blad')), 'lichter: tas is al compact'); await p.click('.blad-dicht'); await p.waitForTimeout(300); }

  // vastzetten
  await p.click('#zet-vast'); await p.waitForSelector('[data-anders]');
  ok(/staat vast/.test(await p.textContent('.sub')) && !(await p.$('#pak')), 'tas staat vast: geen invulscherm meer');
  const was = await p.$eval('[data-p="0"] .stukken', x => x.textContent);
  await p.click('[data-anders="0"]'); await p.waitForSelector('.blad [data-o]');
  await p.click('.blad [data-o="0"]'); await p.waitForTimeout(300);
  ok(/Anders dan je plan/.test(await p.textContent('[data-p="0"]')) && await p.$eval('[data-p="0"] .stukken', x => x.textContent) !== was, 'per dagdeel iets anders gekozen uit je tas');
  // één stuk wisselen, uit je tas
  const voorW = await p.$eval('[data-p="1"] .stukken', x => x.textContent);
  await p.click('[data-p="1"] [data-slot="onder"], [data-p="1"] [data-slot="schoen"]');
  await p.waitForSelector('.blad');
  ok(/Uit je tas/.test(await p.textContent('.blad')) && /Uit je kast/.test(await p.textContent('.blad')), 'stuk wisselen: uit je tas én uit je hele kast');
  if (await p.$('.blad [data-item]')) { await p.click('.blad [data-item]'); await p.waitForTimeout(300);
    ok(await p.$eval('[data-p="1"] .stukken', x => x.textContent) !== voorW, 'stuk gewisseld'); }
  else { await p.click('.blad-dicht'); await p.waitForTimeout(300); }
  // een stuk uit je tas erbij
  const voorN = await p.$$eval('[data-p="2"] .stuk', x => x.length);
  await p.click('[data-erbij="2"]'); await p.waitForSelector('#se-z');
  await p.fill('#se-z', 'wit'); await p.waitForTimeout(100);
  await p.click('#se-r [data-item]'); await p.waitForTimeout(300);
  ok(await p.$$eval('[data-p="2"] .stuk', x => x.length) >= voorN && /Anders dan je plan/.test(await p.textContent('[data-p="2"]')), 'stuk uit je tas erbij gezet');
  // nieuwe look op basis van wensen
  await p.click('#nieuwe-look'); await p.waitForSelector('#nl-zoek');
  await p.click('[data-chips="nl-w"] .chip[data-w="broek"]'); await p.click('#nl-zoek'); await p.waitForTimeout(500);
  const looks = await p.$$eval('[data-look]', x => x.length);
  ok(looks > 0, 'nieuwe look: opties uit je tas (' + looks + ')');
  await p.selectOption('#nl-voor', 'extra'); await p.click('[data-look="0"]'); await p.waitForTimeout(300);
  ok(/Extra outfit/.test(await p.textContent('#scherm')), 'nieuwe look als extra outfit erbij');
  // zelf samenstellen, met oordeel
  await p.click('#zelf'); await p.waitForSelector('#zs-uit');
  for (const n of [1, 2, 3]) { const t = await p.$(`.blad h3:nth-of-type(${n}) + .raster [data-item]`); if (t) await t.click(); }
  await p.waitForSelector('#zs-oordeel'); await p.click('#zs-oordeel'); await p.waitForTimeout(300);
  ok(/Kleur/.test(await p.textContent('.blad-achter:last-of-type')) && /Vibe/.test(await p.textContent('.blad-achter:last-of-type')), 'zelf samenstellen: oordeel met kleur en vibe');
  await p.click('.blad-achter:last-of-type .blad-dicht'); await p.waitForTimeout(300);
  await p.selectOption('#zs-voor', 'extra'); await p.click('#zs-ok'); await p.waitForTimeout(300);
  ok((await p.$$eval('[data-oordeel]', x => x.length)) > 0, 'zelf samengestelde look staat erin, met "Wat vind je ervan?" per outfit');
  await p.waitForTimeout(300);
  await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('[data-anders]');
  ok(/Anders dan je plan|staat vast/.test(await p.textContent('#scherm')), 'na opnieuw openen staat de tas nog vast');
  await p.click('#losmaken'); await p.waitForSelector('#pak');
  ok(true, 'losmaken geeft het invulscherm terug');
  // bewaarde tas verwijderen
  await p.waitForSelector('#bewaar'); await p.click('#bewaar'); await p.waitForTimeout(300);
  await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('[data-tasweg]');
  const tassenVoor = await p.$$eval('[data-tasweg]', x => x.length);
  p.once('dialog', d => d.accept());
  await p.click('[data-tasweg]'); await p.waitForTimeout(300);
  ok(await p.$$eval('[data-tasweg]', x => x.length) === tassenVoor - 1, 'bewaarde tas verwijderd');
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'tas-kies.png'), fullPage: true });
  ok(!errs.length, 'geen fouten ' + errs.join(' '));
  await b.close(); server.close(); process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
