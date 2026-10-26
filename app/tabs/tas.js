// De tas. Jij zegt alleen waar je heen gaat en wat je doet; de app rekent de
// koffer uit die de meeste goede outfits geeft, met verschillende kleurmanieren
// erin. Daarna stuur je bij: meer van een manier, of een stuk wisselen.
import { pakTas, uitSelectie, compact, meerVan, maakOutfit, extraOutfits, uitJeTas, slotVan, SFEREN, WENSEN, ACTIVITEITEN, herkenActiviteit } from '../engine.js';
import { METHODEN } from '../kleur.js';
import { esc, $, $$, foto, blad, melding, chips, stip, tegel, collage } from '../ui.js';
import { outfitHtml, wissel, vanIds, andereKleurBlad, contrastSchuif, stukErbij } from './outfits.js';
import { tekenKaart, deelOfBewaar } from '../kaart.js';
import { huidigeSmaak, kiesBord } from './inspo.js';

// Sporten kies je bij "wat ga je doen"; 'actief' kan nog in oude bewaarde tassen staan.
const MOMENTEN = [['reis', 'Reis'], ['ochtend', 'Ochtend'], ['dag', 'Overdag'], ['avond', 'Avond']];
const MOMENT_LABEL = { ...Object.fromEntries(MOMENTEN), actief: 'Sport', extra: 'Extra outfit' };
// Wat sowieso thuisblijft. "open" = sandalen en slippers, ook met hak.
const NIET = [['rok', 'Rokken'], ['jurk', 'Jurken'], ['short', 'Shorts'], ['hakken', 'Hakken'], ['open', 'Open schoenen'], ['legging', 'Leggings']];
const DAGNAMEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

const vandaag = () => new Date().toISOString().slice(0, 10);
const tas = {
  bestemming: '', start: vandaag(), dagen: null, moetMee: [], niet: [], thuis: [], plaats: '', sfeer: [], afwisselen: false, sjiek: 0.5, schuif: false,
  seed: 1, uitkomst: null, filter: null, afgevinkt: [], ruil: null,
  // 'tas': de app vult je moet-mee aan tot een koffer. 'kies': jij legt (te)
  // veel klaar, ziet alle outfits daaruit en kiest zelf.
  modus: 'tas', herstel: null, meer: [], contrast: null, printMix: false, bord: [],
  // vast: de tas is klaar; tijdens je weekend kies je alleen nog uit wat je bij je hebt
  vast: false, toonExtra: false,
};

function maakDagen(start, n, oud = []) {
  const d0 = new Date(start + 'T12:00:00');
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(d0); d.setDate(d.getDate() + k);
    const naam = DAGNAMEN[d.getDay()];
    return oud[k] ? { ...oud[k], naam: naam[0].toUpperCase() + naam.slice(1), datum: d.toISOString().slice(0, 10) }
      : { naam: naam[0].toUpperCase() + naam.slice(1), datum: d.toISOString().slice(0, 10), temp: null,
          momenten: k === 0 ? ['reis', 'avond'] : k === n - 1 ? ['dag'] : ['dag', 'avond'] };
  });
}

// Wat je invult blijft bewaard (ook na opnieuw openen en op je andere
// toestel), en de laatst uitgerekende tas ook.
const BEWAAR = ['bestemming', 'start', 'dagen', 'moetMee', 'niet', 'thuis', 'sfeer', 'afwisselen', 'sjiek', 'schuif', 'afgevinkt', 'seed', 'modus', 'contrast', 'printMix', 'bord', 'vast'];
let geladen = false;
function laadConcept(app) {
  if (geladen) return;
  geladen = true;
  const c = app.staat().tasConcept;
  if (!c) return;
  for (const k of BEWAAR) if (c[k] !== undefined) tas[k] = c[k];
  // Een vaste tas blijft zoals hij is, ook als het weekend al begonnen is.
  if (tas.vast && c.plan) {
    tas.uitkomst = vanPlan(app, c.plan);
    tas.uitkomst.ookMee = (c.ookMee || []).map(x => ({ item: app.item(x.id), waarom: x.waarom })).filter(x => x.item);
  }
  // Een bewaarde reis die al voorbij is, schuift op naar vandaag.
  else if (tas.start < vandaag()) { tas.start = vandaag(); tas.dagen = maakDagen(tas.start, tas.dagen.length, tas.dagen); vergeetWeer(); }
  else if (c.plan && tas.modus === 'kies') tas.herstel = c.plan;
  else if (c.plan) {
    tas.uitkomst = vanPlan(app, c.plan);
    tas.uitkomst.ookMee = (c.ookMee || []).map(x => ({ item: app.item(x.id), waarom: x.waarom })).filter(x => x.item);
  }
}
function bewaarConcept(app) {
  const c = Object.fromEntries(BEWAAR.map(k => [k, tas[k]]));
  if (!tas.uitkomst && tas.herstel) c.plan = tas.herstel;
  if (tas.uitkomst) { c.plan = planIds(tas.uitkomst.plan); c.ookMee = (tas.uitkomst.ookMee || []).map(x => ({ id: x.item.id, waarom: x.waarom })); }
  const oud = app.staat().tasConcept;
  if (JSON.stringify(oud) !== JSON.stringify(c)) app.bij(s => { s.tasConcept = c; });
}
// Per stuk ook de plek bewaren: een trui uit je laagjes kan het bovenstuk zijn.
const planIds = plan => plan.map(p => ({ dag: p.dag, moment: p.moment, weer: p.weer, sfeer: p.sfeer || null, doen: p.doen || null, extra: !!p.extra,
  activiteit: p.activiteit || null, items: p.outfit ? p.outfit.items.map(i => i.id) : [],
  slots: p.outfit ? Object.fromEntries(Object.entries(p.outfit.slots).filter(([k, v]) => v && !Array.isArray(v)).map(([k, v]) => [k, v.id])) : null }));
function vanPlan(app, planLijst) {
  const ctx = { rapport: app.data.rapport, geheugen: app.staat().geheugen };
  const bouw = p => {
    if (!p.items.length) return null;
    if (!p.slots) return vanIds(app, p.items, { ...ctx, weer: p.weer });
    const slots = Object.fromEntries(Object.entries(p.slots).map(([k, id]) => [k, app.item(id)]).filter(([, i]) => i));
    return maakOutfit(slots, { ...ctx, weer: p.weer });
  };
  const plan = planLijst.map(p => ({ ...p, outfit: bouw(p) }));
  const ids = [...new Set(planLijst.flatMap(p => p.items))];
  return { plan, koffer: ids.map(i => ({ item: app.item(i), keer: 0 })).filter(x => x.item), extra: [], perManier: tel(plan), ontbreekt: [] };
}
// Andere dagen of dagdelen: de uitgerekende tas hoort daar niet meer bij.
let melding_ = '';
function verouderd() { if (tas.uitkomst) { tas.uitkomst = null; melding_ = 'Je reis is veranderd. Tik opnieuw op "Pak mijn tas".'; } }

// Nieuwe datum: voorspelde graden horen bij de oude dagen. Wat je zelf invulde blijft.
function vergeetWeer() {
  for (const d of tas.dagen) if (d.tempBron !== 'zelf') { d.temp = null; d.tempBron = null; }
}

