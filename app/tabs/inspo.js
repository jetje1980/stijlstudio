// Inspiratie: screenshots die jij mooi vindt. De AI leest elk beeld één keer,
// jij bevestigt wat klopt, en alleen dat telt mee in je smaak van nu.
// Rangorde blijft: rapport > stylingtheorie > jouw inspiratie.
import { smaakVan, naMaken, SFEREN } from '../engine.js';
import { METHODEN } from '../kleur.js';
import { inspoAnalyse } from '../ai.js';
import { SOORT_ROL } from '../labels.js';
import { esc, $, $$, stip, foto, blad, melding, verklein, upload } from '../ui.js';
import { outfitHtml } from './outfits.js';

const vandaag = () => new Date().toISOString().slice(0, 10);
const lijst = app => app.staat().inspo || [];

// Je smaak van nu. Met `ids` (een tasbord) alleen die beelden, en sterker.
export function huidigeSmaak(app, ids = null) {
  const alle = lijst(app);
  if (ids && ids.length) return smaakVan(alle.filter(x => ids.includes(x.id)), vandaag(), 1.6);
  return smaakVan(alle, vandaag());
}

export function inspiratie(el, app) {
  const alle = lijst(app);
  const checken = alle.filter(x => x.status === 'te checken' || x.status === 'fout');
  const bevestigd = alle.filter(x => x.status === 'bevestigd').reverse();
  const archief = alle.filter(x => x.status === 'archief').reverse();
  const sm = huidigeSmaak(app);
  el.innerHTML = `
    <p class="sub">Screenshots die je mooi vindt. Ik lees wat erin zit, jij zegt of het klopt. Wat je bevestigt, telt mee in je voorstellen, na je rapport en de stylingtheorie.</p>
    <label class="knop vol" style="text-align:center">＋ Screenshots toevoegen<input type="file" accept="image/*" multiple id="inspo-in" hidden></label>
    <p class="klein" id="inspo-st"></p>
    ${sm ? smaakHtml(sm) : ''}
    ${checken.length ? `<h3>Nog even checken</h3>${checken.map(x => `<div class="kaart rij" style="flex-wrap:nowrap;align-items:center">
      <img src="${esc(foto(x.beeld, 160))}" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:8px;flex:none">
      <span class="klein" style="flex:1">${x.status === 'fout' ? 'Lezen lukte niet.' : esc(x.analyse?.samenvatting || '')}</span>
      <button class="knop licht" data-check="${esc(x.id)}" type="button">${x.status === 'fout' ? 'Opnieuw' : 'Check'}</button></div>`).join('')}` : ''}
    ${bevestigd.length ? `<h3>Telt mee</h3><div class="outfit-lijst">${bevestigd.map(x => kaartje(x)).join('')}</div>` : ''}
    ${archief.length ? `<details style="margin-top:14px"><summary class="klein">Archief (${archief.length}): telt niet meer mee</summary>
      <div class="outfit-lijst" style="margin-top:8px">${archief.map(x => kaartje(x)).join('')}</div></details>` : ''}`;
  $('#inspo-in').addEventListener('change', e => voegToe(app, [...e.target.files], () => inspiratie(el, app), $('#inspo-st')));
  $$('[data-check]', el).forEach(b => b.addEventListener('click', () => {
    const x = lijst(app).find(y => y.id === b.dataset.check);
    if (x.status === 'fout') return analyseer(app, x.id, $('#inspo-st')).then(() => checkBlad(app, x.id, () => inspiratie(el, app)));
    checkBlad(app, x.id, () => inspiratie(el, app));
  }));
  $$('[data-na]', el).forEach(b => b.addEventListener('click', () => naMakenBlad(app, b.dataset.na)));
  $$('[data-arch]', el).forEach(b => b.addEventListener('click', () => {
    app.bij(s => { const x = s.inspo.find(y => y.id === b.dataset.arch); x.status = x.status === 'archief' ? 'bevestigd' : 'archief'; });
    inspiratie(el, app);
  }));
  $$('[data-weg]', el).forEach(b => b.addEventListener('click', () => {
    if (!confirm('Dit beeld verwijderen?')) return;
    app.bij(s => { s.inspo = s.inspo.filter(y => y.id !== b.dataset.weg); });
    inspiratie(el, app);
  }));
}

