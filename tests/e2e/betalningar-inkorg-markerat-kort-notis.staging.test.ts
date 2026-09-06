import { expect, type Page, type Route, test } from '../support/test-bas';
import { mockValjarLista, valjarRad } from './helpers/valjar-lista';

/**
 * TASK-411 — Marcus prod-granskning 2026-09-06 (S121 resume 4): inkorgens
 * markerade kort ska bära SAMMA gröna platta som bekräftelsestegets
 * (`VariantC.tsx`) och eventdetaljernas (`Deltagare.tsx`) markerade kort —
 * hela `--mm-success-bg`, ingen egen svagare tint. Kollisionen det löste
 * 2026-09-01 (grön notisruta osynlig mot grön platta) löses nu i stället
 * hos success-notisen: vit botten, grön kontur (oförändrad), grön ikon.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RUNDA 2 — GRANSKNINGSFYND, Marcus: "Ja, begränsa till inkorgen."
 * ═══════════════════════════════════════════════════════════════════════════
 * Runda 1 satte notisens vita botten OVILLKORAT på `intent === 'success'` i
 * `RegistreraForm.tsx` — ett formulär DELAT med `RegistreraYta.tsx`s tre
 * andra ytor (`AnmalansBetalningar.tsx`, `PanelBetalningar.tsx`,
 * `PersonBetalningar.tsx`), där notisen INTE ligger i ett grönt markerat
 * kort. Den vita botten läckte dit och tystade deras gröna success-signal
 * utan skäl. Fixen: en explicit `notisBakgrund` (default `'standard'`) som
 * ENDAST `BetalningsInkorg.tsx`s öppna kort sätter till `'vit'`.
 *
 * DENNA SVIT PRÖVAR NU BÅDA SIDORNA: inkorgens kort (AC #2, oförändrat) OCH
 * personkortet (nytt, `PersonBetalningar.tsx` räcker som representant för de
 * tre andra ytorna — samma delade `RegistreraForm`, samma `notisBakgrund`-
 * default) som ett NEGATIVT bevis: success-notisen där ska ha KVAR sin gröna
 * `--mm-success-bg`, aldrig vit. Ikonen är grön i BÅDA fallen (universellt
 * buggfel-fix, inte scopat).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR STAGING-E2E OCH INTE ACCEPTANCE-KLASSEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Samma strukturella hinder som `betalningar-inkorg-utskicksflode.staging.
 * test.ts` och `betalningar-inkorg-markera-lage.staging.test.ts` redan bokför
 * i sina egna filhuvuden: `VITE_FEATURE_BETALNINGAR` är explicit `'av'` för
 * HELA den delade acceptance/visual/webblasarbeteende-fixturvärlden
 * (`playwright.config.ts`), så `/mer/betalningar` kan strukturellt inte
 * renderas där. Staging bär `VITE_FEATURE_BETALNINGAR=pa` (`.env.staging`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SVITEN BEVISAR
 * ═══════════════════════════════════════════════════════════════════════════
 * AC #1  Det öppna kortets bakgrund ÄR `--mm-success-bg` (#f0fdf4), samma
 *        hex som `VariantC.tsx`s och `Deltagare.tsx`s markerade kort; kanten
 *        är oförändrad `--mm-success` (#606b57).
 * AC #2  Success-notisen i kortet har VIT botten (`--mm-surface`, #ffffff),
 *        en HEL grön kontur (`border-color` identisk på alla fyra sidor,
 *        `--mm-messagebox-success-border` = `--mm-success`), och ikonen bär
 *        samma gröna (`--mm-messagebox-success-text` = `--mm-success`).
 *
 * Datorräknad WCAG 1.4.11-kontroll ingår INTE i denna svit (räknad en gång,
 * källmärkt, i `components.css` § "Markerat betalningskort" BESLUT 2) —
 * sviten mäter FÄRGERNA sviten påstår, inte kontrastformeln.
 */

type Json = Record<string, unknown>;

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';

const EVENT_ID = 'rec411NotisEvent1';
const ANMALAN_ID = 'rec411NotisAnmalan';

/** `saknas === gallandePris` och `summaInbetalt: 0` ⇒ `forifyllt` = 500 =
    hela beloppet ⇒ `beloppsutfall` ger tonen `tacker` (success) DIREKT vid
    mount, ingen tangenttryckning eller fördröjning (`RegistreraForm.tsx`
    § "PRISETS EGEN FELREGEL" — `visat` initieras till `forifyllt`, `utfall`
    beräknas synkront av det). */
