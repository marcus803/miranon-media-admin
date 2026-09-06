import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '../support/test-bas';

/**
 * [TASK-402.8 AC #1/#2/#3/#4] BEKRÄFTELSESTEGETS FORM FÖRE STÄMPELN — pillsen
 * borta ur korten, namnet klippt, och "Sätt alla belopp" under listan.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAMMA SKARV SOM `bekraftelsesteget.staging.test.ts`, AV SAMMA SKÄL
 * ═══════════════════════════════════════════════════════════════════════════
 * `VITE_FEATURE_BETALNINGAR` är explicit `'av'` för den delade
 * acceptance/visual-fixturvärlden, och routens `beforeLoad` redirectar då till
 * `/mer`. Staging bär `pa`, och `chromium-authenticated` kör med en verklig
 * inloggad session. Deterministiskt via `page.route`, ALDRIG `network.use()` —
 * ingen delad staging-data rörs. PRD `TASK-402` § Testbeslut punkt 2 pekar ut
 * skarven.
 *
 * BARA `hamta-oppna-betalningar` MOCKAS. Ingen av påståendena nedan
 * registrerar något; körningen, den fallerade raden och kvittokön prövas i
 * `bekraftelsesteget.staging.test.ts` och ska inte prövas två gånger.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SVITEN MÄTER
 * ═══════════════════════════════════════════════════════════════════════════
 *   A. PILLSEN ÄR BORTA (AC #1). Två av raderna bär exakt de tillstånd
 *      `RadMarken` renderade på — en passerad `deadlineSlutbetalning`
 *      (`forfallen`) och `anmalanStatus: 'Obekräftad'` — och kortens
 *      TILLGÄNGLIGA NAMN prövas exakt, inte bara som frånvaro av en text.
 *      Den andra halvan av AC #1 (inkorgens pills oförändrade) bärs av
 *      diffen: `BetalningsInkorg.tsx` är inte rörd av skivan.
 *   B. NAMNET KLIPPS (AC #2), mätt på BÅDA bredderna: `scrollWidth >
 *      clientWidth` på namn-noden, kortets höjd identisk med ett kort med
 *      kort namn, `title` med hela namnet, och ingen horisontell rullning på
 *      sidan.
 *   C. SÄTT ALLA BELOPP (AC #3), i båda riktningarna och med kanterna:
 *      raden utan avgifts-kandidat töms INTE, hand-högen står still,
 *      avstämningen och summaraden räknar om.
 *   D. TANGENTBORD, BESKED OCH AXE (AC #4).
 *
 * MEDVETET UTANFÖR: att appens förslag är rätt PER RAD — det är
 * `forslagsbelopp`, prövat i `tests/api/bekraftelsesteg-harledningar.test.ts`.
 * Här prövas bara att förslaget står KVAR tills en knapp trycks.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';

/** Desktop 1440 och iPad 820 — kortets AC #2 namnger båda. */
const DESKTOP = { width: 1440, height: 900 };
const IPAD = { width: 820, height: 1180 };

/**
 * SEXTIO TECKEN, räknade av testet självt (`toHaveLength(60)` nedan) och inte
 * av den som skrev raden. Ett svenskt dubbelnamn med bindestreck, alltså den
 * form som faktiskt dyker upp i basen — inte en teckensträng.
 */
const LANGT_NAMN = 'Anne-Charlotte Vikström-Lindqvist Bergström-Söderlund Hallin';

type Rad = {
  id: string;
  namn: string;
  summaInbetalt: number;
  gallandePris: number | null;
  /**
   * `null` = eventet har ingen anmälningsavgift alls. MÄTT UNDER BYGGET, och
   * värt raden: med `gallandePris: null` men `anmalningsavgift: 1000` ger
   * `harledBeloppsknappar` ÄNDÅ en avgifts-knapp (`avgiftKvar` är 1 000 och
   * `kvar` är null, så villkoret `avgiftKvar === kvar` aldrig slår). Raden var
   * alltså inte kandidatlös utan hade en kandidat — och hamnade i listan i
   * stället för i "Behöver din hand". Båda fälten måste vara `null`.
   */
  anmalningsavgift?: number | null;
  deadlineSlutbetalning?: string;
  anmalanStatus?: string;
};

