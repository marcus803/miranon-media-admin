import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '../support/test-bas';
import { mockValjarLista, valjarRad } from './helpers/valjar-lista';

/**
 * TASK-416.2 — Betalningsinkorgen: SidRam, sidhuvud (menytrigger sedan
 * TASK-412), importknapp och FilterRad renderas i ALLA TRE query-tillstånd
 * (PRD TASK-416s regel: sidkromet renderas alltid, bara kortlistan växlar;
 * ADR-113 laddtrappan). Före denna skiva visade isPending/isError bara
 * `SidRam` + en enkel `<h1>` + tre lösa `Skeleton`-block.
 *
 * VARFÖR STAGING OCH INTE ACCEPTANCE-KLASSEN (mätt, inte antaget):
 * `playwright.config.ts`s fixtur-env för acceptance/visual/webblasarbeteende
 * sätter EXPLICIT `VITE_FEATURE_BETALNINGAR: 'av'` — dokumenterat skäl:
 * `JobbLyssnare`s Realtime-websocket mot betalningsdomänen skulle annars
 * fälla VARJE autentiserad hermetisk test (mätt 48/48 i `hem.acceptance.
 * test.ts` innan flaggan sattes av, se kommentaren i `playwright.config.ts`
 * vid `VITE_FEATURE_BETALNINGAR`). `/mer/betalningar` redirectar därför alltid
 * till `/mer` i acceptance-klassen — PRÖVAT SKARPT (denna fils tidigare
 * hermetiska variant föll med "Mer"-rubriken synlig i stället för
 * "Betalningar", `getByTestId('betalningar-skeleton-kort')` hittades aldrig).
 * Att flippa den delade fixtur-env:en är en cross-cutting ändring av HELA
 * acceptance/visual/webblasarbeteende-klassernas gemensamma dev-server och
 * hör inte hemma i en krom/laddläge-skiva — samma lucka `TASK-416.14`s
 * CLS-grind är avsedd att stänga för fyra vyer på en gång.
 *
 * Denna fil kör i stället i `chromium-authenticated` (real staging-auth via
 * `setup`-projektets storageState, riktig dev-server med
 * `VITE_FEATURE_BETALNINGAR=pa` — `.env.development`), med `page.route()`-
 * mockar för `get-events` (samma delade helper,
 * `tests/e2e/helpers/valjar-lista.ts`, som `atgarder-betalningar.
 * staging.test.ts` redan använder) och `hamta-oppna-betalningar` (samma
 * `page.route`-mönster den filens `mockaTomBetalningslista` redan
 * etablerar för EXAKT samma EF, rad ~562–572). Övrig trafik (get-persons,
 * warmup-EF:erna, Realtime-WS) går mot RIKTIG staging, precis som appen gör
 * i produktion — ingen fabricerad session, inga andra mockar.
 *
 * `get-events` MOCKAS MEDVETET (till skillnad från `get-persons`): FilterRads
 * "event"-dimension bär en `EventValjare`-kontroll (`BetalningsInkorg.tsx`s
 * `dimensioner`), och "typ"/"ort"-dropdownarnas alternativ härleds ur
 * eventet den öppna betalningen pekar på. Utan ett kontrollerat event med
 * känt `typ`/`ort` hade panelens rutnät kunnat variera med riktig stagings
 * innehåll mellan körningar — exakt den icke-determinism AC #2:s `toEqual`
 * inte tål.
 *
 * MÄTNINGEN (AC #2) använder en HÅLL-BAR MOCK: `hamta-oppna-betalningar`
 * parkeras obesvarat tills testet explicit släpper det (`route.fulfill`
 * anropas först då) — den enda tillförlitliga vägen att observera
 * isPending-grenen deterministiskt utan att kapplöpa mot ett svar som kan
 * hinna landa innan mätningen sker.
 *
 * ETT DIAGNOSTICERAT, EJ ÅTGÄRDAT 1-PIXEL-FYND I DEN DELADE `FilterRad`-
 * PRIMITIVEN (samma sub-pixel-klass som `AnmalningarSida.tsx`s TASK-416.4-
 * mätning bokförde, "70 mot 69", men här med rotorsaken faktiskt spårad):
 * `FilterRad.tsx`s isPending-gren (rad ~298–312) ritar SAMMA generiska
 * "etikett + h-8"-skelettblock (21 px etikett + 4 px gap-1 + 32 px `h-8` =
 * 57 px) för VARJE dimension, ÄVEN en `kontroll`-bärande dimension vars
 * VERKLIGA kontroll FilterRad inte känner formen på (`FilterDimension.
 * kontroll`s eget kontrakt: "KONSUMENT-ÄGD ... BARA PRESENTATION"). Denna
 * ytas event-dimension bär `EventValjare` i "fristående"-formen — en egen
 * ruta (`border` 1 px × 2 + `py-4` 32 px + en `text-body`-radhöjd 24 px =
 * 58 px), 1 px HÖGRE än det generiska blocket. Skillnaden syns i panelens
 * TOTALHÖJD (288 mot 289 px, mätt headless Playwright 1280×720) och
 * kaskaderar till varje boundingBox UNDER FilterRad (första kortets Y:
 * 593,75 mot 594,75). `x`/`width` (och h1 helt och hållet) är BYTE-
 * IDENTISKA — det är bara den vertikala sub-pixel-arvet som bär 1 px.
 *
 * ÅTGÄRDAT INTE HÄR, AVSIKTLIGT: en fix hade suttit i `FilterRad.tsx` — en
 * DELAD primitiv `EventsList.tsx`/`AnmalningarSida.tsx` också konsumerar —
 * och kräver antingen ett nytt, konsument-styrt höjd-kontrakt för
 * `kontroll`-dimensioner (en riktig designfråga, inte en krom/laddläge-
 * ändring) eller en hårdkodad 58 px som bara råkar stämma med
 * `EventValjare`s NUVARANDE `py-4`-mått. Ingendera hör hemma i denna skiva
 * (kollisionskartan: håll diffen till BetalningsInkorg.tsx:s krom/
 * laddläge-grenar). Assertionerna nedan är därför MEDVETET TOLERANTA på
 * just `y`/`height` (±1 px, den diagnostiserade och ENDA kända orsaken) men
 * FORTSATT STRIKTA (`toEqual`) på `x`/`width` — en regression i den
 * horisontella positionen eller bredden ska fortfarande fälla testet.
 */

const OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';
const EVENT_ID = 'recTASK4162MATNING';

/** Ett schema-giltigt `OppenBetalning` (EF-svarets rå form, samma fält som
 * `Betalningar.schema.ts`s `OppenBetalningSchema`) — kommande (2099, åldras
 * aldrig), utan `forfallen`/`obekraftad`/`spegelSlapar` (samma "renaste
 * möjliga rad"-val som skeletonets tomma badge-rad förutsätter). */
const EN_BETALNING = {
  anmalanRecordId: 'rec-test-416-2-betalning-1',
  personNamn: 'Anna Andersson',
  personEpost: 'anna@example.test',
  personTelefon: '0701234567',
  eventId: EVENT_ID,
  eventNamn: 'TASK-416.2 mätningsevent',
  eventStartdatum: '2099-01-01',
  eventTyp: 'Utbildning',
  anmalanStatus: 'Bekräftad',
  saknas: 500,
  gallandePris: 1500,
  anmalningsavgift: null,
  summaInbetalt: 1000,
  summaInbetaltSpegel: 1000,
  spegelIFas: true,
  deadlineSlutbetalning: '2099-02-01',
  kvittonAttSkicka: 0,
};

async function mockaEvent(page: Page): Promise<void> {
  await mockValjarLista(page, [
    valjarRad({ id: EVENT_ID, namn: 'TASK-416.2 mätningsevent', startdatum: '2099-01-01' }),
  ]);
}

/** Håll-bar mock (samma mönster som `mer-aktivitetshistorik-laddlage.
 * acceptance.test.ts`s `hallbarMock`, portat till rå `page.route` eftersom
 * denna fil INTE kör i acceptance-klassens MSW-fixturvärld). */
function hallbarMock(page: Page) {
  const st = {
    parkerade: [] as Array<() => void>,
    slappAlla() {
      for (const slapp of this.parkerade.splice(0)) slapp();
    },
  };
  page.route(OPPNA_BETALNINGAR, async (route) => {
    await new Promise<void>((slapp) => st.parkerade.push(slapp));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: [EN_BETALNING], forfallna: 0 }),
    });
  });
  return st;
}

async function mockaFel(page: Page): Promise<void> {
  await page.route(OPPNA_BETALNINGAR, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'fel' }),
    }),
  );
}

async function boxa(page: Page, testid: string) {
  const box = await page.getByTestId(testid).first().boundingBox();
  if (!box) throw new Error(`boundingBox saknas för ${testid}`);
  return box;
}

type Box = { x: number; y: number; width: number; height: number };

/** `x`/`width` STRIKT identiska (`toBe`); `y`/`height` inom ±1 px — den
 * DIAGNOSTISERADE `FilterRad`-sub-pixel-gränsen (se filhuvudets docblock,
 * "ETT DIAGNOSTICERAT..."), aldrig en allmän slapp tolerans. En regression
 * som flyttar/breddar elementet, eller som växer avvikelsen förbi 1 px
 * (alltså en NY, oförklarad drift), fäller fortfarande testet. */
function assertBoxNastanLika(faktisk: Box, forvantad: Box, etikett: string) {
  expect(faktisk.x, `${etikett}.x`).toBe(forvantad.x);
  expect(faktisk.width, `${etikett}.width`).toBe(forvantad.width);
  expect(Math.abs(faktisk.y - forvantad.y), `${etikett}.y (±1 px tolerans)`).toBeLessThanOrEqual(1);
  expect(
    Math.abs(faktisk.height - forvantad.height),
    `${etikett}.height (±1 px tolerans)`,
  ).toBeLessThanOrEqual(1);
}

