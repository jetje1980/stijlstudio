// Outfits: je bewaarde looks, en de maker. In de maker kies je niets vooraf
// als je dat niet wilt: dan krijg je drie voorstellen in drie verschillende
// kleurmanieren, en stuur je daarna bij.
import { stelVoor, alternatieven, maakOutfit, slotVan, SFEREN, WENSEN, weerKlasse } from '../engine.js';
import { METHODEN } from '../kleur.js';
import { esc, $, $$, collage, foto, blad, melding, chips, stip, tegel, verklein } from '../ui.js';
import { tekenKaart, deelOfBewaar } from '../kaart.js';
import { vertelOver, spiegelcheck } from '../ai.js';
import { detail as itemDetail } from './kast.js';

const MANIEREN = ['tonsurton', 'mono', 'accent', 'analoog', 'split', 'colorblock', 'neutraal'];
const KLEURKEUZE = ['donkerblauw', 'lichtblauw', 'bruin', 'camel', 'zwart', 'ecru', 'groen', 'olijf/khaki', 'rood', 'roze', 'paars', 'geel', 'oranje', 'turquoise'];

const keuze = { open: false, anker: [], sfeer: [], sjiek: 0.5, schuif: false, methode: null, kleur: null, wensen: [], weer: null, seed: 0 };
let weerInfo = null;

// Vanuit Stijl: "probeer deze kleurmanier met mijn kast".
export function zetKeuze(k) { Object.assign(keuze, { anker: [], seed: 0 }, k); }

export default function outfitsTab(el, app, [sub, arg]) {
  if (sub === 'maak') {
    if (arg && !keuze.anker.includes(arg)) { keuze.anker = [arg]; keuze.seed = 0; }
    return maker(el, app);
  }
  lijst(el, app);
}

// ── Het overzicht ───────────────────────────────────────────────────────────
let mapFilter = '';
function lijst(el, app) {
  const outfits = app.outfits();
  const mappen = app.mappen().filter(m => outfits.some(o => o.map === m.id));
  const perId = Object.fromEntries(app.kast().map(i => [i.id, i]));
  const zicht = outfits.filter(o => !mapFilter || o.map === mapFilter).slice().reverse();
  el.innerHTML = `
    <div class="tab-kop"><div><h1>Outfits</h1><p class="sub">${outfits.length} bewaard</p></div></div>
    <div class="rij" style="margin-bottom:12px">
      <a class="knop" href="#outfits/maak">Nieuwe outfit</a>
      <button class="knop licht" id="spiegel" type="button">Spiegelcheck</button>
    </div>
    ${chips('map', [['', 'Alles']].concat(mappen.map(m => [m.id, `${m.emoji || ''} ${esc(m.naam)}`])), mapFilter)}
    <div class="outfit-lijst">${zicht.map(o => {
      const its = o.items.map(id => perId[id]).filter(Boolean);
      return `<button class="outfit-tegel" data-o="${esc(o.id)}" type="button">
        ${o.afbeelding ? `<img src="${esc(foto(o.afbeelding, 400))}" alt="" style="border-radius:10px;aspect-ratio:4/5;object-fit:cover;width:100%">` : collage(its)}
        <b>${esc(o.naam)}</b>${o.methode ? `<span class="label-manier">${esc(METHODEN[o.methode]?.naam || '')}</span>` : ''}</button>`;
    }).join('') || '<p class="leeg-melding">Nog geen outfits in deze map.</p>'}</div>`;
  $$('[data-chips="map"] .chip', el).forEach(b => b.addEventListener('click', () => { mapFilter = b.dataset.w; lijst(el, app); }));
  $$('[data-o]', el).forEach(b => b.addEventListener('click', () => toonBewaard(app, b.dataset.o, () => lijst(el, app))));
  $('#spiegel').addEventListener('click', () => spiegel(app));
}

// Een bewaarde outfit weer tot leven: met wisselen en de kaart.
export function vanIds(app, ids, ctx) {
  const slots = { extra: [] };
  for (const id of ids) {
    const i = app.item(id); if (!i) continue;
    const s = slotVan(i);
    if (slots[s]) slots.extra.push(i); else slots[s] = i;
  }
  return maakOutfit(slots, ctx);
}

