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
  test('rubriken och första kortets boundingBox är identiska ladd- och laddat läge', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
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
    // testid behövs, samma lokator bär paret.
    const forstaKortet = page.getByRole('listitem').first();

    await expect(rubrik).toBeVisible();
    await expect(forstaKortet).toBeVisible();
    const rubrikLadd = await rubrik.boundingBox();
    const kortLadd = await forstaKortet.boundingBox();
    expect(rubrikLadd).not.toBeNull();
    expect(kortLadd).not.toBeNull();

    // AXE PÅ LADD-LÄGET — ny yta, ingen tidigare svit har rört den.
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
});
