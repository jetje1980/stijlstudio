// De stylist die rekent. Geen AI: regels uit het rapport, de kleurmanieren,
// sfeer, wensen en weer. Alles wat hier gebeurt is na te rekenen, dus elke
// outfit komt echt uit de kast en houdt zich aan wat je koos.
import { info, herken, METHODEN, ZWAAR } from './kleur.js';

export const ROLLEN_KLEDING = ['boven', 'onder', 'heel', 'laag', 'jas'];

// ── SFEREN ───────────────────────────────────────────────────────────────────
// Een sfeer is een recept: welke soorten, texturen en prints erbij horen.
// De comfy/sjiek-schuif staat daar los van en verschuift het niveau.
export const SFEREN = {
  cosy: { naam: 'Cosy', uitleg: 'Breisels, zachte stoffen, ton-sur-ton, platte schoenen',
    soort: { trui: 3, vest: 3, teddy: 3, gilet: 1, longsleeve: 1, jeans: 1, broek: 1, legging: 1, laarzen: 2, sneakers: 2, muts: 2, sjaal: 1, hakken: -3, topje: -2, blazer: -1 },
    textuur: { 'grof gebreid': 2, pluizig: 3, 'fijn gebreid': 2.5, 'suède': 1, glans: -1 },
    snit: { ballon: 1, 'wide leg': 1, legging: 1 },
    methode: { tonsurton: 1.5, mono: 1, neutraal: 1, colorblock: -1 } },
  parisienne: { naam: 'Parisienne', uitleg: 'Rechte jeans of pantalon, blouse of fijn breisel, trench of blazer, loafers; neutraal met één accent',
    soort: { blouse: 3, trenchcoat: 3, loafers: 3, pantalon: 2, jeans: 2, blazer: 2, sjaal: 2, hakken: 1, longsleeve: 1, vest: 1, rok: 1, sandalen: 1, pet: -2, legging: -2, teddy: -1 },
    textuur: { 'fijn gebreid': 1, linnen: 1, denim: 1, leer: 1 },
    print: { streep: 3, stip: 1, luipaard: 1 },
    snit: { recht: 2, flared: 2, 'wide leg': 1, slim: 1, ballon: -1, cargo: -2, barrel: -1 },
    methode: { accent: 2, neutraal: 1.5, tonsurton: 1, colorblock: -2, mix: -2 } },
  street: { naam: 'Streetstyle', uitleg: 'Sneakers, cargo, oversized, petje, technische jacks',
    soort: { sneakers: 3, pet: 3, jas: 2, broek: 2, jeans: 2, 't-shirt': 2, trui: 1, longsleeve: 1, sporttop: 1, hakken: -0.5, blouse: -0.5, pantalon: -1 },
    textuur: { structuur: 1, denim: 1, glad: 0.5 },
    snit: { barrel: 2, ballon: 2, cargo: 2, 'wide leg': 1, flared: -1 },
    methode: { colorblock: 1, accent: 1 } },
  klassiek: { naam: 'Klassiek casual', uitleg: 'Je rapport als basis: blazer, pantalon, blouse, loafers of kitten heels',
    soort: { blazer: 3, pantalon: 3, blouse: 2, loafers: 3, hakken: 2, trenchcoat: 2, rok: 1, jurk: 1, top: 1, riem: 1, sneakers: -1 },
    textuur: { glans: 1, 'fijn gebreid': 1 },
    snit: { 'wide leg': 2, recht: 1, flared: 1, potlood: 1, cargo: -2, ballon: -1 },
    methode: { split: 1, accent: 1, tonsurton: 1 } },
  vrouwelijk: { naam: 'Vrouwelijk', uitleg: 'Jurk of rok, kant, satijn, een open hals, kitten heels',
    soort: { jurk: 3, rok: 3, topje: 2, hakken: 2, sandalen: 1, blouse: 1, sjaal: 1, laarzen: 1, sneakers: 0, pet: -1 },
    textuur: { kant: 3, glans: 2, 'fijn gebreid': 1 },
    snit: { 'A-lijn': 2, plissé: 2, wikkel: 2, flared: 1, cargo: -2 },
    methode: { analoog: 1, split: 1 } },
};

function sfeerPunten(o, sf) {
  let t = 0;
  for (const i of o.items) {
    t += (sf.soort[i.soort] || 0) * 0.6;
    t += ((sf.textuur || {})[i.textuur] || 0) * 0.5;
    if (i.print) t += ((sf.print || {})[i.print] || 0) * 0.5;
    if (i.snit) t += ((sf.snit || {})[i.snit] || 0) * 0.6;
  }
  return t + (sf.methode[o.kleur.methode] || 0);
}

export const sfeerLijst = s => (Array.isArray(s) ? s : s ? [s] : []);

// ── WENSEN ───────────────────────────────────────────────────────────────────
// Een wens is een harde eis. Daarom staat er maar een handvol.
export const WENSEN = {
  trui:  { naam: 'Lekkere trui', test: o => o.items.some(i => ['trui', 'vest', 'teddy'].includes(i.soort) && /gebreid|pluizig/.test(i.textuur)) },
  laag:  { naam: 'Extra laagje', test: o => !!(o.slots.laag || o.slots.jas) },
  plat:  { naam: 'Platte schoenen', test: o => !o.slots.schoen || o.slots.schoen.soort !== 'hakken' },
  broek: { naam: 'Broek', test: o => !!o.slots.onder && ['broek', 'jeans', 'pantalon', 'legging'].includes(o.slots.onder.soort) },
  rok:   { naam: 'Rok of jurk', test: o => (o.slots.onder && o.slots.onder.soort === 'rok') || (o.slots.heel && o.slots.heel.soort === 'jurk') },
};

// ── ACTIVITEITEN ─────────────────────────────────────────────────────────────
// Wat je op een dagdeel doet, bepaalt hoe net of sportief de outfit wordt.
// Optioneel: weet je het nog niet, dan geldt gewoon het moment.
export const ACTIVITEITEN = {
  chillen:  { naam: 'Chillen', sjiek: 0.15, wensen: ['plat'], vermijd: ['glans', 'kant'] },
  wandelen: { naam: 'Wandelen', sjiek: 0.2, wensen: ['plat', 'broek'], vermijd: ['glans', 'kant'] },
  strand:   { naam: 'Strandwandeling', sjiek: 0.2, wensen: ['plat'], vermijd: ['glans', 'kant'], strand: true },
  stad:     { naam: 'Stad of shoppen', sjiek: 0.45, wensen: ['plat'] },
  museum:   { naam: 'Museum', sjiek: 0.55 },
  terras:   { naam: 'Lunch of terras', sjiek: 0.5 },
  pizzeria: { naam: 'Pizzeria', sjiek: 0.45 },
  dinner:   { naam: 'Uit eten', sjiek: 0.8 },
  feest:    { naam: 'Feest of borrel', sjiek: 0.9 },
  // informeel: een topje met een laag erover die uit kan als het warm wordt
  kroeg:    { naam: 'Kroeg of dansen', sjiek: 0.4, laagjes: true, wensen: ['plat'] },
  sport:    { naam: 'Sporten of hardlopen', sport: true },
};
// Zelf getypt ("hardloopwedstrijd", "etentje bij vrienden") vertalen naar een
// van de bekende. Niets herkend? Dan telt alleen het moment.
export function herkenActiviteit(tekst) {
  const t = String(tekst || '').toLowerCase();
  if (!t) return null;
  if (ACTIVITEITEN[t]) return t;
  const regels = [
    [/hardlo+p|rennen|joggen|\brun|sport|fitness|gym|yoga|pilates|fiets|mountainbike|zwemmen|tennis|padel|golf|wedstrijd|marathon|training/, 'sport'],
    [/strand|zee|duin/, 'strand'], [/wandel|hike|hiken|bos|natuur|berg/, 'wandelen'],
    [/chill|relax|luier|thuis|bank|lezen|spa/, 'chillen'], [/museum|expo|galerie|tentoonstelling/, 'museum'],
    [/pizza|snack|friet|burger/, 'pizzeria'], [/diner|uit eten|restaurant|etentje|eten/, 'dinner'],
    [/kroeg|dansen|uitgaan|club|stappen|\bbar\b|cafe|café/, 'kroeg'], [/feest|borrel|bruiloft|party|verjaardag|concert/, 'feest'], [/stad|shop|winkel|markt/, 'stad'],
    [/lunch|terras|koffie|brunch|ontbijt/, 'terras'],
  ];
  const r = regels.find(([re]) => re.test(t));
  return r ? r[1] : null;
}

// ── WEER ─────────────────────────────────────────────────────────────────────
export function weerKlasse(temp) {
  if (temp == null) return 'mild';
  if (temp < 10) return 'koud';
  if (temp < 16) return 'fris';
  if (temp < 23) return 'mild';
  return 'warm';
}

// ook als alleen de naam het zegt ("kitten heel sandalen" staat als hakken)
const open = i => i.open || i.soort === 'sandalen' || (i.rol === 'schoen' && /sandal|slipper|mule|slingback/i.test(i.naam));
// teenslippers en badslippers: voor het strand en luieren, niet voor de stad
export const isSlipper = i => i.rol === 'schoen' && /slipper|flipflop|haivanas|teenslipper/i.test(i.naam);
function pastBijWeer(i, klasse) {
  if (klasse === 'koud') {
    if (open(i) || ['short', 'zwemkleding'].includes(i.soort)) return false;
    // een zomers bovenstuk kan nog onder een trui of jas; de rest niet
    return i.seizoen !== 'zomer' || i.rol === 'boven';
  }
  if (klasse === 'fris') return !open(i) && i.soort !== 'zwemkleding' && !(i.soort === 'short' && i.warmte < 2);
  if (klasse === 'warm') return i.warmte <= 2 && i.rol !== 'jas' && !['laarzen', 'muts', 'teddy'].includes(i.soort);
  // mild (16-22 graden): dichte schoenen
  return !open(i) && i.soort !== 'zwemkleding' && i.soort !== 'muts';
}

// ── MOUWEN ───────────────────────────────────────────────────────────────────
// 'geen' (spaghetti, topje, gilet), 'kort' of 'lang'. Uit soort en naam.
export function mouwen(i) {
  const t = `${i.naam} ${i.beschrijving || ''}`.toLowerCase();
  if (i.soort === 'topje' || i.soort === 'gilet' || /spaghetti|mouwloos|\btank|hemdje|singlet|strapless|halter/.test(t)) return 'geen';
  if (/short sleeve|korte mouw|t-?shirt/.test(t)) return 'kort';
  if (['trui', 'longsleeve', 'blouse', 'vest', 'blazer', 'teddy', 'jas', 'trenchcoat'].includes(i.soort) || /longsleeve|long sleeve|lange mouw|sleeve|mouw/.test(t)) return 'lang';
  return 'kort';
}
// Wat er over de armen moet: een mouwloos topje nooit zonder laag met
// mouwen (een gilet telt niet), en bij kou ook een t-shirt niet.
function armenTeKoud(o, weer) {
  const b = o.slots.boven;
  if (!b || weer === 'warm') return false;
  const nodig = mouwen(b) === 'geen' || (weer === 'koud' && mouwen(b) === 'kort');
  return nodig && !(o.slots.laag && mouwen(o.slots.laag) !== 'geen');
}

// ── LAAGJES ──────────────────────────────────────────────────────────────────
// Wat mag over wat. Per soort laag, en op materiaal: twee dikke breisels op
// elkaar nooit; een trui onder een gilet alleen als het materiaal verschilt
// (een katoenen sweater onder een gebreid gilet).
const BREI = i => /gebreid|pluizig/.test(i.textuur || '');
const DIKBREI = i => /grof|pluizig/.test(i.textuur || '');
export function laagProbleem(laag, b) {
  if (!laag || !b) return null;
  const s = laag.soort;
  if (s === 'gilet') {
    if (mouwen(b) !== 'lang') return 'Een gilet hoort over lange mouwen, niet over een T-shirt of topje.';
    if (b.pasvorm === 'wijd') return 'Een gilet over een wijd shirt wordt een blok.';
    // in principe geen trui eronder; wel als de stof echt anders is (grof
    // gebreide wol onder pluizig mohair, of een sweater onder breisel)
    if (b.soort === 'trui') return b.textuur === laag.textuur || (b.materiaal && b.materiaal === laag.materiaal) ? 'Een trui onder een gilet alleen als de stof echt anders is.' : null;
    if (b.warmte >= 3 || DIKBREI(b)) return 'Onder een gilet iets dunners.';
    return null;
  }
  if (DIKBREI(laag) && DIKBREI(b)) return `Twee dikke breisels op elkaar (${b.naam} en ${laag.naam}).`;
  if (s === 'vest' || s === 'teddy') {
    if (b.pasvorm === 'wijd' && laag.pasvorm !== 'kort' && (laag.warmte >= 3 || DIKBREI(laag))) return `Een dik ${s} over een wijd shirt wordt een blok.`;
  }
  if (s === 'blazer') {
    if (laag.pasvorm === 'wijd' && b.pasvorm === 'wijd') return 'Een oversized blazer alleen met iets strakkers eronder.';
    if (DIKBREI(b)) return 'Een blazer over een dikke, pluizige trui trekt scheef.';
  }
  return null;
}

// ── RAPPORTREGELS ────────────────────────────────────────────────────────────
const STOPBAAR = new Set(['blouse', 't-shirt', 'top', 'topje', 'longsleeve']);
// Een dunne trui (fijn gebreid, sweatstof) kun je ook half instoppen; grof of
// pluizig breisel niet, dat bolt op.
const instopbaar = b => STOPBAAR.has(b.soort) || (b.soort === 'trui' && !/grof|pluizig/.test(b.textuur || ''));

