import { delay, http } from 'msw';
import type { z } from 'zod';
import type {
  ActivityStatementSchema,
  AttendanceSchema,
  RegistrationSchema,
} from '../../src/domain/schemas';
import { REQUEST_ID_EXTENSION_IRI, XAPI_IRI_BASE } from '../../src/domain/schemas';
import { EVENT_DETAIL_RESPONSE, VISUAL_EVENT_ID } from '../support/fixturvarld/fixture-data';
import { EF, json } from '../support/fixturvarld/handlers';
import { matCLSOverNavigering } from '../support/mat-cls';
import { expect, type Page, test } from './acceptance-bas';

/**
 * TASK-416.14 — CLS-grinden. `tests/support/mat-cls.ts` var en riktig
 * CLS-mätare (`PerformanceObserver('layout-shift')`) som bara användes på
 * `/dev/primitives`-demosidan; ingen fil under `tests/` mätte geometrin över
 * ladd-till-laddat-gränsen på en RIKTIG, autentiserad vy. Den här filen gör
 * det för de tre av PRD TASK-416:s fyra vyer som kan navigeras till
 * hermetiskt i dag: Check-in (416.1), Aktivitetshistorik (416.3) och
 * Anmälningar (416.4). Betalningsinkorgen (416.2) är MEDVETET UTESLUTEN — se
 * § BETALNINGSINKORGEN nedan.
 *
 * ── TRÖSKELN (AC #1) ─────────────────────────────────────────────────────
 *
 * web.dev/cls ("Cumulative Layout Shift (CLS)", Google Web Vitals) sätter
 * "good" vid CLS ≤ 0,1. `CLS_TROSKEL` nedan (0,05) lägger oss under den
 * branschstandarden med god marginal, i linje med husets golv-är-inte-tak-
 * princip (`~/.claude/CLAUDE.md` § "11/10 är GOLV, inte tak").
 *
 * ── VAD DENNA GRIND FAKTISKT MÄTER, OCH VAD DEN INTE KAN (mätt, inte
 *    antaget — läs innan du "förbättrar" tröskeln eller lägger till en vy) ──
 *
 * Sidans skal (`AppShell.tsx`) fäster `TabBar` med `position: fixed` — den
 * deltar ALDRIG i normalt dokumentflöde och kan därför ALDRIG knuffas av att
 * innehåll ovanför ändrar höjd. Samtliga tre vyers listkropp
 * (`dorrlista-skelettrad`/`aktivitetshistorik-skeleton-rad`/Anmälningars
 * `role=status`-kort) är dessutom det SISTA innehållet i sidträdet: när
 * `isPending` växlar till laddat UNMONTERAS hela skelett-subträdet och ett
 * HELT NYTT DOM-subträd monteras i dess ställe (samma nod-TYP skiftar,
 * `<div>` → `<ul>`), inte en resize av en kvarvarande nod.
 *
 * Webbläsarens Layout Instability-API räknar bara en "shift" för en nod som
 * EXISTERADE i föregående renderade bildruta OCH fortfarande existerar (bara
 * flyttad/omstorlekad) i den nuvarande — en nod som helt UNMONTERAS och en
 * helt ANNAN nod som monteras i dess ställe registrerar ALDRIG en shift för
 * NÅGON av dem, och ingenting nedanför (TabBar är `fixed`) finns att knuffa.
 * DÄRFÖR ÄR EN RAD LISTKROPPENS EGEN skelett-vs-laddad-GEOMETRI (typexemplet:
 * `EventCheckin.tsx`s tidigare `gap-1`-bugg, se dess docblock) STRUKTURELLT
 * OSYNLIG för en sid-nivå CLS-mätning på just dessa tre vyer — MÄTT
 * (verifierat 2026-09-06): en 2000 px `minHeight` medvetet injicerad i
 * `EventCheckin.tsx`s skelettcontainer, körd och sedan återställd, gav
 * BIT-IDENTISK CLS (`0.00005029601520962185`) mot en orörd byggnad. Den
 * regressionsklassen bevakas i stället, precist och deterministiskt, av
 * VARJE vys egna `*-laddlage.acceptance.test.ts` (boundingBox `toEqual`
 * före/efter datalandning, task 416.1/416.3/416.4) — DEN filklassen
 * ersätts inte av denna.
 *
 * VAD GRINDEN FAKTISKT ÄR KÄNSLIG FÖR (samma mätning, samma dag): varje
 * element som ÖVERLEVER hela isPending→laddat-övergången SOM SAMMA NOD —
 * `h1`, `FramstegskortD` (Check-in), `FilterRad` (Aktivitetshistorik) —
 * eftersom en storleksändring HOS DEM knuffar vad som än råkar stå under dem
 * i just det ögonblicket. Verifierat med en avsiktlig regression i
 * `FramstegskortD` (en `style={{ height: 2000 }}` medan `isPending`, samma
 * scratch-återställda teknik som ovan): "Check-in mobil 390×844" gick
 * DETERMINISTISKT rött (`0.05173770879479808 > 0,05`, bit-identiskt över två
 * oberoende körningar) medan "Check-in desktop 1280×720" förblev grönt vid
 * SAMMA regression — väntat, inte ett testfel: CLS:s impact-andel är
 * viewport-RELATIV (samma absoluta pixelknuff väger tyngre i en mindre
 * viewport-yta), så en regression kan mycket väl slå igenom på en bredd men
 * inte en annan. Det är AC #3:s tvåsidiga bevis — applicerat MANUELLT, KÖRT
 * (rött, talet ovan, två gånger), ÅTERSTÄLLT via `git checkout -- <fil>`
 * (aldrig `git stash`, se `~/.claude/CLAUDE.md` § Landning) och bekräftat
 * grönt igen (talen i tabellen ovan, oförändrade), INTE en permanent
 * testfil: en permanent, avsiktligt trasig testfil hade fällt denna PR:s
 * egen CI. Mindre regressioner (`height: 300/600/700/1000`) prövades också
 * under samma pass och gav en ICKE-monoton, men alltid REPRODUCERBAR PER
 * VÄRDE, gränstrakt (300→grönt, 600→0,0566, 700→grönt, 1000→0,0517,
 * identiskt med 2000) — trolig orsak är Chromes egen "session window"-
 * gruppering av flera separata shifts (listans egen swap + FramstegskortD:s
 * knuff inträffar inte nödvändigtvis i EXAKT samma bildruta), inte ett fel i
 * mätinstrumentet. `height: 2000` valdes för denna PR:s bevis just för att
 * det låg stabilt, upprepat över tröskeln, i stället för i den gränstrakten.
 *
 * Grinden är alltså INTE dekorativ: den bevakar regeln PRD TASK-416
 * faktiskt uttrycker ("sidkromet renderas i alla tillstånd") på RÄTT nivå —
 * att sidkromet SJÄLVT aldrig hoppar när listkroppen bakom det byter skepnad
 * — vilket är en ANNAN, komplementär invariant till "skelettraden har exakt
 * samma yttermått som den laddade raden". Båda behövs; ingen ersätter den
 * andra.
 *
 * ── BETALNINGSINKORGEN (utesluten ur matrisen) ──────────────────────────
 *
 * Kan inte navigeras till hermetiskt i denna skiva: `playwright.config.ts`
 * hårdkodar `VITE_FEATURE_BETALNINGAR: 'av'` för acceptance/visual/
 * webblasarbeteende-dev-servern (se kommentaren vid den raden), och
 * `betalningar.tsx`s `beforeLoad` redirectar till `/mer` när flaggan är av.
 * Samma öppna yta som forskningsgrenen `task/409-hermetisk-betalningsvarld`
 * (TASK-409, Supabase Realtime hermetiskt). `hamta-oppna-betalningar`-
 * handlern finns ändå registrerad i fixturvärlden (AC #2, förberedd
 * infrastruktur) — se `handlers.ts` och `fixture-data.ts` §
 * OPPNA_BETALNINGAR_RESPONSE för hela motiveringen.
 *
 * ── VIEWPORTS ────────────────────────────────────────────────────────────
 *
 * Desktop 1280×720 (samma som `devices['Desktop Chrome']`, projektets
 * default) och mobil 390×844 (husets etablerade mobil-viewport, se t.ex.
 * `anmalan-detalj.acceptance.test.ts`, `mat-cls.ts`s egna
 * webblasarbeteende-användare).
 *
 * ── VARFÖR `delay()` OCH INTE EN HÅLL-BAR MOCK ──────────────────────────
 *
 * Husets etablerade "håll obesvarat tills testet släpper"-mönster
 * (`hallbarMock`, se t.ex. `event-checkin-laddlage.acceptance.test.ts`)
 * finns för att undvika `TASK-3`-klassens FASTA TIDSFÖNSTER-flak — där ett
 * test antog "svaret har INTE hunnit landa vid tidpunkt T" och racade mot
 * verklig belastning. Den här filen gör ALDRIG ett sådant antagande: varje
 * assertion väntar in sitt sluttillstånd (Playwrights egen retry-loop),
 * aldrig en fast tidpunkt. `delay(700)` (mitten av uppdragets 600–800 ms)
 * används bara för att GARANTERA att skelettet hinner måla minst en bildruta
 * innan svaret landar — exakt samma, redan etablerade `msw`-idiom som
 * `mer-aktivitetshistorik-laddlage.acceptance.test.ts`s andra test.
 *
 * ── MÄTTA TAL (körning 2026-09-06, samtliga sex testfall gröna) ─────────
 *
 * | Vy                 | Desktop 1280×720        | Mobil 390×844           |
 * |---------------------|-------------------------|-------------------------|
 * | Check-in            | 0.00005029601520962185  | 0.00016544980087904352  |
 * | Aktivitetshistorik  | 0.00003987630208333333  | 0.01482668511841718     |
 * | Anmälningar         | 0                       | 0                       |
 *
 * Samtliga långt under `CLS_TROSKEL` (0,05). Aktivitetshistoriken på mobil
 * (0,0148) sticker ut mot sina syskon — trolig källa är `FilterRad`s
 * kontroller som radbryter annorlunda vid 390 px — men ligger ändå med god
 * marginal under tröskeln; ingen åtgärd vidtagen på grund av den, bara
 * bokförd.
 */
