// Kleurkennis als regels. Elke kleurnaam uit de kast hoort bij een familie,
// is neutraal of niet, en heeft een lichtheid. Daarmee herkent de app zelf
// welke kleurmanier een outfit is — er hoeft geen AI aan te pas te komen.

// familie, neutraal (rustige basis volgens het rapport), plek op de kleurcirkel
const K = {
  'zwart':        ['zwart', 1], 'antraciet': ['zwart', 1],
  'grijs':        ['grijs', 1], 'lichtgrijs': ['grijs', 1], 'zilver': ['grijs', 1],
  'wit':          ['wit', 1], 'ecru': ['wit', 1], 'gebroken-wit': ['wit', 1],
  'zand':         ['bruin', 1], 'beige': ['bruin', 1], 'taupe': ['bruin', 1], 'camel': ['bruin', 1],
  'bruin':        ['bruin', 1], 'chocolade': ['bruin', 1], 'cognac': ['bruin', 1], 'nude/huid': ['bruin', 1],
  'goud':         ['bruin', 1],
  'donkerblauw':  ['blauw', 1], 'marine': ['blauw', 1], 'denimblauw': ['blauw', 1], 'denim': ['blauw', 1],
  'lichtblauw':   ['blauw', 0], 'ijsblauw': ['blauw', 0], 'hemelsblauw': ['blauw', 0], 'kobaltblauw': ['blauw', 0],
  'petrol':       ['turquoise', 0], 'turquoise': ['turquoise', 0],
  'smaragdgroen': ['groen', 0], 'mintgroen': ['groen', 0], 'salie': ['groen', 1], 'groen': ['groen', 0],
  'olijf/khaki':  ['groen', 1], 'chartreuse': ['geel', 0],
  'geel':         ['geel', 0], 'botergeel': ['geel', 0], 'mosterd': ['geel', 0],
  'oranje':       ['oranje', 0], 'perzik': ['oranje', 0], 'roest': ['oranje', 0], 'terra cotta': ['oranje', 0],
  'koraal':       ['rood', 0], 'zalm': ['oranje', 0],
  'rood':         ['rood', 0], 'oranje-rood': ['rood', 0], 'bordeaux': ['rood', 0],
  'roze':         ['roze', 0], 'felroze': ['roze', 0], 'fuchsia': ['roze', 0], 'oudroze': ['roze', 0],
  'lila/paars':   ['paars', 0], 'lavendel': ['paars', 0], 'paars': ['paars', 0], 'aubergine': ['paars', 0],
  'multi':        ['multi', 0],
};

// Plek op de kleurcirkel per familie, voor analoog en complementair.
export const CIRKEL = { rood: 0, oranje: 30, geel: 55, groen: 120, turquoise: 175, blauw: 220, paars: 275, roze: 330 };

// Zwaargewichten: naast een heldere kleur maken ze er een krachtmeting van.
export const ZWAAR = new Set(['zwart', 'antraciet', 'bordeaux', 'aubergine']);

let HEX = {};
export function zetHex(lijst) {
  HEX = {};
  for (const k of lijst) HEX[k.naam] = k.hex;
  HEX.denim = HEX.denimblauw || '#4a6d94';
}
export const hex = naam => HEX[naam] || '#bbb';

function hsl(h) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h || '');
  if (!m) return { h: 0, s: 0, l: 0.5 };
  let x = m[1];
  if (x.length === 3) x = x.split('').map(c => c + c).join('');
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: 0, s, l };
}

export function info(naam) {
  const [fam, neutraal] = K[naam] || ['multi', 0];
  const { l, s } = hsl(hex(naam));
  return { naam, fam, neutraal: !!neutraal, licht: l, verzadigd: s, zwaar: ZWAAR.has(naam) };
}

// Twee families liggen naast elkaar op de cirkel (binnen 60 graden).
export function buren(a, b) {
  if (!(a in CIRKEL) || !(b in CIRKEL)) return false;
  const d = Math.abs(CIRKEL[a] - CIRKEL[b]);
  return Math.min(d, 360 - d) <= 60;
}
export function tegenover(a, b) {
  if (!(a in CIRKEL) || !(b in CIRKEL)) return false;
  const d = Math.abs(CIRKEL[a] - CIRKEL[b]);
  return Math.min(d, 360 - d) >= 120;
}