const kaartje = x => `<div class="outfit-tegel"><img src="${esc(foto(x.beeld, 400))}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px">
  <span class="klein">${esc(x.analyse?.samenvatting || '')}</span>
  <div class="rij" style="margin-top:6px"><button class="chip" data-na="${esc(x.id)}" type="button">Maak na</button>
  <button class="chip" data-arch="${esc(x.id)}" type="button">${x.status === 'archief' ? 'Terug' : 'Archief'}</button>
  <button class="chip" data-weg="${esc(x.id)}" type="button" aria-label="Verwijderen">×</button></div></div>`;

// Wat de app nu als jouw smaak ziet: de sterkste dingen per soort.
function smaakHtml(sm) {
  const top = (veld, n, label = k => k) => Object.entries(sm[veld]).filter(([, w]) => w >= 0.25).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => label(k));
  const regels = [
    ['Stukken', top('soort', 5)], ['Snit', top('snit', 3)], ['Prints', top('print', 3)],
    ['Kleurfamilies', top('fam', 4)], ['Kleurmanier', top('methode', 2, k => (METHODEN[k] || {}).naam || k)],
    ['Sfeer', top('sfeer', 3, k => (SFEREN[k] || {}).naam || k)],
  ].filter(([, v]) => v.length);
  return `<div class="kaart" style="margin-top:12px"><span class="bron">jouw smaak nu</span>
    <p class="klein" style="margin:6px 0">Uit ${sm.n} bevestigde beeld${sm.n > 1 ? 'en' : ''}; recente tellen zwaarder.</p>
    ${regels.map(([t, v]) => `<p class="klein" style="margin:2px 0"><b>${t}:</b> ${v.map(esc).join(', ')}</p>`).join('')}
    ${sm.contrast >= 0.25 ? '<p class="klein" style="margin:2px 0"><b>Stoer × lief</b> komt vaak terug.</p>' : ''}</div>`;
}

// Eén of meer screenshots: uploaden, laten lezen, en dan één voor één checken.
export async function voegToe(app, files, klaar, status, extra = {}) {
  if (!files.length) return;
  const ids = [];
  for (const [n, f] of files.entries()) {
    const id = 'i-' + Date.now().toString(36) + n;
    if (status) status.textContent = `Beeld ${n + 1} van ${files.length} uploaden…`;
    let beeld;
    try { beeld = await upload(await verklein(f, 1400), 'griette-inspo', id); }
    catch (e) { if (status) status.textContent = 'Uploaden lukte niet: ' + e.message; continue; }
    app.bij(s => { (s.inspo ||= []).push({ id, beeld, datum: vandaag(), status: 'te checken', ...extra }); });
    ids.push(id);
    if (status) status.textContent = `Beeld ${n + 1} van ${files.length} lezen…`;
    await analyseer(app, id, status);
  }
  if (status) status.textContent = '';
  // de beelden één voor één langs
  const volgende = () => {
    const id = ids.shift();
    if (!id) return klaar && klaar();
    const x = lijst(app).find(y => y.id === id);
    if (x && x.status === 'te checken') checkBlad(app, id, volgende); else volgende();
  };
  volgende();
}

async function analyseer(app, id, status) {
  const x = lijst(app).find(y => y.id === id);
  try {
    const a = await inspoAnalyse(x.beeld);
    app.bij(s => { const y = s.inspo.find(z => z.id === id); y.analyse = a; y.status = 'te checken'; });
  } catch (e) {
    app.bij(s => { s.inspo.find(z => z.id === id).status = 'fout'; });
    if (status) status.textContent = 'Lezen lukte niet: ' + e.message + ' Je kunt het later opnieuw proberen.';
  }
}

