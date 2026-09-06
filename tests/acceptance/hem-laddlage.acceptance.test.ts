import AxeBuilder from '@axe-core/playwright';
import type { NetworkFixture } from '@msw/playwright';
import { http } from 'msw';
import type { z } from 'zod';
import type {
  ActivityStatementSchema,
  EventSchema,
  RegistrationSchema,
} from '../../src/domain/schemas';
import { REQUEST_ID_EXTENSION_IRI, XAPI_IRI_BASE } from '../../src/domain/schemas';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, type Page, test } from './acceptance-bas';

/**
 * Hem i Lugnt laddläge (task-8.4; princip: ORDLISTA "Lugnt laddläge" +
 * DESIGN-SYSTEM-SPEC §15 + PRD TASK-8 beslut 5–10). Vid tom cache renderas
 * Hem från FÖRSTA bildrutan med riktiga kortrubriker och riktig kort-chrome i
 * full slutgeometri — endast datakropparna bär Skeleton-primitivens block
 * (eventmeta-rader i Nästa event, räknar-rubriken i Nya anmälningar, listrader
 * i BÅDA Nya anmälningar OCH Förfallna betalningar — TASK-243.3: "Obetalda
 * anmälningsavgifter"-kortet retirerades av Morgonkollen-redesignen och
 * ersattes av Förfallna betalningar, samma laddläge-kontrakt oförändrat);
 * anmälningslistans yta är dimensionsreserverad; datalandningen byter block →
 * innehåll UTAN att något flyttar sig (layout-skift ≈ 0 är grindkravet).
 * 'Laddar…'-textraderna är borta och ingen spinner finns (medvetet över
 * FK-golvet, PRD-beslut 9).
 *
 * DE TRE MÄTTA CONTAINRARNA (`main#main [role="status"]`, count 3 nedan) är
 * Nästa event + Nya anmälningar + Förfallna betalningar — samtliga styrda av
 * `anmalDataPending`/`eventsQuery.isPending`. Senaste aktivitet-blocket
 * (`SenasteAktivitetKompakt.tsx`) bär SITT EGET, OBEROENDE `role="status"`
 * (egen query, `useLatestActivity`) — held-mock-riggen nedan parkerar bara
 * get-events/get-registrations, så den fjärde containern hinner alltid
 * settla (normalläget svarar utan konstgjord fördröjning) innan assertionerna
 * läses; en fjärde, permanent parkerad container hade krävt en egen
 * `get-activity-log`-hållning här, vilket denna svit inte behöver för att
 * bevisa sitt kontrakt.
 *
 * Bevisformer:
 * - Layout-skift ≈ 0 per task-4.5-bevismönstret (S55 Del 11): EF-svaren
 *   PARKERAS obesvarade (håll-bar mock) → boundingBox-mätning UNDER
 *   laddning; svaren släpps → identisk mätning EFTER data (toEqual, exakta
 *   boxar — samma form som task-4.5 AC 2:s mät-stillhet). DEN FAKTISKA
 *   MÄTNINGEN (TASK-416.13, ADR-083 — denna rad LOVADE länge en boundingBox-
 *   mätning som inte fanns i koden, bara i denna kommentar) bor i sitt eget
 *   test nedan, samma håll-bar-mock-teknik som
 *   `event-checkin-laddlage.acceptance.test.ts` (TASK-416.1) och
 *   `mer-aktivitetshistorik-laddlage.acceptance.test.ts` (TASK-416.3) redan
 *   bevisat sina motsvarande ytor med. Den mäter, GRÖNT, h2-rubriken PLUS
 *   kortkroppen/första raden på Nästa event och Senaste aktivitet, samt
 *   h2-rubriken PLUS FÖRSTA RADEN på Nya anmälningar/Förfallna betalningar
 *   (Nya anmälningars rad `toEqual`, Förfallna betalningars h2 OCH rad
 *   `utanY`-avgränsade — se resp. assertion nedan för varför).
 *
 *   FÖRSTA RADEN på just DESSA två kort mättes MEDVETET INTE i
 *   TASK-416.13 (den skiva som byggde detta test): det ursprungliga varvet
 *   fann att `Skeleton variant="listRow"` INTE matchade den riktiga
 *   avatar-radens boundingBox ({width:568,height:72} skelett mot
 *   {width:545,height:66} riktig rad, samma defekt i båda komponenterna) —
 *   en defekt `TASK-416.9` aldrig rörde (dess diff `cfcd3628` gällde
 *   uteslutande `NastaEvent.tsx`/`SenasteAktivitetKompakt.tsx`). Ett första
 *   försök bokförde fyndet som två `test.fail()`-test, men den formen
 *   visade sig FEL i detta repo: hermetik-självtestet (`npm run
 *   test:acceptance:sjalvtest`, `hermetik-vakt.ts`) kör HELA
 *   acceptance-sviten UTAN fixturens svar och kräver att VARJE test då
 *   faller med `OmockadRequestError` — ett `test.fail()`-test som "lyckas
 *   fallera" av ETT ANNAT skäl (den kända geometri-defekten, inte ett
 *   omockat nätverksanrop) rapporteras av självtestet som "överlevde utan
 *   fixturens svar", vilket är EXAKT den tysta fällan hermetik-vakten finns
 *   för att fånga. `test.fail()` bokförde alltså defekten som ett
 *   TVÅSIDIGT-fall som skulle konverteras samtidigt som fixen — TASK-416.18
 *   gjorde det: `NyaAnmalningar.tsx`/`ForfallnaBetalningar.tsx` fick en
 *   egen radspecifik skeleton-komponent (samma mönster som
 *   `MailLogSkeletonRow`/`WaitlistSkeletonRow`, TASK-416.17) och den
 *   laddande containerns breddklasser fick den riktiga listans
 *   `pr-3`/`scrollbar-inline` — se resp. komponents docblock för hela
 *   härledningen. Mätningen nedan är sedan dess en VANLIG assertion, ingen
 *   `test.fail()` kvar i denna fil.
 * - Framträdande-formen är mätlåst per task-8.1 (kommentaren på task-8.4):
 *   skeleton från första bildrutan, INGEN CSS-driven fördröjning — bevisas
 *   computed (L272) medan nätverket är parkerat.
 * - A11y per Roselli-mönstret (PRD-beslut 6): aria-busy på laddande
 *   containrar + sr-only-laddbesked (aria-busy honoreras sällan ensam);
 *   blocken aria-hidden; reduced-motion → statiska block (emulateMedia);
 *   axe 0 violations i laddläge.
 *
 * TOM CACHE arrangeras EXPLICIT: persist-lagret (task-8.3, ADR-072) gör
 * kallstarten sällsynt — en persistad cache kan bära data in i testkontexten.
 * Init-scriptet tar bort persist-nyckeln FÖRE app-boot (test-arrangemang före
 * start — INTE runtime-tömning; den vägen är queryClient.clear() per ADR-072
 * skyddsräcke 1), så varje test här träffar den äkta kallstarten skeletonen
 * byggdes för. Arrangemanget behålls efter flytten till acceptance-klassen
 * trots att varje test där får en FÄRSK kontext med tom localStorage: det
 * kostar ingenting, och kravet det uttrycker (äkta kallstart) ska stå kvar i
 * testet även om kontext-isoleringen någon gång ändras.
 *
 * ACCEPTANCE-KLASSEN (task-59.3, ADR-080): filen flyttades hit ur e2e-sviten
 * med hela sitt bevisinnehåll intakt — a11y-assertionerna inkluderade.
 * Klassningen är HÄRLEDD ur hermetik-mätningen (`.hermetik/rapport.jsonl`): 15
 * restanrop, samtliga typsnitt, noll skarpa. Deterministisk via `network.use()`
 * mot fixturvärldens delade handlers — inte via page.route, som hade lagt en
 * andra avlyssningsmekanism ovanpå MSW och gjort EF-lagret svagare vaktat än
 * allt annat nätverk.
 */