// Families die als kleur-familie een eigen ton-sur-ton kunnen dragen,
// ook al zijn ze neutraal: bruin van zand tot chocolade, blauw van ijs tot navy.
const GEKLEURD_NEUTRAAL = new Set(['bruin', 'blauw', 'groen']);
const ZACHT_STEUN = new Set(['wit', 'grijs']);

export const METHODEN = {
  mono:       { naam: 'Monochroom', kort: 'mono' },
  tonsurton:  { naam: 'Ton-sur-ton', kort: 'ton-sur-ton' },
  accent:     { naam: 'Neutraal + accent', kort: 'accent' },
  analoog:    { naam: 'Analoog', kort: 'analoog' },
  split:      { naam: 'Split-complementair', kort: 'split' },
  colorblock: { naam: 'Colorblocking', kort: 'colorblock' },
  neutraal:   { naam: 'Rustig neutraal', kort: 'neutraal' },
  mix:        { naam: 'Vrije mix', kort: 'mix' },
};

// Welke kleurmanier is dit? `kleding` = boven/onder/heel/laag/jas,
// `extra` = schoenen, tas, accessoires (tellen mee voor het accent).
export function herken(kleding, extra = []) {
  const hoofd = kleding.map(i => info(i.kleur[0] || 'multi'));
  const alles = hoofd.concat(extra.map(i => info(i.kleur[0] || 'multi')));
  const fams = new Set(hoofd.map(k => k.fam));
  const accentFams = [...new Set(alles.filter(k => !k.neutraal && k.fam !== 'multi').map(k => k.fam))];
  const kledingAccent = [...new Set(hoofd.filter(k => !k.neutraal).map(k => k.fam))];
  const lichtheden = new Set(hoofd.map(k => Math.round(k.licht * 4)));

  const r = (methode, extraInfo = {}) => ({ methode, ...METHODEN[methode], ...extraInfo });

  if (fams.size === 1 && hoofd.length >= 2) {
    const fam = hoofd[0].fam;
    if (lichtheden.size >= 2 || fam === 'zwart' || fam === 'wit') return r('mono', { familie: fam, accent: accentFams.filter(f => f !== fam) });
  }
  const zonderSteun = [...fams].filter(f => !ZACHT_STEUN.has(f));
  // Ton-sur-ton: één kleurfamilie (eventueel met een buurtint) die de outfit
  // draagt, met hooguit zacht wit of grijs als steun.
  if (zonderSteun.length === 1 && fams.size <= 3) {
    const f = zonderSteun[0];
    const draagt = hoofd.filter(k => k.fam === f).length;
    if (draagt >= 2 && (kledingAccent.length === 0 ? GEKLEURD_NEUTRAAL.has(f) : kledingAccent.every(a => a === f)))
      return r('tonsurton', { familie: f });
  }
  if (zonderSteun.length === 2 && kledingAccent.length >= 1 && buren(zonderSteun[0], zonderSteun[1])) {
    const draagt = hoofd.filter(k => zonderSteun.includes(k.fam)).length;
    if (draagt >= 3 || kledingAccent.length === 2) {
      // twee buurfamilies in verschillende lichtheden: ton-sur-ton als het
      // gedempt blijft, analoog als het allebei echte kleuren zijn
      return kledingAccent.length === 2 ? r('analoog', { families: zonderSteun }) : r('tonsurton', { familie: zonderSteun.join('+') });
    }
  }
  if (accentFams.length === 0) return r('neutraal');
  if (accentFams.length === 1) return r('accent', { accent: accentFams });
  if (accentFams.length <= 3 && accentFams.every((a, i) => accentFams.every(b => a === b || buren(a, b) || CIRKEL[a] === undefined)))
    return r('analoog', { families: accentFams });
  if (accentFams.length === 2 && tegenover(accentFams[0], accentFams[1])) return r('colorblock', { families: accentFams });
  if (accentFams.length === 3) {
    // één sterke kleur met twee lichte tinten erbij
    const acc = alles.filter(k => !k.neutraal && k.fam !== 'multi');
    const sterk = acc.filter(k => k.licht < 0.68);
    const licht = acc.filter(k => k.licht >= 0.68);
    if (new Set(sterk.map(k => k.fam)).size === 1 && licht.length >= 1) return r('split', { families: accentFams });
  }
  if (accentFams.length === 2) return r('colorblock', { families: accentFams });
  return r('mix', { families: accentFams });
}
