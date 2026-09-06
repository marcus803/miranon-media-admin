---
id: TASK-415
title: >-
  Fynd: Vercels förhandsbyggen per PR bygger mot prod-projektet — varje klick i
  en PR-preview rör Lottas riktiga data; preview-miljön bör peka mot staging
status: In Progress
assignee: []
created_date: '2026-09-06 10:45'
updated_date: '2026-09-06 11:17'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
RESEARCH-PASS LANDAT 2026-09-06: docs/research/pr-forhandsvisningar-och-backend-branschmonster-2026-09-06.md. Rekommendation: väg (a) — Preview-target i Vercel pekar mot staging via tre miljövariabler (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FEATURE_BETALNINGAR) för target Preview; mätt att en Vercel-variabel vinner över incheckad .env.production (Vite 8.2.2 loadEnv, skarpt byggt: bundeln bär exakt en host). Kräver i staging en EGEN mönster-variabel för preview-origins (cors.ts, Supabases egen rekommendation https://*-<team-slug>.vercel.app/**), inte en breddning av den portlåsta CORS_ALLOWED_ORIGINS. RÄTTELSE av kortets riskbild: Vercel Deployment Protection är PÅ (preview-URL ger 302 till vercel.com/sso-api) — previews är inte publika; risken är förväxling hos den som bjuds in, inte läckage. Mät FÖRE verkställande varför previews fungerar mot prod i dag (är prods CORS-lista bredare?) och pröva mönstret mot både commit- och gren-adressformen. Väg (b) flyttar bara CORS-problemet och dubblar byggen; (c) faller. Sidofynd: cors.ts sätter inte Vary: Origin; ingen grind bevisar att ett förhandsbygge saknar prod-hosten (check-staging-bundle.sh vaktar bara ett håll).

Marcus GO 2026-09-06 på väg (a): 'Ja, kör staging-vägen om det är vad du rekommenderar och om det är det som är branschledarmönstret.' Skivor 415.1–415.3 mintade.
<!-- SECTION:NOTES:END -->