function context(app) {
  return {
    rapport: app.data.rapport, weer: keuze.weer || (weerInfo ? weerInfo.klasse : 'mild'),
    sfeer: keuze.sfeer, sjiek: keuze.schuif ? keuze.sjiek : null, methode: keuze.methode, kleur: keuze.kleur,
    wensen: keuze.wensen, anker: keuze.anker, geheugen: app.staat().geheugen, seed: keuze.seed,
  };
}

function toonBewaard(app, id, klaar) {
  const o = app.outfits().find(x => x.id === id);
  if (!o) return;
  const uit = vanIds(app, o.items, context(app));
  const b = blad('<div id="outfit-in"></div>', { opSluiten: klaar });
  const teken = () => {
    $('#outfit-in', b).innerHTML = `
      ${o.afbeelding ? `<img class="groot-foto" src="${esc(foto(o.afbeelding, 900))}" alt="">` : ''}
      <h2>${esc(o.naam)}</h2>
      ${outfitHtml(uit, { notitie: o.notitie, waarom: o.waarom })}
      <div class="rij" style="margin-top:12px">
        <button class="knop" data-a="kaart" type="button">Kaart opslaan</button>
        <button class="knop licht" data-a="vandaag" type="button">Vandaag aan</button>
      </div>
      <div class="rij" style="margin-top:8px">
        <button class="knop licht" data-a="naam" type="button">Naam wijzigen</button>
        <button class="knop licht" data-a="weg" type="button">Verwijderen</button>
      </div>`;
  };
  teken();
  b.addEventListener('click', async e => {
    const st = e.target.closest('[data-slot]');
    if (st) return wissel(app, uit, st.dataset.slot, nieuw => {
      Object.assign(uit, nieuw);
      app.bij(s => { const x = s.outfits.find(y => y.id === id); x.items = nieuw.items.map(i => i.id); x.afbeelding = null; });
      o.afbeelding = null; teken();
    });
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'kaart') bewaarKaart(o.naam, uit, o.waarom || o.notitie);
    if (a.dataset.a === 'vandaag') vandaag(app, uit);
    if (a.dataset.a === 'naam') {
      const n = prompt('Naam', o.naam);
      if (n) { app.bij(s => { s.outfits.find(y => y.id === id).naam = n; }); o.naam = n; teken(); }
    }
    if (a.dataset.a === 'weg' && confirm('Deze outfit verwijderen?')) { app.bij(s => { s.outfits = s.outfits.filter(y => y.id !== id); }); b.sluit(); }
  });
}

export const SLOT_NAAM = { boven: 'boven', onder: 'onder', heel: 'jurk/set', laag: 'laag', jas: 'jas', schoen: 'schoenen', tas: 'tas', riem: 'riem', sjaal: 'accessoire' };
export function outfitHtml(o, { notitie, waarom, tip } = {}) {
  const volgorde = ['boven', 'onder', 'heel', 'laag', 'jas', 'schoen', 'tas', 'riem', 'sjaal'];
  const stukken = volgorde.filter(s => o.slots[s]).map(s => [s, o.slots[s]]).concat((o.slots.extra || []).map(i => ['extra', i]));
  const fam = o.kleur.familie || (o.kleur.accent && o.kleur.accent[0]) || (o.kleur.families || []).join(' + ');
  return `<span class="label-manier">${esc(o.kleur.naam)}${fam ? ' · ' + esc(fam) : ''}</span>
    <div class="stukken">${stukken.map(([s, i]) => `<button class="stuk" type="button" ${s !== 'extra' ? `data-slot="${s}"` : ''}>
      ${i.foto ? `<img src="${esc(foto(i.foto, 300))}" alt="" loading="lazy">` : `<span class="leeg" style="display:grid;place-items:center">${stip(i.kleur[0], 30)}</span>`}
      <span>${esc(i.naam)}</span>${s !== 'extra' ? '<i>↻</i>' : ''}</button>`).join('')}</div>
    ${waarom ? `<p class="waarom">${esc(waarom)}</p>` : ''}
    ${(o.check.tips.length || tip || notitie) ? `<ul class="tips">${[tip, ...o.check.tips].filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('')}${notitie && !waarom ? `<li>${esc(notitie.slice(0, 220))}</li>` : ''}</ul>` : ''}
    ${o.check.problemen.length ? `<ul class="tips">${o.check.problemen.map(p => `<li>⚠︎ ${esc(p.tekst)}</li>`).join('')}</ul>` : ''}`;
}

