---
id: TASK-416.2
title: >-
  Skiva: Betalningsinkorgen — SidRam, sidhuvud, importknapp och FilterRad i
  laddläget (isPending vidare till primitiven)
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 728000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #1 (S123). src/components/betalningar/BetalningsInkorg.tsx:1339–1352 renderar laddläget som SidRam + h1 + tre skeleton-block, medan laddat läge (1458+) lägger in Importera kontoutdrag-knappen (1587–1601) och hela FilterRad (1603) med defaultOppen (1624, TASK-410) — utfälld panel med sökfält, tratt, rutnät och räknarrad, ~200–260 px. FilterRad-primitiven har redan laddläge i slutgeometri (FilterRad.tsx:298–318, 395–396) — samma form som EventsList.tsx:278–291. VÄNTAR: startas först när S121:s PR #2380 och #2383 (samma fil) landat; bygg mot färsk main. Åtgärd: rendera SidRam + header + importknapp + FilterRad isPending i alla tre grenarna; skeleton bara i kortlistan med kortets riktiga höjd.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sidhuvud, importknapp och utfälld FilterRad renderas i isPending-, isError- och laddat läge; FilterRad får isPending
- [ ] #2 Mätning bifogad: boundingBox på h1, FilterRad och första kortet identiska före och efter datalandning
- [ ] #3 Grenen är rebasad på main efter att #2380 och #2383 landat; inga konflikter kvar i BetalningsInkorg.tsx
- [ ] #4 Befintliga betalnings-e2e gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
