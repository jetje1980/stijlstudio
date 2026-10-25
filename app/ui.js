// Kleine bouwstenen die elke tab gebruikt.
import { hex } from './kleur.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Cloudinary geeft een verkleinde versie als je het vraagt.
export function foto(url, b = 360) {
  if (!url) return '';
  if (!/res\.cloudinary\.com/.test(url)) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${b}/`);
}

export function stip(kleur, groot = 12) {
  return `<span class="stip" style="width:${groot}px;height:${groot}px;background:${hex(kleur)}" title="${esc(kleur)}"></span>`;
}

export function tegel(item, extra = '') {
  const f = foto(item.foto, 300);
  return `<button class="tegel" data-item="${esc(item.id)}" type="button">
    ${f ? `<img src="${esc(f)}" alt="" loading="lazy">` : `<span class="tegel-leeg" style="background:${hex(item.kleur[0])}"></span>`}
    <span class="tegel-naam">${esc(item.naam)}</span>${extra}
  </button>`;
}

// Een rijtje kleine foto's als voorproefje van een outfit.
export function collage(items, max = 6) {
  const rest = items.length - max;
  return `<div class="collage n${Math.min(items.length, max)}">${items.slice(0, max).map(i =>
    i.foto ? `<img src="${esc(foto(i.foto, 220))}" alt="" loading="lazy">` : `<span style="background:${hex(i.kleur[0])}"></span>`).join('')}
    ${rest > 0 ? `<em>+${rest}</em>` : ''}</div>`;
}

export function chips(naam, opties, gekozen, { meer = false } = {}) {
  return `<div class="chips" data-chips="${esc(naam)}">${opties.map(([w, label]) =>
    `<button type="button" class="chip${(meer ? (gekozen || []).includes(w) : gekozen === w) ? ' aan' : ''}" data-w="${esc(w)}">${label}</button>`).join('')}</div>`;
}

// Onderblad dat over de pagina schuift. Geeft het element terug.
export function blad(html, { opSluiten } = {}) {
  const achter = document.createElement('div');
  achter.className = 'blad-achter';
  achter.innerHTML = `<div class="blad" role="dialog" aria-modal="true"><button class="blad-dicht" aria-label="Sluiten" type="button">×</button>${html}</div>`;
  document.body.appendChild(achter);
  document.body.classList.add('blad-open');
  requestAnimationFrame(() => achter.classList.add('open'));
  const sluit = () => {
    achter.classList.remove('open');
    document.body.classList.remove('blad-open');
    setTimeout(() => achter.remove(), 250);
    opSluiten && opSluiten();
  };
  achter.addEventListener('click', e => { if (e.target === achter || e.target.closest('.blad-dicht')) sluit(); });
  achter.sluit = sluit;
  return achter;
}

let toastTimer;
export function melding(tekst, ms = 2600) {
  let t = $('#melding');
  if (!t) { t = document.createElement('div'); t.id = 'melding'; document.body.appendChild(t); }
  t.textContent = tekst;
  t.classList.add('zicht');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('zicht'), ms);
}

export function datum(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export async function verklein(bestand, max = 1400) {
  const url = URL.createObjectURL(bestand);
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const s = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement('canvas');
  c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.85);
}

// Uploaden naar dezelfde Cloudinary-map als de oude app.
export async function upload(dataUrl, map, id) {
  const fd = new FormData();
  fd.append('file', dataUrl);
  fd.append('upload_preset', 'griette-photos');
  fd.append('public_id', `${map}/griette_${id}`);
  const r = await fetch('https://api.cloudinary.com/v1_1/dhggari0g/image/upload', { method: 'POST', body: fd });
  const d = await r.json();
  if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || 'Uploaden lukte niet');
  return d.secure_url;
}
