// Kast: alles wat je hebt, snel gefilterd. Per stuk: labels, hoe vaak je het
// droeg, en meteen een outfit eromheen.
import { info } from '../kleur.js';
import { esc, $, $$, tegel, stip, foto, blad, melding, datum, chips, verklein, upload } from '../ui.js';
import { formulier, koppel, leesFormulier } from '../labels.js';
import { labelsVoorFoto } from '../ai.js';
import { syncStatus } from '../opslag.js';

const ROLLEN = [['', 'Alles'], ['boven', 'Boven'], ['onder', 'Onder'], ['heel', 'Jurk & set'], ['laag', 'Laagjes'], ['jas', 'Jassen'], ['schoen', 'Schoenen'], ['tas', 'Tassen'], ['accessoire', 'Accessoires']];
const FAMILIES = ['zwart', 'wit', 'grijs', 'bruin', 'blauw', 'groen', 'geel', 'oranje', 'rood', 'roze', 'paars', 'turquoise'];
const FAM_STIP = { zwart: 'zwart', wit: 'ecru', grijs: 'lichtgrijs', bruin: 'bruin', blauw: 'donkerblauw', groen: 'groen', geel: 'geel', oranje: 'oranje', rood: 'rood', roze: 'roze', paars: 'paars', turquoise: 'turquoise' };

const filter = { rol: '', fam: '', zoek: '', nooit: false };

export default function kastTab(el, app, [sub]) {
  if (sub === 'shop') return shop(el, app);
  const kast = app.kast();
  const log = app.draaglog();
  const teCheck = kast.filter(i => !i.nagekeken).length;

  el.innerHTML = `
    <div class="tab-kop"><div><h1>Kast</h1><p class="sub">${kast.length} stuks</p></div>
      <div class="rij"><span class="sync">${esc(syncStatus)}</span><button class="knop" id="nieuw" type="button">＋ Stuk</button></div></div>
    ${teCheck ? `<div class="balk"><span><b>${teCheck}</b> stuks met labels die ik heb afgeleid. Kijk je ze na?</span><button class="knop" id="check" type="button">Nakijken</button></div>` : ''}
    <div class="zoek">
      <input class="veld" id="zoekveld" type="search" placeholder="Zoek op naam, merk of kleur" value="${esc(filter.zoek)}">
      ${chips('rol', ROLLEN, filter.rol)}
      <div class="chips" data-chips="fam">
        ${FAMILIES.map(f => `<button type="button" class="chip${filter.fam === f ? ' aan' : ''}" data-w="${f}">${stip(FAM_STIP[f], 11)}${f}</button>`).join('')}
        <button type="button" class="chip${filter.nooit ? ' aan' : ''}" data-nooit>Nooit gedragen</button>
      </div>
    </div>
    <div class="raster" id="raster"></div>
    <p class="klein" style="margin-top:18px"><a href="#kast/shop">Wat mist er in je kast? Naar de shop →</a></p>`;

  const teken = () => {
    const z = filter.zoek.toLowerCase();
    const lijst = kast.filter(i =>
      (!filter.rol || i.rol === filter.rol) &&
      (!filter.fam || i.kleur.some(k => info(k).fam === filter.fam)) &&
      (!filter.nooit || !log[i.id]) &&
      (!z || (i.naam + ' ' + i.kleur.join(' ') + ' ' + i.soort).toLowerCase().includes(z)));
    $('#raster').innerHTML = lijst.length
      ? lijst.map(i => tegel(i, log[i.id] ? '' : '')).join('')
      : `<p class="leeg-melding" style="grid-column:1/-1">Niets gevonden.</p>`;
  };
  teken();

  $('#zoekveld').addEventListener('input', e => { filter.zoek = e.target.value; teken(); });
  $$('[data-chips="rol"] .chip', el).forEach(b => b.addEventListener('click', () => { filter.rol = b.dataset.w; kastTab(el, app, []); }));
  $$('[data-chips="fam"] .chip[data-w]', el).forEach(b => b.addEventListener('click', () => { filter.fam = filter.fam === b.dataset.w ? '' : b.dataset.w; kastTab(el, app, []); }));
  $('[data-nooit]', el).addEventListener('click', () => { filter.nooit = !filter.nooit; kastTab(el, app, []); });
  $('#raster').addEventListener('click', e => { const t = e.target.closest('[data-item]'); if (t) detail(app, t.dataset.item, () => kastTab(el, app, [])); });
  $('#nieuw').addEventListener('click', () => toevoegen(app, () => kastTab(el, app, [])));
  const c = $('#check'); if (c) c.addEventListener('click', () => labelcheck(app, () => kastTab(el, app, [])));
}