const PERSIST_KEY = 'REACT_QUERY_OFFLINE_CACHE';

/**
 * Härledda ur schemana, ej beskrivna bredvid dem (TASK-63) — se `acceptance-bas.ts`
 * § fogen. Vyn läser TVÅ EF:er med olika svarsform, så det tidigare gemensamma
 * `Row`-aliaset delas: ett `Record<string, unknown>` kunde bära båda, en härledd
 * typ kan inte — och ska inte.
 */
type RegRow = z.infer<typeof RegistrationSchema>;
type EventRow = z.infer<typeof EventSchema>;

/** En komplett Registration-rad (EF-svarets form, Registration.schema). */
function reg(overrides: Partial<RegRow> = {}): RegRow {
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
    ...overrides,
  };
}

/** En komplett Event-rad (EF-svarets form, Event.schema). */
function ev(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: `recE${Math.random().toString(36).slice(2, 10)}`,
    eventlabel: 'RIM1',
    eventNamn: 'Resor i medvetandet 1',
    typ: 'Kurs',
    ort: 'Skövde',
    startdatum: '2099-06-01',
    slutdatum: '2099-06-02',
    tidKvarTillEvent: null,
    maxPlatser: 20,
    antalAnmalda: 5,
    platserKvar: 15,
    anmaldBelaggning: 0.25,
    bekraftadBelaggning: 0.2,
    antalNyaAnmalningar: 2,
    antalAnmalningsavgifter: 3,
    antalSlutbetalningar: 1,
    antalSlutbetalningFelande: 0,
    status: 'Planerat',
    ...overrides,
  };
}

