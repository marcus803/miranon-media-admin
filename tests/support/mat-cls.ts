import type { Page } from '@playwright/test';

/**
 * Mäter Cumulative Layout Shift (`PerformanceObserver`, `layout-shift`,
 * `hadRecentInput`-filtrerad — samma metod som web.dev/cls beskriver för
 * en `LayoutShift`-summa) på `/dev/primitives`-demosidan under en given
 * handling. Delad mellan `app-update-banner.test.ts` (TASK-285.1, AC #3)
 * och `offline-notis.test.ts` (TASK-285.6, AC #2) sedan `TASK-307`
 * (2026-08-26) — duplicerad `matCLS`-kod i båda filerna var själv en del
 * av rotorsaken: en fix landad i EN fils kopia (ursprungsdiagnosen nedan,
 * PR #1702) propagerade aldrig automatiskt till den andra.
 *
 * ROTORSAK TILL DEN ÅTERKOMMANDE CI-FÄLLNINGEN (`TASK-307`, S112 resume 1,
 * 2026-08-26) — MÄTT där det går, INDIKERAD (inte bevisad end-to-end) där
 * CI:s exakta race inte gått att reproducera lokalt. Se "KÄND GRÄNS" nedan
 * för den ärliga gränsen mellan de två.
 *
 * Ursprungsdiagnosen (PR #1702, jobb `96775581049`, kommentaren i
 * `app-update-banner.test.ts` innan denna extraktion) fastslog redan att
 * KÄLLAN till förskjutningen aldrig är notiskortet självt — `entry.sources[]`
 * pekade uteslutande på `/dev/primitives`-demosidans EGNA
 * `<h2 class="text-xl">`-rubriker, som byter typsnitt (fallback → Inter)
 * NÄR Google Fonts-svaret (`@import` i `src/styles/base.css`) hinner fram.
 * Fixen då: vänta in `document.fonts.ready` innan observatören startas.
 *
 * Den fixen var NÖDVÄNDIG men inte TILLRÄCKLIG — bevisat (mätt, inte
 * gissat) av att BÅDA testfilerna (båda med `document.fonts.ready`-väntan
 * redan på plats) ändå föll igen, bit-identiskt, i flera oberoende
 * `merge_group`-körningar (`32935931123` för #2000, `32936468038` för
 * #1992, plus `32636138454` för #1857 — `offline-notis.test.ts:207`, samma
 * klass). Mätt lokalt (TASK-307, `zzz-task307-diag.test.ts`, körning mot
 * dev-servern på `/dev/primitives`) VARFÖR den existerande väntan inte
 * räcker: Vite DEV-läge levererar `base.css` INTE som en
 * `<link rel="stylesheet">` i den initiala HTML:en utan injicerar den som
 * ett JS-genererat `<style>`-element (`styleDelivery.linkTags: []`,
 * `styleTagsWithImport: 1`) — och nätverksanropet till
 * `fonts.googleapis.com` visade sig starta på EXAKT samma millisekund som
 * webbläsarens `domcontentloaded`-event (`1120 ms` i den lokala mätningen,
 * request och event i samma logg-rad). Denna TIDSLINJE är genuint mätt.
 *
 * Att en sen upptäckt av ett `@import`-typsnitt kan få
 * `document.fonts.ready` att fullgöras FÖR TIDIGT är en dokumenterad,
 * återkommande KLASS av bugg över flera motorer — inte spekulation, men
 * läs källorna noga för vad var och en FAKTISKT visar:
 *
 * - `w3c/csswg-drafts#1082`, "document.fonts.ready promise resolution
 *   time does not match implementations" (foolip, 2017-03-07,
 *   https://github.com/w3c/csswg-drafts/issues/1082): *"the promise can
 *   resolve before anything else interesting happens"* — rapportören
 *   reproducerade detta i BÅDE Chrome, Firefox och Safari (en megabyte
 *   extra innehåll för att fördröja typsnittsladdningen fick `ready` att
 *   lösa ut FÖRE fördröjningen, i alla tre). Detta är den mest direkt
 *   tillämpliga källan för DENNA klass, som kör Chromium via
 *   `devices['Desktop Chrome']` — den enda av källorna som explicit
 *   inkluderar Chrome.
 * - WebKit Bugzilla `#174030`, "document.fonts.ready is resolved too
 *   quickly" (Dima Voytenko,
 *   https://bugs.webkit.org/show_bug.cgi?id=174030): *"The promise
 *   document.fonts.ready is resolved immediately even before any of the
 *   initially used fonts have been resolved."* RESOLVED FIXED 2019-08
 *   (Youenn Fablet, väntade in första layouten) — uppföljande kommentarer
 *   visade fixen ofullständig (specen kräver vänta in HELA
 *   dokumentladdningen, inte bara första layouten). Uppföljare: WebKit
 *   `#225790`, "document.fonts.ready is sometimes still resolved too
 *   quickly" (https://bugs.webkit.org/show_bug.cgi?id=225790).
 * - BÅDA WebKit-buggarna är Safari/WebKit-SPECIFIKA, inte Chromium. De
 *   citeras här som belägg för att KLASSEN av race (för tidig `ready`
 *   relativt sent upptäckta typsnitt) är verklig och återkommande över
 *   flera motorer — inte som bevis för en aktuell Chromium-bugg. Det
 *   senare styrks i stället, cross-engine inklusive Chrome, av #1082 ovan.
 *
 * (Tidigare version av denna kommentar citerade Mozilla bug 1162850 och
 * W3C csswg-drafts #13538. Fel källor, rättade efter granskning (review
 * på PR #2009): 1162850 är Gecko-specifik, RESOLVED FIXED redan i Firefox
 * 41, och beskriver att `fonts.ready` ALDRIG uppfylls — hänger — för en
 * sent tillkommen stilmall, motsatt riktning mot vårt problem (FÖR TIDIG
 * resolution). `#13538` är samma motsatta riktning: ett mejllista-inlägg
 * om att `ready`-löftet aldrig uppfylls för en TOM `FontFaceSet`. Ingen av
 * de två stödjer påståendet de tidigare citerades för.)
 *
 * Är `@import`-typsnittet inte redan känt av `FontFaceSet` i det ögonblick
 * `document.fonts.ready` avläses KAN — indikerat av källorna ovan, INTE
 * bevisat i just detta fall (se "KÄND GRÄNS") — löftet fullgöras FÖRE
 * typsnittsbytet, och det sena, omätta bytet ger den observerade,
 * per-viewport DETERMINISTISKA (samma flyttal varje gång racet slår till:
 * `0.002406863042591828` vid 390 px, `~0.0064xx` vid 1280 px) men
 * TIDSMÄSSIGT flaky förskjutningen.
 *
 * FIXEN väntar in NÄTVERKET i stället för att lita på FontFaceSet-API:ts
 * `ready`-semantik: `page.waitForLoadState('networkidle')` bryr sig inte
 * om VAD webbläsaren "vet" om typsnittet, bara om att inga nätverksanrop
 * längre pågår — den täcker därmed BÅDA hoppen i Google Fonts-kedjan
 * (CSS-svaret från `fonts.googleapis.com` OCH den efterföljande
 * `woff2`-hämtningen från `fonts.gstatic.com`) oavsett racets utfall.
 * `document.fonts.ready` behålls DÄREFTER som ett andra, i praktiken
 * kostnadsfritt skyddslager. Bevisat lokalt (samma diagnostik-fil, tre
 * körningar): med typsnitts-nätverket artificiellt fördröjt (1200 ms) via
 * `page.route` visar `document.fonts.status` redan `"loaded"` FÖRE
 * `document.fonts.ready`-anropet så fort `networkidle` väntats in först —
 * mot `"loading"` utan den väntan.
 *
 * `networkidle` ÄR DOKUMENTERAT AVRÅTT av Playwright för test-readiness,
 * ordagrant: *"'networkidle' - DISCOURAGED consider operation to be
 * finished when there are no network connections for at least 500 ms.
 * Don't use this method for testing, rely on web assertions to assess
 * readiness instead."* (playwright.dev/docs/api/class-page,
 * `waitForLoadState`). Avrådan gäller GENERELL test-readiness (t.ex. "är
 * sidan redo att interageras med?"), där bakgrundstrafik (analytics,
 * polling, öppna websockets) kan hindra `networkidle` från att någonsin
 * slå in. Här används den till något SMALARE: mätFÖRBEREDELSE i en klass
 * som (`CONTRIBUTING.md` § Webbläsarbeteende-klassen) MEDVETET INTE
 * pinnar Google Fonts (till skillnad från
 * `tests/support/fixturvarld/hermetic.ts`s pinnade Inter v20 för
 * visual/acceptance) och som saknar bakgrundstrafik att vänta ut — mätt:
 * samtliga diagnostik-körningar med `networkidle` löstes ut på 4,5–6,2 s,
 * långt under 30 s-timeouten, trots Vite HMR:s öppna websocket.
 * Alternativet `document.fonts.load()` avvisades: enligt CSS Font Loading
 * Module Level 3s egen algoritm för `FontFaceSet.load()`
 * (https://www.w3.org/TR/css-font-loading-3/#font-face-set-load) matchas
 * anropet mot REDAN KÄNDA `@font-face`-regler — hittas ingen matchande
 * regel (exakt vårt race: importen inte upptäckt än) fullgörs löftet
 * OMEDELBART med en TOM lista, utan fel. Ett sådant anrop hade alltså
 * kunnat bli en TYST NO-OP i precis den situation vi vill skydda mot, i
 * stället för att faktiskt vänta.
 *
 * INTE VALT: en tolerans-tröskel (`toBeLessThan(ε)`). Rotorsaken är en
 * FIXBAR mät-race, inte ett genuint, opåverkbart mätbrus — samma princip
 * ursprungsdiagnosen redan slog fast ("gör mätningen ärlig i stället för
 * att lätta på assertionen"). En tröskel hade dolt en framtida, RIKTIG
 * layoutförskjutning av notisen lika tyst som `toBeLessThan(0.1)` hade
 * gjort då.
 *
 * KÄND GRÄNS: den exakta CI-racen (Linux, kall nätverkscache) kunde INTE
 * 100-procentigt repliceras lokalt (macOS) trots artificiell nätverks-
 * fördröjning — se `TASK-307`s Final Summary för fullständig mätserie.
 * Fixens grund är alltså INDIKERAD, inte bevisad end-to-end: (a) den
 * uppmätta race-FÖRUTSÄTTNINGEN är genuint mätt (request och
 * `domcontentloaded` på samma millisekund), (b) den dokumenterade
 * bug-KLASSEN ovan är verklig och cross-engine — inklusive Chrome, #1082
 * — men inte en direkt observation av en Chromium-bugg just nu, och (c)
 * att `networkidle` lokalt bevisligen stänger racets fönster mot en
 * ARTIFICIELL fördröjning är mätt. (a)+(b)+(c) tillsammans är ett starkt
 * indicium, inte en direkt lokal reproduktion av själva CI-fällningen.
 *
 * ESKALERING OM SYMPTOMET ÅTERKOMMER EN TREDJE GÅNG: nästa steg är att
 * PINNA Google Fonts (samma mönster som visual/acceptance-klassernas
 * `tests/support/fixturvarld/hermetic.ts`, Inter v20) ENBART för denna
 * mät-helper — inte för hela `webblasarbeteende`-klassen, som medvetet
 * kör mot RIKTIGA typsnitt/nätverk (se filhuvudena i
 * `app-update-banner.test.ts`/`offline-notis.test.ts`). En pinnad font
 * eliminerar racet strukturellt (inget nätverksberoende typsnittsbyte kvar
 * att mäta in) på bekostnad av att just denna mätning slutar pröva mot
 * verkliga Google Fonts-förhållanden. Bokfört i `TASK-307`s kort-notes.
 */
