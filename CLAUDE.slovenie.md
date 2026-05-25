# CLAUDE — pagina /slovenie (www.stijlstudio.app/slovenie)

> Bewaar dit als `CLAUDE.slovenie.md` in de projectroot.
> Verwijs ernaar vanuit root-`CLAUDE.md` met `@CLAUDE.slovenie.md` onder het kopje `## Pagina: /slovenie`.

## Project (alleen /slovenie)
Reisplanner Zomer 2026 — Slovenië & Oostenrijk voor 2 gezinnen (kinderen 11–19 jaar).
- **Gezin 1** (camper, heenreis): Duurt & Griette
- **Gezin 2** (al ter plekke): Arjen & Sanne
- Bestemming: Camp Bohinj / Camp Zlatorog, Ukanc 5, SI-4265 Bohinjsko jezero (46.2789, 13.8377)
- Vertrek gezin 1: zondag 26 juli 17:00 vanaf Barista de Dominee, Schalkwijk (NL)
- Nachtrit tot Neurenberg, maandag 27 juli vroeg door. Totaal ±1.050 km.

## Bestand
- Alles in één bestand: `slovenie.html`
- Geen aparte CSS/JS-bestanden
- localStorage voor alle persistente state (swipes, klaverjas, inpaklijst, teams, profielen)
- Wachtwoord: SLOVENIE
- Storage key prefix: `slov26`

## Navigatie (5 tabs)
Home | Heenreis | Programma | Spellen | Info
- Heenreis-tab: gezin 1 ziet volledige route; gezin 2 ziet "Jullie zijn er al!"
- Activiteiten-swipe: bereikbaar via Home ("Snel naar"), niet in de bottom-nav

## Kaarten
- Leaflet 1.9.4 + OpenStreetMap (geen API-key)
- Heenreis-kaart (`hr-map`): lazy init bij eerste bezoek Heenreis-tab
- Bohinj-omgevingskaart (`bohinj-map`): lazy init bij openen collapsible in Info-tab
- Beide kaarten: `invalidateSize()` aanroepen na tab-switch / collapsible-open

## Stijl/UX
- Rustige, frisse look (berg/water), mobiel-first
- Font: DM Sans (Google Fonts)
- Kleurenpalet: --bg:#F0E8E2 · --accent:#4A9E6E · profielkleuren per persoon
- Markercategorieën vaste kleuren:
  🟦 Zwemmen/SUP #4A7CC4 · 🟩 Mooie stop #4A9E6E · 🟧 Camperplek #E8943A · ⭐ Bestemming #E8C000
  🟡 Kamp #E8C000 · 🟢 Hike #4A9E6E · 🟠 Eten #E8943A · 🔵 Strand #4A7CC4

## Werkafspraken
- Taak-IDs: `S#` = reisexpert-brief · `U#` = eigen opdracht
- Log uitsluitend in `PROGRESS.slovenie.md` — nooit in andere PROGRESS-bestanden
- Na elke taak: regel toevoegen aan PROGRESS (datum | ID | omschrijving | bestanden) + status ✅
- Niets verzinnen — onzekere data noteren als "te verifiëren" in PROGRESS
- Bouw NOOIT in één antwoord (output-limiet 32k tokens) — werk blok voor blok
