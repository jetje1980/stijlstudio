// Alles wat jij verandert, in één staat: in de browser én in Supabase, zodat
// telefoon en laptop hetzelfde zien. De kast zelf komt uit data/kast.json;
// hier staan alleen jouw aanpassingen daarop.

const SLEUTEL = 'stijlstudio-v2';
// Synchroniseren gaat via de poortwachter (Supabase-functie griette-prive),
// met een wachtwoord dat alleen op dit toestel en op de server staat. De
// tabel zelf staat open voor wie de publieke sleutel uit de pagina haalt; daar
// schrijven we dus niet rechtstreeks naar.
const POORT = 'https://osuqtfsxmquwqsbgzlqn.supabase.co/functions/v1/griette-prive';
const WW = 'stijlstudio-wachtwoord';

export function wachtwoord() { try { return localStorage.getItem(WW) || ''; } catch (e) { return ''; } }
export function zetWachtwoord(w) { try { w ? localStorage.setItem(WW, w) : localStorage.removeItem(WW); } catch (e) {} }

async function poort(actie, extra = {}) {
  const r = await fetch(POORT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-griette-wachtwoord': wachtwoord() },
    body: JSON.stringify({ actie, tabel: 'stijl', key: SLEUTEL, ...extra }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.fout || 'opslag gaf ' + r.status);
  return d;
}

export const leeg = () => ({
  versie: 1, bijgewerkt: 0,
  items: {},          // id → aanpassingen op een stuk (labels, nagekeken, naam)
  nieuw: [],          // stukken die je in de nieuwe app toevoegde
  weg: [],            // verwijderde stukken
  outfits: null,      // null = nog niet overgenomen uit data/outfits.json
  mappen: null,
  gedragen: {},       // datum → [ids]
  geheugen: {},       // id → {weg, gekozen}: wat je wegwisselt of kiest
  tassen: [],
  kennis: [],         // jouw screenshots en notities
  gekocht: [],
});

let staat = leeg();
let luisteraars = [];
let wachtrij = null;
export let syncStatus = 'alleen op dit toestel';

export const lees = () => staat;
export function bij(fn) {
  fn(staat);
  staat.bijgewerkt = Date.now();
  try { localStorage.setItem(SLEUTEL, JSON.stringify(staat)); } catch (e) { console.warn('opslaan lukte niet', e); }
  clearTimeout(wachtrij);
  wachtrij = setTimeout(stuurNaarSupabase, 1500);
  luisteraars.forEach(l => l(staat));
}
export const luister = fn => luisteraars.push(fn);

export async function laad() {
  try {
    const lokaal = JSON.parse(localStorage.getItem(SLEUTEL) || 'null');
    if (lokaal) staat = { ...leeg(), ...lokaal };
  } catch (e) { /* lege of geblokkeerde opslag: verder met leeg */ }
  if (!wachtwoord()) return staat;
  try {
    const d = await poort('lees');
    const ver = d.value && JSON.parse(d.value);
    if (ver && ver.bijgewerkt > (staat.bijgewerkt || 0)) {
      staat = { ...leeg(), ...ver };
      try { localStorage.setItem(SLEUTEL, JSON.stringify(staat)); } catch (e) {}
    }
    syncStatus = 'gesynchroniseerd';
  } catch (e) { syncStatus = 'sync: ' + e.message; }
  return staat;
}

async function stuurNaarSupabase() {
  if (!wachtwoord()) return;
  try {
    await poort('schrijf', { value: JSON.stringify(staat) });
    syncStatus = 'gesynchroniseerd';
  } catch (e) { syncStatus = 'sync: ' + e.message; }
  luisteraars.forEach(l => l(staat));
}

// Na het instellen van een wachtwoord: kijken of het werkt, en meteen bewaren.
export async function probeerSync() {
  await poort('lees');
  await stuurNaarSupabase();
  return syncStatus;
}

// Eén bestand met alles, als vangnet.
export function exporteer() {
  const blob = new Blob([JSON.stringify(staat)], { type: 'application/json' });
  return new File([blob], `stijlstudio-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
}
