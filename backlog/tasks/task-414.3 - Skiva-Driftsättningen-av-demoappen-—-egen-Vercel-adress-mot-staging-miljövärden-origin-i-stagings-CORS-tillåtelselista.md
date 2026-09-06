---
id: TASK-414.3
title: >-
  Skiva: Driftsättningen av demoappen — egen Vercel-adress mot staging,
  miljövärden, origin i stagings CORS-tillåtelselista
status: To Do
assignee: []
created_date: '2026-09-06 10:37'
labels:
  - ready-for-human
dependencies:
  - TASK-414.2
parent_task_id: TASK-414
ordinal: 718000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus sätter upp den plats där demoappen bor: en andra Vercel-yta (eget projekt eller egen miljö — valet görs mot Vercels förstapartsdokumentation och bokförs i kortet) som bygger main med stagings publika VITE-värden, VITE_APP_LAGE=demo och en egen adress; adressen läggs i stagings CORS_ALLOWED_ORIGINS via supabase secrets set mot staging-projektet (aldrig prod). Efter driftsättningen kan Lotta nå demoappen på sin adress, se listen, och köra hela flödet mot demofixturen. Adressen bokförs i atkomst-och-nycklar-registret. Täcker användarberättelser: 4, 5, 6, 9, 10.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Demoappen är nåbar på sin egen adress och bygger main automatiskt; bundeln bär stagings Supabase-host och VITE_APP_LAGE=demo (grep:at och bokfört)
- [ ] #2 Stagings CORS_ALLOWED_ORIGINS bär demoappens origin; en preflight från demoappen får 200 och en från en okänd origin 403 (tvåsidigt)
- [ ] #3 Hela flödet körs skarpt i demoappen mot fixturen: markera, bulkregistrera, kvitton köade och skickade till Resend-testadresser, förhandsgranska, ångra — utfallet bokfört med jobb-id
- [ ] #4 Adressen, Vercel-ytan och miljövärdena är bokförda i docs/reference/atkomst-och-nycklar.md
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — den driftsatta demoappens bundel grep:as för Supabase-host: enbart stagings
- [ ] #5 Inget mail når en människa — bevisat i stagings jobblogg efter första skarpa körningen i demoappen
<!-- DOD:END -->
