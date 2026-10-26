// Stijl: alles om na te slaan. Je rapport is leidend, de theorie werkt binnen
// je rapport, en tips en trends van buiten staan er met een label bij.
import { METHODEN } from '../kleur.js';
import { esc, $, $$, stip, foto, blad, melding, chips, verklein, upload, tegel } from '../ui.js';
import { zetKeuze } from './outfits.js';
import { inspiratie } from './inspo.js';
import { detail as itemDetail } from './kast.js';
import { exporteer, wachtwoord, zetWachtwoord, probeerSync, syncStatus } from '../opslag.js';

let deel = 'rapport';
const DELEN = [['rapport', 'Rapport'], ['kleur', 'Kleur'], ['inspiratie', 'Inspiratie'], ['kennis', 'Kennis'], ['smaak', 'Jouw smaak']];

export default function stijlTab(el, app) {
  el.innerHTML = `<h1>Stijl</h1><p class="sub">Je rapport is leidend. De rest werkt daarbinnen.</p>
    ${chips('deel', DELEN, deel)}<div id="deel"></div>`;
  $$('[data-chips="deel"] .chip', el).forEach(b => b.addEventListener('click', () => { deel = b.dataset.w; stijlTab(el, app); }));
  ({ rapport, kleur, inspiratie, kennis, smaak })[deel]($('#deel'), app);
}

const palet = lijst => `<div class="palet">${lijst.map(k => `<span>${stip(k, 18)}${esc(k)}</span>`).join('')}</div>`;

