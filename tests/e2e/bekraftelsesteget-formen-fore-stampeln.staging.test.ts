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
 *   E. KAPSELNS FORM STÅR STILL (varv 5–6): de tre segmenten är exakt
 *      likbreda, och deras `x/y/width/height` är oförändrade genom alla tre
 *      valen — på båda bredderna.
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

/**
 * [VARV 4] PILLERNA, INTE KNAPPARNA.
 *
 * `ToggleButtonGroup` ger `role="radiogroup"` + `role="radio"` med
 * `aria-checked` (primitivens docblock). Det tillgängliga namnet bor därför på
 * GRUPPEN, och varje pill bär bara sin egen etikett — de långa
 * `aria-label`-namnen från varv 1 är borta.
 */
const FORSLAGSPILL = 'Förslag';
/**
 * Växlar ett korts bock med TANGENTBORD, inte med ett klick.
 *
 * MÄTT UNDER VARV 5: `getByRole('checkbox').click()` faller med *"<span …>AA</span>
 * intercepts pointer events"*. React Arias `Checkbox` renderar en visuellt dold
 * `<input>` inuti en `<label>`, och labelns innehåll (avataren, namnet) ligger
 * över inputens träffyta. Fokus + mellanslag går rakt på kontrollen och är
 * dessutom den väg en tangentbordsanvändare faktiskt tar.
 */
async function vaxlaBock(page: Page, kort: ReturnType<Page['getByTestId']>) {
  const kryss = kort.getByRole('checkbox');
  await kryss.focus();
  await page.keyboard.press(' ');
  return kryss;
}

const AVGIFTSPILL = 'Anmälningsavgift';
const ALLTPILL = 'Hela beloppet';
const KAPSEL = 'Belopp för markerade rader';

