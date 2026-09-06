---
id: TASK-416.17
title: >-
  Skiva: Maillogg och Väntelista — skeletonradens anatomi lika den laddade raden
  (listRow är tre generiska line-boxar, WaitlistRow bär avatar plus fyra fält)
status: To Do
assignee: []
created_date: '2026-09-06 14:45'
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
- [ ] #1 Skeletonradens höjd och inre struktur i Maillogg och Väntelista är identisk med den laddade radens (DOM-mätt, ±0 px)
- [ ] #2 Mätning bifogad: boundingBox på rubrik och första listraden identiska före och efter datalandning i båda vyerna
- [ ] #3 Befintliga acceptance-tester för Maillogg och Väntelista gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