const CLS_TROSKEL = 0.05;
const DESKTOP = { width: 1280, height: 720 } as const;
const MOBIL = { width: 390, height: 844 } as const;

// ─── Check-in (416.1) ───────────────────────────────────────────────────

const EVENT_ID = VISUAL_EVENT_ID;
type RegRow = z.infer<typeof RegistrationSchema>;
type AttRow = z.infer<typeof AttendanceSchema>;

function reg(overrides: Partial<RegRow> = {}): RegRow {
  return {
    id: 'recClsAnm0001',
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
    personId: 'recClsPers0001',
    ...overrides,
  };
}

function att(overrides: Partial<AttRow> = {}): AttRow {
  return {
    id: 'recClsDelt0001',
    anmalanId: 'recClsAnm0001',
    eventId: EVENT_ID,
    personId: 'recClsPers0001',
    personNamn: 'Alma Almqvist',
    session: 'Dag 1',
    status: 'Ej avstämt',
    noteringar: null,
    avstamt: null,
    ...overrides,
  };
}

function mockaCheckin(): ReturnType<typeof http.get>[] {
  return [
    http.get(EF('get-event'), async () => {
      await delay(700);
      return json(EVENT_DETAIL_RESPONSE);
    }),
    http.get(EF('get-attendance'), async () => {
      await delay(700);
      return json({ attendance: [att()] });
    }),
    http.get(EF('get-registrations'), async () => {
      await delay(700);
      return json({ registrations: [reg()] });
    }),
  ];
}