/** Fullt slutinnehåll: kommande event med ort/datum/beläggning (alla
    metarader renderas) + 6 anmälningar (à ~83 px ⇒ scrollHeight > 320 ⇒
    listan står i sin fulla max-h-80-klienthöjd) varav en obetald.
    Dagsgamla inskickad-tider: relativa tidsformer glider inte under testet. */
function fulltData() {
  return {
    registrations: Array.from({ length: 6 }, (_, i) =>
      reg({
        id: `recRegStabil${i}`,
        fornamn: `Person${i}`,
        efternamn: i === 0 ? 'Andersson' : 'Testsson',
        eventId: 'recEvent1',
        anmalningsavgift: i === 0 ? 'Ej mottagen' : 'Mottagen',
        inskickad: new Date(Date.now() - (i + 2) * 86_400_000).toISOString(),
      }),
    ),
    events: [
      ev({
        id: 'recEvent1',
        eventNamn: 'Fjärrskådning',
        ort: 'Skövde',
        startdatum: '2099-09-15',
        antalAnmalda: 5,
        maxPlatser: 20,
      }),
    ],
  };
}

/** Håll-bar mock (task-4.5:s mönster): `hall = true` parkerar EF-anropen
    obesvarade — laddläget står deterministiskt tills testet släpper svaren
    (ingen fast delay, TASK-3-klassen); `slappAlla` besvarar med `data`.

    ÖVERSKUGGNING, INTE EN ANDRA FIXTURVÄRLD (task-59.3): handlarna läggs på
    fixturvärldens normalläge via `network.use()` och gäller ENDAST detta test
    — isoleringen är strukturell, `network` byggs om per test. Mönstren byggs
    med `EF()` ur handlers-modulen så de per konstruktion matchar exakt det
    normalläget matchar; en egen sträng hade kunnat drifta och då fallit igenom
    till normalläget UTAN att något fälls (den tysta fällan, se hermetic.ts).

    Parkeringen bärs av ett obesvarat löfte i resolvern i stället för av ett
    uppskjutet Playwright-Route-objekt: MSW äger avlyssningen sedan task-54.1,
    och en resolver som inte återvänder håller anropet i luften precis som en
    oparkerad rutt gjorde. `slappAlla` löser dem, och svaret läses ur `st.data`
    VID släppet — så data kan bytas mellan pollarna. */
function hallbarMock(
  network: NetworkFixture,
  data: { registrations: RegRow[]; events: EventRow[] },
) {
  const st = {
    data,
    hall: true,
    parkerade: [] as Array<() => void>,
    slappAlla() {
      for (const slapp of this.parkerade.splice(0)) slapp();
    },
  };
  const svara = (arEvents: boolean) =>
    arEvents ? json({ events: st.data.events }) : json({ registrations: st.data.registrations });
  const hanterare = (arEvents: boolean) => async () => {
    if (st.hall) await new Promise<void>((slapp) => st.parkerade.push(slapp));
    return svara(arEvents);
  };
  network.use(
    http.get(EF('get-registrations'), hanterare(false)),
    http.get(EF('get-events'), hanterare(true)),
  );
  return st;
}

/** Tom cache-arrangemanget: persist-nyckeln bort FÖRE app-boot (körs vid
    varje dokumentstart i kontexten) — äkta kallstart, oavsett vad
    auth.setup:s storageState råkar bära. */
function arrangeraTomCache(page: Page) {
  return page.addInitScript((nyckel) => localStorage.removeItem(nyckel), PERSIST_KEY);
}

/**
 * Fixtur för MÄTNINGEN (TASK-416.13): ETT event, TVÅ Obekräftade
 * registreringar — matchar EXAKT de två fasta skeleton-placeholderna
 * (`Skeleton variant="listRow"` × 2) i BÅDE Nya anmälningar OCH Förfallna
 * betalningar. `fulltData()` ovan duger INTE för denna mätning:
 * `forfallnaBetalningar()` kräver en PASSERAD deadline (`fulltData()`s event
 * ligger 2099, decennier bortom det) och `obekraftadeAnmalningar()` kräver
 * status `Obekräftad` (`fulltData()`s sex rader är alla `Bekräftad (mail
 * skickat)`) — med `fulltData()` renderar båda blocken sitt TOMLÄGE, som bär
 * ett KÄNT, medvetet omätt geometri-skifte (PRD § Öppna frågor, Marcus-
 * designval) mot skeleton-formen. Se testets egen kommentar för det skiftet.
 *
 * Status `Obekräftad` på BÅDA raderna gör dubbel nytta: det räknar dem som
 * "nya anmälningar att bekräfta" OCH det UTESLUTER dem samtidigt ur
 * Bevakningsradens "bekräftade saknar deltagarinfo"-definition B
 * (`arBekraftad`, `hem-derivations.ts`) — Bevakningsraden förblir därför
 * osynlig i BÅDA lägena, ingen tredje okontrollerad layoutkälla mellan
 * Nästa event och Nya anmälningar som hade gjort en eventuell avvikelse
 * svårare att tillskriva rätt block.
 *
 * Startdatum/deadline-paret är den ETABLERADE facit-kombinationen ur
 * `hem.acceptance.test.ts`s egen "Förfallna betalningar"-svit: `2026-09-20`
 * ⇒ deadline `2026-09-06` (14 dagar före), redan passerad mot FROZEN_NOW
 * (`fixture-data.ts`, `2026-09-15T10:00+02:00` — sidans klocka är FRUSEN dit,
 * `hermetic.ts`). ETT hårdkodat framtidsdatum (`2099-…`, som `fulltData()`)
 * hade ALDRIG blivit förfallet; ett `Date.now()`-relativt datum räknas i
 * Node-testprocessens VERKLIGA klocka — en annan tidslinje än sidans frusna
 * — och glider isär från facit-kombinationen ovan varje dag som går.
 */