export function controleer(o, rapport, ctx = {}) {
  const problemen = [], tips = [];
  const { boven, onder, heel, laag } = o.slots;
  const kleding = o.items.filter(i => ROLLEN_KLEDING.includes(i.rol));

  // Nooit wijd op wijd, tenzij bewust gestyled (rapport: "instoppen, mouwen
  // oprollen, riem, hoge taille"): half ingestopt, met een riem of op een
  // broek die niet laag zit. Op een lage taille laat instoppen niets zien.
  const isSet = boven && onder && boven.set && boven.set === onder.set;
  if (isSet) tips.push('Een set: draag hem als geheel, en geef hem vorm met je schoenen, een tas of een laagje.');
  if (boven && onder && boven.pasvorm === 'wijd' && onder.pasvorm === 'wijd' && !isSet) {
    const riem = o.items.some(i => i.soort === 'riem');
    if (instopbaar(boven) && (riem || onder.taille !== 'laag'))
      tips.push(riem ? 'Stop het bovenstuk in en draag de riem: zo blijft je taille zichtbaar.' : `Stop de voorkant van je ${boven.soort} half in (French tuck): zo blijft je taille zichtbaar.`);
    else problemen.push({ regel: 'silhouet', tekst: instopbaar(boven) ? 'Wijd op wijd op een lage taille: instoppen laat dan niets zien.' : 'Wijd op wijd: je silhouet verdwijnt.' });
  }
  if (heel && heel.pasvorm === 'wijd' && laag && laag.pasvorm === 'wijd') problemen.push({ regel: 'silhouet', tekst: 'Wijde set met een wijde laag erover.' });

  // Laagjes van dun naar dik: een blouse over een trui werkt niet.
  const DIKTE = { topje: 0.5, sporttop: 0.5, 't-shirt': 1, top: 1.5, longsleeve: 2, blouse: 2, trui: 3, vest: 3.5, gilet: 3.5, blazer: 4, teddy: 5 };
  if (laag && (boven || heel) && (DIKTE[laag.soort] || 3) <= (DIKTE[(boven || heel).soort] || 1.5))
    problemen.push({ regel: 'laagjes', tekst: `${laag.soort} over ${(boven || heel).soort} draagt niet.` });
  const lp = laagProbleem(laag, boven || heel);
  if (lp) problemen.push({ regel: 'laagjes', tekst: lp });
  // Twee dikke lagen op elkaar wordt te veel: over een trui alleen een gilet,
  // blazer of jas, geen gebreid vest of teddy.
  const onder_ = boven || heel;
  if (laag && onder_ && (
      (onder_.soort === 'trui' && ['vest', 'teddy'].includes(laag.soort)) ||
      (onder_.warmte >= 3 && laag.warmte >= 3 && !['gilet', 'blazer'].includes(laag.soort))))
    problemen.push({ regel: 'laagjes', tekst: `Twee dikke lagen (${onder_.soort} en ${laag.soort}) wordt te veel.` });

  // Oversized laag alleen met iets strakkers eronder (rapport, blazers: zie laagProbleem)
  if (laag && boven && laag.pasvorm === 'wijd' && boven.pasvorm === 'wijd' && ['vest', 'gilet'].includes(laag.soort))
    problemen.push({ regel: 'silhouet', zacht: true, tekst: `Oversized ${laag.soort} over een wijd bovenstuk: neem er iets strakkers onder.` });

  // Een blazer onder een oversized jas wordt een stapel schouders.
  if (laag && o.slots.jas && laag.soort === 'blazer' && o.slots.jas.pasvorm === 'wijd')
    problemen.push({ regel: 'laagjes', tekst: 'Een blazer onder een oversized jas wordt te veel.' });

  // een zijstreep op een trainingsbroek is een detail, geen print
  if (!ctx.sport && armenTeKoud(o, ctx.weer))
    problemen.push({ regel: 'armen', tekst: mouwen(boven) === 'geen' ? 'Een mouwloos topje zonder laag met mouwen erover is te koud.' : 'Bij deze kou een trui of vest over je shirt.' });

  const prints = o.items.filter(i => i.print && !(i.print === 'streep' && /zijstreep|firebird|track/i.test(`${i.naam} ${i.beschrijving || ''}`)));
  if (prints.length > 1) {
    // Print op print, zoals stylisten het doen: alleen als je het aanzet, en
    // alleen als het klopt. Je rapport zegt maximaal één print.
    const mix = ctx.printMix && prints.length === 2 ? printMix(prints[0], prints[1]) : null;
    if (mix && mix.ok) { o.printMix = true; tips.push(`Print op print (trend, buiten je rapport): ${mix.waarom}`); }
    else problemen.push({ regel: 'prints', tekst: 'Meer dan één print (' + prints.map(i => i.print).join(' + ') + ').' + (mix ? ' ' + mix.waarom : '') });
  }

  const texturen = new Set(kleding.map(i => i.textuur));
  // (een set is één stof; dan maakt een jas, tas of schoen het contrast)
  if ((o.kleur.methode === 'mono' || o.kleur.methode === 'neutraal') && texturen.size < 2 && kleding.length >= 2 && !isSet)
    problemen.push({ regel: 'textuur', tekst: 'Zonder kleurcontrast moet de stof het werk doen: nu maar één textuur.' });

  // Eén heldere kleur is het statement; geen zwaargewicht ernaast.
  const helder = kleding.concat(o.items.filter(i => i.rol === 'tas' || i.rol === 'schoen'))
    .filter(i => { const k = info(i.kleur[0]); return !k.neutraal && !k.zwaar && k.licht > 0.25; });
  const zwaar = kleding.filter(i => ZWAAR.has(i.kleur[0]));
  if (helder.length && zwaar.length && o.kleur.methode !== 'mono')
    problemen.push({ regel: 'statement', zacht: true, tekst: `${zwaar[0].kleur[0]} naast ${helder[0].kleur[0]}: twee kleuren die allebei de aandacht pakken.` });

  const gezicht = boven || heel;
  if (gezicht && /grijs|antraciet|champagne/.test(gezicht.kleur[0] || '') && !/gebreid|pluizig/.test(gezicht.textuur))
    tips.push('Grijs vlak bij je gezicht maakt je fletser; een sjaaltje in roze of lichtblauw helpt.');
  if (gezicht && gezicht.hals && /col|hoog|gesloten/i.test(gezicht.hals)) tips.push('Een hoge hals is massief voor jou; open hem met een ketting of sjaal.');
  if (boven && boven.pasvorm === 'wijd' && onder && onder.pasvorm !== 'wijd' && STOPBAAR.has(boven.soort)) tips.push('Oversized bewust stylen: half instoppen of mouwen oprollen.');
  if (o.kleur.methode === 'colorblock') tips.push('Colorblocking mag; je rapport zoekt nu vooral balans.');
  return { ok: !problemen.some(p => !p.zacht), problemen, tips };
}

// ── PRINT OP PRINT ──────────────────────────────────────────────────────────
// Hoe stylisten en influencers het doen: twee prints, nooit drie. Eén is een
// "neutrale" print (streep, luipaard, camo) of ze delen een kleur. En ze
// verschillen in grootte: een fijne streep met een grote luipaard, niet twee
// grote naast elkaar. Twee keer dezelfde print is geen mix.
const NEUTRALE_PRINT = new Set(['streep', 'luipaard', 'camouflage']);
const STANDAARD_GROOT = { streep: 'klein', stip: 'klein', ruit: 'groot', luipaard: 'groot', camouflage: 'groot', bloem: 'groot', patchwork: 'groot' };
const KLASSIEK = [['streep', 'luipaard'], ['streep', 'bloem'], ['luipaard', 'camouflage'], ['streep', 'stip'], ['streep', 'camouflage'], ['luipaard', 'stip']];
export const printGrootte = i => i.printGroot || STANDAARD_GROOT[i.print] || 'groot';
export function printMix(a, b) {
  if (a.print === b.print) return { ok: false, waarom: 'Twee keer dezelfde print is geen mix.' };
  const famA = new Set(a.kleur.map(k => info(k).fam)), deelt = b.kleur.some(k => famA.has(info(k).fam));
  const neutraal = NEUTRALE_PRINT.has(a.print) || NEUTRALE_PRINT.has(b.print);
  if (!deelt && !neutraal) return { ok: false, waarom: 'De prints delen geen kleur.' };
  const ga = printGrootte(a), gb = printGrootte(b);
  if (ga === gb && !(a.print === 'streep' || b.print === 'streep')) return { ok: false, waarom: 'Twee prints even groot vechten om aandacht.' };
  const klassiek = KLASSIEK.some(([x, y]) => (a.print === x && b.print === y) || (a.print === y && b.print === x));
  const groot = ga === 'groot' ? a : b;
  return { ok: true, klassiek, waarom: `${a.print} met ${b.print}${klassiek ? ', een klassieker' : ''}${deelt ? ', ze delen een kleur' : ''}; ${groot.naam} is de baas, de rest effen.` };
}

// ── JOUW SMAAK ───────────────────────────────────────────────────────────────
// Uit je bevestigde inspiratie: wat steeds terugkomt. Recent telt zwaarder,
// zodat het meebeweegt met waar je nu zit. Elk gewicht is 0..1: in hoeveel
// van je inspiratie het voorkomt.
export function smaakVan(inspo, vandaag = new Date().toISOString().slice(0, 10), sterkte = 1, ookOngecheckt = false) {
  const lijst = inspo.filter(x => x.analyse && (x.status === 'bevestigd' || (ookOngecheckt && x.status === 'te checken')));
  if (!lijst.length) return null;
  const p = { soort: {}, snit: {}, fam: {}, print: {}, textuur: {}, methode: {}, sfeer: {}, contrast: 0, n: lijst.length };
  let totaal = 0;
  for (const x of lijst) {
    const dagen = Math.max(0, (new Date(vandaag) - new Date(x.datum || vandaag)) / 864e5);
    const w = Math.exp(-dagen / 75);
    totaal += w;
    const a = x.analyse;
    const tel = (veld, waarden) => { for (const v of new Set(waarden.filter(Boolean))) p[veld][v] = (p[veld][v] || 0) + w; };
    tel('soort', a.stukken.map(i => i.soort));
    tel('snit', a.stukken.map(i => i.snit));
    tel('fam', a.stukken.flatMap(i => (i.kleur || []).map(k => info(k).fam)).filter(f => f !== 'multi'));
    tel('print', a.stukken.map(i => i.print));
    tel('textuur', a.stukken.map(i => i.textuur));
    tel('methode', [a.methode]);
    tel('sfeer', a.sferen || []);
    if (a.stoerLief === 'contrast') p.contrast += w;
  }
  for (const veld of ['soort', 'snit', 'fam', 'print', 'textuur', 'methode', 'sfeer'])
    for (const k in p[veld]) p[veld][k] = Math.min(1, p[veld][k] / totaal * sterkte);
  p.contrast = Math.min(1, p.contrast / totaal * sterkte);
  return p;
}

function smaakPunten(o, sm) {
  let t = 0;
  for (const i of o.items) {
    t += (sm.soort[i.soort] || 0) * 0.6 + (sm.snit[i.snit] || 0) * 0.6 + (i.print ? (sm.print[i.print] || 0) * 0.6 : 0) + (sm.textuur[i.textuur] || 0) * 0.2;
    if (ROLLEN_KLEDING.includes(i.rol)) t += (sm.fam[info(i.kleur[0]).fam] || 0) * 0.3;
  }
  t = Math.min(t, 3) + (sm.methode[o.kleur.methode] || 0) * 1.2;
  for (const [k, w] of Object.entries(sm.sfeer)) if (SFEREN[k] && w > 0.2) t += sfeerPunten(o, SFEREN[k]) * w * 0.3;
  if (sm.contrast && contrast(o)) t += sm.contrast * 1.5;
  return t;
}

// "Maak dit na uit mijn kast": per stuk op de foto het beste uit jouw kast.
// Te ver weg? Dan staat het bij "mist".
export function zoekNa(kast, stukken) {
  return stukken.map(s => {
    let beste = null, w = 0;
    for (const i of kast) {
      if (i.rol !== s.rol) continue;
      let t = 1;
      if (i.soort === s.soort) t += 3;
      const fams = (s.kleur || []).map(k => info(k).fam);
      if (fams.includes(info(i.kleur[0]).fam)) t += 2;
      if (s.snit && i.snit === s.snit) t += 1.5;
      if (s.print && i.print === s.print) t += 1.5;
      if (s.textuur && i.textuur === s.textuur) t += 0.5;
      if (t > w) { w = t; beste = i; }
    }
    return { stuk: s, item: w >= 4 ? beste : null, bijna: w >= 4 ? null : beste, score: w };
  });
}

export function naMaken(kast, analyse, ctx) {
  const gevonden = zoekNa(kast, analyse.stukken);
  const smaak = smaakVan([{ analyse, status: 'bevestigd', datum: null }], undefined, 1.5);
  const sctx = { ...ctx, smaak, sfeer: (analyse.sferen || []).filter(k => SFEREN[k]), printMix: ctx.printMix || !!analyse.printMix };
  // Eerst met zoveel mogelijk gevonden kernstukken vast; lukt dat niet, één minder.
  let anker = gevonden.filter(g => g.item && ['boven', 'onder', 'heel', 'jas', 'laag'].includes(g.item.rol)).sort((a, b) => b.score - a.score).map(g => g.item.id).slice(0, 3);
  let outfits = [];
  while (true) {
    outfits = stelVoor(kast, { ...sctx, anker }, 3);
    if (outfits.length || !anker.length) break;
    anker = anker.slice(0, -1);
  }
  return { gevonden, outfits, mist: gevonden.filter(g => !g.item) };
}

