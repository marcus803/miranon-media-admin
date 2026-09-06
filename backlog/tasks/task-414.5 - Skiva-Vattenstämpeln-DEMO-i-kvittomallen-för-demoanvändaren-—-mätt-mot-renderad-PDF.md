---
id: TASK-414.5
title: >-
  Skiva: Vattenstämpeln DEMO i kvittomallen för demoanvändaren — mätt mot
  renderad PDF
status: To Do
assignee: []
created_date: '2026-09-06 10:38'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-414
ordinal: 720000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ett demokvitto ska vara byggt av samma mall och samma maskineri som ett skarpt, men gå att skilja från ett riktigt om Lotta sparar eller vidarebefordrar det (Bokios mönster, ADR-132 beslut 6). Skivan ger kvittomallen en diskret vattenstämpel DEMO som renderas när kvittot tillhör demoanvändaren/demomiljön och aldrig annars; markeringen bär både synlig text och maskinläsbar text (pdftotext hittar den). Mallens sidhuvud, rutor, typsnitt och geometri rörs inte — förlagan är facit. Läs README:ns § Förlagorna före varje malländring. Täcker användarberättelser: 7, 8.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ett kvitto renderat för demoanvändaren i staging bär vattenstämpeln DEMO (pdftotext hittar texten, pdftotext -bbox ger dess position); ett kvitto för en annan användare i staging och ett i prod bär den inte (tvåsidigt)
- [ ] #2 Mallens övriga geometri, typsnitt och färger är oförändrade mot förlagan: pdffonts och pdftotext -bbox på ett kvitto utan stämpel är identiska före och efter ändringen
- [ ] #3 Vattenstämpelns villkor nycklas på demoanvändaren/tenant_key demo, inte på miljön (staging utan demo ger ingen stämpel)
- [ ] #4 Förhandsgranskningen visar samma stämpel som det skickade kvittot (samma mall-väg)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — mallmätningen körs lokalt och mot staging
- [ ] #5 Facit-granskning: kvittomallen jämförs mot förlagan 2026-08-03 kvitto-forlaga.pdf enligt docs/mallar/bilagor/README.md § Förlagorna — form, typsnitt och geometri oförändrade utanför vattenstämpeln; mätt med npm run mall:pdf, pdftotext -bbox och pdffonts, aldrig ögonmätt
<!-- DOD:END -->
