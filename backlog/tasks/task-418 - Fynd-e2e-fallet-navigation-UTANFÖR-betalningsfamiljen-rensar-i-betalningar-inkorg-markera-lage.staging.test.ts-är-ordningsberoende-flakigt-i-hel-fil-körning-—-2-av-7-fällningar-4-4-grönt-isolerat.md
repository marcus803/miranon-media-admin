---
id: TASK-418
title: >-
  Fynd: e2e-fallet 'navigation UTANFÖR betalningsfamiljen rensar' i
  betalningar-inkorg-markera-lage.staging.test.ts är ordningsberoende flakigt i
  hel-fil-körning — 2 av 7 fällningar, 4/4 grönt isolerat
status: To Do
assignee: []
created_date: '2026-09-06 14:37'
labels:
  - ready-for-agent
dependencies: []
ordinal: 744000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mätt av slutvarvs-agenten för TASK-402.8 (S121 resume 4, 2026-09-06, Opus): tests/e2e/betalningar-inkorg-markera-lage.staging.test.ts § 'navigation UTANFÖR betalningsfamiljen rensar' fällde 2 av 7 försök i hel-fil-körning (även vid loadavg 23) men var 4/4 grön i isolering vid loadavg 25 — alltså ordnings-/tillståndsberoende inom filen, inte ren last. Samma fall rapporterades som 'känd flake, grön isolerad' av inkorg-agenten vid 410/411/412:s livekörningar (14/15, 24/25). Filen kom med TASK-410/411 (landade #2379/#2380) och rör markera-läget (TASK-402.1). Trolig klass: delat tillstånd mellan fall (markeringen i sessionStorage/URL-state som ett tidigare fall lämnar kvar, eller navigationens rensning som race mot invalidering). Utred med riggen (npm run metrics:flake, aldrig egen mätserie — CLAUDE.md § Flakighet), isolera rotorsaken (test-ordning, delad fixtur, väntevillkor), laga testet eller — om appen faktiskt inte rensar deterministiskt — appen; bokför vilket. Ingen retry-maskering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rotorsaken fastställd med belägg (vilket tillstånd/ordning som läcker) och bokförd i kortet
- [ ] #2 Fallet grönt i hel-fil-körning i minst tio interfolierade körningar via metrics:flake, utan retries
- [ ] #3 Om appen ändrades: eget test som låser rensningen; om testet ändrades: kommentar som förklarar beroendet som bröts
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
