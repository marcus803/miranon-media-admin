---
id: TASK-416
title: >-
  PRD: Lottas första intryck — laddning utan hopp och utan väntan
  (skeleton-krom, förvärmning, bilagor på åtgärder)
status: To Do
assignee: []
created_date: '2026-09-06 13:19'
labels:
  - ready-for-human
dependencies: []
priority: high
ordinal: 726000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Bakgrund
Marcus 2026-09-06, före Lottas första prod-dag: skeleton ska helst aldrig visas, och visas det ska det sitta på rätt ställe så innehållet inte landar längre ned. Bilagorna på åtgärdssidan ska inte behöva laddas fram. GO i full bredd: fixa ALLT, proffsigt och ordentligt (S123 Del 1).

## Underlag (S123, read-only-audit mot origin/main 29a3c16d)
- Skeleton-audit (rapport D): ingen route har loader; all data laddas klientside; defaultPreload är osatt i src/router.ts. Startvärmningen (ADR-112) gör att Hem, Event, eventdetalj, Anmälningar, Väntelista, Intresserade, Maillogg och Segment normalt aldrig visar skeleton. Åtta vyer renderar laddläget utan sidans eget krom eller med fel radgeometri, så innehållet landar 60–320 px från skeletonets plats.
- Bilagor (rapport E): 1,0–1,6 s varm och 10,3 s vid kall EF, mätt mot staging. Rotorsak: hämtningen startar först när åtgärdsraden fälls ut (AtgardsSida.tsx:1838 i ArbetsYta, monteras vid arOppen rad 2101), ingen prefetch på avsikt, och get-event-attachments hämtar eventraden och de gemensamma bilagorna i sekvens fast de är oberoende (index.ts:268 före 300) samt chunkarna seriellt (rad 144–155).
- Regeln som de fungerande vyerna redan följer (EventsList, DokumentYta, AtgardsSida, EventDetail, PersonDetail, AnmalanDetail): sidkromet — chevron, h1, sidhuvud, filter-/sökrad, handlingsrad — renderas i ALLA query-tillstånd; bara datakroppen växlar mellan skeleton och innehåll. Skeletonets geometri = det laddade innehållets (ADR-113 laddtrappan, DESIGN-SYSTEM-SPEC §15).

## Kollisionsyta
S121 promoverar betalningssidan och bulkregistreringen till prod (PR #2378, #2380, #2383 rör BetalningsInkorg.tsx, RegistreraForm.tsx, useBekraftelsesteg.ts). Skivor som rör de filerna (inkorgen, registrera-steget, TASK-367) startas först när de PR:erna landat och byggs mot färsk main.

## Öppna frågor
- Förvärma ALLT? Research-pass mot primärkällor pågår (docs/research/forvarma-allt-branschmonster-2026-09-06.md). Resultatet kan ge en amendering av ADR-112/ADR-078 — eget beslut, inte i denna PRD.
- Hem-kortens tomläge (Nya anmälningar, Förfallna betalningar krymper 130 px när det visar sig vara tomt): skeleton som matchar vanligaste utfallet är ett designval — Marcus.

## Ej i scope
Demoläget (ADR-132), flytten till admin.miranon.se, QA-vandringarna som är Marcus egna.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