// ── Eén stuk ────────────────────────────────────────────────────────────────
export function detail(app, id, klaar) {
  const i = app.item(id);
  if (!i) return;
  const log = app.draaglog()[id] || [];
  const inOutfits = app.outfits().filter(o => o.items.includes(id));
  const r = app.data.rapport;
  const k = i.kleur[0];
  const rapportZegt = [
    r.kleur.basis.includes(k) && 'Een van je basiskleuren.',
    r.kleur.accent.includes(k) && 'Accentkleur uit je rapport: laat hem de leiding nemen, de rest rustig.',
    r.kleur.gezicht.includes(k) && ['boven', 'heel'].includes(i.rol) && 'Mooi bij je gezicht: versterkt je grijsblauwe ogen.',
    /grijs|antraciet/.test(k) && ['boven', 'heel'].includes(i.rol) && 'Grijs bij je gezicht maakt je fletser: draag het in zachte stof of met een kleur erbij.',
    i.pasvorm === 'wijd' && i.rol === 'boven' && 'Wijd bovenstuk: altijd met een aansluitend of hoog onderstuk, of instoppen met riem.',
    i.pasvorm === 'wijd' && i.rol === 'onder' && 'Wijd onderstuk: combineer met iets aansluitends of korts erboven.',
    i.print && 'Print: dit is de enige in je outfit.',
  ].filter(Boolean);

  const b = blad(`
    ${i.foto ? `<img class="groot-foto" src="${esc(foto(i.foto, 900))}" alt="">` : ''}
    <h2>${esc(i.naam)}</h2>
    <dl class="labels">
      <dt>Kleur</dt><dd>${i.kleur.map(k => stip(k) + ' ' + esc(k)).join(' &nbsp; ') || '—'}</dd>
      <dt>Soort</dt><dd>${esc(i.soort)} · ${esc(i.pasvorm)}</dd>
      <dt>Stof</dt><dd>${esc(i.textuur)}${i.materiaal ? ' · ' + esc(i.materiaal) : ''}${i.print ? ' · ' + esc(i.print) : ''}</dd>
      <dt>Gedragen</dt><dd>${log.length ? `${log.length}× · laatst ${datum(log[0])}` : 'nog niet bijgehouden'}</dd>
      <dt>In outfits</dt><dd>${inOutfits.length}</dd>
    </dl>
    ${rapportZegt.length ? `<h3>Je rapport zegt</h3><ul class="tips">${rapportZegt.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="rij" style="margin-top:16px">
      <button class="knop" data-a="maak" type="button">Outfit hiermee</button>
      <button class="knop licht" data-a="vandaag" type="button">Vandaag aan</button>
    </div>
    <div class="rij" style="margin-top:8px">
      <button class="knop licht" data-a="labels" type="button">Labels aanpassen</button>
      <button class="knop licht" data-a="weg" type="button">Verwijderen</button>
    </div>`, { opSluiten: klaar });

  b.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'maak') { b.sluit(); app.ga('#outfits/maak/' + encodeURIComponent(id)); }
    if (a.dataset.a === 'vandaag') {
      const d = new Date().toISOString().slice(0, 10);
      app.bij(s => { const l = (s.gedragen[d] ||= []); if (!l.includes(id)) l.push(id); });
      melding('Bijgehouden: vandaag gedragen');
    }
    if (a.dataset.a === 'labels') { b.sluit(); bewerk(app, id, klaar); }
    if (a.dataset.a === 'weg' && confirm(`${i.naam} uit je kast halen?`)) {
      app.bij(s => { s.weg.push(id); });
      b.sluit(); melding('Verwijderd');
    }
  });
}

function bewerk(app, id, klaar) {
  const i = app.item(id);
  const b = blad(`<h2>Labels</h2>${formulier(i, app.data.kennis.kleuren)}
    <button class="knop vol" id="bewaar" type="button" style="margin-top:16px">Bewaren</button>`, { opSluiten: klaar });
  koppel(b);
  $('#bewaar', b).addEventListener('click', () => {
    const nieuw = { ...leesFormulier(b), nagekeken: true };
    app.bij(s => { s.items[id] = { ...(s.items[id] || {}), ...nieuw }; });
    b.sluit(); melding('Bewaard');
  });
}

// ── Labelcheck: één voor één, "klopt" is één tik ───────────────────────────
function labelcheck(app, klaar) {
  const lijst = app.kast().filter(i => !i.nagekeken);
  let n = 0;
  const b = blad('<div id="check-in"></div>', { opSluiten: klaar });
  const toonStuk = () => {
    const i = lijst[n];
    if (!i) { b.sluit(); melding('Alles nagekeken'); return; }
    $('#check-in', b).innerHTML = `
      <p class="klein">${n + 1} van ${lijst.length}${i.beschrijving ? ' · foto-beschrijving: ' + esc(i.beschrijving) : ''}</p>
      ${i.foto ? `<img class="groot-foto" style="max-height:34vh" src="${esc(foto(i.foto, 700))}" alt="">` : ''}
      ${formulier(i, app.data.kennis.kleuren)}
      <div class="rij" style="margin-top:16px;position:sticky;bottom:0;background:var(--bg);padding:8px 0">
        <button class="knop" data-c="ok" type="button">Klopt</button>
        <button class="knop licht" data-c="later" type="button">Later</button>
      </div>`;
    koppel(b);
    b.scrollTop = 0;
  };
  b.addEventListener('click', e => {
    const c = e.target.closest('[data-c]'); if (!c) return;
    if (c.dataset.c === 'ok') {
      const i = lijst[n], waarden = leesFormulier(b);
      app.bij(s => { s.items[i.id] = { ...(s.items[i.id] || {}), ...waarden, nagekeken: true }; });
    }
    n++; toonStuk();
  });
  toonStuk();
}

// ── Toevoegen: foto, de AI vult in, jij keurt ─────────────────────────────
function toevoegen(app, klaar) {
  const b = blad(`<h2>Nieuw stuk</h2>
    <p class="sub">Maak een foto of kies er een. Ik vul de labels in, jij kijkt ze na.</p>
    <input type="file" accept="image/*" id="fotokeuze" class="veld">
    <p class="klein" id="status"></p><div id="form-plek"></div>`, { opSluiten: klaar });
  const id = 'nieuw-' + Date.now().toString(36);
  let url = null;
  $('#fotokeuze', b).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const st = $('#status', b);
    let voorstel = { naam: '', soort: 'top', kleur: ['zwart'], textuur: 'glad', pasvorm: 'recht', warmte: 2, formeel: 3, comfort: 3, seizoen: 'altijd' };
    try {
      st.textContent = 'Foto uploaden…';
      url = await upload(await verklein(f), 'griette-wardrobe', id);
      st.textContent = 'Ik kijk wat het is…';
      try { voorstel = { ...voorstel, ...(await labelsVoorFoto(url)) }; st.textContent = 'Kijk na en bewaar.'; }
      catch (err) { st.textContent = 'De labels moet je zelf invullen: ' + err.message; }
    } catch (err) { st.textContent = 'Uploaden lukte niet: ' + err.message; return; }
    $('#form-plek', b).innerHTML = `<img class="groot-foto" style="max-height:30vh" src="${esc(foto(url, 600))}" alt="">${formulier(voorstel, app.data.kennis.kleuren)}
      <button class="knop vol" id="bewaar" type="button" style="margin-top:16px">In mijn kast</button>`;
    koppel(b);
    $('#bewaar', b).addEventListener('click', () => {
      const item = { id, ...leesFormulier(b), foto: url, nagekeken: true };
      if (!item.naam) { melding('Geef het een naam'); return; }
      app.bij(s => { s.nieuw.push(item); });
      b.sluit(); melding('Toegevoegd aan je kast');
    });
  });
}

// ── Shop: wat mist er echt? ────────────────────────────────────────────────
const WINKELS = [
  ['Zara', q => `https://www.zara.com/nl/nl/search?searchTerm=${q}&section=WOMAN`],
  ['Sézane', q => `https://www.sezane.com/nl/result?words=${q}`],
  ['Mango', q => `https://www.mango.com/nl/zoekresultaten?q=${q}`],
  ['H&M', q => `https://www2.hm.com/nl_nl/search-results.html?q=${q}`],
  ['Massimo Dutti', q => `https://www.massimodutti.com/nl/?q=${q}`],
  ['& Other Stories', q => `https://www.stories.com/nl/search?q=${q}`],
  ['Zalando', q => `https://www.zalando.nl/catalogus/?q=${q}&gender=female`],
];
export const winkelLinks = term => WINKELS.map(([n, f]) => `<a class="chip" target="_blank" rel="noopener" href="${esc(f(encodeURIComponent(term)))}">${n}</a>`).join('');

function shop(el, app) {
  const kast = app.kast();
  const log = app.draaglog();
  // Uit Robins rapport-outfits: stukken die je kast nog niet heeft
  const mist = new Map();
  for (const o of app.data.rapportOutfits) for (const s of o.stukken) if (!s.id) {
    const m = mist.get(s.naam) || { naam: s.naam, outfits: [] };
    m.outfits.push(o.naam); mist.set(s.naam, m);
  }
  const lijst = [...mist.values()].sort((a, b) => b.outfits.length - a.outfits.length);
  const nooit = kast.filter(i => ['boven', 'onder', 'heel', 'laag'].includes(i.rol) && !log[i.id]).length;
  const gekocht = (app.data.kennis.gekocht || []).concat(app.staat().gekocht || []);
  el.innerHTML = `
    <p class="klein"><a href="#kast">← Kast</a></p>
    <h1>Shop</h1>
    <p class="sub">Eerst kijken wat je hebt, dan pas wat je mist.</p>
    <div class="balk"><span>${nooit} kledingstukken heb je in deze app nog nooit als gedragen bijgehouden.</span><a class="knop licht" href="#kast">Bekijk</a></div>
    <h3>Uit je rapport, nog niet in je kast</h3>
    ${lijst.map(m => `<div class="kaart"><b>${esc(m.naam)}</b><p class="klein">Komt terug in: ${esc(m.outfits.slice(0, 3).join(', '))}${m.outfits.length > 3 ? ' +' + (m.outfits.length - 3) : ''}</p>
      <div class="chips">${winkelLinks(m.naam)}</div></div>`).join('')}
    <h3>Zelf zoeken</h3>
    <input class="veld" id="zoekterm" placeholder="bijv. camel trenchcoat"><div class="chips" id="zelf" style="margin-top:8px"></div>
    ${gekocht.length ? `<h3>Gekocht</h3><ul class="tips">${gekocht.map(g => `<li>${esc(g.naam)} <span class="klein">${esc(g.datum || '')}</span></li>`).join('')}</ul>` : ''}`;
  $('#zoekterm').addEventListener('input', e => { $('#zelf').innerHTML = e.target.value.trim() ? winkelLinks(e.target.value.trim()) : ''; });
}