// ── SCORE ────────────────────────────────────────────────────────────────────
// Stoer met een zachte pop (stylingkennis): een stoere basis met één lief of
// net stuk, of andersom. Precies één tegenpool; meer wordt rommelig.
const STOER_SOORT = new Set(['jeans', 'pet', 'teddy', 'sporttop']);
const STOER_SNIT = new Set(['barrel', 'ballon', 'cargo', 'mom']);
const LIEF_SOORT = new Set(['topje', 'jurk']);
const LIEF_SNIT = new Set(['A-lijn', 'plissé', 'wikkel', 'potlood']);
export function karakter(i) {
  if (['tas', 'riem', 'sjaal'].includes(i.soort) || i.rol === 'tas') return null;
  // bij schoenen telt de vorm, niet de glans van het leer
  // chunky loafers (dik platform) zijn juist stoer
  if (i.rol === 'schoen' && i.soort === 'loafers' && /chun?c?ky|chuncky|platform|grof|lug/i.test(`${i.naam} ${i.beschrijving || ''}`)) return 'stoer';
  if (i.rol === 'schoen') return ['hakken', 'loafers'].includes(i.soort) ? 'lief' : ['sneakers', 'laarzen'].includes(i.soort) ? 'stoer' : null;
  if (LIEF_SOORT.has(i.soort) || LIEF_SNIT.has(i.snit) || ['kant', 'glans'].includes(i.textuur)) return 'lief';
  if (STOER_SOORT.has(i.soort) || STOER_SNIT.has(i.snit) || ['leer', 'denim'].includes(i.textuur) || i.print === 'camouflage' || i.detail === 'zijstreep' || (i.rol === 'jas' && /technical|cargo|bomber|biker/i.test(i.naam))) return 'stoer';
  return null;
}
export function contrast(o) {
  const k = o.items.map(i => [i, karakter(i)]).filter(([, c]) => c);
  const stoer = k.filter(([, c]) => c === 'stoer'), lief = k.filter(([, c]) => c === 'lief');
  if (stoer.length >= 2 && lief.length === 1) return { pop: lief[0][0], basis: 'stoer' };
  if (lief.length >= 2 && stoer.length === 1) return { pop: stoer[0][0], basis: 'lief' };
  return null;
}

// Robins basisgarderobe (rapport p. 25-29): stukken die met veel andere
// kunnen. Wat je daarvan hebt, krijgt voorrang als werkpaard; een laagje uit
// die lijst (zoals het paarse gilet) nog iets meer.
const BASIS = new WeakMap();
export function basisIds(rapport) {
  if (!rapport) return new Set();
  if (!BASIS.has(rapport)) BASIS.set(rapport, new Set((rapport.basis || []).flatMap(g => g.items.flatMap(i => i.kast || []))));
  return BASIS.get(rapport);
}

// Kleurnamen uit je kast terug naar de namen in het rapport.
const RAPPORTNAAM = { marine: 'donkerblauw', chocolade: 'bruin', cognac: 'bruin', ecru: 'gebroken-wit', wit: 'gebroken-wit', 'lila/paars': 'paars', fuchsia: 'felroze', grijs: 'lichtgrijs' };
const rnaam = k => RAPPORTNAAM[k] || k;
function rapportParen(kleding, rapport) {
  const k = rapport && rapport.kleur;
  if (!k) return 0;
  const namen = new Set(kleding.map(i => rnaam(i.kleur[0])));
  let t = 0;
  for (const u of k.uitgelicht || []) if (u.met && u.kleuren.some(x => namen.has(x)) && u.met.some(x => namen.has(x))) t += 0.8;
  for (const [a, b] of k.combinaties || []) if (namen.has(a) && namen.has(b)) t += 0.8;
  for (const rij of k.steun || []) if (rij.filter(x => namen.has(x)).length >= 2 && namen.has(rij[0])) t += 0.4;
  return Math.min(t, 1.6);
}

const METHODE_WAARDE = { split: 1.5, tonsurton: 1.2, accent: 1.2, analoog: 0.8, mono: 0.6, neutraal: 0.3, colorblock: -0.5, mix: -3 };

export function score(o, ctx) {
  let s = 10;
  const kleding = o.items.filter(i => ROLLEN_KLEDING.includes(i.rol));
  s += METHODE_WAARDE[o.kleur.methode] || 0;
  if (!o.check.ok) s -= 20;
  s -= o.check.problemen.filter(p => p.zacht).length * 3;

  // soepel + stevig
  const tex = new Set(kleding.map(i => i.textuur));
  if (tex.size >= 2) s += 1;
  const soepel = kleding.some(i => ['glad', 'glans', 'fijn gebreid', 'kant', 'linnen'].includes(i.textuur));
  const stevig = kleding.some(i => ['denim', 'structuur', 'leer', 'suède', 'grof gebreid'].includes(i.textuur));
  if (soepel && stevig) s += 1;

  // Taille: een hoge taille geeft je direct meer vorm (rapport). Een kort
  // bovenstuk op een lage taille laat precies zien wat je niet wilt laten zien.
  const ond = o.slots.onder;
  if (ond && ond.taille === 'hoog') s += 0.8;
  if (ond && ond.taille === 'laag' && o.slots.boven && o.slots.boven.pasvorm === 'kort') s -= 1.5;

  // ingestopt wijd op wijd mag, maar een duidelijk silhouet heeft de voorkeur
  if (o.slots.boven && o.slots.onder && o.slots.boven.pasvorm === 'wijd' && o.slots.onder.pasvorm === 'wijd' && !(o.slots.boven.set && o.slots.boven.set === o.slots.onder.set)) s -= 0.8;
  // Silhouet (rapport): wijd onder met aansluitend boven, of andersom
  const bv = o.slots.boven;
  if (bv && ond && ((ond.pasvorm === 'wijd' && ['aansluitend', 'kort'].includes(bv.pasvorm)) || (bv.pasvorm === 'wijd' && ond.pasvorm === 'aansluitend'))) s += 0.5;

  // kleurparen die Robin noemt: paars of felroze met donkerblauw of bruin,
  // groen met donkerblauw, bruin of gebroken wit; en haar steunkleuren
  s += rapportParen(kleding, ctx.rapport);

  // kleuren bij je gezicht en uit je palet; grijs en champagne maken je fletser
  const gezicht = o.slots.boven || o.slots.heel;
  if (gezicht && ctx.rapport.kleur.gezicht.includes(gezicht.kleur[0])) s += 0.8;
  if (gezicht && /grijs|antraciet|champagne/.test(gezicht.kleur[0] || '') && !/gebreid|pluizig/.test(gezicht.textuur)) s -= 0.6;
  // kitten heels zijn je signature
  if (o.slots.schoen && /kitten/i.test(o.slots.schoen.naam)) s += 0.5;
  for (const i of kleding) if (ctx.rapport.kleur.accent.includes(i.kleur[0])) s += 0.3;
  // tas in een neutrale basis als er al kleur is; een statement-tas bij rust
  const tas = o.slots.tas;
  if (tas) {
    const tk = info(tas.kleur[0]);
    if (o.kleur.methode === 'neutraal' && !tk.neutraal) s += 0.8;
    else if (tk.neutraal) s += 0.4;
  }

  // schoen past bij het niveau van de rest, tenzij hij juist het contrast is
  const gem = kleding.reduce((t, i) => t + i.formeel, 0) / Math.max(1, kleding.length);
  const tegen = contrast(o);
  if (o.slots.schoen && !(tegen && tegen.pop === o.slots.schoen)) s -= Math.abs(o.slots.schoen.formeel - gem) * 0.4;
  // de schuif puur ←→ stoer × lief; zonder schuif een klein beetje
  if (tegen) s += (ctx.contrast ?? 0.25) * 3.5;

  // sfeer: één of meer. Meerdere worden gemengd (het gemiddelde van de
  // recepten), zodat cosy + streetstyle iets geeft dat van allebei heeft.
  const sferen = sfeerLijst(ctx.sfeer).map(k => SFEREN[k]).filter(Boolean);
  for (const sf of sferen) s += sfeerPunten(o, sf) / sferen.length;
  // een set die je zelf maakte (joggingpak, co-ord) hoort bij elkaar
  if (o.slots.boven && o.slots.onder && o.slots.boven.set && o.slots.boven.set === o.slots.onder.set) s += 4;
  // werkpaarden uit Robins basisgarderobe
  const basis = basisIds(ctx.rapport);
  if (basis.size) {
    const w = o.items.filter(i => basis.has(i.id) && (ROLLEN_KLEDING.includes(i.rol) || i.rol === 'schoen')).length;
    s += Math.min(w, 3) * 0.5;
  }
  // jouw smaak van nu, uit je inspiratie (na rapport en theorie: een plusje)
  if (ctx.smaak) s += smaakPunten(o, ctx.smaak);
  if (ctx.printMix && o.printMix) s += 2.5;
  // comfy ←→ sjiek
  if (ctx.sjiek != null) {
    // Te nette schoenen bij comfy (hakken op een strandwandeling) kosten
    // punten; sneakers bij iets sjieks niet: die mogen overal.
    const doel = 1.5 + 3 * ctx.sjiek;
    const gemS = kleding.reduce((t, i) => t + i.formeel, 0) / Math.max(1, kleding.length);
    s -= Math.abs(gemS - doel) * 1.2;
    if (o.slots.schoen) s -= Math.max(0, o.slots.schoen.formeel - doel - 1.5) * 1.5;
    const comfort = o.items.reduce((t, i) => t + i.comfort, 0) / o.items.length;
    s += (1 - ctx.sjiek) * (comfort - 3) * 0.5;
  }

  // weer: genoeg warmte
  const k = ctx.weer;
  const warmte = kleding.reduce((t, i) => t + i.warmte, 0);
  if (k === 'koud') {
    s += Math.min(warmte, 9) * 0.3 - (o.slots.jas ? 0 : 3);
    // een spijker- of linnen jasje is geen winterjas
    const jas = o.slots.jas;
    if (jas && !/wol|kunstbont|fleece|leer|mohair/.test(jas.materiaal || '') && jas.textuur !== 'pluizig') s -= 2.5;
  }
  if (k === 'fris') s += (o.slots.laag || o.slots.jas) ? 1 : -1;
  if ((k === 'fris' || k === 'koud') && o.slots.muts) s += 0.4;
  // een trui onder een gilet mag, maar is de uitzondering
  if (o.slots.laag && o.slots.laag.soort === 'gilet' && o.slots.boven && o.slots.boven.soort === 'trui') s -= 3;
  // een warme jas is bij fris weer genoeg; nog een vest eronder wordt stapelen
  if (k !== 'koud' && o.slots.jas && o.slots.jas.warmte >= 3 && o.slots.laag && o.slots.boven && mouwen(o.slots.boven) === 'lang') s -= o.slots.jas.pasvorm === 'wijd' ? 2.5 : 1.2;
  if (k === 'warm') s -= Math.max(0, warmte - 4) * 0.8;

  // wat zij eerder wegwisselde of juist koos
  const geheugen = ctx.geheugen || {};
  for (const i of o.items) {
    const g = geheugen[i.id];
    if (g) s += Math.min(g.gekozen || 0, 4) * 0.25 - Math.min(g.weg || 0, 6) * 0.5;
  }
  return Math.round(s * 10) / 10;
}

// ── OUTFIT BOUWEN ────────────────────────────────────────────────────────────
export function maakOutfit(slots, ctx) {
  const items = Object.values(slots).flat().filter(Boolean);
  const kleding = items.filter(i => ROLLEN_KLEDING.includes(i.rol));
  const extra = items.filter(i => !ROLLEN_KLEDING.includes(i.rol));
  const o = { slots, items, kleur: herken(kleding, extra) };
  o.check = controleer(o, ctx.rapport, ctx);
  const tegen = contrast(o);
  if (tegen) o.check = { ...o.check, tips: o.check.tips.concat(tegen.basis === 'stoer'
    ? `Stoer met een zachte pop: ${tegen.pop.naam} maakt het spannend.` : `Lief met een stoere twist: ${tegen.pop.naam}.`) };
  o.score = score(o, ctx);
  return o;
}

const sleutel = o => o.items.map(i => i.id).sort().join('|');

function pools(kast, ctx) {
  const weer = ctx.weer || 'mild';
  const uit = new Set(ctx.uitsluiten || []);
  const anker = new Set(ctx.anker || []);
  const ok = i => anker.has(i.id) || (!uit.has(i.id) && pastBijWeer(i, weer));
  const p = { boven: [], onder: [], heel: [], laag: [], jas: [], schoen: [], tas: [], riem: [], sjaal: [], muts: [] };
  for (const i of kast) {
    if (!ok(i)) continue;
    // Sporten: alleen wat ervoor gemaakt is, sneakers eronder, geen tas.
    if (ctx.sport) {
      if (['sporttop', 't-shirt', 'longsleeve'].includes(i.soort) && i.rol === 'boven') p.boven.push(i);
      else if (i.soort === 'legging' || (i.soort === 'short' && /sport|nike|adidas|run/i.test(i.naam))) p.onder.push(i);
      else if (i.soort === 'sneakers') p.schoen.push(i);
      // geen breisel en geen bontjas tijdens het sporten; alleen een sportief jack
      else if (i.rol === 'jas' && /technical|sport|wind|run|regen|rain/i.test(i.naam)) p.jas.push(i);
      continue;
    }
    // een legging is sportkleding, behalve bij cosy of streetstyle
    if (i.soort === 'legging' && !sfeerLijst(ctx.sfeer).some(f => f === 'cosy' || f === 'street')) continue;
    if (i.soort === 'sporttop') continue;
    if (isSlipper(i) && (ctx.weer !== 'warm' || ctx.avond || ctx.reis || (ctx.activiteit && !['strand', 'chillen'].includes(ctx.activiteit)))) continue;
    if (i.rol === 'boven') p.boven.push(i);
    else if (i.rol === 'onder') p.onder.push(i);
    else if (i.rol === 'heel' && i.soort !== 'co-ord') p.heel.push(i);
    else if (i.rol === 'heel') p.heel.push(i);
    else if (i.rol === 'laag') { p.laag.push(i); if (['trui', 'blouse'].includes(i.soort)) p.boven.push(i); }
    else if (i.rol === 'jas') p.jas.push(i);
    else if (i.rol === 'schoen') p.schoen.push(i);
    else if (i.rol === 'tas') p.tas.push(i);
    else if (i.soort === 'riem') p.riem.push(i);
    else if (i.soort === 'sjaal') p.sjaal.push(i);
    else if (i.soort === 'muts' || i.soort === 'pet') p.muts.push(i);
  }
  // Laagjes (kroeg, dansen): een topje als basis, en een trui of shirt erover
  // die uit kan. Geen topje in de kast? Dan gewoon zoals altijd.
  if (ctx.laagjes) {
    const basis = p.boven.filter(i => i.soort === 'topje' || (i.soort === 'top' && i.warmte <= 1));
    if (basis.length) {
      for (const i of p.boven) if (['trui', 't-shirt', 'longsleeve'].includes(i.soort) && !p.laag.includes(i)) p.laag.push(i);
      p.boven = basis;
      p.heel = []; // een jurk is niet het topje-met-laag waar je om vroeg
    }
  }
  return p;
}

