---
id: TASK-416.12
title: >-
  Skiva: get-event-attachments — eventraden och de gemensamma bilagorna i samma
  Promise.all, chunkarna parallellt; mätt före/efter i staging
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 738000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport E §3–4, §6 F4–F5 (S123). supabase/functions/get-event-attachments/index.ts: await fetchAirtableRecord(event) (rad 268) före Promise.all([egna-batch, gemensamma-kandidater]) (rad 300) fast fetchGemensammaKandidater() inte beror på eventraden; fetchAttachmentsByRecordIds (144–155) kör chunkarna seriellt (fixtureventet bär 57 länkar → två sekventiella anrop). Mätt mot staging: gemensamma ≈ 630–680 ms, eventrad + egen-batch ≈ 300–700 ms ovanpå; full union 1 019–1 590 ms varm. Åtgärd: flytta gemensamma-hämtningen in i samma Promise.all som eventraden (förväntad besparing ~250–350 ms) och Promise.all över chunkarna; ingen beteendeändring, samma svar. Deploya till STAGING och mät 5 anrop före/efter på samma event (rapport E §4-tabellen är baslinjen). Prod-deploy sker av Marcus via fas4-prod-deploy.sh — bokför som öppen skuld i kortet. Rör INTE fältlistan ATTACHMENT_FIELDS (sidofynd om Mall/Källhash är eget kort). Memoisering av gemensamma (F6) är ett eget beslut — inte här.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Eventraden och gemensamma-kandidaterna hämtas parallellt; chunkarna i fetchAttachmentsByRecordIds parallellt
- [ ] #2 Svaret är byte-identiskt före/efter för samma event (diff bifogad)
- [ ] #3 Mätserie bifogad: fem varma anrop före och efter mot samma staging-event, medianen sjunker
- [ ] #4 EF-testerna gröna (tests/api), deployad till staging av agenten, prod-deploy bokförd som Marcus-skuld
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
