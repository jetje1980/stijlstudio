// Laadt de oude pagina's (griette.html, outfitkaart.html) met een backup in een
// testbrowser en schrijft de kast en de kleurkennis weg zoals die pagina's ze
// zelf zien. Daarna: python3 tools/migreer.py <backup.json> <uitmap>
// De oude pagina's zijn uit de repo gehaald; haal ze eerst terug met
//   git checkout 8cc14e0 -- griette.html outfitkaart.html
// Gebruik: node tools/dump-oud.js <backup.json> <uitmap>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [backupPad, uit] = process.argv.slice(2);
const bk = JSON.parse(fs.readFileSync(backupPad)).data;
const root = path.resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  await c.addInitScript(d => {
    if (sessionStorage.getItem('geladen')) return;
    sessionStorage.setItem('geladen', 1);
    for (const k in d) if (!/key|secret/i.test(k)) localStorage.setItem(k, d[k]);
  }, bk);
  const p = await c.newPage();
  await p.route(/^https?:/, r => r.abort());

  await p.goto('file://' + root + '/griette.html');
  await p.waitForTimeout(3000);
  const kast = await p.evaluate(() => {
    const res = [];
    for (const cat of Object.keys(items)) for (const it of items[cat]) {
      if (deletedItemIds.has(it.id)) continue;
      res.push({ cat, ...it, tags: itemTags[it.id] || null, vis: itemVisueel[it.id] || null });
    }
    return res;
  });
  fs.writeFileSync(path.join(uit, 'kast-runtime.json'), JSON.stringify(kast));

  await p.goto('file://' + root + '/outfitkaart.html');
  await p.waitForTimeout(2000);
  const kennis = await p.evaluate(() => ({ KLEUREN, COMBO_TYPES, ROBIN_OUTFITS, FW_TRENDS }));
  fs.writeFileSync(path.join(uit, 'kennis-runtime.json'), JSON.stringify(kennis));
  console.log(kast.length, 'stuks uit de oude kast');
  await b.close();
})();
