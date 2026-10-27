// Een outfitkaart als echte afbeelding, rechtstreeks op een canvas getekend.
// Geen schermafdruk van een stuk pagina: die gaf lege of kapotte plaatjes
// zodra het element verborgen of nog niet opgebouwd was.
import { hex } from './kleur.js';
import { foto } from './ui.js';

const B = 1080, H = 1350;
const KLEUR = { bg: '#f7f1e8', kaart: '#fffdf9', tekst: '#2e1a0e', zacht: '#8a7563', lijn: '#e6d9c6' };

function laadBeeld(url) {
  return new Promise(res => {
    if (!url) return res(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

// Kleding vult het vlak (cover), iets naar boven gericht zodat een kraag niet
// wegvalt. Schoenen, tassen en accessoires staan er heel in (contain), op de
// achtergrondkleur van hun eigen foto, dan zie je geen rand.
const HEEL = ['schoen', 'tas', 'accessoire'];
function hoekKleur(im) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d'), z = Math.max(2, Math.round(im.width * 0.02));
    x.drawImage(im, 1, 1, z, z, 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return `rgb(${d[0]},${d[1]},${d[2]})`;
  } catch { return KLEUR.kaart; }
}
function vul(ctx, im, x, y, w, h, item) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.clip();
  const heel = im && HEEL.includes(item.rol);
  ctx.fillStyle = !im ? hex(item.kleur[0]) : heel ? hoekKleur(im) : KLEUR.kaart;
  ctx.fillRect(x, y, w, h);
  if (im) {
    const s = heel ? Math.min(w * 0.88 / im.width, h * 0.88 / im.height) : Math.max(w / im.width, h / im.height);
    const iw = im.width * s, ih = im.height * s;
    ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) * (heel ? 0.5 : 0.35), iw, ih);
  } else {
    // geen foto: de kleur met de naam erop
    ctx.fillStyle = ['wit', 'gebroken-wit', 'creme', 'beige', 'lichtgrijs', 'geel', 'lichtblauw'].includes(item.kleur[0]) ? KLEUR.tekst : '#fffdf9';
    ctx.font = '400 22px Jost, sans-serif';
    regels(ctx, item.naam, w - 40).slice(0, 3).forEach((r, n, l) => ctx.fillText(r, x + 20, y + h / 2 - (l.length - 1) * 14 + n * 28));
  }
  ctx.restore();
}

function regels(ctx, tekst, maxB) {
  const woorden = String(tekst).split(/\s+/), uit = [];
  let r = '';
  for (const w of woorden) {
    const t = r ? r + ' ' + w : w;
    if (ctx.measureText(t).width > maxB && r) { uit.push(r); r = w; } else r = t;
  }
  if (r) uit.push(r);
  return uit;
}

// Opbouw als een flatlay: links wat je aan je lijf draagt (boven op onder, of
// de jurk), rechts de rest in een rij. Geen kaders met namen eronder; de
// stukken staan klein onderaan.
const LIJF = ['heel', 'boven', 'onder'];
const REST = ['laag', 'jas', 'schoen', 'tas', 'accessoire'];
export async function tekenKaart({ titel, ondertitel, items, notitie }) {
  await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = B; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = KLEUR.bg; ctx.fillRect(0, 0, B, H);
  const M = 64;

  ctx.fillStyle = KLEUR.zacht;
  ctx.font = '500 20px Jost, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText((ondertitel || 'OUTFIT').toUpperCase(), M, 88);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = KLEUR.tekst;
  ctx.font = '400 66px "Bodoni Moda", serif';
  const tr = regels(ctx, titel || 'Outfit', B - 2 * M - 220).slice(0, 2);
  tr.forEach((r, n) => ctx.fillText(r, M, 162 + n * 72));
  // het kleurenpalet rechts naast de titel
  const kleuren = [...new Set(items.flatMap(i => i.kleur.slice(0, 1)))].slice(0, 6);
  kleuren.forEach((k, n) => {
    const x = B - M - 18 - (kleuren.length - 1 - n) * 40;
    ctx.fillStyle = hex(k);
    ctx.beginPath(); ctx.arc(x, 142, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = KLEUR.lijn; ctx.lineWidth = 2; ctx.stroke();
  });

  const lijf = LIJF.flatMap(r => items.filter(i => i.rol === r)).slice(0, 2);
  const rest = REST.flatMap(r => items.filter(i => i.rol === r)).slice(0, 4);
  const top = 162 + (tr.length - 1) * 72 + 52, onder = H - (notitie ? 250 : 190);
  const hoogte = onder - top, gat = 16;
  const links = rest.length ? Math.round((B - 2 * M - gat) * 0.6) : B - 2 * M;
  const beeld = await Promise.all(items.map(i => laadBeeld(foto(i.foto, 900))));
  const van = i => beeld[items.indexOf(i)];
  // links: boven groter dan onder; een jurk alleen
  if (lijf.length === 2) {
    const h1 = Math.round((hoogte - gat) * 0.54);
    vul(ctx, van(lijf[0]), M, top, links, h1, lijf[0]);
    vul(ctx, van(lijf[1]), M, top + h1 + gat, links, hoogte - h1 - gat, lijf[1]);
  } else if (lijf.length) vul(ctx, van(lijf[0]), M, top, links, hoogte, lijf[0]);
  // rechts: laag, jas, schoen, tas onder elkaar
  if (rest.length) {
    const x = M + links + gat, w = B - M - x;
    const h = (hoogte - gat * (rest.length - 1)) / rest.length;
    rest.forEach((it, n) => vul(ctx, van(it), x, top + n * (h + gat), w, h, it));
  }

  // de stukken, klein onderaan
  ctx.fillStyle = KLEUR.zacht;
  ctx.font = '400 19px Jost, sans-serif';
  regels(ctx, lijf.concat(rest).map(i => i.naam).join('  ·  '), B - 2 * M).slice(0, 2)
    .forEach((r, n) => ctx.fillText(r, M, onder + 42 + n * 26));
  if (notitie) {
    ctx.fillStyle = KLEUR.tekst;
    ctx.font = 'italic 400 26px "Bodoni Moda", serif';
    regels(ctx, notitie, B - 2 * M).slice(0, 2).forEach((r, n) => ctx.fillText(r, M, onder + 118 + n * 34));
  }
  ctx.fillStyle = KLEUR.zacht;
  ctx.font = '500 15px Jost, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('STIJL STUDIO · GRIETTE', M, H - 40);
  ctx.letterSpacing = '0px';
  return c;
}

export async function deelOfBewaar(canvas, naam) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!blob || blob.size < 1000) throw new Error('De afbeelding bleef leeg.');
  // datum en tijd erachter, zodat een nieuwe kaart nooit een oude overschrijft
  const t = new Date(), twee = n => String(n).padStart(2, '0');
  const stempel = `${t.getFullYear()}${twee(t.getMonth() + 1)}${twee(t.getDate())}-${twee(t.getHours())}${twee(t.getMinutes())}${twee(t.getSeconds())}`;
  const bestand = new File([blob], `${naam.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}-${stempel}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
    try { await navigator.share({ files: [bestand], title: naam }); return 'gedeeld'; }
    catch (e) { if (e.name === 'AbortError') return 'geannuleerd'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(bestand); a.download = bestand.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return 'gedownload';
}
