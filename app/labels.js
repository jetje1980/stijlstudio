// Het labelformulier, gedeeld door "toevoegen" en de labelcheck.
import { esc, stip } from './ui.js';

export const SOORT_ROL = {
  't-shirt': 'boven', top: 'boven', topje: 'boven', longsleeve: 'boven', blouse: 'boven', trui: 'boven', sporttop: 'boven',
  vest: 'laag', gilet: 'laag', blazer: 'laag', teddy: 'laag',
  jas: 'jas', trenchcoat: 'jas',
  jeans: 'onder', broek: 'onder', pantalon: 'onder', rok: 'onder', short: 'onder', legging: 'onder',
  jurk: 'heel', 'co-ord': 'heel',
  sneakers: 'schoen', loafers: 'schoen', hakken: 'schoen', laarzen: 'schoen', sandalen: 'schoen',
  tas: 'tas', riem: 'accessoire', sjaal: 'accessoire', pet: 'accessoire', muts: 'accessoire', sieraad: 'accessoire', zonnebril: 'accessoire',
  zwemkleding: 'zwem',
};
export const TEXTUREN = ['glad', 'glans', 'fijn gebreid', 'grof gebreid', 'pluizig', 'denim', 'linnen', 'leer', 'suède', 'kant', 'structuur', 'metaal'];
export const PRINTS = ['', 'streep', 'stip', 'ruit', 'luipaard', 'bloem', 'camouflage', 'patchwork'];
export const PASVORMEN = ['aansluitend', 'recht', 'wijd', 'kort'];
// De snit van een onderstuk; de grove pasvorm volgt daaruit.
export const BROEK_SNIT = ['recht', 'slim', 'wide leg', 'flared', 'bootcut', 'barrel', 'ballon', 'cargo', 'culotte', 'palazzo', 'mom'];
export const ROK_SNIT = ['recht', 'A-lijn', 'plissé', 'wikkel', 'potlood'];
const SNIT_PASVORM = { barrel: 'wijd', ballon: 'wijd', flared: 'wijd', cargo: 'wijd', culotte: 'wijd', palazzo: 'wijd',
  'wide leg': 'wijd', recht: 'recht', mom: 'recht', bootcut: 'recht', slim: 'aansluitend' };

const select = (naam, opties, waarde) =>
  `<select class="veld" name="${naam}">${opties.map(o => `<option value="${esc(o)}"${o === (waarde ?? '') ? ' selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`;
const knoppen = (naam, opties, waarde) =>
  `<div class="chips wrap" data-veld="${naam}">${opties.map(([w, l]) => `<button type="button" class="chip${String(w) === String(waarde) ? ' aan' : ''}" data-w="${esc(w)}">${l}</button>`).join('')}</div>`;

export function formulier(item, kleuren) {
  const kl = kleuren.map(k => k.naam);
  return `<form class="labelform">
    <label class="lab">Naam</label><input class="veld" name="naam" value="${esc(item.naam || '')}">
    <label class="lab">Wat is het</label>${select('soort', Object.keys(SOORT_ROL), item.soort)}
    <label class="lab">Kleur ${stip(item.kleur?.[0] || 'multi', 12)}</label>
    <div class="rij">${select('kleur1', kl, item.kleur?.[0])}${select('kleur2', [''].concat(kl), item.kleur?.[1] || '')}</div>
    <label class="lab">Print</label>${select('print', PRINTS, item.print || '')}
    <label class="lab">Grootte van de print</label>${knoppen('printGroot', [['klein', 'klein / fijn'], ['groot', 'groot']], item.printGroot)}
    <label class="lab">Textuur</label>${select('textuur', TEXTUREN, item.textuur)}
    <label class="lab">Materiaal</label><input class="veld" name="materiaal" value="${esc(item.materiaal || '')}" placeholder="weet ik niet mag ook">
    <label class="lab">Pasvorm</label>${knoppen('pasvorm', PASVORMEN.map(p => [p, p]), item.pasvorm)}
    <div data-onder${['onder'].includes(SOORT_ROL[item.soort] || item.rol) ? '' : ' hidden'}>
      <label class="lab">Snit</label>${select('snit', [''].concat(item.soort === 'rok' ? ROK_SNIT : BROEK_SNIT), item.snit || '')}
      <label class="lab">Taille</label>${knoppen('taille', [['hoog', 'hoog'], ['midden', 'midden'], ['laag', 'laag']], item.taille)}
      <label class="lab">Lengte</label>${knoppen('lengte', (item.soort === 'rok' ? ['mini', 'midi', 'maxi'] : ['cropped', 'volle lengte']).map(x => [x, x]), item.lengte || (item.soort === 'rok' ? '' : 'volle lengte'))}
    </div>
    <label class="lab">Warmte</label>${knoppen('warmte', [[1, 'licht'], [2, 'midden'], [3, 'warm']], item.warmte)}
    <label class="lab">Hoe net</label>${knoppen('formeel', [[1, 'heel casual'], [2, 'casual'], [3, 'net casual'], [4, 'netjes'], [5, 'chic']], item.formeel)}
    <label class="lab">Comfort</label>${knoppen('comfort', [[1, 'stijf'], [2, '·'], [3, 'gewoon'], [4, '·'], [5, 'heerlijk']], item.comfort)}
    <label class="lab">Seizoen</label>${knoppen('seizoen', [['zomer', 'zomer'], ['altijd', 'altijd'], ['winter', 'winter']], item.seizoen)}
  </form>`;
}

export function koppel(root) {
  const soort = root.querySelector('.labelform [name="soort"]');
  const onder = root.querySelector('.labelform [data-onder]');
  if (soort && onder) soort.addEventListener('change', () => { onder.hidden = SOORT_ROL[soort.value] !== 'onder'; });
  root.querySelectorAll('.labelform [data-veld] .chip').forEach(b => b.addEventListener('click', () => {
    b.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('aan'));
    b.classList.add('aan');
  }));
}

export function leesFormulier(root) {
  const f = root.querySelector('.labelform');
  const v = n => f.elements[n] && f.elements[n].value;
  const knop = n => { const a = f.querySelector(`[data-veld="${n}"] .chip.aan`); return a ? a.dataset.w : null; };
  const soort = v('soort');
  const uit = {
    naam: v('naam').trim(), soort, rol: SOORT_ROL[soort] || 'accessoire',
    kleur: [v('kleur1'), v('kleur2')].filter(Boolean),
    print: v('print') || null, textuur: v('textuur'), materiaal: v('materiaal').trim() || null,
    pasvorm: knop('pasvorm') || 'recht', warmte: +knop('warmte') || 2,
    formeel: +knop('formeel') || 3, comfort: +knop('comfort') || 3, seizoen: knop('seizoen') || 'altijd',
  };
  if (uit.print && knop('printGroot')) uit.printGroot = knop('printGroot');
  // een sandaal met hak blijft een open schoen; die vlag niet wissen
  if (soort === 'sandalen') uit.open = true;
  if (uit.rol === 'onder') {
    const snit = v('snit');
    if (snit) { uit.snit = snit; if (SNIT_PASVORM[snit]) uit.pasvorm = SNIT_PASVORM[snit]; }
    const taille = knop('taille'); if (taille) uit.taille = taille;
    const lengte = knop('lengte'); if (lengte && lengte !== 'volle lengte') uit.lengte = lengte;
  }
  return uit;
}