export default function tasTab(el, app) {
  laadConcept(app);
  if (tas.vast && tas.uitkomst) return toonVast(el, app);
  if (!tas.dagen) tas.dagen = maakDagen(tas.start, 3);
  bewaarConcept(app);
  const opgeslagen = app.staat().tassen || [];
  const kies = tas.modus === 'kies';
  el.innerHTML = `
    <h1>Tas</h1>
    <p class="sub">Waar ga je heen, en wat ga je doen? De rest reken ik uit.</p>
    <label class="lab">Bestemming</label>
    <div class="rij" style="flex-wrap:nowrap"><input class="veld" id="best" placeholder="bijv. Terschelling" value="${esc(tas.bestemming)}" style="flex:1">
      <button class="knop licht" id="weer" type="button" style="flex:0 0 auto">Weer</button></div>
    <div class="rij" style="margin-top:8px">
      <input class="veld" type="date" id="start" value="${esc(tas.start)}" style="flex:1">
      <select class="veld" id="aantal" style="flex:0 0 120px">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option${n === tas.dagen.length ? ' selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <p class="klein" id="weer-status"></p>
    <div id="dagen">${tas.dagen.map((d, n) => `<div class="dag" data-d="${n}">
      <div class="dag-kop"><b style="flex:1">${esc(d.naam)} <span class="klein">${esc(d.datum.slice(8))}-${esc(d.datum.slice(5, 7))}</span></b>
        <span class="klein">${d.temp == null ? '' : d.tempBron === 'zelf' ? 'zelf' : d.tempBron === 'voorspeld' ? 'voorspeld' : ''}</span>
        <input class="veld temp" type="number" inputmode="numeric" placeholder="°C" value="${d.temp ?? ''}" data-temp="${n}" aria-label="Temperatuur ${esc(d.naam)}"></div>
      ${chips('m' + n, MOMENTEN, d.momenten, { meer: true }).replace('class="chips"', 'class="chips wrap"')}
      ${d.momenten.filter(m => m !== 'actief' && m !== 'reis').map(m => doenRij(d, n, m)).join('')}</div>`).join('')}</div>

    <label class="lab">Wat niet mee</label>
    ${chips('niet', NIET, tas.niet, { meer: true }).replace('class="chips"', 'class="chips wrap"')}
    <div class="rij" style="margin-top:4px">${tas.thuis.map(id => app.item(id)).filter(Boolean).map(i => `<button class="chip aan" data-th="${esc(i.id)}" type="button">${esc(i.naam)} ×</button>`).join('')}
      <button class="chip" id="kies-thuis" type="button">＋ stuk blijft thuis</button></div>

    <label class="lab">${kies ? 'Mijn stukken' : 'Moet mee'}</label>
    <div class="chips"><button class="chip${!kies ? ' aan' : ''}" data-modus="tas" type="button">Maak een tas voor me</button><button class="chip${kies ? ' aan' : ''}" data-modus="kies" type="button">Ik kies uit mijn stukken</button></div>
    ${kies ? '<p class="klein" style="margin-top:0">Leg gerust meer klaar dan nodig. Je ziet alle outfits die ermee kunnen, en wat ontbreekt komt uit je kast.</p>' : ''}
    <div class="rij">${tas.moetMee.map(id => app.item(id)).filter(Boolean).map(i => `<button class="chip aan" data-mm="${esc(i.id)}" type="button">${esc(i.naam)} ×</button>`).join('')}
      <button class="chip" id="kies-mm" type="button">＋ ${kies ? 'stukken kiezen' : 'stuk'}</button></div>
    <label class="lab">Sfeer (mag leeg, meer mag ook)</label>
    ${chips('sfeer', Object.entries(SFEREN).map(([k, v]) => [k, v.naam]), tas.sfeer, { meer: true }).replace('class="chips"', 'class="chips wrap"')}
    ${tas.sfeer.length > 1 ? `<div class="chips"><button class="chip${!tas.afwisselen ? ' aan' : ''}" data-afw="0" type="button">Mengen in elke outfit</button><button class="chip${tas.afwisselen ? ' aan' : ''}" data-afw="1" type="button">Per moment afwisselen</button></div>` : ''}
    <div class="schuif"><span>comfy</span><input type="range" min="0" max="1" step="0.25" value="${tas.sjiek}" id="sjiek"><span>sjiek</span></div>
    ${contrastSchuif(tas.contrast)}
    <div class="chips"><button class="chip${tas.printMix ? ' aan' : ''}" id="printmix" type="button">Print op print</button></div>
    <label class="lab">Inspiratie voor deze reis (mag leeg)</label>
    <div class="rij">${bordHtml(app)}<button class="chip" id="bord" type="button">${tas.bord.length ? 'Aanpassen' : '＋ Kies beelden'}</button></div>
    <button class="knop vol" id="pak" type="button" style="margin-top:14px">${kies ? 'Laat alle outfits zien' : 'Pak mijn tas'}</button>
    <div id="uitkomst" style="margin-top:18px">${melding_ && !tas.uitkomst ? `<p class="klein">${esc(melding_)}</p>` : ''}</div>
    ${opgeslagen.length ? `<h3>Bewaarde tassen</h3>${opgeslagen.slice().reverse().map(t => `<button class="chip" data-tas="${esc(t.id)}" type="button">${esc(t.naam)} · ${esc(t.datum)}</button>`).join(' ')}` : ''}`;

  // Bestemming en datum ingevuld: het weer komt vanzelf.
  let wacht;
  $('#best').addEventListener('input', e => { tas.bestemming = e.target.value; clearTimeout(wacht); wacht = setTimeout(() => haalWeer(el, app, true), 900); });
  $('#best').addEventListener('change', () => { clearTimeout(wacht); haalWeer(el, app, true); });
  $('#start').addEventListener('change', e => {
    if (!e.target.value) return;
    tas.start = e.target.value; tas.dagen = maakDagen(tas.start, tas.dagen.length, tas.dagen); vergeetWeer(); verouderd();
    tasTab(el, app); haalWeer(el, app, true);
  });
  $('#aantal').addEventListener('change', e => { tas.dagen = maakDagen(tas.start, +e.target.value, tas.dagen); verouderd(); tasTab(el, app); haalWeer(el, app, true); });
  $$('[data-temp]', el).forEach(i => i.addEventListener('change', () => {
    const d = tas.dagen[+i.dataset.temp];
    d.temp = i.value === '' ? null : +i.value; d.tempBron = i.value === '' ? null : 'zelf';
  }));
  tas.dagen.forEach((d, n) => $$(`[data-chips="m${n}"] .chip`, el).forEach(b => b.addEventListener('click', () => {
    d.momenten = d.momenten.includes(b.dataset.w) ? d.momenten.filter(m => m !== b.dataset.w) : d.momenten.concat(b.dataset.w);
    d.momenten.sort((a, c) => MOMENTEN.findIndex(x => x[0] === a) - MOMENTEN.findIndex(x => x[0] === c));
    verouderd(); tasTab(el, app);
  })));
  $$('[data-doen]', el).forEach(sel => sel.addEventListener('change', () => {
    const [n, m] = sel.dataset.doen.split('|'); const d = tas.dagen[+n];
    d.doen = { ...(d.doen || {}) };
    if (sel.value === 'anders') d.doen[m] = d.doen[m] && !ACTIVITEITEN[d.doen[m]] ? d.doen[m] : ' ';
    else if (sel.value) d.doen[m] = sel.value; else delete d.doen[m];
    tasTab(el, app);
  }));
  $$('[data-doen-tekst]', el).forEach(inp => inp.addEventListener('change', () => {
    const [n, m] = inp.dataset.doenTekst.split('|'); const d = tas.dagen[+n];
    d.doen = { ...(d.doen || {}), [m]: inp.value.trim() || ' ' };
    tasTab(el, app);
  }));
  $$('[data-chips="niet"] .chip', el).forEach(b => b.addEventListener('click', () => {
    const w = b.dataset.w; tas.niet = tas.niet.includes(w) ? tas.niet.filter(x => x !== w) : tas.niet.concat(w); b.classList.toggle('aan');
  }));
  $$('[data-th]', el).forEach(b => b.addEventListener('click', () => { tas.thuis = tas.thuis.filter(x => x !== b.dataset.th); tasTab(el, app); }));
  $('#kies-thuis').addEventListener('click', () => kiesStukken(app, 'Wat blijft thuis?', tas.thuis, ids => { tas.thuis = ids; tas.moetMee = tas.moetMee.filter(x => !ids.includes(x)); tasTab(el, app); }));
  $$('[data-chips="sfeer"] .chip', el).forEach(b => b.addEventListener('click', () => {
    const w = b.dataset.w; tas.sfeer = tas.sfeer.includes(w) ? tas.sfeer.filter(x => x !== w) : tas.sfeer.concat(w); tasTab(el, app);
  }));
  $$('[data-afw]', el).forEach(b => b.addEventListener('click', () => { tas.afwisselen = b.dataset.afw === '1'; tasTab(el, app); }));
  $('#sjiek').addEventListener('change', e => { tas.sjiek = +e.target.value; tas.schuif = true; });
  $('#contrast').addEventListener('change', e => { tas.contrast = +e.target.value; });
  $('#printmix').addEventListener('click', e => { tas.printMix = !tas.printMix; e.target.classList.toggle('aan'); });
  $('#bord').addEventListener('click', () => kiesBord(app, tas.bord, ids => { tas.bord = ids; tasTab(el, app); }));
  $$('[data-mm]', el).forEach(b => b.addEventListener('click', () => { tas.moetMee = tas.moetMee.filter(x => x !== b.dataset.mm); tasTab(el, app); }));
  $('#kies-mm').addEventListener('click', () => kiesStukken(app, kies ? 'Wat leg je klaar?' : 'Wat moet mee?', tas.moetMee, ids => {
    tas.moetMee = ids; tas.thuis = tas.thuis.filter(x => !ids.includes(x));
    // al aan het kiezen: opnieuw uitrekenen, je keuzes blijven waar ze nog kunnen
    if (kies && tas.uitkomst) { tasTab(el, app); reken(el, app); } else tasTab(el, app);
  }));
  $$('[data-modus]', el).forEach(b => b.addEventListener('click', () => { if (tas.modus !== b.dataset.modus) { tas.modus = b.dataset.modus; verouderd(); melding_ = ''; tasTab(el, app); } }));
  $('#weer').addEventListener('click', () => haalWeer(el, app, false));
  $('#pak').addEventListener('click', () => { tas.seed = 1; tas.filter = null; tas.ruil = null; reken(el, app); });
  $$('[data-tas]', el).forEach(b => b.addEventListener('click', () => openBewaard(el, app, b.dataset.tas)));
  // Een bewaarde keuze: de opties opnieuw uitrekenen, je keuzes terugzetten.
  if (tas.herstel && !tas.uitkomst) {
    const oud = tas.herstel; tas.herstel = null;
    tas.uitkomst = uitSelectie(app.kast(), opties(app));
    const terug = vanPlan(app, oud).plan;
    tas.uitkomst.plan.forEach((p, n) => { const t = terug[n]; if (t && t.outfit && t.dag === p.dag && t.moment === p.moment) p.outfit = t.outfit; });
    tas.uitkomst.plan.push(...terug.filter(t => t.extra && t.outfit).map(t => ({ ...t, opties: [] })));
  }
  if (tas.uitkomst) toonUitkomst(el, app);
}

