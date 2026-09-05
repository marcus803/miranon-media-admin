---
id: TASK-402.6
title: >-
  Skiva: Rivningen efter Marcus stämpel — varianterna A/B, växlaren,
  simuleringslagret och facit-markörerna
status: To Do
assignee: []
created_date: '2026-09-05 19:03'
labels:
  - ready-for-human
dependencies:
  - TASK-402.3
parent_task_id: TASK-402
ordinal: 702000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus granskar den promoverade ytan mot facit-bilderna (desktop 1440 och iPad 820) och stämplar godkand i facit.json via stämplingsskriptet (ADR-104: kanalseparation, aldrig självbetjäning). Därefter rivs prototypens substrat mekaniskt i EN landning (ADR-103 B2 steg 4): varianterna A och B, växlaren och sök-parametern variant, simuleringslagret och fixturen (om inte fixturen lever vidare som testdata — då flyttas den till testernas fixturvärld), och de fem prototyp-markörerna i facit-policyn städas i samma commit (TASK-192-regeln). Det som rivs är villkor och växlar, aldrig formen. Steget bär efteråt inga prototyp-markörer. Täcker användarberättelser: 33, 34.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 facit.json för s121-bekraftelsesteget-konvergens bär godkand med Marcus kvittens, datum och stämpel-SHA, satt via stämplingsskriptet
- [ ] #2 Varianterna A och B, växlaren, sök-parametern variant och simuleringslagret är borta ur källkoden; steget renderar C:s form utan villkor
- [ ] #3 De fem markörerna för S121 i facit-policyn är borttagna i samma commit som rivningen; facit-grinden är grön
- [ ] #4 Efter rivningen är steget identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i samtliga fem lägen (ariaSnapshot mot referenserna, visual-baslinjen omtagen)
- [ ] #5 Prototyp-PR:n (#2325) stängs som superseded av promoveringens landningar, med pekare till dem
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
- [ ] #5 facit.json för s121-bekraftelsesteget-konvergens stämplad godkand via stämplingsskriptet efter Marcus granskning (desktop och iPad 820); rivningen av varianterna A/B, växlaren och simuleringslagret samt städningen av de fem markörerna i facit-policyn görs i SAMMA landning (ADR-103 B2 steg 4)
<!-- DOD:END -->