/**
 * FYRA RADER, EN PER KANT I REGELN.
 *
 *   A — inget betalat ⇒ båda kandidaterna finns (avgift 1 000, allt 2 500).
 *       Bär dessutom en PASSERAD deadline: raden var `forfallen`.
 *   B — avgiften redan betald ⇒ INGEN avgifts-kandidat, bara `allt` (1 500).
 *       Bär `Obekräftad`: raden var `obekraftad`.
 *   C — som A, men med ett sextiotecken långt namn.
 *   D — priset saknas i basen ⇒ INGEN kandidat alls, tomt belopp, och därmed
 *       hemma i "Behöver din hand".
 */
const RADER: Rad[] = [
  {
    id: 'rec-402-8-a',
    namn: 'Anna Avgift',
    summaInbetalt: 0,
    gallandePris: 2500,
    deadlineSlutbetalning: '2020-01-01',
  },
  {
    id: 'rec-402-8-b',
    namn: 'Bo Restbelopp',
    summaInbetalt: 1000,
    gallandePris: 2500,
    anmalanStatus: 'Obekräftad',
  },
  { id: 'rec-402-8-c', namn: LANGT_NAMN, summaInbetalt: 0, gallandePris: 2500 },
  {
    id: 'rec-402-8-d',
    namn: 'David Utan Pris',
    summaInbetalt: 0,
    gallandePris: null,
    anmalningsavgift: null,
  },
];

const IDS = RADER.map((r) => r.id).join(',');
const STEG_URL = `/mer/betalningar/registrera?ids=${IDS}`;

function oppenBetalning(rad: Rad): Record<string, unknown> {
  return {
    anmalanRecordId: rad.id,
    personNamn: rad.namn,
    personEpost: null,
    personTelefon: null,
    eventId: 'rec-402-8-event',
    eventNamn: 'Formkursen',
    eventStartdatum: '2099-06-01',
    eventTyp: 'Kurs',
    anmalanStatus: rad.anmalanStatus ?? 'Bekräftad (mail skickat)',
    saknas: rad.gallandePris === null ? null : rad.gallandePris - rad.summaInbetalt,
    gallandePris: rad.gallandePris,
    anmalningsavgift: rad.anmalningsavgift === undefined ? 1000 : rad.anmalningsavgift,
    summaInbetalt: rad.summaInbetalt,
    summaInbetaltSpegel: rad.summaInbetalt,
    spegelIFas: true,
    deadlineSlutbetalning: rad.deadlineSlutbetalning ?? null,
    kvittonAttSkicka: 0,
  };
}

async function mocka(page: Page): Promise<void> {
  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: RADER.map(oppenBetalning), forfallna: 1 }),
    });
  });
}

async function oppna(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await mocka(page);
  await page.goto(STEG_URL);
  const steget = page.getByTestId('bekraftelsesteget');
  // ANKARET: alla fyra raderna har landat och modellen är byggd. Utan det kan
  // en mätning läsa en halvrenderad sida.
  await expect(steget.getByText('4 av 4 inbetalningar markerade')).toBeVisible({
    timeout: 15_000,
  });
  return steget;
}

/**
 * Beloppet på ett hopfällt kort, som RENT TAL.
 *
 * `visaKronor` går via `toLocaleString('sv-SE')`, som grupperar med
 * NO-BREAK SPACE (U+00A0). En jämförelse mot literalen "2 500 kr" med vanligt
 * mellanslag hade fallit av en osynlig anledning — därför normaliseras all
 * whitespace bort och siffrorna läses för sig.
 */
async function beloppFor(steget: ReturnType<Page['getByTestId']>, namn: string): Promise<string> {
  const text =
    (await steget.getByRole('button', { name: `Ändra belopp för ${namn}` }).textContent()) ?? '';
  return text.replace(/\s/gu, '');
}

const AVGIFTSKNAPP = 'Sätt alla belopp till anmälningsavgiften';
const ALLTKNAPP = 'Sätt alla belopp till hela beloppet';

