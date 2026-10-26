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
    textuur: { 'grof gebreid': 3, pluizig: 3, 'fijn gebreid': 2, 'suède': 1, glans: -1 },
    snit: { ballon: 1, 'wide leg': 1, legging: 1 },
    methode: { tonsurton: 1.5, mono: 1, neutraal: 1, colorblock: -1 } },
  parisienne: { naam: 'Parisienne', uitleg: 'Rechte jeans of pantalon, blouse of fijn breisel, trench of blazer, loafers; neutraal met één accent',
    soort: { blouse: 3, trenchcoat: 3, loafers: 3, pantalon: 2, jeans: 2, blazer: 2, sjaal: 2, hakken: 1, longsleeve: 1, vest: 1, rok: 1, sandalen: 1, pet: -2, legging: -2, teddy: -1 },
    textuur: { 'fijn gebreid': 1, linnen: 1, denim: 1, leer: 1 },
    print: { streep: 3, stip: 1, luipaard: 1 },
    snit: { recht: 2, flared: 2, 'wide leg': 1, slim: 1, ballon: -1, cargo: -2, barrel: -1 },
    methode: { accent: 2, neutraal: 1.5, tonsurton: 1, colorblock: -2, mix: -2 } },
  street: { naam: 'Streetstyle', uitleg: 'Sneakers, cargo, oversized, petje, technische jacks',
    soort: { sneakers: 3, pet: 3, jas: 2, broek: 2, jeans: 2, 't-shirt': 2, trui: 1, longsleeve: 1, sporttop: 1, hakken: -2, blouse: -1, pantalon: -1 },
    textuur: { structuur: 1, denim: 1, glad: 0.5 },
    snit: { barrel: 2, ballon: 2, cargo: 2, 'wide leg': 1, flared: -1 },
    methode: { colorblock: 1, accent: 1 } },
  klassiek: { naam: 'Klassiek casual', uitleg: 'Je rapport als basis: blazer, pantalon, blouse, loafers of kitten heels',
    soort: { blazer: 3, pantalon: 3, blouse: 2, loafers: 3, hakken: 2, trenchcoat: 2, rok: 1, jurk: 1, top: 1, riem: 1, sneakers: -1 },
    textuur: { glans: 1, 'fijn gebreid': 1 },
    snit: { 'wide leg': 2, recht: 1, flared: 1, potlood: 1, cargo: -2, ballon: -1 },
    methode: { split: 1, accent: 1, tonsurton: 1 } },
  vrouwelijk: { naam: 'Vrouwelijk', uitleg: 'Jurk of rok, kant, satijn, een open hals, kitten heels',
    soort: { jurk: 3, rok: 3, topje: 2, hakken: 2, sandalen: 1, blouse: 1, sjaal: 1, sneakers: -1, pet: -2 },
    textuur: { kant: 3, glans: 2, 'fijn gebreid': 1 },
    snit: { 'A-lijn': 2, plissé: 2, wikkel: 2, flared: 1, cargo: -2 },
    methode: { analoog: 1, split: 1 } },
};

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
    [/feest|borrel|bruiloft|party|club|verjaardag|concert/, 'feest'], [/stad|shop|winkel|markt/, 'stad'],
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

const open = i => i.open || i.soort === 'sandalen';
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

// ── RAPPORTREGELS ────────────────────────────────────────────────────────────
const STOPBAAR = new Set(['blouse', 't-shirt', 'top', 'topje', 'longsleeve']);