function rapport(el, app) {
  const r = app.data.rapport;
  el.innerHTML = `
    <div class="kaart"><span class="bron rapport">rapport</span><p class="waarom">${esc(r.kern)}</p><p class="klein">${esc(r.ogen)}</p></div>
    <h3>Basis</h3>${palet(r.kleur.basis)}
    <h3>Accent</h3>${palet(r.kleur.accent)}
    <h3>Rustige steunkleuren</h3>${palet(r.kleur.rustig)}
    <h3>Combinaties uit je rapport</h3>
    <div class="methode-voorbeelden">${r.kleur.combinaties.map(c => `<span>${c.map(k => stip(k, 22)).join('')}</span>`).join('')}</div>
    ${r.kleur.uitgelicht.map(u => `<p class="klein">${u.kleuren.map(k => stip(k, 11)).join(' ')} ${esc(u.tekst)}</p>`).join('')}
    <h2>Regels</h2>
    ${r.regels.map(x => `<div class="kaart"><b>${esc(x.titel)}</b><p class="klein" style="margin:4px 0 0">${esc(x.tekst)}</p></div>`).join('')}
    ${r.secties.map(s => `<h3>${esc(s.titel)}</h3>${s.intro ? `<p>${esc(s.intro)}</p>` : ''}<ul class="tips">${s.punten.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`).join('')}
    ${basisHtml(app)}
    <div class="kaart" style="margin-top:16px"><b>Oefentip</b><p class="waarom">${esc(r.oefentip)}</p>
      <a class="knop licht" href="#outfits/maak">Kies een gekleurd stuk →</a></div>
    <p class="klein">${esc(r.zwijgt)}</p>
    <h2>Outfits van Robin</h2>
    <p class="sub">Uit je rapport. Wat in je kast zit, kun je aantikken.</p>
    ${app.data.rapportOutfits.map(o => `<div class="kaart"><div class="moment-kop"><b>${o.nr}. ${esc(o.naam)}</b>
      <span>${o.kleuren.map(k => stip(k, 13)).join('')}</span></div>
      <ul class="tips">${o.stukken.map(s => `<li>${s.id ? `<a href="#" data-item="${esc(s.id)}">${esc(s.naam)}</a> · in je kast` : esc(s.naam)}</li>`).join('')}</ul></div>`).join('')}`;
  el.addEventListener('click', e => {
    const p = e.target.closest('[data-probeer-stuk]');
    if (p) { zetKeuze({ anker: [p.dataset.probeerStuk] }); location.hash = '#outfits/maak'; return; }
    const t = e.target.closest('[data-item]'); if (t) { e.preventDefault(); itemDetail(app, t.dataset.item); }
  });
}

// Robins basisgarderobe: haar voorbeeldfoto, wat je ervan hebt, en "probeer".
function basisHtml(app) {
  const r = app.data.rapport;
  if (!(r.basis || []).length) return '';
  return `<h2>Jouw basisgarderobe</h2><p class="sub">${esc(r.basisIntro || '')}</p>
    ${r.basis.map(g => `<h3>${esc(g.groep)}</h3><div class="outfit-lijst">${g.items.map(b => {
      const heb = (b.kast || []).map(id => app.item(id)).filter(Boolean);
      return `<div class="outfit-tegel"><img src="rapport/${esc(b.foto)}.jpg" alt="" loading="lazy" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px">
        <b>${esc(b.naam)}</b>${b.merk ? `<span class="klein">${esc(b.merk)}</span>` : ''}
        ${b.tip ? `<p class="klein" style="margin:4px 0">${esc(b.tip)}</p>` : ''}
        ${heb.length ? `<p class="klein" style="margin:4px 0">In je kast: ${heb.map(i => `<a href="#" data-item="${esc(i.id)}">${esc(i.naam)}</a>`).join(', ')}</p>
          <button class="chip" data-probeer-stuk="${esc(heb[0].id)}" type="button">Outfits hiermee</button>`
        : '<p class="klein" style="margin:4px 0">Nog niet in je kast (zie Shop)</p>'}</div>`;
    }).join('')}</div>`).join('')}`;
}

function kleur(el, app) {
  const r = app.data.rapport, k = app.data.kennis;
  el.innerHTML = `
    <p class="sub">Zes manieren om kleur te combineren. Tik op "Probeer" en je ziet het met je eigen kast.</p>
    ${r.methoden.map(m => `<div class="kaart">
      <div class="moment-kop"><h4>${esc(m.naam)}</h4><span class="bron${/beste|aanbevolen|kern/.test(m.rapport) ? ' rapport' : ''}">${esc(m.rapport)}</span></div>
      <p class="klein" style="margin:4px 0">${esc(m.uitleg)}</p>
      <div class="methode-voorbeelden">${m.voorbeelden.map(v => `<span>${v.map(x => stip(x, 22)).join('')}</span>`).join('')}</div>
      <button class="knop licht" data-probeer="${esc(METHODE_ID[m.id])}" type="button" style="margin-top:10px">Probeer met mijn kast</button></div>`).join('')}
    ${k.kleurbronnen.length ? `<h2>Kleurbronnen</h2><p class="sub">Schema's die je eerder bewaarde: welke kleuren samen kunnen.</p>
      ${k.kleurbronnen.map(b => `<div class="kaart"><b>${esc(b.naam)}</b> <span class="bron">bron</span>
        ${Object.entries(b.paren).map(([hoofd, met]) => `<p class="klein" style="margin:6px 0 0">${stip(hoofd, 14)} <b>${esc(hoofd)}</b> met ${met.map(x => stip(x, 11) + ' ' + esc(x)).join(', ')}</p>`).join('')}
        ${Object.values(b.notities || {}).map(n => `<p class="klein">${esc(n)}</p>`).join('')}</div>`).join('')}` : ''}
    ${k.eigenKleuren.length ? `<h3>Jouw extra kleuren</h3><p class="klein">Buiten je rapport, door jou toegevoegd. De app behandelt ze als accent.</p>${palet(k.eigenKleuren)}` : ''}`;
  $$('[data-probeer]', el).forEach(b => b.addEventListener('click', () => { zetKeuze({ methode: b.dataset.probeer }); location.hash = '#outfits/maak'; }));
}
const METHODE_ID = { split: 'split', tonsurton: 'tonsurton', analoog: 'analoog', accent: 'accent', mono: 'mono', colorblock: 'colorblock' };

function kennis(el, app) {
  const eigen = app.staat().kennis || [];
  const SOORTEN = { tip: 'algemene tip', trend: 'trend', kleur: 'kleurschema', inspiratie: 'inspiratie' };
  el.innerHTML = `
    <div class="kaart"><b>Rangorde</b><ol class="klein" style="margin:6px 0 0;padding-left:18px">
      <li>Je stijlrapport is leidend.</li><li>Stylingtheorie werkt binnen je rapport.</li><li>Tips en trends van buiten: alleen als aanvulling, met een label.</li></ol></div>
    <button class="knop vol" id="nieuw" type="button">＋ Screenshot of notitie</button>
    ${eigen.slice().reverse().map(n => `<div class="kaart">
      <div class="moment-kop"><b>${esc(n.titel)}</b><span class="bron">${esc(SOORTEN[n.soort] || n.soort)}</span></div>
      ${n.beeld ? `<img src="${esc(foto(n.beeld, 700))}" alt="" style="border-radius:10px;margin:8px 0">` : ''}
      ${n.notitie ? `<p class="klein" style="white-space:pre-wrap">${esc(n.notitie)}</p>` : ''}
      <button class="chip" data-weg="${esc(n.id)}" type="button">Verwijderen</button></div>`).join('')}
    <h3>Trends dit seizoen</h3>
    <div class="kaart"><span class="bron">trend</span><p class="klein" style="white-space:pre-wrap;margin:6px 0 0">${esc(app.data.kennis.trends)}</p></div>
    <h3>Beheer</h3>
    <div class="kaart"><b>Synchroniseren</b>
      <p class="klein" style="margin:4px 0 8px">Status: ${esc(syncStatus)}. Met het wachtwoord van je afgeschermde opslag zien telefoon en laptop hetzelfde. Zonder wachtwoord blijft alles op dit toestel.</p>
      <div class="rij"><input class="veld" type="password" id="ww" placeholder="wachtwoord" value="${wachtwoord() ? '••••••••' : ''}" style="flex:1" autocomplete="current-password">
        <button class="knop" id="ww-ok" type="button">Koppel</button></div><p class="klein" id="ww-st"></p></div>
    <div class="rij"><button class="knop licht" id="backup" type="button">Backup bewaren</button></div>`;
  $('#nieuw').addEventListener('click', () => nieuweKennis(app, () => kennis(el, app)));
  $$('[data-weg]', el).forEach(b => b.addEventListener('click', () => {
    if (confirm('Verwijderen?')) { app.bij(s => { s.kennis = s.kennis.filter(n => n.id !== b.dataset.weg); }); kennis(el, app); }
  }));
  $('#ww-ok').addEventListener('click', async () => {
    const w = $('#ww').value;
    if (w && !/^•+$/.test(w)) zetWachtwoord(w);
    const st = $('#ww-st');
    st.textContent = 'Koppelen…';
    try { st.textContent = 'Gelukt: ' + await probeerSync(); }
    catch (e) { st.textContent = 'Lukt niet: ' + e.message; }
  });
  $('#backup').addEventListener('click', async () => {
    const f = exporteer();
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
  });
}

function nieuweKennis(app, klaar) {
  const b = blad(`<h2>Toevoegen aan je kennis</h2>
    <label class="lab">Screenshot (mag leeg)</label><input type="file" accept="image/*" class="veld" id="kb">
    <label class="lab">Titel</label><input class="veld" id="kt" placeholder="bijv. Perfect your outfit">
    <label class="lab">Wat is het</label>
    ${chips('ks', [['tip', 'Algemene tip'], ['trend', 'Trend'], ['kleur', 'Kleurschema'], ['inspiratie', 'Inspiratie']], 'tip')}
    <label class="lab">Notitie</label><textarea class="veld" id="kn" rows="4" placeholder="Wat neem je hieruit mee?"></textarea>
    <button class="knop vol" id="kbew" type="button" style="margin-top:14px">Bewaren</button><p class="klein" id="kst"></p>`, { opSluiten: klaar });
  let soort = 'tip';
  $$('[data-chips="ks"] .chip', b).forEach(c => c.addEventListener('click', () => {
    soort = c.dataset.w; $$('[data-chips="ks"] .chip', b).forEach(x => x.classList.toggle('aan', x === c));
  }));
  $('#kbew', b).addEventListener('click', async () => {
    const titel = $('#kt', b).value.trim();
    if (!titel) { melding('Geef het een titel'); return; }
    const id = 'k-' + Date.now().toString(36);
    let beeld = null;
    const f = $('#kb', b).files[0];
    if (f) {
      $('#kst', b).textContent = 'Uploaden…';
      try { beeld = await upload(await verklein(f, 1400), 'griette-kennis', id); }
      catch (e) { $('#kst', b).textContent = 'Uploaden lukte niet: ' + e.message; return; }
    }
    app.bij(s => { s.kennis.push({ id, titel, soort, notitie: $('#kn', b).value.trim(), beeld, datum: new Date().toISOString().slice(0, 10) }); });
    b.sluit(); melding('Bewaard');
  });
}

function smaak(el, app) {
  const s = app.data.kennis.smaak || {};
  const plaat = app.data.kennis.inspiratieplaat || [];
  el.innerHTML = `
    <p class="sub">Wat steeds terugkomt in de looks die jij mooi vindt. Waar het botst met je rapport, staat dat erbij.</p>
    ${plaat.length ? `<div class="inspo">${plaat.map(p => `<img src="${esc(/^http/.test(p.bestand) ? foto(p.bestand, 400) : p.bestand)}" alt="" loading="lazy">`).join('')}</div>` : ''}
    ${s.kern ? `<div class="kaart" style="margin-top:12px"><span class="bron">jouw smaak</span><p class="waarom">${esc(s.kern)}</p></div>` : ''}
    ${['silhouet', 'kleuren', 'texturen', 'accessoires'].filter(k => s[k]).map(k => `<h3>${k}</h3><p>${esc(s[k])}</p>`).join('')}
    ${(s.terugkerend || []).length ? `<h3>Komt steeds terug</h3><ul class="tips">${s.terugkerend.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${s.spanning ? `<div class="kaart"><b>Waar het botst met je rapport</b><p class="klein" style="margin:4px 0 0">${esc(s.spanning)}</p></div>` : ''}
    ${(s.regels || []).length ? `<h3>Zo combineer je allebei</h3><ul class="tips">${s.regels.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
}
