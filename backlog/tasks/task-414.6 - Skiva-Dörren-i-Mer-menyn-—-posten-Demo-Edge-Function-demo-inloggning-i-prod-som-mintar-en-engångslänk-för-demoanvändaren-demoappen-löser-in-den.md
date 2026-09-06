---
id: TASK-414.6
title: >-
  Skiva: Dörren i Mer-menyn — posten Demo, Edge Function demo-inloggning i prod
  som mintar en engångslänk för demoanvändaren, demoappen löser in den
status: To Do
assignee: []
created_date: '2026-09-06 10:39'
labels:
  - ready-for-human
dependencies:
  - TASK-414.3
parent_task_id: TASK-414
ordinal: 721000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lotta trycker på Demo i Mer-menyn och hamnar färdiginloggad i demoappen i en ny flik. Bakom knappen: en Edge Function i prod, demo-inloggning, som kräver en inloggad prod-användare, bär stagings service-nyckel som prod-secret, mintar en engångslänk av typen magiclink för EN fast demoanvändare i staging (adress-allowlistad till exakt den — samma härdning som test-invite-completion, generateLink returnerar länken utan att mejla), och svarar med token_hash. Prod-appen öppnar demoappens adress med token_hash; demoappen löser in den (verifyOtp) och landar i inkorgen efter återställningen från 414.2. Marcus deployar prod-funktionen via fas4-prod-deploy och sätter secreten; skarpbeviset körs av honom. Fallback om korsprojekts-mintningen inte kan bevisas säker: en vanlig inloggning på demoappen, en gång, bokförd som amendering av ADR-132 beslut 2. Täcker användarberättelser: 1, 2, 13, 14.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mer-menyn bär posten Demo (bara för inloggade), som öppnar demoappen i ny flik färdiginloggad som demoanvändaren; Tillbaka till appen i demoappen leder tillbaka
- [ ] #2 demo-inloggning avvisar oinloggade anrop, avvisar varje annan adress än demoanvändarens (tvåsidigt test, förlaga test-invite-completion), mintar aldrig annat än magiclink och loggar varje mintning i aktivitetsloggen
- [ ] #3 Secreten med stagings service-nyckel finns bara i prod-projektets secrets, bokförd i atkomst-och-nycklar-registret med bevis-kommando; prod-deployen gjord via fas4-prod-deploy med UPDATED_AT verifierat
- [ ] #4 Engångslänken är förbrukad efter inlösen och har kort livstid; en andra inlösen avvisas (mätt)
- [ ] #5 Korsprojekts-mintningen är bevisad i drift: prod-EF mot staging-auth, demoappen inloggad, jobb-id och tidpunkt bokförda — eller fallbacken vald och ADR-132 beslut 2 amenderat
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — demo-inloggning skriver inget; den enda prod-resursen är secreten med stagings service-nyckel, allowlistad till en användare och en länktyp
- [ ] #5 Inget mail når en människa — magiclink-flödet skickar inget mail: länken returneras till appen, aldrig via e-post (generateLink, inte signInWithOtp)
<!-- DOD:END -->