export function controleer(o, rapport) {
  const problemen = [], tips = [];
  const { boven, onder, heel, laag } = o.slots;
  const kleding = o.items.filter(i => ROLLEN_KLEDING.includes(i.rol));

  // Nooit wijd op wijd. Instoppen met een riem redt een wijde blouse.
  if (boven && onder && boven.pasvorm === 'wijd' && onder.pasvorm === 'wijd') {
    if (STOPBAAR.has(boven.soort) && o.items.some(i => i.soort === 'riem')) tips.push('Stop het bovenstuk in en draag de riem: zo blijft je taille zichtbaar.');
    else problemen.push({ regel: 'silhouet', tekst: 'Wijd op wijd: je silhouet verdwijnt.' });
  }
  if (heel && heel.pasvorm === 'wijd' && laag && laag.pasvorm === 'wijd') problemen.push({ regel: 'silhouet', tekst: 'Wijde set met een wijde laag erover.' });

  // Laagjes van dun naar dik: een blouse over een trui werkt niet.
  const DIKTE = { topje: 1, sporttop: 1, 't-shirt': 1, top: 1.5, longsleeve: 2, blouse: 2, trui: 3, vest: 3.5, gilet: 3.5, blazer: 4, teddy: 5 };
  if (laag && (boven || heel) && (DIKTE[laag.soort] || 3) <= (DIKTE[(boven || heel).soort] || 1.5))
    problemen.push({ regel: 'laagjes', tekst: `${laag.soort} over ${(boven || heel).soort} draagt niet.` });
  // Twee dikke lagen op elkaar wordt te veel: over een trui alleen een gilet,
  // blazer of jas, geen gebreid vest of teddy.
  const onder_ = boven || heel;
  if (laag && onder_ && (
      (onder_.soort === 'trui' && ['vest', 'teddy'].includes(laag.soort)) ||
      (onder_.warmte >= 3 && laag.warmte >= 3 && !['gilet', 'blazer'].includes(laag.soort))))
    problemen.push({ regel: 'laagjes', tekst: `Twee dikke lagen (${onder_.soort} en ${laag.soort}) wordt te veel.` });

  const prints = o.items.filter(i => i.print);
  if (prints.length > 1) problemen.push({ regel: 'prints', tekst: 'Meer dan één print (' + prints.map(i => i.print).join(' + ') + ').' });

  const texturen = new Set(kleding.map(i => i.textuur));
  if ((o.kleur.methode === 'mono' || o.kleur.methode === 'neutraal') && texturen.size < 2 && kleding.length >= 2)
    problemen.push({ regel: 'textuur', tekst: 'Zonder kleurcontrast moet de stof het werk doen: nu maar één textuur.' });

  // Eén heldere kleur is het statement; geen zwaargewicht ernaast.
  const helder = kleding.concat(o.items.filter(i => i.rol === 'tas' || i.rol === 'schoen'))
    .filter(i => { const k = info(i.kleur[0]); return !k.neutraal && !k.zwaar && k.licht > 0.25; });
  const zwaar = kleding.filter(i => ZWAAR.has(i.kleur[0]));
  if (helder.length && zwaar.length && o.kleur.methode !== 'mono')
    problemen.push({ regel: 'statement', zacht: true, tekst: `${zwaar[0].kleur[0]} naast ${helder[0].kleur[0]}: twee kleuren die allebei de aandacht pakken.` });

  const gezicht = boven || heel;
  if (gezicht && /grijs|antraciet/.test(gezicht.kleur[0] || '') && !/gebreid|pluizig/.test(gezicht.textuur))
    tips.push('Grijs vlak bij je gezicht maakt je fletser; een sjaaltje in roze of lichtblauw helpt.');
  if (gezicht && gezicht.hals && /col|hoog|gesloten/i.test(gezicht.hals)) tips.push('Een hoge hals is massief voor jou; open hem met een ketting of sjaal.');
  if (boven && boven.pasvorm === 'wijd' && onder && onder.pasvorm !== 'wijd' && STOPBAAR.has(boven.soort)) tips.push('Oversized bewust stylen: half instoppen of mouwen oprollen.');
  if (o.kleur.methode === 'colorblock') tips.push('Colorblocking mag; je rapport zoekt nu vooral balans.');
  return { ok: !problemen.some(p => !p.zacht), problemen, tips };
}

// ── SCORE ────────────────────────────────────────────────────────────────────
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

  // kleuren bij je gezicht en uit je palet
  const gezicht = o.slots.boven || o.slots.heel;
  if (gezicht && ctx.rapport.kleur.gezicht.includes(gezicht.kleur[0])) s += 0.8;
  for (const i of kleding) if (ctx.rapport.kleur.accent.includes(i.kleur[0])) s += 0.3;
  // tas in een neutrale basis als er al kleur is; een statement-tas bij rust
  const tas = o.slots.tas;
  if (tas) {
    const tk = info(tas.kleur[0]);
    if (o.kleur.methode === 'neutraal' && !tk.neutraal) s += 0.8;
    else if (tk.neutraal) s += 0.4;
  }

  // schoen past bij het niveau van de rest
  const gem = kleding.reduce((t, i) => t + i.formeel, 0) / Math.max(1, kleding.length);
  if (o.slots.schoen) s -= Math.abs(o.slots.schoen.formeel - gem) * 0.4;

  // sfeer: één of meer. Meerdere worden gemengd (het gemiddelde van de
  // recepten), zodat cosy + streetstyle iets geeft dat van allebei heeft.
  const sferen = sfeerLijst(ctx.sfeer).map(k => SFEREN[k]).filter(Boolean);
  for (const sf of sferen) {
    let t = 0;
    for (const i of o.items) {
      t += (sf.soort[i.soort] || 0) * 0.6;
      t += ((sf.textuur || {})[i.textuur] || 0) * 0.5;
      if (i.print) t += ((sf.print || {})[i.print] || 0) * 0.5;
      if (i.snit) t += ((sf.snit || {})[i.snit] || 0) * 0.6;
    }
    t += (sf.methode[o.kleur.methode] || 0);
    s += t / sferen.length;
  }
  // comfy ←→ sjiek
  if (ctx.sjiek != null) {
    // De schoen telt mee: sneakers maken een avond uit eten casual,
    // hakken een strandwandeling onhandig.
    const doel = 1.5 + 3 * ctx.sjiek;
    const metSchoen = kleding.concat(o.slots.schoen ? [o.slots.schoen] : []);
    const gemS = metSchoen.reduce((t, i) => t + i.formeel, 0) / Math.max(1, metSchoen.length);
    s -= Math.abs(gemS - doel) * 1.2;
    if (o.slots.schoen) s -= Math.max(0, Math.abs(o.slots.schoen.formeel - doel) - 1.5) * 1.5;
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
  o.check = controleer(o, ctx.rapport);
  o.score = score(o, ctx);
  return o;
}