// Het bord van deze tas als rijtje kleine plaatjes.
function bordHtml(app) {
  const beelden = tas.bord.map(id => (app.staat().inspo || []).find(x => x.id === id)).filter(Boolean);
  return beelden.map(x => `<img src="${esc(foto(x.beeld, 120))}" alt="" style="width:40px;height:50px;object-fit:cover;border-radius:6px">`).join('');
}

// Activiteit per dagdeel: een keuzelijst, of zelf typen. Mag leeg blijven.
const MOMENT_NAAM = MOMENT_LABEL;
function doenRij(d, n, m) {
  const w = (d.doen || {})[m];
  const eigen = w && !ACTIVITEITEN[w];
  const herkend = eigen && herkenActiviteit(w);
  return `<div class="doen"><span class="klein">${esc(MOMENT_NAAM[m])}</span>
    <select class="veld" data-doen="${n}|${m}" aria-label="Wat ga je doen, ${esc(d.naam)} ${esc(MOMENT_NAAM[m])}">
      <option value="">Weet ik nog niet</option>
      ${Object.entries(ACTIVITEITEN).map(([k, a]) => `<option value="${k}"${w === k ? ' selected' : ''}>${esc(a.naam)}</option>`).join('')}
      <option value="anders"${eigen ? ' selected' : ''}>Anders…</option></select>
    ${eigen ? `<input class="veld" data-doen-tekst="${n}|${m}" value="${esc(w.trim())}" placeholder="bijv. hardloopwedstrijd">
      ${w.trim() ? `<span class="klein">${herkend ? 'telt als ' + esc(ACTIVITEITEN[herkend].naam.toLowerCase()) : 'geen invloed op de outfit'}</span>` : ''}` : ''}
  </div>`;
}

