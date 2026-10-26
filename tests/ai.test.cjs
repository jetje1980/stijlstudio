// De AI-functies met een nagebootste stylist: stelt de app de vraag goed, en
// komt het antwoord goed in beeld? (De echte dienst is hier niet bereikbaar.)
// node tests/ai.test.cjs
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': typen[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
}).listen(8769, '127.0.0.1');
const { chromium } = require('playwright');
let fout = 0;
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fout++; };

// Zo antwoordt de echte API: eerst een denkblok, dan de tekst.
const antwoord = tekst => JSON.stringify({ content: [{ type: 'thinking', thinking: '…' }, { type: 'text', text: tekst }] });
// Een piepklein, geldig jpg-plaatje (1x1 pixel).
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const vragen = [];
  // Playwright kijkt eerst naar de laatst toegevoegde route: het afsluiten van
  // de rest moet dus vóór de nagebootste diensten staan.
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.route(/functions\/v1\/claude/, async r => {
    const body = JSON.parse(r.request().postData());
    vragen.push(body);
    const v = body.messages[0].content.map(c => c.text || '').join(' ');
    let t = '{}';
    if (/Beschrijf dit kledingstuk/.test(v)) t = '{"naam":"Rode wollen trui","soort":"trui","kleur":["rood"],"print":null,"textuur":"fijn gebreid","materiaal":"wol","pasvorm":"recht","warmte":3}';
    else if (/Geef als JSON: \{"naam"/.test(v)) t = 'Hier is het: {"naam":"Zondag in de stad","waarom":"De rustige basis laat het accent spreken.","tip":"Stop de trui half in."}';
    else if (/inspiratiebeeld/.test(v)) t = JSON.stringify({ samenvatting: 'Oversized camo-jas met paars shirt en wijde lichte jeans.',
      stukken: [{ wat: 'camo bomber', soort: 'jas', kleur: ['olijf/khaki'], print: 'camouflage', printGroot: 'groot', pasvorm: 'wijd' },
        { wat: 'paars grafisch shirt', soort: 't-shirt', kleur: ['paars'] }, { wat: 'lichte wide-leg jeans', soort: 'jeans', kleur: ['lichtblauw'], snit: 'wide leg', textuur: 'denim' },
        { wat: 'zonnebril', soort: 'zonnebril', kleur: ['bruin'] }],
      methode: 'accent', sferen: ['street'], stoerLief: 'stoer', printMix: false, ideeen: ['gouden kettingen gelaagd', 'shirt los over de jeans'] });
    else if (/Dit is Griette in haar outfit/.test(v)) {
      const id = (v.match(/\n([\w-]+): /) || [])[1];
      t = JSON.stringify({ werkt: 'De kleuren zijn rustig en mooi samen.', verbeter: [{ wat: 'Draag een riem', waarom: 'Dan zie je je taille', uitKast: [id], nieuw: null }], foto: 'Draai je schouders iets.' });
    }
    await r.fulfill({ status: 200, contentType: 'application/json', body: antwoord(t) });
  });
  await p.route(/api\.cloudinary\.com/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ secure_url: 'https://res.cloudinary.com/dhggari0g/image/upload/v1/griette-wardrobe/griette_test.jpg' }) }));

  // 1. "Waarom?" bij een voorstel
  await p.goto('http://127.0.0.1:8769/#outfits/maak'); await p.waitForSelector('#voorstellen .kaart', { timeout: 15000 });
  await p.click('#voorstellen .kaart [data-a="ai"]'); await p.waitForTimeout(500);
  const waarom = await p.$eval('#voorstellen .kaart [data-waarom]', x => x.textContent);
  ok(/Zondag in de stad/.test(waarom) && /taille|accent/.test(waarom), 'Waarom? toont naam en uitleg');
  const v1 = vragen[vragen.length - 1];
  ok(['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5'].includes(v1.model), 'model staat op de lijst van de proxy (' + v1.model + ')');
  ok(v1.system && v1.system[0].cache_control && /stijlrapport/i.test(v1.system[0].text), 'rapport gaat mee als gecachte systeemtekst');
  ok(JSON.stringify(v1).length < 12000, 'de vraag blijft klein (' + JSON.stringify(v1).length + ' tekens)');

  // 2. Nieuw stuk: foto → labels → in de kast
  await p.goto('http://127.0.0.1:8769/#kast'); await p.waitForSelector('#nieuw');
  const voor = await p.$$eval('.raster .tegel', x => x.length);
  await p.click('#nieuw');
  await p.setInputFiles('#fotokeuze', { name: 'trui.jpg', mimeType: 'image/jpeg', buffer: JPG });
  await p.waitForSelector('.labelform', { timeout: 10000 });
  ok(await p.inputValue('.labelform [name="naam"]') === 'Rode wollen trui', 'AI vult de naam in');
  ok(await p.inputValue('.labelform [name="soort"]') === 'trui' && await p.inputValue('.labelform [name="kleur1"]') === 'rood', 'AI vult soort en kleur in');
  const vl = vragen[vragen.length - 1];
  ok(vl.model === 'claude-haiku-4-5' && vl.messages[0].content.some(c => c.type === 'image' && c.source.type === 'url'), 'labels via het goedkope model, met de foto als url');
  await p.click('#bewaar'); await p.waitForTimeout(300);
  ok(await p.$$eval('.raster .tegel', x => x.length) === voor + 1, 'het nieuwe stuk staat in de kast');

  // 3. Spiegelcheck
  await p.goto('http://127.0.0.1:8769/#outfits'); await p.waitForSelector('#spiegel');
  await p.click('#spiegel');
  await p.setInputFiles('#sf', { name: 'ik.jpg', mimeType: 'image/jpeg', buffer: JPG });
  await p.waitForSelector('#sr .kaart', { timeout: 10000 });
  ok(/riem/i.test(await p.$eval('#sr', x => x.textContent)), 'spiegelcheck toont de verbetering');
  ok(await p.$$eval('#sr .tegel', x => x.length) === 1, 'spiegelcheck toont het stuk uit je kast');
  const vs = vragen[vragen.length - 1];
  ok(vs.messages[0].content.some(c => c.type === 'image' && c.source.type === 'base64'), 'je foto gaat mee, verkleind');

  // 4. Inspiratie: screenshot → analyse → jij checkt → telt mee → maak na
  await p.goto('http://127.0.0.1:8769/#stijl'); await p.waitForSelector('[data-chips="deel"]');
  await p.click('[data-chips="deel"] .chip[data-w="inspiratie"]'); await p.waitForSelector('#inspo-in', { state: 'attached' });
  await p.setInputFiles('#inspo-in', [{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }]);
  await p.waitForSelector('#ck-ok', { timeout: 10000 });
  ok(/camo/i.test(await p.textContent('.blad')) && await p.$$eval('#ck-st .chip.aan', x => x.length) === 4, 'check: de app laat zien wat hij ziet');
  ok(await p.$eval('#ck-sf .chip[data-w="street"]', x => x.classList.contains('aan')), 'check: sfeer staat voorgeselecteerd');
  await p.click('#ck-st .chip[data-n="3"]');
  const vi = vragen[vragen.length - 1];
  ok(vi.model === 'claude-sonnet-5' && vi.messages[0].content.some(c => c.type === 'image'), 'inspiratie: het beeld gaat mee naar de stylist');
  await p.click('#ck-ok'); await p.waitForTimeout(400);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('stijlstudio-v2')).inspo);
  ok(st.length === 1 && st[0].status === 'bevestigd' && st[0].analyse.stukken.length === 3 && st[0].analyse.stukken[0].rol === 'jas', 'wat je wegtikt telt niet mee; de rest is bevestigd');
  ok(/jouw smaak nu/i.test(await p.textContent('#deel')) && /jas/.test(await p.textContent('#deel')), 'je smaak van nu staat erbij');
  await p.click('[data-na]'); await p.waitForTimeout(500);
  ok(/Sabbi/.test(await p.textContent('.blad')) && await p.$$eval('.blad .kaart .stukken', x => x.length) >= 1, 'maak na: je eigen camo-jas en outfits');

  // tas met een eigen inspiratiebord
  await p.goto('http://127.0.0.1:8769/#tas'); await p.waitForSelector('#bord');
  await p.click('#bord'); await p.waitForSelector('#bord-r [data-b]');
  await p.click('#bord-r [data-b]'); await p.click('#bord-ok'); await p.waitForTimeout(300);
  ok(await p.$$eval('#bord ~ img, .rij img', x => x.length) >= 1 && JSON.parse(await p.evaluate(() => localStorage.getItem('stijlstudio-v2'))).tasConcept.bord.length === 1, 'tas: inspiratiebord gekozen en bewaard');

  // nieuwe screenshots in het tasbord staan er meteen, ook als je de check wegklikt
  await p.click('#bord'); await p.waitForSelector('#bord-in', { state: 'attached' });
  const voorB = await p.$$eval('#bord-r [data-b]', x => x.length);
  await p.setInputFiles('#bord-in', [{ name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPG }]);
  await p.waitForSelector('#ck-ok', { timeout: 10000 });
  ok(await p.$$eval('#bord-r [data-b]', x => x.length) === voorB + 1, 'tasbord: nieuw beeld staat er meteen');
  await p.click('.blad-achter:last-of-type .blad-dicht'); await p.waitForTimeout(400);
  ok(/tik om te checken/.test(await p.textContent('#bord-r')) && await p.$$eval('#bord-r .gekozen', x => x.length) === 2, 'tasbord: check weggeklikt, beeld blijft (gekozen, nog te checken)');
  await p.click('#bord-ok'); await p.waitForTimeout(300);
  ok(JSON.parse(await p.evaluate(() => localStorage.getItem('stijlstudio-v2'))).tasConcept.bord.length === 2, 'tasbord: beide beelden in de tas');

  // 5. Een fout van de stylist geeft een nette melding
  await p.unroute(/functions\/v1\/claude/);
  await p.route(/functions\/v1\/claude/, r => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'tijdelijk niet beschikbaar' } }) }));
  await p.goto('http://127.0.0.1:8769/#outfits/maak'); await p.waitForSelector('#voorstellen .kaart', { timeout: 15000 });
  await p.click('#voorstellen .kaart [data-a="ai"]'); await p.waitForTimeout(500);
  ok(/lukte niet/.test(await p.$eval('#voorstellen .kaart [data-waarom]', x => x.textContent)), 'bij een fout: nette melding');

  ok(!errs.length, 'geen fouten ' + errs.join(' '));
  await b.close(); server.close(); process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
