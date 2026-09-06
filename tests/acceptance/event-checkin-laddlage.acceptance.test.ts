import AxeBuilder from '@axe-core/playwright';
import type { NetworkFixture } from '@msw/playwright';
import { http } from 'msw';
import type { z } from 'zod';
import type { AttendanceSchema, RegistrationSchema } from '../../src/domain/schemas';
import {
  EVENT_DETAIL_RESPONSE,
  FROZEN_NOW,
  VISUAL_EVENT_ID,
} from '../support/fixturvarld/fixture-data';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, test } from './acceptance-bas';

/**
 * TASK-416.1 — Check-in: sidkromet renderat i alla tillstånd, eventnamnet
 * skarpt ur `events.list` (PRD TASK-416 § regeln).
 *
 * BEVISAR TVÅ SAKER, samma bevisform som `hem-laddlage.acceptance.test.ts`
 * (task-4.5-mönstret: håll-bar mock → boundingBox UNDER laddning → släpp →
 * identisk boundingBox EFTER data, `toEqual`):
 *
 *   1. AC #1 — sidkromet (SidRam, h1, eventnamn/datum, framstegskort,
 *      sökfält) är MONTERAT medan `get-attendance`/`get-registrations`/
 *      `get-event` fortfarande är parkerade obesvarade. ENDAST listkroppen
 *      (`dorrlista-skelettrad` → riktiga `<li>`-rader) växlar.
 *   2. AC #2 — eventnamnet står SKARPT (inte skelett) trots att `get-event`
 *      för DENNA sida hålls parkerat: `useDorrEvent`s `placeholderData`
 *      seedar ur `events.list`, som redan är varm (ADR-112 startvärmning —
 *      "VARJE autentiserad sidladdning i fixturvärlden är en kall start",
 *      se `hem-laddlage.acceptance.test.ts` filhuvud, så warmupen kör alltid
 *      i denna klass och lämnar `events.list` fylld INNAN check-in-routen
 *      ens monteras).
 *
 * VARFÖR `VISUAL_EVENT_ID` ("Utbildning Skövde") och inte ett eget
 * påhittat ID: eventet måste redan finnas i `EVENTS_RESPONSE.events` (den
 * DEFAULT `get-events`-handlern, oöverskuggad här) för att
 * `placeholderData`-seedningen ska ha något att hitta — samma
 * "redan i listan"-krav som `EventDetail.tsx`s egen ADR-078-mekanik.
 *
 * `get-registrations` GRENAS PÅ `eventId`-parametern i stället för att hållas
 * ovillkorat: startvärmningens EGNA `registrations`-post (`queryKeys.
 * registrations.all`, INGET `eventId`) går via SAMMA EF-mönster. Ett
 * ovillkorat håll hade parkerat warmupen självt och tvingat fram dess
 * `STALL_THRESHOLD_MS`-fallback (3 s, `startvarmningen.ts`) i varje körning
 * — en onödig, mätbar förlångsamning av testet, inte en bugg i appen.
 * `get-attendance` värms ALDRIG (kortets egen premiss) och `get-event` för
 * just detta event anropas bara EN gång i detta scenario, så båda hålls
 * ovillkorat.
 *
 * TREDJE TESTET (review-runda 1, FYND 2) — "eventet självt parkerat": ett
 * HELT ANNAT event-ID, medvetet FRÅNVARANDE ur `EVENTS_RESPONSE.events` (den
 * default `get-events`-listan), så `placeholderData` inte hittar något att
 * seeda med — motsatsen till scenariot ovan. `get-event` hålls; `get-
 * attendance`/`get-registrations` besvaras direkt (isolerar att det är
 * EVENTETS egen laddning, inte listans, som är den prövade blockeraren).
 * Bevisar att `VariantD` (inte längre en separat minimal fallback-gren i
 * `EventCheckin`, se dess docblock) degraderar kromet fält-för-fält — namn/
 * datum → skelett, sökfältet → `isDisabled`, framstegskortet → `aria-busy` —
 * i stället för att hoppa över hela sidkromet.
 *
 * FJÄRDE TESTET (review-runda 2, FYND 2) — "attendance/registrations landar
 * FÖRE eventet": samma håll-bara-mock-form men med en TVÅDAGARSFIXTUR
 * (`sessioner.length === 2`), och `get-attendance`/`get-registrations`
 * besvarade DIREKT medan `get-event` hålls. Bevisar `SessionsRadD`s
 * placeholder-gren (`useSessionsval`s `session: … | null`): ingen radio
 * existerar alls innan eventet landat (INTE bara "ingen ikryssad" — hela
 * radiogroup/radio-semantiken är frånvarande, se `SessionsRadD`s docblock
 * för varför `ToggleButtonGroup`s förseglade `disallowEmptySelection` gör
 * "ingen vald pill" strukturellt ouppnåeligt via primitiven), och EXAKT en
 * pill markeras när eventet landar — aldrig en synlig övergång mellan två
 * olika val, eftersom inget val fanns att byta FRÅN.
 */