/** Global tillfällig hemvist för den ackumulerade CLS-summan
 *  (`window.__mmClsSum`) + en engångsspärr (`__mmClsInstalled`, review-runda
 *  1 FYND 5). Båda fälten OPTIONELLA med avsikt: frånvaro av `__mmClsSum` är
 *  den signal `lasAvClsSumma` fail-closed:ar på (se dess docblock), inte ett
 *  typfel att tysta bort. Egen typad accessor i stället för `as unknown as`
 *  upprepat på varje anropsplats (TASK-416.14-extraktionen). */
type ClsWindow = { __mmClsSum?: number; __mmClsInstalled?: boolean };

/**
 * Sidans EGEN observatörskod (körs i browser-kontext via `page.evaluate`
 * ELLER `page.addInitScript` — se de två anropsplatserna nedan för varför
 * det skiljer sig). `PerformanceObserver('layout-shift')`,
 * `hadRecentInput`-filtrerad — samma metod som web.dev/cls beskriver.
 * Extraherad ur `matCLS` (TASK-307) oförändrad; TASK-416.14 la till en andra
 * anropsplats som behöver installera den FÖRE i stället för EFTER
 * page-settle (se `matCLSOverNavigering` nedan).
 *
 * ENGÅNGSKONTRAKT (review-runda 1, FYND 5): `installeraLayoutShiftObservator`
 * registrerar detta script via `page.addInitScript`, som kör vid VARJE
 * efterföljande navigering/frame-attach i sidans HELA livstid — inte bara
 * den första. Utan vakten hade en andra navigering på SAMMA `page` (två
 * `matCLSOverNavigering`-anrop, eller en hård omnavigering mitt i en
 * mätning) nollställt `__mmClsSum` och lagt till en ANDRA
 * `PerformanceObserver`, så varje efterföljande shift räknats två gånger.
 * `__mmClsInstalled`-flaggan gör funktionen idempotent: andra och senare
 * körningar i samma dokument-liv är no-ops. Ingen anropsplats i DENNA fil
 * träffar fällan i dag (ett anrop per test) — spärren är förebyggande för
 * framtida återanvändning av denna EXPORTERADE bibliotekskod.
 */
