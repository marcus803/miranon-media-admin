---
id: TASK-404
title: >-
  Fynd: post-merge-jobbet Staging (API + E2E) går 11m35s mot sitt 12-minuterstak
  — attempt 1 avbröts på 12m16s (5c7a8a9d), fem öppna larm av samma klass
status: To Do
assignee: []
created_date: '2026-09-05 21:05'
updated_date: '2026-09-06 07:21'
labels:
  - ready-for-human
dependencies: []
ordinal: 705000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mätt 2026-09-05 (S121 resume 3): post-merge-körningen 33989193147 på main 5c7a8a9d fick 'Staging (API + E2E)' cancelled efter 12m16s (steget 'E2E tests (staging)'), jobbets eget timeout-minutes: 12 i ci-suite.yml (TASK-178 Done: rotorsaken fastställd, utlösande overrun ej fastställt). Omkörningen (attempt 2) gick grön på 11m35s (20:52:03→21:03:38Z) — 25 sekunder från taket. Larmärendena #2359 (5c7a8a9d), #2348 (ba91a7d4, S120), #2337/#2336/#2335 (2026-09-04) bär samma signatur ('suite (cancelled)'); de stängdes med motivering när attempt 2 var grön (trädet 5c7a8a9d bär samtliga). PRD TASK-402:s skivor 402.1–402.5 lägger var och en till staging-e2e-fall i samma svit (inkorgens utskicksflöde, bekräftelsesteget, importen, Åtgärds-sidan) — sviten kommer att passera taket. Beslutet är Marcus/CI-sessionens: höj taket (som TASK-383 gjorde för acceptance-självtestet, 12→20), dela sviten i två jobb, eller mät per fil och flytta det som inte behöver staging till fixturvärlden. Uppföljningskortet TASK-383 (per-fil-mätning) är To Do.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Per-fil-väggklocka för tests/e2e/*.staging.test.ts ur jobbloggen 33989193147 attempt 2 (playwright --reporter=json eller loggens tidsstämplar) bokförd i kortet, sorterad fallande
- [ ] #2 Beslut fattat och verkställt (höjt tak, delad svit eller flytt till fixturvärlden) med commit-SHA; post-merge-körningen efter verkställandet grön med marginal ≥ 3 min mot taket
- [x] #3 TASK-383 korsrefererad eller sammanslagen; inget dubbelt kort
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
INSTANS 2 (2026-09-05 22:52 UTC): post-merge run 33996542511 på main 364f75b9 (#2360, TASK-402.2 som lade till två staging-e2e-fall): Staging (API + E2E) grön i attempt 1 men 22:40:28→22:52:14Z = 11m46s — 14 sekunder från taket. Marginalen krymper per skiva; 402.3 lägger till fler fall.

## AC #1 — per-fil-väggklocka, INTE erhållbar; per-steg i stället

Källa: `gh api repos/high-five-group/miranon-media-admin/actions/runs/<id>/attempts/<n>/jobs`
+ `gh api .../actions/jobs/<jobId>/logs`, körd 2026-09-06.

**Per-fil (tests/e2e/*.staging.test.ts) gick INTE att extrahera.** CI-reportern
är `'dot'` (`tests/support/fixturvarld/overskuggnings-rapport.ts`:
`PLAYWRIGHT_DEFAULT_REPORTER = process.env.CI ? 'dot' : 'list'`) — den skriver
enbart framstegs-punkter (`···°°°·...`) plus en aggregerad slutsumma
(`226 passed (5.6m)`), inga per-test- eller per-fil-tidsstämplar i klartext.
Dessutom laddas `playwright-report/`/`test-results/` bara upp vid
`failure() || cancelled()` (steget "Ladda upp Playwright-artefakter vid rött
e2e", `ci-suite.yml` rad ~841) — båda gröna körningarna nedan lämnade alltså
ingen rapport-artefakt att läsa i efterhand heller. Att få fram exakt
per-fil-tid hade krävt en engångskörning med `--reporter=json` eller `list`
mot staging, vilket ligger utanför denna möjliggörande skivas scope (skulle
ändra jobbets beteende, inte bara dess tak).

**Per-STEG i stället (API-steget vs E2E-steget), två fullständiga gröna
körningar:**

| Körning | API-steg | E2E-steg | Jobbtotal |
|---|---|---|---|
| `33996542511` (364f75b9, TASK-402.2, attempt 1) | 5m32s (524 test) | 5m39s (241 test: 226 passed / 14 skipped / 1 flaky) | 11m46s |
| `33989193147` (5c7a8a9d, attempt 2) | 5m43s (524 test) | 5m24s (239 test: 224 passed) | 11m35s |

Steg-gränserna är satta vid varje `##[group]Run npm run test:*`-rads
tidsstämpel i respektive jobblogg (inkl. npm/tsx-uppstartskostnad, inte bara
Playwrights egen `Running N tests`→summerings-rad).

**Fallande, sorterad tabell (jobbtotal, alla fyra mätta körningar denna
runda):**

| Körning (huvud-SHA) | Attempt | Väggklocka | Utfall |
|---|---|---|---|
| `34017272056` (b6a598c1, TASK-402.3) | 1 | 12m17s | CANCELLED (taket) |
| `33989193147` (5c7a8a9d) | 1 | 12m16s | CANCELLED (taket) |
| `33996542511` (364f75b9, TASK-402.2) | 1 | 11m46s | grön |
| `33989193147` (5c7a8a9d) | 2 | 11m35s | grön |

Omkörningen av `34017272056` (attempt 2) startades av orkestreraren och stod
`pending`/`in_progress` (startad 06:59:52Z) när detta kort skrevs — utfallet
var ännu okänt, prövas inte här.

## AC #2 — beslut och verkställande

**Beslut: höjt tak (samma minst-reversibla väg som TASK-383 valde för
acceptance-självtestet), inte delning eller flytt till fixturvärlden.**
`timeout-minutes: 12 → 20` i `.github/workflows/ci-suite.yml`, jobbet
`test-staging` ("Staging (API + E2E)"), commit se PR. Kommentaren vid raden
bär hela mätserien ovan i TASK-383:s form.

Marginal ≥ 3 min mäts på nästa post-merge-körning EFTER landning — det gör
orkestreraren, inte denna skiva (se kortets egen framing: AC #2 bockas inte
här).

## AC #3 — korsreferens TASK-383

TASK-383 (To Do) är uppföljningskortet som ska mäta acceptance-klassens
per-fil-fördelning och ompröva DESS 20-minuterstak. Detta kort (TASK-404) gör
motsvarande minimala åtgärd för staging-klassen (höjt tak) men kunde INTE
leverera en per-fil-mätning (se AC #1 ovan — annan orsak än TASK-383, som
gäller acceptance-jobbet och inte är hindrad av samma reporter-begränsning på
samma sätt eftersom TASK-383 fortfarande är To Do och inte har mätt sitt eget
per-fil-läge än). Korten är INTE dubbletter: TASK-383 = acceptance-klassen,
TASK-404 = staging-klassen. Ingen sammanslagning.

## Kvarstående (Marcus vägval, inte verkställt här)

TASK-409 (hermetisk fixturvärld för betalningsfamiljen — skapad lokalt på
denna worktrees ursprungsgren, commit `8b6f132a`, ej ännu pushad till
`origin/main` vid tidpunkten för detta kort; läst via `git show 8b6f132a`,
inte via `backlog`-CLI:t som inte ser den från denna gren) är den varaktiga
riktningen för att få ner sviten från grunden — flyttar betalningsfamiljens
promoveringsgrind till `tests/visual/` och minskar därmed staging-e2e-ytan.
Delning av sviten i flera jobb är ett alternativt vägval, inte utforskat här.
Båda är Marcus beslut, inte verkställda i denna skiva.

RUNDA 2 2026-09-06 07:21 UTC: AC #1 urbockad — per-fil-mätning gick inte att få ur CI-loggen (reportern dot); per-steg-mätningen kvarstår i notes som delbevis, AC #1 öppen tills en körning med json-reporter eller artefakt finns (kan lösas i TASK-409).
<!-- SECTION:NOTES:END -->
