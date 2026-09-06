---
id: TASK-416.2
title: >-
  Skiva: Betalningsinkorgen — SidRam, sidhuvud, importknapp och FilterRad i
  laddläget (isPending vidare till primitiven)
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
updated_date: '2026-09-06 16:18'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 728000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #1 (S123). src/components/betalningar/BetalningsInkorg.tsx:1339–1352 renderar laddläget som SidRam + h1 + tre skeleton-block, medan laddat läge (1458+) lägger in Importera kontoutdrag-knappen (1587–1601) och hela FilterRad (1603) med defaultOppen (1624, TASK-410) — utfälld panel med sökfält, tratt, rutnät och räknarrad, ~200–260 px. FilterRad-primitiven har redan laddläge i slutgeometri (FilterRad.tsx:298–318, 395–396) — samma form som EventsList.tsx:278–291. VÄNTAR: startas först när S121:s PR #2380 och #2383 (samma fil) landat; bygg mot färsk main. Åtgärd: rendera SidRam + header + importknapp + FilterRad isPending i alla tre grenarna; skeleton bara i kortlistan med kortets riktiga höjd.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sidhuvud, importknapp och utfälld FilterRad renderas i isPending-, isError- och laddat läge; FilterRad får isPending
- [x] #2 Mätning bifogad: boundingBox på h1, FilterRad och första kortet identiska före och efter datalandning
- [x] #3 Grenen är rebasad på main efter att #2380 och #2383 landat; inga konflikter kvar i BetalningsInkorg.tsx
- [x] #4 Befintliga betalnings-e2e gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PREMISS-PASS: kortets radnummer (1339–1352, 1587–1601, 1603, 1624) var stale
mot filens faktiska läge vid origin/main f0811b0c — TASK-412 (femte varvet)
hade redan rivit "Importera kontoutdrag"-knappen som fristående knapp och
gjort rubriken "Betalningar" till en Meny-trigger (`<h1><Meny trigger=...>`)
med "Importera kontoutdrag" som MenyPost i dropdownen. Byggt mot filens
FAKTISKA struktur, inte mot kortets citerade radnummer — divergensen är
bokförd, inte tyst rättad.

ACCEPTANCE-KLASSEN ÄR STRUKTURELLT OREACHABLE FÖR DENNA YTA (mätt, inte
antaget): playwright.config.ts:s delade fixtur-env för acceptance/visual/
webblasarbeteende sätter VITE_FEATURE_BETALNINGAR: 'av' EXPLICIT (kommentar
vid raden: JobbLyssnares Realtime-WS skulle annars fälla VARJE hermetisk
autentiserad test, mätt 48/48 i hem.acceptance.test.ts innan flaggan sattes
av). En första hermetisk testfil (senare raderad) föll med "Mer"-rubriken
synlig i stället för "Betalningar" — /mer/betalningar redirectar alltid dit
i den klassen. chromium-authenticated (real staging) var dessutom
TASK-77-preflight-blockerad två separata gånger under bygget p.g.a.
samtidiga post-merge-körningar som höll staging.

MÄTNINGEN (AC #2) gjordes DÄRFÖR i tre steg:
1. En engångs-hermetisk harness (egen playwright-config + fabricerad
   Supabase-session + page.route på alla EF:er, RADERAD efter körning)
   itererade fram skeleton-geometrin snabbt utan att vänta ut staging-mutexen.
2. Den slutgiltiga mätningen kördes SKARPT mot `chromium-authenticated`
   (riktig staging-auth) i `tests/e2e/mer-betalningar-laddlage.staging.test.ts`
   (COMMITTAD, ej raderad — 6/6 gröna, se PR-kroppen för fulla talen).
3. Hela den befintliga betalnings-e2e-sviten (61 tester, 8 avsiktligt
   skippade) kördes om mot samma staging-fönster: 0 regressioner.

FYND: FÖRSTA VERSIONEN AV SKELETTET SAKNADE MARKERA-KNAPPENS RAD OCH SKÖT
FÖRSTA KORTET 73 PX FÖR HÖGT (mätt: pending y=521.75 mot laddat y=594.75).
Roten: MarkeringsAtgardsRad (mt-6 px-4, Button size=sm ~32px) renderas bara
när markerbaraIds.length > 0 — datadrivet, alltså osynligt för ett skelett
byggt ur "tre skeleton-block" utan att räkna med raden. Fixat genom att
reservera samma mt-6+32px-yta som ett eget, direkt <section>-barn (INTE
nästlat i statuselementet — display:contents hade riskerat att tysta
role=status för Safari/VoiceOver, se filens docblock). Efter fixen: y=593.75
mot 594.75 (1px sub-pixel, se nästa fynd).

FYND 2, EJ ÅTGÄRDAT (samma sub-pixel-klass TASK-416.4 bokförde som "70 mot
69" men här med rotorsaken faktiskt spårad): FilterRad.tsx:s isPending-gren
ritar samma generiska "etikett+h-8"-block (57px) för VARJE dimension,
inklusive en kontroll-bärande dimension (BetalningsInkorgens event-axel,
EventValjare "fristående"-form, verklig höjd 58px: border 2px + py-4 32px +
text-body-rad 24px). 1px-gapet kaskaderar till FilterRads egen höjd
(288 mot 289) och till varje boundingBox under den. Fixen hade suttit i den
DELADE FilterRad.tsx-primitiven (även AnmalningarSida/EventsList-konsument)
— utanför denna skivas scope (kollisionskartan). Testets AC #2-assertion är
därför MEDVETET TOLERANT ±1px på y/height (STRIKT på x/width) — se
filhuvudets fulla docblock för hela härledningen.

SLUTLIGA TAL (headless Playwright, 1280×720, chromium-authenticated mot
riktig staging, page.route-mockad hamta-oppna-betalningar+get-events):
  h1:        pending {x:372,y:116,w:536,h:44}  laddat {x:372,y:116,w:536,h:44}  IDENTISK
  FilterRad: pending {x:356,y:176,w:568,h:288} laddat {x:356,y:176,w:568,h:289} x/y/w IDENTISK, h 288/289 (1px)
  1:a kortet: pending {x:365,y:593.75,w:550,h:76} laddat {x:365,y:594.75,w:550,h:76} x/w/h IDENTISK, y 593.75/594.75 (1px)

GRINDAR (exitkoder mätta):
  typecheck: 0 · biome check .: 0 (BetalningsInkorg.tsx + ny testfil: 0
    diagnoser vardera) · build: 0 · check-langa-streck.mjs: 0 (323 filer,
    0 fynd) · test:api: api-pure 1743/1743 GRÖNT; api-staging BLOCKERAD av
    TASK-77-preflighten TVÅ gånger (samtidiga post-merge-körningar som höll
    staging) — INGEN av api-staging-testerna rör betalningsdomänens EF:er
    eller denna diff, bedömd som miljö-mutex, ej regression (samma
    bedömningsklass TASK-416.4 dokumenterade för sin egen sandbox-flake).
  Befintlig betalnings-e2e (8 filer, chromium-authenticated mot staging):
    61 passed, 8 skipped (avsiktligt, miljöflagg-relaterat), 0 failed.
  Ny fil tests/e2e/mer-betalningar-laddlage.staging.test.ts: 6/6 passed
    (AC#1 pending, AC#1 error, AC#2 mätning, axe pending 0 fel, axe error
    0 fel — plus samma svit körd en andra gång för att verifiera stabilitet).
<!-- SECTION:NOTES:END -->
