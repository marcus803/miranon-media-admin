import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '../support/test-bas';

/**
 * [TASK-402.3 AC #2/#3/#4/#6/#7/#8/#11] BEKRÄFTELSESTEGETS BETEENDE mot de
 * skarpa vägarna — körningen, resultatet, den fallerade raden, omkörningen,
 * Ångra-dialogen och kvittokön.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAMMA SKARV SOM INKORGENS UTSKICKSFLÖDE, AV SAMMA SKÄL
 * ═══════════════════════════════════════════════════════════════════════════
 * `betalningar-inkorg-utskicksflode.staging.test.ts` § "VARFÖR STAGING-E2E OCH
 * INTE ACCEPTANCE-KLASSEN" bär hela resonemanget: `VITE_FEATURE_BETALNINGAR`
 * är explicit `'av'` för den delade acceptance/visual-fixturvärlden, och
 * routens `beforeLoad` redirectar då till `/mer`. Staging bär `pa`, och
 * `chromium-authenticated` kör med en verklig inloggad session.
 * Deterministiskt via `page.route`, ALDRIG `network.use()` — ingen delad
 * staging-data rörs.
 *
 * PRD `TASK-402` § Testbeslut punkt 2 pekar ut exakt denna skarv för steget.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SVITEN MÄTER, OCH VAD DEN INTE GÖR
 * ═══════════════════════════════════════════════════════════════════════════
 * MÄTS:
 *   A. SIDHÖJDEN ÄR KONSTANT från knapptryck till resultat (AC #2:s
 *      kärnpåstående) — `getBoundingClientRect().height` på `main`, läst i
 *      tre lägen: före trycket, mitt i körningen (första svaret hålls inne)
 *      och efter. Ögonblicksbilden är hela skälet till att den kan vara det:
 *      raderna lämnar inte listan förrän allt är klart.
 *   B. FÖRLOPPSKANALERNA (ADR-112): statusraden annonserar START och SLUT och
 *      aldrig varje rad; räkningen är `role="progressbar"` med
 *      `aria-valuenow`/`-valuemax`/`-valuetext` och annonseras INTE.
 *   C. EN FALLERAD RAD stoppar inte de övriga, står kvar markerad med serverns
 *      fel, och "Försök igen" skickar BARA den (räknat i mockens anrop).
 *   D. ÅNGRA raderar via `hantera-inbetalning` och tar raden tillbaka till
 *      listan.
 *   E. KVITTOKÖN: "Registrera och skicka" köar alla registrerade kvitton i ETT
 *      `koa-kvitton`-anrop.
 *   F. RADFORMULÄRET är det delade i Klar/Avbryt-läge, och Avbryt lämnar radens
 *      värden orörda.
 *   G. AXE utan fel i utgångsläget och i efterläget.
 *
 * MEDVETET UTANFÖR: en LIVE `köat → pågår → skickat`-övergång inom en
 * sidladdning. Samma strukturella skäl som inkorgens svit bokför —
 * `useJobbstatus` pollar aldrig, så utan en verklig databasändring finns ingen
 * andra fetch att skilja från den första.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';
const REGISTRERA_INBETALNING = '**/functions/v1/registrera-inbetalning';
const KOA_KVITTON = '**/functions/v1/koa-kvitton';
const HAMTA_JOBBSTATUS = '**/functions/v1/hamta-jobbstatus*';
const HANTERA_INBETALNING = '**/functions/v1/hantera-inbetalning';

const JOBB_ID = 'ba5eba11-0001-4001-8001-000000000001';

/** Tre rader räcker för varje påstående och gör talen läsbara för hand. */
const RADER = [
  { id: 'rec-402-3-a', namn: 'Alva Beteende', summaInbetalt: 1000 },
  { id: 'rec-402-3-b', namn: 'Bosse Beteende', summaInbetalt: 1000 },
  { id: 'rec-402-3-c', namn: 'Curt Beteende', summaInbetalt: 1000 },
] as const;

/** Raden mockens `registrera-inbetalning` avvisar FÖRSTA gången. */
const FEL_ID = RADER[1].id;
const FEL_TEXT = 'Beloppet nekades av bokföringen.';

const IDS = RADER.map((r) => r.id).join(',');
const STEG_URL = `/mer/betalningar/registrera?ids=${IDS}`;

type Json = Record<string, unknown>;