async function vantaCheckinKlar(p: Page) {
  await expect(p.getByTestId('dorrlista-skelettrad').first()).toBeVisible();
  await expect(p.getByText('Alma Almqvist')).toBeVisible();
  await expect(p.getByTestId('dorrlista-skelettrad')).toHaveCount(0);
}

// ─── Aktivitetshistorik (416.3) ─────────────────────────────────────────

type Statement = z.infer<typeof ActivityStatementSchema>;
let idCounter = 0;
function testUuid(): string {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
}

function statement({
  objectName,
  timestamp,
}: {
  objectName: string;
  timestamp: string;
}): Statement {
  return {
    id: testUuid(),
    actor: {
      objectType: 'Agent',
      name: 'Lotta',
      account: { homePage: XAPI_IRI_BASE, name: testUuid() },
    },
    verb: { id: `${XAPI_IRI_BASE}/verbs/test-verb`, display: { 'sv-SE': 'markerade betalning' } },
    object: {
      objectType: 'Activity',
      id: `${XAPI_IRI_BASE}/objects/registrations/rec-cls-${idCounter}`,
      definition: {
        name: { 'sv-SE': objectName },
        type: `${XAPI_IRI_BASE}/activity-types/betalning`,
      },
    },
    context: { extensions: { [REQUEST_ID_EXTENSION_IRI]: testUuid() } },
    timestamp,
  } satisfies Statement;
}

