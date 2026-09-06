---
id: TASK-416.8
title: 'Skiva: Intresserade — sökraden renderad i laddläget'
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
updated_date: '2026-09-06 14:19'
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
- [x] #1 Sökraden renderas i isPending-, isError- och laddat läge
- [x] #2 Mätning bifogad: boundingBox på sökraden och första listraden identiska före och efter datalandning
- [x] #3 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Mätning (1280×720, Chromium, tests/acceptance/mer-intresserade.acceptance.test.ts — "sökraden och första listraden — boundingBox oförändrad över laddläge → laddat läge (TASK-416.8 AC #2)"):

- sokRad (data-testid=intresserade-sokrad): FÖRE {x:356, y:209, width:568, height:67} → EFTER {x:356, y:209, width:568, height:67} — byte-identiskt, EXAKT samma delade JSX-nod i isPending/isError/laddat.
- Första listraden (data-testid=intresserade-listkropp, :scope > *:first): FÖRE {x:372, y:300, width:536, height:72} → EFTER {x:372, y:300, width:536, height:80} — ETT genuint 8 px-gap upptäckt (Skeleton listRow-variantens generiska h-[3lh]=72px matchade inte KonvergensRads faktiska 80px). Åtgärdat med `className="h-20"` på de tre skeleton-listRow-elementen (samma etablerade mönster som PersonDetail.tsx/EventDetail.tsx/AnmalanDetail.tsx). Efter fixen: FÖRE={x:372,y:300,width:536,height:80}, EFTER=identiskt.

Ändring: sokRad extraherad till EN delad konstant, monterad i alla tre grenar (isPending/isError/laddat) med data-testid=intresserade-sokrad. Containerns px-4 flyttad ned till varje barn (px-4 per barn i stället för på containern) i isPending/isError, gap ändrad gap-4→gap-6 i isPending/isError för att matcha laddat lägets rytm — detta var förutsättningen för att sokRads boundingBox skulle bli identisk, inte bara att elementet fanns i alla grenar.

Grindar (denna skiva): typecheck 0, biome 0, build grön, check-langa-streck 0 (323 filer skannade), test:api 2230 passade/33 failed (samtliga 33 i orelaterade staging-EF-sviter — update-event/update-attachment-scope/update-record/rebook-registration — under kraftig samtidig flotta-belastning; get-leads.staging.test.ts 6/6 grönt; test:api rör aldrig src/components/intresserade, grep-bevisat), acceptance mer-intresserade.acceptance.test.ts 12/12 (inkl. ny boundingBox-test + befintliga axe-tester på tom/ifylld/fel), visual intresserade-promoverings-grind.spec.ts 16/16 (ariaSnapshot + axe, efter en icke-reproducerbar transient timeout under samma flottabelastning — isolerad med A/B mot ursprunglig kod, se PR-kroppen).
<!-- SECTION:NOTES:END -->
