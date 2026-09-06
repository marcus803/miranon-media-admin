---
id: TASK-416.10
title: >-
  Skiva: Router — defaultPreload intent med preloadStaleTime, så route-chunken
  hämtas på avsikt i stället för vid klick
status: To Do
assignee: []
created_date: '2026-09-06 13:22'
updated_date: '2026-09-06 14:53'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: high
ordinal: 736000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §2 (S123). src/router.ts sätter inte defaultPreload (router-core har ingen default, belagt i src/lib/chunk-laddningsfel.ts:86–92). Med autoCodeSplitting: true ger första besöket på en route chunk-hämtning (tunn topbar) och sedan datahämtning (sidans skeleton) — två väntesteg i följd. Repot använder redan prefetch på avsikt för DATA (ADR-078) men inte för CHUNKS. Åtgärd: defaultPreload: intent + defaultPreloadStaleTime enligt TanStack Routers docs (verifiera aktuell rekommendation i docs, citera i PR:n); säkerställ att ingen loader blockerar (ingen finns i dag). Mät: tid från hover till route-chunk i cache, och att navigering aldrig blockeras (ADR-078 beslut 1). Research-passet forvarma-allt-branschmonster-2026-09-06.md kan ha kompletterande fynd — läs det om det landat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 defaultPreload intent och defaultPreloadStaleTime satta i src/router.ts med källhänvisning till TanStack Routers docs i filhuvudet
- [x] #2 Mätning bifogad: route-chunk finns i cache efter hover, före klick, på minst två routes
- [x] #3 Sidbytesindikatorn (defaultPendingComponent) visas inte vid navigering efter hover-preload
- [x] #4 typecheck, biome, build gröna; chunk-laddningsfel-testerna gröna
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Källa (TanStack Router docs, verifierad 2026-09-06)

https://tanstack.com/router/latest/docs/framework/react/guide/preloading —
"The simplest way to preload routes for your application is to set the
defaultPreload option to intent for your entire router." samt "To let an
external cache make the freshness decision, set
routerOptions.defaultPreloadStaleTime ... to 0." Router-core default för
defaultPreload är false (router-core/dist/esm/router.d.ts), bekräftar
premissen att src/router.ts inte satte fältet.

## Ändring

src/router.ts: defaultPreload: 'intent', defaultPreloadStaleTime: 0 (delegerar
färskhet till QueryClients staleTime 5 min ovanför i samma fil — ingen
route-loader finns idag, grep bekräftat). defaultPreloadDelay lämnas OSATT
(router-corets 50 ms-default matchar guiden, ingen mätning visade skäl att
avvika).

src/lib/chunk-laddningsfel.ts: docblocket uppdaterat — modulens tidigare
premiss ("eventet kan bara fyra vid en av Lotta utlöst navigering") är
INVALIDERAD av denna ändring (hover kan nu trigga vite:preloadError utan
klick). Verifierat att svaret ändå håller: en misslyckad PRELOAD kan
strukturellt inte nå SectionError (dubbelt skydd, källäst
load-client.js/link.js) — bara ChunkBanner kan visas något tidigare.

## Mätning (chrome-devtools MCP mot dev-server, localhost:5602/5601)

Metod: performance.setResourceTimingBufferSize(2000) + synthetic
mouseover/mouseenter-dispatch (CCP-hover-verktyget visade sig opålitligt för
detta pga isolerade JS-kontexter mellan separata tool-anrop; native
DOM-event-dispatch inom EN atomär evaluate_script gav reproducerbara,
verifierade resultat, dubbelkorsat mot CDP:s list_network_requests som är
oberoende av Performance-bufferten).

- /event: hover → event/index.tsx?tsr-split=component begärd efter 55 ms,
  hämtning klar på 3 ms (304, 300 B). Bekräftat även i nätverksloggen
  (reqid 4472, före all klick).
- /personer: hover → personer/index.tsx?tsr-split=component begärd efter
  57 ms, hämtning klar på 2 ms (304, 300 B). Bekräftat i nätverksloggen
  (reqid 5087, före all klick).