function mockaAktivitetshistorik(): ReturnType<typeof http.get>[] {
  return [
    http.get(EF('get-activity-log'), async () => {
      await delay(700);
      return json({
        statements: [
          statement({ objectName: 'CLS-mätningens post', timestamp: '2026-09-01T10:00:00.000Z' }),
        ],
        nextCursor: null,
        total: 1,
      });
    }),
  ];
}

async function vantaAktivitetshistorikKlar(p: Page) {
  await expect(p.getByTestId('aktivitetshistorik-skeleton-rad').first()).toBeVisible();
  await expect(p.getByText('CLS-mätningens post')).toBeVisible();
  await expect(p.getByTestId('aktivitetshistorik-skeleton-rad')).toHaveCount(0);
}

// ─── Anmälningar (416.4) ────────────────────────────────────────────────

function mockaAnmalningar(): ReturnType<typeof http.get>[] {
  return [
    http.get(EF('get-registrations'), async () => {
      await delay(700);
      return json({
        registrations: [
          reg({
            id: 'recClsAnmGlobal01',
            fornamn: 'Beata',
            efternamn: 'Berg',
            personId: 'recClsPers0002',
          }),
        ],
      });
    }),
  ];
}

async function vantaAnmalningarKlar(p: Page) {
  await expect(p.getByText('Laddar anmälningarna', { exact: false })).toBeAttached();
  await expect(p.getByText('Beata Berg')).toBeVisible();
  await expect(p.getByText('Laddar anmälningarna', { exact: false })).not.toBeAttached();
}

// ─── Testerna (AC #1, AC #4) ────────────────────────────────────────────

test.describe('CLS-grinden — laddning utan hopp (TASK-416.14)', () => {
  test.describe('Check-in (416.1)', () => {
    test('desktop 1280×720', async ({ page, network }) => {
      network.use(...mockaCheckin());
      const cls = await matCLSOverNavigering(
        page,
        DESKTOP,
        `/event/${EVENT_ID}/narvaro`,
        vantaCheckinKlar,
      );
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });

    test('mobil 390×844', async ({ page, network }) => {
      network.use(...mockaCheckin());
      const cls = await matCLSOverNavigering(
        page,
        MOBIL,
        `/event/${EVENT_ID}/narvaro`,
        vantaCheckinKlar,
      );
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });
  });

  test.describe('Aktivitetshistorik (416.3)', () => {
    test('desktop 1280×720', async ({ page, network }) => {
      network.use(...mockaAktivitetshistorik());
      const cls = await matCLSOverNavigering(
        page,
        DESKTOP,
        '/mer/aktivitetshistorik',
        vantaAktivitetshistorikKlar,
      );
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });

    test('mobil 390×844', async ({ page, network }) => {
      network.use(...mockaAktivitetshistorik());
      const cls = await matCLSOverNavigering(
        page,
        MOBIL,
        '/mer/aktivitetshistorik',
        vantaAktivitetshistorikKlar,
      );
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });
  });

  test.describe('Anmälningar (416.4)', () => {
    test('desktop 1280×720', async ({ page, network }) => {
      network.use(...mockaAnmalningar());
      const cls = await matCLSOverNavigering(
        page,
        DESKTOP,
        '/mer/anmalningar',
        vantaAnmalningarKlar,
      );
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });

    test('mobil 390×844', async ({ page, network }) => {
      network.use(...mockaAnmalningar());
      const cls = await matCLSOverNavigering(page, MOBIL, '/mer/anmalningar', vantaAnmalningarKlar);
      expect(cls).toBeLessThan(CLS_TROSKEL);
    });
  });
});