// Past een outfit bij wat er gevraagd is (manier, kleur, wensen, anker)?
function voldoet(o, ctx) {
  if (ctx.methode && o.kleur.methode !== ctx.methode) return false;
  if (ctx.kleur) {
    // de hoofdkleur van een kledingstuk telt, niet de stippen op een blouse
    const fam = info(ctx.kleur).fam;
    if (!o.items.some(i => ROLLEN_KLEDING.includes(i.rol) && i.kleur[0] && (i.kleur[0] === ctx.kleur || info(i.kleur[0]).fam === fam))) return false;
    if (o.kleur.familie && !String(o.kleur.familie).split('+').includes(fam)) return false;
  }
  for (const w of ctx.wensen || []) if (WENSEN[w] && !WENSEN[w].test(o)) return false;
  for (const a of ctx.anker || []) if (!o.items.some(i => i.id === a)) return false;
  return true;
}

function besteVan(lijst, maak, max = 1) {
  return lijst.map(maak).sort((a, b) => b.score - a.score).slice(0, max);
}

const harde = o => o.check.problemen.filter(p => !p.zacht);
const nieuweFout = (oud, nieuw) => harde(nieuw).some(p => !harde(oud).some(q => q.regel === p.regel));
// Een skelet met alleen een textuurprobleem kan nog goed komen met een laag.
// Wijd op wijd met een instopbaar bovenstuk redt een riem nog.
const metRiem = o => o.slots.boven && o.slots.onder && o.slots.boven.pasvorm === 'wijd' && o.slots.onder.pasvorm === 'wijd' && instopbaar(o.slots.boven) && !(o.slots.boven.set && o.slots.boven.set === o.slots.onder.set);
const herstelbaar = o => harde(o).every(p => p.regel === 'textuur' || p.regel === 'armen' || (p.regel === 'silhouet' && metRiem(o)));

// Het skelet (boven+onder of één geheel) aankleden met schoen, laag, jas, tas.
// Een aanvulling mag de gekozen kleurmanier niet breken: een gekleurd vest
// over een monochrome look maakt er iets anders van. `gebruikt` telt wat al
// in eerdere voorstellen zit, zodat niet elke outfit dezelfde laarsjes krijgt.
function kleedAan(basis, p, ctx, gebruikt = new Map()) {
  const ankerIn = rol => (ctx.anker || []).map(id => ctx.perId[id]).filter(i => i && slotVan(i) === rol);
  let o = maakOutfit(basis, ctx);
  const past = n => !ctx.methode || n.kleur.methode === ctx.methode;
  const probeer = (rol, kandidaten, verplicht) => {
    const vast = ankerIn(rol);
    if (vast.length) { o = maakOutfit({ ...o.slots, [rol]: vast[0] }, ctx); return; }
    let beste = null, besteW = -Infinity, nood = null, noodW = -Infinity;
    for (const k of kandidaten) {
      if (o.items.some(i => i.id === k.id)) continue;
      const n = maakOutfit({ ...o.slots, [rol]: k }, ctx);
      // Alleen afwijzen als dít stuk een nieuwe fout maakt. Satijn op satijn
      // heeft nog één textuur; dat lost een gebreid vest straks op, dus de
      // schoenen daarvoor afkeuren is te vroeg.
      if (nieuweFout(o, n)) continue;
      const w = n.score - (gebruikt.get(k.id) || 0) * 1.2;
      if (past(n) && w > besteW) { beste = n; besteW = w; }
      if (w > noodW) { nood = n; noodW = w; }
    }
    if (verplicht) { o = beste || nood || o; return; }
    if (beste && (besteW > o.score || !past(o))) o = beste;
  };
  probeer('schoen', p.schoen, true);
  const wilLaag = (ctx.wensen || []).includes('laag');
  // bij fris of koud weer moet een laag ook echt warmte geven
  let lagen = ctx.weer === 'koud' || ctx.weer === 'fris' ? p.laag.filter(i => i.warmte >= 2) : p.laag;
  // Mouwloos topje: altijd een laag erover, met mouwen (ook bij warm weer,
  // dan een lichte). Bij kou geldt dat ook voor een t-shirt. De jas telt niet.
  const b0 = o.slots.boven;
  const armen = !ctx.sport && b0 && (mouwen(b0) === 'geen' || (ctx.weer === 'koud' && mouwen(b0) === 'kort'));
  if (armen) lagen = lagen.filter(i => mouwen(i) !== 'geen' && (ctx.weer !== 'koud' || ['trui', 'vest', 'teddy', 'blazer'].includes(i.soort)));
  if (ctx.weer !== 'warm' || ctx.laagjes || armen) probeer('laag', lagen, (wilLaag && !p.jas.length) || armen || (ctx.laagjes && b0 && ['topje', 'top'].includes(b0.soort)));
  // onder de 16 graden ga je met een jas de deur uit
  // bij het sporten pas een jas als het echt koud is
  const jasNodig = ctx.sport ? (ctx.weer === 'koud' || ctx.weer === 'fris') && p.jas.length > 0 : (ctx.weer === 'koud' || ctx.weer === 'fris' || (wilLaag && !o.slots.laag));
  if (jasNodig) probeer('jas', p.jas, true);
  // een tas hoort bij elke outfit (behalve bij het sporten); bij kou een muts
  if (!ctx.sport) probeer('tas', p.tas, true);
  // hoofd: bij kou een muts (verplicht); anders een muts of pet als hij iets toevoegt
  // (een pet hoort bij streetstyle of een sportieve dag, niet bij een blouse en pantalon)
  const petOk = sfeerLijst(ctx.sfeer).includes('street') || ['wandelen', 'strand', 'chillen'].includes(ctx.activiteit);
  const hoofd = p.muts.filter(i => i.soort === 'muts' ? ctx.weer === 'koud' || ctx.weer === 'fris' : petOk && !ctx.avond);
  if (!ctx.sport) probeer('muts', ctx.weer === 'koud' && hoofd.some(i => i.soort === 'muts') ? hoofd.filter(i => i.soort === 'muts') : hoofd, ctx.weer === 'koud');
  if (ctx.sport) { /* geen riem of sjaal bij het sporten */ }
  else if (metRiem(o)) probeer('riem', p.riem, true);
  else if (ctx.weer === 'koud' || ctx.weer === 'fris') probeer('sjaal', p.sjaal, false);
  // De laag werd gekozen vóór de jas. Is hij met de jas erover overbodig, dan weg.
  if (o.slots.laag && o.slots.jas && !wilLaag && !ctx.laagjes && !armen && !ankerIn('laag').length) {
    const { laag, ...zonder } = o.slots;
    const n = maakOutfit(zonder, ctx);
    if (n.check.ok && n.score > o.score && past(n)) o = n;
  }
  if (ctx.laagjes && o.slots.laag && o.slots.boven && ['topje', 'top'].includes(o.slots.boven.soort))
    o = { ...o, check: { ...o.check, tips: o.check.tips.concat(`Dansen: wordt het warm, dan gaat ${o.slots.laag.naam.toLowerCase()} uit en dans je in je ${o.slots.boven.soort}.`) } };
  // Bij het sporten gaan kleurregels niet over krachtmetingen.
  if (ctx.sport) o = { ...o, check: { ...o.check, tips: [], problemen: o.check.problemen.filter(p => !p.zacht) } };
  // Geen jas die erbij past terwijl het fris is: dan is dit geen outfit.
  if (jasNodig && p.jas.length && !o.slots.jas)
    o = { ...o, check: { ...o.check, ok: false, problemen: o.check.problemen.concat({ regel: 'weer', tekst: 'Geen jas die erbij past.' }) } };
  return o;
}

export function slotVan(i) {
  if (i.rol === 'accessoire') return i.soort === 'riem' ? 'riem' : ['muts', 'pet'].includes(i.soort) ? 'muts' : 'sjaal';
  return i.rol;
}

// Drie (of meer) voorstellen. Zonder gekozen manier zo verschillend mogelijk:
// elk voorstel een andere kleurmanier, zodat je ziet wat er kan.
export function stelVoor(kast, ctx, aantal = 3) {
  ctx = { ...ctx, perId: Object.fromEntries(kast.map(i => [i.id, i])) };
  const p = pools(kast, ctx);
  const anker = (ctx.anker || []).map(id => ctx.perId[id]).filter(Boolean);
  const vast = r => anker.find(i => slotVan(i) === r || (r === 'boven' && i.rol === 'laag' && ['trui', 'blouse'].includes(i.soort) && !anker.some(a => a.rol === 'boven')));

  const skeletten = [];
  const vb = vast('boven'), vo = vast('onder'), vh = vast('heel');
  if (!vh) {
    for (const b of vb ? [vb] : p.boven) for (const on of vo ? [vo] : p.onder) skeletten.push({ boven: b, onder: on });
  }
  if (!vb && !vo) for (const h of vh ? [vh] : p.heel) skeletten.push({ heel: h });

  // Eerst snel rangschikken op het skelet, dan de beste paar honderd volledig
  // aankleden. Is er een manier gekozen, dan gaan skeletten die al in die
  // manier zitten voor.
  // een wijd-op-wijd-skelet telt nog als fout tot de riem erbij is; niet te vroeg wegzetten
  const voorrang = o => o.score + (ctx.methode && o.kleur.methode === ctx.methode ? 6 : 0) + (!o.check.ok && herstelbaar(o) ? 20 : 0);
  const snel = skeletten.map(sk => maakOutfit(sk, ctx)).filter(herstelbaar)
    .sort((a, b) => voorrang(b) - voorrang(a)).slice(0, 260);
  const kandidaten = [];
  for (const o of snel) {
    const vol = kleedAan(o.slots, p, ctx);
    if (vol.check.ok && voldoet(vol, ctx)) kandidaten.push(vol);
  }
  kandidaten.sort((a, b) => b.score - a.score);
  const gekozen = kiesDivers(kandidaten, aantal, !ctx.methode, ctx.seed || 0);
  // Opnieuw aankleden met wat al gebruikt is, voor variatie in schoenen en tassen.
  const gebruikt = new Map();
  return gekozen.map(o => {
    const skelet = o.slots.heel ? { heel: o.slots.heel } : { boven: o.slots.boven, onder: o.slots.onder };
    const n = kleedAan(skelet, p, ctx, gebruikt);
    const uit = n.check.ok && voldoet(n, ctx) ? n : o;
    for (const i of uit.items) if (!['boven', 'onder', 'heel'].includes(i.rol)) gebruikt.set(i.id, (gebruikt.get(i.id) || 0) + 1);
    return uit;
  });
}

function kiesDivers(lijst, aantal, verschillendeManieren, seed) {
  const gekozen = [], gezien = new Set(), manieren = new Set();
  const start = seed ? Math.min(seed * 2, Math.max(0, lijst.length - aantal * 3)) : 0;
  const pool = lijst.slice(start).concat(lijst.slice(0, start));
  // op plek vergelijken, niet op rol: een blouse uit je laagjes kan het bovenstuk zijn
  const overlapt = o => gekozen.some(g => ['boven', 'onder', 'heel'].filter(r => o.slots[r] && g.slots[r] === o.slots[r]).length >= 2
    || (o.slots.heel && g.slots.heel === o.slots.heel));
  const vloer = Math.max(...lijst.map(o => o.score), -Infinity) - 4;
  const zelfdeBoven = o => o.slots.boven && gekozen.some(g => g.slots.boven === o.slots.boven);
  const zelfdeOnder = o => o.slots.onder && gekozen.some(g => g.slots.onder === o.slots.onder);
  // ronde 0: andere manier, ander boven- én onderstuk; 1: ander boven- en
  // onderstuk; 2: ander bovenstuk; 3: niet twee kernstukken gelijk; 4: de rest
  for (const ronde of [0, 1, 2, 3, 4]) {
    for (const o of pool) {
      if (gekozen.length >= aantal) break;
      const k = sleutel(o);
      if (gezien.has(k)) continue;
      if (ronde === 0 && verschillendeManieren && manieren.has(o.kleur.methode)) continue;
      // je rapport zoekt balans: colorblock en een vrije mix niet vooraan om de variatie
      if (ronde === 0 && ['colorblock', 'mix'].includes(o.kleur.methode)) continue;
      if (ronde < 4 && overlapt(o)) continue;
      if (ronde < 3 && zelfdeBoven(o)) continue;
      if (ronde < 2 && zelfdeOnder(o)) continue;
      // variatie, maar niet ten koste van alles: geen zwakke look om de variatie
      if (ronde < 4 && o.score < vloer) continue;
      gekozen.push(o); gezien.add(k); manieren.add(o.kleur.methode);
    }
  }
  return gekozen;
}

