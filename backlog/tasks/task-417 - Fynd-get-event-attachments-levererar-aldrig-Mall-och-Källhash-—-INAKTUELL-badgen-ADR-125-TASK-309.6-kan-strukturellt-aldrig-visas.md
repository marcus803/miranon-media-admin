---
id: TASK-417
title: >-
  Fynd: get-event-attachments levererar aldrig Mall och Källhash —
  INAKTUELL-badgen (ADR-125, TASK-309.6) kan strukturellt aldrig visas
status: To Do
assignee: []
created_date: '2026-09-06 13:24'
labels: []
dependencies: []
priority: medium
ordinal: 742000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport E §7 A (S123, live-belagt mot staging). ATTACHMENT_FIELDS i supabase/functions/get-event-attachments/index.ts:110–125 saknar fälten Mall och Källhash, medan mapAttachmentRecord (supabase/functions/_shared/attachments.ts:596–597) läser dem. Staging-raden rec3pxLUhUCk7cQpx bär Mall Bekräftelsebilaga och 64-teckens Källhash i basen, men EF-svaret ger mall: null, kallhash: null. Följd 1: berikaMedInaktuell (klienten) hittar noll bedömbara rader, så det klient-vattenfall som annars skulle lägga +1,1 s (getDocumentSources) är inaktivt i dag. Följd 2: DokumentYta.tsx:1922 inaktuell === true-grenen kan aldrig bli sann — ADR-125 §3 / TASK-309.6 är död i drift. Testerna ser det inte (domänschemat medvetet lent för fälten). VARNING: en naiv rättning (lägg till fälten) aktiverar vattenfallet och lägger +1,1 s på bilageväljaren för ett fält den aldrig renderar. Rätt form kräver beslut: beräkna inaktuell server-side i get-event-attachments (en hämtning), eller flytta berikningen till DokumentYta där badgen faktiskt visas. Inte ready-for-agent förrän Marcus valt väg.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
