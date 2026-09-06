---
id: TASK-420
title: >-
  Fynd: startvärmningens intresserade-post ärver global retry 3 medan
  Intresserade.tsx aldrig retry:ar 4xx — två konsumenter av samma queryKey med
  motstridig retry-policy
status: To Do
assignee: []
created_date: '2026-09-06 17:11'
labels:
  - ready-for-agent
dependencies: []
priority: medium
ordinal: 748000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-runda 2 på PR #2395 (TASK-416.8, S123 2026-09-06), sidofynd utanför skivan. src/router.ts:20–21 sätter global retry: 3 med retryDelay 200·2^n (max 2 000 ms). src/data/warmup/startvarmningen.ts:277–283 värmer queryKeys.intresserade.all via ensureQueryData utan retry-override och ärver därför retry 3 även på 4xx. src/components/intresserade/Intresserade.tsx:185–187 sätter för SAMMA nyckel retry som hoppar över 4xx (EdgeFunctionError 400–499) och annars max 3. Granskaren observerade fyra get-leads-anrop vid sidladdning. Konsekvens: vilken policy som gäller beror på vem som råkar starta hämtningen först; ett 4xx-fel (t.ex. utgången session) retry:as tre gånger med backoff ur startvärmningen fast vyn själv aldrig skulle göra det. Åtgärd: lägg retry-policyn på nyckelnivå med queryClient.setQueryDefaults(queryKeys.intresserade.all, { retry }) (TanStack Query, verifiera i docs) så båda konsumenterna delar den, ta bort per-anrops-overriden i Intresserade.tsx; behåll den strängare formen (aldrig retry på 4xx). Mät antal get-leads-anrop vid sidladdning före/efter i fixturvärlden (MSW-räknare) och bifoga. Kontrollera om övriga värmda nycklar (waitlist, maillog, segment) bär samma dubbelpolicy och bokför dem i notes utan att åtgärda i denna skiva.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 En retry-policy per queryKey via setQueryDefaults; Intresserade.tsx bär ingen egen retry-override; 4xx retry:as aldrig oavsett vem som startar hämtningen
- [ ] #2 Mätning bifogad: antal get-leads-anrop vid sidladdning före/efter, med 4xx-fixtur (förväntat 1 efter)
- [ ] #3 Övriga värmda nycklar inventerade i notes (dubbelpolicy ja/nej per nyckel)
- [ ] #4 Befintliga tester gröna, hermetik-självtestet grönt för rörda acceptance-filer
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