const EVENT_ID = VISUAL_EVENT_ID;
const ANMALAN_A = 'recLaddlageAnm0001';
const ANMALAN_B = 'recLaddlageAnm0002';
const NAMN_A = 'Alma Almqvist';
const NAMN_B = 'Beata Berg';

type RegRow = z.infer<typeof RegistrationSchema>;
type AttRow = z.infer<typeof AttendanceSchema>;

/** En komplett Registration-rad (EF-svarets form) — samma explicita idiom som
 *  `hem-laddlage.acceptance.test.ts`s `reg()`, hellre än att spreada den
 *  delade `REGISTRATIONS_RESPONSE`-fixturen (vars `borOver`/`kalla` hade
 *  kunnat lägga till oväntade badges på raden och därmed rubba den
 *  geometri testet mäter). */
function reg(overrides: Partial<RegRow> = {}): RegRow {
  return {
    id: ANMALAN_A,
    namn: null,
    fornamn: 'Alma',
    efternamn: 'Almqvist',
    email: 'alma@example.se',
    telefon: '070-1111111',
    eventNamn: 'Utbildning Skövde',
    ort: 'Skövde',
    status: 'Bekräftad (mail skickat)',
    flagga: null,
    anmalningsavgift: 'Mottagen',
    slutbetalning: 'Ej mottagen',
    betalningspaminnelseSkickad: null,
    inskickad: '2026-09-01T10:00:00.000Z',
    motivering: null,
    tidigareErfarenhet: null,
    antalPlatser: 1,
    notering: null,
    eventId: EVENT_ID,
    personId: 'recLaddlagePers001',
    ...overrides,
  };
}

/** En komplett Attendance-rad (EF-svarets form). */
function att(overrides: Partial<AttRow> = {}): AttRow {
  return {
    id: 'recLaddlageDelt0001',
    anmalanId: ANMALAN_A,
    eventId: EVENT_ID,
    personId: 'recLaddlagePers001',
    personNamn: NAMN_A,
    session: 'Dag 1',
    status: 'Ej avstämt',
    noteringar: null,
    avstamt: null,
    ...overrides,
  };
}

/**
 * TVÅ anmälda, inte en (mätt fynd, första varvet av just denna mätning):
 * `divide-y` sätter `border-bottom-width` på varje rad UTOM DEN SISTA. Med
 * bara EN rad är den samtidigt först OCH sist — noll border — medan
 * skelettradernas fasta antal (`DORR_SKELETON_RADER`, tre rader) alltid gör
 * FÖRSTA skelettraden till en icke-sista rad, alltså MED border. En
 * en-rings-fixtur hade jämfört en border-lös rad mot en border-bärande och
 * fällt mätningen på en artefakt i TESTETS data, inte i komponenten — precis
 * det verkliga listor (≥ 2 anmälda) aldrig råkar ut för.
 */
