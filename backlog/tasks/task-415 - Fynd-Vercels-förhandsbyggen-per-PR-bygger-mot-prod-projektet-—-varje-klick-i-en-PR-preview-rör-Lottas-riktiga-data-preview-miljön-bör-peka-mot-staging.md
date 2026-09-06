---
id: TASK-415
title: >-
  Fynd: Vercels förhandsbyggen per PR bygger mot prod-projektet — varje klick i
  en PR-preview rör Lottas riktiga data; preview-miljön bör peka mot staging
status: To Do
assignee: []
created_date: '2026-09-06 10:45'
labels:
  - ready-for-human
dependencies: []
ordinal: 715000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mätt 2026-09-06 (S121 resume 4, ADR-132:s verifiering a, fork-agenten): PR #2378:s Vercel-preview (miranon-media-admin-dot85l7sz.vercel.app, hämtad via Vercels delningslänk, 152 chunkar grep:ade) bär exakt EN Supabase-host — prod-projektets, inte stagings (jämför .env.staging) — och ingen VITE_FEATURE_BETALNINGAR-sträng. Följd: en förhandsvisning av en PR är en skarp klient mot Lottas databas och Airtable-bas; ett tryck på Registrera i en preview bokför på riktigt, och funktioner bakom flaggan syns inte alls i previewen. Det är en risk oberoende av demoläget (ADR-132 § Konsekvenser registrerar den; beslut 8 lämnar visningsytans form öppen). Vägval (Marcus, Vercel-projektets miljövariabler är hans händer): (a) sätt VITE_SUPABASE_URL/ANON_KEY + VITE_FEATURE_BETALNINGAR för target Preview till stagings värden (då kräver stagings CORS_ALLOWED_ORIGINS-secret ett mönster för *.vercel.app-preview-origins — cors.ts matchar exakt sträng, se supabase/functions/_shared/cors.ts, så det blir ett kodbeslut också); (b) låt demoappens Vercel-yta (ADR-132 beslut 3, TASK-414.3) vara den som bygger PR-grenar för visning, och stäng av previews i prod-projektet; (c) behåll som är och bokför öppet att previews är skarpa. Rekommendation: (a) eller (b), aldrig (c) — en skarp preview är exakt den klass av tyst sidoeffekt ADR-132 finns för att stänga. Verifiera efter ändring genom att grep:a preview-bundeln på Supabase-hosten (samma metod som mätningen).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Marcus har valt väg (a)/(b)/(c) med skäl bokfört i kortet
- [ ] #2 Efter verkställande: en ny PR-previews bundel bär stagings Supabase-host (eller inga previews byggs i prod-projektet), verifierat med grep mot bundeln och bokfört med deploy-URL
- [ ] #3 CORS-vägen för preview-origins är antingen löst i cors.ts + secret eller bokförd som skäl till väg (b)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
