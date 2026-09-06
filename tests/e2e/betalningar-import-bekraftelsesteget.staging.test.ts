import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '../support/test-bas';
import { mockTommaAnteckningar } from './helpers/tomma-anteckningar';
import { mockValjarLista } from './helpers/valjar-lista';

/**
 * [TASK-402.4 AC #2/#3/#4/#5] KONTOUTDRAGET IN I BEKRÄFTELSESTEGET — ände
 * till ände, från en fil i filväljaren till registrerade inbetalningar, med
 * alla fyra radtillstånden och serverns 409.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAMMA SKARV SOM STEGETS OCH INKORGENS SVITER, AV SAMMA SKÄL
 * ═══════════════════════════════════════════════════════════════════════════
 * `VITE_FEATURE_BETALNINGAR` är explicit `'av'` för HELA den delade
 * acceptance/visual/webblasarbeteende-fixturvärlden (`playwright.config.ts`),
 * så varken inkorgen eller steget kan renderas där. Staging bär `pa`
 * (`.env.staging`) och `chromium-authenticated` kör med en verklig inloggad
 * session. Deterministiskt via `page.route`, ALDRIG `network.use()` — ingen
 * delad staging-data rörs, och ingen inbetalning skapas i någon databas.
 *
 * PRD `TASK-402` § Testbeslut punkt 2 pekar ut exakt denna skarv, och nämner
 * "importens fyra radtillstånd" i sin uppräkning.
 *
 * DETTA ÄR REPOTS FÖRSTA IMPORT-E2E. `bankimport-*`-modulerna har haft
 * api-pure-täckning sedan `TASK-346.10` (`bankimport-parser.test.ts`,
 * `bankimport-matchning.test.ts`), men vägen genom webbläsaren — filväljaren,
 * överlämningen, stegets rendering — har aldrig mätts. Den saknades i den
 * skiva som byggde importen, och den byggs här därför att kortets AC #5
 * kräver den: "ände till ände från importerad fil till registrerade
 * inbetalningar".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FIXTUREN ÄR EN RIKTIG HANDELSBANKS-SWISHRAPPORT
 * ═══════════════════════════════════════════════════════════════════════════
 * Formen är kopierad ur `docs/research/swish-rapport-exempel/`
 * (kommaseparerad dagsrapport): `01`-startpost, `02`-betalningsrader med
 * `SWH` i fält 6, `03`-slutpost. Den känns igen AUTOMATISKT av
 * `arHandelsbanksformat`, så mappningsdialogen hoppas över — vilket är hela
 * poängen med testet: vägen Lotta faktiskt går är "välj fil, se raderna".
 *
 * FEM RADER, EN PER PÅSTÅENDE:
 *   1. SÄKER      telefonträff mot exakt en öppen anmälan (Anna)
 *   2. OSÄKER     telefonträff mot TVÅ anmälningar för samma person (Bengt)
 *   3. OMATCHAD   varken telefon eller namn träffar
 *   4. DUBBLETT   bankreferensen ligger i den lokala importloggen, OCH dess
 *                 telefon träffar en öppen anmälan (Cecilia) — så raden
 *                 bevisar rangordningen: dubbletten slår den säkra träffen
 *   5. KONFLIKT   säker träff (David) som SERVERN avvisar med 409, alltså
 *                 den väg som gäller när loggen inte vet men databasen gör det
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MOCKEN SPEGLAR SERVERN: EN REGISTRERAD RAD LÄMNAR DE ÖPPNA
 * ═══════════════════════════════════════════════════════════════════════════
 * `hamta-oppna-betalningar` tar bort raden så fort den registrerats, precis
 * som EF:en gör (en fullbetald anmälan är inte längre öppen). Det är inte
 * kosmetik: `useRegistreraInbetalning` invaliderar `betalningar.all` efter
 * VARJE rad, så listan krymper MITT I körningen. En statisk mock (som stegets
 * egen svit bär) kan strukturellt inte visa det, och det var precis där
 * `useBekraftelsesteg`s ombyggnads-signatur föll under bygget av denna skiva.
 * Vakten (`korningAger`) är fixen, och detta test är dess mätning.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';
const REGISTRERA_INBETALNING = '**/functions/v1/registrera-inbetalning';
const HAMTA_JOBBSTATUS = '**/functions/v1/hamta-jobbstatus*';