// "Klopt het dat je dit bedoelt?" Per punt aan of uit; alleen wat aan staat telt.
function checkBlad(app, id, klaar) {
  const x = lijst(app).find(y => y.id === id);
  const a = x.analyse;
  if (!a) return klaar && klaar();
  const stukAan = a.stukken.map(() => true), ideeAan = a.ideeen.map(() => true);
  let sferen = a.sferen.filter(k => SFEREN[k]), methode = METHODEN[a.methode] ? a.methode : null, stoerLief = a.stoerLief || null, printMix = !!a.printMix;
  const omschrijf = s => [s.wat || s.soort, s.snit, s.print && `${s.print}${s.printGroot ? ' (' + s.printGroot + ')' : ''}`].filter(Boolean).join(' · ');
  const b = blad(`<h2>Klopt dit?</h2>
    <img src="${esc(foto(x.beeld, 600))}" alt="" style="width:100%;max-height:300px;object-fit:contain;border-radius:10px">
    <p class="waarom">${esc(a.samenvatting || '')}</p>
    <p class="klein">Tik weg wat niet klopt of wat je niet bedoelt.</p>
    <label class="lab">Ik zie</label>
    <div class="chips wrap" id="ck-st">${a.stukken.map((s, n) => `<button class="chip aan" data-n="${n}" type="button">${stip((s.kleur || [])[0] || 'multi', 11)}${esc(omschrijf(s))}</button>`).join('')}</div>
    <label class="lab">Sfeer</label>
    <div class="chips wrap" id="ck-sf">${Object.entries(SFEREN).map(([k, v]) => `<button class="chip${sferen.includes(k) ? ' aan' : ''}" data-w="${k}" type="button">${esc(v.naam)}</button>`).join('')}</div>
    <label class="lab">Kleurmanier</label>
    <div class="chips wrap" id="ck-m">${['mono', 'tonsurton', 'accent', 'analoog', 'split', 'colorblock', 'neutraal'].map(k => `<button class="chip${methode === k ? ' aan' : ''}" data-w="${k}" type="button">${esc(METHODEN[k].naam)}</button>`).join('')}</div>
    <label class="lab">Stoer × lief</label>
    <div class="chips wrap" id="ck-sl">${[['stoer', 'Stoer'], ['lief', 'Lief'], ['contrast', 'Stoer met lief']].map(([k, l]) => `<button class="chip${stoerLief === k ? ' aan' : ''}" data-w="${k}" type="button">${l}</button>`).join('')}</div>
    <div class="chips"><button class="chip${printMix ? ' aan' : ''}" id="ck-pm" type="button">Print op print</button></div>
    ${a.ideeen.length ? `<label class="lab">Wat ik eruit haal</label><div class="chips wrap" id="ck-id">${a.ideeen.map((t, n) => `<button class="chip aan" data-n="${n}" type="button">${esc(t)}</button>`).join('')}</div>` : ''}
    <label class="lab">Wat spreekt je aan? (mag leeg)</label><textarea class="veld" id="ck-not" rows="2" placeholder="bijv. die zijstreep met een stoere jas">${esc(x.notitie || '')}</textarea>
    <button class="knop vol" id="ck-ok" type="button" style="margin-top:14px">Klopt, laat het meetellen</button>
    <button class="knop licht vol" id="ck-arch" type="button" style="margin-top:8px">Alleen bewaren, niet meetellen</button>`, { opSluiten: () => klaar && klaar() });
  $$('#ck-st .chip', b).forEach(c => c.addEventListener('click', () => { stukAan[+c.dataset.n] = !stukAan[+c.dataset.n]; c.classList.toggle('aan'); }));
  $$('#ck-id .chip', b).forEach(c => c.addEventListener('click', () => { ideeAan[+c.dataset.n] = !ideeAan[+c.dataset.n]; c.classList.toggle('aan'); }));
  $$('#ck-sf .chip', b).forEach(c => c.addEventListener('click', () => {
    const w = c.dataset.w; sferen = sferen.includes(w) ? sferen.filter(k => k !== w) : sferen.concat(w); c.classList.toggle('aan');
  }));
  const een = (sel, zet) => $$(sel + ' .chip', b).forEach(c => c.addEventListener('click', () => {
    const aan = !c.classList.contains('aan');
    $$(sel + ' .chip', b).forEach(d => d.classList.remove('aan'));
    if (aan) c.classList.add('aan');
    zet(aan ? c.dataset.w : null);
  }));
  een('#ck-m', w => { methode = w; });
  een('#ck-sl', w => { stoerLief = w; });
  $('#ck-pm', b).addEventListener('click', e => { printMix = !printMix; e.target.classList.toggle('aan'); });
  const bewaar = status => {
    app.bij(s => {
      const y = s.inspo.find(z => z.id === id);
      y.status = status;
      y.notitie = $('#ck-not', b).value.trim();
      y.analyse = { ...a, stukken: a.stukken.filter((_, n) => stukAan[n]).map(st => ({ ...st, rol: SOORT_ROL[st.soort] || 'accessoire' })),
        ideeen: a.ideeen.filter((_, n) => ideeAan[n]), sferen, methode, stoerLief, printMix };
    });
    b.sluit();
  };
  $('#ck-ok', b).addEventListener('click', () => { bewaar('bevestigd'); melding('Telt mee in je smaak'); });
  $('#ck-arch', b).addEventListener('click', () => bewaar('archief'));
}

