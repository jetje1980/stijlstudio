// node tests/engine.test.mjs
import fs from 'fs';
import { zetHex, herken } from '../app/kleur.js';
import { stelVoor, alternatieven, pakTas, meerVan, WENSEN, herkenActiviteit, andereKleur, uitSelectie, contrast, printMix, smaakVan, naMaken, mouwen, basisIds, maakOutfit } from '../app/engine.js';
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
ok(alt.length > 0 && [-1, alt.filter(a => a.zelfde).length].includes(alt.findIndex(a => !a.zelfde)), 'alternatieven, zelfde manier eerst (' + alt.length + ', ' + alt.filter(a => a.zelfde).length + ' zelfde)');
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
ok(diner && diner.outfit.check.ok, 'uit eten: een outfit (sneakers mogen, nette schoenen hoeven niet)');
const loop = vind(koudW.plan, 'sport');
ok(loop && (!loop.outfit.slots.jas || /technical|sport|wind|run/i.test(loop.outfit.slots.jas.naam)), 'hardlopen: alleen een sportjack');
const strandK = vind(koudW.plan, 'strand');
ok(strandK && !strandK.outfit.items.some(i => ['glans', 'kant'].includes(i.textuur) && !['tas', 'schoen'].includes(i.rol)), 'strandwandeling: geen satijn of kant (leren laarzen glanzen wel)');
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
// 14. snit en taille
const snitVan = n => kast.find(i => i.naam.startsWith(n));
ok(snitVan('dark denim barrel').snit === 'barrel' && snitVan('Pull&Bear ballonpijpen').snit === 'ballon' && snitVan('High waist cropped flared').snit === 'flared', 'snit herkend: barrel, ballon, flared');
ok(snitVan('cropped mid waist jeans zara').taille === 'midden' && snitVan('Jean Agolde').taille === 'hoog', 'taille: middelhoog is geen hoog');
ok(kast.filter(i => ['barrel', 'ballon', 'flared', 'wide leg', 'cargo'].includes(i.snit)).every(i => i.pasvorm === 'wijd'), 'wijde snitten tellen als wijd (wijd op wijd blijft verboden)');
const street = stelVoor(kast, { rapport, weer: 'mild', sfeer: 'street' }, 6);
const paris = stelVoor(kast, { rapport, weer: 'mild', sfeer: 'parisienne' }, 6);
const telSnit = (l, s) => l.filter(o => o.slots.onder && s.includes(o.slots.onder.snit)).length;
ok(telSnit(street, ['barrel', 'ballon', 'cargo']) >= telSnit(paris, ['barrel', 'ballon', 'cargo']), 'streetstyle kiest vaker barrel/ballon/cargo dan parisienne');
// 15. kiezen uit je stukken: elke jas en elk paar schoenen in de eerste vier, of een reden
{
  let z = 7; const r = () => (z = (z * 1664525 + 1013904223) >>> 0) / 4294967296;
  const neem = (rol, n, f = () => true) => kast.filter(i => i.rol === rol && f(i)).sort(() => r() - 0.5).slice(0, n).map(i => i.id);
  let mis = 0, tot = 0;
  for (let t = 0; t < 12; t++) {
    const moetMee = [...neem('boven', 6), ...neem('onder', 4, i => i.soort !== 'short'), ...neem('jas', 2, i => i.warmte >= 2), ...neem('schoen', 2, i => !i.open), ...neem('laag', 2)];
    const dagen = [{ naam: 'Vr', temp: 12, momenten: ['dag', 'avond'], doen: { avond: 'pizzeria' } }, { naam: 'Za', temp: 9, momenten: ['dag'], doen: { dag: 'hardlopen' } }];
    const u = uitSelectie(kast, { dagen, rapport, moetMee, sfeer: [['street'], ['cosy'], ['parisienne']][t % 3] });
    for (const p of u.plan) for (const id of moetMee.filter(id => ['jas', 'schoen'].includes(kast.find(i => i.id === id).rol))) {
      tot++;
      if (!p.opties.slice(0, 4).some(o => o.items.some(i => i.id === id)) && !p.niet.some(x => x.item.id === id)) mis++;
    }
    if (t === 0) ok(u.plan.every(p => p.opties.every(o => o.check.ok)), 'kiezen: alle opties binnen de regels');
  }
  ok(!mis, `kiezen: elke jas en schoen in de eerste vier of met reden (${tot - mis}/${tot})`);
}
// 16. stoer met een zachte pop
{
  const sv = stelVoor(kast, { rapport, weer: 'mild', sfeer: ['street', 'vrouwelijk'] }, 12);
  ok(sv.filter(contrast).length >= 3 && sv.some(o => o.slots.schoen && o.slots.schoen.soort === 'hakken'), 'street + vrouwelijk: contrast en soms een hak');
  ok(stelVoor(kast, { rapport, weer: 'mild', sfeer: ['cosy'] }, 12).filter(contrast).length <= 3, 'cosy blijft vooral cosy');
  const telC = c => stelVoor(kast, { rapport, weer: 'mild', sfeer: ['street'], contrast: c }, 12).filter(contrast).length;
  const [c0, c1] = [telC(0), telC(1)];
  ok(c1 > c0 + 3, `schuif stoer × lief werkt (puur ${c0}, vol ${c1} van 12)`);
}
// 17. wijd op wijd kan alleen ingestopt met een riem, en dat komt nu ook echt voorbij
{
  const alle = [[], ['street'], ['parisienne'], ['klassiek']].flatMap(sf => stelVoor(kast, { rapport, weer: 'mild', sfeer: sf }, 12));
  const ww = alle.filter(o => o.slots.boven && o.slots.onder && o.slots.boven.pasvorm === 'wijd' && o.slots.onder.pasvorm === 'wijd');
  ok(ww.length && ww.every(o => o.slots.riem), `wijd op wijd alleen met riem (${ww.length} keer)`);
}
// 18. print op print: alleen als je het aanzet, en dan zoals stylisten het doen
{
  const twee = o => o.items.filter(i => i.print && !/zijstreep|firebird|track/i.test(i.naam + ' ' + (i.beschrijving || ''))).length >= 2;
  const uit = stelVoor(kast, { rapport, weer: 'mild' }, 12), aan = stelVoor(kast, { rapport, weer: 'mild', printMix: true }, 12);
  ok(!uit.some(twee), 'zonder print op print: nooit twee prints (rapport)');
  const mixen = aan.filter(twee);
  ok(mixen.length >= 1 && mixen.every(o => o.printMix && o.check.ok), `met print op print: ${mixen.length} mix(en), allemaal binnen de mix-regels`);
  const p = (print, kleur, printGroot) => ({ naam: print, print, kleur: [kleur], printGroot });
  ok(printMix(p('streep', 'donkerblauw'), p('luipaard', 'camel')).ok, 'streep met luipaard mag');
  ok(!printMix(p('bloem', 'rood', 'groot'), p('ruit', 'groen', 'groot')).ok, 'twee grote prints zonder gedeelde kleur niet');
  ok(!printMix(p('stip', 'rood'), p('stip', 'rood')).ok, 'twee keer dezelfde print niet');
}
// 19. jouw smaak uit inspiratie stuurt bij, en "maak na" vindt je eigen stukken
{
  const camo = { stukken: [{ soort: 'jas', rol: 'jas', kleur: ['olijf/khaki'], print: 'camouflage', pasvorm: 'wijd' }, { soort: 't-shirt', rol: 'boven', kleur: ['paars'] },
    { soort: 'jeans', rol: 'onder', kleur: ['lichtblauw'], snit: 'wide leg', textuur: 'denim' }, { soort: 'sneakers', rol: 'schoen', kleur: ['bruin'] }], methode: 'accent', sferen: ['street'], stoerLief: 'stoer' };
  const sm = smaakVan([{ analyse: camo, status: 'bevestigd', datum: '2026-10-20' }, { analyse: camo, status: 'archief', datum: '2026-10-20' }], '2026-10-26');
  ok(sm.n === 1 && sm.soort.sneakers > 0.9, 'smaak: alleen bevestigde beelden tellen');
  const oud = smaakVan([{ analyse: camo, status: 'bevestigd', datum: '2026-01-01' }, { analyse: { ...camo, stukken: [{ soort: 'blouse', rol: 'boven', kleur: ['wit'] }] }, status: 'bevestigd', datum: '2026-10-25' }], '2026-10-26');
  ok(oud.soort.blouse > oud.soort.sneakers * 3, 'smaak: recent telt zwaarder dan oud');
  const sneak = l => l.filter(o => o.slots.schoen && o.slots.schoen.soort === 'sneakers').length;
  ok(sneak(stelVoor(kast, { rapport, weer: 'fris', smaak: sm }, 8)) >= sneak(stelVoor(kast, { rapport, weer: 'fris' }, 8)), 'smaak: meer sneakers als je inspiratie sneakers heeft');
  const na = naMaken(kast, camo, { rapport, weer: 'fris' });
  ok(na.gevonden[0].item && /Sabbi/.test(na.gevonden[0].item.naam), 'maak na: de camo-jas uit je kast');
  ok(na.outfits.length && na.outfits.every(o => o.check.ok), 'maak na: outfits binnen je rapport');
}
// 20. kroeg of dansen: topje met een laag die uit kan, platte schoenen
{
  ok(herkenActiviteit('dansen in de kroeg') === 'kroeg' && herkenActiviteit('borrelen') === 'feest', 'kroeg en dansen herkend');
  for (const t of [8, 12, 19, 25]) {
    const u = pakTas(kast, { rapport, dagen: [{ naam: 'Za', temp: t, momenten: ['dag', 'avond'], doen: { dag: 'borrel en eten', avond: 'dansen in de kroeg' } }] });
    const o = u.plan[1].outfit;
    ok(o && ['topje', 'top'].includes(o.slots.boven?.soort) && o.slots.laag && o.slots.schoen?.soort !== 'hakken', `kroeg bij ${t}°: topje + laag, plat (${o && naam(o)})`);
  }
}
// 21. mouwloos: altijd een laag met mouwen erover; bij kou een trui of vest én een jas
{
  for (const weer of ['koud', 'fris', 'mild', 'warm']) {
    const os = stelVoor(kast, { rapport, weer }, 12).concat(stelVoor(kast, { rapport, weer, anker: [kast.find(i => /Donkerblauw spaghettitopje/.test(i.naam)).id] }, 3));
    const topjes = os.filter(o => o.slots.boven && mouwen(o.slots.boven) === 'geen');
    ok(topjes.length && topjes.every(o => o.slots.laag && mouwen(o.slots.laag) !== 'geen'), `${weer}: mouwloos altijd met een laag met mouwen (${topjes.length} keer)`);
    if (weer === 'koud') ok(topjes.every(o => ['trui', 'vest', 'teddy', 'blazer'].includes(o.slots.laag.soort) && o.slots.jas), 'koud: over een topje een trui of vest, en een jas');
    if (weer === 'koud') ok(os.filter(o => o.slots.boven && mouwen(o.slots.boven) === 'kort').every(o => o.slots.laag && mouwen(o.slots.laag) !== 'geen'), 'koud: ook over een t-shirt een laag met mouwen');
  }
}
// 22. Robins basisgarderobe: werkpaarden, en het paarse gilet als laagje
{
  const g = kast.find(i => /gilet paars/i.test(i.naam));
  ok(basisIds(rapport).has(g.id), 'paarse gilet staat in Robins basis');
  let n = 0, met = 0;
  for (const weer of ['fris', 'mild']) for (const sf of [[], ['cosy'], ['street'], ['klassiek']]) for (const o of stelVoor(kast, { rapport, weer, sfeer: sf }, 6)) { n++; if (o.items.includes(g)) met++; }
  ok(met / n >= 0.1, `paarse gilet komt regelmatig voorbij (${met} van ${n})`);
  const rood = kast.find(i => i.naam === 'tshirt rood sezane'), jeans = kast.find(i => /Pull&Bear ballon/.test(i.naam));
  const o = maakOutfit({ boven: rood, onder: jeans, laag: g }, { rapport, weer: 'mild' });
  ok(o.kleur.methode === 'accent', 'rood met paars op denim: neutraal met accenten, geen colorblock (' + o.kleur.methode + ')');
  ok(!o.check.ok, 'maar een gilet niet over een T-shirt');
  const bl = kast.find(i => i.id === 'bruin-longsleeve'), worker = kast.find(i => i.naam === 'kaki worker');
  ok(maakOutfit({ boven: bl, onder: worker, laag: g }, { rapport, weer: 'mild' }).check.ok, 'gilet over bruine longsleeve met khaki worker mag');
  const metG = ['koud', 'fris', 'mild'].flatMap(weer => stelVoor(kast, { rapport, weer }, 8).concat(stelVoor(kast, { rapport, weer, anker: [g.id] }, 6))).filter(x => x.slots.laag && x.slots.laag.soort === 'gilet');
  ok(metG.length && metG.every(x => mouwen(x.slots.boven || x.slots.heel) === 'lang' && (x.slots.boven || x.slots.heel).pasvorm !== 'wijd'), `gilet alleen over lange mouwen die aansluiten (${metG.length} keer)`);
  const a = stelVoor(kast, { rapport, weer: 'mild', anker: [g.id] }, 6);
  ok(new Set(a.map(x => x.slots.boven && x.slots.boven.id)).size >= 5, 'met het gilet vast: steeds een ander bovenstuk');
}
console.log(goed, 'goed,', fout, 'fout,', Date.now() - t0, 'ms');
process.exit(fout ? 1 : 0);
