---
id: TASK-416.6
title: >-
  Skiva: Registrera betalning — den nakna textraden Hämtar öppna betalningar
  ersätts med skeleton i slutgeometri (ADR-113 steg 4)
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 732000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #6 (S123). src/components/betalningar/Bekraftelsesteget.tsx:146–147 visar en naken textrad som enda laddbesked — exakt den form husets laddtrappa förbjuder (DESIGN-SYSTEM-SPEC §15 / ADR-113 steg 4, citerad ordagrant i PersonsList.tsx:842–843). VÄNTAR: startas först när S121:s PR #2378 (bekräftelsestegets form före stämpeln) och #2380/#2383 landat; bygg mot färsk main och mot stegets DÅ gällande form. Åtgärd: sidkromet renderat, skeleton i listkroppen med samma radgeometri som bekräftelsestegets kort.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ingen naken laddtext; skeleton i listkroppen med kortets riktiga höjd, sidkromet oförändrat under laddning
- [ ] #2 Grenen är rebasad på main efter att #2378, #2380 och #2383 landat
- [ ] #3 Promoverings-grinden (tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts) grön, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
