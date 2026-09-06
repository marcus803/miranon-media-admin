---
id: TASK-415.2
title: >-
  Skiva: Vercels Preview-miljö pekar mot staging — tre miljövariabler,
  mönster-secreten i staging, förmätning av prods CORS, verifiering av en
  preview-bundel
status: To Do
assignee: []
created_date: '2026-09-06 11:16'
labels:
  - ready-for-human
dependencies:
  - TASK-415.1
parent_task_id: TASK-415
ordinal: 724000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus händer (Vercel-projektets miljövariabler och prods CORS-läsning ligger bakom prod-låset). Steg: (1) FÖRMÄTNING: varför fungerar previews mot prod i dag? Marcus kör i sin egen terminal en OPTIONS-preflight mot en prod-EF med Origin satt till en verklig preview-origin och läser Access-Control-Allow-Origin — svarar prod med origin är prods CORS-lista bredare än stagings (eget fynd-kort: smalna av); svarar den 403 fungerade previews aldrig fullt ut mot prod (bokför). (2) I Vercel (Settings → Environment Variables) för target Preview ENBART: VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY = stagings värden (ur .env.staging), VITE_FEATURE_BETALNINGAR=pa; Production orörd. (3) Sätt secreten CORS_ALLOWED_ORIGIN_PATTERNS i staging-projektet (agent kan göra detta i 415.1 om Marcus vill — staging-refen är tillåten). (4) Trigga ett förhandsbygge (valfri PR-push) och verifiera: bundeln bär stagings host och inte prods (samma grep-metod som research-passets mätning), appen laddar och inkorgen visar stagings data. (5) Uppdatera ADR-132 § Konsekvenser + TASK-415:s riskformulering med rättelsen att Deployment Protection är PÅ. Förkrav: 415.1 landad och deployad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Förmätningen av prods CORS bokförd verbatim (svar + slutsats) i kortet
- [ ] #2 Preview-target bär stagings tre värden; Production oförändrad (skärmdump eller vercel env ls i kortet)
- [ ] #3 En ny preview-bundel innehåller stagings Supabase-host och ingen prod-host, grep-bevis i kortet; appen laddar i previewen
- [ ] #4 ADR-132 och TASK-415 rättade om Deployment Protection
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