// Een stuk wisselen: eerst wat de kleurmanier heel laat.
export function wissel(app, o, slot, klaar, ctxIn) {
  const ctx = ctxIn || context(app);
  const alt = alternatieven(app.kast(), o, slot, { ...ctx, methode: null, kleur: null, anker: [] }, 18);
  const zelfde = alt.filter(a => a.zelfde), anders = alt.filter(a => !a.zelfde);
  const huidig = o.slots[slot];
  const b = blad(`<h2>Ander${slot === 'schoen' ? 'e schoenen' : ' stuk'} (${esc(SLOT_NAAM[slot] || slot)})</h2>
    ${zelfde.length ? `<h3>Blijft ${esc(o.kleur.naam.toLowerCase())}</h3><div class="raster">${zelfde.map(a => tegel(a.item)).join('')}</div>` : ''}
    ${anders.length ? `<h3>Wordt een andere manier</h3><div class="raster">${anders.map(a => tegel(a.item, `<span class="label">${esc(a.outfit.kleur.kort)}</span>`)).join('')}</div>` : ''}
    ${!alt.length ? '<p class="leeg-melding">Niets anders dat met deze outfit werkt.</p>' : ''}
    ${huidig && !['boven', 'onder', 'heel', 'schoen'].includes(slot) ? '<button class="knop licht vol" id="zonder" type="button" style="margin-top:12px">Zonder</button>' : ''}`);
  b.addEventListener('click', e => {
    const t = e.target.closest('[data-item]');
    if (t) {
      const a = alt.find(x => x.item.id === t.dataset.item);
      if (huidig) app.onthoud(huidig.id, 'weg');
      app.onthoud(a.item.id, 'gekozen');
      b.sluit(); klaar(a.outfit);
    }
    if (e.target.id === 'zonder') {
      const slots = { ...o.slots }; delete slots[slot];
      b.sluit(); klaar(maakOutfit(slots, ctx));
    }
  });
}

export function standaardNaam(o) {
  const fam = o.kleur.familie || (o.kleur.accent || [])[0] || (o.kleur.families || []).join(' en ');
  return fam ? `${o.kleur.naam} in ${fam}` : o.kleur.naam;
}

export async function bewaarKaart(naam, o, notitie) {
  try {
    melding('Kaart maken…');
    const sfeer = keuze.sfeer.map(k => SFEREN[k].naam).join(' × ');
    const c = await tekenKaart({ titel: naam, ondertitel: [o.kleur.naam, sfeer].filter(Boolean).join(' · '), items: o.items, notitie });
    const r = await deelOfBewaar(c, naam);
    if (r !== 'geannuleerd') melding(r === 'gedeeld' ? 'Gedeeld' : 'Kaart opgeslagen');
  } catch (e) { melding('Kaart lukte niet: ' + e.message, 4000); }
}

function vandaag(app, o) {
  const d = new Date().toISOString().slice(0, 10);
  app.bij(s => { s.gedragen[d] = [...new Set((s.gedragen[d] || []).concat(o.items.map(i => i.id)))]; });
  o.items.forEach(i => app.onthoud(i.id, 'gekozen'));
  melding('Bijgehouden: vandaag gedragen');
}