function oppenBetalning(rad: (typeof RADER)[number]): Json {
  return {
    anmalanRecordId: rad.id,
    personNamn: rad.namn,
    personEpost: null,
    personTelefon: null,
    eventId: 'rec-402-3-event',
    eventNamn: 'Beteendekursen',
    eventStartdatum: '2099-06-01',
    eventTyp: 'Kurs',
    anmalanStatus: 'Bekräftad (mail skickat)',
    saknas: 2500 - rad.summaInbetalt,
    gallandePris: 2500,
    anmalningsavgift: 1000,
    summaInbetalt: rad.summaInbetalt,
    summaInbetaltSpegel: rad.summaInbetalt,
    spegelIFas: true,
    deadlineSlutbetalning: null,
    kvittonAttSkicka: 0,
  };
}

function inbetalningsId(anmalanRecordId: string): string {
  const i = RADER.findIndex((r) => r.id === anmalanRecordId);
  return `ba5eba11-0002-4002-8002-00000000000${i + 1}`;
}

type Mockar = {
  /** Anmälnings-ID per `registrera-inbetalning`-anrop, i ordning. */
  registreringsAnrop: string[];
  /** Kroppen per `koa-kvitton`-anrop. */
  koAnrop: string[][];
  /** Kroppen per `hantera-inbetalning`-anrop. */
  hanteraAnrop: { atgard: string; inbetalningId: string }[];
  /** Släpper det inne­hållna första registrerings-svaret. */
  slappForstaSvaret: () => void;
};

/**
 * `hallForstaSvaret` fryser körningen vid k=0 så mellanläget kan MÄTAS i
 * stället för fångas i ett tidsfönster. Utan den svarar mocken direkt och
 * "sidhöjden under körningen" blir en race mot en körning som redan är klar.
 */
async function mocka(page: Page, hallForstaSvaret = false): Promise<Mockar> {
  const tillstand: Mockar = {
    registreringsAnrop: [],
    koAnrop: [],
    hanteraAnrop: [],
    slappForstaSvaret: () => {},
  };
  let felUtlost = false;
  let forsta = true;
  const grind = hallForstaSvaret
    ? new Promise<void>((klar) => {
        tillstand.slappForstaSvaret = klar;
      })
    : Promise.resolve();
  /** Raderna som fortfarande är öppna — Ångra lägger tillbaka en. */
  const oppna = new Map(RADER.map((r) => [r.id, oppenBetalning(r)]));

  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: [...oppna.values()], forfallna: 0 }),
    });
  });

  await page.route(REGISTRERA_INBETALNING, async (route: Route) => {
    const body = route.request().postDataJSON() as {
      anmalanRecordId: string;
      belopp: string;
      betalsatt: string;
      betalningsdatum?: string;
      notering?: string;
    };
    tillstand.registreringsAnrop.push(body.anmalanRecordId);
    if (forsta) {
      forsta = false;
      await grind;
    }
    if (body.anmalanRecordId === FEL_ID && !felUtlost) {
      felUtlost = true;
      // 4xx OCH INTE 5xx: `fetchWithRetry` retryar 5xx tre gånger, så ett
      // enda 500-svar hade läkts av retry-lagret och raden registrerats ändå
      // (mätt i promoverings-grindens första EFTER-körning).
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: FEL_TEXT }),
      });
      return;
    }
    const nu = new Date().toISOString();
    const belopp = Number(body.belopp.replace(/\s/g, '').replace(',', '.'));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        inbetalning: {
          id: inbetalningsId(body.anmalanRecordId),
          anmalanRecordId: body.anmalanRecordId,
          ogonblicksbildNamn: RADER.find((r) => r.id === body.anmalanRecordId)?.namn ?? '',
          ogonblicksbildEvent: 'Beteendekursen',
          ogonblicksbildEventdatum: '2099-06-01',
          belopp,
          betalsatt: body.betalsatt,
          betalningsdatum: body.betalningsdatum ?? nu.slice(0, 10),
          typ: 'inbetalning',
          status: 'aktiv',
          makuleradSkal: null,
          makuleradNar: null,
          bankreferens: null,
          kvittoId: null,
          notering: body.notering ?? null,
          skapadAv: 'staging-user@miranon.test',
          skapadNar: nu,
        },
        harledning: {
          summa: 2500,
          gallandePris: 2500,
          saknas: 0,
          avgiftKlar: true,
          alltKlart: true,
          arForelasning: false,
        },
        spegel: { skrivet: true, forsok: 1, skal: null },
      }),
    });
  });

  let jobbstatusSvar: Json = {
    jobb: null,
    rader: [],
    sammanfattning: { totalt: 0, skickade: 0, fel: 0, kvar: 0 },
  };

  await page.route(KOA_KVITTON, async (route: Route) => {
    const nu = new Date().toISOString();
    const body = route.request().postDataJSON() as { inbetalningIds: string[] };
    tillstand.koAnrop.push(body.inbetalningIds);
    jobbstatusSvar = {
      jobb: {
        id: JOBB_ID,
        jobbtyp: 'kvitto',
        status: 'avslutat',
        skapadAv: 'staging-user@miranon.test',
        skapadNar: nu,
        avslutadNar: nu,
      },
      rader: body.inbetalningIds.map((id, i) => ({
        id: `ba5eba11-0003-4003-8003-${String(i).padStart(12, '0')}`,
        jobbId: JOBB_ID,
        jobbtyp: 'kvitto',
        objektId: id,
        status: 'skickat',
        skal: null,
        forsok: 1,
        skapadNar: nu,
        paborjadNar: nu,
        avslutadNar: nu,
        uppdateradNar: nu,
        kvittonummer: `MM-2026-${2001 + i}`,
      })),
      sammanfattning: {
        totalt: body.inbetalningIds.length,
        skickade: body.inbetalningIds.length,
        fel: 0,
        kvar: 0,
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobbId: JOBB_ID,
        koade: body.inbetalningIds.length,
        hoppade: [],
        kickad: true,
      }),
    });
  });

  await page.route(HAMTA_JOBBSTATUS, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jobbstatusSvar),
    });
  });

  await page.route(HANTERA_INBETALNING, async (route: Route) => {
    const body = route.request().postDataJSON() as { atgard: string; inbetalningId: string };
    tillstand.hanteraAnrop.push(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        atgard: body.atgard,
        inbetalningId: body.inbetalningId,
        harledning: {
          summa: 1000,
          gallandePris: 2500,
          saknas: 1500,
          avgiftKlar: true,
          alltKlart: false,
          arForelasning: false,
        },
        spegel: { skrivet: true, forsok: 1, skal: null },
      }),
    });
  });

  return tillstand;
}

