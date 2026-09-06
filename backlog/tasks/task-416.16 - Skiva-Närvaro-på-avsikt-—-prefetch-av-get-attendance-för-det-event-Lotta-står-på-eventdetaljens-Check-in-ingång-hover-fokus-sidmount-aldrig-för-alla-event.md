---
id: TASK-416.16
title: >-
  Skiva: Närvaro på avsikt — prefetch av get-attendance för det event Lotta står
  på (eventdetaljens Check-in-ingång, hover/fokus + sidmount), aldrig för alla
  event
status: To Do
assignee: []
created_date: '2026-09-06 13:27'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 743000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: research-passet docs/research/forvarma-allt-branschmonster-2026-09-06.md § 5 (b) punkt 2–3 och Dom (S123, orkestrerarens beslut på Marcus mandat 2026-09-06: bygg ordentligt eller inte alls — förvärm ALLT byggs INTE, 68 s mot 9 s-taket vid 57 event, ingen branschledare gör det). Rapport D §3: Check-in (/event/$eventId/narvaro) visar laddläget varje gång eftersom get-attendance inte värms (isPending = event || attendance || registrations, EventCheckin.tsx:211). Åtgärd, samma mönster som TASK-416.11 för bilagor och husets EventCard.tsx:38–58 / TabBar.tsx:65 (ADR-078 beslut 3): (1) prefetchQuery av attendance-nyckeln vid hover/fokus på Check-in-ingången i eventdetaljen (hitta länken/knappen i src/components/events/detail/), (2) prefetchQuery vid eventdetaljens sidmount för DET eventet (Lotta står redan på det; kostnad ett EF-anrop), (3) valfritt och mätt: på Hem, prefetch av attendance för Nästa event när eventet är i dag (dörrlistan är sannolikt nästa steg) — bara om mätningen visar att det inte förlänger Hem:s tid till interaktiv. Använd prefetchQuery, aldrig ensureQueryData (ADR-078 beslut 1). Samma query-nyckel som EventCheckin använder så cache-träffen är exakt. Mät: tid från klick på Check-in till listan synlig, före/efter, vid varm och kall cache mot staging.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hover/fokus på Check-in-ingången i eventdetaljen prefetchar attendance för eventet (nätverksanrop syns före klick)
- [ ] #2 Eventdetaljens sidmount prefetchar attendance för det eventet; ingen prefetch sker för andra event
- [ ] #3 Mätning bifogad: Check-in visar listan utan laddläge efter normal navigering från eventdetaljen (varm), och tid till lista före/efter vid kall cache
- [ ] #4 ADR-078 beslut 1 respekterat: navigeringen blockeras aldrig; befintliga check-in-tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
