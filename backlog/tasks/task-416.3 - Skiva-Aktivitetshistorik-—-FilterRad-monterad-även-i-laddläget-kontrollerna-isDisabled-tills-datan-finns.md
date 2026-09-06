---
id: TASK-416.3
title: >-
  Skiva: Aktivitetshistorik — FilterRad monterad även i laddläget, kontrollerna
  isDisabled tills datan finns
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 729000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #3 (S123). src/components/aktivitetshistorik/AktivitetsHistorik.tsx:763–773 (laddläge) mot 797–828 (laddat). Den vy-lokala FilterRad (definierad 471–566, anropad 817) — tidsperiod-toggle min-h-11, två Selects, datumfält, ~195 px desktop / ~250 px mobil — monteras bara i den laddade grenen; filens egen kommentar (454–455) bokför det som medvetet för fokus-beteendet men geometrikonsekvensen är obokförd. activityLog.history värms inte (startvärmningen värmer latest(4)), så laddläget nås varje gång. Åtgärd: montera FilterRad i isPending med kontrollerna isDisabled (event-Selecten är redan isDisabled={eventerLaddar}); bevara fokus-beteendet som kommentaren skyddar och uppdatera kommentaren; skeleton i listkroppen inuti samma kortcontainer (greppet finns redan i filen rad 436–447).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 FilterRad renderas i isPending-läget med kontrollerna disabled; fokus-beteendet som kommentaren 454–455 skyddar är oförändrat (test)
- [ ] #2 Mätning bifogad: boundingBox på h1, FilterRad och första listraden identiska före och efter datalandning
- [ ] #3 Kommentaren i filen uppdaterad så den beskriver den nya formen
- [ ] #4 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
