// node tests/engine.test.mjs
import fs from 'fs';
import { zetHex, herken } from '../app/kleur.js';
import { stelVoor, alternatieven, pakTas, meerVan, WENSEN, herkenActiviteit, andereKleur } from '../app/engine.js';
import { info } from '../app/kleur.js';
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
ok(['hardloopwedstrijd', 'hardlopen', 'joggen', 'naar de gym', 'yoga'].every(t => herkenActiviteit(t) === 'sport') && herkenActiviteit('pizzeria') === 'pizzeria' && herkenActiviteit('iets onbekends') === null, 'activiteit uit eigen tekst');
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
// 11. de dingen die een stylist meteen zou zien
const koudW = pakTas(kast, { rapport, dagen: [
  { naam: 'Vr', temp: 8, momenten: ['reis', 'avond'], doen: { avond: 'uit eten' } },
  { naam: 'Za', temp: 7, momenten: ['ochtend', 'dag'], doen: { ochtend: 'hardlopen', dag: 'strandwandeling' } }] });
const vind = (plan, a) => plan.find(p => p.activiteit === a);
const diner = vind(koudW.plan, 'dinner');
ok(diner && diner.outfit.slots.schoen.formeel >= 3, 'uit eten: geen sneakers maar nette schoenen (' + diner?.outfit.slots.schoen.naam + ')');
const loop = vind(koudW.plan, 'sport');
ok(loop && (!loop.outfit.slots.jas || /technical|sport|wind|run/i.test(loop.outfit.slots.jas.naam)), 'hardlopen: alleen een sportjack');
const strandK = vind(koudW.plan, 'strand');
ok(strandK && !strandK.outfit.items.some(i => ['glans', 'kant'].includes(i.textuur) && i.rol !== 'tas'), 'strandwandeling: geen satijn of kant');
ok(koudW.plan.filter(p => p.outfit.slots.jas && !p.activiteit).every(p => /wol|kunstbont|fleece|leer|mohair/.test(p.outfit.slots.jas.materiaal || '') || p.outfit.slots.jas.textuur === 'pluizig'), 'bij 7-8 graden een warme jas');
ok(koudW.plan.filter(p => p.activiteit !== 'sport').every(p => !p.outfit.items.some(i => i.soort === 'sporttop' || i.soort === 'legging')), 'geen sportkleding buiten het sporten');
const zomer = pakTas(kast, { rapport, dagen: [
  { naam: 'Ma', temp: 28, momenten: ['reis', 'avond'], doen: { avond: 'feest' } },
  { naam: 'Di', temp: 29, momenten: ['dag'], doen: { dag: 'strand' } }] });
ok(zomer.ookMee.some(x => x.item.rol === 'zwem'), 'stranddag bij 28 graden: zwemkleding mee');
ok(!zomer.plan.some(p => (p.reis || p.moment === 'avond') && p.outfit.slots.schoen && /slipper|flipflop|haivanas/i.test(p.outfit.slots.schoen.naam)), 'niet op teenslippers reizen of uitgaan');
const parijs = pakTas(kast, { rapport, dagen: [{ naam: 'Za', temp: 18, momenten: ['dag'], doen: { dag: 'museum' } }] });
ok(!parijs.plan[0].outfit.items.some(i => i.open), 'bij 18 graden dichte schoenen');
// 12. geen twee dikke lagen
const dik = o => { const b = o.slots.boven || o.slots.heel, l = o.slots.laag; return b && l && ((b.soort === 'trui' && ['vest', 'teddy'].includes(l.soort)) || (b.warmte >= 3 && l.warmte >= 3 && !['gilet', 'blazer'].includes(l.soort))); };
const alleKoud = [koudW, tas, tas2, tas3].flatMap(t => t.plan.map(p => p.outfit).filter(Boolean)).concat(stelVoor(kast, { rapport, weer: 'koud', sfeer: ['cosy'] }, 20));
ok(!alleKoud.some(dik), 'geen dikke trui met gebreid vest erover (' + alleKoud.length + ' outfits bekeken)');
// 13. andere kleur
let kleurGoed = 0, kleurTot = 0;
const kofferIds2 = tas.koffer.map(k => k.item.id);
for (const p of tas.plan) for (const k of ['rood', 'kobaltblauw', 'geel', 'groen', 'roze']) {
  const r = andereKleur(kast, p.outfit, k, { rapport, weer: p.weer }, kofferIds2);
  kleurTot++;
  if (!r) continue;
  const raak = r.outfit.items.some(i => i.kleur[0] === k || (info(i.kleur[0]).fam === info(k).fam && !info(i.kleur[0]).neutraal));
  if (raak && r.outfit.check.ok && r.wissels.length <= 2 && r.outfit.slots.schoen) kleurGoed++;
  else console.log('   ✗ kleur', k, r.wissels.map(w => w.naar && w.naar.naam));
}
ok(kleurGoed >= kleurTot * 0.8, `andere kleur: ${kleurGoed} van ${kleurTot} lukken, met hooguit 2 wissels en binnen de regels`);
const kobalt = andereKleur(kast, tas.plan[0].outfit, 'kobaltblauw', { rapport, weer: tas.plan[0].weer }, kofferIds2);
ok(!kobalt || !kobalt.wissels.some(w => w.naar && ['donkerblauw', 'marine', 'denimblauw'].includes(w.naar.kleur[0]) && w.naar.kleur[0] !== 'kobaltblauw' && !w.van), 'kobalt is geen navy');
ok(kast.find(i => i.naam.startsWith('Khaki bloemen')).rol === 'onder', 'khaki broek is geen hak meer');
console.log(goed, 'goed,', fout, 'fout,', Date.now() - t0, 'ms');
process.exit(fout ? 1 : 0);
