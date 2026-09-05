---
id: TASK-402.4
title: >-
  Skiva: Kontoutdraget in i bekräftelsesteget — importens sista steg med fyra
  radtillstånd inom C:s form
status: To Do
assignee: []
created_date: '2026-09-05 19:02'
labels:
  - ready-for-agent
dependencies:
  - TASK-402.3
parent_task_id: TASK-402
ordinal: 700000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Filläsning och kolumnmappning står kvar i inkorgen under 'Importera kontoutdrag'; när matchningen är gjord öppnas bekräftelsesteget med importens rader i stället för importens gamla bekräftelselista. Varje importrad bär sitt tillstånd som märke på kortet: säker (förbockad, belopp och datum från bankraden), osäker med kandidater (under 'Behöver din hand' med kandidaterna som förslagsknappar), omatchad (under 'Behöver din hand' med sökfält för anmälan) och dubblett (visas låst utan kryss, aldrig registrerbar). En redan importerad bankrad bockas aldrig i; dubblettskyddet på bankreferensen och 409-svaret är oförändrade. Registreringen och efterläget är stegets vanliga. Tillstånden prövades inte i prototypen: formen designas inom C:s form (kortet, hand-högen, förslagsknapparna) och varje avvikelse från facit bokförs som AMENDERING-fil med bilder i facit-katalogen för Marcus granskning i QA. Täcker användarberättelser: 20, 21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bekräftelsesteget med importrader är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'utgångsläget' för säkra rader; osäkra, omatchade och dubbletter följer C:s kortform och 'Behöver din hand'-form och är frysta som AMENDERING-bilder i facit-katalogen
- [ ] #2 Säker rad: förbockad med bankradens belopp och datum; osäker rad: i 'Behöver din hand' med kandidaterna som förslagsknappar; omatchad rad: i 'Behöver din hand' med sökfält för anmälan; dubblett: låst utan kryss och kan inte registreras
- [ ] #3 Importens gamla bekräftelselista är riven; filläsning och kolumnmappning i inkorgen är oförändrade; parsern rörs inte
- [ ] #4 En redan importerad bankrad (bankreferens finns) bockas aldrig i, och registrering av en dubblett avvisas av servern som i dag (409) — bevisat i staging-e2e
- [ ] #5 Staging-e2e täcker de fyra tillstånden ände till ände från importerad fil till registrerade inbetalningar; api-pure täcker tillståndsklassningen som ren funktion
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
<!-- DOD:END -->
