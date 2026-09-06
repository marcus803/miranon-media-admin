---
id: TASK-407
title: >-
  Fynd: hamta-jobbstatus utan jobbId läser senaste jobbet i basen, inte
  sessionens eget
status: To Do
assignee: []
created_date: '2026-09-06 00:28'
labels:
  - ready-for-agent
dependencies: []
ordinal: 708000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Observerat av bygg-agenten i TASK-402.3 (2026-09-06, PR #2362): Edge Function-vägen hamta-jobbstatus utan jobbId returnerar det senaste kvittojobbet i basen — inte det jobb som den anropande sessionen startade. I bekräftelsesteget saknades jobbId-effekten i hooken (blockets statusrad stod tom) och lades till i 402.3; inkorgen skickar jobbId. Risk: en yta som anropar utan jobbId visar en annan användares/sessions jobb som sitt eget (Lotta och Roger samtidigt). Pröva anroparna (grep hamta-jobbstatus i src/), gör jobbId obligatoriskt i klientvägen eller bokför varför fallback-läsningen är avsiktlig (KvittojobbBanderoll?).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alla anropare av hamta-jobbstatus i src/ inventerade med sin jobbId-källa bokförd i kortet
- [ ] #2 Klientvägen kräver jobbId ELLER fallback-läsningen är dokumenterad som avsiktlig med sitt användningsfall, i koden och i docs/reference
- [ ] #3 api-pure/kontraktstest som fäller ett anrop utan jobbId där det inte är avsiktligt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