const EVENT_A = 'rec4024EventAlfa';
const EVENT_B = 'rec4024EventBeta';

const ANNA = 'rec4024AnnaLind1';
const BENGT_A = 'rec4024BengtAlfa';
const BENGT_B = 'rec4024BengtBeta';
const CECILIA = 'rec4024CeciliaN1';
const DAVID = 'rec4024DavidDav1';

/** Bankreferensen som redan ligger i den lokala importloggen (dubbletten). */
const REF_DUBBLETT = 'REF-4024-DUBBLETT';
/** Bankreferensen SERVERN avvisar med 409 (loggen känner den inte). */
const REF_KONFLIKT = 'REF-4024-KONFLIKT';

type Json = Record<string, unknown>;

function oppenBetalning(over: Json): Json {
  return {
    anmalanRecordId: ANNA,
    personNamn: 'Anna Lindqvist',
    personEpost: null,
    personTelefon: '+46701111111',
    eventId: EVENT_A,
    eventNamn: 'Alfakursen',
    eventStartdatum: '2099-06-01',
    eventTyp: 'Kurs',
    anmalanStatus: 'Bekräftad (mail skickat)',
    saknas: 1500,
    gallandePris: 2500,
    anmalningsavgift: 1000,
    summaInbetalt: 1000,
    summaInbetaltSpegel: 1000,
    spegelIFas: true,
    deadlineSlutbetalning: null,
    kvittonAttSkicka: 0,
    ...over,
  };
}

/** Fem öppna anmälningar över två event. Bengt har TVÅ (osäkerhetens källa). */
const RADER: Json[] = [
  oppenBetalning({}),
  oppenBetalning({
    anmalanRecordId: BENGT_A,
    personNamn: 'Bengt Lindqvist',
    personTelefon: '+46702222222',
    saknas: 2500,
    summaInbetalt: 0,
    summaInbetaltSpegel: 0,
  }),
  oppenBetalning({
    anmalanRecordId: BENGT_B,
    personNamn: 'Bengt Lindqvist',
    personTelefon: '+46702222222',
    eventId: EVENT_B,
    eventNamn: 'Betakursen',
    eventStartdatum: '2099-07-01',
    saknas: 2500,
    summaInbetalt: 0,
    summaInbetaltSpegel: 0,
  }),
  oppenBetalning({
    anmalanRecordId: CECILIA,
    personNamn: 'Cecilia Nord',
    personTelefon: '+46703333333',
    saknas: 3500,
    gallandePris: 3500,
    summaInbetalt: 0,
    summaInbetaltSpegel: 0,
  }),
  oppenBetalning({
    anmalanRecordId: DAVID,
    personNamn: 'David Dahl',
    personTelefon: '+46704444444',
    saknas: 2500,
    summaInbetalt: 0,
    summaInbetaltSpegel: 0,
  }),
];

/**
 * Kontoutdraget, i Handelsbankens kommaseparerade Swishrapport-form.
 *
 * Fältindexen är profilens (`HANDELSBANKEN_SWISH`): 5 = datum, 6 = `SWH`,
 * 7 = belopp, 9 = telefon, 10 = namn, 11 = bankreferens, 12 = meddelande.
 * `01`-posten först och `03`-posten sist är de två av tre villkor
 * `arHandelsbanksformat` läser; det tredje är att minst en `02`-rad har fler
 * fält än profilens högsta index (12).
 */