function pill(steget: ReturnType<Page['getByTestId']>, namn: string) {
  return steget.getByRole('radio', { name: namn });
}

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
  /**
   * [VARV 2] BLOCKETS PLATS, LUFT OCH BREDD — MÄTT, INTE ÖGONMÄTT.
   *
   * Marcus på granskningsservern 2026-09-06: *"Jag tror 'sätt alla belopp'
   * måste få ett eget block/ruta och passa snyggare in i sidans design. Det
   * ser inte snyggt ut nu."* Varv 1 lade en naken rad mellan sista
   * gruppkortet och avstämningen. Kraven på blocket är geometriska, alltså
   * mätbara — och det som är mätbart ska mätas, annars är "passar in i
   * sidans design" ett omdöme som ingen kan pröva igen.
   */
  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['ipad', IPAD],
  ] as const) {
    test(`${namn} — blocket ligger under listan, kant i kant med grupperna, med 16/24 px luft`, async ({
      page,
    }) => {
      const steget = await oppna(page, viewport);

      const listan = steget.getByRole('region', { name: 'Markerade inbetalningar' });
      const forstaGruppen = steget.getByRole('list').first();
      const block = steget.getByTestId('satt-alla-block');
      const avstamningen = steget.locator('dl');

      const listBox = await listan.boundingBox();
      const gruppBox = await forstaGruppen.boundingBox();
      const blockBox = await block.boundingBox();
      const dlBox = await avstamningen.boundingBox();
      expect(listBox).not.toBeNull();
      expect(gruppBox).not.toBeNull();
      expect(blockBox).not.toBeNull();
      expect(dlBox).not.toBeNull();
      if (!listBox || !gruppBox || !blockBox || !dlBox) return;

      // PLATSEN (varv 1): under listan, ovanför avstämningen.
      expect(blockBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height);
      expect(blockBox.y).toBeLessThan(dlBox.y);

      // KANT I KANT MED GRUPPERNA. Gruppernas `<ul>` bär `-mx-4` mot
      // listsektionens `px-4` och ligger därför i kolumnens ytterkant;
      // blocket ligger i en behållare utan horisontell padding och ska hamna
      // på exakt samma x och samma bredd.
      expect(Math.round(blockBox.x)).toBe(Math.round(gruppBox.x));
      expect(Math.round(blockBox.width)).toBe(Math.round(gruppBox.width));

      /* LUFTEN, MÄTT MOT DET SOM FAKTISKT LIGGER OVANFÖR.
         16 px ovanför = gruppernas inbördes rytm (listsektionens `gap-4`).
         24 px under = rot-sektionens `gap-6`, alltså avståndet mellan sidans
         toppnivå-avdelningar. VARV 3, Marcus: *"Skapa påtagligt mer luft
         mellan sätt alla belopp-rutan och summeringsraderna nedanför."*
         Varv 2:s 12 px var avstämningens interna rytm och band blocket till
         summeringen; 24 px säger i stället att de är två skilda saker.

         FÖREGÅENDE ELEMENT LÄSES UR DOM:EN, INTE ANTAS VARA LISTAN. Första
         versionen mätte mot listsektionen och fick 497 px — i DENNA fixtur
         ligger "Behöver din hand" emellan (David saknar pris och därmed
         kandidat). Talet 16 gäller avståndet till det som står närmast
         ovanför, vilket är hela poängen med rytmen; vilken sektion det är
         beror på datat. */
      const luft = await block.evaluate((el) => {
        const behallare = el.parentElement;
        const foregaende = behallare?.previousElementSibling;
        const dl = behallare?.querySelector('dl');
        if (!behallare || !foregaende || !dl) return null;
        const mitt = el.getBoundingClientRect();
        return {
          over: Math.round(mitt.top - foregaende.getBoundingClientRect().bottom),
          under: Math.round(dl.getBoundingClientRect().top - mitt.bottom),
        };
      });
      expect(luft).toEqual({ over: 16, under: 24 });

      // Ingen horisontell rullning av blocket, särskilt inte vid 820.
      const overflod = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflod).toBeLessThanOrEqual(0);
    });
  }

  test('blocket bär rubrik och hjälptext, och hjälptexten säger vad knapparna INTE rör', async ({
    page,
  }) => {
    const steget = await oppna(page, DESKTOP);
    const block = steget.getByTestId('satt-alla-block');

    await expect(block.getByText('Sätt alla belopp', { exact: true })).toBeVisible();
    await expect(
      block.getByText(
        'Skriver över föreslaget belopp på alla markerade rader. Rader som behöver din hand rörs inte.',
      ),
    ).toBeVisible();
    // Alla tre segmenten bor i blocket, ingen annanstans på sidan.
    await expect(pill(steget, AVGIFTSPILL)).toHaveCount(1);
    await expect(block.getByRole('radio', { name: FORSLAGSPILL })).toHaveCount(1);
    await expect(block.getByRole('radio', { name: ALLTPILL })).toHaveCount(1);
    // [VARV 5] Ångra-knappen är RIVEN — att välja Förslag är återställningen.
    await expect(steget.getByRole('button', { name: 'Återställ förslagen' })).toHaveCount(0);
  });

  test('appens förslag står kvar tills en knapp trycks', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    // Förvalen: avgiften för den som inte betalat något, resten för den som
    // betalat avgiften. Ingen knapp har tryckts.
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('1000kr');

    await expect(steget.getByText('3 inbetalningar', { exact: true })).toBeVisible();
    await expect(pill(steget, AVGIFTSPILL)).toBeEnabled();
    await expect(pill(steget, ALLTPILL)).toBeEnabled();
  });

  test('Hela beloppet och Anmälningsavgift sätter radens EGEN kandidat, och kanterna står still', async ({
    page,
  }) => {
    const steget = await oppna(page, DESKTOP);

    // ── "Hela beloppet" ────────────────────────────────────────────────────
    await pill(steget, ALLTPILL).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('2500kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('2500kr');
    // Bos hela rest ÄR 1 500 — samma tal som förut, ur hans EGEN kandidat.
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    // Summaraden räknar om: 2 500 + 1 500 + 2 500.
    await expect(steget.getByText(/6\s500 kr/)).toBeVisible();

    // ── "Anmälningsavgift" ─────────────────────────────────────────────────
    await pill(steget, AVGIFTSPILL).click();
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
    await pill(steget, ALLTPILL).click();

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
    await pill(steget, AVGIFTSPILL).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
  });

  /**
   * [VARV 5] FÖRSLAG ÄR ETT LÄGE, INTE FRÅNVARON AV ETT VAL.
   *
   * Marcus: *"Togglen behöver ju sitta i något. När ingen knapp är vald så ser
   * ju knapparna inte ut som knappar utan bara en textsträng på grå
   * bakgrund."* Svaret blev ett tredje läge i stället för en ram: `Förslag`
   * lyser från start, och att välja det ÄR återställningen. Varv 3:s separata
   * ångra-knapp är därmed riven.
   */
  test('Förslag lyser från start och är vägen tillbaka', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    await expect(pill(steget, FORSLAGSPILL)).toBeChecked();
    await expect(pill(steget, AVGIFTSPILL)).not.toBeChecked();
    await expect(pill(steget, ALLTPILL)).not.toBeChecked();

    await pill(steget, ALLTPILL).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('2500kr');
    await expect(pill(steget, FORSLAGSPILL)).not.toBeChecked();

    // TILLBAKA: Förslag återställer varje markerad rad till appens förval.
    await pill(steget, FORSLAGSPILL).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    expect(await beloppFor(steget, LANGT_NAMN)).toBe('1000kr');
    expect(await beloppFor(steget, 'Bo Restbelopp')).toBe('1500kr');
    await expect(pill(steget, FORSLAGSPILL)).toBeChecked();
    await expect(steget.getByText('2 belopp satta till förslaget.')).toBeAttached();

    // HAND-HÖGEN STÅR STILL genom hela varvet.
    await expect(steget.getByRole('heading', { name: 'Behöver din hand 1' })).toBeVisible();
    await expect(steget.getByText('3 inbetalningar', { exact: true })).toBeVisible();
  });

  test('ett läge som inte flyttar något säger det rakt ut', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);
    // Varje rad bär redan sitt förslag i utgångsläget.
    await pill(steget, AVGIFTSPILL).click();
    await pill(steget, FORSLAGSPILL).click();
    await expect(steget.getByText('Alla belopp stod redan på förslaget.')).toBeAttached();
  });

  /**
   * [VARV 5] LÄGET ÄR EN LEVANDE REGEL, inte en engångshandling: en rad som
   * markeras EFTERÅT ska komma in med lägets belopp. Undantaget är raden Lotta
   * skrivit beloppet på för hand.
   */
  test('en rad som markeras efteråt följer det aktiva läget', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);
    const annasKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });

    const annasKryss = await vaxlaBock(page, annasKort);
    await expect(annasKryss).not.toBeChecked();

    await pill(steget, ALLTPILL).click();
    // Hon var avmarkerad när läget sattes och rördes därför inte.
    await vaxlaBock(page, annasKort);
    await expect(annasKryss).toBeChecked();
    // NU följer hon regeln: hela beloppet, inte sitt förslag.
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('2500kr');
  });

  /**
   * TILLGÄNGLIGHETSGOLV, inte form: en markering under ett överskrivande läge
   * ÄNDRAR radens belopp, och den ändringen ska höras. Den seende ser talet
   * byta i kortet och i avstämningen; utan beskedet hör en skärmläsare bara
   * "markerad" och beloppet flyttar sig tyst.
   *
   * BÅDA HALVORNA PRÖVAS. Beskedet ska komma när talet FAKTISKT byter, och
   * INTE när det står stilla — `beloppForNyMarkerad` returnerar radens
   * kandidat även när den redan är radens belopp, så utan skillnadsvillkoret
   * hade varje bock under ett läge annonserat en ändring som inte skedde.
   */
  const MARKERINGSBESKED = /markerad, beloppet satt till/;

  test('en markering under Hela beloppet annonseras, och en som inte flyttar talet gör det inte', async ({
    page,
  }) => {
    const steget = await oppna(page, DESKTOP);
    const annasKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });
    const region = steget.getByTestId('satt-alla-block').getByRole('status');

    // ── TALET BYTER: 1 000 (hennes förslag) → 2 500 (hela beloppet) ────────
    const annasKryss = await vaxlaBock(page, annasKort);
    await expect(annasKryss).not.toBeChecked();
    await pill(steget, ALLTPILL).click();
    await vaxlaBock(page, annasKort);
    await expect(annasKryss).toBeChecked();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('2500kr');
    // NBSP i tusentalsavgränsaren (`toLocaleString('sv-SE')`) — `\s` matchar
    // både den och ett vanligt mellanslag, av samma skäl som `beloppFor`
    // normaliserar bort all whitespace.
    await expect(
      region.filter({
        hasText: /Anna Avgift markerad, beloppet satt till 2\s500 kr enligt Hela beloppet\./,
      }),
    ).toBeAttached();

    // ── TALET STÅR STILL: hennes förslag ÄR avgiften, alltså inget besked ──
    await pill(steget, AVGIFTSPILL).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    await vaxlaBock(page, annasKort);
    await vaxlaBock(page, annasKort);
    await expect(annasKryss).toBeChecked();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('1000kr');
    /* Regionen bär fortfarande LÄGESBYTETS besked, aldrig ett markerings-
       besked om en ändring som inte skedde. Talet är två: Anna står på 2 500
       efter första halvan och det långa namnet likaså, så avgifts-trycket
       flyttar båda tillbaka till 1 000. (Mätt — den första versionen av raden
       gissade "Alla belopp stod redan på …", vilket hade varit sant om
       halvorna körts var för sig.) */
    await expect(region).toHaveText('2 belopp satta till anmälningsavgiften.');
    await expect(region.filter({ hasText: MARKERINGSBESKED })).toHaveCount(0);
  });

  test('en handredigerad rad behåller sin siffra när den markeras om', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);
    const annasKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });

    await annasKort.getByRole('button', { name: 'Ändra belopp för Anna Avgift' }).click();
    const beloppfalt = annasKort.getByLabel('Belopp i kronor');
    await beloppfalt.fill('750');
    await beloppfalt.blur();
    await annasKort.getByRole('button', { name: 'Klar' }).click();
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('750kr');

    await vaxlaBock(page, annasKort);
    await pill(steget, ALLTPILL).click();
    await vaxlaBock(page, annasKort);
    // Utan `handredigerad` hade bock-klicket tyst kastat bort hennes siffra.
    expect(await beloppFor(steget, 'Anna Avgift')).toBe('750kr');
  });

  /**
   * [VARV 4, uppdaterat i varv 5] KAPSELNS TILLSTÅND — Marcus: *"när man
   * trycker på 'Anmälningsavgift' eller 'Hela beloppet' behöver vi inte visa
   * att knappen är aktiv?"*
   *
   * Mätt på `aria-checked`, alltså på det skärmläsaren hör och inte på en
   * klass. Med tre lägen finns inget tomt tillstånd kvar: exakt ett segment är
   * alltid valt.
   */
  test('exakt ETT läge är valt hela tiden, och ett omtryck släcker det inte', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);
    const gruppen = steget.getByRole('radiogroup', { name: KAPSEL });
    await expect(gruppen).toBeVisible();
    await expect(gruppen.getByRole('radio')).toHaveCount(3);

    const valda = async () => {
      const alla = [FORSLAGSPILL, AVGIFTSPILL, ALLTPILL];
      const lista: string[] = [];
      for (const namn of alla) {
        if (await pill(steget, namn).isChecked()) lista.push(namn);
      }
      return lista;
    };

    expect(await valda()).toEqual([FORSLAGSPILL]);
    await pill(steget, ALLTPILL).click();
    expect(await valda()).toEqual([ALLTPILL]);
    // ETT ANDRA TRYCK PÅ SAMMA SEGMENT SLÄCKER INTE (disallowEmptySelection).
    await pill(steget, ALLTPILL).click();
    expect(await valda()).toEqual([ALLTPILL]);
    await pill(steget, AVGIFTSPILL).click();
    expect(await valda()).toEqual([AVGIFTSPILL]);
  });

  test('en handredigering släcker INTE läget — den är Lottas undantag', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);
    await pill(steget, ALLTPILL).click();
    await expect(pill(steget, ALLTPILL)).toBeChecked();

    const annasKort = steget.getByRole('listitem').filter({ hasText: 'Anna Avgift' });
    await annasKort.getByRole('button', { name: 'Ändra belopp för Anna Avgift' }).click();
    const beloppfalt = annasKort.getByLabel('Belopp i kronor');
    await beloppfalt.fill('750');
    await beloppfalt.blur();
    await annasKort.getByRole('button', { name: 'Klar' }).click();

    expect(await beloppFor(steget, 'Anna Avgift')).toBe('750kr');
    // VARV 5 VÄNDE VARV 4:s regel: läget beskriver vad kapseln senast gjorde
    // och vad nya markeringar får — inte att varje rad följer det just nu.
    await expect(pill(steget, ALLTPILL)).toBeChecked();
  });

  /**
   * [VARV 6] SEGMENTEN RÖR SIG INTE NÄR VALET FLYTTAR — Marcus: *"när man
   * klickar runt på knapparna så ser de ut att röra sig, eller det gör dem,
   * inte okej."*
   *
   * DE GJORDE DET, OCH ORSAKEN VAR MÄTBAR: varv 5 gav det valda segmentet
   * `font-semibold`, alltså bredare text, och kolumnbredden i
   * `auto-cols-fr` + `w-fit` sätts av det bredaste segmentets max-content —
   * så hela radens mått följde med valet. Regeln som ersatte den är att valet
   * ENDAST får ändra färg: samma `font-medium`, samma `border`-BREDD (bara
   * `border-color` byter), samma padding, och den dubblerade kanten som en
   * INSET `box-shadow` — den ritas innanför kanten och ingår inte i
   * boxmodellen, till skillnad från `border-2`.
   *
   * VARFÖR ALLA FYRA TALEN OCH INTE BARA BREDDEN: en `border-2` hade vuxit
   * boxen i alla riktningar, och en padding-ändring hade flyttat GRANNARNAS
   * x utan att röra det valda segmentets egen bredd. Testet ovan
   * ("exakt lika breda") mäter formen i ETT läge; detta mäter att formen
   * överlever bytet mellan lägena, vilket är en annan sak.
   */
  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['ipad', IPAD],
  ] as const) {
    test(`${namn} — segmentens kanter står exakt still genom alla tre valen`, async ({ page }) => {
      const steget = await oppna(page, viewport);
      const etiketter = [FORSLAGSPILL, AVGIFTSPILL, ALLTPILL] as const;

      /**
       * MÄTS ALLTID FRÅN SAMMA RULLNINGSLÄGE. `boundingBox` är
       * VIEWPORT-relativ, och Playwrights klick rullar elementet in i bild
       * först — utan nollställningen hade ett `y` som bara flyttat sig med
       * SIDAN lästs som att segmentet rörde sig. Talen rundas till två
       * decimaler: subpixel-brus i rullningens återställning är inte en
       * layoutförändring, och 0,01 px är långt under vad Marcus öga fällde.
       */
      const matAllaTre = async () => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => window.scrollY === 0);
        const rutor: string[] = [];
        for (const etikett of etiketter) {
          const box = await pill(steget, etikett).boundingBox();
          expect(box, `${etikett} saknar boundingBox`).not.toBeNull();
          const { x = 0, y = 0, width = 0, height = 0 } = box ?? {};
          rutor.push([x, y, width, height].map((tal) => Number(tal.toFixed(2))).join('/'));
        }
        return rutor;
      };

      const facit = await matAllaTre();
      // Rutorna är verkliga, inte tre nollor som råkar vara lika.
      for (const ruta of facit) expect(ruta).not.toBe('0/0/0/0');

      for (const etikett of etiketter) {
        await pill(steget, etikett).click();
        // Valet FLYTTADE sig — annars mäter loopen samma läge tre gånger och
        // beviset är värdelöst.
        await expect(pill(steget, etikett)).toBeChecked();
        expect(await matAllaTre(), `kanterna flyttade sig i läget ${etikett}`).toEqual(facit);
      }
    });
  }

  /**
   * [VARV 5] LIKBREDA SEGMENT — Marcus: *"anmälningsavgift och Hela beloppet
   * knapparna måste vara exakt lika breda, annars blir det ingen snygg
   * toggle."* Bredden sätts av det bredaste ordet, inte av panelen.
   */
  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['ipad', IPAD],
  ] as const) {
    test(`${namn} — alla tre segmenten är exakt lika breda`, async ({ page }) => {
      const steget = await oppna(page, viewport);
      const block = steget.getByTestId('satt-alla-block');
      const bredder: number[] = [];
      for (const etikett of [FORSLAGSPILL, AVGIFTSPILL, ALLTPILL]) {
        const box = await pill(steget, etikett).boundingBox();
        expect(box).not.toBeNull();
        bredder.push(Math.round(box?.width ?? 0));
      }
      expect(bredder[0]).toBeGreaterThan(0);
      expect(new Set(bredder).size).toBe(1);

      // …OCH KAPSELN SPRÄNGER INTE PANELEN: raden är fit-content, inte w-full.
      const blockBox = await block.boundingBox();
      const kapselBox = await steget.getByRole('radiogroup', { name: KAPSEL }).boundingBox();
      expect(blockBox).not.toBeNull();
      expect(kapselBox).not.toBeNull();
      if (!blockBox || !kapselBox) return;
      expect(kapselBox.width).toBeLessThan(blockBox.width);
    });
  }

  test('pillerna nås med tangentbord, trycket annonseras, och axe är rent', async ({ page }) => {
    const steget = await oppna(page, DESKTOP);

    const utgangslaget = await new AxeBuilder({ page }).include('main').analyze();
    expect(utgangslaget.violations).toEqual([]);

    // TANGENTBORD: fokus på knappen, Enter, och effekten mäts.
    const avgiftspillen = pill(steget, AVGIFTSPILL);
    await avgiftspillen.focus();
    await expect(avgiftspillen).toBeFocused();
    await page.keyboard.press('Enter');

    /* BESKEDET. I utgångsläget bär varje rad redan sitt FÖRSLAG, och förslaget
       ÄR avgiften för de två rader som har en — så ett avgifts-tryck flyttar
       ingenting och säger det rakt ut. */
    await expect(steget.getByText('Alla belopp stod redan på anmälningsavgiften.')).toBeAttached();

    // Härifrån flyttar sig två rader (Anna och det långa namnet); Bos hela
    // rest är redan 1 500 och David saknar pris.
    await pill(steget, ALLTPILL).click();
    await expect(steget.getByText('2 belopp satta till hela beloppet.')).toBeAttached();

    const efterTryck = await new AxeBuilder({ page }).include('main').analyze();
    expect(efterTryck.violations).toEqual([]);
  });
});
