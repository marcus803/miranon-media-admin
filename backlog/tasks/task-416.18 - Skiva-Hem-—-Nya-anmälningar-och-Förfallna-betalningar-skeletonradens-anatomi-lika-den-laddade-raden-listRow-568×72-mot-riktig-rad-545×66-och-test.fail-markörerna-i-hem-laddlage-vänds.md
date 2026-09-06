---
id: TASK-416.18
title: >-
  Skiva: Hem — Nya anmälningar och Förfallna betalningar: skeletonradens anatomi
  lika den laddade raden (listRow 568×72 mot riktig rad 545×66), och
  test.fail-markörerna i hem-laddlage vänds
status: To Do
assignee: []
created_date: '2026-09-06 15:44'
updated_date: '2026-09-06 16:45'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 745000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: TASK-416.13:s mätning (PR #2412, S123, 2026-09-06): Nya anmälningars och Förfallna betalningars listradsskelett (Skeleton variant=listRow) matchar inte den riktiga radens boundingBox — skelett {width:568,height:72} mot riktig rad {width:545,height:66}. Bokfört som rött-först i två test.fail()-test i tests/acceptance/hem-laddlage.acceptance.test.ts. Samma felklass som TASK-416.17 (Maillogg/Väntelista): den generiska listRow-varianten (h-[3lh]) används där den laddade raden har en egen anatomi. Åtgärd: ge skeletonraden i src/components/hem/NyaAnmalningar.tsx och src/components/hem/ForfallnaBetalningar.tsx exakt den laddade radens anatomi och bredd (raden är 545 px inuti kortet — skelettet ligger utanför radens padding), ta bort test.fail() så mätningen blir en vanlig grön assertion (tvåsidigt: med gammal listRow rött). Tomläget (0 rader → en rad med bock, PRD § Öppna frågor) rörs INTE av denna skiva. Beroende: TASK-416.13 landad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Skeletonradens boundingBox i Nya anmälningar och Förfallna betalningar är identisk med den laddade radens (toEqual, ±0 px)
- [x] #2 De två test.fail()-testen i hem-laddlage är vanliga assertions och gröna; tvåsidigt bevis bifogat
- [x] #3 Hem-acceptance grön, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