const sleutel = o => o.items.map(i => i.id).sort().join('|');

function pools(kast, ctx) {
  const weer = ctx.weer || 'mild';
  const uit = new Set(ctx.uitsluiten || []);
  const anker = new Set(ctx.anker || []);
  const ok = i => anker.has(i.id) || (!uit.has(i.id) && pastBijWeer(i, weer));
  const p = { boven: [], onder: [], heel: [], laag: [], jas: [], schoen: [], tas: [], riem: [], sjaal: [] };
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
const herstelbaar = o => harde(o).every(p => p.regel === 'textuur');

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
  const lagen = ctx.weer === 'koud' || ctx.weer === 'fris' ? p.laag.filter(i => i.warmte >= 2) : p.laag;
  if (ctx.weer !== 'warm') probeer('laag', lagen, wilLaag && !p.jas.length);
  // onder de 16 graden ga je met een jas de deur uit
  // bij het sporten pas een jas als het echt koud is
  const jasNodig = ctx.sport ? (ctx.weer === 'koud' || ctx.weer === 'fris') && p.jas.length > 0 : (ctx.weer === 'koud' || ctx.weer === 'fris' || (wilLaag && !o.slots.laag));
  if (jasNodig) probeer('jas', p.jas, true);
  if (!ctx.sport) probeer('tas', p.tas, false);
  if (ctx.sport) { /* geen riem of sjaal bij het sporten */ }
  else if (o.slots.boven && o.slots.boven.pasvorm === 'wijd' && o.slots.onder && o.slots.onder.pasvorm === 'wijd') probeer('riem', p.riem, false);
  else if (ctx.weer === 'koud' || ctx.weer === 'fris') probeer('sjaal', p.sjaal, false);
  // Bij het sporten gaan kleurregels niet over krachtmetingen.
  if (ctx.sport) o = { ...o, check: { ...o.check, tips: [], problemen: o.check.problemen.filter(p => !p.zacht) } };
  // Geen jas die erbij past terwijl het fris is: dan is dit geen outfit.
  if (jasNodig && p.jas.length && !o.slots.jas)
    o = { ...o, check: { ...o.check, ok: false, problemen: o.check.problemen.concat({ regel: 'weer', tekst: 'Geen jas die erbij past.' }) } };
  return o;
}

export function slotVan(i) {
  if (i.rol === 'accessoire') return i.soort === 'riem' ? 'riem' : 'sjaal';
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
  const voorrang = o => o.score + (ctx.methode && o.kleur.methode === ctx.methode ? 6 : 0);
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
  const overlapt = o => gekozen.some(g => o.items.filter(i => ['boven', 'onder', 'heel'].includes(i.rol) && g.items.includes(i)).length >= 2
    || (o.slots.heel && g.slots.heel === o.slots.heel));
  for (const ronde of [0, 1, 2]) {
    for (const o of pool) {
      if (gekozen.length >= aantal) break;
      const k = sleutel(o);
      if (gezien.has(k)) continue;
      if (ronde === 0 && verschillendeManieren && manieren.has(o.kleur.methode)) continue;
      if (ronde < 2 && overlapt(o)) continue;
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
    const o = kleedAan(sk, p, { ...ctx, perId: {} });
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
  const { dagen, rapport, sfeer = null, sjiek = null, moetMee = [], uitsluiten = [], seed = 1, geheugen = {}, afwisselen = false } = opties;
  const mom = momenten(dagen);
  const nodig = mom.length;
  const koudste = mom.some(m => m.weer === 'koud') ? 'koud' : mom.some(m => m.weer === 'fris') ? 'fris' : mom.every(m => m.weer === 'warm') ? 'warm' : 'mild';
  const ctx = { rapport, sfeer, sjiek, weer: koudste, geheugen, uitsluiten, afwisselen };
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
    activiteit: m.activiteit, avond: m.moment === 'avond', reis: m.reis } };
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
  const { dagen, rapport, sfeer = null, sjiek = null, moetMee = [], uitsluiten = [], geheugen = {}, afwisselen = false, max = 12 } = opties;
  const mom = momenten(dagen);
  const perId = Object.fromEntries(kast.map(i => [i.id, i]));
  const selectie = moetMee.map(id => perId[id]).filter(Boolean);
  const ctx = { rapport, sfeer, sjiek, geheugen, uitsluiten, afwisselen };
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
    return { ...m, outfit: null, opties: divers(os, max, o => o.items.filter(i => !eigen.has(i) && i.rol !== 'tas').length * 2) };
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
  return { outfit: beste.outfit, wissels: beste.wissels, nieuw: beste.wissels.filter(w => w.naar && !inKoffer.has(w.naar.id)).map(w => w.naar) };
}
