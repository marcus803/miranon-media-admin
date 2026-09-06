import AxeBuilder from '@axe-core/playwright';
import type { NetworkFixture } from '@msw/playwright';
import type { Page } from '@playwright/test';
import { http } from 'msw';
import type { z } from 'zod';
import type { EventSchema, RegistrationSchema } from '../../src/domain/schemas';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, test } from './acceptance-bas';

/**
 * ANMÄLNINGSSIDANS FORM — `/mer/anmalningar` (TASK-299.5, `ADR-103` B1/B2).
 *
 * FILEN ÄR FLYTTAD, INTE NYSKRIVEN. Den föddes som
 * `tests/acceptance/anmalningar-prototyp.acceptance.test.ts` och vaktade då
 * divergens-prototypens tre varianter × tre lägen. När variant B
 * promoverades till skarp yta följde bevisen med formen (`git mv`, samma
 * disciplin som `VariantB.tsx` → `registrations/AnmalningarSida.tsx`):
 * täckningen är för dyrköpt för att kastas och skrivas om från grunden, och
 * en omskrivning hade tappat exakt de regressionsvakter som föddes ur
 * verkliga fynd under konvergensen (mobilradens namnbredd, höjdlåsets
 * `min-h-6`-golv, eventnamns-uppslaget när anmälans egen fritext saknas).
 *
 * VAD SOM ÄNDRADES VID FLYTTEN, och ingenting mer:
 *
 *   1. **Adresserna.** `/mer/anmalningar` →
 *      `/mer/anmalningar`; `&lage=atgardskon` → `?visa=atgardskon` (den
 *      skarpa sidans egen axel); `&lage=tomt` → en TOM `get-registrations`,
 *      eftersom tomläget här uppstår av datan i stället för av en växel.
 *   2. **Variant A och C är borta.** De förkastades av Marcus (TASK-299.3
 *      AC #6, polval "B bäst") och revs med resten av substratet, så deras
 *      tester saknar yta att köra mot. Det de bevisade om variant B står
 *      kvar oförändrat.
 *
 * Täckning: DoD #5 (axe 0 i alla fyra tillstånd — lista/filtrerat/tomt/fel)
 * · DoD #6 (höjdlåset som BETEENDE, inte påstående) · AC #4 (raden är sin
 * egen trigger, aldrig ett separat knappelement) · filtrets fyra axlar
 * (Period · Typ · Ort · Event) · mobilradens läsbarhet vid 375 px.
 *
 * ── FÖRHÅLLANDET TILL `mer-anmalningar.acceptance.test.ts` ───────────────
 *
 * Den filen är task-1.4:s ursprungliga skarv och äger SIDANS KONTRAKT: att
 * den nås från Mer-landningen, sorteringen senaste-först, fokus → `<h1>`,
 * tomt- och felläget, rad-klick → anmälda-vyn. Den är UTVIDGAD, inte
 * omskriven, med radanatomin och åtgärdsradens väg till resolutionen.
 * DENNA fil äger FORMENS detaljer. Gränsen är avsiktlig: sidans kontrakt
 * överlever en framtida omformning, formens detaljer gör det inte.
 *
 * Samma hermetiska fixturvärld och `EF('get-registrations')`-överskuggning
 * som syskonfilen — samma `queryKeys.registrations.all`, samma EF,
 * event-lösa gren.
 */

type Row = z.infer<typeof RegistrationSchema>;

function reg(overrides: Partial<Row> = {}): Row {
  return {
    id: `recR${Math.random().toString(36).slice(2, 10)}`,
    namn: null,
    fornamn: 'Anna',
    efternamn: 'Andersson',
    email: 'anna@example.se',
    telefon: '070-1111111',
    eventNamn: 'Resor i medvetandet 1',
    ort: 'Skövde',
    status: 'Bekräftad (mail skickat)',
    flagga: 'Ny anmälan',
    anmalningsavgift: 'Mottagen',
    slutbetalning: 'Ej mottagen',
    betalningspaminnelseSkickad: null,
    inskickad: '2026-06-20T10:00:00.000Z',
    motivering: null,
    tidigareErfarenhet: null,
    antalPlatser: 1,
    notering: null,
    eventId: 'recEvent1',
    personId: 'recPerson1',
    eventmatchning: 'OK',
    ...overrides,
  };
}

function mockRegistrations(
  network: NetworkFixture,
  rows: Row[],
  { status = 200 }: { status?: number } = {},
): void {
  network.use(
    http.get(EF('get-registrations'), () =>
      status === 200 ? json({ registrations: rows }) : json({ error: 'x' }, status),
    ),
  );
}

type EventRow = z.infer<typeof EventSchema>;

/** Minimal event-fixtur (task-299.3-tillägget: undertextens eventnamn +
    period-filtret behöver en riktig get-events-motpart för `eventId`). */
function event(overrides: Partial<EventRow> & { id: string }): EventRow {
  return {
    eventlabel: null,
    eventNamn: 'Namnlöst event',
    typ: 'Kurs',
    ort: 'Skövde',
    startdatum: null,
    slutdatum: null,
    tidKvarTillEvent: null,
    maxPlatser: null,
    antalAnmalda: 0,
    platserKvar: null,
    anmaldBelaggning: null,
    bekraftadBelaggning: null,
    antalNyaAnmalningar: 0,
    antalAnmalningsavgifter: 0,
    antalSlutbetalningar: 0,
    antalSlutbetalningFelande: 0,
    status: 'Planerat',
    ...overrides,
  };
}

function mockEvents(network: NetworkFixture, events: EventRow[]): void {
  network.use(http.get(EF('get-events'), () => json({ events })));
}

/** Period-filtrets två test-event, daterade mot FROZEN_NOW (2026-09-15,
    hermetic.ts § `page.clock.setFixedTime`) — INTE mot verklig systemtid,
    så klassningen kommande/tidigare aldrig kan flippa när kalendertiden
    passerar (samma disciplin som events-list-kalender.acceptance.test.ts). */
const EVENT_KOMMANDE_ID = 'recEventKommande1';
const EVENT_TIDIGARE_ID = 'recEventTidigare1';
function periodTestEvents(): EventRow[] {
  return [
    event({
      id: EVENT_KOMMANDE_ID,
      eventNamn: 'Vinterkurs Umeå',
      startdatum: '2026-10-15', // > FROZEN_NOW → kommande
    }),
    event({
      id: EVENT_TIDIGARE_ID,
      eventNamn: 'Sommarkurs Skövde',
      startdatum: '2026-08-01', // < FROZEN_NOW → tidigare
    }),
  ];
}

/** Blandad datamängd — en OK-rad, en Avviker-rad, en Utan-event-rad. Täcker
    samtliga tre eventmatchning-lägen i EN körning. */
