---
id: TASK-422
title: >-
  Fynd: tests/e2e/atgarder-kvitto.staging.test.ts:482 fäller sedan TASK-402.8
  tog bort Obekräftad-pillen — testet uppdaterades aldrig
status: To Do
assignee: []
created_date: '2026-09-06 19:17'
labels:
  - ready-for-agent
dependencies: []
priority: medium
ordinal: 752000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: bygg-agenten för TASK-367 (PR #2416, S123 2026-09-06) vid full betalnings-e2e-svep, bekräftat av review-runda 2 (Opus) som verifierade att PR:en inte rör filen. tests/e2e/atgarder-kvitto.staging.test.ts:482 asserterar toBeChecked() på en checkbox namngiven /Erik Holm Obekräftad Markerad/ som inte längre finns: VariantC.tsx:s docblock (rad ~868) bokför att Obekräftad-pillen togs bort från bekräftelsestegets kort i TASK-402.8 (PR #2378 → 6c999f2f, 2026-09-06). Testet fäller konsekvent i staging-sviten men syns inte i PR-CI (staging-jobben skippas på PR-ytan, run_staging: false) — det syns först i nightly/post-merge staging. Åtgärd: uppdatera assertionens tillgängliga namn till den form kortet har efter 402.8 (läs VariantC.tsx och promoverings-grindens ariaSnapshot), kör filen mot staging (mutex), bokför att ingen annan assertion i filen bygger på pillen. Triage ADR-053: blockerar ej, värdefullt — registrerat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Testet asserterar kortets tillgängliga namn i formen efter TASK-402.8; filen grön mot staging
- [ ] #2 Grep i tests/e2e efter 'Obekräftad' bekräftar att ingen annan assertion bygger på den borttagna pillen (eller de rättas i samma PR)
- [ ] #3 Post-merge staging-körningen grön för filen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
