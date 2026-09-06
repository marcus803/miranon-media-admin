---
id: TASK-416.19
title: >-
  Skiva: Anmälningar (mer/anmalningar) — status-annonseringen på fast position
  så header och FilterRad inte monteras om vid datalandning (fokus och inskriven
  söktext överlever)
status: To Do
assignee: []
created_date: '2026-09-06 16:37'
updated_date: '2026-09-06 17:24'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 746000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-agentens fynd på PR #2415 (TASK-416.2, S123, 2026-09-06), verifierat mot src/components/registrations/AnmalningarSida.tsx vid origin/main (~rad 838–848): i laddat läge skjuts <p role=status>N laddade</p> in FÖRE headerBlock (index 1), medan isPending/isError har headerBlock direkt efter sidRam (rad ~781–784/826–829). React reconcilerar barn positionellt utan keys, så header och FilterRad monteras om vid isPending→laddat och fokus/inskriven söktext tappas exakt vid landningen — det boundingBox-mätningen i TASK-416.4 inte kan se. Åtgärd: ett returträd med fasta positioner (förlaga TASK-416.8, Intresserade.tsx, PR #2395): status-annonseringen som sr-only <p role=status aria-live=polite> på fast position i alla tre grenar med tomt innehåll tills datan landat; därefter headerBlock, filterRadBlock, datakropp. Nytt acceptance-fall: fokus + inskriven text i FilterRads sökfält överlever isPending→laddat och isError→laddat, tvåsidigt bevisat. Beroende: ingen (416.4 landad).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Header och FilterRad har samma barnindex i isPending-, isError- och laddat läge (ett returträd, fasta positioner)
- [x] #2 Acceptance-test: fokus och inskriven söktext överlever isPending→laddat och isError→laddat, tvåsidigt bevisat
- [x] #3 Befintliga anmälnings-acceptance/visual-grinder gröna, axe-svep grönt, boundingBox-mätningen från 416.4 fortsatt identisk
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