function installeraObservatorIBrowsern(): void {
  const w = window as unknown as ClsWindow;
  if (w.__mmClsInstalled) return;
  w.__mmClsInstalled = true;
  w.__mmClsSum = 0;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as unknown as Array<{
      value: number;
      hadRecentInput: boolean;
    }>) {
      if (!entry.hadRecentInput) {
        w.__mmClsSum = (w.__mmClsSum ?? 0) + entry.value;
      }
    }
  });
  observer.observe({ type: 'layout-shift', buffered: false } as PerformanceObserverInit);
}

/** Installerar layout-shift-observatören FÖRE nästa navigering
 *  (`page.addInitScript` — körs innan sidans EGET script hinner göra sin
 *  första layout, så INGEN shift missas). `Promise<void>` här (inte
 *  Playwrights egen `Promise<Disposable>`): ingen anropsplats i denna fil
 *  behöver disponera init-scriptet, och en smalare returtyp håller
 *  anropsställena okopplade från exakt vilken Playwright-version som
 *  introducerade `Disposable`. */
export async function installeraLayoutShiftObservator(page: Page): Promise<void> {
  await page.addInitScript(installeraObservatorIBrowsern);
}

/**
 * Läser av den ackumulerade CLS-summan sedan observatören installerades.
 *
 * FAIL-CLOSED (review-runda 1, FYND 3 — rättat): en tidigare version läste
 * `__mmClsSum ?? 0`, vilket gjorde ett DÖTT instrument (init-scriptet aldrig
 * kört — glömd `installeraLayoutShiftObservator`, dokumentet ersatt under
 * mätningen, en framtida race) OMÖJLIGT att skilja från ett GENUINT
 * CLS-resultat på 0: båda gav en grön `expect(cls).toBeLessThan(0.05)` utan
 * att någon mätning faktiskt ägt rum. Samma disciplin som husets övriga
 * grindar (`review:policy`/`review:backstopp` exit 64/3 vid ett strukturellt
 * antagande som brustit) — en grind som tyst degraderar till "alltid grönt"
 * vid instrumentbortfall är farligare än ingen grind alls. `typeof`-kollen
 * körs I BROWSERN (inte efteråt i Node): TypeScript-typningen `?:` säger
 * inget om RUNTIME-närvaro, och serialiseringen över `page.evaluate`s gräns
 * kräver ett värde `page.evaluate` faktiskt kan skicka tillbaka (`null`, inte
 * `undefined`-kastat innan gränsen ens passerats).
 */
