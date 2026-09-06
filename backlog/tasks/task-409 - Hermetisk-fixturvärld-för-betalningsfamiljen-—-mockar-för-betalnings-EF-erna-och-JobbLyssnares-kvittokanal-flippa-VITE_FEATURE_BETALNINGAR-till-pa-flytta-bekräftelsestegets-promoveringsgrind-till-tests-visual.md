---
id: TASK-409
title: >-
  Hermetisk fixturvärld för betalningsfamiljen — mockar för betalnings-EF:erna
  och JobbLyssnares kvittokanal, flippa VITE_FEATURE_BETALNINGAR till pa, flytta
  bekräftelsestegets promoveringsgrind till tests/visual
status: To Do
assignee: []
created_date: '2026-09-06 06:31'
labels:
  - ready-for-agent
dependencies: []
ordinal: 710000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fött ur review-loopen på PR #2362 (TASK-402.3, 2026-09-06) och Marcus fråga vid morgonen: 'Vi kommer behöva bygga en hermetisk grind förr eller senare eller?' Läget: 13 hermetiska promoveringsgrindar i tests/visual/ körs på varje PR (segment, hem, persondetalj, personer, Åtgärds-sidan, dörrlistan, eventsidan, dokument m.fl.), men hela betalningsfamiljen är avstängd i fixturvärlden — playwright.config.ts rad ~384 sätter VITE_FEATURE_BETALNINGAR: 'av' med motivet att den hermetiska världen inte bär betalnings-EF-mockar och att JobbLyssnare öppnar en Realtime-WebSocket (48/48 hem-acceptanstester föll innan raden fanns). Kommentaren pekar på TASK-346.6/346.7 för mockarna och flippen; båda är Done men flippade aldrig raden. Konsekvens: inkorgen, kvittoflödet, markera-läget (402.1), bekräftelsesteget (402.3), importen (402.4) och Åtgärds-matare (402.5) har enbart staging-e2e, som ci.yml aldrig kör på PR- eller kö-ytan (run_staging: false villkorslöst) — grindarna fäller först post-merge/nightly. Bekräftelsestegets promoveringsgrind (tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts, tio aria-referenser hash-låsta i facit.json) ska flyttas till tests/visual när världen bär betalningar. Fix-agentens kostnadsbedömning på #2362 (PR-kroppen § 'Öppet för Marcus: grindens hemvist'): ~40–60 rader config (eget projekt/webServer-gren), ~100–150 rader MSW-handlers portade ur #2362:s mocka(), ~350–500 rader spec portad, plus ett WebSocket-mock för JobbLyssnare av okänd storlek. Research först: hur mockas Supabase Realtime-kanaler hermetiskt (supabase-js:s RealtimeClient, msw/ws eller Playwright route för WebSocket) — branschledarnas mönster, inte egen uppfinning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fixturvärlden bär mockar för betalningsfamiljens EF:er (get-open-payments, registrera-inbetalning, koa-kvitton, hamta-jobbstatus, forhandsgranska m.fl.) och en JobbLyssnare-kanal utan nätverk; VITE_FEATURE_BETALNINGAR flippad till pa i fixturvärlden med raden i playwright.config.ts omskriven
- [ ] #2 Bekräftelsestegets promoveringsgrind körs hermetiskt i tests/visual/ på PR-ytan med samma tio referenser (hasharna i facit.json oförändrade eller amenderade per ADR-102 A5) och fäller rött på en formändring (tvåsidigt bevis)
- [ ] #3 Befintliga acceptanstester (hem 48/48 m.fl.) gröna med flaggan på; CI-tiden för Acceptance-klassen mätt före/efter i CI, inte lokalt
- [ ] #4 Staging-varianten av grinden behålls eller rivs med motiv bokfört; inkorgens och Åtgärds-matarens staging-e2e orörda
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
