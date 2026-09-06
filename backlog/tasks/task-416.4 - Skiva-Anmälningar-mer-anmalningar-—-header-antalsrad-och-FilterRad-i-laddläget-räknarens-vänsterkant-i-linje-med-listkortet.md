---
id: TASK-416.4
title: >-
  Skiva: Anmälningar (mer/anmalningar) — header, antalsrad och FilterRad i
  laddläget, räknarens vänsterkant i linje med listkortet
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 730000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #4 (S123). src/components/anmalningar/AnmalningarSida.tsx:652–679 (laddläge) mot 694–773 (laddat): saknar header med h1 (text-2xl) + antalsrad och FilterRad (744), ~110–120 px; skeleton-räknaren står flush-vänster medan listan sitter i ett -mx-4-kort så vänsterkanten flyttar. registrations.all värms, så exponeringen är låg men slår vid warmup-timeout, offline→online och efter 24 h persist-utgång. Åtgärd: rendera header + FilterRad i alla grenar, lägg skeleton i samma kortcontainer med samma radgeometri som den laddade raden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Header, antalsrad (skeleton för talet) och FilterRad renderas i isPending-, isError- och laddat läge
- [ ] #2 Skeleton-rader ligger i samma -mx-4-kort som den laddade listan; vänsterkanten är identisk
- [ ] #3 Mätning bifogad: boundingBox på h1, FilterRad och första listraden identiska före och efter datalandning
- [ ] #4 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