/** `VariantC`s rot. Se promoverings-grindens `steget()` för varför den bär
    `data-testid` och inte är ett `<form>`. */
function steget(page: Page) {
  return page.getByTestId('bekraftelsesteget');
}

async function oppna(page: Page, hallForstaSvaret = false) {
  // `no-preference` explicit: headless Chromium rapporterar annars
  // `reduce`, och husets `motion-safe:`-övergångar mäts då i fel läge.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const mockar = await mocka(page, hallForstaSvaret);
  await page.goto(STEG_URL);
  const form = steget(page);
  await expect(form.getByText('3 av 3 inbetalningar markerade')).toBeVisible({ timeout: 15_000 });
  return { form, mockar };
}

/** `main`s renderade höjd — måttet AC #2 kallar "sidhöjden". */
async function sidhojd(page: Page): Promise<number> {
  return page.locator('main').evaluate((el) => el.getBoundingClientRect().height);
}

test.describe('bekräftelsesteget — körningen (AC #2)', () => {
  test('sidhöjden är KONSTANT från knapptryck till resultat, och listan är upptagen', async ({
    page,
  }) => {
    const { form, mockar } = await oppna(page, true);

    const fore = await sidhojd(page);
    await form.getByRole('button', { name: 'Registrera 3 inbetalningar' }).click();

    // ── MITT I KÖRNINGEN (första svaret hålls inne) ──────────────────────
    const progress = form.getByRole('progressbar');
    await expect(progress).toHaveText('0 av 3 registrerade …');
    // ADR-112:s TVÅ kanaler: statusraden annonserar (polite), räkningen
    // frågas. `aria-valuetext` bär den läsbara formen.
    await expect(form.getByRole('status').first()).toHaveText('Registrerar 3 inbetalningar …');
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await expect(progress).toHaveAttribute('aria-valuemax', '3');
    await expect(progress).toHaveAttribute('aria-valuetext', '0 av 3 registrerade');
    // Listan står stilla, upptagen, och korten tar inga tryck.
    const listan = form.getByRole('region', { name: 'Markerade inbetalningar' });
    await expect(listan).toHaveAttribute('aria-busy', 'true');
    await expect(form.getByRole('checkbox', { name: /Alva Beteende/ })).toBeDisabled();
    // Summan räknas ur ögonblicksbilden — summaradens `dt` säger fortfarande
    // TRE, inte "2" eller "1", medan raderna avgörs en och en.
    // `exact: true` är nödvändigt: "3 inbetalningar" är en delsträng av både
    // statusraden och knappens laddtext.
    await expect(form.getByText('3 inbetalningar', { exact: true })).toBeVisible();

    const under = await sidhojd(page);
    expect(under).toBe(fore);

    // ── EFTER ────────────────────────────────────────────────────────────
    mockar.slappForstaSvaret();
    await expect(
      form.getByText('2 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible({ timeout: 20_000 });
    // Resultatet ritas EN gång: höjden får ändras HÄR, aldrig under körningen.
    expect(mockar.registreringsAnrop).toEqual([RADER[0].id, RADER[1].id, RADER[2].id]);
  });
});

test.describe('bekräftelsesteget — resultatet och omkörningen (AC #3/#6)', () => {
  test('fallerad rad står kvar med SERVERNS fel, och "Försök igen" kör bara den', async ({
    page,
  }) => {
    const { form, mockar } = await oppna(page);
    await form.getByRole('button', { name: 'Registrera 3 inbetalningar' }).click();
    await expect(
      form.getByText('2 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible({ timeout: 20_000 });

    // De två som gick ligger i blocket; den tredje står kvar i listan.
    const blocket = form.getByRole('region', { name: 'Registrerat nu' });
    await expect(blocket.getByText('Alva Beteende')).toBeVisible();
    await expect(blocket.getByText('Curt Beteende')).toBeVisible();
    await expect(blocket.getByText('Bosse Beteende')).toHaveCount(0);

    // Felet är SERVERNS text, inte en klientkonstruktion (se
    // `useBekraftelsesteg.ts` § FELTEXTEN ÄR SERVERNS).
    await expect(form.getByRole('alert')).toContainText(FEL_TEXT);
    // Raden står kvar MARKERAD, redo för omkörning.
    await expect(form.getByRole('checkbox', { name: /Bosse Beteende/ })).toBeChecked();

    // OMKÖRNINGEN: knappen har bytt ord, och kör BARA den fallerade raden.
    mockar.registreringsAnrop.length = 0;
    await form.getByRole('button', { name: 'Försök igen', exact: true }).click();
    await expect(form.getByText('Alla inbetalningar registrerade')).toBeVisible({
      timeout: 20_000,
    });
    expect(mockar.registreringsAnrop).toEqual([FEL_ID]);
  });
});

test.describe('bekräftelsesteget — Ångra (AC #4)', () => {
  test('dialogen raderar via hantera-inbetalning och tar raden tillbaka till listan', async ({
    page,
  }) => {
    const { form, mockar } = await oppna(page);
    await form.getByRole('button', { name: 'Registrera 3 inbetalningar' }).click();
    await expect(
      form.getByText('2 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible({ timeout: 20_000 });

    await form.getByRole('button', { name: 'Ångra registreringen för Alva Beteende' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Ångra registreringen?' })).toBeVisible();
    await expect(dialog).toContainText('Alva Beteende');
    await expect(dialog).toContainText(
      'Inbetalningen raderas och kvittot skickas inte. Raden går tillbaka till listan.',
    );

    // "Behåll" är det ofarliga valet och rör ingenting.
    await dialog.getByRole('button', { name: 'Behåll' }).click();
    await expect(dialog).toHaveCount(0);
    expect(mockar.hanteraAnrop).toHaveLength(0);

    await form.getByRole('button', { name: 'Ångra registreringen för Alva Beteende' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ångra registreringen' }).click();

    await expect(
      form.getByRole('region', { name: 'Registrerat nu' }).getByText('Alva Beteende'),
    ).toHaveCount(0);
    await expect(form.getByRole('checkbox', { name: /Alva Beteende/ })).toBeVisible();
    expect(mockar.hanteraAnrop).toEqual([
      { atgard: 'radera', inbetalningId: inbetalningsId(RADER[0].id) },
    ]);
  });
});

test.describe('bekräftelsesteget — kvittokön (AC #5)', () => {
  test('"Registrera och skicka" köar alla registrerade kvitton i ETT anrop', async ({ page }) => {
    const { form, mockar } = await oppna(page);
    await form.getByRole('button', { name: 'Registrera och skicka 3 kvitton' }).click();
    await expect(form.getByText('2 kvitton skickade')).toBeVisible({ timeout: 30_000 });

    // ETT jobb, TVÅ rader (den fallerade fick aldrig något kvitto) — inget
    // batch-kontrakt, bara inkorgens befintliga köväg.
    expect(mockar.koAnrop).toEqual([[inbetalningsId(RADER[0].id), inbetalningsId(RADER[2].id)]]);
    await expect(form.getByText('Kvitto skickat · MM-2026-2001')).toBeVisible();
  });
});

test.describe('bekräftelsesteget — radformuläret (AC #7)', () => {
  test('beloppet öppnar det delade formuläret i Klar/Avbryt-läge; Avbryt lämnar raden orörd', async ({
    page,
  }) => {
    const { form, mockar } = await oppna(page);

    // Radens förval: avgiften är betald (1 000 av 2 500) ⇒ resten, 1 500 kr.
    const beloppsknapp = form.getByRole('button', { name: 'Ändra belopp för Alva Beteende' });
    await expect(beloppsknapp).toHaveText('1 500 kr');
    await beloppsknapp.click();

    // Det DELADE formuläret: Klar/Avbryt, ingen "Registrera och skicka".
    await expect(form.getByRole('button', { name: 'Klar' })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Avbryt' })).toBeVisible();
    await expect(
      form.getByRole('button', { name: /^Registrera och skicka \d+ kvitto/ }),
    ).toHaveCount(1);

    // Startvärdet är RADENS, inte `rad.kvar` — se `RegistreraForm`s
    // `startvarden`-docblock.
    //
    // REGEX OCH INTE LITERAL: `visaKronor` formaterar via sv-SE, vars
    // tusentalsavskiljare är ett NON-BREAKING SPACE. `toHaveValue` jämför RÅ
    // sträng (till skillnad från `toHaveText`, som normaliserar whitespace),
    // så en literal med vanligt mellanslag faller med ett diff där båda sidor
    // ser IDENTISKA ut — mätt här under bygget.
    const beloppsfalt = form.getByLabel('Belopp i kronor');
    await expect(beloppsfalt).toHaveValue(/^1\s500$/);

    // AVBRYT: raden är oförändrad, och ingen mutation har skett.
    //
    // `blur()` FÖRE KLICKET, OCH DET ÄR EN BOKFÖRD OBSERVATION — INTE
    // TESTKOSMETIK. Utfallsrutan uppdateras vid blur (`RegistreraForm`
    // § UTFALL_FORDROJNING_MS: "direkt när hon lämnar fältet"), och den nya
    // texten är högre än den gamla. MÄTT under bygget, Avbryt-knappens
    // y-position i samma kort: 612,75 px före inmatningen, 612,75 px direkt
    // efter `fill` (rutan är ännu fördröjd) och 641,75 px efter blur — en
    // flytt på 29 px. Ett klick UTAN föregående blur utlöser blurren SJÄLV
    // mellan `mousedown` och `mouseup`, knappen glider undan pekaren, och
    // react-arias `usePress` avfyrar då aldrig `onPress`: formuläret stod
    // kvar öppet med det ändrade beloppet.
    //
    // Beteendet ligger i den DELADE `RegistreraForm` och gäller därför
    // inkorgen lika mycket som steget — det är inte infört av denna skiva och
    // rättas inte här (`RegistreraForm.tsx` ligger utanför skivans claim
    // utöver det steget behöver). Bokfört som fynd i PR-kroppen och i kortets
    // notes; en fix hör hemma där formen ägs.
    await beloppsfalt.fill('900');
    await beloppsfalt.blur();
    await form.getByRole('button', { name: 'Avbryt' }).click();
    await expect(beloppsknapp).toHaveText('1 500 kr');
    expect(mockar.registreringsAnrop).toHaveLength(0);

    // KLAR: det nya beloppet landar på raden och i avstämningen.
    await beloppsknapp.click();
    const faltIgen = form.getByLabel('Belopp i kronor');
    await faltIgen.fill('900');
    await faltIgen.blur();
    await form.getByRole('button', { name: 'Klar' }).click();
    await expect(beloppsknapp).toHaveText('900 kr');
    expect(mockar.registreringsAnrop).toHaveLength(0);
  });
});

test.describe('bekräftelsesteget — tillgänglighet (AC #8)', () => {
  test('axe utan fel i utgångsläget och i efterläget', async ({ page }) => {
    const { form } = await oppna(page);

    // Kortet bär sitt markerings-läge för skärmläsare.
    await expect(form.getByRole('checkbox', { name: 'Alva Beteende Markerad' })).toBeChecked();

    const utgangslaget = await new AxeBuilder({ page }).include('main').analyze();
    expect(utgangslaget.violations).toEqual([]);

    await form.getByRole('button', { name: 'Registrera 3 inbetalningar' }).click();
    await expect(
      form.getByText('2 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible({ timeout: 20_000 });

    // Ångra-knapparna bär personens namn — tre lika knappar går att skilja åt.
    await expect(
      form.getByRole('button', { name: 'Ångra registreringen för Alva Beteende' }),
    ).toBeVisible();

    const efterlaget = await new AxeBuilder({ page }).include('main').analyze();
    expect(efterlaget.violations).toEqual([]);
  });
});
