// node tests/engine.test.mjs
import fs from 'fs';
import { zetHex, herken } from '../app/kleur.js';
import { stelVoor, alternatieven, pakTas, meerVan, WENSEN, herkenActiviteit } from '../app/engine.js';
const kast = JSON.parse(fs.readFileSync('data/kast.json'));
const rapport = JSON.parse(fs.readFileSync('data/rapport.json'));
zetHex(JSON.parse(fs.readFileSync('data/kennis.json')).kleuren);
let fout = 0, goed = 0;
const ok = (c, t) => { if (c) goed++; else { fout++; console.log('✗', t); } };
const naam = o => o.items.map(i => i.naam.slice(0, 22)).join(' + ');
const t0 = Date.now();

// 1. zonder keuzes: drie verschillende kleurmanieren
let v = stelVoor(kast, { rapport, weer: 'fris' });
ok(v.length === 3, 'drie voorstellen');
ok(new Set(v.map(o => o.kleur.methode)).size === 3, 'drie verschillende manieren: ' + v.map(o => o.kleur.methode));
v.forEach(o => console.log(' ', o.kleur.naam, o.score, '|', naam(o)));
ok(v.every(o => o.check.ok), 'alle voldoen aan het rapport');

// 2. elke gevraagde manier levert echt die manier op
for (const m of ['mono', 'tonsurton', 'accent', 'analoog', 'neutraal']) {
  const r = stelVoor(kast, { rapport, weer: 'mild', methode: m });
  ok(r.length > 0 && r.every(o => o.kleur.methode === m), 'manier ' + m + ' (' + r.length + ')');
  if (r[0]) console.log('  ', m, '|', naam(r[0]));
}
// 3. kleur + manier
let r = stelVoor(kast, { rapport, weer: 'fris', methode: 'tonsurton', kleur: 'bruin' });
ok(r.length && r.every(o => o.items.some(i => i.kleur.some(k => ['bruin','chocolade','camel','cognac','taupe','zand','beige'].includes(k)))), 'ton-sur-ton bruin');
r.forEach(o => console.log('   bruin tst |', naam(o)));
// 4. wensen zijn hard
r = stelVoor(kast, { rapport, weer: 'fris', wensen: ['trui', 'plat'], sfeer: 'cosy', sjiek: 0.1 });
ok(r.length && r.every(o => WENSEN.trui.test(o) && WENSEN.plat.test(o)), 'wensen trui+plat');
r.forEach(o => console.log('   cosy |', naam(o)));
r = stelVoor(kast, { rapport, weer: 'mild', sfeer: 'parisienne', sjiek: 0.9 });
r.forEach(o => console.log('   paris sjiek |', naam(o)));
r = stelVoor(kast, { rapport, weer: 'mild', sfeer: 'parisienne', sjiek: 0.1 });
r.forEach(o => console.log('   paris comfy |', naam(o)));
// 5. anker zit erin
const anker = kast.find(i => i.naam.startsWith('Felroze maxi')).id;
r = stelVoor(kast, { rapport, weer: 'mild', anker: [anker] });
ok(r.length && r.every(o => o.items.some(i => i.id === anker)), 'anker felroze rok');
r.forEach(o => console.log('   anker |', o.kleur.naam, '|', naam(o)));
// 6. nooit wijd op wijd
const alle = stelVoor(kast, { rapport, weer: 'mild' }, 30);
ok(alle.every(o => !(o.slots.boven && o.slots.onder && o.slots.boven.pasvorm === 'wijd' && o.slots.onder.pasvorm === 'wijd' && !o.items.some(i => i.soort === 'riem'))), 'geen wijd op wijd');
ok(alle.every(o => o.items.filter(i => i.print).length <= 1), 'max één print');
// 7. wisselen houdt de manier
const alt = alternatieven(kast, v[0], v[0].slots.onder ? 'onder' : 'heel', { rapport, weer: 'fris' });
ok(alt.length > 0 && alt.findIndex(a => !a.zelfde) >= alt.filter(a => a.zelfde).length, 'alternatieven, zelfde manier eerst (' + alt.length + ', ' + alt.filter(a => a.zelfde).length + ' zelfde)');
// 8. tas
const dagen = [{ naam: 'Vrijdag', temp: 12, momenten: ['reis', 'avond'] }, { naam: 'Zaterdag', temp: 13, momenten: ['dag', 'avond'] }, { naam: 'Zondag', temp: 11, momenten: ['dag'] }];
const t1 = Date.now();
const tas = pakTas(kast, { dagen, rapport });
console.log('  tas in', Date.now() - t1, 'ms;', tas.koffer.length, 'stuks;', JSON.stringify(tas.perManier));
tas.koffer.forEach(k => console.log('   ', k.keer + '×', k.item.naam));
tas.plan.forEach(p => console.log('   ', p.dag, p.moment, '|', p.outfit ? p.outfit.kleur.naam + ' | ' + naam(p.outfit) : 'GEEN'));
ok(tas.plan.every(p => p.outfit), 'elk moment een outfit');
ok(tas.plan.every(p => p.outfit && p.outfit.slots.schoen), 'elke tas-outfit heeft schoenen');
ok(v.concat(alle).every(o => o.slots.schoen), 'elk voorstel heeft schoenen');
ok(tas.plan.every(p => p.weer !== 'fris' || p.outfit.slots.jas), 'bij fris weer een jas');
ok(tas.plan.every(p => !p.outfit.items.some(i => i.open)), 'geen open schoenen bij 11-13 graden');
const kofferIds = new Set(tas.koffer.map(k => k.item.id));
ok(tas.plan.every(p => p.outfit.items.every(i => kofferIds.has(i.id))), 'alles komt uit de koffer');
ok(new Set(tas.plan.map(p => p.outfit.kleur.methode)).size >= 3, 'tas laat minstens drie kleurmanieren zien');
ok(tas.koffer.length <= 14, 'koffer compact (' + tas.koffer.length + ')');
ok(tas.koffer.filter(k => k.keer === 0).length <= 2, 'weinig passagiers');
tas.ontbreekt.forEach(o => console.log('   ontbreekt', o.naam, o.zet ? '→ ' + o.zet.item.naam + ' (+' + o.zet.n + ')' : '-'));
const mv = meerVan(kast, tas.koffer.map(k => k.item), 'tonsurton', { rapport, dagen });
console.log('   meer tst:', mv ? mv.uit.naam + ' → ' + mv.in.naam + ' (' + mv.nu + '→' + mv.n + ')' : 'geen');
// 9. meerdere sferen: mengen en afwisselen
const meng = stelVoor(kast, { rapport, weer: 'fris', sfeer: ['cosy', 'street'] });
ok(meng.length === 3, 'cosy + street geeft voorstellen');
meng.forEach(o => console.log('   cosy×street |', naam(o)));
const tas2 = pakTas(kast, { dagen, rapport, sfeer: ['cosy', 'street'], afwisselen: true });
ok(tas2.plan.every(p => p.outfit) && new Set(tas2.plan.map(p => p.sfeer)).size === 2, 'afwisselen verdeelt beide sferen');
tas2.plan.forEach(p => console.log('   ', p.dag, p.moment, p.sfeer, '|', p.outfit && naam(p.outfit)));
// 10. activiteiten per dagdeel en wat niet mee
ok(herkenActiviteit('hardloopwedstrijd') === 'sport' && herkenActiviteit('pizzeria') === 'pizzeria' && herkenActiviteit('iets onbekends') === null, 'activiteit uit eigen tekst');
const rokken = kast.filter(i => i.soort === 'rok').map(i => i.id);
const dagen3 = [{ naam: 'Za', temp: 14, momenten: ['ochtend', 'dag', 'avond'], doen: { ochtend: 'hardloopwedstrijd', dag: 'strand', avond: 'pizzeria' } },
                { naam: 'Zo', temp: 15, momenten: ['dag'] }];
