---
id: TASK-404
title: >-
  Fynd: post-merge-jobbet Staging (API + E2E) går 11m35s mot sitt 12-minuterstak
  — attempt 1 avbröts på 12m16s (5c7a8a9d), fem öppna larm av samma klass
status: To Do
assignee: []
created_date: '2026-09-05 21:05'
updated_date: '2026-09-05 22:53'
labels:
  - ready-for-human
dependencies: []
ordinal: 705000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mätt 2026-09-05 (S121 resume 3): post-merge-körningen 33989193147 på main 5c7a8a9d fick 'Staging (API + E2E)' cancelled efter 12m16s (steget 'E2E tests (staging)'), jobbets eget timeout-minutes: 12 i ci-suite.yml (TASK-178 Done: rotorsaken fastställd, utlösande overrun ej fastställt). Omkörningen (attempt 2) gick grön på 11m35s (20:52:03→21:03:38Z) — 25 sekunder från taket. Larmärendena #2359 (5c7a8a9d), #2348 (ba91a7d4, S120), #2337/#2336/#2335 (2026-09-04) bär samma signatur ('suite (cancelled)'); de stängdes med motivering när attempt 2 var grön (trädet 5c7a8a9d bär samtliga). PRD TASK-402:s skivor 402.1–402.5 lägger var och en till staging-e2e-fall i samma svit (inkorgens utskicksflöde, bekräftelsesteget, importen, Åtgärds-sidan) — sviten kommer att passera taket. Beslutet är Marcus/CI-sessionens: höj taket (som TASK-383 gjorde för acceptance-självtestet, 12→20), dela sviten i två jobb, eller mät per fil och flytta det som inte behöver staging till fixturvärlden. Uppföljningskortet TASK-383 (per-fil-mätning) är To Do.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Per-fil-väggklocka för tests/e2e/*.staging.test.ts ur jobbloggen 33989193147 attempt 2 (playwright --reporter=json eller loggens tidsstämplar) bokförd i kortet, sorterad fallande
- [ ] #2 Beslut fattat och verkställt (höjt tak, delad svit eller flytt till fixturvärlden) med commit-SHA; post-merge-körningen efter verkställandet grön med marginal ≥ 3 min mot taket
- [ ] #3 TASK-383 korsrefererad eller sammanslagen; inget dubbelt kort
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
INSTANS 2 (2026-09-05 22:52 UTC): post-merge run 33996542511 på main 364f75b9 (#2360, TASK-402.2 som lade till två staging-e2e-fall): Staging (API + E2E) grön i attempt 1 men 22:40:28→22:52:14Z = 11m46s — 14 sekunder från taket. Marginalen krymper per skiva; 402.3 lägger till fler fall.
<!-- SECTION:NOTES:END -->