const ANMALDA_REGISTRATIONS = [
  reg(),
  reg({
    id: ANMALAN_B,
    fornamn: 'Beata',
    efternamn: 'Berg',
    email: 'beata@example.se',
    personId: 'recLaddlagePers002',
  }),
];
const ANMALDA_ATTENDANCE = [
  att(),
  att({
    id: 'recLaddlageDelt0002',
    anmalanId: ANMALAN_B,
    personId: 'recLaddlagePers002',
    personNamn: NAMN_B,
  }),
];

/** Håll-bar mock (task-4.5:s mönster, se `hem-laddlage.acceptance.test.ts`):
 *  `hall = true` parkerar `get-event`/`get-attendance`/`get-registrations`
 *  (för DENNA sidas eventId) obesvarade tills testet släpper dem. */
function hallbarMock(
  network: NetworkFixture,
  data: { registrations: RegRow[]; attendance: AttRow[] },
) {
  const st = {
    data,
    hall: true,
    parkerade: [] as Array<() => void>,
    slappAlla() {
      for (const slapp of this.parkerade.splice(0)) slapp();
    },
  };
  const vantaOmHallen = () =>
    st.hall ? new Promise<void>((slapp) => st.parkerade.push(slapp)) : Promise.resolve();

  network.use(
    http.get(EF('get-event'), async () => {
      await vantaOmHallen();
      return json({ event: EVENT_DETAIL_RESPONSE.event });
    }),
    http.get(EF('get-attendance'), async () => {
      await vantaOmHallen();
      return json({ attendance: st.data.attendance });
    }),
    http.get(EF('get-registrations'), async ({ request }) => {
      const eventId = new URL(request.url).searchParams.get('eventId');
      // Startvärmningens EGNA anrop (`queryKeys.registrations.all`, inget
      // eventId) — släpp igenom OMEDELBART. Se filhuvudet § varför.
      if (eventId !== EVENT_ID) return json({ registrations: [] });
      await vantaOmHallen();
      return json({ registrations: st.data.registrations });
    }),
  );
  return st;
}

