import AxeBuilder from '@axe-core/playwright';
import { bekraftelseFixtur } from '../../src/components/betalningar/prototype/fixtur';
import { expect, type Page, type Route, test } from '../support/test-bas';

/**
 * [TASK-416.6, ADR-113 steg 4] LADDLÄGETS MÄTNING — den nakna textraden
 * "Hämtar öppna betalningar …" är riven (`Bekraftelsesteget.tsx`); denna svit
 * BEVISAR att ersättningen faktiskt håller AC #1/#3: sidkromet (rubriken)
 * står EXAKT still mellan ladd- och laddat läge, och det första skelettkortet
 * har den laddade listans riktiga höjd.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STAGING-E2E OCH INTE `tests/acceptance/` — SAMMA SKARV SOM SYSKONFILERNA
 * ═══════════════════════════════════════════════════════════════════════════
 * `VITE_FEATURE_BETALNINGAR` är explicit `'av'` för den delade
 * acceptance/visual/webblasarbeteende/manifest-fixturvärlden
 * (`playwright.config.ts`), och routens `beforeLoad` redirectar då till
 * `/mer` (`betalningarPa()`). Staging bär `pa`. Formen är därför
 * `bekraftelsesteget-promoverings-grind.staging.test.ts`s och
 * `bekraftelsesteget-formen-fore-stampeln.staging.test.ts`s: `page.route`,
 * ALDRIG `network.use()`, ingen delad staging-data rörs — bara
 * `hamta-oppna-betalningar` mockas (samma svarsform som promoverings-
 * grinden, `bekraftelseFixtur()`), och HÅLLS OSVARAD tills mätningen av
 * ladd-läget är klar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR EN EGEN FIL OCH INTE EN TILLAGD TEST I PROMOVERINGS-GRINDEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Promoverings-grinden fångar ARIA-STRUKTUREN i det LADDADE läget
 * (`data-testid="bekraftelsesteget"`, som `BulkC` renderar) — den träffar
 * aldrig `fraga.isLoading`-grenen (`Bekraftelsesteget.tsx`), eftersom dess
 * mock svarar omedelbart. Den grenen är helt UTANFÖR facit-låset (rubriken
 * "Bulkregistrering" i det låsta trädet är en ANNAN DOM-nod, `BulkC`s egen —
 * se `Bekraftelsesteget.tsx`s docblock för `BekraftelsestegetSkelett` för
 * hela resonemanget om varför rubriken måste SPEGLAS i stället för delas).
 * Den här filen mäter alltså en yta ingen annan fil rör.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * [FIX-RUNDA 2] TVÅ VIEWPORTS OCH IMPORTFLÖDETS HEADER-RAD
 * ═══════════════════════════════════════════════════════════════════════════
 * Review-runda 1 fångade två gap: (1) mätningen körde bara 1280×720 —
 * `MarkerbartKort`s wrapper (`flex flex-col gap-3 sm:flex-row …`) staplar
 * korten under Tailwinds `sm`-brytpunkt (640px), en ANNAN DOM-geometri ingen
 * fil i familjen mätte (syskonfilernas IPAD-viewport, 820px, ligger ÖVER
 * brytpunkten). `MOBIL` nedan (390×844, CLAUDE.md:s mobilgolv) täcker den.
 * (2) skelettets header saknade importflödets villkorade `Kallrad`-rad — se
 * `Bekraftelsesteget.tsx`s docblock för `BekraftelsestegetSkelett` för hela
 * resonemanget (fixat genom att rendera SAMMA `Kallrad`-komponent, inte en
 * kopia). Testet nedan (`kalla=import`) bevisar att headerns TOTALA
 * boundingBox — rubrik + statusrad + Kallrad-raderna tillsammans — inte
 * hoppar när datan landar.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';

/**
 * 1280×720 — SAMMA mått som syskonskivornas egna mätningar i denna PRD
 * (`event-checkin-laddlage.acceptance.test.ts`s "1280x720, Chromium",
 * `hem-laddlage.acceptance.test.ts`), inte promoverings-grindens 1440×900.
 * De två filerna mäter olika saker (ARIA-struktur kontra boundingBox) och
 * behöver inte dela viewport.
 */
const DESKTOP = { width: 1280, height: 720 };

