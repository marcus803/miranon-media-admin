---
id: TASK-416.14
title: >-
  Skiva: CLS-grinden — mat-cls.ts riktad mot ladd-till-laddat-övergången på de
  fyra värsta vyerna, hermetiskt med nya fixtur-handlers
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
updated_date: '2026-09-06 19:47'
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
- [ ] #3 Tvåsidigt bevis: en avsiktlig geometri-avvikelse i en fixtur gör testet rött
- [ ] #4 Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVIEW-RUNDA 2 (PR #2426, Opus, 2026-09-06): konvergerad, 3 info i ny prosa bokförda här utan kodändring: (1) mat-cls.ts lasAvClsSumma-docblocket påstår att page.evaluate inte kan returnera undefined — playwright-core serialiserar undefined ({v:'undefined'}); null-sentinelen är ett val, inte ett krav. (2) Engångskontraktet och fail-closed-uppräkningen nämner 'hård omnavigering mitt i en mätning'/'dokumentet ersatt' som skyddade fall — vid riktig navigering får det nya dokumentet ett färskt window (vakten hjälper inte, lasAvClsSumma läser 0 utan att kasta); luckan är latent (inga anropare) och ska namnges öppet. (3) hallbarCheckin saknar förlagans startvärmnings-undantag för get-registrations (eventId-gren) — fungerar eftersom allt släpps samtidigt, men 'samma form som förlagan' ska nyanseras. ÖPPET FÖR MARCUS: AC #1–#3 är felställda mot instrumentet (sid-CLS blind för listkroppen; Betalningsinkorgen kräver TASK-409; kontraktsvakten bor i nightly) — DoD #1 kan inte uppfyllas utan beslut om AC-texterna; grinden skyddar sidkromets stabilitet, radgeometrin bärs av *-laddlage-filernas boundingBox-tester.
<!-- SECTION:NOTES:END -->
