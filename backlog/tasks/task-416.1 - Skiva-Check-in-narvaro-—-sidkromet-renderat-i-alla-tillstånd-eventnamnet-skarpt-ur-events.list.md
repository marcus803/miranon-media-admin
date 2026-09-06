---
id: TASK-416.1
title: >-
  Skiva: Check-in (narvaro) — sidkromet renderat i alla tillstånd, eventnamnet
  skarpt ur events.list
status: To Do
assignee: []
created_date: '2026-09-06 13:19'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 727000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #2 (S123). src/components/events/EventCheckin.tsx:1210–1221 renderar laddläget som en textrad + tre kort, medan laddat läge (rad 920+) har SidRam (948), h1 Check-in + eventnamn/datum (954–961), FramstegskortD (962), sessionsval, sökfält och meta-rad. isPending = event || attendance || registrations (rad 211) och attendance värms inte, så laddläget nås varje gång. Innehållet landar ~250–320 px längre ned än skeletonet. Åtgärd: bryt ut sidkromet till en hjälpare som renderas i alla grenar (mönstret i EventDetail.tsx/PersonDetail.tsx), rendera eventnamn och datum skarpt via placeholderData ur den värmda events.list-cachen (samma trick som EventDetail.tsx:76–78), och lägg skeleton enbart i listkroppen med samma radgeometri som den laddade raden. Mät före/efter: boundingBox på h1 och första listraden under laddning och efter data ska vara identiska (tests/support/mat-cls.ts eller boundingBox-toEqual som i tests/e2e/events-list.staging.test.ts:486–535). Fixturvärlden saknar handler för get-attendance (tests/support/fixturvarld/handlers.ts) — lägg till om mätningen görs hermetiskt.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sidkromet (SidRam, h1, eventnamn/datum, framstegskort, sökfält) renderas identiskt i isPending-, isError- och laddat läge; bara listkroppen växlar
- [ ] #2 Eventnamn och datum visas skarpt under laddning via placeholderData ur events.list
- [ ] #3 Mätning bifogad: boundingBox på h1 och första listraden är identiska före och efter datalandning (toEqual)
- [ ] #4 Befintliga e2e/acceptance för check-in gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