function betalningsrad(o: {
  datum: string;
  belopp: string;
  telefon: string;
  namn: string;
  referens: string;
  meddelande: string;
}): string {
  return [
    '02',
    '5566778899',
    '123456789',
    'HANDSESS',
    '1235524400',
    o.datum,
    'SWH',
    o.belopp,
    'SEK',
    o.telefon,
    o.namn,
    o.referens,
    o.meddelande,
    '',
    `${o.datum}T13:32:22:683413`,
  ].join(',');
}

const KONTOUTDRAG = [
  '01,2026-09-06,2026-09-05,',
  betalningsrad({
    datum: '2026-09-05',
    belopp: '1500.00',
    telefon: '+46701111111',
    namn: 'Anna Swish',
    referens: 'REF-4024-SAKER',
    meddelande: 'Kursavgift Alfa',
  }),
  betalningsrad({
    datum: '2026-09-05',
    belopp: '1000.00',
    telefon: '+46702222222',
    namn: 'Bengt Swish',
    referens: 'REF-4024-OSAKER',
    meddelande: 'Anmalningsavgift',
  }),
  betalningsrad({
    datum: '2026-09-05',
    belopp: '900.00',
    telefon: '+46709999999',
    namn: 'Okand Betalare',
    referens: 'REF-4024-OMATCHAD',
    meddelande: 'Ingen aning',
  }),
  betalningsrad({
    datum: '2026-09-04',
    belopp: '3500.00',
    telefon: '+46703333333',
    namn: 'Cecilia Swish',
    referens: REF_DUBBLETT,
    meddelande: 'Redan tagen',
  }),
  betalningsrad({
    datum: '2026-09-05',
    belopp: '2500.00',
    telefon: '+46704444444',
    namn: 'David Swish',
    referens: REF_KONFLIKT,
    meddelande: 'Servern sager nej',
  }),
  '03,5',
].join('\n');

/**
 * Inbetalnings-id per anmälan.
 *
 * MÅSTE VARA ETT GILTIGT UUID: `RegistreraInbetalningResultSchema` zod-parsar
 * svaret klientsidan, och `inbetalning.id` är `z.string().uuid()`. En mock som
 * byggde id:t ur record-ID-strängen (som bär icke-hex-tecken) fällde varje rad
 * med zods egen valideringsdump i radens felruta i stället för att registrera
 * den — mätt under bygget av denna svit, och en fälla värd att bokföra: felet
 * SÅG ut som ett applikationsfel men var mockens.
 */
function inbetalningsId(anmalanRecordId: string): string {
  const index = RADER.findIndex((r) => r.anmalanRecordId === anmalanRecordId);
  return `ba5eba11-4024-4024-8024-${String(index + 1).padStart(12, '0')}`;
}

type Mockar = {
  /** `{ anmalanRecordId, bankreferens }` per `registrera-inbetalning`-anrop. */
  registreringsAnrop: { anmalanRecordId: string; bankreferens?: string; belopp: string }[];
};

