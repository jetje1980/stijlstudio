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

function vul(ctx, im, x, y, w, h) {
  // object-fit: contain, op een licht vlak
  ctx.fillStyle = KLEUR.kaart;
  ctx.fillRect(x, y, w, h);
  if (!im) return;
  const s = Math.min(w / im.width, h / im.height);
  const iw = im.width * s, ih = im.height * s;
  ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
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

export async function tekenKaart({ titel, ondertitel, items, notitie }) {
  await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = B; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = KLEUR.bg; ctx.fillRect(0, 0, B, H);

  ctx.fillStyle = KLEUR.zacht;
  ctx.font = '500 22px Jost, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText((ondertitel || 'OUTFIT').toUpperCase(), 72, 96);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = KLEUR.tekst;
  ctx.font = '400 64px "Bodoni Moda", serif';
  const tr = regels(ctx, titel || 'Outfit', B - 144).slice(0, 2);
  tr.forEach((r, n) => ctx.fillText(r, 72, 170 + n * 72));

  const top = 170 + tr.length * 72 + 20;
  const hoofd = items.slice(0, 6);
  const kol = hoofd.length <= 4 ? 2 : 3;
  const rij = Math.ceil(hoofd.length / kol);
  const gat = 18, x0 = 72, bruikbaar = B - 144 - 70;
  const w = (bruikbaar - gat * (kol - 1)) / kol;
  const beschikbaarH = H - top - 170;
  const h = Math.min(w * 1.25, (beschikbaarH - (gat + 58) * rij) / rij);
  const beelden = await Promise.all(hoofd.map(i => laadBeeld(foto(i.foto, 600))));
  hoofd.forEach((it, n) => {
    const x = x0 + (n % kol) * (w + gat), y = top + Math.floor(n / kol) * (h + gat + 58);
    vul(ctx, beelden[n], x, y, w, h);
    ctx.fillStyle = KLEUR.zacht;
    ctx.font = '400 20px Jost, sans-serif';
    regels(ctx, it.naam, w).slice(0, 2).forEach((r, k) => ctx.fillText(r, x, y + h + 26 + k * 24));
  });

  // kleurkolom rechts
  const kleuren = [...new Set(items.flatMap(i => i.kleur.slice(0, 1)))].slice(0, 6);
  kleuren.forEach((k, n) => {
    ctx.fillStyle = hex(k);
    ctx.beginPath(); ctx.arc(B - 72 - 22, top + 22 + n * 62, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = KLEUR.lijn; ctx.lineWidth = 2; ctx.stroke();
  });

  if (notitie) {
    ctx.fillStyle = KLEUR.tekst;
    ctx.font = 'italic 400 26px "Bodoni Moda", serif';
    regels(ctx, notitie, B - 144).slice(0, 3).forEach((r, n) => ctx.fillText(r, 72, H - 120 + n * 34));
  }
  ctx.fillStyle = KLEUR.zacht;
  ctx.font = '500 16px Jost, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('STIJL STUDIO · GRIETTE', 72, H - 40);
  return c;
}

export async function deelOfBewaar(canvas, naam) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!blob || blob.size < 1000) throw new Error('De afbeelding bleef leeg.');
  const bestand = new File([blob], naam.replace(/[^\w-]+/g, '-').toLowerCase() + '.jpg', { type: 'image/jpeg' });
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