const tas3 = pakTas(kast, { dagen: dagen3, rapport, uitsluiten: rokken });
tas3.plan.forEach(p => console.log('   ', p.dag, p.moment, p.activiteit || '-', '|', p.outfit && naam(p.outfit)));
const sportP = tas3.plan.find(p => p.activiteit === 'sport');
ok(sportP && sportP.outfit && sportP.outfit.slots.schoen && sportP.outfit.slots.schoen.soort === 'sneakers' && ['legging', 'short'].includes(sportP.outfit.slots.onder?.soort) && !sportP.outfit.slots.tas && !sportP.outfit.slots.laag, 'hardloopwedstrijd geeft een sportoutfit zonder breisel');
const strandP = tas3.plan.find(p => p.activiteit === 'strand');
ok(strandP && strandP.outfit && strandP.outfit.slots.schoen.soort !== 'hakken', 'strandwandeling: platte schoenen');
ok(tas3.plan.every(p => !p.outfit || !p.outfit.items.some(i => i.soort === 'rok')), 'geen rokken als die thuisblijven');
ok(tas3.plan.every(p => p.outfit), 'elk dagdeel een outfit');
console.log(goed, 'goed,', fout, 'fout,', Date.now() - t0, 'ms');
process.exit(fout ? 1 : 0);
