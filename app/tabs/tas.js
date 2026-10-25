// De tas. Jij zegt alleen waar je heen gaat en wat je doet; de app rekent de
// koffer uit die de meeste goede outfits geeft, met verschillende kleurmanieren
// erin. Daarna stuur je bij: meer van een manier, of een stuk wisselen.
import { pakTas, meerVan, SFEREN, ACTIVITEITEN, herkenActiviteit } from '../engine.js';
import { METHODEN } from '../kleur.js';
import { esc, $, $$, foto, blad, melding, chips, stip, tegel } from '../ui.js';
import { outfitHtml, wissel, vanIds } from './outfits.js';
import { tekenKaart, deelOfBewaar } from '../kaart.js';

const MOMENTEN = [['reis', 'Reis'], ['ochtend', 'Ochtend'], ['dag', 'Overdag'], ['avond', 'Avond'], ['actief', 'Sport']];
// Wat sowieso thuisblijft. "open" = sandalen en slippers, ook met hak.
const NIET = [['rok', 'Rokken'], ['jurk', 'Jurken'], ['short', 'Shorts'], ['hakken', 'Hakken'], ['open', 'Open schoenen'], ['legging', 'Leggings']];
const DAGNAMEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

const vandaag = () => new Date().toISOString().slice(0, 10);
const tas = {
  bestemming: '', start: vandaag(), dagen: null, moetMee: [], niet: [], thuis: [], plaats: '', sfeer: [], afwisselen: false, sjiek: 0.5, schuif: false,
  seed: 1, uitkomst: null, filter: null, afgevinkt: [], ruil: null,
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

export default function tasTab(el, app) {
  if (!tas.dagen) tas.dagen = maakDagen(tas.start, 3);
  const opgeslagen = app.staat().tassen || [];
  el.innerHTML = `
    <h1>Tas</h1>
    <p class="sub">Waar ga je heen, en wat ga je doen? De rest reken ik uit.</p>
    <label class="lab">Bestemming</label>
    <div class="rij"><input class="veld" id="best" placeholder="bijv. Terschelling" value="${esc(tas.bestemming)}" style="flex:1">
      <button class="knop licht" id="weer" type="button">Weer</button></div>
    <div class="rij" style="margin-top:8px">
      <input class="veld" type="date" id="start" value="${esc(tas.start)}" style="flex:1">
      <select class="veld" id="aantal" style="flex:0 0 120px">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option${n === tas.dagen.length ? ' selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <p class="klein" id="weer-status"></p>
    <div id="dagen">${tas.dagen.map((d, n) => `<div class="dag" data-d="${n}">
      <div class="dag-kop"><b style="flex:1">${esc(d.naam)} <span class="klein">${esc(d.datum.slice(8))}-${esc(d.datum.slice(5, 7))}</span></b>
        <span class="klein">${d.temp == null ? '' : d.tempBron === 'zelf' ? 'zelf' : d.tempBron === 'voorspeld' ? 'voorspeld' : ''}</span>
        <input class="veld temp" type="number" inputmode="numeric" placeholder="°C" value="${d.temp ?? ''}" data-temp="${n}" aria-label="Temperatuur ${esc(d.naam)}"></div>
      ${chips('m' + n, MOMENTEN, d.momenten, { meer: true })}
      ${d.momenten.filter(m => m !== 'actief').map(m => doenRij(d, n, m)).join('')}</div>`).join('')}</div>

    <label class="lab">Wat niet mee</label>
    ${chips('niet', NIET, tas.niet, { meer: true })}
    <div class="rij" style="margin-top:4px">${tas.thuis.map(id => app.item(id)).filter(Boolean).map(i => `<button class="chip aan" data-th="${esc(i.id)}" type="button">${esc(i.naam)} ×</button>`).join('')}
      <button class="chip" id="kies-thuis" type="button">＋ stuk blijft thuis</button></div>

    <label class="lab">Moet mee</label>
    <div class="rij">${tas.moetMee.map(id => app.item(id)).filter(Boolean).map(i => `<button class="chip aan" data-mm="${esc(i.id)}" type="button">${esc(i.naam)} ×</button>`).join('')}
      <button class="chip" id="kies-mm" type="button">＋ stuk</button></div>
    <label class="lab">Sfeer (mag leeg, meer mag ook)</label>
    ${chips('sfeer', Object.entries(SFEREN).map(([k, v]) => [k, v.naam]), tas.sfeer, { meer: true })}
    ${tas.sfeer.length > 1 ? `<div class="chips"><button class="chip${!tas.afwisselen ? ' aan' : ''}" data-afw="0" type="button">Mengen in elke outfit</button><button class="chip${tas.afwisselen ? ' aan' : ''}" data-afw="1" type="button">Per moment afwisselen</button></div>` : ''}
    <div class="schuif"><span>comfy</span><input type="range" min="0" max="1" step="0.25" value="${tas.sjiek}" id="sjiek"><span>sjiek</span></div>
    <button class="knop vol" id="pak" type="button" style="margin-top:14px">Pak mijn tas</button>
    <div id="uitkomst" style="margin-top:18px"></div>
    ${opgeslagen.length ? `<h3>Bewaarde tassen</h3>${opgeslagen.slice().reverse().map(t => `<button class="chip" data-tas="${esc(t.id)}" type="button">${esc(t.naam)} · ${esc(t.datum)}</button>`).join(' ')}` : ''}`;

  // Bestemming en datum ingevuld: het weer komt vanzelf.
  let wacht;
  $('#best').addEventListener('input', e => { tas.bestemming = e.target.value; clearTimeout(wacht); wacht = setTimeout(() => haalWeer(el, app, true), 900); });
  $('#best').addEventListener('change', () => { clearTimeout(wacht); haalWeer(el, app, true); });
  $('#start').addEventListener('change', e => { tas.start = e.target.value; tas.dagen = maakDagen(tas.start, tas.dagen.length, tas.dagen); tasTab(el, app); haalWeer(el, app, true); });
  $('#aantal').addEventListener('change', e => { tas.dagen = maakDagen(tas.start, +e.target.value, tas.dagen); tasTab(el, app); haalWeer(el, app, true); });
  $$('[data-temp]', el).forEach(i => i.addEventListener('change', () => {
    const d = tas.dagen[+i.dataset.temp];
    d.temp = i.value === '' ? null : +i.value; d.tempBron = i.value === '' ? null : 'zelf';
  }));
  tas.dagen.forEach((d, n) => $$(`[data-chips="m${n}"] .chip`, el).forEach(b => b.addEventListener('click', () => {
    d.momenten = d.momenten.includes(b.dataset.w) ? d.momenten.filter(m => m !== b.dataset.w) : d.momenten.concat(b.dataset.w);
    d.momenten.sort((a, c) => MOMENTEN.findIndex(x => x[0] === a) - MOMENTEN.findIndex(x => x[0] === c));
    tasTab(el, app);
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
  $('#kies-thuis').addEventListener('click', () => kiesStuk(app, id => { if (!tas.thuis.includes(id)) tas.thuis.push(id); tasTab(el, app); }));
  $$('[data-chips="sfeer"] .chip', el).forEach(b => b.addEventListener('click', () => {
    const w = b.dataset.w; tas.sfeer = tas.sfeer.includes(w) ? tas.sfeer.filter(x => x !== w) : tas.sfeer.concat(w); tasTab(el, app);
  }));
  $$('[data-afw]', el).forEach(b => b.addEventListener('click', () => { tas.afwisselen = b.dataset.afw === '1'; tasTab(el, app); }));
  $('#sjiek').addEventListener('change', e => { tas.sjiek = +e.target.value; tas.schuif = true; });
  $$('[data-mm]', el).forEach(b => b.addEventListener('click', () => { tas.moetMee = tas.moetMee.filter(x => x !== b.dataset.mm); tasTab(el, app); }));
  $('#kies-mm').addEventListener('click', () => kiesStuk(app, id => { if (!tas.moetMee.includes(id)) tas.moetMee.push(id); tasTab(el, app); }));
  $('#weer').addEventListener('click', () => haalWeer(el, app, false));
  $('#pak').addEventListener('click', () => { tas.seed = 1; tas.filter = null; tas.ruil = null; reken(el, app); });
  $$('[data-tas]', el).forEach(b => b.addEventListener('click', () => openBewaard(el, app, b.dataset.tas)));
  if (tas.uitkomst) toonUitkomst(el, app);
}

// Activiteit per dagdeel: een keuzelijst, of zelf typen. Mag leeg blijven.
const MOMENT_NAAM = Object.fromEntries(MOMENTEN);
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
  } catch (e) { st.textContent = 'Geen weer gevonden (' + e.message + '). Vul de temperatuur zelf in.'; }
}

function opties(app) {
  return {
    dagen: tas.dagen.filter(d => d.momenten.length).map(d => ({ ...d, temp: d.temp ?? 15 })),
    rapport: app.data.rapport, sfeer: tas.sfeer, afwisselen: tas.afwisselen, sjiek: tas.schuif ? tas.sjiek : null,
    moetMee: tas.moetMee, seed: tas.seed, geheugen: app.staat().geheugen,
    uitsluiten: app.kast().filter(i => tas.thuis.includes(i.id) || tas.niet.includes(i.soort) || (tas.niet.includes('open') && i.open)).map(i => i.id)
      .filter(id => !tas.moetMee.includes(id)),
  };
}

function reken(el, app) {
  const plek = $('#uitkomst');
  if (!opties(app).dagen.length) { plek.innerHTML = '<p class="klein">Kies per dag minstens één moment.</p>'; return; }
  plek.innerHTML = '<p class="klein">Ik pak je tas… dit duurt een paar tellen.</p>';
  setTimeout(() => {
    tas.uitkomst = pakTas(app.kast(), opties(app));
    tas.afgevinkt = [];
    toonUitkomst(el, app);
    plek.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

// De koffer volgt uit het plan: wat in een outfit zit, gaat mee.
function koffer(u) {
  const tel = new Map();
  for (const p of u.plan) if (p.outfit) for (const i of p.outfit.items) tel.set(i.id, { item: i, keer: (tel.get(i.id)?.keer || 0) + 1 });
  for (const id of tas.moetMee) if (!tel.has(id) && u.koffer.find(k => k.item.id === id)) tel.set(id, { item: u.koffer.find(k => k.item.id === id).item, keer: 0 });
  return [...tel.values()].sort((a, b) => b.keer - a.keer);
}

function toonUitkomst(el, app) {
  const u = tas.uitkomst, plek = $('#uitkomst');
  if (!u || !plek) return;
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
      <div class="moment-kop"><h4>${esc(p.dag)} · ${esc(MOMENTEN.find(m => m[0] === p.moment)?.[1] || p.moment)}</h4><span class="klein">${esc([p.doen && p.doen.trim(), p.sfeer && SFEREN[p.sfeer].naam, p.weer].filter(Boolean).join(' · '))}</span></div>
      ${p.outfit ? outfitHtml(p.outfit) : '<p class="klein">Hier vond ik niets passends.</p>'}</div>`).join('')}

    <h3>Paklijst</h3>
    <ul class="paklijst">${k.map(x => `<li><input type="checkbox" data-v="${esc(x.item.id)}"${tas.afgevinkt.includes(x.item.id) ? ' checked' : ''} aria-label="${esc(x.item.naam)} ingepakt">
      ${x.item.foto ? `<img src="${esc(foto(x.item.foto, 120))}" alt="">` : `<span class="leeg">${stip(x.item.kleur[0], 20)}</span>`}
      <span>${esc(x.item.naam)}</span><span class="keer">${x.keer}×</span></li>`).join('')}</ul>
    <div class="rij" style="margin-top:14px">
      <button class="knop" id="kaarten" type="button">Alle kaarten opslaan</button>
      <button class="knop licht" id="bewaar" type="button">Tas bewaren</button>
      <button class="knop licht" id="opnieuw" type="button">Andere tas</button>
    </div>`;

  $$('[data-f]', plek).forEach(b => b.addEventListener('click', () => { tas.filter = tas.filter === b.dataset.f ? null : b.dataset.f; toonUitkomst(el, app); }));
  $$('[data-v]', plek).forEach(c => c.addEventListener('change', () => {
    tas.afgevinkt = c.checked ? tas.afgevinkt.concat(c.dataset.v) : tas.afgevinkt.filter(x => x !== c.dataset.v);
  }));
  $$('[data-zet]', plek).forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); tas.moetMee.push(a.dataset.zet); reken(el, app);
  }));
  $$('[data-p]', plek).forEach(kaart => kaart.addEventListener('click', e => {
    const st = e.target.closest('[data-slot]'); if (!st) return;
    const p = u.plan[+kaart.dataset.p];
    wissel(app, p.outfit, st.dataset.slot, nieuw => { p.outfit = nieuw; toonUitkomst(el, app); },
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
  $('#bewaar').addEventListener('click', () => {
    const naam = tas.bestemming || 'Weekendtas';
    app.bij(s => s.tassen.push({
      id: 't-' + Date.now().toString(36), naam, datum: tas.start, dagen: tas.dagen,
      plan: u.plan.map(p => ({ dag: p.dag, moment: p.moment, weer: p.weer, sfeer: p.sfeer || null, doen: p.doen || null, items: p.outfit ? p.outfit.items.map(i => i.id) : [] })),
    }));
    melding('Tas bewaard');
  });
  $('#kaarten').addEventListener('click', async () => {
    for (const p of u.plan) {
      if (!p.outfit) continue;
      const titel = `${p.dag} ${MOMENTEN.find(m => m[0] === p.moment)?.[1].toLowerCase() || ''}`;
      const c = await tekenKaart({ titel, ondertitel: `${tas.bestemming || 'Weekendtas'} · ${p.outfit.kleur.naam}`, items: p.outfit.items });
      const r = await deelOfBewaar(c, titel);
      if (r === 'geannuleerd') break;
      await new Promise(res => setTimeout(res, 500)); // een telefoon laat te snelle downloads vallen
    }
  });
}

function openBewaard(el, app, id) {
  const t = app.staat().tassen.find(x => x.id === id);
  if (!t) return;
  const ctx = { rapport: app.data.rapport, geheugen: app.staat().geheugen };
  tas.bestemming = t.naam; tas.start = t.datum; tas.dagen = t.dagen;
  const plan = t.plan.map(p => ({ ...p, outfit: p.items.length ? vanIds(app, p.items, { ...ctx, weer: p.weer }) : null }));
  const ids = [...new Set(t.plan.flatMap(p => p.items))];
  tas.uitkomst = { plan, koffer: ids.map(i => ({ item: app.item(i), keer: 0 })).filter(x => x.item), extra: [], perManier: tel(plan), ontbreekt: [] };
  tasTab(el, app);
}
const tel = plan => plan.reduce((t, p) => { if (p.outfit) t[p.outfit.kleur.methode] = (t[p.outfit.kleur.methode] || 0) + 1; return t; }, {});

function kiesStuk(app, klaar) {
  const kast = app.kast();
  const b = blad(`<h2>Wat moet mee?</h2><input class="veld" id="zz" placeholder="Zoek"><div class="raster" id="zr" style="margin-top:10px"></div>`);
  const teken = z => { $('#zr', b).innerHTML = kast.filter(i => i.naam.toLowerCase().includes(z)).map(i => tegel(i)).join(''); };
  teken('');
  $('#zz', b).addEventListener('input', e => teken(e.target.value.toLowerCase()));
  $('#zr', b).addEventListener('click', e => { const t = e.target.closest('[data-item]'); if (t) { b.sluit(); klaar(t.dataset.item); } });
}