// Wat kan er op deze plek in plaats van dit stuk, zonder dat de outfit van
// kleurmanier verandert of een rapportregel breekt?
export function alternatieven(kast, outfit, rol, ctx, max = 12) {
  ctx = { ...ctx, perId: Object.fromEntries(kast.map(i => [i.id, i])) };
  const p = pools(kast, { ...ctx, anker: outfit.items.map(i => i.id) });
  const lijst = rol === 'riem' || rol === 'sjaal' ? p[rol] : (p[rol] || []);
  const huidig = outfit.slots[rol];
  const zelfdeManier = outfit.kleur.methode;
  const uit = [];
  for (const k of lijst) {
    if (huidig && k.id === huidig.id) continue;
    if (outfit.items.some(i => i.id === k.id)) continue;
    const n = maakOutfit({ ...outfit.slots, [rol]: k }, ctx);
    if (!n.check.ok) continue;
    uit.push({ item: k, outfit: n, zelfde: n.kleur.methode === zelfdeManier });
  }
  uit.sort((a, b) => (b.zelfde - a.zelfde) || (b.outfit.score - a.outfit.score));
  return uit.slice(0, max);
}

// ── DE TAS ───────────────────────────────────────────────────────────────────
// Eerst de koffer, dan de outfits eruit. De koffer wordt gekozen op hoeveel
// goede, verschillende outfits hij oplevert: elk stuk moet zijn plek verdienen.

export function momenten(dagen) {
  const uit = [];
  dagen.forEach((d, n) => {
    for (const m of d.momenten) {
      const act = m === 'actief' ? 'sport' : herkenActiviteit((d.doen || {})[m]);
      uit.push({ dag: d.naam || `Dag ${n + 1}`, moment: m, weer: weerKlasse(d.temp), reis: m === 'reis',
                 activiteit: act, doen: (d.doen || {})[m] || null });
    }
  });
  return uit;
}

const FORMULE = n => ({
  onder: n <= 3 ? 2 : n <= 6 ? 3 : 4,
  boven: n <= 3 ? 3 : n <= 6 ? 4 : 6,
  laag: n <= 3 ? 1 : 2,
  schoen: n <= 4 ? 2 : 3,
  tas: 1,
});

function alleOutfits(koffer, ctx) {
  const p = pools(koffer, { ...ctx, weer: ctx.weer });
  const uit = [];
  const skeletten = [];
  for (const b of p.boven) for (const on of p.onder) skeletten.push({ boven: b, onder: on });
  for (const h of p.heel) skeletten.push({ heel: h });
  for (const sk of skeletten) {
    if (!herstelbaar(maakOutfit(sk, ctx))) continue;
    const o = kleedAan(sk, p, { ...ctx, perId: ctx.perId || {} });
    if (o.check.ok) uit.push(o);
  }
  return uit.sort((a, b) => b.score - a.score);
}