test.describe('TASK-402.8 — pillsen bort och namnet klippt (AC #1, AC #2)', () => {
  test('kortens tillgängliga namn bär varken Förfallen eller Obekräftad', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    // EXAKTA namn, inte "innehåller inte". Före skivan lydde de
    // "Anna Avgift Förfallen Markerad" respektive
    // "Bo Restbelopp Obekräftad Markerad" — samma form som
    // promoverings-grindens FÖRE-referenser fortfarande visar för
    // "Cecilia Malm Förfallen Markerad".
    await expect(
      steget.getByRole('checkbox', { name: 'Anna Avgift Markerad', exact: true }),
    ).toBeVisible();
    await expect(
      steget.getByRole('checkbox', { name: 'Bo Restbelopp Markerad', exact: true }),
    ).toBeVisible();
    // Och ingenstans i steget, i någon hög.
    await expect(steget.getByText('Förfallen')).toHaveCount(0);
    await expect(steget.getByText('Obekräftad')).toHaveCount(0);
  });

  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['ipad', IPAD],
  ] as const) {
    test(`${namn} — ett 60-teckens namn klipps utan att kortet ändras`, async ({ page }) => {
      expect(LANGT_NAMN).toHaveLength(60);
      const steget = await oppna(page, viewport);

      const langaNamnet = steget.getByTitle(LANGT_NAMN);
      await expect(langaNamnet).toBeVisible();
      // TITELN BÄR HELA NAMNET — och texten i DOM:en gör det också, så
      // skärmläsaren läser det oavkortat. Klippet är rent visuellt.
      await expect(langaNamnet).toHaveText(LANGT_NAMN);

      const klippt = await langaNamnet.evaluate(
        (el) => el.scrollWidth > el.clientWidth && el.getClientRects().length === 1,
      );
      expect(klippt).toBe(true);

      // KORTETS HÖJD: identisk med ett kort vars namn får plats.
      //
      // `hasText` OCH INTE `has: steget.getByTitle(...)`: ett `has`-filter
      // matchar den inre lokatorn med LISTITEM som rot, inte med `steget` —
      // en lokator rotad i `steget` matchar därför aldrig (mätt: locator
      // timeout, inte ett falskt utfall).
      const langtKort = steget.getByRole('listitem').filter({ hasText: LANGT_NAMN });
      const kortKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });
      const hogLangt = (await langtKort.boundingBox())?.height ?? 0;
      const hogKort = (await kortKort.boundingBox())?.height ?? 0;
      expect(hogLangt).toBeGreaterThan(0);
      expect(hogLangt).toBe(hogKort);

      // Och sidan rullar inte i sidled av namnet.
      const overflod = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflod).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('TASK-402.8 — Sätt alla belopp (AC #3, AC #4)', () => {
  test('knapparna står UNDER listan och OVANFÖR avstämningen', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    const listan = steget.getByRole('region', { name: 'Markerade inbetalningar' });
    const etiketten = steget.getByText('Sätt alla belopp:');
    const avstamningen = steget.locator('dl');

    const listBox = await listan.boundingBox();
    const etikettBox = await etiketten.boundingBox();
    const dlBox = await avstamningen.boundingBox();
    expect(listBox).not.toBeNull();
    expect(etikettBox).not.toBeNull();
    expect(dlBox).not.toBeNull();
    if (!listBox || !etikettBox || !dlBox) return;

    // Marcus 2026-09-06: "jag vill ha dem under listan, inte över."
    expect(etikettBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height);
    expect(etikettBox.y).toBeLessThan(dlBox.y);
  });

  test('appens förslag står kvar tills en knapp trycks', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    // Förvalen: avgiften för den som inte betalat något, resten för den som
    // betalat avgiften. Ingen knapp har tryckts.
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('1000kr');

    await expect(steget.getByText('3 inbetalningar', { exact: true })).toBeVisible();
    await expect(steget.getByRole('button', { name: AVGIFTSKNAPP })).toBeEnabled();
    await expect(steget.getByRole('button', { name: ALLTKNAPP })).toBeEnabled();
  });

  test('Hela beloppet och Anmälningsavgift sätter radens EGEN kandidat, och kanterna står still', async ({
    page,
  }) => {
    const steget = await oppna(page, DESKTOP);

    // ── "Hela beloppet" ────────────────────────────────────────────────────
    await steget.getByRole('button', { name: ALLTKNAPP }).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('2500kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('2500kr');
    // Bos hela rest ÄR 1 500 — samma tal som förut, ur hans EGEN kandidat.
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    // Summaraden räknar om: 2 500 + 1 500 + 2 500.
    await expect(steget.getByText(/6\s500 kr/)).toBeVisible();

    // ── "Anmälningsavgift" ─────────────────────────────────────────────────
    await steget.getByRole('button', { name: AVGIFTSKNAPP }).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('1000kr');
    // KANTEN SOM AC #3 NAMNGER: Bo har redan betalat avgiften, alltså ingen
    // avgifts-kandidat. Hans belopp står KVAR på 1 500 — det töms inte, och
    // raden flyttas inte till "Behöver din hand".
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    await expect(steget.getByText(/3\s500 kr/)).toBeVisible();

    // ── HAND-HÖGEN STÅR STILL genom båda trycken ───────────────────────────
    // David saknar pris i basen och har därför ingen kandidat alls. Hade
    // något av trycken gett honom ett belopp vore han REGISTRERBAR, och då
    // hade summaraden sagt "4 inbetalningar" och högen försvunnit.
    await expect(steget.getByRole('heading', { name: 'Behöver din hand 1' })).toBeVisible();
    await expect(steget.getByText('3 inbetalningar', { exact: true })).toBeVisible();
    await expect(
      steget.getByText('1 rad saknar belopp och registreras inte förrän du fyllt i det.'),
    ).toBeVisible();
  });

  test('per-rad-redigering fungerar efter ett tryck, och ett nytt tryck skriver över den', async ({
    page,
  }) => {
    const steget = await oppna(page, DESKTOP);
    await steget.getByRole('button', { name: ALLTKNAPP }).click();

    // Öppna Annas kort, skriv ett eget belopp, tryck Klar.
    //
    // SCOPAT TILL HENNES KORT: David ligger i "Behöver din hand" med sitt
    // formulär öppet från början, så både "Belopp i kronor" och "Klar" finns
    // i TVÅ exemplar på sidan. Ett `.first()` hade råkat vara rätt här (DOM-
    // ordningen sätter listan före hand-högen) och fel så fort ordningen
    // ändras.
    const annasKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });
    await annasKort.getByRole('button', { name: 'Ändra belopp för Anna Avgift' }).click();
    const beloppfalt = annasKort.getByLabel('Belopp i kronor');
    await beloppfalt.fill('750');
    await beloppfalt.blur();
    await annasKort.getByRole('button', { name: 'Klar' }).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('750kr');

    // Ett nytt tryck skriver över hennes handskrivna belopp — knappen är
    // "sätt alla", inte "sätt de orörda".
    await steget.getByRole('button', { name: AVGIFTSKNAPP }).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
  });

  test('knapparna nås med tangentbord, trycket annonseras, och axe är rent', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    const utgangslaget = await new AxeBuilder({ page }).include('main').analyze();
    expect(utgangslaget.violations).toEqual([]);

    // TANGENTBORD: fokus på knappen, Enter, och effekten mäts.
    const avgiftsknappen = steget.getByRole('button', { name: AVGIFTSKNAPP });
    await avgiftsknappen.focus();
    await expect(avgiftsknappen).toBeFocused();
    await page.keyboard.press('Enter');

    // BESKEDET: två rader har en avgifts-kandidat (Anna och det långa namnet),
    // Bo har ingen och David inget pris.
    await expect(steget.getByText('2 belopp satta till anmälningsavgiften.')).toBeAttached();

    await steget.getByRole('button', { name: ALLTKNAPP }).click();
    await expect(steget.getByText('3 belopp satta till hela beloppet.')).toBeAttached();

    const efterTryck = await new AxeBuilder({ page }).include('main').analyze();
    expect(efterTryck.violations).toEqual([]);
  });
});
