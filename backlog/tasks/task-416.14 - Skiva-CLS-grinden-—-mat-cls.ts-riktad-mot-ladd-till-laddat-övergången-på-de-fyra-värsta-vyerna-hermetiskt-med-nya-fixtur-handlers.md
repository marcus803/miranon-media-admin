---
id: TASK-416.14
title: >-
  Skiva: CLS-grinden — mat-cls.ts riktad mot ladd-till-laddat-övergången på de
  fyra värsta vyerna, hermetiskt med nya fixtur-handlers
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
updated_date: '2026-09-06 18:53'
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
- [x] #3 Tvåsidigt bevis: en avsiktlig geometri-avvikelse i en fixtur gör testet rött
- [ ] #4 Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #1 — PARTIELLT (3 av 4 vyer), orkestrerar-godkänd exkludering: Check-in/Aktivitetshistorik/Anmälningar mätta och gröna (CLS-tabell i testfilens docblock); Betalningsinkorgen UTESLUTEN — playwright.config.ts hårdkodar VITE_FEATURE_BETALNINGAR: 'av' för acceptance-dev-servern, betalningar.tsx:s beforeLoad redirectar till /mer när flaggan är av, kan därför inte navigeras till hermetiskt (samma öppna yta som TASK-409, task/409-hermetisk-betalningsvarld). Tröskel 0,05 källmärkt mot web.dev/cls 'good' <= 0,1. Mätta CLS-tal (2026-09-06, tests/acceptance/laddning-cls.acceptance.test.ts): Check-in desktop 0.00005029601520962185 / mobil 0.00016544980087904352; Aktivitetshistorik desktop 0.00003987630208333333 / mobil 0.01482668511841718; Anmälningar desktop 0 / mobil 0.

AC #2 — get-attendance fanns redan (kortets 'saknas troligen' var inaktuellt, verifierat mot handlers.ts). hamta-oppna-betalningar-handlern TILLAGD (handlers.ts, importerar OPPNA_BETALNINGAR_RESPONSE ur fixture-data.ts som redan fanns på grenen) — förberedd infrastruktur, ej exercised av något test i denna skiva (Betalningsinkorgen utesluten, se AC #1). 'Kontraktsvakten grön' EJ VERIFIERAT AV MIG: projektet 'kontraktsvakt' körs uteslutande i nightly.yml mot live Supabase-staging (tests/kontraktsvakt/staging-test-filer) — kräver secrets/access jag varken har eller ska använda i denna skiva. Sökte även efter en 'kontraktsvakt'-referens i ci.yml: ingen träff (endast i nightly.yml) — bokför som en obelagd uppdrags-premiss (ADR-086), inte utförd.

AC #3 — Tvåsidigt bevis KORT, ej i fixtur-data utan i en KOMPONENT-KLASS (matchar uppdragets egen formulering om en tillfallig lokal skeleton-klassandring som aterstalls, inte kortets aldre i-en-fixtur-ordalydelse): FramstegskortD i EventCheckin.tsx, ett persisterande sidkroms-element som aldrig unmountas over isPending-till-laddat, fick temporart style height 2000 medan isPending. Check-in mobil 390x844 gick DETERMINISTISKT rott, CLS 0.05173770879479808 storre an 0.05, bit-identiskt over tva oberoende korningar. Check-in desktop forblev gront vid SAMMA andring, vantat eftersom CLS-impact ar viewport-relativ, inte ett testfel. Regressionen aterstalldes via versionskontrollens checkout-kommando pa enbart den filen, aldrig via stash, och bekraftades gront igen med samma tal som normallaget efterat.

AC #4 — EJ verifierat av mig (CI-svansen ägs av orkestreraren per agent-kontraktet). Lokalt gröna: npm run typecheck exit 0, npx @biomejs/biome check . exit 0 (endast pre-existing varningar i orörda filer), node scripts/check-langa-streck.mjs exit 0 (0 src/-ändringar i denna diff), npm run test:acceptance -- tests/acceptance/laddning-cls.acceptance.test.ts 6/6 gröna (tre körningar), npm run test:acceptance:sjalvtest -- samma fil: 6/6 fällda med OmockadRequestError, 'BEVISET HÅLLER', inget test.fail/test.fixme använt, npm run build exit 0.

Rörda filer: tests/support/fixturvarld/handlers.ts (ny hamta-oppna-betalningar-handler + import), tests/support/mat-cls.ts (extraherade installeraLayoutShiftObservator/lasAvClsSumma ur matCLS, matCLS själv oförändrad i beteende, ny matCLSOverNavigering för navigeringsmätning som installerar observatorn FÖRE page.goto via addInitScript), tests/acceptance/laddning-cls.acceptance.test.ts (ny fil, 6 test: 3 vyer x 2 viewports). fixture-data.ts (OPPNA_BETALNINGAR_RESPONSE) var redan committad av föregångaren pa grenen (882adc0a), orörd av mig i denna skiva.
<!-- SECTION:NOTES:END -->
