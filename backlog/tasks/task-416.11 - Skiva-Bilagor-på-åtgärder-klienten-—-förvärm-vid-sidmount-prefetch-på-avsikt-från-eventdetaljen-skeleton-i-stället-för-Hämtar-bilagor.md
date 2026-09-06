---
id: TASK-416.11
title: >-
  Skiva: Bilagor på åtgärder, klienten — förvärm vid sidmount, prefetch på
  avsikt från eventdetaljen, skeleton i stället för Hämtar bilagor
status: Done
assignee: []
created_date: '2026-09-06 13:22'
updated_date: '2026-09-06 17:07'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 737000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport E §1–2, §6 F1–F3, §7 B (S123). Bilagorna hämtas av useQuery [attachments, eventId] i ArbetsYta (src/components/events/atgarder/AtgardsSida.tsx:1838–1841) som monteras först när en åtgärdsrad fälls ut (2101–2103); ingen prefetch på avsikt, ingen loader. Två vägar in utan preload: src/components/events/detail/Atgarder.tsx:196 (Link) och src/components/events/detail/Deltagare.tsx:570–577 (navigate). Cachen är redan staleTime 5 min + persist 24 h (ADR-072), så bara första besöket per event väntar. Åtgärd: (F1) prefetchQuery av bilagorna vid sidmount i AtgardsSida (hubben, rad 2971–2981; hooken src/data/queries/useEventAttachments.ts finns); (F2) prefetch på hover/fokus i de två ingångarna, husets form (EventCard.tsx:38–58, TabBar.tsx:65, ADR-078 beslut 3); (B) ersätt textraden Hämtar bilagor … (rad 1753) med skeleton i bilageväljarens slutgeometri (ADR-113 steg 4). Använd prefetchQuery, aldrig ensureQueryData (fryser navigeringen, bryter ADR-078 beslut 1). Mät före/efter i staging: tid från utfällning till bilagor synliga, förväntat 0 ms vid varm cache.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bilagorna ligger i cache innan åtgärdsraden fälls ut vid normal navigering (mätt: utfällning efter sidmount + 1,5 s visar bilagor utan laddläge)
- [x] #2 Hover/fokus på Gå till åtgärder i eventdetaljen prefetchar bilagorna (nätverksanrop syns före klick)
- [x] #3 Ingen naken laddtext; skeleton i bilageväljarens slutgeometri när cachen är kall
- [x] #4 Befintliga åtgärds-e2e gröna, axe-svep grönt, ADR-078 beslut 1 respekterat (navigeringen blockeras aldrig)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
