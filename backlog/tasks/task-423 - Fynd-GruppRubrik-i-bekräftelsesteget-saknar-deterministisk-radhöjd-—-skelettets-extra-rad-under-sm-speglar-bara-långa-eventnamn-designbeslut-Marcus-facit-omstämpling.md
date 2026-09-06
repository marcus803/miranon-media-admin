---
id: TASK-423
title: >-
  Fynd: GruppRubrik i bekräftelsesteget saknar deterministisk radhöjd —
  skelettets extra rad under sm speglar bara långa eventnamn (designbeslut
  Marcus, facit-omstämpling)
status: To Do
assignee: []
created_date: '2026-09-06 19:18'
labels:
  - ready-for-human
dependencies: []
priority: low
ordinal: 753000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-runda 2 och 3 på PR #2420 (TASK-416.6, Opus, S123 2026-09-06). GruppRubrik i src/components/betalningar/prototype/VariantC.tsx (rad ~268–279, h2 font-semibold text-lg utan truncate/whitespace-nowrap) radbryter till två rader under Tailwinds sm-brytpunkt när eventnamn + datum inte får plats. Skelettet i Bekraftelsesteget.tsx reserverar därför en extra Skeleton-rad bakom sm:hidden — kalibrerad mot fixturens 29-teckensnamn (mätt 49,5 px vid 390 px), medan samma fixtur bär 23- och 22-teckensnamn som ryms på en rad och då ger ett hopp på 24,75 px åt andra hållet. Skelettet kan inte veta gruppnamnen i förväg (de kommer ur laddad data), så lösningen ligger i rubriken själv: ge GruppRubrik en deterministisk radhöjd (whitespace-nowrap + truncate, eller en fast två-radershöjd) så skelettet alltid matchar. Det ändrar renderingen i den facit-låsta filen och kräver Marcus stämpel + omstämpling av promoverings-grindens ariaSnapshot/skärmdumpar (ADR-102). Bokförd kant i Bekraftelsesteget.tsx docblock, testfilens docblock och 416.6:s notes. Inte ready-for-agent förrän Marcus valt form.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