function medMatningsdata() {
  return {
    events: [
      ev({
        id: 'recEventMatning1',
        eventNamn: 'Mätningseventet',
        ort: 'Skövde',
        startdatum: '2026-09-20',
        antalAnmalda: 2,
        maxPlatser: 20,
      }),
    ],
    registrations: [
      reg({
        id: 'recRegMatning0',
        fornamn: 'Alma',
        efternamn: 'Almqvist',
        eventId: 'recEventMatning1',
        status: 'Obekräftad',
        anmalningsavgift: 'Ej mottagen',
        slutbetalning: 'Mottagen',
        inskickad: '2026-09-15T06:00:00.000Z', // 2 tim före FROZEN_NOW
      }),
      reg({
        id: 'recRegMatning1',
        fornamn: 'Beata',
        efternamn: 'Berg',
        eventId: 'recEventMatning1',
        status: 'Obekräftad',
        anmalningsavgift: 'Ej mottagen',
        slutbetalning: 'Mottagen',
        inskickad: '2026-09-15T05:00:00.000Z', // 3 tim före FROZEN_NOW
      }),
    ],
  };
}

let matningsStatementCounter = 0;
/** Deterministisk v4-formad UUID (Zod `.uuid()`) — samma hjälpare som
 *  `mer-aktivitetshistorik-laddlage.acceptance.test.ts`. */
function matningsUuid(): string {
  matningsStatementCounter += 1;
  return `00000000-0000-4000-8000-${String(matningsStatementCounter).padStart(12, '0')}`;
}

/** Ett minimalt xAPI-statement som passerar `ActivityStatementSchema`, för
 *  MÄTNINGENS "Senaste aktivitet"-rad ENSAM (ingen konsument bryr sig om
 *  innehållet, bara om att en RIKTIG rad renderas efter datalandning). */
function matningsStatement(): z.infer<typeof ActivityStatementSchema> {
  return {
    id: matningsUuid(),
    actor: {
      objectType: 'Agent',
      name: 'Lotta',
      account: { homePage: XAPI_IRI_BASE, name: matningsUuid() },
    },
    verb: { id: `${XAPI_IRI_BASE}/verbs/test-verb`, display: { 'sv-SE': 'markerade betalning' } },
    object: {
      objectType: 'Activity',
      id: `${XAPI_IRI_BASE}/objects/registrations/rec-matning`,
      definition: {
        name: { 'sv-SE': 'Mätningsposten' },
        type: `${XAPI_IRI_BASE}/activity-types/betalning`,
      },
    },
    context: { extensions: { [REQUEST_ID_EXTENSION_IRI]: matningsUuid() } },
    timestamp: '2026-09-15T07:00:00.000Z',
  };
}

/**
 * Håll-bar mock UTÖKAD med `get-activity-log` — MÄTNINGEN ENSAM (task-416.13).
 * De tre delade containrarna (Nästa event / Nya anmälningar / Förfallna
 * betalningar) hålls via EXAKT samma mekanism som `hallbarMock` (byggd på den
 * funktionen, inte en kopia av den), men mätningen omfattar ÄVEN Senaste
 * aktivitet — sitt EGET, oberoende `role="status"` (filhuvudets § DE TRE
 * MÄTTA CONTAINRARNA). De FYRA andra testerna i denna svit betalar MEDVETET
 * inte för att hålla den fjärde (normalläget hinner alltid settla innan deras
 * assertions läses, se filhuvudet) — men en boundingBox "under laddning" för
 * just DEN containern måste garanterat träffa FÖRE aktivitetsloggen landat,
 * annars mäter mätningen sin egen tur i stället för kontraktet.
 */