function oppenBetalning(): Json {
  return {
    anmalanRecordId: ANMALAN_ID,
    personNamn: 'Notis Testsson',
    personEpost: null,
    personTelefon: null,
    eventId: EVENT_ID,
    eventNamn: 'Task411-kurs',
    eventStartdatum: '2099-06-01',
    eventTyp: 'Utbildning',
    anmalanStatus: 'Bekräftad (mail skickat)',
    saknas: 500,
    gallandePris: 500,
    anmalningsavgift: null,
    summaInbetalt: 0,
    summaInbetaltSpegel: 0,
    spegelIFas: true,
    deadlineSlutbetalning: null,
    kvittonAttSkicka: 0,
  };
}

/** Minimal mock — bara det denna svit faktiskt behöver: eventväljaren och
    listan. Ingen registrering sker, så `registrera-inbetalning`/
    `koa-kvitton`/`hamta-jobbstatus` behöver aldrig mockas (samma
    `useJobbstatus`-villkor som utskicksflödessvitens filhuvud bokför:
    `aktiv: jobbId !== undefined`, ingen sändning ⇒ inget anrop). */
async function mocka(page: Page): Promise<void> {
  await mockValjarLista(page, [
    valjarRad({ id: EVENT_ID, namn: 'Task411-kurs', startdatum: '2099-06-01' }),
  ]);

  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: [oppenBetalning()], forfallna: 0 }),
    });
  });
}

const SUCCESS_GRON = 'rgb(96, 107, 87)'; // #606b57 — --mm-success
const SUCCESS_BG = 'rgb(240, 253, 244)'; // #f0fdf4 — --mm-success-bg
const VIT = 'rgb(255, 255, 255)'; // #ffffff — --mm-surface

test.describe('TASK-411 — markerat kort och success-notisen bär rätt grönt', () => {
  test('kortet bär hela --mm-success-bg; notisen får vit botten, grön kontur och grön ikon', async ({
    page,
  }) => {
    await mocka(page);
    await page.goto('/mer/betalningar');

    await page.getByRole('button', { name: 'Registrera betalning' }).click();
    const formulär = page.getByRole('form', { name: /Registrera betalning för/ });
    await expect(formulär).toBeVisible();

    // AC #1 — KORTETS PLATTA: samma hela --mm-success-bg som bekräftelse-
    // stegets och eventdetaljernas markerade kort, ingen egen svagare tint.
    const kort = page.locator('li').filter({ has: formulär });
    await expect(kort).toHaveCSS('background-color', SUCCESS_BG);
    await expect(kort).toHaveCSS('border-top-color', SUCCESS_GRON);
    await expect(kort).toHaveCSS('border-left-color', SUCCESS_GRON);

    // AC #2 — NOTISEN: `role="status"` finns TVÅ gånger i formuläret (den
    // alltid-monterade sr-only-annonseraren OCH den synliga MessageBox-
    // rutan) — filtrera på ikonens `svg`, som bara den synliga rutan bär.
    const notis = formulär.getByRole('status').filter({ has: page.locator('svg') });
    await expect(notis).toBeVisible();
    await expect(notis).toHaveText(/täcker|Inget kvar att betala/);

    // Vit botten (Marcus 2026-09-06: "success-notisen får vit bakgrund").
    await expect(notis).toHaveCSS('background-color', VIT);

    // HEL grön kontur — identisk färg på alla fyra sidor. `border-l-4`
    // (primitiven) + `border-y border-r` (konsumenten, `RegistreraForm.tsx`)
    // ger fyra bredder; färgen kommer från EN utility och ska därför vara
    // samma på samtliga (Marcus: "konturen behåller vi").
    await expect(notis).toHaveCSS('border-top-color', SUCCESS_GRON);
    await expect(notis).toHaveCSS('border-right-color', SUCCESS_GRON);
    await expect(notis).toHaveCSS('border-bottom-color', SUCCESS_GRON);
    await expect(notis).toHaveCSS('border-left-color', SUCCESS_GRON);

    // Grön ikon, samma grönt som konturen (Marcus: "bocken sätter vi samma
    // gröna färg på som konturen").
    const ikon = notis.locator('svg').first();
    await expect(ikon).toHaveCSS('color', SUCCESS_GRON);
  });
});

/** Person-ID:t behöver ingen egen betydelse — bara stabilt inom testfilen. */
const PERSON_ID = 'rec411NotisPerson1';
const GET_PERSON = /\/functions\/v1\/get-person\?/;
const HAMTA_INBETALNINGAR = '**/functions/v1/hamta-inbetalningar*';

