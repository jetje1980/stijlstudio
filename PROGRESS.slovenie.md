# PROGRESS — /slovenie (www.stijlstudio.app/slovenie)

> Log hier elke afgeronde taak: datum | ID | omschrijving | gewijzigde bestanden.
> Gebruik dit bestand als context in Claude project chat.

## Taken

| Datum | ID | Status | Omschrijving | Bestanden |
|---|---|---|---|---|
| 2026-05-25 | setup | ✅ | Eerste pagina /slovenie aangemaakt (login, profielen, countdown) | slovenie.html |
| 2026-05-25 | setup | ✅ | Profielen: Duurt, Griette, Sanne, Arjen + kind-toevoegen | slovenie.html |
| 2026-05-25 | setup | ✅ | Dag-programma 27 jul – 14 aug, klaverjas scorebord + uitleg | slovenie.html |
| 2026-05-25 | setup | ✅ | Klaverjas teams: T1 = Sanne & Griette, T2 = Arjen & Duurt + wissel | slovenie.html |
| 2026-05-25 | S1 | ✅ | Etappe-planner heenreis: zondag 26 jul + maandag 27 jul | slovenie.html |
| 2026-05-25 | S2 | ✅ | Leaflet route-kaart + 12 markers + filter-toggles + gesyncte lijst | slovenie.html |
| 2026-05-25 | S3 | ✅ | Praktisch infoblok heenreis (vignet, Karawankentunnel, bestuurders) | slovenie.html |
| 2026-05-25 | S4 | ✅ | Naam Vroegzat → Zomer 2026, 5-tabs-nav, gezin-split, UX heenreis | slovenie.html |
| 2026-05-25 | U1a | ✅ | Wandelingen/hikes (4 niveaus + afstanden) in Info-tab | slovenie.html |
| 2026-05-25 | U1b | ✅ | Zwemmen & water (4 locaties + afstanden) in Info-tab | slovenie.html |
| 2026-05-25 | U1c | ✅ | 5 restaurants + specialiteiten + reserveringstip in Info-tab | slovenie.html |
| 2026-05-25 | U1d | ✅ | Spellen camper + camping-avond in Info-tab | slovenie.html |
| 2026-05-25 | U1e | ✅ | Leaflet kampkaart (Camp Bohinj) + afstandslijst + links in Info-tab | slovenie.html |
| 2026-05-25 | U1f | ✅ | 9 Bohinj-markers op kampkaart (hike/eten/strand/kamp) | slovenie.html |
| 2026-05-25 | extra | ✅ | Afstanden vanaf camp op alle swipekaartjes (te voet/fiets/auto/bus) | slovenie.html |
| 2026-05-25 | F | ✅ | CLAUDE.slovenie.md + PROGRESS.slovenie.md aangemaakt | CLAUDE.slovenie.md, PROGRESS.slovenie.md |
| 2026-05-25 | U7a | ✅ | Gedeeld vs. lokaal vastgelegd: Supabase voor profielen/scores/recepten/bingo/quiz, localStorage alleen UI-prefs | CLAUDE.slovenie.md |
| 2026-05-25 | U7b | ✅ | Supabase-tabellen aangemaakt: slovenie_config, _klaverjas_scores, _packlist, _recipes, _day_meals, _bingo_sessions/players/marks, _quiz_scores | Supabase migration |
| 2026-05-25 | U7c | ✅ | RLS + anon-policies: lezen + invoegen voor iedereen, buckets slovenie-recipes + slovenie-bingo publiek leesbaar | Supabase |
| 2026-05-25 | U7d | ✅ | slovenie.html: Supabase client init, klaverjas + inpaklijst async naar Supabase, localStorage-migratie + offline-fallback | slovenie.html |

## Datamodel U7 (aangemaakt in Supabase, project osuqtfsxmquwqsbgzlqn)

| Tabel / bucket | Doel |
|---|---|
| `slovenie_config` | key/value store (o.a. kv_teams) |
| `slovenie_klaverjas_scores` | potjes per ronde (roeper, troef, roep_team, roem, slagen, nat, pts) |
| `slovenie_packlist` | inpakstatus per profiel + item_id |
| `slovenie_recipes` | recepten + foto_url (U3) |
| `slovenie_day_meals` | wat eten we per dag/type (U3) |
| `slovenie_bingo_sessions` | autobingo-sessies (U5) |
| `slovenie_bingo_players` | spelers per sessie (U5) |
| `slovenie_bingo_marks` | afgevinkte vakjes + bewijsfoto (U5) |
| `slovenie_quiz_scores` | quizscores per profiel (U6) |
| bucket `slovenie-recipes` | receptfoto's, publiek leesbaar, max 2 MB |
| bucket `slovenie-bingo` | bingo-bewijsfoto's, publiek leesbaar, max 2 MB |

## Te verifiëren coördinaten

| Locatie | Coördinaten (gebruikt) | Opmerking |
|---|---|---|
| Limburg an der Lahn | 50.3856, 8.0599 | te verifiëren |
| Stellplatz am Dutzendteich, Neurenberg | 49.4270, 11.1250 | te verifiëren |
| Strandcamping Arneitz, Faaker See | 46.5800, 13.9050 | te verifiëren |
| Slap Savica | 46.2959, 13.7882 | te verifiëren (geocode op naam) |
| Mostnica-kloof / Hudičev most | 46.3090, 13.8886 | te verifiëren (geocode op naam) |
| Slap Mostnica (Voje-vallei) | 46.3290, 13.9051 | te verifiëren (geocode op naam) |
| Vogel kabelbaan dalstation | 46.2915, 13.8282 | te verifiëren (geocode op naam) |
| Pršivec (1761 m) | 46.3266, 13.8430 | te verifiëren (geocode op naam) |
| Srednja vas | 46.2882, 13.9342 | te verifiëren (geocode op naam) |
| Ribčev Laz | 46.2838, 13.9476 | te verifiëren (geocode op naam) |

## Te doen (uitvoervolgorde)

| Volgorde | ID | Status | Omschrijving |
|---|---|---|---|
| 1 | U7 | ✅ | Storage-fundament Supabase — klaar |
| 2 | U3 | ⬜ | Vertaaltool + gedeelde recepten + dag-maaltijden + camping-kaarten |
| 3 | U5 | ⬜ | Autospellen, bingo + foto's, kampvuurverhaal, waterspellen, weer-leedvermaak |
| 4 | U2 | ⬜ | Oostenrijk Appesbach: activiteiten + afstanden + kaart + 🟫-markerlaag |
| 5 | U4 | ⬜ | Huttentochten Bohinj (1/2 nachten, splitsing, hutten/parkeren/afstand) |
| 6 | U6 | ⬜ | Quiz Slovenië & Oostenrijk (🟢/🔴, koppelt aan scorelijst) |

## Openstaande beslispunten

- [ ] Meerkeuze A/B/C voor jongste spelers bij quiz (U6)?
- [ ] Overstap-etappe Bohinj → Appesbach (5 aug) op de route-kaart → toevoegen aan U2 of losse U8?

## Openstaand / later

- Camping Oostenrijk Appesbach: geboekt 5–12 aug
- Eventueel: kinderen als losse profielen (Lauren, Jort, Silas, Gijs, Ot)
