// Rooktest van de hele app in Chromium: node tests/app.test.cjs
// Start zelf een server op 8765. Externe adressen (foto's, Supabase, AI) zijn
// afgesloten, dus dit test de app zoals hij offline werkt.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': typen[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
}).listen(8765, '127.0.0.1');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,150))});
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
const S=require('os').tmpdir()+'/';
await p.goto('http://127.0.0.1:8765/');await p.waitForSelector('.raster .tegel',{timeout:8000});
console.log('url na versiecheck',p.url());console.log('kast tegels',await p.$$eval('.raster .tegel',x=>x.length));
await p.screenshot({path:S+'s-kast.png'});
await p.click('.raster .tegel');await p.waitForSelector('.blad');await p.waitForTimeout(400);await p.screenshot({path:S+'s-item.png'});
await p.click('.blad-dicht');await p.waitForTimeout(300);
await p.goto('http://127.0.0.1:8765/#outfits');await p.waitForTimeout(500);
console.log('outfits tegels',await p.$$eval('.outfit-tegel',x=>x.length));await p.screenshot({path:S+'s-outfits.png'});
await p.goto('http://127.0.0.1:8765/#outfits/maak');await p.waitForSelector('#voorstellen .kaart',{timeout:15000});
console.log('voorstellen',await p.$$eval('#voorstellen .kaart',x=>x.map(k=>k.querySelector('.label-manier').textContent)));
await p.screenshot({path:S+'s-maker.png',fullPage:true});
// kies sfeer cosy + wens trui
await p.click('.bijsturen summary');await p.click('[data-chips="sfeer"] .chip[data-w="cosy"]');await p.waitForSelector('#voorstellen .kaart',{timeout:15000});
await p.click('[data-chips="wensen"] .chip[data-w="trui"]');await p.waitForSelector('#voorstellen .kaart',{timeout:15000});
console.log('cosy+trui',await p.$$eval('#voorstellen .kaart',x=>x.map(k=>[...k.querySelectorAll('.stuk span')].map(s=>s.textContent.slice(0,18)).join(' + '))));
// wissel
await p.click('#voorstellen .kaart [data-slot="onder"], #voorstellen .kaart [data-slot="heel"]');await p.waitForSelector('.blad .tegel');
console.log('samenvatting',await p.$eval('.bijsturen summary span',x=>x.textContent));console.log('alternatieven',await p.$$eval('.blad .tegel',x=>x.length));await p.screenshot({path:S+'s-wissel.png'});
await p.click('.blad .tegel');await p.waitForTimeout(400);
// bewaren + kaart
await p.click('#voorstellen .kaart [data-a="bewaar"]');await p.waitForTimeout(300);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:10000}),p.click('#voorstellen .kaart [data-a="kaart"]')]);
const pad=S+'kaart.jpg';await dl.saveAs(pad);console.log('kaart',dl.suggestedFilename(),require('fs').statSync(pad).size,'bytes');
// tas
await p.goto('http://127.0.0.1:8765/#tas');await p.waitForSelector('#pak');
await p.fill('[data-temp="0"]','12');await p.fill('[data-temp="1"]','13');await p.fill('[data-temp="2"]','11');
await p.click('[data-chips="sfeer"] .chip[data-w="cosy"]');await p.click('[data-chips="sfeer"] .chip[data-w="street"]');
await p.fill('[data-temp="0"]','12');await p.fill('[data-temp="1"]','13');await p.fill('[data-temp="2"]','11');
await p.click('[data-afw="1"]');await p.fill('[data-temp="0"]','12');await p.fill('[data-temp="1"]','13');await p.fill('[data-temp="2"]','11');
await p.click('#pak');await p.waitForSelector('.paklijst li',{timeout:20000});
console.log('sferen per moment',await p.$$eval('.moment-kop .klein',x=>x.map(y=>y.textContent)));
console.log('tas',await p.$eval('#uitkomst h2',x=>x.textContent),await p.$$eval('[data-f]',x=>x.map(y=>y.textContent)));
await p.screenshot({path:S+'s-tas.png',fullPage:true});
await p.click('[data-f]');await p.waitForTimeout(300);await p.click('#meer-van');await p.waitForTimeout(3000);console.log('meer-van:',await p.$eval('#ruil-uit',x=>x.textContent));
// stijl
for (const d of ['rapport','kleur','kennis','smaak']) { await p.goto('http://127.0.0.1:8765/#stijl');await p.click(`[data-chips="deel"] .chip[data-w="${d}"]`);await p.waitForTimeout(300);await p.screenshot({path:S+'s-stijl-'+d+'.png',fullPage:true}); }
await p.click('[data-chips="deel"] .chip[data-w="kleur"]');await p.click('[data-probeer="mono"]');await p.waitForSelector('#voorstellen .kaart',{timeout:15000});
console.log('probeer mono',await p.$$eval('#voorstellen .label-manier',x=>x.map(y=>y.textContent)));
// shop + labelcheck
await p.goto('http://127.0.0.1:8765/#kast/shop');await p.waitForTimeout(300);await p.screenshot({path:S+'s-shop.png'});
await p.goto('http://127.0.0.1:8765/#kast');await p.waitForSelector('#check');await p.click('#check');await p.waitForSelector('.labelform');await p.screenshot({path:S+'s-check.png'});
await p.click('[data-c="ok"]');await p.waitForTimeout(200);
console.log('nagekeken opgeslagen',await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('stijlstudio-v2')).items).filter(i=>i.nagekeken).length));
const echt=errs.filter(e=>!/ERR_FAILED|net::|Failed to load resource/.test(e));console.log('FOUTEN',echt);
await b.close();server.close();process.exit(echt.length?1:0);})().catch(e=>{console.error(e);server.close();process.exit(1);});