// "Maak dit na": de beste versie uit je eigen kast, en wat er mist.
export function naMakenBlad(app, id, weer) {
  const x = lijst(app).find(y => y.id === id);
  const r = naMaken(app.kast(), x.analyse, { rapport: app.data.rapport, weer: weer || 'mild', geheugen: app.staat().geheugen });
  blad(`<h2>Uit jouw kast</h2>
    <div class="rij" style="flex-wrap:nowrap;align-items:flex-start"><img src="${esc(foto(x.beeld, 200))}" alt="" style="width:80px;border-radius:8px;flex:none">
      <p class="klein" style="margin:0">${esc(x.analyse.samenvatting || '')}</p></div>
    <ul class="tips">${r.gevonden.map(g => `<li>${esc(g.stuk.wat || g.stuk.soort)}: ${g.item ? `<b>${esc(g.item.naam)}</b>` : `mist${g.bijna ? `, het dichtst bij is ${esc(g.bijna.naam)}` : ''}`}</li>`).join('')}</ul>
    ${r.outfits.length ? r.outfits.map(o => `<div class="kaart">${outfitHtml(o)}</div>`).join('') : '<p class="klein">Hier lukt geen outfit mee die binnen je rapport blijft.</p>'}
    ${(x.analyse.ideeen || []).length ? `<h3>Om mee te nemen</h3><ul class="tips">${x.analyse.ideeen.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`);
}

// Een inspiratiebord voor één tas: kiezen uit wat je hebt, of nieuwe erbij.
export function kiesBord(app, gekozen, klaar) {
  const sel = new Set(gekozen);
  const b = blad(`<h2>Inspiratie voor deze reis</h2>
    <p class="sub">Kies de beelden met de vibe die je mee wilt. Die sturen dan deze tas, in plaats van je algemene smaak.</p>
    <label class="knop licht vol" style="text-align:center">＋ Nieuwe screenshots<input type="file" accept="image/*" multiple id="bord-in" hidden></label>
    <p class="klein" id="bord-st"></p>
    <div class="raster" id="bord-r" style="margin-top:10px"></div>
    <button class="knop vol" id="bord-ok" type="button" style="position:sticky;bottom:0;margin-top:12px"></button>`);
  const teken = () => {
    const alle = lijst(app).filter(x => x.status === 'bevestigd').reverse();
    $('#bord-r', b).innerHTML = alle.map(x => `<button class="tegel${sel.has(x.id) ? ' gekozen' : ''}" data-b="${esc(x.id)}" type="button"><img src="${esc(foto(x.beeld, 300))}" alt="" loading="lazy"></button>`).join('')
      || '<p class="klein">Nog geen bevestigde inspiratie. Voeg hierboven screenshots toe.</p>';
    $('#bord-ok', b).textContent = `Klaar${sel.size ? ` (${sel.size})` : ''}`;
  };
  teken();
  $('#bord-r', b).addEventListener('click', e => {
    const t = e.target.closest('[data-b]'); if (!t) return;
    if (sel.has(t.dataset.b)) sel.delete(t.dataset.b); else sel.add(t.dataset.b);
    teken();
  });
  $('#bord-in', b).addEventListener('change', e => {
    const voor = new Set(lijst(app).map(x => x.id));
    voegToe(app, [...e.target.files], () => {
      for (const x of lijst(app)) if (!voor.has(x.id) && x.status === 'bevestigd') sel.add(x.id);
      teken();
    }, $('#bord-st', b));
  });
  $('#bord-ok', b).addEventListener('click', () => { b.sluit(); klaar([...sel].filter(id => lijst(app).some(x => x.id === id))); });
}
