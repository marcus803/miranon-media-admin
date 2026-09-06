---
id: TASK-416.8
title: 'Skiva: Intresserade — sökraden renderad i laddläget'
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: low
ordinal: 734000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #8 (S123). src/components/intresserade/Intresserade.tsx:204–226 (laddläge) saknar sökraden som laddat läge har på rad 289: ~62 px desktop / ~130 px mobil. intresserade.all värms, så exponeringen är låg. Åtgärd: rendera sökraden i alla grenar, skeleton bara i listkroppen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sökraden renderas i isPending-, isError- och laddat läge
- [ ] #2 Mätning bifogad: boundingBox på sökraden och första listraden identiska före och efter datalandning
- [ ] #3 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