// Een koffer beoordelen: aantal goede outfits (tot wat nodig is telt het
// zwaarst), het aantal kleurmanieren, en de gemiddelde kwaliteit.
function waardeer(koffer, ctx, nodig) {
  const os = alleOutfits(koffer, ctx).filter(o => o.score > 8 && voldoet(o, { ...ctx, methode: null, kleur: null, anker: [] }));
  const uniek = [];
  for (const o of os) if (!uniek.some(u => u.items.filter(i => o.items.includes(i) && ['boven', 'onder', 'heel'].includes(i.rol)).length >= 2)) uniek.push(o);
  const manieren = new Set(uniek.map(o => o.kleur.methode));
  const kwaliteit = uniek.slice(0, nodig).reduce((t, o) => t + o.score, 0) / Math.max(1, Math.min(nodig, uniek.length));
  const gebruikt = new Set(os.slice(0, nodig * 3).flatMap(o => o.items.map(i => i.id)));
  const passagiers = koffer.filter(i => !gebruikt.has(i.id)).length;
  return { waarde: Math.min(uniek.length, nodig) * 10 + Math.min(uniek.length, nodig * 2) + manieren.size * 2 + kwaliteit - passagiers * 3, os: uniek, manieren };
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function pakTas(kast, opties) {
  const { dagen, rapport, sfeer = null, sjiek = null, contrast = null, smaak = null, printMix = false, moetMee = [], uitsluiten = [], seed = 1, geheugen = {}, afwisselen = false } = opties;
  const mom = momenten(dagen);
  const nodig = mom.length;
  const koudste = mom.some(m => m.weer === 'koud') ? 'koud' : mom.some(m => m.weer === 'fris') ? 'fris' : mom.every(m => m.weer === 'warm') ? 'warm' : 'mild';
  const ctx = { rapport, sfeer, sjiek, contrast, smaak, printMix, weer: koudste, geheugen, uitsluiten, afwisselen };
  const perId = Object.fromEntries(kast.map(i => [i.id, i]));
  const pool = kast.filter(i => !uitsluiten.includes(i.id) && (moetMee.includes(i.id) || pastBijWeer(i, koudste === 'koud' ? 'fris' : koudste)));
  const formule = FORMULE(nodig);
  const per = rol => pool.filter(i => i.rol === rol || (rol === 'boven' && i.rol === 'laag' && i.soort === 'trui'));
  const vast = moetMee.map(id => perId[id]).filter(Boolean);
  const r = rng(seed);

  let beste = null;
  // Een handvol vertrekpunten: elk een andere kleurbasis uit het rapport.
  const bases = [['blauw', 'wit'], ['bruin', 'wit'], ['zwart', 'wit'], ['bruin', 'blauw'], ['blauw', 'grijs'], ['bruin', 'groen'], ['zwart', 'bruin']];
  for (let poging = 0; poging < 10; poging++) {
    const basis = bases[poging % bases.length];
    let koffer = [...vast];
    const telRol = rol => koffer.filter(i => i.rol === rol || (rol === 'boven' && i.rol === 'laag' && i.soort === 'trui' && koffer.indexOf(i) < 0)).length;
    // vul op met stukken in de basis, en een paar accenten
    const order = ['onder', 'boven', 'schoen', 'laag', 'tas'];
    for (const rol of order) {
      const kand = per(rol).filter(i => !koffer.includes(i))
        .map(i => {
          const fam = info(i.kleur[0]).fam;
          const inBasis = basis.includes(fam) || info(i.kleur[0]).neutraal;
          return { i, w: (inBasis ? 2 : 0.8) + r() * 1.5 + (rol === 'boven' && !info(i.kleur[0]).neutraal ? 0.6 : 0) };
        })
        .sort((a, b) => b.w - a.w).map(x => x.i);
      while (koffer.filter(i => i.rol === rol).length < formule[rol] && kand.length) koffer.push(kand.shift());
    }
    if (koudste === 'koud' || koudste === 'fris') {
      const jas = pool.filter(i => i.rol === 'jas' && !koffer.includes(i)).sort((a, b) => (basis.includes(info(b.kleur[0]).fam) - basis.includes(info(a.kleur[0]).fam)) || r() - 0.5)[0];
      if (jas && !koffer.some(i => i.rol === 'jas')) koffer.push(jas);
      const muts = pool.filter(i => i.soort === 'muts' && !koffer.includes(i)).sort((a, b) => basis.includes(info(b.kleur[0]).fam) - basis.includes(info(a.kleur[0]).fam))[0];
      if (muts && !koffer.some(i => i.soort === 'muts')) koffer.push(muts);
    }
    let w = waardeer(koffer, ctx, nodig);
    // Verbeteren: één stuk ruilen zolang het beter wordt.
    for (let ronde = 0; ronde < 3; ronde++) {
      let verbeterd = false;
      for (const uit of koffer.filter(i => !vast.includes(i))) {
        const kand = pool.filter(i => i.rol === uit.rol && !koffer.includes(i)).sort(() => r() - 0.5).slice(0, 6);
        for (const in_ of kand) {
          const nieuw = koffer.map(i => i === uit ? in_ : i);
          const nw = waardeer(nieuw, ctx, nodig);
          if (nw.waarde > w.waarde + 0.5) { koffer = nieuw; w = nw; verbeterd = true; break; }
        }
      }
      if (!verbeterd) break;
    }
    if (!beste || w.waarde > beste.w.waarde) beste = { koffer, w };
  }
  let koffer = beste.koffer;
  // Kroeg of dansen: een topje voor eronder, als dat er nog niet in zit.
  if (mom.some(m => (ACTIVITEITEN[m.activiteit] || {}).laagjes) && !koffer.some(i => i.soort === 'topje')) {
    const topjes = pool.filter(i => i.soort === 'topje' && !koffer.includes(i));
    let top = null;
    for (const t of topjes) { const w = waardeer(koffer.concat(t), ctx, nodig).waarde; if (!top || w > top.w) top = { t, w }; }
    if (top) koffer = koffer.concat(top.t);
  }
  // ...en iets om eroverheen te trekken dat uit kan: een trui, shirt of longsleeve
  if (mom.some(m => (ACTIVITEITEN[m.activiteit] || {}).laagjes)) {
    const kan = i => ['trui', 't-shirt', 'longsleeve'].includes(i.soort) && i.warmte >= (koudste === 'koud' || koudste === 'fris' ? 2 : 1);
    if (!koffer.some(kan)) {
      let top = null;
      for (const t of pool.filter(i => kan(i) && !koffer.includes(i))) { const w = waardeer(koffer.concat(t), ctx, nodig).waarde; if (!top || w > top.w) top = { t, w }; }
      if (top) koffer = koffer.concat(top.t);
    }
  }
  if (mom.some(m => m.activiteit === 'sport')) {
    // Sportspullen gaan mee als er gesport wordt; de rest van de koffer telt daar niet voor.
    const sp = pools(pool, { ...ctx, sport: true, weer: 'mild' });
    const heeft = rol => koffer.some(i => sp[rol].includes(i));
    const kou = mom.some(m => m.activiteit === 'sport' && (m.weer === 'koud' || m.weer === 'fris'));
    for (const rol of kou ? ['boven', 'onder', 'schoen', 'jas'] : ['boven', 'onder', 'schoen']) {
      if (!heeft(rol) && sp[rol].length) {
        const keus = sp[rol].slice().sort((a, b) => (b.soort === 'sporttop' || b.soort === 'legging') - (a.soort === 'sporttop' || a.soort === 'legging'))[0];
        koffer = koffer.concat(keus);
      }
    }
  }
  const uit = verdeel(koffer, mom, { ...ctx, moetMee }, nodig, kast);
  uit.ookMee = ookMee(kast, mom, moetMee, uitsluiten);
  return uit;
}

// Wat niet in een outfit zit maar wel mee moet: zwemkleding bij een warme
// stranddag. Liefst iets wat je zelf al "moet mee" had gezet.
function ookMee(kast, mom, moetMee, uitsluiten) {
  if (!mom.some(m => m.activiteit === 'strand' && m.weer === 'warm')) return [];
  const zwem = kast.filter(i => i.rol === 'zwem' && !uitsluiten.includes(i.id));
  const keus = zwem.find(i => moetMee.includes(i.id)) || zwem[0];
  return keus ? [{ item: keus, waarom: 'voor het strand' }] : [];
}

// Wat een moment vraagt: sfeer (om de beurt bij afwisselen), hoe net, wensen.
function momentCtx(m, n, ctx, sferen) {
  if (ctx.afwisselen && sferen.length > 1) m.sfeer = sferen[n % sferen.length];
  const act = ACTIVITEITEN[m.activiteit];
  const sjiek = act && act.sjiek != null ? act.sjiek : m.moment === 'avond' ? Math.max(ctx.sjiek ?? 0.5, 0.75) : ctx.sjiek;
  const wensen = (ctx.wensen || []).concat((act && act.wensen) || []);
  return { act, mctx: { ...ctx, sfeer: m.sfeer || ctx.sfeer, weer: m.weer, sjiek, wensen, sport: !!(act && act.sport),
    activiteit: m.activiteit, avond: m.moment === 'avond', reis: m.reis, laagjes: !!(act && act.laagjes) } };
}

// Alle outfits voor één moment uit deze stukken, de best passende eerst.
function voorMoment(koffer, m, mctx, act) {
  let os = alleOutfits(koffer, mctx);
  // wat de activiteit vraagt (platte schoenen en een broek bij een wandeling,
  // geen satijn op het strand), als dat met deze koffer kan
  const vermijd = (act && act.vermijd) || [];
  const passend = os.filter(o => mctx.wensen.every(w => !WENSEN[w] || WENSEN[w].test(o))
    && !o.items.some(i => ROLLEN_KLEDING.includes(i.rol) && vermijd.includes(i.textuur)));
  if (passend.length) os = passend;
  if (m.reis) {
    // reisoutfit: de zwaarste stukken aan, dan scheelt het in de koffer
    os = os.map(o => ({ o, w: o.score + o.items.reduce((t, i) => t + i.warmte, 0) * 0.8 })).sort((a, b) => b.w - a.w).map(x => x.o);
  }
  return os;
}

// Mist er iets voor dit moment, of lukt het niet met deze stukken? Dan zo
// weinig mogelijk uit de kast erbij: eerst wat echt ontbreekt (schoenen, een
// broek, een jas bij kou), en anders het ene stuk dat er de beste outfit van maakt.
function aanvullen(basis, kast, m, mctx, act) {
  const uit = new Set(mctx.uitsluiten || []);
  const rest = kast.filter(i => !basis.includes(i) && !uit.has(i.id));
  const pk = pools(rest, mctx);
  const erbij = [];
  const waarde = stukken => { const os = voorMoment(stukken, m, mctx, act); return os.length ? os[0].score + Math.min(os.length, 5) : -Infinity; };
  const kies = kand => {
    let beste = null, w = -Infinity;
    for (const k of kand.slice(0, 40)) {
      const n = waarde(basis.concat(erbij, [k]));
      if (n > w) { beste = k; w = n; }
    }
    return beste;
  };
  const p = pools(basis, mctx);
  const mist = [];
  if (!p.heel.length && !p.onder.length) mist.push('onder');
  if (!p.heel.length && !p.boven.length) mist.push('boven');
  if (!p.schoen.length) mist.push('schoen');
  const koud = mctx.weer === 'koud' || mctx.weer === 'fris';
  if (koud && !p.jas.length && pk.jas.length) mist.push('jas');
  if (!mctx.sport && !p.tas.length && pk.tas.length) mist.push('tas');
  if (mctx.weer === 'koud' && !p.muts.length && pk.muts.length) mist.push('muts');
  if (!mist.length && voorMoment(basis, m, mctx, act).length) return [];
  for (const rol of mist) {
    // zolang er nog meer ontbreekt, geeft geen enkel stuk al een outfit; kies dan rustig
    const kand = pk[rol].slice().sort((a, b) => info(b.kleur[0]).neutraal - info(a.kleur[0]).neutraal);
    const k = kies(kand) || kand[0];
    if (k) erbij.push(k);
  }
  if (voorMoment(basis.concat(erbij), m, mctx, act).length) return erbij;
  const k = kies(['boven', 'onder', 'heel', 'schoen', 'laag', 'jas'].flatMap(r => pk[r]).filter(i => !erbij.includes(i)));
  if (k && voorMoment(basis.concat(erbij, [k]), m, mctx, act).length) return erbij.concat(k);
  return voorMoment(basis.concat(erbij), m, mctx, act).length ? erbij : [];
}

// Outfits uit de koffer aan dagen en momenten koppelen.
function verdeel(koffer, mom, ctx, nodig, kast) {
  const plan = [];
  const gebruikt = new Set();
  // Afwisselen: elk moment krijgt om de beurt één van de gekozen sferen. De
  // koffer is wel samen gekozen, dus stukken komen in beide terug.
  const sferen = sfeerLijst(ctx.sfeer);
  for (const [n, m] of mom.entries()) {
    const { mctx, act } = momentCtx(m, n, ctx, sferen);
    let os = voorMoment(koffer, m, mctx, act);
    // Niets met deze koffer: één of twee stukken uit je kast erbij.
    let erbij = [];
    if (!os.length && kast) {
      erbij = aanvullen(koffer, kast, m, mctx, act);
      if (erbij.length) { koffer = koffer.concat(erbij); os = voorMoment(koffer, m, mctx, act); }
    }
    // Platte schoenen gevraagd (wandelen, dansen) maar alleen hakken in de
    // koffer? Dan één paar platte uit de kast erbij.
    if (os.length && kast && mctx.wensen.includes('plat') && !os.some(o => WENSEN.plat.test(o))) {
      let top = null;
      for (const k of pools(kast.filter(i => !koffer.includes(i)), mctx).schoen.filter(i => i.soort !== 'hakken').slice(0, 25)) {
        const o = voorMoment(koffer.concat(k), m, mctx, act).find(x => WENSEN.plat.test(x));
        if (o && (!top || o.score > top.o.score)) top = { k, o };
      }
      if (top) { koffer = koffer.concat(top.k); erbij = erbij.concat(top.k); os = voorMoment(koffer, m, mctx, act); }
    }
    // Liefst een kleurmanier die nog niet in de tas zit: zo zie je in één
    // koffer wat ton-sur-ton, mono of een accent met jouw stukken doet.
    const manieren = new Set(plan.filter(p => p.outfit).map(p => p.outfit.kleur.methode));
    const vrij = o => !gebruikt.has(sleutel(o)) && !plan.some(p => p.outfit && p.outfit.items.filter(i => o.items.includes(i) && ['boven', 'onder', 'heel'].includes(i.rol)).length >= 2);
    const top = os.filter(vrij).slice(0, 12);
    const beste = top.map(o => ({ o, w: o.score + (manieren.has(o.kleur.methode) ? 0 : 2.5) - (o.kleur.methode === 'mix' ? 3 : 0) }))
      .sort((a, b) => b.w - a.w)[0];
    // alles al gedragen: dan liever een outfit herhalen dan niets
    const keuze = (beste && beste.o) || os.find(o => !gebruikt.has(sleutel(o))) || os[0] || null;
    if (keuze) gebruikt.add(sleutel(keuze));
    plan.push({ ...m, outfit: keuze, erbij: erbij.filter(i => keuze && keuze.items.includes(i)).map(i => i.id) });
  }
  const tel = new Map();
  for (const p of plan) if (p.outfit) for (const i of p.outfit.items) tel.set(i.id, (tel.get(i.id) || 0) + 1);
  // Wat in geen enkele outfit zit, gaat niet mee. Behalve wat zij zelf wilde.
  koffer = koffer.filter(i => tel.get(i.id) || (ctx.moetMee || []).includes(i.id));
  const alle = alleOutfits(koffer, ctx);
  const perManier = {};
  for (const o of alle) (perManier[o.kleur.methode] ||= []).push(o);
  return {
    koffer: koffer.map(i => ({ item: i, keer: tel.get(i.id) || 0 })).sort((a, b) => b.keer - a.keer),
    plan,
    extra: alle.filter(o => !gebruikt.has(sleutel(o))).slice(0, 24),
    perManier: Object.fromEntries(Object.entries(perManier).map(([k, v]) => [k, v.length])),
    ontbreekt: watOntbreekt(koffer, kast, ctx, perManier),
  };
}

// ── KIEZEN UIT JE EIGEN SELECTIE ────────────────────────────────────────────
// Je hebt meer klaargelegd dan je nodig hebt. Per moment alle goede outfits
// uit die stukken; alleen waar echt iets ontbreekt komt er iets uit je kast
// bij (`erbij`). Jij kiest, de paklijst volgt uit wat je kiest.
const KERN = ['boven', 'onder', 'heel'];
const overlap = (a, b) => a.items.filter(i => b.items.includes(i) && KERN.includes(i.rol)).length;

function divers(os, max, straf = () => 0) {
  const uit = [];
  const rest = os.slice().sort((a, b) => (b.score - straf(b)) - (a.score - straf(a))).slice(0, 60);
  while (uit.length < max && rest.length) {
    const manieren = new Set(uit.map(o => o.kleur.methode));
    let bi = 0, bw = -Infinity;
    rest.forEach((o, n) => {
      const nieuwStuk = ['jas', 'schoen'].filter(r => o.slots[r] && !uit.some(u => u.slots[r] === o.slots[r])).length;
      const w = o.score - straf(o) + nieuwStuk * 1.5 + (manieren.has(o.kleur.methode) ? 0 : 2) - uit.reduce((t, u) => t + (overlap(o, u) >= 2 ? 3 : 0), 0) - (o.kleur.methode === 'mix' ? 3 : 0);
      if (w > bw) { bw = w; bi = n; }
    });
    uit.push(rest.splice(bi, 1)[0]);
  }
  return uit;
}

export function uitSelectie(kast, opties) {
  const { dagen, rapport, sfeer = null, sjiek = null, contrast = null, smaak = null, printMix = false, moetMee = [], uitsluiten = [], geheugen = {}, afwisselen = false, max = 12 } = opties;
  const mom = momenten(dagen);
  const perId = Object.fromEntries(kast.map(i => [i.id, i]));
  const selectie = moetMee.map(id => perId[id]).filter(Boolean);
  const ctx = { rapport, sfeer, sjiek, contrast, smaak, printMix, geheugen, uitsluiten, afwisselen };
  const sferen = sfeerLijst(sfeer);
  // Sportspullen apart: een hardloopjack hoort niet bij het diner.
  let erbij = [], sportErbij = [];
  const plan = mom.map((m, n) => {
    const { mctx, act } = momentCtx(m, n, ctx, sferen);
    // wat eerder al uit de kast kwam, mag hier ook weer
    const eerder = mctx.sport ? sportErbij.concat(erbij) : erbij;
    // ook als er wel outfits zijn: zonder schoenen of jas (bij fris) ga je niet
    const nieuw = aanvullen(selectie.concat(eerder), kast, m, mctx, act);
    let os = voorMoment(selectie.concat(eerder), m, mctx, act);
    if (nieuw.length) {
      if (mctx.sport) sportErbij = sportErbij.concat(nieuw); else erbij = erbij.concat(nieuw);
      os = voorMoment(selectie.concat(eerder, nieuw), m, mctx, act);
    }
    // Elke outfit krijgt dezelfde 'beste' jas en schoenen; laat ook zien hoe
    // het met je andere jas of schoenen staat.
    const stukken = pools(selectie.concat(eerder, nieuw), mctx);
    const varianten = [];
    for (const o of os.slice(0, 15)) for (const rol of ['jas', 'schoen', 'laag']) {
      if (!o.slots[rol]) continue;
      for (const k of stukken[rol]) {
        if (k === o.slots[rol] || o.items.includes(k)) continue;
        const v = maakOutfit({ ...o.slots, [rol]: k }, mctx);
        if (v.check.ok && v.score > o.score - 3) varianten.push(v);
      }
    }
    const gezien = new Set(os.map(sleutel));
    for (const v of varianten) if (!gezien.has(sleutel(v))) { gezien.add(sleutel(v)); os.push(v); }
    // jouw eigen stukken eerst; iets uit de kast alleen als het echt beter is
    const eigen = new Set(selectie);
    const straf = o => o.items.filter(i => !eigen.has(i) && i.rol !== 'tas').length * 2;
    const { opties, niet } = elkStuk(divers(os, max, straf), os, selectie, stukken, mctx, straf);
    return { ...m, outfit: null, opties, niet };
  });
  erbij = erbij.concat(sportErbij.filter(i => !erbij.includes(i)));
  // Per stuk: in hoeveel verschillende outfits kan het? Wat in weinig zit,
  // is de eerste kandidaat om thuis te laten.
  const uniek = new Map();
  for (const p of plan) for (const o of p.opties) uniek.set(sleutel(o), o);
  const tel = new Map(selectie.map(i => [i.id, 0]));
  for (const o of uniek.values()) for (const i of o.items) tel.set(i.id, (tel.get(i.id) || 0) + 1);
  return {
    keuze: true, plan, erbij: erbij.map(i => i.id), ookMee: ookMee(kast, mom, moetMee, uitsluiten),
    stukken: selectie.concat(erbij).map(i => ({ item: i, kan: tel.get(i.id) || 0, erbij: erbij.includes(i) })).sort((a, b) => b.kan - a.kan),
  };
}

// Elke jas en elk paar schoenen dat je klaarlegde, komt in de eerste vier
// opties, met de beste outfit die ermee kan. Lukt dat niet, dan zeggen we waarom.
function elkStuk(opties, os, selectie, stukken, mctx, straf) {
  const niet = [];
  const voor = [];
  const wensOk = o => (mctx.wensen || []).every(w => !WENSEN[w] || WENSEN[w].test(o));
  for (const g of selectie.filter(i => i.rol === 'jas' || i.rol === 'schoen')) {
    const rol = g.rol;
    if (!stukken[rol].includes(g)) { niet.push({ item: g, waarom: waaromNiet(g, mctx) }); continue; }
    if (rol === 'jas' && !os.some(o => o.slots.jas)) { niet.push({ item: g, waarom: 'Bij dit weer is geen jas nodig.' }); continue; }
    let beste = os.filter(o => o.slots[rol] === g).sort((a, b) => (b.score - straf(b)) - (a.score - straf(a)))[0] || null;
    let fout = null;
    if (!beste) for (const o of os.slice(0, 40)) {
      if (!o.slots[rol]) continue;
      const v = maakOutfit({ ...o.slots, [rol]: g }, mctx);
      if (v.check.ok && wensOk(v)) { if (!beste || v.score > beste.score) beste = v; }
      else if (!fout) fout = !v.check.ok ? harde(v)[0] : { tekst: 'Hier vraagt wat je gaat doen om iets anders (bijv. platte schoenen).' };
    }
    if (beste) voor.push({ g, o: beste });
    else niet.push({ item: g, waarom: fout ? fout.tekst : 'Past bij geen van de combinaties.' });
  }
  const eerst = opties.slice(0, 4);
  const beschermd = new Set([eerst[0]]);
  for (const { g, o } of voor) {
    const al = eerst.find(x => x.items.includes(g));
    if (al) { beschermd.add(al); continue; }
    const plek = eerst.map((x, n) => n).reverse().find(n => !beschermd.has(eerst[n]));
    if (plek == null || eerst.length < 4) eerst.push(o); else eerst[plek] = o;
    beschermd.add(o);
  }
  const rest = opties.filter(x => !eerst.includes(x) && !eerst.some(e => sleutel(e) === sleutel(x)));
  return { opties: eerst.concat(rest), niet };
}

function waaromNiet(i, ctx) {
  if (ctx.sport) return i.rol === 'jas' ? 'Bij het sporten alleen een sportjack.' : 'Bij het sporten alleen sneakers.';
  if (open(i) && ctx.weer !== 'warm') return 'Open schoen; daarvoor is het te fris.';
  if (i.rol === 'jas' && ctx.weer === 'warm') return 'Te warm voor een jas.';
  if (isSlipper(i)) return 'Slippers alleen bij warm weer op het strand of om te chillen.';
  return 'Past niet bij dit weer.';
}

// ── NA HET KIEZEN ───────────────────────────────────────────────────────────
// Extra outfits: uit wat meegaat plus wat er over is (stukken die je klaarlegde
// maar in geen gekozen outfit zitten). Elke extra gebruikt iets wat over is,
// of is een nieuwe combinatie van wat al meegaat.
export function extraOutfits(mee, over, opties, bestaand = [], max = 8) {
  const mom = momenten(opties.dagen);
  const tel = {};
  for (const m of mom) tel[m.weer] = (tel[m.weer] || 0) + 1;
  const weer = Object.entries(tel).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mild';
  const ctx = { rapport: opties.rapport, sfeer: opties.sfeer, sjiek: opties.sjiek ?? null, contrast: opties.contrast ?? null,
    smaak: opties.smaak || null, printMix: !!opties.printMix, geheugen: opties.geheugen || {}, uitsluiten: [] };
  const m = { dag: 'Extra', moment: 'extra', weer, activiteit: null, reis: false };
  const { mctx, act } = momentCtx(m, 0, ctx, []);
  const al = new Set(bestaand.map(sleutel));
  const metOver = o => !over.length || o.items.some(i => over.includes(i));
  const os = voorMoment(mee.concat(over), m, mctx, act).filter(o => !al.has(sleutel(o)) && metOver(o));
  return { weer, outfits: divers(os, max) };
}

// Tijdens je weekend: voor één dagdeel alles wat kan met wat je bij je hebt.
export function uitJeTas(items, moment, opties, max = 8) {
  const ctx = { rapport: opties.rapport, sfeer: opties.sfeer, sjiek: opties.sjiek ?? null, contrast: opties.contrast ?? null,
    smaak: opties.smaak || null, printMix: !!opties.printMix, geheugen: opties.geheugen || {}, uitsluiten: [], wensen: opties.wensen || [] };
  const m = { ...moment };
  const { mctx, act } = momentCtx(m, 0, ctx, []);
  // jouw wensen gaan voor wat het dagdeel vraagt: "sjiek" wint van "chillen"
  if (opties.sjiek != null) mctx.sjiek = opties.sjiek;
  // "met dit stuk erin"
  if (opties.anker) { mctx.anker = [opties.anker]; mctx.perId = Object.fromEntries(items.map(i => [i.id, i])); }
  let os = voorMoment(items, m, mctx, act);
  if (opties.anker) os = os.filter(o => o.items.some(i => i.id === opties.anker));
  const wil = os.filter(o => (opties.wensen || []).every(w => !WENSEN[w] || WENSEN[w].test(o)) && (!opties.methode || o.kleur.methode === opties.methode));
  if (wil.length) os = wil;
  return divers(os, max);
}

// ── ZELF SAMENSTELLEN EN BEOORDELEN ──────────────────────────────────────────
// Jij kiest de stukken; de app zet ze op hun plek (een T-shirt onder een trui).
export function stelSamen(items, ctx) {
  const volg = ['heel', 'onder', 'boven', 'laag', 'jas', 'schoen', 'tas', 'muts', 'riem', 'sjaal'];
  const gesorteerd = items.slice().sort((a, b) => volg.indexOf(slotVan(a)) - volg.indexOf(slotVan(b)) || (b.warmte || 0) - (a.warmte || 0));
  let o = maakOutfit({}, ctx);
  for (const i of gesorteerd) o = voegStukToe(o, i, ctx);
  return o;
}

const NIVEAU = g => g < 1.8 ? 'heel casual' : g < 2.6 ? 'casual' : g < 3.4 ? 'net casual' : g < 4.2 ? 'netjes' : 'chic';
// Wat vindt de stylist ervan: klopt het, welke kleurmanier (en welk stuk is
// het accent), welke vibe, en met welke ene wissel wordt het meer iets anders.
export function beoordeel(o, ctx, bron = []) {
  const kleding = o.items.filter(i => ROLLEN_KLEDING.includes(i.rol));
  const harde = o.check.problemen.filter(p => !p.zacht), zachte = o.check.problemen.filter(p => p.zacht);
  // kleur: wie is het accent, wat is de rustige basis
  const acc = o.items.filter(i => !info(i.kleur[0]).neutraal && info(i.kleur[0]).fam !== 'multi');
  const rust = kleding.filter(i => info(i.kleur[0]).neutraal);
  const m = o.kleur.methode;
  const kleur = m === 'accent' ? `Neutraal met accent: ${acc.map(i => i.naam).join(' en ')} ${acc.length > 1 ? 'zijn' : 'is'} het accent${rust.length ? `, ${rust.map(i => i.naam).join(', ')} houden het rustig` : ''}.`
    : m === 'tonsurton' ? `Ton-sur-ton in ${o.kleur.familie || 'één familie'}: tinten van dezelfde kleur, de stof maakt het verschil.`
    : m === 'mono' ? `Monochroom in ${o.kleur.familie}: zorg dat de stoffen verschillen.`
    : m === 'neutraal' ? 'Rustig neutraal: geen accent. Een gekleurd stuk (tas, sjaal, schoen) maakt het levendiger.'
    : m === 'analoog' ? `Analoog: buurkleuren (${(o.kleur.families || []).join(' en ')}) die samen een warme of koele stroom maken.`
    : m === 'split' ? 'Split-complementair: één sterke kleur met twee lichte tegenhangers.'
    : m === 'colorblock' ? `Colorblocking: ${(o.kleur.families || []).join(' tegen ')}. Mag, maar je rapport zoekt vooral balans.`
    : 'Vrije mix: veel kleuren door elkaar. Haal er één terug naar iets rustigs.';
  // vibe: de sferen die het meest herkenbaar zijn
  const pt = Object.entries(SFEREN).map(([k, sf]) => [k, sfeerPunten(o, sf)]).sort((a, b) => b[1] - a[1]);
  const vibe = pt.filter(([, v]) => v > 1).slice(0, 2).map(([k]) => SFEREN[k].naam);
  const gem = kleding.concat(o.slots.schoen ? [o.slots.schoen] : []).reduce((t, i) => t + i.formeel, 0) / Math.max(1, kleding.length + (o.slots.schoen ? 1 : 0));
  const tegen = contrast(o);
  // één wissel per richting, uit de bron (je tas of je kast)
  const ctx2 = { ...ctx, sfeer: null };
  const wisselOpties = [];
  for (const [plek, huidig] of Object.entries(o.slots)) {
    if (!huidig || Array.isArray(huidig)) continue;
    for (const k of bron) {
      if (k === huidig || o.items.includes(k) || slotVan(k) !== plek) continue;
      const n = maakOutfit({ ...o.slots, [plek]: k }, ctx2);
      if (n.check.ok) wisselOpties.push({ plek, van: huidig, naar: k, outfit: n });
    }
  }
  const richting = [];
  for (const [k, sf] of Object.entries(SFEREN)) {
    const nu = sfeerPunten(o, sf);
    const beste = wisselOpties.map(w => ({ ...w, w: sfeerPunten(w.outfit, sf) - nu })).sort((a, b) => b.w - a.w)[0];
    if (beste && beste.w > 1) richting.push({ ...beste, doel: `Meer ${sf.naam.toLowerCase()}` });
  }
  for (const [mm, naam] of [['tonsurton', 'ton-sur-ton'], ['mono', 'monochroom'], ['accent', 'één accent']]) {
    if (m === mm) continue;
    const beste = wisselOpties.filter(w => w.outfit.kleur.methode === mm).sort((a, b) => b.outfit.score - a.outfit.score)[0];
    if (beste) richting.push({ ...beste, doel: `Naar ${naam}` });
  }
  return {
    ok: !harde.length, harde: harde.map(p => p.tekst), zachte: zachte.map(p => p.tekst), tips: o.check.tips,
    kleur, vibe, niveau: NIVEAU(gem), contrast: tegen ? (tegen.basis === 'stoer' ? `stoer met een zachte pop (${tegen.pop.naam})` : `lief met een stoere twist (${tegen.pop.naam})`) : null,
    richting,
  };
}

// ── LICHTER EN SPANNENDER ────────────────────────────────────────────────────
// Mag zonder vervanger weg. Tas en muts niet: die horen bij elke outfit, dus
// die gaan alleen thuis als er een andere meegaat.
const VRIJ = new Set(['laag', 'riem', 'sjaal']);
// Een outfit zonder dit stuk: liefst met iets anders wat al meegaat op die
// plek, of (bij een laag of accessoire) gewoon zonder. null als het niet kan.
function herstel(o, weg, bron, ctx) {
  const plek = Object.keys(o.slots).find(k => o.slots[k] === weg);
  if (!plek) return o;
  const opties = [];
  if (VRIJ.has(plek)) { const slots = { ...o.slots }; delete slots[plek]; opties.push(maakOutfit(slots, ctx)); }
  for (const k of bron) if (k !== weg && !o.items.includes(k) && slotVan(k) === plek) opties.push(maakOutfit({ ...o.slots, [plek]: k }, ctx));
  return opties.filter(n => n.check.ok).sort((a, b) => b.score - a.score)[0] || null;
}

// "Maak mijn tas lichter": stap voor stap het stuk dat het minst kost. Elke
// stap zegt wat er thuisblijft, wat het kost en hoe de outfits zich redden.
export function lichter(plan, ctxVan, max = 10) {
  let nu = plan.map(p => p.outfit);
  const stappen = [];
  while (stappen.length < max) {
    const items = [...new Set(nu.filter(Boolean).flatMap(o => o.items))];
    let beste = null;
    for (const c of items) {
      const bron = items.filter(i => i !== c);
      let verlies = 0, geraakt = 0, kan = true;
      const nieuw = nu.map((o, n) => {
        if (!kan || !o || !o.items.includes(c)) return o;
        const h = herstel(o, c, bron, ctxVan(plan[n]));
        if (!h) { kan = false; return o; }
        geraakt++; verlies += Math.max(0, o.score - h.score);
        return h;
      });
      if (!kan) continue;
      // niet lichter door twee dagen hetzelfde te dragen
      const anders = l => new Set(l.filter(Boolean).map(sleutel)).size;
      if (anders(nieuw) < anders(nu)) continue;
      // liever een stuk dat in weinig outfits zit en weinig kost
      const w = verlies + geraakt * 0.3;
      if (!beste || w < beste.w) beste = { item: c, w, verlies, geraakt, nieuw };
    }
    if (!beste || beste.verlies > 4) break;
    stappen.push({ item: beste.item, verlies: Math.round(beste.verlies * 10) / 10, geraakt: beste.geraakt, outfits: beste.nieuw });
    nu = beste.nieuw;
  }
  return stappen;
}
// Alleen de stukken die jij aantikte: in volgorde weghalen en herstellen.
export function laatThuis(plan, weg, ctxVan) {
  let nu = plan.map(p => p.outfit);
  const gelukt = [], niet = [];
  for (const c of weg) {
    const bron = [...new Set(nu.filter(Boolean).flatMap(o => o.items))].filter(i => i !== c);
    let kan = true;
    const nieuw = nu.map((o, n) => { if (!kan || !o || !o.items.includes(c)) return o; const h = herstel(o, c, bron, ctxVan(plan[n])); if (!h) kan = false; return h || o; });
    if (kan) { nu = nieuw; gelukt.push(c); } else niet.push(c);
  }
  return { outfits: nu, gelukt, niet };
}

// Wat een ander stuk met een outfit doet, in woorden.
function effecten(oud, nieuw) {
  const fx = [];
  // kleur = een accent uit je rapport; denim of camel tellen niet
  const acc = new Set(RAPPORT_ACCENT.map(k => info(k).fam));
  const kleurig = o => o.items.filter(i => !/jeans|denim/i.test(i.naam + ' ' + (i.materiaal || '')) && i.kleur.some(k => !info(k).neutraal && acc.has(info(k).fam))).length;
  if (kleurig(nieuw) > kleurig(oud)) fx.push('meer kleur');
  if (contrast(nieuw) && !contrast(oud)) fx.push('meer spanning');
  const tex = o => new Set(o.items.filter(i => ROLLEN_KLEDING.includes(i.rol)).map(i => i.textuur)).size;
  if (tex(nieuw) > tex(oud)) fx.push('meer textuur');
  if (nieuw.score - oud.score >= 1.5) fx.push('beter volgens je rapport');
  return fx;
}

// "Verras me": wat zit er in je tas, wat mist er net, en drie kleine dingen
// met veel effect: uit je kast, in hoe je iets draagt, en één ding om te kopen.
const RAPPORT_ACCENT = ['felroze', 'paars', 'geel', 'oranje', 'oranje-rood', 'rood', 'lichtblauw', 'groen'];
export function verrasMe(plan, kast, ctxVan, rapport) {
  const outfits = plan.map(p => p.outfit).filter(Boolean);
  const items = [...new Set(outfits.flatMap(o => o.items))];
  const kleding = items.filter(i => ROLLEN_KLEDING.includes(i.rol));
  const fam = {};
  for (const i of kleding) { const k = info(i.kleur[0]); fam[k.neutraal ? 'rustig' : k.fam] = (fam[k.neutraal ? 'rustig' : k.fam] || 0) + 1; }
  const accenten = Object.entries(fam).filter(([k]) => k !== 'rustig').sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const basisKleuren = [...new Set(kleding.filter(i => info(i.kleur[0]).neutraal).map(i => rnaam(i.kleur[0])))];
  const tex = {};
  for (const i of kleding) tex[i.textuur] = (tex[i.textuur] || 0) + 1;
  const vibe = Object.entries(SFEREN).map(([k, sf]) => [sf.naam, outfits.reduce((t, o) => t + sfeerPunten(o, sf), 0)]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);
  const samenvatting = `Je tas is ${accenten.length ? `${basisKleuren.slice(0, 3).join(', ') || 'rustig'} met ${accenten.slice(0, 2).join(' en ')} als accent` : 'helemaal rustig, zonder kleuraccent'}. `
    + `Veel ${Object.entries(tex).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t).join(' en ')}. De vibe is ${vibe.join(' × ').toLowerCase()}.`;

  // wat er net ontbreekt
  const mist = [];
  const heeft = f => items.some(f);
  if (!accenten.length || (fam.rustig || 0) / kleding.length > 0.85) mist.push({ wat: 'Weinig kleur: bijna alles is rustig.', soort: 'kleur' });
  if (!heeft(i => i.soort === 'sieraad' || i.kleur.includes('goud'))) mist.push({ wat: 'Er zit geen goud in, terwijl gouden sieraden in je rapport staan.', soort: 'goud' });
  const accentPlek = new Set(items.filter(i => !info(i.kleur[0]).neutraal).map(i => i.rol));
  if (accentPlek.size && [...accentPlek].every(r => ['boven', 'laag'].includes(r))) mist.push({ wat: 'Al je kleur zit bovenin; tas, schoen en accessoires zijn rustig.', soort: 'plek' });
  if (plan.some(p => p.moment === 'avond') && !heeft(i => ['glans', 'kant'].includes(i.textuur))) mist.push({ wat: 'Voor de avond zit er niets met glans of kant in.', soort: 'glans' });
  if (!outfits.some(o => contrast(o))) mist.push({ wat: 'Nergens stoer met een zachte pop: alles is van één karakter.', soort: 'contrast' });

  // uit je kast: het accessoire dat de meeste outfits optilt. Een sjaal of
  // riem eerst; een schoen alleen als hij kleur of spanning brengt. Een tweede
  // tas is geen kleine tweak: die staat bij ruilen.
  const kandidaten = kast.filter(i => !items.includes(i) && ['accessoire', 'schoen'].includes(i.rol) && !/tas|bag/i.test(`${i.soort} ${i.naam}`));
  const kastTips = [];
  for (const k of kandidaten) {
    const beter = [];
    const fx = new Set();
    plan.forEach((p, n) => {
      if (!p.outfit || !pastBijWeer(k, p.weer) || (k.soort === 'pet' && p.moment === 'avond')) return;
      const nieuw = voegStukToe(p.outfit, k, ctxVan(p));
      if (!nieuw.check.ok) return;
      const e = effecten(p.outfit, nieuw);
      const winst = nieuw.score - p.outfit.score + e.length;
      if (winst >= 0.5) { beter.push({ n, outfit: nieuw, winst }); e.forEach(x => fx.add(x)); }
    });
    if (!beter.length || (k.rol === 'schoen' && !fx.has('meer kleur') && !fx.has('meer spanning'))) continue;
    kastTips.push({ item: k, outfits: beter, effect: [...fx], w: beter.reduce((t, b) => t + b.winst, 0) * (k.rol === 'schoen' ? 0.5 : 1) });
  }
  kastTips.sort((a, b) => b.w - a.w);

  // ruilen: één stuk uit je tas voor een uit je kast, en wat dat oplevert
  const ruilTips = [];
  for (const uit of items.filter(i => ['boven', 'laag', 'onder', 'heel', 'jas', 'schoen', 'tas'].includes(i.rol))) {
    const waar = plan.map((p, n) => [p, n]).filter(([p]) => p.outfit && p.outfit.items.includes(uit));
    let best = null;
    for (const nu of kast.filter(k => !items.includes(k) && slotVan(k) === slotVan(uit))) {
      const outs = [], fx = new Set();
      let winst = 0, ok = true;
      for (const [p, n] of waar) {
        if (!pastBijWeer(nu, p.weer)) { ok = false; break; }
        const plek = Object.keys(p.outfit.slots).find(k => p.outfit.slots[k] === uit);
        const o = maakOutfit({ ...p.outfit.slots, [plek]: nu }, ctxVan(p));
        if (!o.check.ok) { ok = false; break; }
        winst += o.score - p.outfit.score;
        effecten(p.outfit, o).forEach(x => fx.add(x));
        outs.push({ n, outfit: o });
      }
      if (!ok || !fx.size || winst < -1.5 * waar.length) continue;
      const w = fx.size * 2 + winst / waar.length;
      if (!best || w > best.w) best = { uit, in: nu, outfits: outs, effect: [...fx], w };
    }
    if (best) ruilTips.push(best);
  }
  ruilTips.sort((a, b) => b.w - a.w);

  // hoe je het draagt: de stylingtips uit je eigen outfits, de meest voorkomende
  const tel = {};
  for (const o of outfits) for (const t of o.check.tips) tel[t] = (tel[t] || 0) + 1;
  const draag = Object.entries(tel).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  // om te kopen: een accentkleur uit je rapport die nog niet in je tas zit en
  // die je rapport zelf bij je basis zet; als sjaal, ketting of riem
  const paren = [...(rapport.kleur.combinaties || []).map(([a, b]) => [a, [b]]), ...(rapport.kleur.uitgelicht || []).flatMap(u => (u.met ? u.kleuren.map(k => [k, u.met]) : []))];
  const inTas = new Set(items.map(i => info(i.kleur[0]).fam));
  let koopKleur = null, waarom = '';
  for (const k of RAPPORT_ACCENT) {
    if (inTas.has(info(k).fam)) continue;
    const met = [...new Set(paren.flatMap(([a, m]) => a === k ? m : m.includes(k) ? [a] : []).filter(x => basisKleuren.includes(x)))];
    if (met.length) { koopKleur = k; waarom = `je rapport zet ${k} bij ${met.join(' en ')}, en dat neem je mee`; break; }
  }
  if (!koopKleur) koopKleur = RAPPORT_ACCENT.find(k => !inTas.has(info(k).fam)) || 'lichtblauw';
  const koopWat = !heeft(i => i.soort === 'sieraad' || i.kleur.includes('goud')) ? 'een gouden ketting of oorringen'
    : !heeft(i => i.soort === 'sjaal') ? `een sjaaltje in ${koopKleur}`
    : !heeft(i => i.soort === 'riem') && outfits.some(o => o.slots.boven && o.slots.boven.pasvorm === 'wijd') ? 'een riem om je wijde bovenstukken in te snoeren'
    : `een tasje of sjaal in ${koopKleur}`;
  // de reden hoort bij wat je koopt: goud om het goud, een kleur om de kleur
  const koopWaarom = /goud/.test(koopWat) ? 'gouden sieraden staan in je rapport en er zit nog geen goud in je tas'
    : /riem/.test(koopWat) ? 'met een riem maak je je taille zichtbaar in je wijde stukken'
    : waarom || `${koopKleur} is een accent uit je rapport dat nog niet in je tas zit`;
  const koop = { wat: koopWat, kleur: koopKleur, waarom: koopWaarom };
  return { samenvatting, mist, kast: kastTips.slice(0, 3), ruil: ruilTips.slice(0, 3), draag, koop };
}

// "Maak compact": per moment een outfit, met zo min mogelijk stukken in totaal.
// Een paar volgordes proberen; de kleinste koffer wint, bij gelijkspel de mooiste.
export function compact(plan) {
  const volgordes = [plan.map((_, n) => n), plan.map((_, n) => n).reverse(),
    plan.map((_, n) => n).sort((a, b) => plan[a].opties.length - plan[b].opties.length)];
  let beste = null;
  for (const v of volgordes) {
    const keus = new Array(plan.length).fill(null);
    const mee = new Set();
    const gehad = new Set();
    for (const n of v) {
      let bo = null, bw = -Infinity;
      for (const o of plan[n].opties) {
        const nieuw = o.items.filter(i => ROLLEN_KLEDING.includes(i.rol) || i.rol === 'schoen').filter(i => !mee.has(i.id)).length;
        const w = o.score - nieuw * 4 - (gehad.has(sleutel(o)) ? 6 : 0);
        if (w > bw) { bw = w; bo = o; }
      }
      keus[n] = bo;
      if (bo) { gehad.add(sleutel(bo)); bo.items.forEach(i => mee.add(i.id)); }
    }
    const w = { keus, n: mee.size, s: keus.reduce((t, o) => t + (o ? o.score : 0), 0) };
    if (!beste || w.n < beste.n || (w.n === beste.n && w.s > beste.s)) beste = w;
  }
  return beste.keus;
}

// Waarom lukt een kleurmanier niet met deze koffer, en welk stuk uit je kast
// zou het wél mogelijk maken?
function watOntbreekt(koffer, kast, ctx, perManier) {
  const uit = [];
  for (const m of ['mono', 'tonsurton', 'accent']) {
    if (perManier[m] && perManier[m].length) continue;
    let beste = null;
    for (const kand of kast) {
      if (koffer.includes(kand) || !['boven', 'onder', 'laag'].includes(kand.rol)) continue;
      if (!pastBijWeer(kand, ctx.weer)) continue;
      const n = alleOutfits(koffer.concat([kand]), ctx).filter(o => o.kleur.methode === m).length;
      if (n && (!beste || n > beste.n)) beste = { item: kand, n };
    }
    uit.push({ methode: m, naam: METHODEN[m].naam, zet: beste });
  }
  return uit;
}

// "Meer hiervan": ruil één stuk zodat er meer outfits in deze manier passen.
export function meerVan(kast, koffer, methode, opties) {
  const { rapport, dagen } = opties;
  const mom = momenten(dagen);
  const koudste = mom.some(m => m.weer === 'koud') ? 'koud' : mom.some(m => m.weer === 'fris') ? 'fris' : 'mild';
  const ctx = { rapport, weer: koudste, sfeer: opties.sfeer, sjiek: opties.sjiek };
  const tel = k => alleOutfits(k, ctx).filter(o => o.kleur.methode === methode).length;
  const nu = tel(koffer);
  let beste = null;
  for (const uit of koffer) {
    for (const in_ of kast) {
      if (koffer.includes(in_) || in_.rol !== uit.rol || !pastBijWeer(in_, koudste)) continue;
      const nieuw = koffer.map(i => i === uit ? in_ : i);
      const n = tel(nieuw);
      if (n > nu && (!beste || n > beste.n)) beste = { uit, in: in_, n, nu };
    }
  }
  return beste;
}

// ── ANDERE KLEUR ─────────────────────────────────────────────────────────────
// "Dit outfit, maar met rood als accent." Zo weinig mogelijk veranderen: één
// stuk in de nieuwe kleur, en als de oude accentkleur daarmee gaat botsen, die
// een stap terug naar iets rustigs. Liefst met wat al in de koffer zit.
export function andereKleur(kast, outfit, kleur, ctx, voorkeur = []) {
  const fam = info(kleur).fam;
  const perId = Object.fromEntries(kast.map(i => [i.id, i]));
  const p = pools(kast, { ...ctx, anker: outfit.items.map(i => i.id), uitsluiten: ctx.uitsluiten || [] });
  const pool = rol => (p[rol] || []);
  // De gekozen kleur zelf, of een heldere tint uit dezelfde familie; navy of
  // denim telt niet als "blauw accent", die zijn rustige basis.
  const kInfo = info(kleur);
  const heeftKleur = i => i.kleur[0] === kleur || (info(i.kleur[0]).fam === fam && (kInfo.neutraal || !info(i.kleur[0]).neutraal));
  const precies = i => i.kleur[0] === kleur;
  const inKoffer = new Set(voorkeur);
  const accenten = o => [...new Set(o.items.filter(i => !info(i.kleur[0]).neutraal && info(i.kleur[0]).fam !== 'multi')
    .map(i => info(i.kleur[0]).fam))];
  const slotsOm = ['boven', 'laag', 'tas', 'sjaal', 'onder', 'schoen', 'jas', 'heel'];
  const beoordeel = (n, wissels) => {
    if (!n.check.ok || !n.items.some(heeftKleur)) return null;
    const anders = accenten(n).filter(f => f !== fam).length;
    const nieuw = wissels.filter(w => w.naar && !inKoffer.has(w.naar.id)).length;
    const raak = n.items.some(precies) ? 2 : 0;
    return { outfit: n, wissels, w: n.score + raak - anders * 4 - wissels.length * 1.2 - nieuw * 1.5 };
  };
  const kandidaten = [];
  // één stuk in de nieuwe kleur (of erbij: een sjaal of tas)
  for (const s of slotsOm) {
    if (s === 'heel' && !outfit.slots.heel) continue;
    if ((s === 'boven' || s === 'onder') && outfit.slots.heel) continue;
    for (const k of pool(s).filter(heeftKleur)) {
      if (outfit.items.some(i => i.id === k.id)) continue;
      const n = maakOutfit({ ...outfit.slots, [s]: k }, ctx);
      const r = beoordeel(n, [{ slot: s, van: outfit.slots[s] || null, naar: k }]);
      if (r) kandidaten.push(r);
    }
  }
  // ...en de oude accentkleur een stap terug, als die nog botst
  const eerste = kandidaten.sort((a, b) => b.w - a.w).slice(0, 12);
  for (const k of eerste) {
    const botst = k.outfit.items.filter(i => !heeftKleur(i) && !info(i.kleur[0]).neutraal && info(i.kleur[0]).fam !== 'multi');
    for (const oud of botst) {
      const s = Object.keys(k.outfit.slots).find(x => k.outfit.slots[x] === oud);
      if (!s || s === 'extra') continue;
      const rustig = pool(s).filter(i => info(i.kleur[0]).neutraal && !k.outfit.items.some(j => j.id === i.id));
      if (['laag', 'tas', 'sjaal', 'riem'].includes(s)) rustig.push(null); // of gewoon weglaten
      for (const r of rustig) {
        const slots = { ...k.outfit.slots, [s]: r || undefined };
        if (!r) delete slots[s];
        const n = maakOutfit(slots, ctx);
        const b = beoordeel(n, k.wissels.concat({ slot: s, van: oud, naar: r }));
        if (b) kandidaten.push(b);
      }
    }
  }
  kandidaten.sort((a, b) => b.w - a.w);
  const beste = kandidaten[0];
  if (!beste) return null;
  const vorm = k => ({ outfit: k.outfit, wissels: k.wissels, nieuw: k.wissels.filter(w => w.naar && !inKoffer.has(w.naar.id)).map(w => w.naar) });
  // een paar verschillende varianten, zodat je ook iets ziet wat je zelf niet had bedacht
  const gezien = new Set(), opties = [];
  for (const k of kandidaten) { const s = sleutel(k.outfit); if (!gezien.has(s)) { gezien.add(s); opties.push(vorm(k)); } if (opties.length >= 4) break; }
  return { ...vorm(beste), opties };
}

// Een stuk erbij: een T-shirt onder wat je al aanhad (dat wordt de laag),
// of in de plaats van wat er op die plek zit. Wat het beste uitpakt, wint.
export function voegStukToe(o, item, ctx) {
  const plek = slotVan(item);
  const varianten = [maakOutfit({ ...o.slots, [plek]: item }, ctx)];
  if (plek === 'boven' && o.slots.boven && o.slots.boven !== item)
    varianten.unshift(maakOutfit({ ...o.slots, boven: item, laag: o.slots.boven }, ctx));
  if (plek === 'laag' && o.slots.laag && !o.slots.boven && o.slots.heel)
    varianten.push(maakOutfit({ ...o.slots, laag: item }, ctx));
  return varianten.find(v => v.check.ok) || varianten[varianten.length - 1];
}
