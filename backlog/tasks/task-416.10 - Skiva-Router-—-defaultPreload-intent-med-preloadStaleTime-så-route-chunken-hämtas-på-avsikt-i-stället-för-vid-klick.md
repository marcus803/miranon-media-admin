---
id: TASK-416.10
title: >-
  Skiva: Router — defaultPreload intent med preloadStaleTime, så route-chunken
  hämtas på avsikt i stället för vid klick
status: To Do
assignee: []
created_date: '2026-09-06 13:22'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 736000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §2 (S123). src/router.ts sätter inte defaultPreload (router-core har ingen default, belagt i src/lib/chunk-laddningsfel.ts:86–92). Med autoCodeSplitting: true ger första besöket på en route chunk-hämtning (tunn topbar) och sedan datahämtning (sidans skeleton) — två väntesteg i följd. Repot använder redan prefetch på avsikt för DATA (ADR-078) men inte för CHUNKS. Åtgärd: defaultPreload: intent + defaultPreloadStaleTime enligt TanStack Routers docs (verifiera aktuell rekommendation i docs, citera i PR:n); säkerställ att ingen loader blockerar (ingen finns i dag). Mät: tid från hover till route-chunk i cache, och att navigering aldrig blockeras (ADR-078 beslut 1). Research-passet forvarma-allt-branschmonster-2026-09-06.md kan ha kompletterande fynd — läs det om det landat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 defaultPreload intent och defaultPreloadStaleTime satta i src/router.ts med källhänvisning till TanStack Routers docs i filhuvudet
- [ ] #2 Mätning bifogad: route-chunk finns i cache efter hover, före klick, på minst två routes
- [ ] #3 Sidbytesindikatorn (defaultPendingComponent) visas inte vid navigering efter hover-preload
- [ ] #4 typecheck, biome, build gröna; chunk-laddningsfel-testerna gröna
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
