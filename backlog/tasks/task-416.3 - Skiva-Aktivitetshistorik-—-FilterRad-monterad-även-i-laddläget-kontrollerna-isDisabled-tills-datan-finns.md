---
id: TASK-416.3
title: >-
  Skiva: Aktivitetshistorik — FilterRad monterad även i laddläget, kontrollerna
  isDisabled tills datan finns
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
updated_date: '2026-09-06 14:23'
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
- [x] #1 FilterRad renderas i isPending-läget med kontrollerna disabled; fokus-beteendet som kommentaren 454–455 skyddar är oförändrat (test)
- [x] #2 Mätning bifogad: boundingBox på h1, FilterRad och första listraden identiska före och efter datalandning
- [x] #3 Kommentaren i filen uppdaterad så den beskriver den nya formen
- [x] #4 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Matning (AC 2), hall-bar mock mot get-activity-log (tests/acceptance/mer-aktivitetshistorik-laddlage.acceptance.test.ts), Chromium 1280x720. FORE fix (LaddLage hade bara en platshallarrad): h1={x:372,y:116,w:536,h:36} (samma i bada lagen), FilterRad={x:356,y:168,w:568,h:190} (samma i bada lagen), radPending={x:389,y:412,w:502,h:67}, radLoaded={x:389,y:441,w:502,h:64} -- avvikelse 29px i Y + 3px i hojd (LaddLage saknade platshallare for statusraden 'Visar N poster.' och dagsgruppens rubrik; skeleton-radens textkolumn bar ett extra mellanrum den riktiga raden saknar). EFTER fix (LaddLage omstrukturerad, extra mellanrummet borttaget): radPending={x:389,y:441,w:502,h:64}, radLoaded={x:389,y:441,w:502,h:64} -- exakt identiska (toEqual, 0px avvikelse), h1 och FilterRad identiska genomgaende. Falsifiering: samma fyra test korda mot koden fore denna skivas andring (kallfilerna tillfalligt aterstallda till huvudgrenens version) -- 3 av 4 foll rott, 1 (fokus-genom-filterbyte) var redan gron sedan tidigare (regressionsvakt for oforandrat beteende). Kallfilerna aterstallda till sitt fixade skick igen efterat.
<!-- SECTION:NOTES:END -->