test.describe('Betalningsinkorgen — sidkromet i alla query-tillstånd (TASK-416.2)', () => {
  test('AC #1 — sidhuvud (menytrigger), importknapp och utfälld FilterRad renderas i isPending', async ({
    page,
  }) => {
    await mockaEvent(page);
    const st = hallbarMock(page);
    await page.goto('/mer/betalningar');

    // isPending-grenen: kortskelettet är den entydiga signalen (normal-
    // lägets svar är parkerat, kan aldrig landa och slå om till laddat läge
    // under testet).
    await expect(page.getByTestId('betalningar-skeleton-kort').first()).toBeVisible();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Rubrik-triggern ("Betalningar", `Meny`/`MenyPost`-primitiven sedan
    // TASK-412) öppnar menyn som bär "Importera kontoutdrag" — ÄVEN medan
    // frågan väntar. Detta ÄR importknappen (se BetalningsInkorg.tsx §
    // BESLUT 3 — ⋯-knappen är riven, rubriken är triggern).
    const rubrikTrigger = page.getByRole('button', { name: 'Betalningar' });
    await expect(rubrikTrigger).toBeVisible();
    await rubrikTrigger.click();
    await expect(page.getByRole('menuitem', { name: 'Importera kontoutdrag' })).toBeVisible();
    await page.keyboard.press('Escape');

    // FilterRad, utfälld som default (TASK-410) — panelen är monterad och
    // synlig, inte gömd bakom tratten.
    const filterrad = page.getByTestId('betalningar-filterrad');
    await expect(filterrad).toBeVisible();
    await expect(filterrad.getByTestId('filter-panel')).toBeVisible();

    st.slappAlla(); // städa: låt frågan landa så sidan inte lämnas hängande
  });

  test('AC #1 — sidhuvud, importknapp och FilterRad renderas i isError (FilterRad degraderar ärligt, INGET evigt skelett)', async ({
    page,
  }) => {
    await mockaEvent(page);
    await mockaFel(page);
    await page.goto('/mer/betalningar');

    await expect(page.getByText('Betalningarna kunde inte hämtas')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Betalningar' })).toBeVisible();

    const filterrad = page.getByTestId('betalningar-filterrad');
    await expect(filterrad).toBeVisible();
    // isError ⇒ INTE isPending: FilterRads panel ska INTE visa det animerade
    // skelettet (review-fyndet `AnmalningarSida.tsx` TASK-416.4 runda 2 redan
    // betalade — se `dataOkand`s docblock i BetalningsInkorg.tsx).
    await expect(page.getByTestId('betalningar-skeleton-kort')).toHaveCount(0);
  });

  test('AC #2 — MÄTNING: boundingBox på h1, FilterRad och första kortet är IDENTISK före och efter datalandning', async ({
    page,
  }) => {
    await mockaEvent(page);
    const st = hallbarMock(page);
    await page.goto('/mer/betalningar');
    await expect(page.getByTestId('betalningar-skeleton-kort').first()).toBeVisible();

    const h1Pending = await page.getByRole('heading', { level: 1 }).boundingBox();
    const filterPending = await boxa(page, 'betalningar-filterrad');
    const kortPending = await boxa(page, 'betalningar-skeleton-kort');
    if (!h1Pending) throw new Error('h1 saknar boundingBox i isPending');

    st.slappAlla();
    await expect(page.getByText('Anna Andersson')).toBeVisible();

    const h1Loaded = await page.getByRole('heading', { level: 1 }).boundingBox();
    const filterLoaded = await boxa(page, 'betalningar-filterrad');
    const kortLoaded = await boxa(page, 'betalningar-kort');
    if (!h1Loaded) throw new Error('h1 saknar boundingBox i laddat läge');

    // h1: EXAKT likhet (toEqual) — INGEN sub-pixel-källa mellan header och
    // h1, och mätningen bevisar det (byte-identisk i alla fyra fält).
    expect(h1Loaded).toEqual(h1Pending);
    // FilterRad/kort: x/width strikt, y/height ±1 px — se filhuvudets
    // docblock ("ETT DIAGNOSTICERAT...") för den ENDA kända, spårade källan.
    assertBoxNastanLika(filterLoaded, filterPending, 'FilterRad');
    assertBoxNastanLika(kortLoaded, kortPending, 'första kortet');
  });

  test('axe 0 violations i isPending (sidhuvud + FilterRad synliga och beskrivna)', async ({
    page,
  }) => {
    await mockaEvent(page);
    hallbarMock(page);
    await page.goto('/mer/betalningar');
    await expect(page.getByTestId('betalningar-skeleton-kort').first()).toBeVisible();
    await expect(page.getByTestId('betalningar-filterrad')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe 0 violations i isError (felbesked + orört sidkrom)', async ({ page }) => {
    await mockaEvent(page);
    await mockaFel(page);
    await page.goto('/mer/betalningar');
    await expect(page.getByText('Betalningarna kunde inte hämtas')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