function blandadeRader(): Row[] {
  return [
    reg({
      id: 'recRegCarl0001',
      fornamn: 'Carl',
      efternamn: 'Carlsson',
      eventmatchning: 'OK',
      inskickad: '2026-06-22T10:00:00.000Z',
    }),
    reg({
      fornamn: 'Bo',
      efternamn: 'Bengtsson',
      eventmatchning: 'Avviker',
      inskickad: '2026-06-21T10:00:00.000Z',
    }),
    reg({
      fornamn: 'Eva',
      efternamn: 'Ek',
      eventId: null,
      eventNamn: null,
      eventmatchning: 'Utan event',
      inskickad: '2026-06-19T10:00:00.000Z',
    }),
  ];
}

const WCAG_TAGGAR = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Axe över hela den renderade sidan; violations skrivs ut läsbart. */
async function axeNoll(page: Page): Promise<void> {
  const resultat = await new AxeBuilder({ page }).withTags(WCAG_TAGGAR).analyze();
  expect(
    resultat.violations,
    resultat.violations.map((v) => `[${v.impact ?? 'utan impact'}] ${v.id}: ${v.help}`).join('\n'),
  ).toEqual([]);
}

test.describe('Anmälningssidans form (TASK-299.5 — /mer/anmalningar)', () => {
  test('lista-läget renderar rader och axe 0', async ({ page, network }) => {
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar');

    await expect(page.getByRole('heading', { level: 1, name: 'Anmälningar' })).toBeVisible();
    await expect(page.getByText('Carl Carlsson')).toBeVisible();
    await expect(page.getByText('Bo Bengtsson')).toBeVisible();
    await expect(page.getByText('Eva Ek')).toBeVisible();
    // Ofiltrerat läge visar ALLA tre — ingen atgardskon-filtrering.
    // exact: true — filterpanelen bär räknaren "Visar 3 av 3 anmälningar",
    // som innehåller SAMMA delsträng som rubrikraden (strict-mode-klassen).
    await expect(page.getByText('3 anmälningar', { exact: true })).toBeVisible();

    await axeNoll(page);
  });

  test('åtgärdskö-läget filtrerar till behoverAtgard och axe 0', async ({ page, network }) => {
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar?visa=atgardskon');

    await expect(page.getByRole('heading', { level: 1, name: 'Anmälningar' })).toBeVisible();
    // Endast Bo (Avviker) och Eva (Utan event) — Carl (OK) filtreras bort.
    await expect(page.getByText('Bo Bengtsson')).toBeVisible();
    await expect(page.getByText('Eva Ek')).toBeVisible();
    await expect(page.getByText('Carl Carlsson')).toHaveCount(0);
    await expect(page.getByText('2 anmälningar kunde inte kopplas till rätt event')).toBeVisible();

    await axeNoll(page);
  });

  test('åtgärdskö-läget bär återvägen till hela listan', async ({ page, network }) => {
    // Prototypen saknade den här länken (den filtrerade via sin egen
    // ?lage=-växel); den skarpa sidan filtrerar via ?visa=atgardskon, som
    // "Rensa filter" inte når eftersom den inte är en filter-dimension.
    // Utan återvägen vore läget en återvändsgränd — se AnmalningarSida.tsx
    // § ÅTERVÄGEN. Länken NOLLSTÄLLER parametern explicit.
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar?visa=atgardskon');

    await page.getByRole('link', { name: 'Visa alla anmälningar' }).click();

    await expect(page).toHaveURL(/\/mer\/anmalningar$/);
    await expect(page.getByText('Carl Carlsson')).toBeVisible();
    await expect(page.getByText('3 anmälningar', { exact: true })).toBeVisible();
  });

  test('tomt läge visar vänlig text, inga fel, axe 0', async ({ page, network }) => {
    // Tomläget uppstår av DATAN, inte av en växel: prototypens ?lage=tomt
    // tvingade fram en tom lista för bildtagning och revs med resten.
    mockRegistrations(network, []);
    await page.goto('/mer/anmalningar');

    await expect(page.getByRole('heading', { level: 1, name: 'Anmälningar' })).toBeVisible();
    await expect(page.getByText('Inga anmälningar än.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await axeNoll(page);
  });

  test('fel (4xx) visar role=alert, axe 0', async ({ page, network }) => {
    mockRegistrations(network, [], { status: 404 });
    await page.goto('/mer/anmalningar');

    await expect(page.getByRole('alert')).toContainText('Kunde inte hämta anmälningarna');

    await axeNoll(page);
  });

  test.describe('AC #4 — raden är sin egen trigger, inget separat knappelement', () => {
    test('en OK-rad är en riktig länk till eventet, ingen knapp i raden', async ({
      page,
      network,
    }) => {
      mockRegistrations(network, blandadeRader());
      await page.goto('/mer/anmalningar');

      const lista = page.getByRole('list', { name: 'Anmälningar' });
      const carlsRad = lista.locator('li', { hasText: 'Carl Carlsson' });
      await expect(carlsRad.getByRole('link')).toHaveCount(1);
      await expect(carlsRad.getByRole('button')).toHaveCount(0);

      await carlsRad.getByRole('link').click();
      // TASK-389: länkmålet är anmälans egen sida (task-18.17), inte längre
      // eventets gamla Anmälda-lista.
      await expect(page).toHaveURL('/event/recEvent1/anmalan/recRegCarl0001');
    });

    test('en Avviker-rad är en knapp som öppnar resolutionen — ingen nästlad interaktivitet', async ({
      page,
      network,
    }) => {
      // Den gamla formen (task-1.4:s AnmalningarList) bar en SEPARAT
      // "Koppla till event"-knapp som syskon till radens länk-kort. Här är
      // raden SIN EGEN trigger: exakt EN interaktiv yta, en riktig <button>,
      // noll länkar — så axe `nested-interactive` inte ens kan uppstå.
      mockRegistrations(network, blandadeRader());
      await page.goto('/mer/anmalningar');

      const lista = page.getByRole('list', { name: 'Anmälningar' });
      const bosRad = lista.locator('li', { hasText: 'Bo Bengtsson' });
      await expect(bosRad.getByRole('button')).toHaveCount(1);
      await expect(bosRad.getByRole('link')).toHaveCount(0);

      await bosRad.getByRole('button').click();
      await expect(page.getByRole('dialog', { name: 'Koppla till rätt event' })).toBeVisible();
    });

    test('en Utan-event-rad öppnar resolutionens andra rubrik', async ({ page, network }) => {
      mockRegistrations(network, blandadeRader());
      await page.goto('/mer/anmalningar');

      const evasRad = page
        .getByRole('list', { name: 'Anmälningar' })
        .locator('li', { hasText: 'Eva Ek' });
      await expect(evasRad.getByRole('button')).toHaveCount(1);
      await expect(evasRad.getByRole('link')).toHaveCount(0);

      await evasRad.getByRole('button').click();
      await expect(page.getByRole('dialog', { name: 'Koppla till event' })).toBeVisible();
    });
  });

  test('DoD #6 — höjdlåset: rader med och utan åtgärdsbehov har samma höjd', async ({
    page,
    network,
  }) => {
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar');

    const lista = page.getByRole('list', { name: 'Anmälningar' });
    // Carl = OK (ingen status/åtgärd), Bo = Avviker (status+åtgärd synlig).
    const okRad = lista.locator('li', { hasText: 'Carl Carlsson' });
    const atgardRad = lista.locator('li', { hasText: 'Bo Bengtsson' });

    const okBox = await okRad.boundingBox();
    const atgardBox = await atgardRad.boundingBox();
    expect(okBox).not.toBeNull();
    expect(atgardBox).not.toBeNull();
    // ≤1px tolerans (inte exakt likhet): statuskolumnen reserverar sin plats
    // med `invisible`, aldrig villkorad rendering, så DOM-strukturen är
    // IDENTISK mellan raderna — men mätt (debug-pass, 2026-08-22) kan två
    // organiskt flödande textrader av olika längd fortfarande ge ±1px
    // sub-pixel-avrundning i webbläsarens radbox (Chrome/Chromium,
    // headless), utan att `borderTopWidth`/`padding` skiljer (verifierat:
    // `border-top` var 0px på ALLA rader — det var INTE `divide-y`s
    // "inte-första-barn"-kant, hypotesen prövades och föll). Detta är
    // brus i textrendering, inte en datadriven höjdskillnad — samma
    // tolerans-princip som visual-sviten redan bär (playwright.config.ts
    // `maxDiffPixelRatio`).
    expect(Math.abs((okBox?.height ?? 0) - (atgardBox?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  test('AC #3 — raden bär personlistans radanatomi med anmälningsdata', async ({
    page,
    network,
  }) => {
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar');

    const lista = page.getByRole('list', { name: 'Anmälningar' });
    const carlsRad = lista.locator('li', { hasText: 'Carl Carlsson' });
    // Namnet som länk.
    await expect(carlsRad.getByRole('link', { name: 'Carl Carlsson' })).toBeVisible();
    // Undertext: "N dagar sedan · Eventnamn" (eller en finare relativ tidsform).
    await expect(carlsRad).toContainText('Resor i medvetandet 1');
    // Statusen bor sedan 2026-08-23 på RAD 2, efter identiteten, och
    // renderas VILLKORAT — inte längre som reserverad, osynlig kolumn på
    // rad 1. Marcus flyttade den dit sedan den reserverade platsen
    // (`visibility: hidden` behåller sin bredd) tillsammans med den nya
    // tidskolumnen klämde namnet till två pixlar vid 375 px. Reservationen
    // fyllde ingen funktion på rad 2: chevronen sitter i den YTTRE raden
    // och påverkas inte av vad rad 2 innehåller.
    await expect(carlsRad.getByText('Behöver kopplas')).toHaveCount(0);

    const bosRad = lista.locator('li', { hasText: 'Bo Bengtsson' });
    await expect(bosRad.getByText('Behöver kopplas')).toBeVisible();
  });

  test('reviewfynd 2026-08-22 — undertexten slår upp EVENTETS namn när anmälans egen eventNamn saknas', async ({
    page,
    network,
  }) => {
    // Reproducerar EXAKT Marcus mätning i staging (konvergensfasens
    // `?variant=b&lage=lista`, "Sentinel Bekraftelse"): eventId satt,
    // eventmatchning 'OK', men anmälans egen `eventNamn`-fritext null.
    // Före fixen tappade undertexten
    // eventnamnet tyst; nu slås eventets RIKTIGA namn upp via `eventId`.
    mockEvents(network, periodTestEvents());
    mockRegistrations(network, [
      reg({
        fornamn: 'Sentinel',
        efternamn: 'Bekraftelse',
        eventId: EVENT_KOMMANDE_ID,
        eventNamn: null,
        eventmatchning: 'OK',
        inskickad: '2026-09-14T10:00:00.000Z',
      }),
    ]);
    await page.goto('/mer/anmalningar');

    const rad = page.getByRole('list', { name: 'Anmälningar' }).locator('li');
    await expect(rad).toContainText('Vinterkurs Umeå');
    await expect(rad).not.toContainText('null');
  });

  test.describe('Periodfiltret (Marcus review 2026-08-22)', () => {
    function periodRader(): Row[] {
      return [
        reg({
          fornamn: 'Kim',
          efternamn: 'Kommande',
          eventId: EVENT_KOMMANDE_ID,
          eventNamn: null,
          eventmatchning: 'OK',
          inskickad: '2026-09-14T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Tage',
          efternamn: 'Tidigare',
          eventId: EVENT_TIDIGARE_ID,
          eventNamn: null,
          eventmatchning: 'OK',
          inskickad: '2026-08-01T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Ute',
          efternamn: 'Utanhelt',
          eventId: null,
          eventNamn: null,
          eventmatchning: 'Utan event',
          inskickad: '2026-08-05T10:00:00.000Z',
        }),
      ];
    }

    test('"Alla" (default) visar samtliga tre, ingen URL-parameter', async ({ page, network }) => {
      mockEvents(network, periodTestEvents());
      mockRegistrations(network, periodRader());
      await page.goto('/mer/anmalningar');

      expect(page.url()).not.toContain('period='); // clearOnDefault: ingen ?period= i URL:en
      await expect(page.getByText('3 anmälningar', { exact: true })).toBeVisible();
      await expect(page.getByText('Kim Kommande')).toBeVisible();
      await expect(page.getByText('Tage Tidigare')).toBeVisible();
      await expect(page.getByText('Ute Utanhelt')).toBeVisible();
    });

    test('"Kommande" filtrerar till event med startdatum efter FROZEN_NOW — Utan-event-raden försvinner också', async ({
      page,
      network,
    }) => {
      mockEvents(network, periodTestEvents());
      mockRegistrations(network, periodRader());
      await page.goto('/mer/anmalningar');

      // Perioden är sedan 2026-08-23 en DIMENSION i filterpanelen, inte en
      // pill-rad ovanför listan (Marcus: "Kör period som dimension i
      // panelen"). `Kommande event`/`Tidigare event` krävde 397,7 px mot 297
      // tillgängliga vid 375 px — radbrytning oavsett layoutläge. Som Select
      // tar dimensionen full radbredd, och etiketten `Period` bär det som
      // pillorden inte fick plats att säga.
      await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
      await expect(page.getByTestId('filter-panel')).toBeVisible();
      await page.getByTestId('filter-period').getByRole('button').click();
      await page.getByRole('option', { name: 'Kommande', exact: true }).click();
      await expect(page).toHaveURL(/[?&]period=upcoming/);
      // exact: true — periodväxlingens sr-only-annonsering ("Visar
      // anmälningar för kommande event. 1 anmälan.") innehåller SAMMA
      // delsträng som rubrikradens räknare; utan exact matchar Playwright
      // båda (strict mode violation).
      await expect(page.getByText('1 anmälan', { exact: true })).toBeVisible();
      await expect(page.getByText('Kim Kommande')).toBeVisible();
      await expect(page.getByText('Tage Tidigare')).toHaveCount(0);
      await expect(page.getByText('Ute Utanhelt')).toHaveCount(0);
    });

    test('"Tidigare" filtrerar till event med startdatum före FROZEN_NOW', async ({
      page,
      network,
    }) => {
      mockEvents(network, periodTestEvents());
      mockRegistrations(network, periodRader());
      await page.goto('/mer/anmalningar?period=past');

      await expect(page.getByText('1 anmälan', { exact: true })).toBeVisible();
      await expect(page.getByText('Tage Tidigare')).toBeVisible();
      await expect(page.getByText('Kim Kommande')).toHaveCount(0);
      await expect(page.getByText('Ute Utanhelt')).toHaveCount(0);
    });

    test('period + åtgärdskö-läget komponerar (AC #2: filtret bryter inget befintligt läge)', async ({
      page,
      network,
    }) => {
      mockEvents(network, periodTestEvents());
      mockRegistrations(network, [
        ...periodRader(),
        reg({
          fornamn: 'Kalle',
          efternamn: 'Kommandeavviker',
          eventId: EVENT_KOMMANDE_ID,
          eventNamn: null,
          eventmatchning: 'Avviker',
          inskickad: '2026-09-13T10:00:00.000Z',
        }),
      ]);
      await page.goto('/mer/anmalningar?visa=atgardskon&period=upcoming');

      // Åtgärdskön (behoverAtgard) + period=upcoming: Kalle (Avviker, kommande)
      // syns; Ute (Utan event, ej klassificerbar) och Tage (tidigare) inte.
      await expect(page.getByText('Kalle Kommandeavviker')).toBeVisible();
      await expect(page.getByText('Ute Utanhelt')).toHaveCount(0);
      await expect(page.getByText('Tage Tidigare')).toHaveCount(0);
      await expect(page.getByText('1 anmälan kunde inte kopplas till rätt event')).toBeVisible();
    });

    test('noll träffar för en period landar i ett begripligt tomt läge, inte en tom sida', async ({
      page,
      network,
    }) => {
      mockEvents(network, periodTestEvents());
      // Endast KOMMANDE-länkade rader — "Tidigare" ger då noll träffar.
      mockRegistrations(network, [
        reg({
          fornamn: 'Kim',
          efternamn: 'Kommande',
          eventId: EVENT_KOMMANDE_ID,
          eventNamn: null,
          eventmatchning: 'OK',
          inskickad: '2026-09-14T10:00:00.000Z',
        }),
      ]);
      await page.goto('/mer/anmalningar?period=past');

      await expect(page.getByText('Inga anmälningar för tidigare event.')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('Event-dimensionerna (Marcus review 2026-08-23)', () => {
    const EVENT_KURS_SKOVDE = 'recEventKursSko1';
    const EVENT_FORELASNING_GBG = 'recEventForelGbg';

    /** Två event som skiljer sig i BÅDA dimensionerna, så typ och ort kan
        särskiljas oberoende av varandra. Båda är kommande mot FROZEN_NOW. */
    function dimensionsEvents(): EventRow[] {
      return [
        event({
          id: EVENT_KURS_SKOVDE,
          eventNamn: 'Ledarkurs Skövde',
          typ: 'Kurs',
          ort: 'Skövde',
          startdatum: '2026-10-01',
        }),
        event({
          id: EVENT_FORELASNING_GBG,
          eventNamn: 'Höstföreläsning Göteborg',
          typ: 'Föreläsning',
          ort: 'Göteborg',
          startdatum: '2026-10-20',
        }),
      ];
    }

    /** En rad per event, plus en rad HELT utan event (den bokförda
        kant-klassen: bär inget event-attribut att matcha mot). */
    function dimensionsRader(): Row[] {
      return [
        reg({
          fornamn: 'Karin',
          efternamn: 'Kursdeltagare',
          eventId: EVENT_KURS_SKOVDE,
          eventNamn: null,
          eventmatchning: 'OK',
          inskickad: '2026-09-14T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Frida',
          efternamn: 'Forelasning',
          eventId: EVENT_FORELASNING_GBG,
          eventNamn: null,
          eventmatchning: 'OK',
          inskickad: '2026-09-13T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Ute',
          efternamn: 'Utanhelt',
          eventId: null,
          eventNamn: null,
          eventmatchning: 'Utan event',
          inskickad: '2026-09-12T10:00:00.000Z',
        }),
      ];
    }

    async function oppnaFiltret(page: Page): Promise<void> {
      await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
      await expect(page.getByTestId('filter-panel')).toBeVisible();
    }

    test('alternativen härleds ur RADERNAS event, i facit-ordning', async ({ page, network }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      await page.goto('/mer/anmalningar');
      await oppnaFiltret(page);

      // Typ/ort sv-alfabetiskt, nolläget alltid först. Endast värden som
      // radernas EGNA event bär — aldrig hela eventlistans rymd.
      await page.getByTestId('filter-typ').getByRole('button').click();
      await expect(page.getByRole('option')).toHaveText(['Alla typer', 'Föreläsning', 'Kurs']);
      await page.keyboard.press('Escape');

      await page.getByTestId('filter-ort').getByRole('button').click();
      await expect(page.getByRole('option')).toHaveText(['Alla orter', 'Göteborg', 'Skövde']);
      await page.keyboard.press('Escape');
    });

    test('filtret läser EVENTETS fält: ?ort väljer via länken, inte via anmälans egen ort', async ({
      page,
      network,
    }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      // Samtliga rader bär anmälans egen ort "Skövde" (reg-fixturens default);
      // bara EVENTETS ort skiljer dem åt. Väljer filtret Göteborg måste alltså
      // uppslaget ha gått via eventId — annars hade Frida fallit bort.
      await page.goto('/mer/anmalningar?ort=G%C3%B6teborg');

      await expect(page.getByText('Frida Forelasning')).toBeVisible();
      await expect(page.getByText('Karin Kursdeltagare')).toHaveCount(0);
      await expect(page.getByText('1 anmälan', { exact: true })).toBeVisible();
    });

    test('en rad UTAN uppslagbart event faller bort när ett dimensionsfilter är aktivt', async ({
      page,
      network,
    }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      await page.goto('/mer/anmalningar');

      // Ofiltrerat: Ute syns, märkt "Utan event" i undertexten.
      await expect(page.getByText('Ute Utanhelt')).toBeVisible();
      await expect(page.getByText('Utan event')).toBeVisible();

      // Med ett aktivt dimensionsfilter bär hon inget attribut att matcha mot
      // och faller bort — samma regel periodfiltret redan följer. Bortfallet
      // syns i panelfotens räknare (3 → 1), och hennes hemvist är åtgärdskön.
      await page.goto('/mer/anmalningar?typ=Kurs');
      await expect(page.getByText('Ute Utanhelt')).toHaveCount(0);
      await oppnaFiltret(page);
      await expect(page.getByText('Visar 1 av 3 anmälningar')).toBeVisible();

      await page.goto('/mer/anmalningar?visa=atgardskon');
      await expect(page.getByText('Ute Utanhelt')).toBeVisible();
    });

    test('filter-tomläget är SKILT från period-tomläget och bär Rensa — axe 0', async ({
      page,
      network,
    }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      // Kurs ∧ Göteborg finns inte: perioden HAR rader, filtren matchar noll.
      await page.goto('/mer/anmalningar?typ=Kurs&ort=G%C3%B6teborg');

      await expect(page.getByText('Inga anmälningar matchar filtren.')).toBeVisible();
      // Period-/lägestomlägets copy får INTE visas här.
      await expect(page.getByText('Inga anmälningar än.')).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('Rensa filter återställer till ren URL och flyttar fokus till tratten', async ({
      page,
      network,
    }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      await page.goto('/mer/anmalningar?typ=Kurs');

      const tratt = page.getByRole('button', { name: /^(Visa|Dölj) filter/ });
      // Aktivt filter syns även med STÄNGD panel (MOJ-affordanslärdomen).
      await expect(tratt).toHaveAccessibleName('Visa filter, 1 aktivt filterval');

      await oppnaFiltret(page);
      await page.getByRole('button', { name: 'Rensa filter' }).click();

      await expect(page).toHaveURL(/\/mer\/anmalningar$/);
      await expect(tratt).toBeFocused();
      await expect(page.getByText('Ute Utanhelt')).toBeVisible();
    });

    test('period + dimension komponerar, och axe är 0 med öppen panel', async ({
      page,
      network,
    }) => {
      mockEvents(network, dimensionsEvents());
      mockRegistrations(network, dimensionsRader());
      await page.goto('/mer/anmalningar?period=upcoming&typ=F%C3%B6rel%C3%A4sning');

      await expect(page.getByText('Frida Forelasning')).toBeVisible();
      await expect(page.getByText('Karin Kursdeltagare')).toHaveCount(0);
      await expect(page.getByText('Ute Utanhelt')).toHaveCount(0);

      await oppnaFiltret(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });

  /**
   * EVENT-DIMENSIONEN (Marcus 2026-08-23) — `Status` är utbytt mot `Event`,
   * och kontrollen är `EventValjare` via `FilterDimension.kontroll`.
   *
   * Sviten vaktar de tre egenskaper som skiljer den här axeln från typ/ort:
   * (1) den spänner BÅDA perioderna — väljarens `omfattning="alla"`, utan
   * vilken tidigare event vore ovalbara; (2) den matchar på record-ID, inte
   * namn, så två likanamnade event kan särskiljas; (3) dess nolläge är
   * väljarens egen "Alla event"-rad, inte en dropdown-post.
   */
  test.describe('Event-dimensionen (Marcus 2026-08-23)', () => {
    const EVENT_KOMMANDE = 'recEventDimKommande';
    const EVENT_TIDIGARE = 'recEventDimTidigare';
    /** Samma NAMN som det kommande, annan ort och period — ID-matchningen
        är det enda som kan skilja dem åt. */
    const EVENT_NAMNTVILLING = 'recEventDimTvilling';

    function eventDimEvents(): EventRow[] {
      return [
        event({
          id: EVENT_KOMMANDE,
          eventNamn: 'Resor i medvetandet 1',
          ort: 'Skövde',
          startdatum: '2026-10-05', // > FROZEN_NOW → kommande
        }),
        event({
          id: EVENT_TIDIGARE,
          eventNamn: 'Fjärrskådning',
          ort: 'Varberg',
          startdatum: '2026-08-05', // < FROZEN_NOW → tidigare
        }),
        event({
          id: EVENT_NAMNTVILLING,
          eventNamn: 'Resor i medvetandet 1',
          ort: 'Falköping',
          startdatum: '2026-07-01', // < FROZEN_NOW → tidigare
        }),
      ];
    }

    function eventDimRader(): Row[] {
      return [
        reg({
          fornamn: 'Kim',
          efternamn: 'Kommande',
          eventId: EVENT_KOMMANDE,
          eventNamn: null,
          inskickad: '2026-09-14T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Tage',
          efternamn: 'Tidigare',
          eventId: EVENT_TIDIGARE,
          eventNamn: null,
          inskickad: '2026-09-13T10:00:00.000Z',
        }),
        reg({
          fornamn: 'Tina',
          efternamn: 'Tvilling',
          eventId: EVENT_NAMNTVILLING,
          eventNamn: null,
          inskickad: '2026-09-12T10:00:00.000Z',
        }),
      ];
    }

    /** Egen kopia — systerblockets hjälpare är scopad till det blocket. */
    async function oppnaFiltret(page: Page): Promise<void> {
      await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
      await expect(page.getByTestId('filter-panel')).toBeVisible();
    }

    async function oppnaValjaren(page: Page): Promise<void> {
      await oppnaFiltret(page);
      await page.getByTestId('event-valjare-trigger').click();
      await expect(page.getByTestId('event-valjare-popover')).toBeVisible();
    }

    test('Status-dimensionen är BORTA och Event har tagit dess plats', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto('/mer/anmalningar');
      await oppnaFiltret(page);

      await expect(page.getByTestId('filter-status')).toHaveCount(0);
      await expect(page.getByTestId('filter-typ')).toBeVisible();
      await expect(page.getByTestId('filter-ort')).toBeVisible();
      await expect(page.getByTestId('filter-event')).toBeVisible();
      // Kontrollen är väljaren, inte en fjärde dropdown — och dess nolläge
      // står i triggern, så axeln säger VAR man är även stängd.
      await expect(page.getByTestId('event-valjare-trigger')).toHaveText(/Alla event/);
    });

    test('väljaren spänner BÅDA perioderna — tidigare event är valbara (omfattning="alla")', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto('/mer/anmalningar');
      await oppnaValjaren(page);

      const popover = page.getByTestId('event-valjare-popover');
      // Periodblocken ersätter månadsrubrikerna i denna omfattning: EN
      // riktningsvändning, uttryckligen namngiven. Kommande före tidigare.
      await expect(popover.getByRole('group')).toHaveCount(2);
      await expect(popover.getByRole('group').first()).toContainText('Kommande event');
      await expect(popover.getByRole('group').last()).toContainText('Tidigare event');

      // Det TIDIGARE eventet finns som valbar rad — hela poängen med propen.
      await expect(popover.getByRole('option', { name: /Fjärrskådning/ })).toBeVisible();
    });

    test('val av event filtrerar listan och skriver ?event=<record-id> i URL:en', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto('/mer/anmalningar');
      await expect(page.getByText('Kim Kommande')).toBeVisible();
      await oppnaValjaren(page);

      await page
        .getByTestId('event-valjare-popover')
        .getByRole('option', { name: /Fjärrskådning/ })
        .click();

      await expect(page).toHaveURL(new RegExp(`event=${EVENT_TIDIGARE}`));
      await expect(page.getByText('Tage Tidigare')).toBeVisible();
      await expect(page.getByText('Kim Kommande')).toHaveCount(0);
      await expect(page.getByText('1 anmälan', { exact: true })).toBeVisible();
    });

    test('filtret matchar på RECORD-ID, inte namn — två likanamnade event skiljs åt', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      // Kim och Tina pekar på event med IDENTISKT namn ("Resor i medvetandet
      // 1"). Ett namnfilter hade tagit båda; ID-filtret tar exakt en.
      await page.goto(`/mer/anmalningar?event=${EVENT_NAMNTVILLING}`);

      await expect(page.getByText('Tina Tvilling')).toBeVisible();
      await expect(page.getByText('Kim Kommande')).toHaveCount(0);
      await expect(page.getByText('1 anmälan', { exact: true })).toBeVisible();
    });

    test('nolläget "Alla event" nollställer axeln och tar bort parametern', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto(`/mer/anmalningar?event=${EVENT_KOMMANDE}`);

      const tratt = page.getByRole('button', { name: /^(Visa|Dölj) filter/ });
      await expect(tratt).toHaveAccessibleName('Visa filter, 1 aktivt filterval');
      await oppnaValjaren(page);

      await page
        .getByTestId('event-valjare-popover')
        .getByRole('option', { name: 'Alla event' })
        .click();

      await expect(page).toHaveURL(/\/mer\/anmalningar$/);
      await expect(page.getByText('Tage Tidigare')).toBeVisible();
      // Panelen står kvar ÖPPEN (därav "Dölj"); poängen är att räknar-ledet
      // ", N aktiva filterval" är borta — axeln är nollställd, inte bara tom.
      await expect(tratt).toHaveAccessibleName('Dölj filter');
    });

    test('Rensa filter nollställer ÄVEN event-axeln', async ({ page, network }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto(`/mer/anmalningar?typ=Kurs&event=${EVENT_KOMMANDE}`);
      await oppnaFiltret(page);
      await expect(page.getByText('Visar 1 av 3 anmälningar')).toBeVisible();

      await page.getByRole('button', { name: 'Rensa filter' }).click();
      await expect(page).toHaveURL(/\/mer\/anmalningar$/);
      await expect(page.getByText('Kim Kommande')).toBeVisible();
      await expect(page.getByText('Tage Tidigare')).toBeVisible();
    });

    test('axe 0 med väljaren ÖPPEN i filterpanelen', async ({ page, network }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      await page.goto('/mer/anmalningar');
      await oppnaValjaren(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('filter-tomläget nås via event-axeln och Rensa är återvägen — axe 0', async ({
      page,
      network,
    }) => {
      mockEvents(network, eventDimEvents());
      mockRegistrations(network, eventDimRader());
      // Kommande-perioden HAR rader, men det valda eventet är ett tidigare —
      // perioden är alltså inte tom, filtren matchar noll.
      await page.goto(`/mer/anmalningar?period=upcoming&event=${EVENT_TIDIGARE}`);

      await expect(page.getByText('Inga anmälningar matchar filtren.')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test('AC #5 — statusen bär text/ikon, aldrig färg ensam', async ({ page, network }) => {
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar?visa=atgardskon');

    // Två synliga "Behöver kopplas"-badgar (Bo + Eva) — TEXT bär betydelsen,
    // inte enbart en färgplatta.
    await expect(page.getByText('Behöver kopplas')).toHaveCount(2);
  });
});

/**
 * Review-grinden runda 1 (TASK-416.4, PR #2415, Marcus mandat) — TASK-416.19.
 *
 * `headerBlock`/`filterRadBlock` monterades tidigare i TRE separata `return`-
 * grenar där laddat-grenen skjöt in `<p role=status>Anmälningarna
 * laddade.</p>` FÖRE `headerBlock` (barn-index 0) medan isPending/isError
 * hade `headerBlock` som index 0. Reacts keyless reconciliation matchar barn
 * POSITIONELLT — ett index-mismatch mellan grenar tvingar fram en FULL
 * remount av `<FilterRad>` (och allt i den: panelens öppna/stängda state,
 * `EventValjare`s popover-state, fokus, inskriven text). Fixat genom att göra
 * HELA `AnmalningarSida` till ETT returträd med fasta syskon-positioner
 * (samma form som `Intresserade.tsx`, TASK-416.8) — se komponentens egen
 * docblock för den fulla motiveringen.
 *
 * ── TVÅ MÄTTA GRÄNSER SOM STYRDE TESTDESIGNEN NEDAN (bokförda i
 * slutrapporten, INTE testbrister) ──────────────────────────────────────
 *
 * (1) `FilterRad.tsx` (~rad 298–312) visar ENBART dekorativa, ofokuserbara
 * skelettblock för ALLA dimensioner — `EventValjare`s sökfält monteras INTE
 * — så länge FilterRads egna `isPending`-prop är sann, och den propen är
 * BUNDEN till exakt samma boolean som väljer AnmalningarSidas render-gren.
 * De två flippar alltså ATOMISKT tillsammans: ett "fortfarande isPending,
 * men sökfältet är fokuserbart"-ögonblick kan strukturellt inte existera.
 *
 * (2) Komponentens EGEN, redan befintliga a11y-effekt (se `announceRef`/
 * `headingRef.current?.focus()` ovan, "Fokus -> <h1> ... när data anlänt (en
 * gång per laddning)") flyttar OVILLKORLIGT fokus till `<h1>` FÖRSTA gången
 * `registrations` blir sant under komponentens livstid — oavsett om den
 * kommer från isPending ELLER isError. Mätt (2026-09-06, headless
 * Playwright): en öppen `EventValjare`-popover med inskriven text stängs då
 * av sitt EGET, KORREKTA blur-beteende (WAI-ARIA combobox-mönstret: stäng
 * popovern när fokus lämnar den) — INTE av en remount. `get-events`
 * anropades noll gånger extra under övergången (mätt via nätverksräknare),
 * så det är inte heller en events-refetch som stör. Detta gör bokstavlig
 * "fokus i sökfältet överlever" OMÖJLIG att bevisa för EN FÖRSTA lyckad
 * laddning, oavsett om header/FilterRad remonteras eller ej — samma
 * beteende skulle synas även i en HYPOTETISKT perfekt fixad komponent.
 *
 * DÄRFÖR: båda testen nedan bevisar den FAKTISKA regressionen (header/
 * FilterRad byter INTE DOM-nod-identitet mellan isPending/isError och
 * laddat) med en mekanism som är IMMUN mot ovanstående två gränser — en
 * `data-`-markör satt via `page.evaluate()` på `filter-panel`-noden FÖRE
 * övergången, kontrollerad att sitta kvar på SAMMA nod (inte en ny, omärkt
 * nod) EFTER — plus att panelens ÖPPNA state (en `useState` intern i
 * `FilterRad`, som skulle nollställas till `defaultOppen=false` vid en
 * remount) håller genom övergången. Ingen av delarna rör fokus, så ingen av
 * gränserna ovan stör mätningen.
 *
 * TVÅSIDIGT BEVISAT (Final Summary bär de exakta felmeddelandena): körda mot
 * den GAMLA tre-`return`-strukturen (fixen i `AnmalningarSida.tsx` tillfälligt
 * borttagen, testfilen orörd) föll BÅDA testen — markören var BORTA och
 * panelen STÄNGD efter övergången i båda fallen (ny, omonterad `<FilterRad>`
 * med `defaultOppen=false`). Körda mot fixen är båda gröna.
 */
test.describe('Regressionsvakt: fasta syskon-positioner håller FilterRad odemonterad (TASK-416.19)', () => {
  /** DOM-nod-identitetsmarkör — immun mot fokus-/blur-bikonfunder (se
      docblocket ovan): en remount ersätter noden och tar markören med sig,
      en vanlig re-render av SAMMA nod behåller den. */
  const REMOUNT_MARKOR = 'data-remount-marker-416-19';

  async function markeraFilterPanel(page: Page): Promise<void> {
    await page.evaluate((attr) => {
      const el = document.querySelector('[data-testid="filter-panel"]');
      el?.setAttribute(attr, 'markerad-fore-overgang');
    }, REMOUNT_MARKOR);
  }

  function markorFinnsKvar(page: Page) {
    return page.locator(`[data-testid="filter-panel"][${REMOUNT_MARKOR}="markerad-fore-overgang"]`);
  }

  /** Håller `get-registrations` öppet tills testet kallar `release()` —
      gör isPending-fönstret deterministiskt (samma mönster som
      `mer-intresserade.acceptance.test.ts` `mockLeads({ manualRelease })`). */
  function mockRegistrationsManuell(network: NetworkFixture, rows: Row[]): () => void {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    network.use(
      http.get(EF('get-registrations'), async () => {
        await gate;
        return json({ registrations: rows });
      }),
    );
    return release;
  }

  /** FLAGGSTYRD (inte räkneverk): 404 tills testet kallar den returnerade
      funktionen, DÄREFTER lyckas varje anrop — modellerar en riktig
      isError → laddat-övergång via TanStack Querys `refetchOnWindowFocus`
      (samma mekanism och motivering som
      `mer-intresserade.acceptance.test.ts` `mockLeadsFelarTillsFlaggat`). */
  function mockRegistrationsFelarTillsFlaggat(network: NetworkFixture, rows: Row[]): () => void {
    let lyckas = false;
    network.use(
      http.get(EF('get-registrations'), () =>
        lyckas ? json({ registrations: rows }) : json({ error: 'x' }, 404),
      ),
    );
    return () => {
      lyckas = true;
    };
  }

  test('FilterRads panel-nod och öppna state överlever isPending → laddat (ingen remount)', async ({
    page,
    network,
  }) => {
    const release = mockRegistrationsManuell(network, blandadeRader());
    await page.goto('/mer/anmalningar');

    // Genuint isPending: skeleton-antalsraden och FilterRads egen
    // skeleton-grid (ingen sökbar Event-kontroll monterad än, se docblocket
    // ovan, gräns 1).
    await expect(page.getByText('Laddar anmälningarna…')).toBeVisible();

    await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
    await expect(page.getByTestId('filter-panel')).toBeVisible();
    await markeraFilterPanel(page);
    await expect(markorFinnsKvar(page)).toHaveCount(1);

    release();
    await expect(page.getByRole('heading', { level: 1, name: 'Anmälningar' })).toBeVisible();
    await expect(page.getByText('3 anmälningar', { exact: true })).toBeVisible();

    // SAMMA panel-nod (markören sitter kvar) OCH FORTFARANDE ÖPPEN — inte en
    // ny, ostängd `<FilterRad>` (defaultOppen=false vid en remount).
    await expect(markorFinnsKvar(page)).toHaveCount(1);
    await expect(page.getByTestId('filter-panel')).toBeVisible();
  });

  test('FilterRads panel-nod och öppna state överlever isError → laddat (ingen remount)', async ({
    page,
    network,
  }) => {
    const tillatLyckasHadanefter = mockRegistrationsFelarTillsFlaggat(network, [
      reg({ fornamn: 'Carl', efternamn: 'Carlsson', inskickad: '2026-06-22T10:00:00.000Z' }),
    ]);
    await page.goto('/mer/anmalningar');

    await expect(page.getByRole('alert')).toBeVisible();

    // FilterRads `isPending`-prop är FALSK i fel-läget (docblocket ovan,
    // gräns 1) — panelen visar REDAN riktiga kontroller, Event-väljaren
    // inkluderad, så sökfältet KAN nås och skrivas i (bevisas nedan) — men
    // se gräns 2 för varför dess FOKUS inte kan förväntas överleva.
    await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
    await expect(page.getByTestId('filter-panel')).toBeVisible();
    await page.getByTestId('event-valjare-trigger').click();
    await expect(page.getByTestId('event-valjare-popover')).toBeVisible();

    const sokfalt = page.getByRole('searchbox', { name: 'Sök event eller ort' });
    await sokfalt.fill('Sköv');
    await expect(sokfalt).toBeFocused();
    await expect(sokfalt).toHaveValue('Sköv');

    await markeraFilterPanel(page);
    await expect(markorFinnsKvar(page)).toHaveCount(1);

    tillatLyckasHadanefter();
    // Utlöser TanStack Querys refetchOnWindowFocus — den enda realistiska
    // vägen isError → laddat i denna komponent (ingen "försök igen"-knapp).
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));

    await expect(page.getByText('Carl Carlsson')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    // SAMMA panel-nod (markören sitter kvar) OCH FORTFARANDE ÖPPEN genom
    // övergången — den strukturella bevisföringen för AC #2, immun mot
    // gräns 2:s (korrekta, avsiktliga) fokus→h1-steal och EventValjares
    // egen blur-stängning av sin popover.
    await expect(markorFinnsKvar(page)).toHaveCount(1);
    await expect(page.getByTestId('filter-panel')).toBeVisible();
  });

  /**
   * Review-runda 2 (TASK-416.19, PR #2423, Marcus mandat) — NY a11y-
   * regression införd av runda 1:s fix, inte en pre-existerande bugg.
   *
   * `filterAnnonsering` (sr-only, `aria-live="polite"`, INGET `role`) sitter
   * sedan runda 1 på en FAST syskon-position i alla tre render-lägen. FÖRE
   * runda 1 existerade den noden ENDAST i laddat-grenen, så innehållet var
   * strukturellt omöjligt att sätta förrän data landat. EFTER runda 1, men
   * FÖRE denna rättning, vaktade de två effekter som sätter
   * `periodAnnouncement` (se effekternas egna kommentarer ovan i
   * `AnmalningarSida.tsx`) bara `isPending` — och `FilterRad` självt får
   * `isPending={isPending}` (aldrig `dataOkand`, en MEDVETEN, oförändrad
   * design från TASK-416.4 runda 1), så Period-`Select`n (statiska
   * alternativ, alltid monterad) är fullt interaktiv redan i isError. Ett
   * periodbyte MEDAN felbeskedet visades satte då `periodAnnouncement` till
   * en FALSK räknartext ("Visar anmälningar för kommande event. 0
   * anmälningar.") i en sr-only-region bredvid `MessageBox`s
   * `role="alert"` — två motstridiga besked till en skärmläsare, och en
   * osann siffra (källan gav upp, den räknade inte till noll). Rättat genom
   * att vakta båda effekterna med `dataOkand` (isPending ELLER isError) i
   * stället för bara `isPending`.
   *
   * TVÅSIDIGT BEVISAT: kört mot commit `4dd301bb` (runda 1:s head, INNAN
   * denna rättning) föll detta test — regionen bar den falska räknartexten
   * efter periodbytet. Kört mot rättningen är det grönt.
   *
   * 5xx går båda retry-lagren (`fetchWithRetry` + QueryClients `retry: 3`,
   * ~7–8 s backoff, se `acceptance-bas.ts` § TIDEN HÖR TILL KONTRAKTET) —
   * samma etablerade `timeout: 20_000` som `mer-aktivitetshistorik.
   * acceptance.test.ts` använder för sitt 500-fel.
   */
  test('period-annonseringen förblir tyst under isError (dataOkand-vakt, review-runda 2)', async ({
    page,
    network,
  }) => {
    mockRegistrations(network, [], { status: 500 });
    await page.goto('/mer/anmalningar');

    const felbesked = page.getByRole('alert').filter({ hasText: 'Kunde inte hämta anmälningarna' });
    await expect(felbesked).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /^(Visa|Dölj) filter/ }).click();
    await expect(page.getByTestId('filter-panel')).toBeVisible();
    await page.getByTestId('filter-period').getByRole('button').click();
    await page.getByRole('option', { name: 'Kommande', exact: true }).click();

    // Live-regionen ska förbli TOM genom hela fel-fönstret — ingen
    // räknartext, sann eller falsk, ska annonseras medan källan har gett
    // upp. `page.getByText` matchar hela sidan, inte bara en scopad region,
    // så frånvaron bevisas oavsett var texten hade hamnat.
    await expect(page.getByText(/^Visar anmälningar för/)).toHaveCount(0);
    await expect(page.getByText(/anmälningar\.$/)).toHaveCount(0);
    await expect(felbesked).toBeVisible();
  });
});

test.describe('Radanatomin vid MOBIL bredd — namnkolumnen får inte klämmas ihjäl', () => {
  /**
   * REGRESSIONSVAKT, född ur en verklig bugg 2026-08-23.
   *
   * Tiden flyttades ut till en egen högerställd kolumn (Marcus: "'För 3
   * dagar sedan' sitter centrerat högerställt ... EXAKT så vill jag att
   * anmälningslistan också ska ha"). På rader som KRÄVER ÅTGÄRD satt då
   * fyra element på samma rad: avatar, namn, tid och en statusbadge med
   * RESERVERAD plats. Badgen var `invisible` — och `visibility: hidden`
   * BEHÅLLER sin plats. Vid 375 px mätte raden 309 px och delarna summerade
   * exakt: avatar 36 + namn 2 + tid 69 + status 136 + chevron 18 + fyra gap
   * à 12. Namnet trunkerades till TVÅ pixlar.
   *
   * Sviten fångade det inte, eftersom varje annat test kör i standard-
   * vyporten. Därav detta test: samma rad, MOBIL bredd, och ett golv för
   * namnkolumnen. Fixen var att flytta statusen till rad 2.
   *
   * Golvet 80 px är inte en smakgräns utan en läsbarhetsgräns: under det
   * ryms inte ens ett kort förnamn före ellipsen.
   */
  test('namnet har läsbar bredd vid 375 px även på en åtgärdsrad', async ({ page, network }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    mockRegistrations(network, blandadeRader());
    await page.goto('/mer/anmalningar?visa=atgardskon');

    // Åtgärdsraden är den som bär statusbadgen — det värsta fallet.
    const badge = page.getByText('Behöver kopplas').first();
    await expect(badge).toBeVisible();

    const rad = page.locator('li').filter({ has: badge }).first();
    const namn = rad.getByRole('button').first();
    await expect(namn).toBeVisible();

    const namnRuta = await namn.boundingBox();
    expect(namnRuta).not.toBeNull();
    expect(namnRuta?.width ?? 0).toBeGreaterThan(80);

    // Och raden ska fortfarande vara EN rad hög per textrad — inte svälla
    // för att statusen flyttat ner. Två textrader + padding.
    const radRuta = await rad.boundingBox();
    expect(radRuta?.height ?? 0).toBeLessThan(90);
  });
});
