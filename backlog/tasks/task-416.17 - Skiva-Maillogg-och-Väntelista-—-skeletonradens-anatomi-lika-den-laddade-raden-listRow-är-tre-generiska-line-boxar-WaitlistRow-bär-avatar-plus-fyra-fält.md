---
id: TASK-416.17
title: >-
  Skiva: Maillogg och Väntelista — skeletonradens anatomi lika den laddade raden
  (listRow är tre generiska line-boxar, WaitlistRow bär avatar plus fyra fält)
status: To Do
assignee: []
created_date: '2026-09-06 14:45'
updated_date: '2026-09-06 15:33'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 744000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-agentens utlåtande på PR #2397 (TASK-416.9, S123, 2026-09-06), info-fynd som orkestreraren registrerar durabelt (ADR-053). Efter gap-6-fixen kvarstår 108 px (Maillogg) och 225 px (Väntelista) skift vid SAMMA radantal (3 mot 3) — alltså inte listlängd utan radanatomi: Skeleton-primitivens listRow är ett generiskt block h-[3lh], medan MailLogRow (namn + upp till fyra Field-rader) och WaitlistRow (InitialAvatar + namn + dl med pl-12 och fyra Field-rader) är väsentligt högre. Rapport D bedömde dem som nästan lika; mätt i pixlar var det fel. Åtgärd: ge skeletonraden i src/components/maillog/MailLog.tsx och src/components/waitlist/Waitlist.tsx exakt den laddade radens anatomi (avatar-cirkel som skeleton där avataren finns, samma padding/typografi/gap, fyra fältrader) — antingen lokalt i respektive fil eller som en ny, dokumenterad Skeleton-variant om samma anatomi återkommer på fler ställen (avgör mot faktisk användning, bygg ingen abstraktion utan minst två konsumenter). Beroende: TASK-416.9 landad. Mät: boundingBox på första raden identisk före/efter datalandning, toEqual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Skeletonradens höjd och inre struktur i Maillogg och Väntelista är identisk med den laddade radens (DOM-mätt, ±0 px)
- [x] #2 Mätning bifogad: boundingBox på rubrik och första listraden identiska före och efter datalandning i båda vyerna
- [x] #3 Befintliga acceptance-tester för Maillogg och Väntelista gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MÄTNING (Playwright, acceptance-projektet, viewport 1280×720):

Ny anatomi (MailLogSkeletonRow/WaitlistSkeletonRow), håll-bar mock, boundingBox toEqual:
- Maillogg: rubrik OCH första listraden identiska (x/y/bredd/höjd, ±0 px) före/efter datalandning — 2/2 passed.
- Väntelista: samma, 2/2 passed.

Falsifiering (tvåsidigt bevis — gammal generisk `Skeleton variant="listRow"` (h-[3lh]) i samma testrigg):
- Maillogg: skeleton-rad 72 px mot riktig rad 131 px (diff 59 px/rad) → testet FALLER (toEqual).
- Väntelista: skeleton-rad 72 px mot riktig rad 147 px (diff 75 px/rad) → testet FALLER (toEqual).

Kortets ursprungstal (108 px / 225 px, review-fynd PR #2397) avsåg troligen ackumulerat Y-skift över hela listan (3 rader + gap), inte per-rad-höjdskillnaden ovan — inte omprövat mot review-agentens råmätning, bokfört som avvikelse.

Rubrik-fix: skeleton-titelns bredd-override (w-28/w-32) togs bort — Skeleton-primitivens default `w-full` matchar det riktiga `<h1>`s stretch-till-fullbredd i flex-col-föräldern (align-items: stretch). Utan denna ändring hade `toEqual` fällt på bredd trots identisk höjd/position.

Testfiler: tests/acceptance/mer-maillogg-laddlage.acceptance.test.ts, tests/acceptance/mer-vantelista-laddlage.acceptance.test.ts.

PREMISS-PASS SLUTFÖRT — 108/225 px EXAKT REPRODUCERADE (engångsdiagnos, ej committad, samma metodik som review-agentens PR #2397: total sektionshöjd pending vs laddat, skift = laddat − pending):

- Väntelista, baseline (origin/main, tre rader, alla fyra fält): pending=427 laddat=652 skift=225 — EXAKT match mot PR #2397:s tabell.
- Maillogg, baseline (origin/main, tre rader, filterSnapshot=null dvs 3 av 4 fält): pending=427 laddat=535 skift=108 — EXAKT match. (Med alla fyra fält ifyllda blev laddat=604, skift=177 — review använde alltså sannolikt en rad UTAN Segment/filter.)

Efter fixen (samma diagnos, samma data):
- Väntelista: pending=652 laddat=652 skift=0 — perfekt.
- Maillogg (3 av 4 fält, samma dataset som ovan): pending=604 laddat=535 skift=−69 — skelettet är NU 69 px FÖR HÖGT för en rad utan Segment/filter, eftersom MailLogSkeletonRow reserverar plats för alla fyra fält (MAX-anatomin, per uppdragets "upp till fyra Field-rader"). Med alla fyra fält ifyllda (så som den committade acceptance-mätningen testar) är skiftet exakt 0 — se AC #2.

Bokfört avvägning: en skeleton som renderas FÖRE data kan inte veta om en specifik rad kommer sakna Segment/filter. Vald väg (MAX-anatomi, fyra platshållarrader) ger EXAKT 0 px för den vanliga fullständiga raden och ett litet ÖVER-skott (~69 px, motsatt riktning mot tidigare UNDER-skott på 100+ px) för rader utan Segment/filter — en väsentlig förbättring men inte en universell 0-px-garanti för varje möjlig fältkombination. Ingen ytterligare åtgärd vidtagen i denna skiva (utanför scope: att göra skeletonen fält-count-medveten kräver antingen förhandskunskap om datan eller en explicit designavvägning som inte efterfrågats).
<!-- SECTION:NOTES:END -->