// ── De maker ────────────────────────────────────────────────────────────────
async function haalWeer() {
  if (weerInfo) return weerInfo;
  try {
    const bewaard = JSON.parse(sessionStorage.getItem('weer') || 'null');
    if (bewaard && Date.now() - bewaard.t < 3 * 3600e3) return (weerInfo = bewaard);
  } catch (e) {}
  const pos = await new Promise((res, rej) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { timeout: 6000, maximumAge: 3600e3 })
    : rej(new Error('geen locatie')));
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.latitude.toFixed(2)}&longitude=${pos.longitude.toFixed(2)}&daily=temperature_2m_max&forecast_days=1&timezone=auto`);
  const d = await r.json();
  const temp = Math.round(d.daily.temperature_2m_max[0]);
  weerInfo = { temp, klasse: weerKlasse(temp), t: Date.now() };
  try { sessionStorage.setItem('weer', JSON.stringify(weerInfo)); } catch (e) {}
  return weerInfo;
}

// Wat staat er aan, in één regel.
function samenvatting() {
  return [keuze.sfeer.map(k => SFEREN[k].naam).join(' × '), keuze.schuif && (keuze.sjiek < 0.4 ? 'comfy' : keuze.sjiek > 0.6 ? 'sjiek' : 'midden'),
    keuze.methode && METHODEN[keuze.methode].naam, keuze.kleur, ...keuze.wensen.map(w => WENSEN[w].naam.toLowerCase())].filter(Boolean).join(' · ');
}

function maker(el, app) {
  const kast = app.kast();
  const anker = keuze.anker.map(id => app.item(id)).filter(Boolean);
  const weerNu = keuze.weer || (weerInfo ? weerInfo.klasse : null);
  el.innerHTML = `
    <p class="klein"><a href="#outfits">← Outfits</a></p>
    <h1>Wat trek ik aan?</h1>
    <p class="sub">Kies niets, of stuur bij. Alles is optioneel.</p>

    <label class="lab">Dit wil ik aan</label>
    <div class="rij">${anker.map(i => `<button class="chip aan" data-anker-weg="${esc(i.id)}" type="button">${esc(i.naam)} ×</button>`).join('')}
      <button class="chip" id="kies-anker" type="button">＋ stuk kiezen</button></div>

    <label class="lab">Weer${weerInfo ? ` · ${weerInfo.temp}° vandaag` : ''}</label>
    ${chips('weer', [['koud', 'Koud'], ['fris', 'Fris'], ['mild', 'Mild'], ['warm', 'Warm']], weerNu)}

    <details class="bijsturen"${keuze.open ? ' open' : ''}>
      <summary>Bijsturen <span>${esc(samenvatting()) || 'niets gekozen'}</span></summary>
      <label class="lab">Sfeer</label>
      ${chips('sfeer', Object.entries(SFEREN).map(([k, v]) => [k, v.naam]), keuze.sfeer, { meer: true })}
      <p class="klein">Meer dan één? Dan mengt de app ze.</p>
      <div class="schuif"><span>comfy</span><input type="range" min="0" max="1" step="0.25" value="${keuze.sjiek}" id="sjiek" aria-label="Van comfy naar sjiek"><span>sjiek</span></div>
      ${keuze.sfeer.map(k => `<p class="klein"><b>${esc(SFEREN[k].naam)}</b>: ${esc(SFEREN[k].uitleg)}</p>`).join('')}

      <label class="lab">Kleurmanier</label>
      ${chips('methode', [['', 'Laat me kiezen']].concat(MANIEREN.map(m => [m, METHODEN[m].naam])), keuze.methode || '')}

      <label class="lab">Kleur</label>
      <div class="chips" data-chips="kleur"><button type="button" class="chip${!keuze.kleur ? ' aan' : ''}" data-w="">Alle</button>
        ${KLEURKEUZE.map(k => `<button type="button" class="chip${keuze.kleur === k ? ' aan' : ''}" data-w="${esc(k)}">${stip(k, 11)}${esc(k)}</button>`).join('')}</div>

      <label class="lab">Wensen</label>
      ${chips('wensen', Object.entries(WENSEN).map(([k, v]) => [k, v.naam]), keuze.wensen, { meer: true })}
      ${samenvatting() ? '<button class="chip" id="wis" type="button" style="margin-top:8px">Alles wissen</button>' : ''}
    </details>

    <div id="voorstellen" style="margin-top:18px"></div>`;

  if (!weerInfo && !keuze.weer) haalWeer().then(() => maker(el, app)).catch(() => {});

  const kies = (naam, fn) => $$(`[data-chips="${naam}"] .chip`, el).forEach(b => b.addEventListener('click', () => { fn(b.dataset.w); keuze.seed = 0; maker(el, app); }));
  kies('weer', w => { keuze.weer = w; });
  kies('sfeer', w => { keuze.sfeer = keuze.sfeer.includes(w) ? keuze.sfeer.filter(x => x !== w) : keuze.sfeer.concat(w); });
  kies('methode', w => { keuze.methode = w || null; });
  kies('kleur', w => { keuze.kleur = w || null; });
  kies('wensen', w => { keuze.wensen = keuze.wensen.includes(w) ? keuze.wensen.filter(x => x !== w) : keuze.wensen.concat(w); });
  $('#sjiek').addEventListener('change', e => { keuze.sjiek = +e.target.value; keuze.schuif = true; keuze.seed = 0; maker(el, app); });
  $('.bijsturen').addEventListener('toggle', e => { keuze.open = e.target.open; });
  const wis = $('#wis'); if (wis) wis.addEventListener('click', () => { Object.assign(keuze, { sfeer: [], schuif: false, sjiek: 0.5, methode: null, kleur: null, wensen: [], seed: 0 }); maker(el, app); });
  $$('[data-anker-weg]', el).forEach(b => b.addEventListener('click', () => { keuze.anker = keuze.anker.filter(x => x !== b.dataset.ankerWeg); maker(el, app); }));
  $('#kies-anker').addEventListener('click', () => kiesAnker(app, kast, () => maker(el, app)));

  // Rekenen kost even; eerst de pagina tonen.
  $('#voorstellen').innerHTML = '<p class="klein">Ik zoek in je kast…</p>';
  setTimeout(() => toonVoorstellen(el, app), 30);
}

function toonVoorstellen(el, app) {
  const ctx = context(app);
  const lijst = stelVoor(app.kast(), ctx, 3);
  const plek = $('#voorstellen');
  if (!plek) return;
  if (!lijst.length) {
    plek.innerHTML = `<div class="kaart"><b>Dit lukt niet met je kast.</b><p class="klein">Met deze combinatie van keuzes vind ik geen outfit die aan je rapport voldoet. Laat een keuze los, bijvoorbeeld de kleur of een wens.</p></div>`;
    return;
  }
  plek.innerHTML = lijst.map((o, n) => `<div class="kaart" data-n="${n}">${outfitHtml(o)}
    <p class="waarom" data-waarom></p>
    <div class="rij" style="margin-top:10px">
      <button class="knop" data-a="bewaar" type="button">Bewaren</button>
      <button class="knop licht" data-a="kaart" type="button">Kaart</button>
      <button class="knop licht" data-a="ai" type="button">Waarom?</button>
      <button class="knop licht" data-a="vandaag" type="button">Vandaag aan</button>
    </div></div>`).join('')
    + `<button class="knop licht vol" id="meer" type="button">Andere voorstellen</button>`;
  $('#meer').addEventListener('click', () => { keuze.seed++; toonVoorstellen(el, app); });
  plek.querySelectorAll('[data-n]').forEach(kaart => {
    let o = lijst[+kaart.dataset.n];
    let ai = null;
    kaart.addEventListener('click', async e => {
      const st = e.target.closest('[data-slot]');
      if (st) return wissel(app, o, st.dataset.slot, nieuw => {
        o = nieuw; lijst[+kaart.dataset.n] = nieuw; ai = null;
        const knoppen = kaart.querySelector('.rij').outerHTML;
        kaart.innerHTML = outfitHtml(o) + '<p class="waarom" data-waarom></p>' + knoppen;
      });
      const a = e.target.closest('[data-a]'); if (!a) return;
      const naam = (ai && ai.naam) || standaardNaam(o);
      if (a.dataset.a === 'bewaar') {
        const id = 'o-' + Date.now().toString(36);
        app.bij(s => {
          if (!s.mappen.some(m => m.id === 'nieuw')) s.mappen.unshift({ id: 'nieuw', naam: 'Nieuw', emoji: '✨' });
          s.outfits.push({ id, naam, items: o.items.map(i => i.id), map: 'nieuw', methode: o.kleur.methode,
            datum: new Date().toISOString().slice(0, 10), waarom: ai && ai.waarom, notitie: ai && ai.tip });
        });
        o.items.forEach(i => app.onthoud(i.id, 'gekozen'));
        melding('Bewaard bij je outfits');
      }
      if (a.dataset.a === 'kaart') bewaarKaart(naam, o, ai && ai.waarom);
      if (a.dataset.a === 'vandaag') vandaag(app, o);
      if (a.dataset.a === 'ai') {
        const p = kaart.querySelector('[data-waarom]');
        p.textContent = 'De stylist kijkt…';
        try { ai = await vertelOver(o, o.kleur.naam); p.innerHTML = `<b>${esc(ai.naam)}</b> — ${esc(ai.waarom)}${ai.tip ? `<br><span class="klein">${esc(ai.tip)}</span>` : ''}`; }
        catch (err) { p.textContent = 'Dat lukte niet: ' + err.message; }
      }
    });
  });
}

function kiesAnker(app, kast, klaar) {
  const b = blad(`<h2>Wat wil je aan?</h2><input class="veld" id="az" placeholder="Zoek"><div class="raster" id="ar" style="margin-top:10px"></div>`, { opSluiten: klaar });
  const teken = z => { $('#ar', b).innerHTML = kast.filter(i => ['boven', 'onder', 'heel', 'laag', 'jas', 'schoen', 'tas'].includes(i.rol) && i.naam.toLowerCase().includes(z)).map(i => tegel(i)).join(''); };
  teken('');
  $('#az', b).addEventListener('input', e => teken(e.target.value.toLowerCase()));
  $('#ar', b).addEventListener('click', e => {
    const t = e.target.closest('[data-item]'); if (!t) return;
    if (!keuze.anker.includes(t.dataset.item)) keuze.anker.push(t.dataset.item);
    keuze.seed = 0; b.sluit();
  });
}

// ── Spiegelcheck: een foto van jou in je outfit ─────────────────────────────
function spiegel(app) {
  const b = blad(`<h2>Spiegelcheck</h2>
    <p class="sub">Een foto van jezelf in je outfit. Ik kijk naar pasvorm, kleur, laagjes en hoe je op de foto staat, en zoek verbeteringen eerst in je eigen kast.</p>
    <input type="file" accept="image/*" class="veld" id="sf"><div id="sr" style="margin-top:12px"></div>`);
  $('#sf', b).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const uit = $('#sr', b);
    uit.innerHTML = '<p class="klein">De stylist kijkt… dit duurt even.</p>';
    try {
      const beeld = await verklein(f, 1200);
      const kast = app.kast().filter(i => ['boven', 'onder', 'heel', 'laag', 'jas', 'schoen', 'tas', 'accessoire'].includes(i.rol));
      const r = await spiegelcheck(beeld, kast);
      uit.innerHTML = `<img class="groot-foto" style="max-height:32vh" src="${beeld}" alt="">
        <p class="waarom">${esc(r.werkt || '')}</p>
        ${(r.verbeter || []).map(v => `<div class="kaart"><b>${esc(v.wat)}</b><p class="klein">${esc(v.waarom || '')}</p>
          ${(v.uitKast || []).map(id => app.item(id)).filter(Boolean).length ? `<div class="raster">${(v.uitKast || []).map(id => app.item(id)).filter(Boolean).map(i => tegel(i)).join('')}</div>` : ''}
          ${v.nieuw ? `<p class="klein">Nieuw (${esc(v.nieuw.budget || '')}): ${esc(v.nieuw.wat)}</p>` : ''}</div>`).join('')}
        ${r.foto ? `<p class="klein">Foto-tip: ${esc(r.foto)}</p>` : ''}`;
      uit.addEventListener('click', ev => { const t = ev.target.closest('[data-item]'); if (t) itemDetail(app, t.dataset.item); });
    } catch (err) { uit.innerHTML = `<p class="klein">Dat lukte niet: ${esc(err.message)}</p>`; }
  });
}
