---
id: TASK-416.13
title: >-
  Skiva: hem-laddlage-testet — filhuvudet lovar en boundingBox-mätning som inte
  finns; lägg till mätningen (ADR-083)
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 739000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §6 (S123). tests/acceptance/hem-laddlage.acceptance.test.ts:35–38 beskriver sin bevisform som boundingBox-mätning UNDER laddning och identisk mätning EFTER data (toEqual). Filen har 5 tester och 17 expect, och boundingBox förekommer enbart i kommentaren. Prosa som påstår en mekanism som inte finns är ADR-083-klassen. Åtgärd: lägg till mätningen så filhuvudet blir sant — boundingBox på Hem-kortens rubriker och första rad före/efter att MSW-svaren släpps, toEqual. Beroende: Hem-skivan (skeleton-geometrin) bör landa först, annars blir testet rött av rätt skäl — bokför i så fall det röda som rött-först-bevis och ordna landningen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Testet mäter boundingBox före och efter datalandning på minst Nästa event, Nya anmälningar och Senaste aktivitet, med toEqual
- [ ] #2 Filhuvudet beskriver exakt vad testet gör
- [ ] #3 Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
