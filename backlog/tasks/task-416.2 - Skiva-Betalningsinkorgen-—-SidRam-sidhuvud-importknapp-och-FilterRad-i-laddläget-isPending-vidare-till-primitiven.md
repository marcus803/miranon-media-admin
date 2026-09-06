---
id: TASK-416.2
title: >-
  Skiva: Betalningsinkorgen — SidRam, sidhuvud, importknapp och FilterRad i
  laddläget (isPending vidare till primitiven)
status: To Do
assignee: []
created_date: '2026-09-06 13:20'
updated_date: '2026-09-06 17:05'
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

RUNDA 2 (review-grinden, orkestreraren på Marcus mandat 2026-09-06) — TVÅ FYND.

FYND 1 (warning, RÄTTAT): runda 1:s tre separata `return`-satser
(isPending/isError/laddat) höll `headerBlock`/`filterRadBlock` på OLIKA
array-positioner mellan grenarna — den laddade grenen sköt in ett
`<p role="status">{N} kvarvarande...</p>` FÖRE `headerBlock` (position 1),
medan isPending/isError hade `headerBlock` direkt efter `sidRam` (position 0).
Reacts keyless reconciliation matchar barn POSITIONELLT: vid isPending→laddat
monterades headerBlock/filterRadBlock om, vilket kunde tappa fokus/inskriven
text i FilterRads sökfält exakt vid landningen — osynligt för
boundingBox-mätningen (den mäter geometri, inte DOM-identitet).

FIX: BetalningsInkorg.tsx har nu ETT enda returträd med SEX fasta
syskon-positioner (sidRam, statusAnnons, headerBlock, realtidsfelBlock,
filterRadBlock, datakropp) — samma mönster som Intresserade.tsx (TASK-416.8,
#2395). `datakropp` är en ternary (isPending/isError/laddat) som bär ALLT
som tidigare stod i de tre separata returstatements.

BEVISFORMEN KRÄVDE TVÅ OMTAG (bokfört öppet, inte dolt): ett första försök
asserterade sökfältets `toBeFocused()`/`toHaveValue()` rakt av — grönt även
mot den BUGGIGA koden (falskt positivt), eftersom BetalningsInkorg redan har
en egen effekt som fokuserar sökfältet vid FÖRSTA lyckade laddning oavsett
DOM-identitet, och värdet är kontrollerat state som överlever oavsett
remount. Ett andra försök lade till ett fokus-prov på rubrik-triggern
(headerBlock) — grönt mot BUGGIG kod, RÖTT mot FIXAD kod (omvänt av
avsikten), eftersom samma "sökfältet får fokus"-effekt MEDVETET yankar fokus
bort från triggern vid varje första lyckad laddning (filens egen docblock,
"ETT MEDVETET AVSTEG"). Slutformen använder en `data-*`-DOM-identitetsmarkör
satt direkt på sökfältets nod (utanför Reacts renderflöde) som det ENDA
diskriminerande beviset; fokus/värde på sökfältet kvarstår som sanna men
icke-diskriminerande påståenden om slutläget.

RÖD/GRÖN-BEVISAT, TVÅSIDIGT, TVÅ GÅNGER (en gång per bevisform):
- Slutformen kördes mot commit b4d8f41a (runda 1, INNAN fixen): BÅDA
  RUNDA-2-testerna RÖDA — DOM-markören försvann ("unexpected value null"),
  dvs sökfältet monterades faktiskt om.
- Samma testfil kördes mot den fixade koden: BÅDA GRÖNA.
- Reverten gjordes med `git checkout HEAD -- <fil>` (ALDRIG git stash, delas
  mellan worktrees) + en scratchpad-kopia av den fixade filen, återställd
  efteråt och verifierad byte-identisk (`diff` — inga skillnader).

isError→laddat krävde ett separat triggerknep: useOppnaBetalningar har ingen
manuell "Försök igen"-knapp, och den globala refetchOnWindowFocus
(router.ts) är staleTime-grindad (verifierat mot installerad
@tanstack/query-core 5.102.2 källkod, shouldFetchOn) — en nyss felad
hämtning är inte "stale" på 5 minuter, så ett visibilitychange-event hinner
aldrig trigga om testet. router.ts:s refetchOnReconnect: 'always' är
DÄREMOT villkorslöst (samma shouldFetchOn, value==="always"-grenen kringgår
staleTime helt) — ett offline-event följt av ett online-event på window
tvingar EN NY hämtning omedelbart, oavsett staleTime.

FYND 2 (warning, BOKFÖRT — EJ ÅTGÄRDAT, avsiktligt): datakroppPending
reserverar Markera-knappens rad OVILLKORLIGT, men den riktiga
MarkeringsAtgardsRad renderas bara när markerbaraIds.length > 0. En GENUINT
TOM inkorg (noll öppna betalningar) får därför ett litet layout-hopp vid
landning — skelettet speglar det SANNOLIKA fallet (Lotta har öppna
betalningar, PRD:ns hela premiss), inte tomläget. Samma avvägningsklass som
Hem-kortens tomläge (PRD § Öppna frågor, Marcus designval). Rättas inte här;
bokfört explicit i testfilens docblock och här.

GRINDAR EFTER RUNDA 2 (exitkoder mätta):
  typecheck: 0 · biome check .: 0 (18 varningar/83 infos repo-brett
    förbefintliga, orörda) · build: 0 · check-langa-streck.mjs: 0
    (323 filer, 0 fynd).
  Ny fil (8 tester totalt nu, inkl. de 2 nya): 8/8 passed mot
    chromium-authenticated/staging.
  Befintlig betalnings-e2e-svit (8 filer + den nya = 9): 68 passed,
    8 skipped (avsiktligt), 0 failed.
<!-- SECTION:NOTES:END -->