test.describe('Check-in — Lugnt laddläge (TASK-416.1)', () => {
  test('h1 och första listraden: identisk boundingBox under laddning och efter datalandning; eventnamn skarpt via placeholderData', async ({
    page,
    network,
  }) => {
    const mocken = hallbarMock(network, {
      registrations: ANMALDA_REGISTRATIONS,
      attendance: ANMALDA_ATTENDANCE,
    });
    await page.goto(`/event/${EVENT_ID}/narvaro`);

    const h1 = page.getByRole('heading', { level: 1, name: 'Check-in' });
    await expect(h1).toBeVisible();

    // AC #2 — eventnamnet står SKARPT trots att `get-event`/`get-attendance`/
    // `get-registrations` fortfarande är parkerade obesvarade.
    await expect(page.getByText('Utbildning Skövde')).toBeVisible();

    // AC #1 — sidkromet i övrigt: framstegskortet och sökfältet är monterade
    // (framstegskortets EGNA siffror är i skelettläge, se
    // `FramstegskortD`s `isPending`-gren — den bevisas visuellt, inte här).
    await expect(page.getByRole('searchbox', { name: 'Sök bland de anmälda' })).toBeVisible();

    // Listkroppen är i skelettläge — ENDA delen som växlar.
    const skelettrader = page.getByTestId('dorrlista-skelettrad');
    await expect(skelettrader.first()).toBeVisible();

    // Mät-stillhet (L246: neutralisera pekaren först, samma disciplin som
    // `events-list.staging.test.ts`s Lugnt laddläge-test).
    await page.mouse.move(0, 0);
    const h1BoxLaddar = await h1.boundingBox();
    const forstaRadBoxLaddar = await skelettrader.first().boundingBox();

    mocken.hall = false;
    mocken.slappAlla();

    // Listan har landat: den riktiga raden syns, skelettraderna är borta.
    await expect(page.getByText(NAMN_A)).toBeVisible();
    await expect(skelettrader).toHaveCount(0);
    await page.evaluate(
      () => new Promise((klar) => requestAnimationFrame(() => requestAnimationFrame(klar))),
    );

    const h1BoxLaddat = await h1.boundingBox();
    const forstaRadenLaddad = page
      .getByRole('list', { name: 'Anmälda att checka in' })
      .getByRole('listitem')
      .first();
    const forstaRadBoxLaddat = await forstaRadenLaddad.boundingBox();

    // AC #3 — MÄTNINGEN: identisk boundingBox, `toEqual` (exakta boxar,
    // samma form som `events-list.staging.test.ts`s Lugnt laddläge-bevis).
    // Mätta tal (körning 2026-09-06, 1280×720): h1 {x:376,y:128,w:528,h:36}
    // identisk i båda lägena; första listraden {x:361,y:380,w:558,h:65}
    // identisk i båda lägena.
    expect(h1BoxLaddat).toEqual(h1BoxLaddar);
    expect(forstaRadBoxLaddat).toEqual(forstaRadBoxLaddar);
  });

  test('AC #4 — axe 0 violations i laddläget (Roselli-mönstret: aria-busy + sr-only-besked)', async ({
    page,
    network,
  }) => {
    hallbarMock(network, { registrations: ANMALDA_REGISTRATIONS, attendance: ANMALDA_ATTENDANCE });
    await page.goto(`/event/${EVENT_ID}/narvaro`);

    const skelettrader = page.getByTestId('dorrlista-skelettrad');
    await expect(skelettrader.first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('eventet självt parkerat (get-event hålls, events.list saknar posten): kromet står kvar, boundingBox identisk efter landning', async ({
    page,
    network,
  }) => {
    // Medvetet FRÅNVARANDE ur `EVENTS_RESPONSE.events` — se filhuvudet.
    const EVENT_ID_OKAND = 'recLaddlageEventPend01';
    const ANMALAN_OKAND_A = 'recLaddlageAnmPend01';
    const ANMALAN_OKAND_B = 'recLaddlageAnmPend02';

    const st = {
      hall: true,
      parkerade: [] as Array<() => void>,
      slappAlla() {
        for (const slapp of this.parkerade.splice(0)) slapp();
      },
    };
    const vantaOmHallen = () =>
      st.hall ? new Promise<void>((slapp) => st.parkerade.push(slapp)) : Promise.resolve();

    network.use(
      http.get(EF('get-event'), async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        if (id !== EVENT_ID_OKAND) return json(EVENT_DETAIL_RESPONSE);
        await vantaOmHallen();
        return json({
          event: {
            ...EVENT_DETAIL_RESPONSE.event,
            id: EVENT_ID_OKAND,
            eventNamn: 'Föreläsning Parkerad',
            eventlabel: 'Parkerad 1 okt',
            startdatum: '2026-10-01',
            slutdatum: '2026-10-01',
          },
        });
      }),
      // Besvaras DIREKT (inte hållna) — isolerar att det är EVENTETS egen
      // laddning som prövas här, inte listans (den vägen har redan sitt eget
      // test ovan).
      http.get(EF('get-registrations'), ({ request }) => {
        const eventId = new URL(request.url).searchParams.get('eventId');
        if (eventId !== EVENT_ID_OKAND) return json({ registrations: [] });
        return json({
          registrations: [
            reg({ id: ANMALAN_OKAND_A, eventId: EVENT_ID_OKAND }),
            reg({
              id: ANMALAN_OKAND_B,
              fornamn: 'Beata',
              efternamn: 'Berg',
              email: 'beata@example.se',
              personId: 'recLaddlagePers002',
              eventId: EVENT_ID_OKAND,
            }),
          ],
        });
      }),
      http.get(EF('get-attendance'), () =>
        json({
          attendance: [
            att({
              id: 'recLaddlageDeltPend01',
              anmalanId: ANMALAN_OKAND_A,
              eventId: EVENT_ID_OKAND,
            }),
            att({
              id: 'recLaddlageDeltPend02',
              anmalanId: ANMALAN_OKAND_B,
              personId: 'recLaddlagePers002',
              personNamn: NAMN_B,
              eventId: EVENT_ID_OKAND,
            }),
          ],
        }),
      ),
    );

    await page.goto(`/event/${EVENT_ID_OKAND}/narvaro`);

    const h1 = page.getByRole('heading', { level: 1, name: 'Check-in' });
    await expect(h1).toBeVisible();

    // Kromet står kvar trots att EVENTET självt (inte bara attendance/
    // registrations) är parkerat: sökfältet är monterat men INAKTIVERAT
    // (FYND 2 — ingen event-identitet att söka BLAND ännu; den befintliga,
    // redan testade "list pending"-vägen ovan lämnar sökfältet aktivt,
    // oförändrat).
    const sokfalt = page.getByRole('searchbox', { name: 'Sök bland de anmälda' });
    await expect(sokfalt).toBeVisible();
    await expect(sokfalt).toBeDisabled();

    // Framstegskortet är monterat och markerar sig BUSY (FYND 1) — en
    // skärmläsare som navigerar hit direkt via landmärken (sektionen har
    // eget `aria-label`) ser att regionen laddar, inte att den är tom.
    const framsteg = page.getByRole('region', { name: 'Framsteg' });
    await expect(framsteg).toHaveAttribute('aria-busy', 'true');

    const skelettrader = page.getByTestId('dorrlista-skelettrad');
    await expect(skelettrader.first()).toBeVisible();

    await page.mouse.move(0, 0);
    const h1BoxLaddar = await h1.boundingBox();
    const forstaRadBoxLaddar = await skelettrader.first().boundingBox();

    st.hall = false;
    st.slappAlla();

    await expect(page.getByText('Föreläsning Parkerad')).toBeVisible();
    await expect(sokfalt).toBeEnabled();
    await expect(framsteg).toHaveAttribute('aria-busy', 'false');
    await expect(skelettrader).toHaveCount(0);
    await page.evaluate(
      () => new Promise((klar) => requestAnimationFrame(() => requestAnimationFrame(klar))),
    );

    const h1BoxLaddat = await h1.boundingBox();
    const forstaRadenLaddad = page
      .getByRole('list', { name: 'Anmälda att checka in' })
      .getByRole('listitem')
      .first();
    const forstaRadBoxLaddat = await forstaRadenLaddad.boundingBox();

    expect(h1BoxLaddat).toEqual(h1BoxLaddar);
    expect(forstaRadBoxLaddat).toEqual(forstaRadBoxLaddar);
  });

  test('attendance/registrations landar FÖRE eventet (flerdagarsfixtur): sessionstoggeln visar inget val och byter aldrig annat än från inget till det härledda', async ({
    page,
    network,
  }) => {
    // Review-runda 2, FYND 2. Ett ANNAT event-ID än de två andra testen —
    // medvetet FRÅNVARANDE ur `EVENTS_RESPONSE.events`, samma skäl som
    // "eventet självt parkerat" ovan. Frusen klocka (`FROZEN_NOW`,
    // 2026-09-15): eventets datum (oktober 2026) får ALDRIG sammanfalla med
    // "idag" i `useSessionsval`s Dag 2-heuristik, oavsett vilket datum denna
    // testsvit faktiskt körs på — annars vore assertionen om VILKEN dag som
    // härleds klockberoende och skör (samma disciplin som
    // `event-checkin-dorrlistan.acceptance.test.ts`s filhuvud § DETERMINISMEN).
    await page.clock.install({ time: FROZEN_NOW });

    const EVENT_ID_SENT = 'recLaddlageEventSent01';
    const ANMALAN_SENT_A = 'recLaddlageAnmSent01';
    const ANMALAN_SENT_B = 'recLaddlageAnmSent02';

    const st = {
      hall: true,
      parkerade: [] as Array<() => void>,
      slappAlla() {
        for (const slapp of this.parkerade.splice(0)) slapp();
      },
    };
    const vantaOmHallen = () =>
      st.hall ? new Promise<void>((slapp) => st.parkerade.push(slapp)) : Promise.resolve();

    network.use(
      // ENDAST get-event hålls — attendance/registrations besvaras direkt,
      // så de landar FÖRE eventet (exakt det race FYND 2 beskriver: en
      // >1-session-fixtur blir avslöjad av attendance-datan innan eventets
      // slutdatum finns att pröva "är idag sista dagen?" mot).
      http.get(EF('get-event'), async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        if (id !== EVENT_ID_SENT) return json(EVENT_DETAIL_RESPONSE);
        await vantaOmHallen();
        return json({
          event: {
            ...EVENT_DETAIL_RESPONSE.event,
            id: EVENT_ID_SENT,
            eventNamn: 'Utbildning Sent Landad',
            eventlabel: 'Sent landad 1–2 okt',
            startdatum: '2026-10-01',
            slutdatum: '2026-10-02',
          },
        });
      }),
      http.get(EF('get-registrations'), ({ request }) => {
        const eventId = new URL(request.url).searchParams.get('eventId');
        if (eventId !== EVENT_ID_SENT) return json({ registrations: [] });
        return json({
          registrations: [
            reg({ id: ANMALAN_SENT_A, eventId: EVENT_ID_SENT }),
            reg({
              id: ANMALAN_SENT_B,
              fornamn: 'Beata',
              efternamn: 'Berg',
              email: 'beata@example.se',
              personId: 'recLaddlagePers002',
              eventId: EVENT_ID_SENT,
            }),
          ],
        });
      }),
      http.get(EF('get-attendance'), () =>
        json({
          attendance: [
            att({
              id: 'recLaddlageDeltSent01',
              anmalanId: ANMALAN_SENT_A,
              eventId: EVENT_ID_SENT,
              session: 'Dag 1',
            }),
            att({
              id: 'recLaddlageDeltSent02',
              anmalanId: ANMALAN_SENT_B,
              personId: 'recLaddlagePers002',
              personNamn: NAMN_B,
              eventId: EVENT_ID_SENT,
              session: 'Dag 2',
            }),
          ],
        }),
      ),
    );

    await page.goto(`/event/${EVENT_ID_SENT}/narvaro`);

    const h1 = page.getByRole('heading', { level: 1, name: 'Check-in' });
    await expect(h1).toBeVisible();

    // Sidkromet står, men INGEN session är vald ännu: `ToggleButtonGroup`s
    // radiogroup/radio-semantik existerar inte alls (placeholder-grenen i
    // `SessionsRadD`) — bara de dämpade, icke-interaktiva platshållarna.
    const sessionsrad = page.getByTestId('dorrlista-sessionsrad');
    await expect(sessionsrad).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByText('Dag 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Dag 2', { exact: true })).toBeVisible();

    const skelettrader = page.getByTestId('dorrlista-skelettrad');
    await expect(skelettrader.first()).toBeVisible();

    await page.mouse.move(0, 0);
    const sessionsradBoxInnan = await sessionsrad.boundingBox();

    st.hall = false;
    st.slappAlla();

    // Eventet landar: EXAKT en pill markerad — aldrig noll, aldrig två, och
    // aldrig en SYNLIG övergång mellan två OLIKA valda pills (det fanns
    // inget valt att byta FRÅN; `session` var `null` fram tills nu).
    await expect(page.getByText('Utbildning Sent Landad')).toBeVisible();
    const radiogroup = page.getByRole('radiogroup', { name: 'Vilken session checkar du in?' });
    await expect(radiogroup).toBeVisible();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
    // Ingen dagens-datum-matchning möjlig (frusen klocka, oktober-fixtur i
    // filhuvudet) ⇒ härledningen faller på `sessioner[0]` = "Dag 1".
    await expect(page.getByRole('radio', { name: 'Dag 1', checked: true })).toBeVisible();
    await expect(skelettrader).toHaveCount(0);

    await page.evaluate(
      () => new Promise((klar) => requestAnimationFrame(() => requestAnimationFrame(klar))),
    );
    const sessionsradBoxEfter = await sessionsrad.boundingBox();
    expect(sessionsradBoxEfter).toEqual(sessionsradBoxInnan);
  });
});