async function mocka(page: Page): Promise<Mockar> {
  const tillstand: Mockar = { registreringsAnrop: [] };

  await mockValjarLista(page);
  await mockTommaAnteckningar(page);

  /* LAGRINGEN SÄTTS FÖRE FÖRSTA RENDERINGEN.
     - importloggen får dubblettens referens, så raden märks INNAN Lotta
       trycker (`bankmappning-minne.ts` § IMPORTLOGGEN);
     - de sparade kolumnmappningarna nollställs, så `analyseraFil` har exakt
       EN kandidat (den inbyggda Handelsbanks-profilen) och dialogen hoppas
       över deterministiskt — en kvarlämnad mappning från en tidigare körning
       hade annars gett TVÅ kandidater och därmed mappningsdialogen;
     - importminnet nollställs, så inget lämnas kvar mellan testerna. */
  await page.addInitScript(
    ({ referens }) => {
      window.localStorage.setItem(
        'mm.betalningar.importerade',
        JSON.stringify([{ bankreferens: referens, nar: '2026-08-30' }]),
      );
      window.localStorage.removeItem('mm.betalningar.bankmappningar');
      window.sessionStorage.removeItem('mm.betalningar.import');
    },
    { referens: REF_DUBBLETT },
  );

  /** Anmälningar som fortfarande är öppna. Krymper med varje registrering. */
  const oppna = new Map(RADER.map((r) => [r.anmalanRecordId as string, r]));

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
      bankreferens?: string;
    };
    tillstand.registreringsAnrop.push({
      anmalanRecordId: body.anmalanRecordId,
      bankreferens: body.bankreferens,
      belopp: body.belopp,
    });

    // AC #4: serverns dubblettsvar. 409 med `dubblett_bankreferens`, exakt
    // som `registrera-inbetalning/index.ts` svarar när det partiella unika
    // indexet avvisar referensen.
    if (body.bankreferens === REF_KONFLIKT) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'En inbetalning med samma bankreferens finns redan.',
          code: 'dubblett_bankreferens',
        }),
      });
      return;
    }

    // SERVERN SPEGLAD: den betalda anmälan är inte längre öppen.
    oppna.delete(body.anmalanRecordId);

    const nu = new Date().toISOString();
    const belopp = Number(body.belopp.replace(/\s/g, '').replace(',', '.'));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        inbetalning: {
          id: inbetalningsId(body.anmalanRecordId),
          anmalanRecordId: body.anmalanRecordId,
          ogonblicksbildNamn: 'Importerad rad',
          ogonblicksbildEvent: 'Alfakursen',
          ogonblicksbildEventdatum: '2099-06-01',
          belopp,
          betalsatt: body.betalsatt,
          betalningsdatum: body.betalningsdatum ?? nu.slice(0, 10),
          typ: 'inbetalning',
          status: 'aktiv',
          makuleradSkal: null,
          makuleradNar: null,
          bankreferens: body.bankreferens ?? null,
          kvittoId: null,
          notering: null,
          skapadAv: 'staging-user@miranon.test',
          skapadNar: nu,
        },
        harledning: {
          summa: belopp,
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

  await page.route(HAMTA_JOBBSTATUS, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobb: null,
        rader: [],
        sammanfattning: { totalt: 0, skickade: 0, fel: 0, kvar: 0 },
      }),
    });
  });

  return tillstand;
}

function steget(page: Page) {
  return page.getByTestId('bekraftelsesteget');
}

function handhogen(page: Page) {
  return page.getByRole('region', { name: /^Behöver din hand/ });
}

function redanRegistrerade(page: Page) {
  return page.getByRole('region', { name: /^Redan registrerade/ });
}

/**
 * Hela vägen: inkorgen → Importera kontoutdrag → filen → bekräftelsesteget.
 *
 * `setInputFiles` mot den DOLDA inputen och inte ett klick på knappen:
 * knappen anropar `input.click()`, och en filväljardialog kan inte fyllas i
 * från testet. Playwright sätter filerna direkt på elementet, vilket är den
 * dokumenterade formen för just detta.
 */