/**
 * 390×844 — CLAUDE.md:s golv för mobil-QA, UNDER Tailwinds `sm`-brytpunkt
 * (640px). Se filhuvudets § [FIX-RUNDA 2] för varför detta INTE var mätt
 * innan: syskonfilernas IPAD-viewport (820px) ligger över brytpunkten och
 * övar därför aldrig den staplade layouten.
 */
const MOBIL = { width: 390, height: 844 };

const IDS = bekraftelseFixtur()
  .map((b) => b.anmalanRecordId)
  .join(',');
const STEG_URL = `/mer/betalningar/registrera?ids=${IDS}`;

/**
 * Mockar `hamta-oppna-betalningar` men SVARAR INTE förrän `slapp()` anropas.
 *
 * Samma grind-idiom som promoverings-grindens `hallForstaSvaret`
 * (`bekraftelsesteget-promoverings-grind.staging.test.ts` § `mocka`), fast
 * riktat mot den FÖRSTA hämtningen i stället för första
 * `registrera-inbetalning`-svaret: en Promise som aldrig löser sig själv
 * håller `fraga.isLoading` sant tills testet uttryckligen släpper den.
 */
async function mockaHallbar(page: Page): Promise<() => void> {
  let slapp: () => void = () => {};
  const hall = new Promise<void>((resolve) => {
    slapp = resolve;
  });
  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await hall;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: bekraftelseFixtur(), forfallna: 1 }),
    });
  });
  return slapp;
}