Sidbytesindikator (MutationObserver för "Laddar sida" spänt över hela
klick→navigering): indicatorSeenDuringNav = false på BÅDA rutterna
(/event → h1 "Event", /personer → h1 "Personer" efter klick).

## Grindar (exitkoder)

typecheck: 0 · biome check: 0 · build: 0 ·
check-langa-streck.mjs: 0 (323 filer, 0 ofångade) ·
test:api: api-pure 100% grönt (0 fel); api-staging 16→20 fel vid omkörning
(OLIKA testfall mellan körningarna, alla i shared-state-mutation-tester helt
orelaterade till router/chunk-kod — bedöms som miljöflak från samtidig
fleet-aktivitet mot delad staging, EJ orsakat av denna diff, diffen rör
uteslutande src/router.ts + src/lib/chunk-laddningsfel.ts) ·
chunk-laddningsfel-testerna (webblasarbeteende 11 + acceptance 2): 13/13
gröna · e2e-navigering (tests/e2e/shell.staging.test.ts, chromium-authenticated,
9 tester inkl. tab-navigation DoD 1+9): 9/9 gröna

## Runda 2 — review-grindens fynd (warning + 2 info), åtgärdade

**Warning (rättad):** chunk-laddningsfel.ts:s docblock (~rad 105) påstod fel
mekanism för varför en preload-error aldrig når SectionError. Källäst
@tanstack/router-core 1.171.27 load-client.js rad för rad (samma version
granskaren läste): (1) chunk-rejektionen fångas redan INUTI createLoaderTask
(rad ~373, konverteras till resolvat värde) — preloadClientRoutes yttre
catch (rad 1058) triggas ALDRIG av det; (2) reduceLane/install() (rad
519-534) SÄTTER faktiskt match.status='error' på preloadens lokala
matches-array — den gamla texten ("ingen route-match sätts någonsin till
error") var bokstavligt fel; (3) den verkliga anledningen: matches-arrayen
är en SPEKULATIV kopia som ALDRIG PUBLICERAS — preloadClientRoute avslutar
i sin finally (rad 1048-1053) med transferMatchResources + controller.abort()
utan commitMatches/publishMatches/stores.setMatches (de enda ställena som
skriver till router.stores.matches, rad 708/740-744/769/846/895/1257).
Slutsatsen (kan inte nå SectionError) håller — mekanismen är omskriven med
exakta radreferenser.

**Info 1 (brasklapp tillagd):** mätningen (55-57 ms, 304-svar 2-3 ms) är ett
VARMT dev-server-scenario (lokal HTTP-cache). Kall CDN/webbläsarcache efter
en färsk deploy kan ta väsentligt längre — mekanismen (hämtning startar på
hover, inte klick) håller ändå. defaultPendingMs (1000) är oförändrad; en
kall produktionshämtning som närmar sig den tröskeln kan fortfarande visa
Sidbytesindikatorn. Brasklappen är tillagd i PR-kroppen.

**Info 2 (regressionsvakt tillagd):** nytt test
tests/api/router-preload-defaults.test.ts (api-pure, ingen DOM) — läser
src/router.ts som text och låser mot `defaultPreload: 'intent',` +
`defaultPreloadStaleTime: 0,`. Importerar INTE router.ts direkt, samma
etablerade mönster som personregister-farskhet.test.ts § 3 (routeTree.gen.ts
drar in hela app-komponentträdet, vilket api-pure inte kan ladda).
TVÅSIDIGT BEVISAT i byggsessionen: defaultPreload tillfälligt satt till
false gav rött test (toContain föll), återställning gav grönt igen.

Grindar efter fix: typecheck 0 · biome 0 · check-langa-streck 0 (323 filer)
· nya testet grönt (tvåsidigt bevisat) · chunk-laddningsfel-testerna
(webblasarbeteende 11/11 + acceptance 2/2) gröna.
<!-- SECTION:NOTES:END -->