export async function lasAvClsSumma(page: Page): Promise<number> {
  const sum = await page.evaluate(() => {
    const rått = (window as unknown as ClsWindow).__mmClsSum;
    return typeof rått === 'number' ? rått : null;
  });
  if (sum === null) {
    throw new Error(
      'lasAvClsSumma: window.__mmClsSum saknas — observatören verkar aldrig ha ' +
        'installerats (installeraLayoutShiftObservator/matCLS glömdes, eller ' +
        'dokumentet byttes under mätningen). Fail-closed med avsikt: se docblocket.',
    );
  }
  return sum;
}

export async function matCLS(
  page: Page,
  viewport: { width: number; height: number },
  utlosOchVantaSynlig: (page: Page) => Promise<void>,
): Promise<number> {
  await page.setViewportSize(viewport);
  await page.goto('/dev/primitives');
  // .first(): sidan bär flera h1-rubriker sedan TASK-285.3 (AppError-
  // fallbackens demo-sektion, facit-formen) — samma scopning som
  // testfilernas egna `oppnaAppen`.
  await page.getByRole('heading', { level: 1 }).first().waitFor();

  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);

  // Installeras EFTER page-settle (medvetet, se filhuvudets race-diagnos):
  // observatören ska bara fånga shifts EFTER att font-racet redan lagt sig,
  // aldrig själva font-bytet. `page.evaluate` (inte `addInitScript`) kör
  // koden NU, i det redan lastade dokumentet.
  await page.evaluate(installeraObservatorIBrowsern);

  await utlosOchVantaSynlig(page);

  return lasAvClsSumma(page);
}