async function importera(page: Page): Promise<Mockar> {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const mockar = await mocka(page);

  await page.goto('/mer/betalningar');
  await expect(page.getByRole('heading', { level: 1, name: 'Betalningar' })).toBeVisible({
    timeout: 15_000,
  });

  // [TASK-412, femte varvet] Importen är en DIALOG bakom RUBRIK-TRIGGERNS
  // meny (Marcus: "gör Titeln 'Betalningar' till en dropdown") — INTE
  // längre en egen knapp i sidhuvudet, och inte längre en separat ⋯-knapp
  // (den vägen prövades och revs igen samma dag).
  await page.getByRole('button', { name: 'Betalningar' }).click();
  await page.getByRole('menuitem', { name: 'Importera kontoutdrag' }).click();
  const panel = page.getByRole('dialog', { name: 'Importera kontoutdrag' });
  await expect(panel).toBeVisible();

  await panel.locator('input[type="file"]').setInputFiles({
    name: 'swishrapport-2026-09-06.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(KONTOUTDRAG, 'utf8'),
  });

  // AC #3: mappningsdialogen visas ALDRIG för en igenkänd fil, och den gamla
  // bekräftelselistan finns inte längre någonstans — nästa yta är STEGET.
  await expect(page).toHaveURL(/\/mer\/betalningar\/registrera\?kalla=import/, {
    timeout: 15_000,
  });
  await expect(
    steget(page).getByRole('heading', { level: 1, name: 'Bulkregistrering' }),
  ).toBeVisible({ timeout: 15_000 });
  return mockar;
}

/* ═══════════════════ DE FYRA TILLSTÅNDEN (AC #2) ═══════════════════ */

test.describe('TASK-402.4 — importens fyra radtillstånd i steget', () => {
  test('säker, osäker, omatchad och dubblett ligger var och en på sin plats', async ({ page }) => {
    await importera(page);
    const form = steget(page);

    // ── SÄKER: förbockad, med BANKENS belopp och datum ────────────────────
    // Två säkra rader: Anna (1 500) och David (2 500). Annas förslag ur
    // appen hade varit 1 500 (resten), Davids hade varit 1 000
    // (anmälningsavgiften) — banken säger 2 500, och det är banken som vet.
    await expect(form.getByText('2 av 2 inbetalningar markerade')).toBeVisible();
    await expect(form.getByRole('checkbox', { name: 'Anna Lindqvist Markerad' })).toBeChecked();
    await expect(form.getByRole('checkbox', { name: 'David Dahl Markerad' })).toBeChecked();
    await expect(form.getByRole('button', { name: 'Ändra belopp för David Dahl' })).toHaveText(
      /^2\s500 kr$/,
    );

    // Källraden säger vilken fil raderna kom ur.
    await expect(form.getByText(/swishrapport-2026-09-06\.csv/)).toBeVisible();

    // ── OSÄKER OCH OMATCHAD: båda under "Behöver din hand" ────────────────
    const hand = handhogen(page);
    await expect(hand).toBeVisible();
    await expect(hand.getByText('Bengt Swish')).toBeVisible();
    await expect(hand.getByText('Okand Betalare')).toBeVisible();

    // Osäker: kandidaterna som FÖRSLAGSKNAPPAR, en per öppen anmälan.
    await expect(hand.getByRole('button', { name: /^Bengt Lindqvist · Alfakursen/ })).toBeVisible();
    await expect(hand.getByRole('button', { name: /^Bengt Lindqvist · Betakursen/ })).toBeVisible();

    // Omatchad: sökfält, och INGA förslagsknappar förrän hon sökt.
    await expect(
      hand.getByRole('searchbox', { name: 'Sök anmälan för Okand Betalare' }),
    ).toBeVisible();
    await expect(hand.getByRole('searchbox', { name: 'Sök anmälan för Bengt Swish' })).toHaveCount(
      0,
    );

    // ── DUBBLETT: egen sektion, LÅST UTAN KRYSS ───────────────────────────
    const dubbletter = redanRegistrerade(page);
    await expect(dubbletter).toBeVisible();
    await expect(dubbletter.getByText('Cecilia Swish')).toBeVisible();
    await expect(dubbletter.getByText(/Importerad 2026-08-30/)).toBeVisible();
    // "aldrig registrerbar" mätt som frånvaron av varje kontroll.
    await expect(dubbletter.getByRole('checkbox')).toHaveCount(0);
    await expect(dubbletter.getByRole('button')).toHaveCount(0);
  });

  test('DUBBLETTEN SLÅR DEN SÄKRA TRÄFFEN: Cecilias anmälan är öppen och ändå obockad (AC #4)', async ({
    page,
  }) => {
    await importera(page);
    const form = steget(page);

    // Cecilias bankrad har en EXAKT telefonträff mot en öppen anmälan. Utan
    // rangordningen i `importradsklass` hade den kommit förbockad in i listan.
    await expect(form.getByRole('checkbox', { name: /Cecilia/ })).toHaveCount(0);
    await expect(redanRegistrerade(page).getByText('Cecilia Swish')).toBeVisible();
    // Och anmälan är fortfarande valbar för NÅGON ANNAN rad — den är öppen.
    const hand = handhogen(page);
    await hand.getByRole('searchbox', { name: 'Sök anmälan för Okand Betalare' }).fill('Cecilia');
    await expect(hand.getByRole('button', { name: /^Cecilia Nord · Alfakursen/ })).toBeVisible();
  });
});

