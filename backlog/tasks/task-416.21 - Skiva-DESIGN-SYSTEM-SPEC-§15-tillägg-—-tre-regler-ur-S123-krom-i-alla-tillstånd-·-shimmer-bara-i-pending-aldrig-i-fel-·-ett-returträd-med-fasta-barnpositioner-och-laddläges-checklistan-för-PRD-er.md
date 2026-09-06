---
id: TASK-416.21
title: >-
  Skiva: DESIGN-SYSTEM-SPEC §15-tillägg — tre regler ur S123 (krom i alla
  tillstånd · shimmer bara i pending, aldrig i fel · ett returträd med fasta
  barnpositioner) och laddläges-checklistan för PRD:er
status: To Do
assignee: []
created_date: '2026-09-06 17:13'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 751000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: S123 (2026-09-06) granskningsloopen på 15 PR:er (sessionsdok Del 3 § Beslut på mandatet, § Granskningsloopen) + lessons-fragmentet rundtaket-racker-inte-nar-varje-runda-avtacker-nasta-lager-av-samma-princip.md. Tre regler fastslogs under loopen, instans för instans, och saknas i docs/specs/DESIGN-SYSTEM-SPEC.md §15 (Lugnt laddläge, rad ~1075): (1) sidkromet (SidRam, h1, sidhuvud, filter-/sökrad, handlingsrad) renderas i ALLA query-tillstånd, bara datakroppen växlar — belagt i 416.1 #2401, 416.2 #2415, 416.3 #2396, 416.4 #2392, 416.8 #2395; (2) skeleton och shimmer ENBART i isPending, aldrig i isError — i fel visas kromet med statisk platshållare utan animation och utan aria-busy, felbeskedet bär tillståndet (416.4 r1, 416.8 r2, 416.1 r2–r3); (3) ett returträd med fasta barnpositioner — status-annonseringen och varje block på fast index (null på sin plats), så React inte monterar om header/FilterRad vid landning och fokus/inskriven text överlever (416.8 r1, 416.2 r2, 416.19). Åtgärd, docs-only: skriv de tre reglerna i §15 med källa per regel (PR-nummer, ADR-113/ADR-078-koppling), en kort laddläges-checklista att citera i skivors uppdrag (krom i alla tillstånd · shimmer bara i pending · fasta barnpositioner · aria-busy/role=status per landmärke · mobil viewport · boundingBox före/efter), och en pekare från KVALITETSDEFINITIONER-11-REACT.md om den har en laddläges-rad. Kontrollera ORDLISTA.md för begreppen (sidkrom, returträd) och uppdatera vid kristallisering. Vale/markdownlint gröna (npm run check:docs).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 §15 bär de tre reglerna med källa per regel och kopplingen till ADR-113/ADR-078 utskriven
- [ ] #2 Laddläges-checklistan finns i §15 i en form som kan citeras i ett uppdrag (sex punkter)
- [ ] #3 ORDLISTA.md prövad för sidkrom/returträd; uppdaterad vid behov
- [ ] #4 npm run check:docs grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
