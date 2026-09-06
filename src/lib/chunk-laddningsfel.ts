/**
 * Kraschfönstrets sista lucka (TASK-199-uppföljning, ADR-047 § Amendering
 * 2026-08-13 (2)) — mekanismlagret.
 *
 * PROBLEMET denna modul löser är det som uppdateringsbannern INTE stänger.
 * Bannern (`src/lib/app-uppdatering.ts`) gör kraschfönstret ändligt: den
 * signalerar att en ny version är aktiv och låter Lotta välja när sidan ska
 * laddas om. Men MELLAN deployen och klicket kör fliken fortfarande gammal
 * kod, och den koden refererar chunk-namn som inte längre finns på servern.
 *
 * Mätt mot prod 2026-08-13
 * (`docs/research/task-199-frontend-deployvagen-och-sw-precachen-2026-08-13.md`
 * § 3.4): en saknad asset svarar `200 text/html` med 4410 byte, byte för byte
 * identiskt med `index.html`, eftersom `vercel.json`s SPA-rewrite
 * (`"source": "/(.*)", "destination": "/index.html"`) fångar den. Webbläsaren
 * vägrar exekvera HTML som ES-modul och avvisar importen med
 * `Failed to fetch dynamically imported module`.
 *
 * ═══ VAD `vite:preloadError` FAKTISKT FÅNGAR ═══
 *
 * Mätt i vår installerade Vite 8.2.0,
 * `node_modules/vite/dist/node/chunks/node.js` (preload-helpern som
 * `buildImportAnalysisPlugin` injicerar runt varje dynamisk import i bygget),
 * verbatim:
 *
 *     function handlePreloadError(err) {
 *       const e = new Event("vite:preloadError", { cancelable: true });
 *       e.payload = err;
 *       window.dispatchEvent(e);
 *       if (!e.defaultPrevented) throw err;
 *     }
 *     return promise.then((res) => {
 *       for (const item of res || []) {
 *         if (item.status !== "rejected") continue;
 *         handlePreloadError(item.reason);
 *       }
 *       return baseModule().catch(handlePreloadError);
 *     });
 *
 * FÅNGAR: (1) själva den dynamiska importen när den avvisas, vilket är
 * MIME-felet ovan, och (2) en CSS-dep vars `<link rel="stylesheet">` fyrar
 * `error`.
 *
 * FÅNGAR INTE: statiska importer i entry-chunken (de laddas ur den färska
 * `index.html`, inte lazy), egna `fetch()`-anrop, bilder, web workers, och
 * misslyckade `modulepreload`-länkar för JS-deps (koden skapar bara en Promise
 * när `isCss` är sant, så en trasig JS-preload syns aldrig i `allSettled`).
 * Den sista är utan praktisk betydelse hos oss: när dep:en saknas avvisas
 * `baseModule()` ändå, vilket gren (1) fångar.
 *
 * FÅNGAR INTE I DEV: helpern injiceras av `buildImportAnalysisPlugin`, som
 * dess egen källkommentar märker `"Build only"`. Dev-servern serverar varje
 * modul separat via native ESM utan preload-helper. Det är skälet till att
 * `tests/webblasarbeteende/app-chunk-laddningsfel.test.ts` dispatchar eventet
 * syntetiskt i stället för att blockera en chunk.
 *
 * ═══ VARFÖR VI INTE ANROPAR `preventDefault()` ═══
 *
 * Vites egen dokumentation
 * (https://vite.dev/guide/build.html, § Load Error Handling) visar exemplet
 * `window.addEventListener('vite:preloadError', () => window.location.reload())`
 * och konstaterar att *"If you call `event.preventDefault()`, the error will
 * not be thrown."* Läst mot källan ovan betyder det något mer specifikt än det
 * låter: `handlePreloadError` är `.catch()`-handlern för `baseModule()`. Sväljs
 * felet returnerar den `undefined`, och `__vitePreload` RESOLVAR då med
 * `undefined` i stället för modulen. Anroparen (TanStack Routers
 * kod-splittring) får en modul som inte finns och kraschar en rad senare med
 * ett meddelande som inte har med saken att göra.
 *
 * `preventDefault()` är alltså bara säkert i kombination med en OMEDELBAR
 * omladdning, som i Vites exempel. Och en omedelbar omladdning är precis vad
 * Marcus beslut (S105, `ADR-047` § Amendering 2026-08-13) förbjuder: den kan
 * slänga bort det Lotta har skrivit i ett formulär.
 *
 * Vi låter därför felet kastas vidare. Det landar i routerns
 * `defaultErrorComponent` (`SectionError`, `src/router.ts`), som renderar i
 * Outlet-positionen med skalet kvar — ingen vit skärm — och Sentry får
 * rapporten via `createRoot`s `onCaughtError` (`src/main.tsx`). Vad
 * `SectionError` ensam INTE kan göra är att förklara felet eller läka det:
 * dess "Försök igen" kör om samma import mot samma saknade chunk och kan
 * strukturellt aldrig lyckas. Denna modul bär den delen.
 *
 * ═══ VARFÖR EN SYNLIG UPPMANING ÄR RÄTT SVAR HÄR ═══
 *
 * FRAM TILL TASK-416.10 kunde eventet hos oss bara fyra vid en navigering
 * Lotta själv utlöst, aldrig spontant medan hon skriver — `src/router.ts`
 * satte inte `defaultPreload`, och `@tanstack/router-core` sätter ingen
 * default för det fältet (mätt: `dist/esm/router.js` sätter
 * `defaultPreloadDelay: 50` men aldrig `defaultPreload`). I
 * `@tanstack/react-router`s `link.js` gäller
 * `const preload = ... userPreload ?? router.options.defaultPreload`, och
 * varje gren därefter jämför mot `"intent"` / `"render"` / `"viewport"` —
 * med `undefined` var alla falska. Ingen route hämtades på hover.
 *
 * SEDAN TASK-416.10 sätter `src/router.ts` `defaultPreload: 'intent'`
 * (route-chunken ska hämtas på avsikt, inte vid klick — se den filens eget
 * docblock). Eventet KAN alltså numera fyra även utan att Lotta klickar:
 * hover/fokus (eller `touchstart`) på en `<Link>` startar
 * `router.preloadRoute(...)`, som i sin tur kör samma `loadRouteChunk`-väg
 * som en riktig navigering. Detta ÄNDRAR INTE svaret nedan — det breddar
 * bara VILKEN händelse som kan trigga det, och är fortsatt begränsat till
 * denna moduls egen kanal:
 *
 * En misslyckad PRELOAD kan aldrig nå `defaultErrorComponent`/`SectionError`
 * — men INTE av det skäl en tidigare version av detta stycke påstod. Rättat
 * efter review-grindens runda 1 (TASK-416.10), källäst rad för rad mot den
 * INSTALLERADE `@tanstack/router-core` 1.171.27,
 * `dist/esm/load-client.js`:
 *
 * (1) Chunk-avvisningen fångas redan INUTI `createLoaderTask` (rad ~373):
 * `chunkFailure = waitFor(Promise.resolve().then(() =>
 * loadRouteChunk(...)), signal).then(() => void 0, (cause) => ...
 * normalizeLaneError(router, lane, route, cause, options))` konverterar
 * rejektionen till ett RESOLVAT värde. `preloadClientRoute`s (rad 1028)
 * yttre `try/catch` (rad 1058) triggas alltså ALDRIG av en chunk-import som
 * fallerar — `executeClientLane` kastar inget för det fallet, den resolvar
 * med ett felresultat som `reduceLane` sedan läser.
 *
 * (2) `reduceLane` (rad 477) tar emot det felresultatet, och dess `install()`
 * (rad 519) SÄTTER faktiskt `match.status = 'error'` (rad 522) på
 * preloadens egen `matches`-array. En tidigare version av detta stycke
 * påstod motsatsen ("ingen route-match sätts någonsin till error av en
 * preload") — det var bokstavligt fel; mutationen sker.
 *
 * (3) Den verkliga anledningen `SectionError` ändå aldrig renderas: den
 * muterade `matches`-arrayen är en SPEKULATIV kopia som ALDRIG PUBLICERAS.
 * `preloadClientRoute` avslutar i sin `finally` (rad 1048–1053) med enbart
 * `transferMatchResources(router, matches)` + `controller.abort()` — aldrig
 * `commitMatches`/`publishMatches`/`router.stores.setMatches`, de enda
 * ställena som skriver till `router.stores.matches` (rad
 * 708/740–744/769/846/895/1257) och därmed de enda som får
 * `Outlet`/`Match` att rendera en ny status. Utan den publiceringen ser
 * React-trädet aldrig den satta `"error"`-statusen — det är
 * PUBLICERINGEN som saknas för en preload, inte mutationen av matchen.
 *
 * `Link.js`s anropsplats lägger ändå ett eget skyddsnät ovanpå:
 * `router.preloadRoute(_options).catch((err) => { … console.warn(preloadWarning); })`
 * — ett bälte-och-hängslen mot en ANNAN felklass (t.ex. ett synkront
 * kastat fel innan chunk-hämtningen ens hinner starta), inte mekanismen som
 * skyddar chunk-fallet, vilket (3) redan gör strukturellt.
 *
 * Slutsatsen står fast: det enda som läcker ut är Vites egna window-event
 * (`vite:preloadError`), som `handlePreloadError` dispatchar OVILLKORLIGT
 * innan den (icke-refererade) `throw err` — och det är exakt den kanal denna
 * modul redan lyssnar på. En misslyckad hover-preload visar alltså
 * `ChunkBanner` NÅGOT TIDIGARE än förut (innan Lotta ens hunnit klicka) —
 * samma varning, samma kanal, ingen ny felyta.
 *
 * LAGERGRÄNSEN är window-eventet, exakt som i `app-uppdatering.ts`: denna fil
 * vet allt om Vites preload-helper och ingenting om React; UI-lagret vet att
 * appen inte kan hämta mer kod och ingenting om Vite.
 */

