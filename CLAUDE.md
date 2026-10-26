# Stijl Studio

Persoonlijke stijlapp van Griette op stijlstudio.app (GitHub Pages, geen build-stap).
Taal in code, commentaar en UI: Nederlands, informeel (je/jij).

## Opbouw
- `index.html` + `app/` — de app. ES-modules, geen framework.
  - `app/kleur.js` — kleurfamilies en het herkennen van de kleurmanier (mono, ton-sur-ton, accent, analoog, split, colorblock).
  - `app/engine.js` — de stylist die rekent: rapportregels, sferen, wensen, weer, voorstellen, wisselen en de tas. Geen AI.
  - `app/ai.js` — de enige AI-aanroepen (labels uit een foto, "waarom", spiegelcheck) via de Supabase-functie `claude`.
  - `app/opslag.js` — jouw staat in localStorage, en sync via de functie `griette-prive` (alleen met wachtwoord).
  - `app/kaart.js` — outfitkaart rechtstreeks op canvas (geen html2canvas).
  - `app/tabs/` — Kast, Outfits, Tas, Stijl. `inspo.js`: inspiratiebeelden, de check "klopt dit?", je smaak van nu en "maak na".
- `data/` — kast, rapport, kennis en de startoutfits. `kast.json` is gemaakt door `tools/migreer.py` uit een backup van de oude app.
- De oude app (`griette.html`, `outfitkaart.html`, …) is weg; terug te halen uit commit `8cc14e0`. `tools/dump-oud.js` heeft hem nodig.

## Regels
- Rangorde: stijlrapport > stylingtheorie > trends/tips (die altijd met label).
- Rekenwerk in de engine, niet in de AI. AI alleen waar je moet kijken of formuleren.
- Een outfit die een rapportregel breekt (wijd op wijd, twee prints, …) wordt nooit voorgesteld.

## Na elke wijziging
- `python3 tools/versie.py` — nieuw versienummer en importmap in index.html, anders blijven telefoons oude code draaien.

## Testen
- `node tests/engine.test.mjs` — de motor op de echte kast.
- `node tests/app.test.cjs` — de hele app in Chromium (Playwright), offline.
- `node tests/tas-onthoud.test.cjs` — de tas blijft staan na opnieuw openen; datum schuift goed mee.
- `node tests/tas-kies.test.cjs` — "Ik kies uit mijn stukken": opties per moment, compact kiezen, keuze blijft staan.
- `node tests/ai.test.cjs` — de AI-functies met een nagebootste stylist (de echte is offline niet bereikbaar).
