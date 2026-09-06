---
id: TASK-416.5
title: >-
  Skiva: Personer — skeletonradens anatomi lika den laddade raden (py-2.5,
  avatar size-9, text-caption) och räknarraden i linje
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 731000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #5 (S123). src/components/persons/PersonsList.tsx:852–884 (skeleton) mot 1015–1145 (laddad rad): skeleton py-3 + gap-1 + text-small på rad 2 + ingen avatar ≈ 95 px/rad; laddad rad py-2.5 + mt-1 + text-caption + size-9-avatar ≈ 84 px/rad → ~110 px drift på tio rader redan ovanför vikningen. Räknarraden: skeleton gap-4 flush-vänster (859) mot laddad gap-2 + px-4 (986–990). Filen bokför själv (118–124) att tio rader mot PAGE_SIZE 50 är en medveten avvikelse — det håller för antalet, inte för radens anatomi. Åtgärd: ge skeletonraden exakt den laddade radens anatomi (avatar-cirkel som skeleton, samma padding/typografi/gap) och räknarraden samma klasser; behåll tio rader.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Skeletonradens höjd och inre struktur är identisk med den laddade radens (DOM-mätt, ±0 px)
- [ ] #2 Räknarradens placering identisk före och efter datalandning
- [ ] #3 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