// Weer voor de bestemming. Binnen 16 dagen een voorspelling; verder weg vul je
// het zelf in, met vorig jaar rond die datum als houvast. Wat je zelf invulde
// wordt nooit overschreven.
async function haalWeer(el, app, stil) {
  const st = $('#weer-status');
  if (!tas.bestemming.trim()) { if (!stil) st.textContent = 'Vul eerst een bestemming in.'; return; }
  st.textContent = 'Weer ophalen…';
  try {
    const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(tas.bestemming)}&count=1&language=nl`)).json();
    const p = g.results && g.results[0];
    if (!p) throw new Error('plaats niet gevonden');
    const eind = tas.dagen[tas.dagen.length - 1].datum;
    const dagenVooruit = (new Date(eind) - new Date(vandaag())) / 864e5;
    if (dagenVooruit <= 15) {
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&daily=temperature_2m_max&timezone=auto&start_date=${tas.start}&end_date=${eind}`)).json();
      if (!w.daily) throw new Error('geen voorspelling');
      w.daily.time.forEach((t, n) => {
        const d = tas.dagen.find(x => x.datum === t);
        if (d && d.tempBron !== 'zelf') { d.temp = Math.round(w.daily.temperature_2m_max[n]); d.tempBron = 'voorspeld'; }
      });
      tasTab(el, app);
      $('#weer-status').textContent = `Voorspelling voor ${p.name}. Pas aan wat je anders verwacht.`;
    } else {
      const jr = s => (+s.slice(0, 4) - 1) + s.slice(4);
      const w = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${p.latitude}&longitude=${p.longitude}&daily=temperature_2m_max&timezone=auto&start_date=${jr(tas.start)}&end_date=${jr(eind)}`)).json();
      const vorig = w.daily ? w.daily.temperature_2m_max.map(Math.round) : [];
      st.innerHTML = `Te ver vooruit voor een voorspelling, dus vul het zelf in.${vorig.length ? ` Vorig jaar rond deze dagen in ${esc(p.name)}: ${vorig.map(t => t + '°').join(' · ')}. <a href="#" id="gebruik">Gebruik dit</a>` : ''}`;
      const a = $('#gebruik');
      if (a) a.addEventListener('click', e => {
        e.preventDefault();
        tas.dagen.forEach((d, n) => { if (d.tempBron !== 'zelf' && vorig[n] != null) { d.temp = vorig[n]; d.tempBron = 'schatting'; } });
        tasTab(el, app);
      });
    }
  } catch (e) {
    st.textContent = /plaats/.test(e.message) ? `Ik kan "${tas.bestemming}" niet vinden. Probeer de plaatsnaam, of vul de graden zelf in.`
      : 'Het weer ophalen lukt nu niet. Vul de graden zelf in, of probeer het straks opnieuw.';
  }
}

// `ingepakt`: bij opnieuw rekenen blijft wat al in je tas zit gewoon mee.
function opties(app, ingepakt = []) {
  const mee = [...new Set(tas.moetMee.concat(ingepakt.filter(id => !tas.thuis.includes(id))))];
  return {
    dagen: tas.dagen.filter(d => d.momenten.length).map(d => ({ ...d, temp: d.temp ?? 15 })),
    rapport: app.data.rapport, sfeer: tas.sfeer, afwisselen: tas.afwisselen, sjiek: tas.schuif ? tas.sjiek : null, contrast: tas.contrast,
    printMix: tas.printMix, smaak: huidigeSmaak(app, tas.bord),
    moetMee: mee, seed: tas.seed, geheugen: app.staat().geheugen,
    uitsluiten: app.kast().filter(i => tas.thuis.includes(i.id) || tas.niet.includes(i.soort) || (tas.niet.includes('open') && i.open)).map(i => i.id)
      .filter(id => !mee.includes(id)),
  };
}

function herreken(el, app, bericht) {
  const ingepakt = tas.afgevinkt.slice();
  tasTab(el, app);
  reken(el, app, () => { tas.afgevinkt = ingepakt; bewaarConcept(app); toonUitkomst(el, app); melding(bericht); }, ingepakt);
}

function reken(el, app, daarna, ingepakt = []) {
  const plek = $('#uitkomst');
  if (!opties(app).dagen.length) { plek.innerHTML = '<p class="klein">Kies per dag minstens één moment.</p>'; return; }
  const kies = tas.modus === 'kies';
  if (kies && tas.moetMee.length < 2) { plek.innerHTML = '<p class="klein">Kies eerst de stukken die je eventueel mee wilt.</p>'; return; }
  plek.innerHTML = `<p class="klein">${kies ? 'Ik zoek alle outfits uit je stukken…' : 'Ik pak je tas… dit duurt een paar tellen.'}</p>`;
  const oud = tas.uitkomst;
  setTimeout(() => {
    tas.uitkomst = kies ? uitSelectie(app.kast(), opties(app)) : pakTas(app.kast(), opties(app, ingepakt));
    // al gekozen outfits blijven staan zolang ze nog kunnen
    if (kies && oud && oud.keuze) tas.uitkomst.plan.forEach((p, n) => {
      const was = oud.plan[n] && oud.plan[n].outfit;
      if (was && oud.plan[n].moment === p.moment && was.items.every(i => tas.moetMee.includes(i.id) || tas.uitkomst.erbij.includes(i.id) || i.rol === 'tas')) p.outfit = was;
    });
    tas.meer = [];
    // extra outfits die je al koos, blijven erbij
    if (oud) tas.uitkomst.plan.push(...oud.plan.filter(p => p.extra && p.outfit).map(p => ({ ...p, opties: [] })));
    tas.afgevinkt = [];
    bewaarConcept(app);
    toonUitkomst(el, app);
    if (daarna) daarna();
    plek.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

// De koffer volgt uit het plan: wat in een outfit zit, gaat mee.
function koffer(u) {
  const tel = new Map();
  for (const p of u.plan) if (p.outfit) for (const i of p.outfit.items) tel.set(i.id, { item: i, keer: (tel.get(i.id)?.keer || 0) + 1 });
  if (!u.keuze) for (const id of tas.moetMee) if (!tel.has(id) && u.koffer.find(k => k.item.id === id)) tel.set(id, { item: u.koffer.find(k => k.item.id === id).item, keer: 0 });
  for (const x of u.ookMee || []) if (!tel.has(x.item.id)) tel.set(x.item.id, { item: x.item, keer: 0, waarom: x.waarom });
  return [...tel.values()].sort((a, b) => b.keer - a.keer);
}

function toonUitkomst(el, app) {
  const u = tas.uitkomst, plek = $('#uitkomst');
  if (!u || !plek) return;
  if (u.keuze) return toonKeuze(el, app);
  const k = koffer(u);
  const n = u.plan.filter(p => p.outfit).length;
  const kleding = k.filter(x => !['tas', 'accessoire'].includes(x.item.rol)).length;
  const manieren = Object.entries(u.perManier).filter(([m]) => m !== 'mix').sort((a, b) => b[1] - a[1]);
  const extra = tas.filter ? u.extra.filter(o => o.kleur.methode === tas.filter).slice(0, 4) : [];

  plek.innerHTML = `
    <h2>${kleding} kledingstukken, ${n} outfits</h2>
    <p class="sub">In deze koffer zitten deze kleurmanieren. Tik er een aan voor meer ideeën.</p>
    <div class="chips wrap">${manieren.map(([m, c]) => `<button class="chip${tas.filter === m ? ' aan' : ''}" data-f="${m}" type="button">${esc(METHODEN[m].naam)} <small>${c}</small></button>`).join('')}</div>
    ${tas.filter ? `<div class="kaart"><b>${esc(METHODEN[tas.filter].naam)} uit deze koffer</b>
      ${extra.map(o => `<div style="margin-top:10px">${outfitHtml(o)}</div>`).join('') || '<p class="klein">Geen andere dan in je plan.</p>'}
      <button class="knop licht vol" id="meer-van" type="button" style="margin-top:10px">Meer ${esc(METHODEN[tas.filter].naam.toLowerCase())} in mijn tas</button>
      <p class="klein" id="ruil-uit"></p></div>` : ''}
    ${u.ontbreekt.length ? `<div class="kaart"><b>Wat nu niet kan</b><ul class="tips">${u.ontbreekt.map(o => `<li>${esc(o.naam)}: ${o.zet
      ? `met <a href="#" data-zet="${esc(o.zet.item.id)}">${esc(o.zet.item.naam)}</a> erbij wel (${o.zet.n} look${o.zet.n > 1 ? 's' : ''}).`
      : 'je kast heeft hier geen stukken voor bij dit weer.'}</li>`).join('')}</ul></div>` : ''}

    <h3>Per dag</h3>
    ${u.plan.map((p, i) => `<div class="kaart" data-p="${i}">
      <div class="moment-kop"><h4>${esc(p.dag)} · ${esc(MOMENT_LABEL[p.moment] || p.moment)}</h4><span class="klein">${esc([p.doen && p.doen.trim(), p.sfeer && SFEREN[p.sfeer].naam, p.weer].filter(Boolean).join(' · '))}</span></div>
      ${p.outfit ? outfitHtml(p.outfit) + erbijNoot(app, p) + `<div class="rij" style="margin-top:6px"><button class="chip" data-kleur="${i}" type="button">🎨 Andere kleur</button><button class="chip" data-stukerbij="${i}" type="button">＋ Stuk erbij</button>${p.extra ? `<button class="chip" data-extraweg="${i}" type="button">Haal weg</button>` : ''}</div>` : '<p class="klein">Hier lukt niets, ook niet met iets uit je kast erbij. Kijk bij "Wat niet mee" of je niet te veel hebt uitgesloten.</p>'}</div>`).join('')}
    ${extraHtml(app, u, k)}

    <div class="moment-kop"><h3>Paklijst</h3><span class="klein" id="ingepakt">${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt</span></div>
    <p class="klein" style="margin-top:0">Vink af wat in je tas zit. × laat een stuk thuis, ＋ zet er een bij; de outfits worden dan opnieuw uitgerekend.</p>
    <ul class="paklijst">${k.map(x => `<li><input type="checkbox" data-v="${esc(x.item.id)}"${tas.afgevinkt.includes(x.item.id) ? ' checked' : ''} aria-label="${esc(x.item.naam)} ingepakt">
      ${x.item.foto ? `<img src="${esc(foto(x.item.foto, 120))}" alt="">` : `<span class="leeg">${stip(x.item.kleur[0], 20)}</span>`}
      <span>${esc(x.item.naam)}</span><span class="keer">${x.waarom ? esc(x.waarom) : x.keer + '×'}</span>
      <button class="pak-weg" data-weg="${esc(x.item.id)}" type="button" aria-label="${esc(x.item.naam)} thuislaten">×</button></li>`).join('')}</ul>
    <button class="knop licht vol" id="pak-erbij" type="button" style="margin-top:8px">＋ Stuk toevoegen</button>
    <div class="rij" style="margin-top:14px">
      <button class="knop" id="kaarten" type="button">Alle kaarten opslaan</button>
      <button class="knop licht" id="bewaar" type="button">Tas bewaren</button>
      <button class="knop licht" id="opnieuw" type="button">Andere tas</button>
    </div>
    <button class="knop vol" id="zet-vast" type="button" style="margin-top:10px">Klaar: zet mijn tas vast</button>`;
  koppelExtra(el, app, u, k, () => { bewaarConcept(app); toonUitkomst(el, app); });

  $$('[data-f]', plek).forEach(b => b.addEventListener('click', () => { tas.filter = tas.filter === b.dataset.f ? null : b.dataset.f; toonUitkomst(el, app); }));
  $$('[data-v]', plek).forEach(c => c.addEventListener('change', () => {
    tas.afgevinkt = c.checked ? tas.afgevinkt.concat(c.dataset.v) : tas.afgevinkt.filter(x => x !== c.dataset.v);
    bewaarConcept(app);
    const n = $('#ingepakt'); if (n) n.textContent = `${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt`;
  }));
  // Thuislaten of erbij: de outfits rekenen opnieuw, wat al ingepakt is blijft afgevinkt.
  $$('[data-weg]', plek).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.weg;
    tas.moetMee = tas.moetMee.filter(x => x !== id);
    if (!tas.thuis.includes(id)) tas.thuis.push(id);
    herreken(el, app, `${app.item(id)?.naam || 'Dat stuk'} blijft thuis.`);
  }));
  $('#pak-erbij').addEventListener('click', () => kiesStukken(app, 'Wat moet erbij?', [], ids => {
    if (!ids.length) return;
    tas.thuis = tas.thuis.filter(x => !ids.includes(x));
    tas.moetMee = [...new Set(tas.moetMee.concat(ids))];
    herreken(el, app, ids.length > 1 ? `${ids.length} stukken gaan mee.` : `${app.item(ids[0])?.naam || 'Het stuk'} gaat mee.`);
  }));
  $$('[data-zet]', plek).forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); tas.moetMee.push(a.dataset.zet); reken(el, app);
  }));
  $$('[data-p]', plek).forEach(kaart => kaart.addEventListener('click', e => {
    const p = u.plan[+kaart.dataset.p];
    if (e.target.closest('[data-kleur]')) {
      return andereKleurBlad(app, p.outfit, { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen, uitsluiten: opties(app).uitsluiten },
        k.map(x => x.item.id), nieuw => { p.outfit = nieuw; bewaarConcept(app); toonUitkomst(el, app); });
    }
    if (e.target.closest('[data-stukerbij]')) {
      return stukErbij(app, p.outfit, { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen },
        k.map(x => x.item.id), nieuw => { p.outfit = nieuw; bewaarConcept(app); toonUitkomst(el, app); });
    }
    const st = e.target.closest('[data-slot]'); if (!st) return;
    wissel(app, p.outfit, st.dataset.slot, nieuw => { p.outfit = nieuw; bewaarConcept(app); toonUitkomst(el, app); },
      { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen });
  }));
  const mv = $('#meer-van');
  if (mv) mv.addEventListener('click', () => {
    const r = meerVan(app.kast(), k.map(x => x.item), tas.filter, opties(app));
    const uit = $('#ruil-uit');
    if (!r) { uit.textContent = 'Met één ruil wordt het niet meer. Probeer een ander stuk als "moet mee".'; return; }
    uit.innerHTML = `Ruil <b>${esc(r.uit.naam)}</b> voor <b>${esc(r.in.naam)}</b>: van ${r.nu} naar ${r.n} looks. <a href="#" id="doe-ruil">Doen</a>`;
    $('#doe-ruil').addEventListener('click', ev => {
      ev.preventDefault();
      tas.moetMee = tas.moetMee.filter(x => x !== r.uit.id).concat(r.in.id);
      reken(el, app);
    });
  });
  $('#opnieuw').addEventListener('click', () => { tas.seed++; reken(el, app); });
  $('#bewaar').addEventListener('click', () => bewaarTas(app, u));
  $('#kaarten').addEventListener('click', () => bewaarKaarten(u));
}

// ── Extra outfits met wat er over is ────────────────────────────────────────
function extraHtml(app, u, k, over = []) {
  if (!tas.toonExtra) return `<button class="knop licht vol" id="extra-aan" type="button" style="margin-top:6px">＋ Extra outfits met wat ${over.length ? 'over is' : 'je meeneemt'}</button>`;
  const r = extraVoor(app, u, k, over);
  return `<h3>Extra outfits</h3><p class="klein" style="margin-top:0">${over.length ? 'Met wat je meeneemt, plus wat nu thuis zou blijven.' : 'Nieuwe combinaties uit wat je meeneemt.'} Tik "Neem mee" en hij komt bij je plan en je paklijst.</p>
    ${r.outfits.length ? `<div class="outfit-lijst">${r.outfits.map((o, n) => {
      const nieuw = o.items.filter(i => over.includes(i));
      return `<div class="outfit-tegel">${collage(o.items)}<b>${esc(o.kleur.naam)}</b>
        <span class="klein">${nieuw.length ? '＋ gaat dan ook mee: ' + nieuw.map(i => esc(i.naam)).join(', ') : 'alleen wat al meegaat'}</span>
        <button class="chip" data-extra="${n}" type="button" style="margin-top:6px">Neem mee</button></div>`;
    }).join('')}</div>` : '<p class="klein">Geen andere outfits meer met deze stukken.</p>'}
    <button class="chip" id="extra-uit" type="button" style="margin-top:8px">Verberg extra outfits</button>`;
}
function extraVoor(app, u, k, over) {
  return extraOutfits(k.map(x => x.item), over, { ...opties(app), dagen: opties(app).dagen }, u.plan.filter(p => p.outfit).map(p => p.outfit));
}
function koppelExtra(el, app, u, k, opnieuw, over = []) {
  const plek = $('#uitkomst');
  const aan = $('#extra-aan'); if (aan) aan.addEventListener('click', () => { tas.toonExtra = true; opnieuw(); });
  const uit = $('#extra-uit'); if (uit) uit.addEventListener('click', () => { tas.toonExtra = false; opnieuw(); });
  const lijst = tas.toonExtra ? extraVoor(app, u, k, over) : null;
  $$('[data-extra]', plek).forEach(b => b.addEventListener('click', () => {
    const o = lijst.outfits[+b.dataset.extra];
    const n = u.plan.filter(p => p.extra).length + 1;
    u.plan.push({ dag: `Extra ${n}`, moment: 'extra', weer: lijst.weer, outfit: o, extra: true, opties: [] });
    melding('Extra outfit erbij'); opnieuw();
  }));
  $$('[data-extraweg]', plek).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); u.plan.splice(+b.dataset.extraweg, 1); opnieuw();
  }));
  const zv = $('#zet-vast'); if (zv) zv.addEventListener('click', () => {
    tas.vast = true; tas.toonExtra = false; bewaarConcept(app); tasTab(el, app); scrollTo(0, 0);
    melding('Je tas staat vast');
  });
}

// ── Vast: tijdens je weekend ────────────────────────────────────────────────
// De paklijst ligt vast. Per dagdeel kun je nog iets heel anders kiezen, maar
// alleen uit wat je bij je hebt.
function toonVast(el, app) {
  const u = tas.uitkomst;
  const k = koffer(u);
  const bij = k.map(x => x.item);
  el.innerHTML = `<h1>Tas</h1>
    <p class="sub">Je tas${tas.bestemming ? ' voor ' + esc(tas.bestemming) : ''} staat vast. Per dagdeel kun je nog iets anders kiezen uit wat je bij je hebt. Tik op een stuk om alleen dat te wisselen.</p>
    <button class="knop vol" id="nieuwe-look" type="button">Nieuwe look samenstellen</button>
    ${u.plan.map((p, i) => p.outfit ? `<div class="kaart" data-p="${i}">
      <div class="moment-kop"><h4>${esc(p.extra ? 'Extra outfit' : p.dag + ' · ' + (MOMENT_LABEL[p.moment] || p.moment))}</h4><span class="klein">${esc([p.doen && p.doen.trim(), p.weer].filter(Boolean).join(' · '))}</span></div>
      ${outfitHtml(p.outfit)}${p.gewisseld ? '<p class="klein">Anders dan je plan.</p>' : ''}
      <div class="rij" style="margin-top:6px"><button class="chip" data-anders="${i}" type="button">Iets anders uit mijn tas</button>
        <button class="chip" data-erbij="${i}" type="button">＋ Stuk erbij</button></div></div>` : '').join('')}
    <div class="moment-kop"><h3>Paklijst</h3><span class="klein" id="ingepakt">${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt</span></div>
    <ul class="paklijst">${k.map(x => `<li><input type="checkbox" data-v="${esc(x.item.id)}"${tas.afgevinkt.includes(x.item.id) ? ' checked' : ''} aria-label="${esc(x.item.naam)} ingepakt">
      ${x.item.foto ? `<img src="${esc(foto(x.item.foto, 120))}" alt="">` : `<span class="leeg">${stip(x.item.kleur[0], 20)}</span>`}
      <span>${esc(x.item.naam)}</span><span class="keer">${x.waarom ? esc(x.waarom) : x.keer + '×'}</span></li>`).join('')}</ul>
    <div class="rij" style="margin-top:14px">
      <button class="knop" id="kaarten" type="button">Alle kaarten opslaan</button>
      <button class="knop licht" id="losmaken" type="button">Tas weer aanpassen</button>
    </div>`;
  $$('[data-v]', el).forEach(c => c.addEventListener('change', () => {
    tas.afgevinkt = c.checked ? tas.afgevinkt.concat(c.dataset.v) : tas.afgevinkt.filter(x => x !== c.dataset.v);
    bewaarConcept(app);
    const n = $('#ingepakt'); if (n) n.textContent = `${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt`;
  }));
  $$('[data-anders]', el).forEach(b => b.addEventListener('click', () => {
    const p = u.plan[+b.dataset.anders];
    const moment = { dag: p.dag, moment: p.extra ? 'dag' : p.moment, weer: p.weer, activiteit: p.activiteit || null, reis: p.moment === 'reis', doen: p.doen };
    const nu = p.outfit.items.map(i => i.id).sort().join('|');
    const opts = uitJeTas(bij, moment, opties(app), 10).filter(o => o.items.map(i => i.id).sort().join('|') !== nu);
    const bl = blad(`<h2>Iets anders voor ${esc(p.extra ? 'je extra outfit' : p.dag.toLowerCase() + ' ' + (MOMENT_LABEL[p.moment] || '').toLowerCase())}</h2>
      <p class="sub">Alleen met wat je bij je hebt.</p>
      ${opts.length ? `<div class="outfit-lijst">${opts.map((o, n) => `<button class="outfit-tegel" data-o="${n}" type="button">${collage(o.items)}<b>${esc(o.kleur.naam)}</b></button>`).join('')}</div>`
        : '<p class="klein">Met wat je bij je hebt lukt hier niets anders.</p>'}`);
    bl.addEventListener('click', e => {
      const t = e.target.closest('[data-o]'); if (!t) return;
      p.outfit = opts[+t.dataset.o]; p.gewisseld = true;
      bl.sluit(); bewaarConcept(app); toonVast(el, app);
    });
  }));
  const klaar = p => nieuw => { p.outfit = nieuw; p.gewisseld = true; bewaarConcept(app); toonVast(el, app); };
  const ctxVan = p => ({ rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen });
  // één stuk wisselen: eerst uit je tas, met een knop voor je hele kast
  $$('[data-p]', el).forEach(kaart => kaart.addEventListener('click', e => {
    const st = e.target.closest('[data-slot]'); if (!st) return;
    const p = u.plan[+kaart.dataset.p];
    wissel(app, p.outfit, st.dataset.slot, klaar(p), ctxVan(p), bij);
  }));
  // een stuk erbij: uit je tas of je hele kast
  $$('[data-erbij]', el).forEach(b => b.addEventListener('click', () => {
    const p = u.plan[+b.dataset.erbij];
    stukErbij(app, p.outfit, ctxVan(p), bij.map(i => i.id), klaar(p));
  }));
  $('#nieuwe-look').addEventListener('click', () => nieuweLook(el, app, u, bij));
  $('#kaarten').addEventListener('click', () => bewaarKaarten(u));
  $('#losmaken').addEventListener('click', () => { tas.vast = false; bewaarConcept(app); tasTab(el, app); });
}

// Een heel nieuwe look uit alles wat je bij je hebt, op basis van je wensen.
function nieuweLook(el, app, u, bij) {
  const momenten = u.plan.map((p, i) => [String(i), p.extra ? 'Extra outfit' : `${p.dag} ${(MOMENT_LABEL[p.moment] || '').toLowerCase()}`]);
  const w = { voor: momenten[0] ? momenten[0][0] : 'extra', sfeer: [], sjiek: null, wensen: [], methode: null };
  const b = blad(`<h2>Nieuwe look</h2><p class="sub">Uit alles wat je bij je hebt. Zeg wat je wilt; alles mag leeg.</p>
    <label class="lab">Voor</label><select class="veld" id="nl-voor">${momenten.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}<option value="extra">Als extra outfit</option></select>
    <label class="lab">Sfeer</label>${chips('nl-sf', Object.entries(SFEREN).map(([k, v]) => [k, v.naam]), [], { meer: true }).replace('class="chips"', 'class="chips wrap"')}
    <div class="schuif"><span>comfy</span><input type="range" min="0" max="1" step="0.25" value="0.5" id="nl-sjiek"><span>sjiek</span></div>
    <label class="lab">Wensen</label>${chips('nl-w', Object.entries(WENSEN).map(([k, v]) => [k, v.naam]), [], { meer: true }).replace('class="chips"', 'class="chips wrap"')}
    <label class="lab">Kleurmanier</label>${chips('nl-m', ['mono', 'tonsurton', 'accent', 'analoog', 'split'].map(k => [k, METHODEN[k].naam]), null).replace('class="chips"', 'class="chips wrap"')}
    <button class="knop vol" id="nl-zoek" type="button" style="margin-top:12px">Laat looks zien</button>
    <div id="nl-uit" style="margin-top:12px"></div>`);
  const meer = (naam, veld) => $$(`[data-chips="${naam}"] .chip`, b).forEach(c => c.addEventListener('click', () => {
    w[veld] = w[veld].includes(c.dataset.w) ? w[veld].filter(x => x !== c.dataset.w) : w[veld].concat(c.dataset.w); c.classList.toggle('aan');
  }));
  meer('nl-sf', 'sfeer'); meer('nl-w', 'wensen');
  $$('[data-chips="nl-m"] .chip', b).forEach(c => c.addEventListener('click', () => {
    w.methode = w.methode === c.dataset.w ? null : c.dataset.w;
    $$('[data-chips="nl-m"] .chip', b).forEach(d => d.classList.toggle('aan', d.dataset.w === w.methode));
  }));
  $('#nl-voor', b).addEventListener('change', e => { w.voor = e.target.value; });
  $('#nl-sjiek', b).addEventListener('change', e => { w.sjiek = +e.target.value; });
  let looks = [];
  $('#nl-zoek', b).addEventListener('click', () => {
    const p = u.plan[+w.voor];
    const weer = p ? p.weer : (u.plan[0] && u.plan[0].weer) || 'mild';
    const moment = p && !p.extra ? { dag: p.dag, moment: p.moment, weer, activiteit: p.activiteit || null, reis: p.moment === 'reis', doen: p.doen }
      : { dag: 'Extra', moment: 'dag', weer, activiteit: null, reis: false };
    looks = uitJeTas(bij, moment, { ...opties(app), sfeer: w.sfeer.length ? w.sfeer : opties(app).sfeer, sjiek: w.sjiek, wensen: w.wensen, methode: w.methode }, 10);
    $('#nl-uit', b).innerHTML = looks.length ? `<div class="outfit-lijst">${looks.map((o, n) => `<button class="outfit-tegel" data-look="${n}" type="button">${collage(o.items)}<b>${esc(o.kleur.naam)}</b></button>`).join('')}</div>`
      : '<p class="klein">Met wat je bij je hebt lukt dat niet. Laat een wens weg.</p>';
  });
  $('#nl-uit', b).addEventListener('click', e => {
    const t = e.target.closest('[data-look]'); if (!t) return;
    const o = looks[+t.dataset.look];
    if (w.voor === 'extra') {
      const n = u.plan.filter(p => p.extra).length + 1;
      u.plan.push({ dag: `Extra ${n}`, moment: 'extra', weer: o && u.plan[0] ? u.plan[0].weer : 'mild', outfit: o, extra: true, gewisseld: true });
    } else { const p = u.plan[+w.voor]; p.outfit = o; p.gewisseld = true; }
    b.sluit(); bewaarConcept(app); toonVast(el, app); melding('Nieuwe look staat erin');
  });
}

function bewaarTas(app, u) {
  const naam = tas.bestemming || 'Weekendtas';
  app.bij(s => s.tassen.push({
    id: 't-' + Date.now().toString(36), naam, datum: tas.start, dagen: tas.dagen,
    plan: planIds(u.plan),
  }));
  melding('Tas bewaard');
}

async function bewaarKaarten(u) {
  for (const p of u.plan) {
    if (!p.outfit) continue;
    const titel = `${p.dag} ${(MOMENT_LABEL[p.moment] || '').toLowerCase()}`;
    const c = await tekenKaart({ titel, ondertitel: `${tas.bestemming || 'Weekendtas'} · ${p.outfit.kleur.naam}`, items: p.outfit.items });
    const r = await deelOfBewaar(c, titel);
    if (r === 'geannuleerd') break;
    await new Promise(res => setTimeout(res, 500)); // een telefoon laat te snelle downloads vallen
  }
}

const erbijNoot = (app, p) => (p.erbij || []).length
  ? `<p class="klein">Uit je kast erbij: ${p.erbij.map(id => esc(app.item(id)?.naam || '')).join(', ')}</p>` : '';

// Kiezen uit je eigen stukken: per moment de opties, jij tikt er een aan.
// De paklijst bestaat alleen uit wat in je gekozen outfits zit.
function toonKeuze(el, app) {
  const u = tas.uitkomst, plek = $('#uitkomst');
  const eigen = new Set(tas.moetMee);
  const gekozen = u.plan.filter(p => p.outfit);
  const k = koffer(u);
  const inGekozen = new Set(k.map(x => x.item.id));
  const thuis = u.stukken.filter(x => !x.erbij && !inGekozen.has(x.item.id));
  const tegelVan = (o, i, n) => {
    const uitKast = o.items.filter(x => !eigen.has(x.id) && x.rol !== 'tas');
    // de stukken die het verschil maken eerst; een riem of sjaal mag wegvallen
    const volg = ['heel', 'boven', 'onder', 'laag', 'jas', 'schoen', 'tas', 'riem', 'sjaal'];
    const its = volg.map(r => o.slots[r]).filter(Boolean);
    const jas = o.slots.jas;
    return `<button class="outfit-tegel" data-kies="${i}|${n}" type="button">${collage(its)}
      <b>${esc(o.kleur.naam)}</b>${jas ? `<span class="klein">met ${esc(jas.naam)}</span><br>` : ''}<span class="klein">${uitKast.length ? '＋ uit je kast: ' + uitKast.map(x => esc(x.naam)).join(', ') : 'alleen jouw stukken'}</span></button>`;
  };
  plek.innerHTML = `
    <h2>${gekozen.length} van ${u.plan.length} gekozen</h2>
    <p class="sub">Tik per moment de outfit aan die je wilt. Wat in geen enkele gekozen outfit zit, kan thuisblijven.</p>
    <div class="rij"><button class="knop" id="compact" type="button">Kies voor mij, zo compact mogelijk</button>
      ${gekozen.length ? '<button class="knop licht" id="wis" type="button">Opnieuw kiezen</button>' : ''}</div>

    <h3>Per moment</h3>
    ${u.plan.map((p, i) => {
      const toon = tas.meer.includes(i) ? p.opties : p.opties.slice(0, 4);
      return `<div class="kaart" data-p="${i}">
      <div class="moment-kop"><h4>${esc(p.dag)} · ${esc(MOMENT_LABEL[p.moment] || p.moment)}</h4><span class="klein">${esc([p.doen && p.doen.trim(), p.sfeer && SFEREN[p.sfeer].naam, p.weer].filter(Boolean).join(' · '))}</span></div>
      ${p.outfit ? outfitHtml(p.outfit) + `<div class="rij" style="margin-top:6px"><button class="chip" data-kleur="${i}" type="button">🎨 Andere kleur</button><button class="chip" data-stukerbij="${i}" type="button">＋ Stuk erbij</button>${p.extra ? `<button class="chip" data-extraweg="${i}" type="button">Haal weg</button>` : `<button class="chip" data-los="${i}" type="button">Andere kiezen</button>`}</div>`
        : p.opties.length ? `<div class="outfit-lijst" style="margin-top:8px">${toon.map((o, n) => tegelVan(o, i, n)).join('')}</div>
          ${p.opties.length > toon.length ? `<button class="chip" data-meer="${i}" type="button" style="margin-top:8px">Nog ${p.opties.length - toon.length} opties</button>` : ''}`
        : '<p class="klein">Hier lukt niets, ook niet met iets uit je kast erbij. Kijk bij "Wat niet mee" of je niet te veel hebt uitgesloten.</p>'}
      ${!p.outfit && (p.niet || []).length ? `<ul class="tips">${p.niet.map(x => `<li>${esc(x.item.naam)}: ${esc(x.waarom)}</li>`).join('')}</ul>` : ''}</div>`;
    }).join('')}

    ${gekozen.length ? extraHtml(app, u, k, thuis.map(x => x.item)) : ''}

    <h3>Wat je klaarlegde</h3>
    <p class="klein" style="margin-top:0">Hoeveel outfits er met elk stuk kunnen. Weinig? Dan is het een kandidaat om thuis te laten.</p>
    <div>${u.stukken.map(x => `<div class="stuk-rij">${x.item.foto ? `<img src="${esc(foto(x.item.foto, 120))}" alt="">` : `<span class="leeg">${stip(x.item.kleur[0], 20)}</span>`}
      <span>${esc(x.item.naam)}${x.erbij ? ' <span class="klein">· uit je kast erbij</span>' : ''}</span>
      <span class="keer">${x.kan ? `in ${x.kan} outfit${x.kan > 1 ? 's' : ''}` : 'past nergens bij'}</span></div>`).join('')}</div>

    ${gekozen.length ? `<div class="moment-kop"><h3>Paklijst</h3><span class="klein" id="ingepakt">${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt</span></div>
    <ul class="paklijst">${k.map(x => `<li><input type="checkbox" data-v="${esc(x.item.id)}"${tas.afgevinkt.includes(x.item.id) ? ' checked' : ''} aria-label="${esc(x.item.naam)} ingepakt">
      ${x.item.foto ? `<img src="${esc(foto(x.item.foto, 120))}" alt="">` : `<span class="leeg">${stip(x.item.kleur[0], 20)}</span>`}
      <span>${esc(x.item.naam)}</span><span class="keer">${x.waarom ? esc(x.waarom) : x.keer + '×'}</span></li>`).join('')}</ul>
    ${thuis.length ? `<h3>Kan thuisblijven</h3><p class="klein" style="margin-top:0">Zit in geen van je gekozen outfits.</p>
      <div class="rij">${thuis.map(x => `<span class="chip">${esc(x.item.naam)}</span>`).join('')}</div>` : ''}
    <div class="rij" style="margin-top:14px">
      <button class="knop" id="kaarten" type="button">Alle kaarten opslaan</button>
      <button class="knop licht" id="bewaar" type="button">Tas bewaren</button>
    </div>
    <button class="knop vol" id="zet-vast" type="button" style="margin-top:10px">Klaar: zet mijn tas vast</button>` : ''}`;

  const opnieuw = () => { bewaarConcept(app); toonKeuze(el, app); };
  $('#compact').addEventListener('click', () => {
    const vast = u.plan.filter(p => !p.extra);
    compact(vast).forEach((o, n) => { vast[n].outfit = o; });
    opnieuw(); melding(`${koffer(u).length} stukken voor ${u.plan.filter(p => p.outfit).length} momenten`);
  });
  const wis = $('#wis'); if (wis) wis.addEventListener('click', () => { u.plan = u.plan.filter(p => !p.extra); u.plan.forEach(p => { p.outfit = null; }); opnieuw(); });
  koppelExtra(el, app, u, k, opnieuw, thuis.map(x => x.item));
  $$('[data-kies]', plek).forEach(b => b.addEventListener('click', () => {
    const [i, n] = b.dataset.kies.split('|').map(Number);
    u.plan[i].outfit = u.plan[i].opties[n]; opnieuw();
  }));
  $$('[data-meer]', plek).forEach(b => b.addEventListener('click', () => { tas.meer.push(+b.dataset.meer); toonKeuze(el, app); }));
  $$('[data-los]', plek).forEach(b => b.addEventListener('click', () => { u.plan[+b.dataset.los].outfit = null; opnieuw(); }));
  $$('[data-v]', plek).forEach(c => c.addEventListener('change', () => {
    tas.afgevinkt = c.checked ? tas.afgevinkt.concat(c.dataset.v) : tas.afgevinkt.filter(x => x !== c.dataset.v);
    bewaarConcept(app);
    const n = $('#ingepakt'); if (n) n.textContent = `${k.filter(x => tas.afgevinkt.includes(x.item.id)).length} van ${k.length} ingepakt`;
  }));
  $$('[data-p]', plek).forEach(kaart => kaart.addEventListener('click', e => {
    const p = u.plan[+kaart.dataset.p];
    if (!p.outfit) return;
    if (e.target.closest('[data-kleur]')) {
      return andereKleurBlad(app, p.outfit, { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen, uitsluiten: opties(app).uitsluiten },
        k.map(x => x.item.id).concat(tas.moetMee), nieuw => { p.outfit = nieuw; opnieuw(); });
    }
    if (e.target.closest('[data-stukerbij]')) {
      return stukErbij(app, p.outfit, { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen },
        k.map(x => x.item.id).concat(tas.moetMee), nieuw => { p.outfit = nieuw; opnieuw(); });
    }
    const st = e.target.closest('[data-slot]'); if (!st) return;
    wissel(app, p.outfit, st.dataset.slot, nieuw => { p.outfit = nieuw; opnieuw(); },
      { rapport: app.data.rapport, weer: p.weer, geheugen: app.staat().geheugen });
  }));
  const kn = $('#kaarten'); if (kn) kn.addEventListener('click', () => bewaarKaarten(u));
  const bw = $('#bewaar'); if (bw) bw.addEventListener('click', () => bewaarTas(app, u));
}

function openBewaard(el, app, id) {
  const t = app.staat().tassen.find(x => x.id === id);
  if (!t) return;
  tas.bestemming = t.naam; tas.start = t.datum; tas.dagen = t.dagen;
  tas.uitkomst = vanPlan(app, t.plan);
  tasTab(el, app);
}
const tel = plan => plan.reduce((t, p) => { if (p.outfit) t[p.outfit.kleur.methode] = (t[p.outfit.kleur.methode] || 0) + 1; return t; }, {});

// Stukken kiezen uit je kast: aantikken, nog eens tikken haalt het weg.
function kiesStukken(app, titel, begin, klaar) {
  const kast = app.kast();
  const gekozen = new Set(begin);
  const b = blad(`<h2>${esc(titel)}</h2><input class="veld" id="zz" placeholder="Zoek, bijv. trui of blauw">
    <div class="raster" id="zr" style="margin-top:10px"></div>
    <button class="knop vol" id="zk" type="button" style="position:sticky;bottom:0;margin-top:12px"></button>`);
  const knop = () => { $('#zk', b).textContent = `Klaar${gekozen.size ? ` (${gekozen.size})` : ''}`; };
  const teken = z => {
    $('#zr', b).innerHTML = kast.filter(i => !z || [i.naam, i.soort, ...i.kleur].join(' ').toLowerCase().includes(z))
      .map(i => tegel(i).replace('class="tegel"', `class="tegel${gekozen.has(i.id) ? ' gekozen' : ''}"`)).join('');
  };
  teken(''); knop();
  $('#zz', b).addEventListener('input', e => teken(e.target.value.toLowerCase().trim()));
  $('#zr', b).addEventListener('click', e => {
    const t = e.target.closest('[data-item]'); if (!t) return;
    const id = t.dataset.item;
    if (gekozen.has(id)) gekozen.delete(id); else gekozen.add(id);
    t.classList.toggle('gekozen', gekozen.has(id)); knop();
  });
  $('#zk', b).addEventListener('click', () => { b.sluit(); klaar([...gekozen]); });
}
