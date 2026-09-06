---
id: TASK-416.7
title: >-
  Skiva: Platser och Eventinnehåll — skeleton ritas inuti samma kortcontainer
  som den laddade listan
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 733000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #7 (S123). src/components/platser/PlatserYta.tsx:240–251 och src/components/eventinnehall/EventinnehallYta.tsx:203–209 renderar 2–3 fristående textblock (~24 px styck) medan laddat läge är en divide-y rounded-xl bg-surface-kortlista med py-3-rader (~48 px). Sidkromet står rätt; bara listkroppen byter form. Åtgärd: rita skeleton inuti samma kortcontainer med samma radhöjd (greppet finns i AktivitetsHistorik.tsx:436–447).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Skeleton i båda vyerna ligger i samma kortcontainer med samma radhöjd som den laddade raden
- [ ] #2 Mätning bifogad: boundingBox på kortcontainern identisk före och efter datalandning
- [ ] #3 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
