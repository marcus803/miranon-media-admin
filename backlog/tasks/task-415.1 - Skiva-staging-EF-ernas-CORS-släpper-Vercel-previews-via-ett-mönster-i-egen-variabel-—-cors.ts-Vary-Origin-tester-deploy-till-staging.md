---
id: TASK-415.1
title: >-
  Skiva: staging-EF:ernas CORS släpper Vercel-previews via ett mönster i egen
  variabel — cors.ts, Vary: Origin, tester, deploy till staging
status: To Do
assignee: []
created_date: '2026-09-06 11:16'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-415
ordinal: 723000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus GO 2026-09-06 på väg (a) i TASK-415 (research: docs/research/pr-forhandsvisningar-och-backend-branschmonster-2026-09-06.md). supabase/functions/_shared/cors.ts matchar i dag Origin exakt mot CORS_ALLOWED_ORIGINS (komma-separerad, portlåst för E2E: 5173/4173). Vercel-previews får unika origins (commit-form miranon-media-admin-<hash>-marcus-johanssons-projects-1d6d2a3a.vercel.app och gren-form miranon-media-ad-git-<slug>-marcus-johanssons-projects-1d6d2a3a.vercel.app — mät båda mot faktiska deployer via Vercel MCP list_deployments, gissa inte). Bygg: (1) en NY, valfri secret CORS_ALLOWED_ORIGIN_PATTERNS (komma-separerade mönster med * som enda jokertecken, t.ex. https://*-marcus-johanssons-projects-1d6d2a3a.vercel.app — Supabases egen rekommendation för preview-origins, https://supabase.com/docs/guides/auth/redirect-urls), prövad EFTER exaktlistan; mönstret får aldrig matcha ett bart * eller sakna team-suffixet (fail-closed: ett mönster utan minst en literal domän-del ignoreras med loggrad); (2) cors.ts sätter Vary: Origin på svar med Access-Control-Allow-Origin (research sidofynd 3); (3) Deno-tester för matcharen (exakt, mönster, avvisade former, saknad Origin, preflight utan träff → 403) i samma form som repots befintliga EF-tester; (4) deploy till STAGING enbart (staging-refen ur .env.staging; prod-refen får aldrig förekomma i något kommando — deny-prod-ref-låset) och skarpbevis: OPTIONS-preflight mot en staging-EF med Origin satt till en verklig preview-origin ger 204/200 med Access-Control-Allow-Origin = origin och Vary: Origin; med en origin utanför mönstret → 403. CORS_ALLOWED_ORIGINS rörs inte. Bokför i docs/reference/atkomst-och-nycklar.md eller där CORS_ALLOWED_ORIGINS redan är dokumenterad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cors.ts prövar CORS_ALLOWED_ORIGIN_PATTERNS efter exaktlistan; ett mönster utan literal domän-del ignoreras fail-closed med loggrad; Vary: Origin sätts på alla svar som bär Access-Control-Allow-Origin
- [ ] #2 Deno-tester täcker exakt träff, mönsterträff (båda Vercel-adressformerna), avvisad origin, bart *, saknad Origin på preflight
- [ ] #3 Deployad till staging; skarpbevis med OPTIONS-preflight för en verklig preview-origin (allow) och en främmande origin (403) bokfört verbatim i kortet
- [ ] #4 CORS_ALLOWED_ORIGINS oförändrad; variabeln dokumenterad där den befintliga är
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
