// Blijft de tas staan na opnieuw openen, en beweegt de datum goed mee?
// node tests/tas-onthoud.test.cjs
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': typen[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
}).listen(8767, '127.0.0.1');
const { chromium } = require('playwright');
let fout = 0;
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fout++; };
const plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const url = 'http://127.0.0.1:8767/#tas';
  await p.goto(url); await p.waitForSelector('#pak');

  await p.fill('#best', 'Terschelling');
  await p.fill('#start', plus(5)); await p.dispatchEvent('#start', 'change'); await p.waitForTimeout(200);
  await p.selectOption('#aantal', '4'); await p.waitForTimeout(200);
  await p.fill('[data-temp="0"]', '9'); await p.dispatchEvent('[data-temp="0"]', 'change');
  await p.selectOption('[data-doen="1|avond"]', 'pizzeria'); await p.waitForTimeout(150);
  await p.click('[data-chips="niet"] .chip[data-w="rok"]');
  await p.click('#kies-mm'); await p.click('.blad .tegel'); await p.click('#zk'); await p.waitForTimeout(300);
  await p.click('#kies-thuis'); await p.click('.blad .tegel:nth-child(5)'); await p.click('#zk'); await p.waitForTimeout(300);
  const mm = await p.$$eval('[data-mm]', x => x.map(y => y.textContent));
  const th = await p.$$eval('[data-th]', x => x.map(y => y.textContent));
  await p.click('#pak'); await p.waitForSelector('.paklijst li', { timeout: 20000 });
  const plan1 = await p.$$eval('[data-p] .stuk span', x => x.map(y => y.textContent).join('|'));
  await p.waitForTimeout(300);

  // opnieuw openen
  await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('#pak');
  ok(await p.inputValue('#best') === 'Terschelling', 'bestemming blijft staan');
  ok(await p.inputValue('#start') === plus(5), 'datum blijft staan');
  ok(await p.$$eval('.dag', x => x.length) === 4, 'aantal dagen blijft staan');
  ok(await p.inputValue('[data-temp="0"]') === '9', 'zelf ingevulde graden blijven staan');
  ok(await p.inputValue('[data-doen="1|avond"]') === 'pizzeria', 'wat je doet blijft staan');
  ok(await p.$eval('[data-chips="niet"] .chip[data-w="rok"]', x => x.classList.contains('aan')), 'geen rokken blijft aan');
  ok(JSON.stringify(await p.$$eval('[data-mm]', x => x.map(y => y.textContent))) === JSON.stringify(mm) && mm.length === 1, 'moet mee blijft staan');
  ok(JSON.stringify(await p.$$eval('[data-th]', x => x.map(y => y.textContent))) === JSON.stringify(th) && th.length === 1, 'blijft thuis blijft staan');
  ok(await p.$$eval('[data-p] .stuk span', x => x.map(y => y.textContent).join('|')) === plan1, 'uitgerekende tas blijft staan');

  // paklijst: afvinken telt, × laat thuis, ＋ zet erbij
  await p.click('.paklijst li:first-child input'); await p.waitForTimeout(100);
  ok(/^1 van \d+ ingepakt$/.test(await p.$eval('#ingepakt', x => x.textContent)), 'teller ingepakt loopt mee');
  const wegNaam = await p.$eval('.paklijst li:nth-child(2) span', x => x.textContent);
  await p.click('.paklijst li:nth-child(2) .pak-weg'); await p.waitForSelector('.paklijst li', { timeout: 20000 }); await p.waitForTimeout(300);
  ok(!(await p.$$eval('.paklijst li span', x => x.map(y => y.textContent))).includes(wegNaam), 'thuisgelaten stuk is van de paklijst');
  ok(/^1 van/.test(await p.$eval('#ingepakt', x => x.textContent)), 'afgevinkt blijft na opnieuw rekenen');
  await p.click('#pak-erbij'); await p.fill('#zz', 'Gouden ketting'); await p.click('.blad .tegel'); await p.click('#zk'); await p.waitForSelector('.paklijst li', { timeout: 20000 }); await p.waitForTimeout(300);
  ok((await p.$$eval('.paklijst li span', x => x.map(y => y.textContent))).includes('Gouden ketting'), 'toegevoegd stuk staat op de paklijst');

  // bewaarde tas openen en dan iets erbij of eraf: de rest van de tas blijft
  p.once('dialog', d => d.accept('Testtas')); await p.click('#bewaar'); await p.waitForTimeout(300);
  const bewaard = await p.$$eval('.paklijst li span:not(.keer)', x => x.map(y => y.textContent));
  p.once('dialog', d => d.accept()); await p.click('#wis-mm'); await p.waitForTimeout(200);
  await p.click('[data-tas]'); await p.waitForSelector('.paklijst li'); await p.waitForTimeout(200);
  await p.click('#pak-erbij'); await p.fill('#zz', 'Wit basic'); await p.click('.blad .tegel'); await p.click('#zk'); await p.waitForSelector('.paklijst li', { timeout: 20000 }); await p.waitForTimeout(300);
  const na = await p.$$eval('.paklijst li span:not(.keer)', x => x.map(y => y.textContent));
  const kleding = bewaard.filter(n => !/ketting|tas|bag/i.test(n));
  ok(kleding.filter(n => na.includes(n)).length >= kleding.length - 1 && na.length >= bewaard.length, `bewaarde tas + stuk erbij: de rest blijft (${bewaard.length} → ${na.length})`);
  const plan2 = await p.$$eval('[data-p] .stuk span', x => x.map(y => y.textContent).join('|'));
  // een kledingstuk (een muts of tas zonder vervanger rekent wel opnieuw)
  const nr = na.findIndex(n => /t-shirt|top|trui/i.test(n)) + 1;
  const weg2 = na[nr - 1];
  await p.click(`.paklijst li:nth-child(${nr}) .pak-weg`); await p.waitForTimeout(600);
  const na2 = await p.$$eval('.paklijst li span:not(.keer)', x => x.map(y => y.textContent));
  ok(!na2.includes(weg2) && na2.length === na.length - 1 && na.filter(n => n !== weg2).every(n => na2.includes(n)), `bewaarde tas + stuk eraf: alleen dat stuk weg (${na.length} → ${na2.length})`);

  // datum verschuiven: dagnamen en data bewegen mee, voorspelde graden niet
  const naam1 = await p.$eval('.dag b', x => x.textContent);
  await p.evaluate(() => { });
  await p.fill('#start', plus(6)); await p.dispatchEvent('#start', 'change'); await p.waitForTimeout(200);
  const naam2 = await p.$eval('.dag b', x => x.textContent);
  ok(naam1 !== naam2, 'dag schuift mee met de datum (' + naam1 + ' → ' + naam2 + ')');
  ok(await p.inputValue('[data-temp="0"]') === '9', 'zelf ingevuld blijft ook na datumwissel');
  ok(await p.inputValue('[data-doen="1|avond"]') === 'pizzeria', 'activiteit blijft bij dag 2');
  ok(!(await p.$('.paklijst')) && /opnieuw/.test(await p.$eval('#uitkomst', x => x.textContent)), 'oude tas verdwijnt na een andere datum');

  // een reis in het verleden schuift op naar vandaag
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('stijlstudio-v2')); s.tasConcept.start = '2020-01-01'; localStorage.setItem('stijlstudio-v2', JSON.stringify(s)); });
  await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('#pak');
  ok(await p.inputValue('#start') === plus(0), 'datum in het verleden wordt vandaag');
  ok(!errs.length, 'geen fouten ' + errs.join(' '));
  await b.close(); server.close(); process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
