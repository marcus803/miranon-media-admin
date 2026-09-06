---
id: TASK-421
title: >-
  Fynd: Skeleton variant=listRow (h-[3lh]) — tio konsumenter kvar efter att
  416.5/416.17/416.18 gav egna radanatomier; kartlägg och deprecera
status: To Do
assignee: []
created_date: '2026-09-06 17:12'
labels: []
dependencies: []
priority: low
ordinal: 750000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: S123 (2026-09-06), mönster tvärs skivorna 416.5 (Personer), 416.17 (Maillogg/Väntelista), 416.18 (Hem-raderna): listRow i src/components/primitives/Skeleton.tsx:28 (block h-[3lh] w-full rounded-lg) är tre generiska line-boxar, medan varje laddad rad har egen anatomi (avatar, fält, caption) — varje gång listRow används där raden inte är exakt 3lh hoppar innehållet vid landning. Kvarvarande konsumenter (grep 2026-09-06 efter rebasen på 40bca5a3): src/components/hem/ForfallnaBetalningar.tsx, hem/NyaAnmalningar.tsx (rättas i PR #2419), betalningar/InbetalningsLista.tsx, betalningar/BetalningsInkorg.tsx, intresserade/Intresserade.tsx, persons/PersonDetail.tsx, events/EventsCalendar.tsx, events/EventDetail.tsx, events/EventCheckin.tsx, events/detail/Narvaro.tsx. Åtgärd i två steg: (1) inventera per konsument om den laddade raden är 3lh (behåll) eller inte (skiva per vy med boundingBox-mätning som i 416.5/416.17), (2) när ingen konsument återstår med avvikande rad: deprecera/ta bort listRow ur Skeleton-primitiven och DESIGN-SYSTEM-SPEC §15 API-tabellen. Inte ready-for-agent förrän inventeringen (steg 1) bokförts i notes och skivorna mintats.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