test.describe('TASK-416.6 — laddläget (ADR-113 steg 4)', () => {
  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['mobil', MOBIL],
  ] as const) {
    test(`${namn} — rubriken och första kortets boundingBox är identiska ladd- och laddat läge`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const slapp = await mockaHallbar(page);
      await page.goto(STEG_URL);

      // ANKARET FÖR LADD-LÄGET: `role="status"`-containerns dolda besked —
      // bevisar att SKELETTET (inte en tom sida) faktiskt är monterat innan
      // någon mätning görs.
      await expect(page.getByText('Hämtar öppna betalningar …')).toBeAttached();

      const rubrik = page.getByRole('heading', { name: 'Bulkregistrering', level: 1 });
      // `getByRole('listitem').first()` träffar FÖRSTA `<li>` på sidan i BÅDA
      // lägena: skelettets tre platshållarrader i ladd-läget, den riktiga
      // `MarkerbartKort`-raden (Anna Lindqvist) i laddat läge — ingen egen
      // testid behövs, samma lokator bär paret. Detta håller ÄVEN i `mobil`:
      // wrapper-klasserna är identiska (speglade), så kortet staplar likadant
      // i båda lägena oavsett viewport.
      const forstaKortet = page.getByRole('listitem').first();

      await expect(rubrik).toBeVisible();
      await expect(forstaKortet).toBeVisible();
      const rubrikLadd = await rubrik.boundingBox();
      const kortLadd = await forstaKortet.boundingBox();
      expect(rubrikLadd).not.toBeNull();
      expect(kortLadd).not.toBeNull();

      // AXE PÅ LADD-LÄGET — ny yta, ingen tidigare svit har rört den. Körs i
      // BÅDA viewports (repots golv är 11/11 tillgänglighet, inga undantag).
      // `.include('main')` — samma scope som `bekraftelsesteget-formen-
      // fore-stampeln.staging.test.ts` (AppShell.tsx: `<main id="main">`).
      const laddResultat = await new AxeBuilder({ page }).include('main').analyze();
      expect(laddResultat.violations).toEqual([]);

      slapp();
      // ANKARET FÖR DET LADDADE LÄGET: alla tio raderna har landat och
      // modellen byggts — samma ankare som promoverings-grindens `oppna()`.
      await expect(page.getByText('10 av 10 inbetalningar markerade')).toBeVisible({
        timeout: 15_000,
      });

      const rubrikLaddad = await rubrik.boundingBox();
      const kortLaddat = await forstaKortet.boundingBox();
      expect(rubrikLaddad).not.toBeNull();
      expect(kortLaddat).not.toBeNull();

      // MÄTNINGEN — samma tal, mätt vid rätt tillfälle, är LEVERANSEN
      // (uppdragets ord): rubrikens och första kortets boundingBox är
      // BYTE-IDENTISKA genom hela övergången, trots att det är två olika
      // DOM-noder som råkar rendera på samma plats.
      expect(rubrikLadd).toEqual(rubrikLaddad);
      expect(kortLadd).toEqual(kortLaddat);
    });
  }

  /**
   * [FIX-RUNDA 2, FYND 1] IMPORTFLÖDET — HEADERNS `Kallrad`-RAD FÅR INTE
   * KNUFFA TILL LAYOUTEN NÄR DATAN LANDAR.
   *
   * `kalla`/`minne` är BÅDA kända SYNKRONT (route-prop + `lasImport()` i en
   * `useState`-initierare, `Bekraftelsesteget.tsx`), oberoende av
   * `hamta-oppna-betalningar` — så importminnet seedas direkt i
   * `sessionStorage` via `addInitScript` (körs FÖRE appens egna skript,
   * Playwrights garanti) i stället för att drivas genom den fulla
   * uppladdnings-UI:n (`betalningar-import-bekraftelsesteget.staging.test.ts`s
   * `importera()`) — den filen övar redan hela vägen från filväljaren; denna
   * fil övar bara att `Bekraftelsesteget.tsx`s laddläges-skelett läser SAMMA
   * minne och ritar SAMMA `Kallrad`-rad som `BulkC` gör efteråt.
   *
   * `page.locator('header')` — det finns EXAKT en `<header>` på sidan i
   * VARDERA läget (skelettets egen, sedan `BulkC`s), och ingen annanstans i
   * `AppShell` (verifierat: `grep -rn "<header" src/components/AppShell/`
   * gav noll träffar) — samma lokator bär alltså paret, precis som
   * `getByRole('listitem').first()` gör för kortet ovan.
   *
   * `rader: []` I MINNET, MED AVSIKT: detta test mäter HEADERN, inte
   * importradernas "Behöver din hand"-sektion (den täcks av
   * `betalningar-import-bekraftelsesteget.staging.test.ts`). Ett tomt
   * `rader`-fält är giltigt mot `ImportminneSchema` och håller mockens
   * `hamta-oppna-betalningar`-svar (hela fixturen) opåverkat av
   * matchnings-logiken.
   */
  test('import: headerns boundingBox (rubrik + Kallrad) är identisk ladd- och laddat läge', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    const minne = {
      skapad: new Date().toISOString(),
      filnamn: 'kontoutdrag-laddlage-matning.csv',
      bank: 'Handelsbanken',
      lasta: 5,
      bortfiltrerade: 2,
      fel: [{ radnummer: 7, skal: 'Kunde inte tolkas' }],
      rader: [],
    };
    await page.addInitScript((serialiserat) => {
      window.sessionStorage.setItem('mm.betalningar.import', serialiserat);
    }, JSON.stringify(minne));

    const slapp = await mockaHallbar(page);
    await page.goto('/mer/betalningar/registrera?kalla=import');

    // ANKARET FÖR LADD-LÄGET, och BEVIS på att importminnet faktiskt lästes:
    // `Kallrad`s egen text ("<filnamn> · N rader") ska synas REDAN under
    // laddning — det är precis vad fyndet krävde.
    await expect(page.getByText('Hämtar öppna betalningar …')).toBeAttached();
    const header = page.locator('header');
    await expect(header.getByText(/kontoutdrag-laddlage-matning\.csv/)).toBeVisible();
    await expect(header.getByText('2 rader i filen var inte inbetalningar')).toBeVisible();
    await expect(header.getByText('Rad 7: Kunde inte tolkas')).toBeVisible();

    const headerLadd = await header.boundingBox();
    expect(headerLadd).not.toBeNull();

    slapp();
    // ANKARET FÖR DET LADDADE LÄGET: `BulkC` monterad (samma testid oavsett
    // manuell/import-väg).
    await expect(page.getByTestId('bekraftelsesteget')).toBeVisible({ timeout: 15_000 });
    // Samma `Kallrad`-rader ska stå kvar, oförändrade, i den RIKTIGA headern.
    await expect(header.getByText(/kontoutdrag-laddlage-matning\.csv/)).toBeVisible();

    const headerLaddad = await header.boundingBox();
    expect(headerLaddad).not.toBeNull();

    // MÄTNINGEN: headerns TOTALA boundingBox (rubrik + statusrad + de tre
    // Kallrad-raderna) är BYTE-IDENTISK genom övergången.
    expect(headerLadd).toEqual(headerLaddad);
  });
});
