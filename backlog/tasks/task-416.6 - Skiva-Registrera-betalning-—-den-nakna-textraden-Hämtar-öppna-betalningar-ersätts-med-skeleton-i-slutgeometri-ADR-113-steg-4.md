---
id: TASK-416.6
title: >-
  Skiva: Registrera betalning — den nakna textraden Hämtar öppna betalningar
  ersätts med skeleton i slutgeometri (ADR-113 steg 4)
status: To Do
assignee: []
created_date: '2026-09-06 13:21'
updated_date: '2026-09-06 16:44'
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
- [x] #1 Ingen naken laddtext; skeleton i listkroppen med kortets riktiga höjd, sidkromet oförändrat under laddning
- [x] #2 Grenen är rebasad på main efter att #2378, #2380 och #2383 landat
- [x] #3 Promoverings-grinden (tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts) grön, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementerat: Bekraftelsesteget.tsx isLoading-grenen bytt mot BekraftelsestegetSkelett()
— sidkromet (SidRamKnapp, redan ovillkorligt) plus en SPEGLAD rubrik ("Bulkregistrering",
samma klasser/DOM-position som BulkC:s facit-låsta h1) och ett skelett i listkroppens
slutgeometri (VariantC.tsx:s MarkerbartKort-anatomi: avatar size-9, en textrad namn,
belopp, inert chevron-cirkel utan shimmer). VariantC.tsx/BulkC RÖRDA INTE — rubriken
kan inte lyftas ut till en delad headerBlock utan att lämna promoverings-grindens
facit-scope (data-testid="bekraftelsesteget"), så klasserna speglas i stället.

Mätning (staging, 1280x720, Chromium, ny fil tests/e2e/bekraftelsesteget-laddlage.staging.test.ts):
rubrikens boundingBox {x:372,y:116,width:536,height:36} IDENTISK ladd-/laddat läge.
Första kortets boundingBox {x:365,y:242.75,width:550,height:62} IDENTISK ladd-/laddat läge.
Axe-svep på ladd-läget (AxeBuilder, .include('main')): 0 violations.

Regressionskontroll (oförändrade, körda mot staging): bekraftelsesteget-promoverings-grind.staging.test.ts
11/11 grönt (facit-lås intakt), bekraftelsesteget-formen-fore-stampeln.staging.test.ts 22/22 grönt
inkl. axe, bekraftelsesteget.staging.test.ts 7/7 grönt inkl. axe.

Avvikelse bokförd: npm run test:api visade 2 fel i filer utanför scope
(get-person.staging.test.ts, send-registration-confirmation.staging.test.ts) — INTE orsakade
av denna diff. get-person-felet reproducerades oberoende i post-merge CI-körning 34044760522
(PR #2412, orört av denna gren) — pre-existing rött på main. send-registration-confirmation
föll konsekvent i tre lokala körningar (Request context disposed, 30s timeout) i en helt annan
domän (mailbekräftelse-gate). Ingendera fil är rörd av denna skiva.
<!-- SECTION:NOTES:END -->