/* ═══════════════════ VALET SOM BOCKAR RADEN (AC #2) ═══════════════════ */

test.describe('TASK-402.4 — valet flyttar raden ur hand-högen', () => {
  test('en osäker och en omatchad rad blir markerade stegrader när anmälan valts', async ({
    page,
  }) => {
    await importera(page);
    const form = steget(page);
    const hand = handhogen(page);

    // OSÄKER: ett tryck på kandidaten, inte två (valet och bocken hör ihop).
    await hand.getByRole('button', { name: /^Bengt Lindqvist · Alfakursen/ }).click();
    await expect(form.getByRole('checkbox', { name: 'Bengt Lindqvist Markerad' })).toBeChecked();
    // Bankens belopp följde med: 1 000 kr, inte anmälningsavgiften ur appen
    // (som råkar vara samma) — datumet skiljer dem åt i registreringen nedan.
    await expect(form.getByRole('button', { name: 'Ändra belopp för Bengt Lindqvist' })).toHaveText(
      /^1\s000 kr$/,
    );

    // OMATCHAD: sök, välj, klar.
    await hand.getByRole('searchbox', { name: 'Sök anmälan för Okand Betalare' }).fill('Cecilia');
    await hand.getByRole('button', { name: /^Cecilia Nord/ }).click();
    await expect(form.getByRole('checkbox', { name: 'Cecilia Nord Markerad' })).toBeChecked();
    await expect(form.getByRole('button', { name: 'Ändra belopp för Cecilia Nord' })).toHaveText(
      /^900 kr$/,
    );

    // Hand-högen är tom och FÖRSVINNER; dubbletten står kvar i sin sektion.
    await expect(handhogen(page)).toHaveCount(0);
    await expect(redanRegistrerade(page)).toBeVisible();
    await expect(form.getByText('4 av 4 inbetalningar markerade')).toBeVisible();
  });
});

/* ═══════════════════ ÄNDE TILL ÄNDE (AC #4, AC #5) ═══════════════════ */

