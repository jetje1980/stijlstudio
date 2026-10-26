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
let melding_ = '';
const lijst = app => app.staat().inspo || [];

// Je smaak van nu. Met `ids` (een tasbord) alleen die beelden, en sterker.
export function huidigeSmaak(app, ids = null) {
  const alle = lijst(app);
  // op een tasbord telt ook wat je nog niet checkte: je koos het zelf
  if (ids && ids.length) return smaakVan(alle.filter(x => ids.includes(x.id)), vandaag(), 1.6, true);
  return smaakVan(alle, vandaag());
}

export function inspiratie(el, app) {
  bezigTeLang(app);
  const alle = lijst(app);
  const checken = alle.filter(x => ['te checken', 'fout', 'lezen'].includes(x.status));
  const bevestigd = alle.filter(x => x.status === 'bevestigd').reverse();
  const archief = alle.filter(x => x.status === 'archief').reverse();
  const sm = huidigeSmaak(app);
  el.innerHTML = `
    <p class="sub">Screenshots die je mooi vindt. Ik lees wat erin zit, jij zegt of het klopt. Wat je bevestigt, telt mee in je voorstellen, na je rapport en de stylingtheorie.</p>
    <label class="knop vol" style="text-align:center">＋ Screenshots toevoegen<input type="file" accept="image/*" multiple id="inspo-in" hidden></label>
    <p class="klein" id="inspo-st">${esc(melding_)}</p>
    ${sm ? smaakHtml(sm) : ''}
    ${checken.filter(x => x.status === 'fout').length > 1 ? `<button class="knop licht vol" id="alles-opnieuw" type="button" style="margin-top:10px">Alle ${checken.filter(x => x.status === 'fout').length} mislukte opnieuw lezen</button>` : ''}
    ${checken.length ? `<h3>Nog even checken</h3>${checken.map(x => `<div class="kaart rij" style="flex-wrap:nowrap;align-items:center">
      <img src="${esc(foto(x.beeld, 160))}" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:8px;flex:none">
      <span class="klein" style="flex:1">${x.status === 'fout' ? 'Lezen lukte niet.' : x.status === 'lezen' ? 'Bezig met lezen…' : esc(x.analyse?.samenvatting || '')}</span>
      ${x.status === 'lezen' ? '' : `<button class="knop licht" data-check="${esc(x.id)}" type="button">${x.status === 'fout' ? 'Opnieuw' : 'Check'}</button>`}</div>`).join('')}` : ''}
    ${bevestigd.length ? `<h3>Telt mee</h3><div class="outfit-lijst">${bevestigd.map(x => kaartje(x)).join('')}</div>` : ''}
    ${archief.length ? `<details style="margin-top:14px"><summary class="klein">Archief (${archief.length}): telt niet meer mee</summary>
      <div class="outfit-lijst" style="margin-top:8px">${archief.map(x => kaartje(x)).join('')}</div></details>` : ''}`;
  // de lijst tekent opnieuw per beeld; de voortgang blijft staan
  const voortgang = { set textContent(t) { melding_ = t; const x = $('#inspo-st'); if (x) x.textContent = t; } };
  $('#inspo-in').addEventListener('change', e => voegToe(app, [...e.target.files], () => inspiratie(el, app), voortgang, {}, () => inspiratie(el, app)));
  $$('[data-check]', el).forEach(b => b.addEventListener('click', () => {
    const x = lijst(app).find(y => y.id === b.dataset.check);
    if (x.status === 'fout') return analyseer(app, x.id, $('#inspo-st')).then(() => checkBlad(app, x.id, () => inspiratie(el, app)));
    checkBlad(app, x.id, () => inspiratie(el, app));
  }));
  const ao = $('#alles-opnieuw');
  if (ao) ao.addEventListener('click', async () => {
    const fout = lijst(app).filter(x => x.status === 'fout').map(x => x.id);
    ao.disabled = true;
    for (const [n, id] of fout.entries()) {
      voortgang.textContent = `Beeld ${n + 1} van ${fout.length} lezen…`;
      app.bij(s => { s.inspo.find(z => z.id === id).status = 'lezen'; });
      await analyseer(app, id, voortgang);
      if (lijst(app).find(z => z.id === id).status === 'fout') break; // limiet of storing: niet alles laten mislukken
    }
    if (!/lukte niet/.test(melding_)) voortgang.textContent = '';
    inspiratie(el, app);
  });
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
export async function voegToe(app, files, klaar, status, extra = {}, bijElk = null) {
  if (!files.length) return;
  const ids = [];
  let mislukt = false;
  for (const [n, f] of files.entries()) {
    const id = 'i-' + Date.now().toString(36) + n;
    if (status) status.textContent = `Beeld ${n + 1} van ${files.length} uploaden…`;
    let beeld;
    try { beeld = await upload(await verklein(f, 1400), 'griette-inspo', id); }
    catch (e) { if (status) status.textContent = 'Uploaden lukte niet: ' + e.message; continue; }
    app.bij(s => { (s.inspo ||= []).push({ id, beeld, datum: vandaag(), status: 'lezen', ...extra }); });
    ids.push(id);
    if (bijElk) bijElk(id);
    if (status) status.textContent = `Beeld ${n + 1} van ${files.length} lezen… dit kan een halve minuut duren.`;
    if (!await analyseer(app, id, status)) mislukt = true;
    if (bijElk) bijElk(id);
  }
  if (status && !mislukt) status.textContent = '';
  // de beelden één voor één langs
  const volgende = () => {
    const id = ids.shift();
    if (!id) return klaar && klaar();
    const x = lijst(app).find(y => y.id === id);
    if (x && x.status === 'te checken') checkBlad(app, id, volgende); else volgende();
  };
  volgende();
}

// Een beeld dat bij het sluiten van de app nog 'lezen' was, kan opnieuw.
const bezig = new Set();
function bezigTeLang(app) {
  if (lijst(app).some(x => x.status === 'lezen' && !bezig.has(x.id)))
    app.bij(s => { for (const x of s.inspo) if (x.status === 'lezen' && !bezig.has(x.id)) x.status = 'fout'; });
}

async function analyseer(app, id, status) {
  bezig.add(id);
  const x = lijst(app).find(y => y.id === id);
  try {
    const a = await inspoAnalyse(x.beeld);
    app.bij(s => { const y = s.inspo.find(z => z.id === id); y.analyse = a; y.status = 'te checken'; });
    bezig.delete(id);
    return true;
  } catch (e) {
    app.bij(s => { s.inspo.find(z => z.id === id).status = 'fout'; });
    if (status) status.textContent = 'Lezen lukte niet: ' + e.message + ' Je beelden blijven bewaard; probeer het later opnieuw.';
  }
  bezig.delete(id);
  return false;
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
  bezigTeLang(app);
  const sel = new Set(gekozen);
  const b = blad(`<h2>Inspiratie voor deze reis</h2>
    <p class="sub">Kies de beelden met de vibe die je mee wilt. Die sturen dan deze tas, in plaats van je algemene smaak.</p>
    <label class="knop licht vol" style="text-align:center">＋ Nieuwe screenshots<input type="file" accept="image/*" multiple id="bord-in" hidden></label>
    <p class="klein" id="bord-st"></p>
    <div class="raster" id="bord-r" style="margin-top:10px"></div>
    <button class="knop vol" id="bord-ok" type="button" style="position:sticky;bottom:0;margin-top:12px"></button>`);
  const LABEL = { lezen: 'bezig met lezen…', 'te checken': 'tik om te checken', fout: 'lezen mislukt, tik voor opnieuw' };
  const teken = () => {
    const alle = lijst(app).filter(x => x.status !== 'archief').reverse();
    $('#bord-r', b).innerHTML = alle.map(x => `<button class="tegel${sel.has(x.id) ? ' gekozen' : ''}" data-b="${esc(x.id)}" type="button">
      <img src="${esc(foto(x.beeld, 300))}" alt="" loading="lazy">${LABEL[x.status] ? `<span class="label">${LABEL[x.status]}</span>` : ''}</button>`).join('')
      || '<p class="klein">Nog geen inspiratie. Voeg hierboven screenshots toe.</p>';
    $('#bord-ok', b).textContent = `Klaar${sel.size ? ` (${sel.size})` : ''}`;
  };
  teken();
  $('#bord-r', b).addEventListener('click', e => {
    const t = e.target.closest('[data-b]'); if (!t) return;
    const x = lijst(app).find(y => y.id === t.dataset.b);
    if (x.status === 'te checken') return checkBlad(app, x.id, teken);
    if (x.status === 'fout') return analyseer(app, x.id, $('#bord-st', b)).then(() => { teken(); checkBlad(app, x.id, teken); });
    if (sel.has(x.id)) sel.delete(x.id); else sel.add(x.id);
    teken();
  });
  // nieuwe beelden staan er meteen (en gekozen); lezen en checken gaat erachteraan
  $('#bord-in', b).addEventListener('change', e => {
    voegToe(app, [...e.target.files], teken, $('#bord-st', b), {}, id => { sel.add(id); teken(); });
  });
  $('#bord-ok', b).addEventListener('click', () => { b.sluit(); klaar([...sel].filter(id => lijst(app).some(x => x.id === id && x.status !== 'fout'))); });
}
