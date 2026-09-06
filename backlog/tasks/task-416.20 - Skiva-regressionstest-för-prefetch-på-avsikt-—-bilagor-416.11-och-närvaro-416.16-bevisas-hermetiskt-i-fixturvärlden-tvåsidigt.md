---
id: TASK-416.20
title: >-
  Skiva: regressionstest för prefetch på avsikt — bilagor (416.11) och närvaro
  (416.16) bevisas hermetiskt i fixturvärlden, tvåsidigt
status: To Do
assignee: []
created_date: '2026-09-06 17:12'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 749000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-info på PR #2399 (TASK-416.11) och PR #2403 (TASK-416.16), S123. Prefetchen på hover/fokus/sidmount saknar ett test som blir rött om någon tar bort den — regeln (ADR-078 beslut 3) skyddas i dag bara av prosa. Åtgärd: acceptance-test i fixturvärlden (tests/support/fixturvarld) som (1) monterar eventdetaljen, hovrar/fokuserar Gå till åtgärder resp. Check-in-ingången, och asserterar via MSW-räknare att get-event-attachments resp. get-attendance anropats FÖRE klick; (2) navigerar och asserterar att bilagor/närvaro renderas utan laddläge (ingen aria-busy, ingen skeleton) eftersom cachen är varm; (3) sidmount-prefetchen: räknaren ≥ 1 efter mount utan interaktion. Tvåsidigt bevis: en temporär bortkoppling av prefetchen (t.ex. via test-only env eller genom att köra testet mot en commit före 416.11) ska ge rött; bokför körningen. Hermetik-självtestet ska falla med OmockadRequestError för varje test (aldrig test.fail, se lessons-fragmentet om test.fail). Beroende: TASK-416.16 landad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test bevisar prefetch på hover/fokus för bilagor och närvaro (EF-anrop före klick, MSW-räknare) och sidmount-prefetchen för bilagor
- [ ] #2 Test bevisar att målvyn renderas utan laddläge efter prefetch (ingen aria-busy/skeleton)
- [ ] #3 Tvåsidigt bevis bokfört: utan prefetch är testet rött
- [ ] #4 npm run test:acceptance:sjalvtest grönt för filen; Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