/**
 * Mäter ackumulerad CLS över en HEL NAVIGERING (TASK-416.14, CLS-grinden) —
 * till skillnad från `matCLS` ovan, som mäter en ENSKILD HANDLING på en
 * redan lastad och stabiliserad `/dev/primitives`-sida. Denna variant
 * bevisar regeln "sidkromet renderas i alla tillstånd" (PRD TASK-416): att
 * bytet från skeleton till riktigt innehåll — på en RIKTIG app-vy, mätt
 * FRÅN FÖRE NAVIGERINGEN — aldrig knuffar layouten.
 *
 * OBSERVATÖREN INSTALLERAS FÖRE `page.goto`, INTE EFTER (den avgörande
 * skillnaden mot `matCLS`): en observatör installerad EFTER navigeringen
 * hade per definition missat varje shift som redan inträffat under den
 * ALLRA FÖRSTA renderingen — precis den transienten grinden ska fånga
 * (splash → sidkrom → skelett → innehåll). `page.addInitScript` kör i
 * dokumentets FÖRSTA mikrotask, före appens egen `main.tsx`.
 *
 * VARFÖR INGEN FONT-RACE-MITIGERING HÄR (skillnad mot `matCLS`s
 * `networkidle`+`document.fonts.ready`-väntan): den racen är specifik för
 * `/dev/primitives`s RIKTIGA Google Fonts-nätverksanrop (se `matCLS`s
 * filhuvud, hela diagnosen). Anroparens `page`-fixtur i DENNA klass
 * (`tests/support/fixturvarld/hermetic.ts`) pinnar typsnittet via
 * `page.route`-interception mot LOKALA filer på disk (Inter v20,
 * `hermetic.ts` § Typsnitts-pinning) — inget externt CDN-anrop existerar
 * att racea mot. Att ÄNDÅ invänta `networkidle` här hade dessutom motverkat
 * hela syftet: testets egna fördröjda EF-svar (MSW `delay()`) HÅLLER
 * nätverket upptaget under precis det fönster vi vill mäta, så
 * `networkidle` skulle inte slå in förrän EFTER att innehållet redan landat
 * — samma tidsfönster `navigeraOchVantaKlar` redan väntar in explicit.
 *
 * MÄT-STILLHET (dubbel rAF) EFTER `navigeraOchVantaKlar`: samma disciplin
 * som husets boundingBox-mätningar (L246, se t.ex.
 * `event-checkin-laddlage.acceptance.test.ts`) — en sista layout kan annars
 * hinna committas efter att innehållet blivit `visible` men före att
 * `PerformanceObserver`s callback hunnit köra (den är mikrotask-schemalagd,
 * inte synkron med DOM-mutationen).
 *
 * @param navigeraOchVantaKlar Anropas EFTER `page.goto(url)`. Ansvarar för
 *   att invänta det LADDADE sluttillståndet (t.ex. `expect(...
 *   ).toBeVisible()` på en riktig rad/rubrik) — INTE för att sätta upp
 *   nätverksmockar: `network.use(...)` måste ske i testet INNAN denna
 *   funktion anropas, eftersom `page.goto` triggar den första hämtningen.
 */
export async function matCLSOverNavigering(
  page: Page,
  viewport: { width: number; height: number },
  url: string,
  navigeraOchVantaKlar: (page: Page) => Promise<void>,
): Promise<number> {
  await page.setViewportSize(viewport);
  await installeraLayoutShiftObservator(page);
  await page.goto(url);

  await navigeraOchVantaKlar(page);

  await page.evaluate(
    () =>
      new Promise<void>((klar) => requestAnimationFrame(() => requestAnimationFrame(() => klar()))),
  );

  return lasAvClsSumma(page);
}