function hallbarMockMedAktivitet(
  network: NetworkFixture,
  data: { registrations: RegRow[]; events: EventRow[] },
) {
  const st = hallbarMock(network, data);
  const aktivitetParkerade: Array<() => void> = [];
  network.use(
    http.get(EF('get-activity-log'), async () => {
      await new Promise<void>((slapp) => aktivitetParkerade.push(slapp));
      return json({ statements: [matningsStatement()], nextCursor: null, total: 1 });
    }),
  );
  const slappDeTre = st.slappAlla.bind(st);
  st.slappAlla = () => {
    slappDeTre();
    for (const slapp of aktivitetParkerade.splice(0)) slapp();
  };
  return st;
}

test.describe('Hem — Lugnt laddläge (task-8.4)', () => {
  test("AC 2 — 'Laddar…'-textraderna är borta ur Hem: laddbeskeden är enbart sr-only; ingen spinner", async ({
    page,
    network,
  }) => {
    await arrangeraTomCache(page);
    hallbarMock(network, fulltData());
    await page.goto('/hem');
    await expect(page.locator('main#main').getByRole('status')).toHaveCount(3);

    // Varje 'Laddar…'-förekomst är ett sr-only-besked (1×1, absolut) — den
    // gamla formens SYNLIGA textrader existerar inte längre.
    const laddTexter = page.getByText(/^Laddar/);
    await expect(laddTexter).toHaveCount(3);
    for (const el of await laddTexter.all()) {
      const stil = await el.evaluate((n) => {
        const s = getComputedStyle(n);
        return { position: s.position, width: s.width, height: s.height };
      });
      expect(stil).toEqual({ position: 'absolute', width: '1px', height: '1px' });
    }

    // Ingen spinner infördes (PRD-beslut 9 — medvetet över FK-golvet).
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('AC 3 — framträdande-formen per task-8.1:s mätlåsta beslut: skeleton från första bildrutan, ingen fördröjningsmekanism', async ({
    page,
    network,
  }) => {
    await arrangeraTomCache(page);
    hallbarMock(network, fulltData());
    await page.goto('/hem');

    // Blocken är synliga MEDAN inget EF-svar levererats (nätverket parkerat
    // = det tidigast möjliga fönstret — första bildrutan i beteendetermer).
    const block = page.locator('main#main [role="status"] span[aria-hidden="true"]');
    await expect(block.first()).toBeVisible();

    // Ingen CSS-driven framträdande-fördröjning (den förkastade ~1 s-grenen,
    // PRD-beslut 8): blocket är fullt opakt direkt, utan transition-delay
    // och utan element-animation (shimmern bor på ::after-lagret och rör
    // inte framträdandet).
    const stil = await block.first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        opacity: s.opacity,
        transitionDelay: s.transitionDelay,
        animationName: s.animationName,
      };
    });
    expect(stil).toEqual({ opacity: '1', transitionDelay: '0s', animationName: 'none' });
  });

  test('AC 4 — laddande containrar bär aria-busy + tillgängligt laddbesked; blocken är dekorativa (Roselli-mönstret)', async ({
    page,
    network,
  }) => {
    await arrangeraTomCache(page);
    hallbarMock(network, fulltData());
    await page.goto('/hem');

    const laddande = page.locator('main#main').getByRole('status');
    await expect(laddande).toHaveCount(3);
    for (const container of await laddande.all()) {
      // aria-busy på containern som laddar …
      await expect(container).toHaveAttribute('aria-busy', 'true');
      // … ALLTID kompletterad med textbeskedet (få skärmläsare honorerar
      // busy ensam): exakt ett sr-only-besked per container.
      const besked = container.locator('.sr-only');
      await expect(besked).toHaveCount(1);
      await expect(besked).toContainText(/Laddar/);
      // … och samtliga skelettblock är dekorativa: aria-hidden utan text.
      for (const blockEl of await container.locator('span[aria-hidden="true"]').all()) {
        await expect(blockEl).toHaveText('');
      }
    }
  });

  test('AC 4 — reduced-motion ger statiska block; utan preferensen shimrar blocken långsamt', async ({
    page,
    network,
  }) => {
    await arrangeraTomCache(page);
    hallbarMock(network, fulltData());

    // Kontrollprovet först (L273-falsifikation): utan reducerad rörelse ÄR
    // shimmern deklarerad — annars bevisar reduce-grenen ingenting.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/hem');
    const block = page.locator('main#main [role="status"] span[aria-hidden="true"]').first();
    await expect(block).toBeVisible();
    const shimmer = await block.evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return { namn: s.animationName, duration: s.animationDuration };
    });
    expect(shimmer.namn).toContain('skeleton-shimmer');
    expect(Number.parseFloat(shimmer.duration)).toBeGreaterThanOrEqual(2);

    // Reducerad rörelse: animationen är INTE deklarerad (media-gated vid
    // deklarationen — statiska block, WCAG 2.2.2-noten).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const efterReduce = await block.evaluate((el) => getComputedStyle(el, '::after').animationName);
    expect(efterReduce).toBe('none');
  });

  test('AC 4 — axe 0 violations på Hem i laddläge', async ({ page, network }) => {
    await arrangeraTomCache(page);
    hallbarMock(network, fulltData());
    await page.goto('/hem');
    await expect(page.locator('main#main').getByRole('status')).toHaveCount(3);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /** Strippar `y` ur en boundingBox. Används ENDAST för element vars
   *  vertikala sidposition LEGITIMT förskjuts av en ANNAN sektions
   *  data-styrda innehåll — inte av sin EGEN skeleton-geometri (se
   *  huvudtestets kommentar för den uppmätta orsaksbilden: "Bekräfta
   *  alla"/"Skicka påminnelse till alla"-knapparna och "Att påminna"-
   *  underrubriken existerar bara EFTER datalandning, eftersom de kräver ett
   *  känt antal — en count-agnostisk skeleton kan inte reservera plats för
   *  ett innehåll den inte känner storleken på). Kvar är precis den
   *  geometrin "layout-skift ≈ 0"-kontraktet faktiskt handlar om för DEN
   *  sektionen: bredd, höjd och vänsterkant. */
  function utanY(box: { x: number; y: number; width: number; height: number }) {
    const { x, width, height } = box;
    return { x, width, height };
  }

  type Ruta = { x: number; y: number; width: number; height: number };
  /** Kastar om NÅGON boundingBox i `boxar` saknas (elementet fanns inte),
   *  annars returnerar samma objekt med typen avsmalnad bort från `| null` —
   *  Playwright typar `boundingBox()` som nullbar, men ett saknat element HÄR
   *  är ett testfel, inte ett giltigt utfall att gå vidare med. */
  function kravBoxar<T extends Record<string, Ruta | null>>(
    boxar: T,
    sammanhang: string,
  ): { [K in keyof T]: Ruta } {
    for (const [namn, box] of Object.entries(boxar)) {
      if (!box) throw new Error(`boundingBox saknas för ${namn} ${sammanhang}`);
    }
    return boxar as { [K in keyof T]: Ruta };
  }

  /**
   * VIEWPORT-MATRISEN (review-fynd runda 1, PR #2419, info/auto-fix):
   * MÄTNINGEN nedan kördes tidigare bara vid Playwrights default
   * `acceptance`-viewport (1280×720, `devices['Desktop Chrome']`) — noll
   * `setViewportSize`-anrop. Repot har redan ett etablerat mönster för att
   * inte lita på en enda bredd för en rad-höjds-/breddlås
   * (`hem.acceptance.test.ts`s Bevakningsraden-svit, TASK-303, matrisen
   * `[375, 390, 768, 1280]` px) eftersom truncate/line-height-baserad
   * geometri i teorin kan bete sig annorlunda vid smalare bredder. ETT TEST
   * PER BREDD — inte en loop inuti ETT test — av SAMMA skäl TASK-303:s
   * docblock ger (samma fil, `for (const viewport …) { for (const fall …) {
   * test(…) } }`-mönstret ovanför): flera `page.goto()` i samma
   * browser-context riskerar att föregående iterations tillstånd (den
   * persisterade query-cachen, `arrangeraTomCache`/ADR-072) läcker in i
   * nästa. Playwright ger varje `test()` ett FÄRSKT context, så en
   * test-per-bredd tar bort delat tillstånd i stället för att kapprännas
   * med det.
   */
  for (const viewport of [375, 390, 768, 1280]) {
    test(`${viewport}px — MÄTNING (TASK-416.13, ADR-083) — boundingBox på Hem-kortens rubriker och första rad/kortkropp är IDENTISK under laddning och efter datalandning: Nästa event, Nya anmälningar, Senaste aktivitet, Förfallna betalningar`, async ({
      page,
      network,
    }) => {
      await page.setViewportSize({ width: viewport, height: 900 });
      await arrangeraTomCache(page);
      const mocken = hallbarMockMedAktivitet(network, medMatningsdata());
      await page.goto('/hem');

      // FYRA laddande containrar — de TRE delade (Nästa event / Nya
      // anmälningar / Förfallna betalningar, `anmalDataPending`) PLUS Senaste
      // aktivitets EGEN (`useLatestActivity`, hållen av `hallbarMockMedAktivitet`
      // ENSAM i denna fil). Väntar in ALLA FYRA innan mätning — annars kunde en
      // container hinna montera EFTER att en annan redan mätts, och "identisk
      // boundingBox" hade bevisat en tillfällighet i testets EGEN tur snarare
      // än kontraktet.
      await expect(page.locator('main#main').getByRole('status')).toHaveCount(4);
      await page.mouse.move(0, 0); // mät-stillhet — neutralisera pekaren (L246)

      // Rubrikerna: SAMMA element i båda lägena (h2:n bytter aldrig ut sig
      // själv, bara sitt innehåll — Nästa event/Senaste aktivitet-rubrikerna
      // är dessutom ALDRIG skelett, se resp. komponents källa).
      const nastaEventH2 = page.locator('h2#hem-nasta-event');
      const nyaAnmH2 = page.locator('h2#hem-nya-anmalningar');
      const forfallnaH2 = page.locator('h2#hem-forfallna');
      const senasteH2 = page.locator('h2#hem-senaste-aktivitet');

      // "Nästa event"s kortkropp: EN gemensam locator för BÅDA lägena — den
      // direkta `<div>`-syskonen till h2:n är antingen `role="status"` (laddar)
      // eller den laddade `flex flex-col gap-4`-wrappern (`NastaEvent.tsx`),
      // aldrig något annat element i det icke-felaktiga scenariot denna
      // mätning täcker (isError testas inte här). Mäter HELA kroppen, inte en
      // enskild rad — kortet är en hero, inte en lista, så "första raden" här
      // är dess enda innehållsblock (TASK-416.9 matchade just DENNA kropps
      // rad-för-rad-höjder, se `NastaEvent.tsx`s diff).
      const nastaEventKropp = page.locator('section[aria-labelledby="hem-nasta-event"] > div');

      // Senaste aktivitet — pending: FÖRSTA radens `<div>` i `role="status"`
      // (`SenasteAktivitetKompakt.tsx`s `[0,1,2,3].map`); laddat: FÖRSTA `<li>`.
      const senasteRadLaddar = page
        .locator('section[aria-labelledby="hem-senaste-aktivitet"] [role="status"] > div')
        .first();

      // Nya anmälningar/Förfallna betalningar — FÖRSTA RADEN (TASK-416.18):
      // pending: FÖRSTA skeleton-raden (`data-testid`, `NyaAnmalanSkeletonRad`/
      // `ForfallenSkeletonRad` — se resp. komponents docblock för anatomin);
      // laddat: FÖRSTA `<li>` i respektive sektions lista (`getByRole('listitem')`,
      // samma mönster som `senasteRadLaddad` nedan och som
      // `mer-maillogg-laddlage.acceptance.test.ts`/`mer-vantelista-laddlage.
      // acceptance.test.ts` redan etablerat för samma skeleton-familj).
      const nyaAnmRadLaddar = page.getByTestId('nya-anmalningar-skeleton-rad').first();
      const forfallnaRadLaddar = page.getByTestId('forfallna-skeleton-rad').first();

      const under = kravBoxar(
        {
          nastaEventH2: await nastaEventH2.boundingBox(),
          nastaEventKropp: await nastaEventKropp.boundingBox(),
          nyaAnmH2: await nyaAnmH2.boundingBox(),
          forfallnaH2: await forfallnaH2.boundingBox(),
          senasteH2: await senasteH2.boundingBox(),
          senasteRad: await senasteRadLaddar.boundingBox(),
          nyaAnmRad: await nyaAnmRadLaddar.boundingBox(),
          forfallnaRad: await forfallnaRadLaddar.boundingBox(),
        },
        'UNDER laddning',
      );

      mocken.slappAlla();

      // Datalandning klar: samtliga fyra containrar har lämnat isPending.
      await expect(page.locator('main#main').getByRole('status')).toHaveCount(0);
      await expect(page.getByText('2 nya anmälningar att bekräfta')).toBeVisible();
      await expect(page.getByText('2 förfallna betalningar')).toBeVisible();
      // Dubbel requestAnimationFrame — samma väntan som
      // `event-checkin-laddlage.acceptance.test.ts` (TASK-416.1) använder
      // innan sin EFTER-mätning: layouten ska ha hunnit bildrutan ut.
      await page.evaluate(
        () => new Promise((klar) => requestAnimationFrame(() => requestAnimationFrame(klar))),
      );

      const senasteRadLaddad = page
        .locator('section[aria-labelledby="hem-senaste-aktivitet"]')
        .getByRole('listitem')
        .first();
      const nyaAnmRadLaddad = page
        .locator('section[aria-labelledby="hem-nya-anmalningar"]')
        .getByRole('listitem')
        .first();
      const forfallnaRadLaddad = page
        .locator('section[aria-labelledby="hem-forfallna"]')
        .getByRole('listitem')
        .first();

      const efter = kravBoxar(
        {
          nastaEventH2: await nastaEventH2.boundingBox(),
          nastaEventKropp: await nastaEventKropp.boundingBox(),
          nyaAnmH2: await nyaAnmH2.boundingBox(),
          forfallnaH2: await forfallnaH2.boundingBox(),
          senasteH2: await senasteH2.boundingBox(),
          senasteRad: await senasteRadLaddad.boundingBox(),
          nyaAnmRad: await nyaAnmRadLaddad.boundingBox(),
          forfallnaRad: await forfallnaRadLaddad.boundingBox(),
        },
        'EFTER datalandning',
      );

      // MÄTNINGEN — exakt likhet (`toEqual`), ingen tolerans-marginal, för de
      // TRE block ingenting ANNAT på sidan förskjuter: Nästa event (första
      // sektionen, inget ovanför), Nya anmälningars EGEN rubrik (dess
      // innehåll växlar Skeleton→text, men h2-BOXEN är blockbredd × radhöjd i
      // BÅDA fallen, opåverkad av vad grannsektioner gör) och Nya anmälningars
      // EGEN första rad — den sitter DIREKT under h2:n (inget mellanliggande
      // element i vare sig pending- eller laddat läge, TASK-416.18) och
      // förskjuts därför inte av "Bekräfta alla"-knappen nedanför den.
      expect(efter.nastaEventH2).toEqual(under.nastaEventH2);
      expect(efter.nastaEventKropp).toEqual(under.nastaEventKropp);
      expect(efter.nyaAnmH2).toEqual(under.nyaAnmH2);
      expect(efter.nyaAnmRad).toEqual(under.nyaAnmRad);

      // Förfallna betalningars och Senaste aktivitets Y-koordinat förskjuts
      // MÄTT (+41px resp. +112px, mätt vid 1280 px — review-fynd runda 2:
      // talen är breddspecifika sedan testet parametriserades över
      // viewport-matrisen, assertionerna nedan använder ALDRIG dessa tal,
      // bara `utanY()`) av "Bekräfta alla"-knappen
      // som monteras under Nya anmälningars lista NÄR OCH ENDAST NÄR
      // `anmalningar.total > 0` blir känt — ett tillstånd som per definition
      // inte existerar förrän datat landat (`NyaAnmalningar.tsx`s sista gren).
      // Det är EXAKT samma orsak för Senaste aktivitet, plus Förfallna
      // betalningars EGEN "Skicka påminnelse till alla"-knapp OCH "Att
      // påminna"-underrubriken (`ForfallnaBetalningar.tsx`) som i sin tur
      // förskjuter allt UNDER den ytterligare. Detta är INGET regressions-fynd
      // — en flat, count-agnostisk skeleton kan strukturellt inte reservera
      // plats för en knapp/rubrik vars EXISTENS beror på en siffra skeletonen
      // per definition inte känner. `utanY()` isolerar den geometri som
      // FAKTISKT hör till "har DENNA sektions egen skeleton-storlek matchat
      // dess laddade storlek" — och det har den, för dessa rubriker och för
      // Senaste aktivitets rad.
      expect(utanY(efter.forfallnaH2)).toEqual(utanY(under.forfallnaH2));
      expect(utanY(efter.senasteH2)).toEqual(utanY(under.senasteH2));
      expect(utanY(efter.senasteRad)).toEqual(utanY(under.senasteRad));

      // Förfallna betalningars FÖRSTA RAD (TASK-416.18) ärver SAMMA
      // page-nivå-förskjutning som sin egen h2 (ovan) — PLUS en till: den
      // riktiga raden sitter under "Att påminna"-underrubriken (`<h3
      // id="hem-forfallna-paminna">`), ett element som INTE existerar i
      // pending-läget (den flata skeleton-containern har ingen gruppindelning
      // — antalet grupper är per definition okänt innan datat landat, samma
      // resonemang som knapparna ovan). Mätt vid 1280 px: 782→877 px, en
      // TREDJE, egen förskjutning utöver h2:ns +41 (breddspecifikt tal,
      // review-fynd runda 2 — vid övriga tre viewports i matrisen är
      // förskjutningen ett annat tal, av samma orsak). `utanY()` isolerar
      // även här bredd/höjd/vänsterkant — den geometri skeleton-fixen
      // FAKTISKT bevisar, oavsett vilket Y-tal förskjutningen råkar bli.
      expect(utanY(efter.forfallnaRad)).toEqual(utanY(under.forfallnaRad));

      // Rapporterbart spår per bredd (samma disciplin som Bevakningsradens
      // `test.info().annotations.push`, TASK-303): talen syns i Playwrights
      // rapport i stället för att bara vara en implicit bock.
      test.info().annotations.push({
        type: 'skeleton-radgeometri',
        description: JSON.stringify({
          viewport,
          nyaAnmRad: efter.nyaAnmRad,
          forfallnaRad: efter.forfallnaRad,
        }),
      });
    });
  }
});