/** Minimal, giltig persondetalj — samma fält-golv som
    `persondetalj-betalningar-fellage.staging.test.ts` etablerade (bara det
    `PersonBetalningar.tsx` faktiskt läser behöver meningsfullt innehåll).
    `motiveringar[0].id` MÅSTE matcha den öppna betalningens
    `anmalanRecordId` — `personOversikt` (`panel-harledningar.ts`) filtrerar
    raderna på den unionen, annars renderas ingen rad och inget formulär. */
function personDetail(): Json {
  return {
    id: PERSON_ID,
    namn: 'Notis Personsson',
    fornamn: 'Notis',
    efternamn: 'Personsson',
    email: 'notis.personsson@example.test',
    telefon: null,
    ort: [],
    manuellFlagga: null,
    aiFlagga: null,
    anteckningar: null,
    antalAnmalningar: 0,
    antalDeltaganden: 0,
    erfarenhetsniva: null,
    erfarenhetsbadge: null,
    senasteInteraktion: null,
    senasteInteraktionDatum: null,
    dagarSedanSenaste: null,
    harAktivAnmalan: null,
    ejGodkandMail: false,
    radSkapad: null,
    anmalningIds: [],
    deltagandeIds: [],
    aterkommande: null,
    nastaEvent: null,
    antalGenomfordaEvent: 0,
    senasteDeltagandeDatum: null,
    antalHamtningar: 0,
    allaHamtningar: [],
    motivering: [],
    hamtningar: [],
    motiveringar: [
      {
        id: ANMALAN_ID,
        motivering: null,
        event: 'Task411-kurs',
        datum: null,
        eventDatum: '2099-06-01',
        ort: null,
        eventId: EVENT_ID,
      },
    ],
    flagga: null,
    inbjudenCommunity: false,
    skapatKontoCommunity: false,
    historik: [],
  };
}

test.describe('TASK-411 RUNDA 2 — personkortet behåller sin gröna success-botten', () => {
  test('samma delade formulär, INGEN notisBakgrund-prop → notisen förblir grön, ikonen är grön ändå', async ({
    page,
  }) => {
    await page.route(GET_PERSON, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ person: personDetail() }),
      });
    });
    await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ betalningar: [oppenBetalning()], forfallna: 0 }),
      });
    });
    // Tom, lyckad — sektionens "Senaste inbetalningar" är inte vad detta
    // test prövar, men anropet MÅSTE mockas (samma disciplin som
    // `persondetalj-betalningar-fellage.staging.test.ts`): en obesvarad
    // route hade antingen läckt mot verklig staging eller fastnat i ett
    // laddningsläge som aldrig visar formuläret.
    await page.route(HAMTA_INBETALNINGAR, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inbetalningar: [],
          kvitton: [],
          jobbfel: [],
          spegel: { summaPostgres: 0, summaBasen: 0, iFas: true },
        }),
      });
    });

    await page.goto(`/personer/${PERSON_ID}`);

    // `etikett="Registrera inbetalning"` — `PersonBetalningar.tsx`s egen
    // `RegistreraYta`-etikett, skild från inkorgens "Registrera betalning".
    await page.getByRole('button', { name: 'Registrera inbetalning' }).click();
    const formulär = page.getByRole('form', { name: /Registrera betalning för/ });
    await expect(formulär).toBeVisible();

    const notis = formulär.getByRole('status').filter({ has: page.locator('svg') });
    await expect(notis).toBeVisible();
    await expect(notis).toHaveText(/täcker|Inget kvar att betala/);

    // NEGATIVT BEVIS (runda 2): INGEN `notisBakgrund`-prop skickas härifrån
    // (`PersonBetalningar.tsx` → `RegistreraYta.tsx` → `RegistreraForm.tsx`
    // utan den), så notisen behåller MessageBox-primitivens EGEN gröna
    // success-botten — INTE vit, till skillnad från inkorgens kort ovan.
    await expect(notis).toHaveCSS('background-color', SUCCESS_BG);

    // Ikonen är grön ÄNDÄ — det var ett buggfel (ärvde annars kroppens
    // neutrala textfärg), oberoende av `notisBakgrund`, se
    // `RegistreraForm.tsx`s docblock för `Ikon`.
    const ikon = notis.locator('svg').first();
    await expect(ikon).toHaveCSS('color', SUCCESS_GRON);
  });
});
