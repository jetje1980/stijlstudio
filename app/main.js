// Opstarten: data laden, jouw aanpassingen erover, en de juiste tab tonen.
import { zetHex } from './kleur.js';
import { zetRapport } from './ai.js';
import * as opslag from './opslag.js';
import { $, $$ } from './ui.js';
import kastTab from './tabs/kast.js';
import outfitsTab from './tabs/outfits.js';
import tasTab from './tabs/tas.js';
import stijlTab from './tabs/stijl.js';

const TABS = { kast: kastTab, outfits: outfitsTab, tas: tasTab, stijl: stijlTab };

export const app = {
  data: {},
  // De kast zoals hij nu is: basis + jouw aanpassingen + wat je toevoegde.
  kast() {
    const s = opslag.lees();
    const weg = new Set(s.weg);
    return this.data.kast.concat(s.nieuw)
      .filter(i => !weg.has(i.id))
      .map(i => s.items[i.id] ? { ...i, ...s.items[i.id] } : i);
  },
  item(id) { return this.kast().find(i => i.id === id); },
  outfits() { return opslag.lees().outfits || []; },
  mappen() { return opslag.lees().mappen || []; },
  bij: opslag.bij,
  staat: opslag.lees,
  // Hoe vaak en wanneer droeg je iets?
  draaglog() {
    const log = {};
    for (const [d, ids] of Object.entries(opslag.lees().gedragen)) for (const id of ids) (log[id] ||= []).push(d);
    for (const l of Object.values(log)) l.sort().reverse();
    return log;
  },
  onthoud(id, soort) {
    opslag.bij(s => { const g = (s.geheugen[id] ||= { weg: 0, gekozen: 0 }); g[soort]++; });
  },
  ga(hash) { location.hash = hash; },
  ververs() { toon(); },
};

async function start() {
  const [kast, rapport, kennis, outfits, rapportOutfits] = await Promise.all(
    ['kast', 'rapport', 'kennis', 'outfits', 'rapport-outfits'].map(n => fetch(`data/${n}.json`).then(r => r.json())));
  app.data = { kast, rapport, kennis, rapportOutfits, startOutfits: outfits };
  zetHex(kennis.kleuren);
  zetRapport(rapport);
  await opslag.laad();
  // Eerste keer: je bestaande outfits en draaglog overnemen.
  if (!opslag.lees().outfits) {
    opslag.bij(s => {
      s.outfits = outfits.outfits;
      s.mappen = outfits.mappen;
      for (const [d, ids] of Object.entries(outfits.gedragen || {})) s.gedragen[d] = ids;
    });
  }
  opslag.luister(() => { const el = $('.sync'); if (el) el.textContent = opslag.syncStatus; });
  window.addEventListener('hashchange', toon);
  toon();
}

let huidig = null;
function toon() {
  const [tab, ...rest] = (location.hash.slice(1) || 'kast').split('/');
  const t = TABS[tab] ? tab : 'kast';
  $$('.tabs a').forEach(a => a.classList.toggle('aan', a.dataset.tab === t));
  const scherm = $('#scherm');
  if (huidig !== t) window.scrollTo(0, 0);
  huidig = t;
  TABS[t](scherm, app, rest.map(decodeURIComponent));
}

start().catch(e => {
  console.error(e);
  $('#scherm').innerHTML = `<p class="leeg-melding">De app kon niet starten: ${e.message}</p>`;
});