test.describe('TASK-402.4 — från fil till registrerade inbetalningar', () => {
  test('fyra rader registreras, bankreferensen följer med, och serverns 409 avvisar dubbletten', async ({
    page,
  }) => {
    const mockar = await importera(page);
    const form = steget(page);
    const hand = handhogen(page);

    await hand.getByRole('button', { name: /^Bengt Lindqvist · Alfakursen/ }).click();
    await hand.getByRole('searchbox', { name: 'Sök anmälan för Okand Betalare' }).fill('Cecilia');
    await hand.getByRole('button', { name: /^Cecilia Nord/ }).click();

    await form.getByRole('button', { name: 'Registrera 4 inbetalningar' }).click();

    // Tre gick, en fälldes av servern (AC #4).
    await expect(
      form.getByText('3 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible({ timeout: 20_000 });

    // 409-raden står kvar i listan med serverns egen innebörd i klartext, och
    // är AVMARKERAD så en omkörning inte kan producera fler 409:or.
    await expect(form.getByText('Redan registrerad. Ingen ny inbetalning skapades.')).toBeVisible();
    await expect(
      form.getByRole('checkbox', { name: 'David Dahl Inte markerad' }),
    ).not.toBeChecked();
    await expect(form.getByRole('button', { name: 'Registrera', exact: true })).toBeDisabled();

    // BANKREFERENSEN FÖLJDE MED PÅ VARJE ANROP (AC #4:s förutsättning — utan
    // fältet finns inget dubblettskydd att avvisa mot).
    expect(mockar.registreringsAnrop).toHaveLength(4);
    const perAnmalan = new Map(
      mockar.registreringsAnrop.map((a) => [a.anmalanRecordId, a] as const),
    );
    expect(perAnmalan.get(ANNA)?.bankreferens).toBe('REF-4024-SAKER');
    expect(perAnmalan.get(BENGT_A)?.bankreferens).toBe('REF-4024-OSAKER');
    expect(perAnmalan.get(CECILIA)?.bankreferens).toBe('REF-4024-OMATCHAD');
    expect(perAnmalan.get(DAVID)?.bankreferens).toBe(REF_KONFLIKT);
    // Beloppen är BANKENS, inte appens förslag: Cecilias anmälan saknar
    // 3 500 kr, och raden registrerar 900.
    expect(perAnmalan.get(CECILIA)?.belopp).toBe('900');

    // Efterläget är stegets vanliga: "Registrerat nu" med de tre raderna.
    await expect(
      form.getByRole('button', { name: /^Ångra registreringen för/ }).first(),
    ).toBeVisible();

    // KÖRNINGEN BYGGDES ALDRIG OM under fötterna trots att de öppna
    // betalningarna krympte efter varje registrering: dubblett-sektionen och
    // 409-radens fel står kvar, och statusraden säger fortfarande utfallet.
    await expect(redanRegistrerade(page)).toBeVisible();
    await expect(
      form.getByText('3 inbetalningar registrerade, 1 kunde inte registreras'),
    ).toBeVisible();
  });

  test('serverns 409 bokförs i importloggen, så en OMIMPORT visar raden som dubblett', async ({
    page,
  }) => {
    await importera(page);
    const form = steget(page);
    const hand = handhogen(page);

    await hand.getByRole('button', { name: /^Bengt Lindqvist · Alfakursen/ }).click();
    await form.getByRole('button', { name: /^Registrera \d+ inbetalningar$/ }).click();
    await expect(form.getByText(/kunde inte registreras/)).toBeVisible({ timeout: 20_000 });

    /* LOGGEN ÄR NU RIKARE ÄN DEN VAR. Både de registrerade referenserna och
       den servern avvisade ska ligga där — annars hade en omimport från
       samma webbläsare visat raden som OMATCHAD (anmälan är ju inte längre
       öppen) i stället för "den här har du redan tagit". */
    const loggade = await page.evaluate(() => {
      const ratt = window.localStorage.getItem('mm.betalningar.importerade');
      return ratt === null
        ? []
        : (JSON.parse(ratt) as { bankreferens: string }[]).map((p) => p.bankreferens);
    });
    expect(loggade).toContain(REF_KONFLIKT);
    expect(loggade).toContain('REF-4024-SAKER');
    expect(loggade).toContain(REF_DUBBLETT);
  });
});

/* ═══════════════════ ÖVERLÄMNINGENS GRÄNSER ═══════════════════ */

test.describe('TASK-402.4 — överlämningen', () => {
  test('URL:en bär ett LÄGE, aldrig raddata', async ({ page }) => {
    await importera(page);
    const url = new URL(page.url());
    expect(url.searchParams.get('kalla')).toBe('import');
    // Inga belopp, referenser, telefonnummer eller namn i adressen.
    expect([...url.searchParams.keys()]).toEqual(['kalla']);
    expect(url.search).not.toContain('REF-');
    expect(url.search).not.toContain('+467');
  });

  test('steget utan importminne säger vad hon ska göra i stället för att stå tomt', async ({
    page,
  }) => {
    await mocka(page);
    // Direktlänk utan att ha gått genom importen: minnet finns inte.
    await page.goto('/mer/betalningar/registrera?kalla=import');
    await expect(page.getByText(/Importen kunde inte läsas/)).toBeVisible({ timeout: 15_000 });
  });
});

/* ═══════════════════ TILLGÄNGLIGHET ═══════════════════ */

test.describe('TASK-402.4 — tillgänglighet', () => {
  test('axe utan fel med alla fyra tillstånden på skärmen', async ({ page }) => {
    await importera(page);
    await expect(handhogen(page)).toBeVisible();
    await expect(redanRegistrerade(page)).toBeVisible();

    const utfall = await new AxeBuilder({ page }).include('main').analyze();
    expect(utfall.violations).toEqual([]);
  });
});

/**
 * TASK-412 — IMPORTEN SOM DIALOG, NÅDD VIA RUBRIK-TRIGGERN (Marcus
 * prod-granskning 2026-09-06, S121 resume 4, femte varvet samma dag):
 * *"Ta bort 'Mer-ikonen' och gör Titeln 'Betalningar' till en dropdown
 * (typ som på eventdetalj-sidan)."* Rubriken "Betalningar" ÄR triggern
 * (samma `EventValjare.tsx` § "RUBRIK-FORMEN"-anatomi, fast med en `Meny`
 * i stället för en `Select` — sidan BYTER inget objekt, den öppnar sina
 * ÅTGÄRDER). En tidigare, nu riven, ⋯-knapp bredvid tratten (fjärde varvet)
 * testades aldrig i produktion och lämnar inget spår kvar här.
 *
 * AC #3 — fokus IN vid öppning (react-arias `useDialog` fokuserar
 * DIALOG-ELEMENTET självt vid mount, `RegistreratNuBlock.tsx`s docblock
 * citerar samma källa), rubriken ÄR dialogens tillgängliga namn, fokus
 * ÅTER till rubrik-triggern vid stängning, och ett axe-svep av den ÖPPNA
 * dialogen (skilt från sviten ovans svep av STEGET efter överlämningen).
 */
test.describe('TASK-412 — importen som dialog', () => {
  test('rubrik-triggerns meny öppnar dialogen; fokus in vid öppning, tillbaka vid Escape; axe utan fel', async ({
    page,
  }) => {
    await mocka(page);
    await page.goto('/mer/betalningar');
    const rubrikTrigger = page.getByRole('button', { name: 'Betalningar' });
    await expect(rubrikTrigger).toBeVisible({ timeout: 15_000 });

    await rubrikTrigger.click();
    await page.getByRole('menuitem', { name: 'Importera kontoutdrag' }).click();

    const dialog = page.getByRole('dialog', { name: 'Importera kontoutdrag' });
    await expect(dialog).toBeVisible();
    // Fokus går IN i DIALOGEN (elementet självt, inte första knappen —
    // react-arias `useDialog`-standard).
    await expect(dialog).toBeFocused();

    const utfall = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(utfall.violations).toEqual([]);

    // Escape stänger utan att röra bankminnet (`stangImport` rör bara
    // `visaImport` + fokus, se dess docblock) och lämnar fokus på
    // rubrik-triggern.
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(rubrikTrigger).toBeFocused();

    // En NY öppning startar om i steg 'val' — bevis på att inget av det
    // gamla filvals-tillståndet läckte över stängningen.
    await rubrikTrigger.click();
    await page.getByRole('menuitem', { name: 'Importera kontoutdrag' }).click();
    await expect(page.getByRole('dialog', { name: 'Importera kontoutdrag' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ladda upp fil' })).toBeVisible();
  });
});
