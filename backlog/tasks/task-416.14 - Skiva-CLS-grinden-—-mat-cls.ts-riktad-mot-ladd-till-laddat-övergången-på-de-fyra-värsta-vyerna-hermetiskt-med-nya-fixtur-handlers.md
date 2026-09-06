---
id: TASK-416.14
title: >-
  Skiva: CLS-grinden — mat-cls.ts riktad mot ladd-till-laddat-övergången på de
  fyra värsta vyerna, hermetiskt med nya fixtur-handlers
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 740000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §6, §8 (S123). tests/support/mat-cls.ts är en riktig CLS-mätare (PerformanceObserver layout-shift) men används bara på /dev/primitives. Ingen fil i tests/ mäter geometri över ladd-till-laddat-gränsen på en riktig vy. Fixturvärlden (tests/support/fixturvarld/handlers.ts:81–190) saknar handlers för get-attendance och betalnings-EF:erna. Åtgärd: acceptance-test som laddar Check-in, Betalningsinkorgen, Aktivitetshistorik och Anmälningar med fördröjda MSW-svar, mäter CLS från skeleton till innehåll och kräver CLS < 0,05 (Googles good-tröskel är 0,1; vi lägger oss under); nya handlers för get-attendance och de betalnings-EF:er som krävs. Beroende: skivorna för de fyra vyerna ska ha landat, annars rött-först. Grinden skyddar regeln sidkromet renderas i alla tillstånd mot regression.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Acceptance-test mäter CLS skeleton→innehåll på Check-in, Betalningsinkorgen, Aktivitetshistorik och Anmälningar; tröskel dokumenterad med källa
- [ ] #2 Fixtur-handlers för get-attendance och betalnings-EF:erna tillagda i fixturvärlden, kontraktsvakten grön
- [ ] #3 Tvåsidigt bevis: en avsiktlig geometri-avvikelse i en fixtur gör testet rött
- [ ] #4 Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