/**
 * Vites eget event för en misslyckad dynamisk import.
 *
 * Namnet är Vites, inte vårt, och skrivs därför utan `mm:`-prefix.
 */
export const VITE_PRELOAD_ERROR_EVENT = 'vite:preloadError';

/** Modul-nivå tillstånd — läses av `getSnapshot` i `useSyncExternalStore`. */
let omladdningKravs = false;
const prenumeranter = new Set<() => void>();

function chunkKundeInteHaemtas() {
  if (omladdningKravs) {
    return;
  }
  omladdningKravs = true;
  for (const meddela of prenumeranter) {
    meddela();
  }
}

// Modul-nivå lyssnare. Modulen dras in i entry-chunken via
// `AppUpdateBanner` → `src/routes/__root.tsx`, som är statiskt importerad.
// Lyssnaren finns därmed på plats innan den första lazy-laddade routen ens
// kan börja hämtas, vilket är den tidigaste punkt då eventet kan fyra.
if (typeof window !== 'undefined') {
  window.addEventListener(VITE_PRELOAD_ERROR_EVENT, chunkKundeInteHaemtas);
}

/** Prenumerera på tillståndsbytet. Kontraktet `useSyncExternalStore` kräver. */
export function prenumereraPaChunkLaddningsfel(vidAendring: () => void): () => void {
  prenumeranter.add(vidAendring);
  return () => {
    prenumeranter.delete(vidAendring);
  };
}

/** Nuvarande tillstånd. Kontraktet `useSyncExternalStore` kräver. */
export function laesChunkLaddningsfel(): boolean {
  return omladdningKravs;
}
