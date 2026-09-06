import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '../support/test-bas';
import { mockValjarLista, valjarRad } from './helpers/valjar-lista';

/**
 * TASK-367 — "kvitto att skicka" härleds ur Postgres, inte flikens minne.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FYNDET (S115 Del 2, 2026-09-03)
 * ═══════════════════════════════════════════════════════════════════════════
 * Marcus registrerade en inbetalning i prod, bytte flik, och raden var borta
 * ur betalningsinkorgen. Inkorgens serverfunktion listar bara anmälningar med
 * `Saknas (kr) > 0`; betalningen täckte hela priset, så raden föll ur
 * listan. Listan över väntande kvitton ("Skicka N kvitton") byggdes samtidigt
 * enbart av React-state (`vantande`, riven med fliken) — ingen mail gick,
 * men ingenting i appen visade det längre.
 *
 * DENNA SVIT BEVISAR ATT DET INTE LÄNGRE HÄNDER: en fullbetald anmälan med
 * en aktiv inbetalning som saknar kvitto och köad jobbrad SKA visas i den nya
 * "Kvitto att skicka"-sektionen (`hamta-oppna-betalningar/index.ts` §
 * "KVITTO ATT SKICKA", `OppenBetalning.oskickadeKvitton`) — helt oberoende av
 * om DENNA fliken registrerade betalningen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR EN FÄRSK SIDLADDNING ÄR SAMMA BEVIS SOM "BYTTE FLIK OCH LADDADE OM"
 * ═══════════════════════════════════════════════════════════════════════════
 * `registrerade`/`vantande` (`BetalningsInkorg.tsx`s React-state) är TOMMA
 * vid varje mount, oavsett om det beror på en `page.reload()` eller på att
 * sidan aldrig besökts i denna flik. Att mocka EF-svaret med en redan
 * "orphanad" rad (registrerad NÅGON ANNANSTANS, aldrig skickad) och sedan
 * ladda sidan är därför STRUKTURELLT samma test som "registrera, byt flik,
 * ladda om" — och billigare: ingen riktig Postgres-skrivning krävs för att
 * bevisa KLIENTENS härledning. Den explicita `page.reload()` i andra testet
 * finns för att namnge scenariot ordagrant, inte för att den tillför en
 * annan bevisbörda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TVÅSIDIGT — RÖTT MOT DEN GAMLA HÄRLEDNINGEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Mot koden FÖRE denna skiva finns varken `section[aria-label="Kvitto att
 * skicka"]` eller `OppenBetalning.oskickadeKvitton` — mocken skulle ha
 * levererat ett fält den gamla klienten aldrig läser, och sektionens
 * `toBeVisible()`-assertion hade timeoutat rött. Kontrollerat: `git stash`
 * (repots eget "kör aldrig" — se `CLAUDE.md` § AFK-regeln) är inte vägen;
 * i stället kördes denna fil mot den FÖREGÅENDE commiten
 * (`git checkout HEAD -- <ändrade filer>`, körning, återställning) — se
 * PR-kroppens Verifiering-avsnitt för resultatet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MEDVETET UTANFÖR DENNA SVITS RÄCKVIDD
 * ═══════════════════════════════════════════════════════════════════════════
 * Hem-kortets räkning ("K kvitton att skicka") — `BetalningarKort`, den yta
 * PRD TASK-346 § Inkorgen beskriver, är RIVEN (Marcus dom 2026-09-01,
 * `Hem.tsx` § "4. FÖRFALLNA BETALNINGAR"). Det talet existerar därför inte
 * någonstans i appen i dag, oberoende av denna skiva — se PR-kroppens
 * Divergens-avsnitt.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';
const KOA_KVITTON = '**/functions/v1/koa-kvitton';
const HAMTA_JOBBSTATUS = '**/functions/v1/hamta-jobbstatus*';

const EVENT_ID = 'recTASK367EVENT01';
const ANMALAN_ID = 'recTASK367ANMALN1';
const INBETALNING_ID = 'a1b2c3d4-0367-4367-8367-000000000001';
const JOBB_ID = 'a1b2c3d4-0367-4367-8367-000000000002';

type Json = Record<string, unknown>;

/**
 * En anmälan som är FULLBETALD (`saknas: 0`) men bär ETT oskickat kvitto —
 * exakt fyndets scenario. `oskickadeKvitton` är fältet EF:en härleder ur
 * Postgres (`hamta-oppna-betalningar/index.ts` § "KVITTO ATT SKICKA");
 * `kvittonAttSkicka` (kö-talet, redan köat) är MEDVETET 0 — ingen har
 * tryckt "Skicka" än, det är precis vad testet bevisar.
 */
function fullbetaldMedOskickatKvitto(overrides: Json = {}): Json {
  return {
    anmalanRecordId: ANMALAN_ID,
    personNamn: 'Task367 Testsson',
    personEpost: null,
    personTelefon: null,
    eventId: EVENT_ID,
    eventNamn: 'Task367-kurs',
    eventStartdatum: '2099-06-01',
    eventTyp: 'Utbildning',
    anmalanStatus: 'Bekräftad (mail skickat)',
    saknas: 0,
    gallandePris: 500,
    anmalningsavgift: null,
    summaInbetalt: 500,
    summaInbetaltSpegel: 500,
    spegelIFas: true,
    deadlineSlutbetalning: null,
    kvittonAttSkicka: 0,
    oskickadeKvitton: [{ inbetalningId: INBETALNING_ID, belopp: 500 }],
    ...overrides,
  };
}

/**
 * Mockar precis den yta `/mer/betalningar` läser för detta scenario:
 * eventväljaren, listan och kvittokön. `radLista` är en FUNKTION (inte en
 * array) så ett test kan byta ut svaret MELLAN sidladdningar utan att
 * registrera en ny route.
 */
async function mocka(page: Page, radLista: () => Json[]): Promise<{ koadeIds: string[] }> {
  await mockValjarLista(page, [
    valjarRad({ id: EVENT_ID, namn: 'Task367-kurs', startdatum: '2099-06-01' }),
  ]);

  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: radLista(), forfallna: 0 }),
    });
  });

  const utfall = { koadeIds: [] as string[] };

  await page.route(KOA_KVITTON, async (route: Route) => {
    const body = route.request().postDataJSON() as { inbetalningIds: string[] };
    utfall.koadeIds = body.inbetalningIds;
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

  // `hamta-jobbstatus` anropas så fort `jobbId` sätts (efter `koa-kvitton`s
  // svar) — ett tomt-men-giltigt svar räcker, testet mäter INTE
  // sändningsutfallets rendering (det är `betalningar-inkorg-
  // utskicksflode.staging.test.ts`s räckvidd).
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

  return utfall;
}

test.describe('TASK-367 — kvitto att skicka härleds ur Postgres, inte flikens minne', () => {
  test('en anmälan utan denna flikens registrerings-historik syns i "Kvitto att skicka" — INTE i "Registrerat nu" — och "Skicka N kvitton" bygger sin lista ur samma härledning', async ({
    page,
  }) => {
    const utfall = await mocka(page, () => [fullbetaldMedOskickatKvitto()]);
    await page.goto('/mer/betalningar');

    // DEN GAMLA MEKANISMEN HAR INGENTING ATT VISA. `RegistreratNuBlock`s
    // underlag (`registrerade`) är session-state och tomt på en FÄRSK
    // sidladdning — blocket returnerar `null` (dess egen tidiga return).
    // Det ÄR precis symptomet TASK-367 fångar: en rad som bara fanns i
    // flikens minne existerar inte här.
    await expect(page.locator('section[aria-label="Registrerat nu"]')).toHaveCount(0);

    // DEN NYA, DURABLA SEKTIONEN VISAR RADEN.
    const block = page.locator('section[aria-label="Kvitto att skicka"]');
    await expect(block).toBeVisible();
    await expect(block.getByText('Task367 Testsson')).toBeVisible();
    const knapp = block.getByRole('button', { name: 'Skicka 1 kvitto' });
    await expect(knapp).toBeVisible();

    const axeResultat = await new AxeBuilder({ page })
      .include('section[aria-label="Kvitto att skicka"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeResultat.violations).toEqual([]);

    // "SKICKA N KVITTON" BYGGER SIN LISTA UR SAMMA HÄRLEDNING (kortets egen
    // beslutsgrund): knappen ska köa EXAKT den `inbetalningId` EF:en
    // levererade i `oskickadeKvitton`, aldrig en session-lokal gissning.
    await knapp.click();
    await expect.poll(() => utfall.koadeIds).toEqual([INBETALNING_ID]);
  });

  test('flikbyte/omladdning tappar aldrig raden', async ({ page }) => {
    await mocka(page, () => [fullbetaldMedOskickatKvitto()]);
    await page.goto('/mer/betalningar');
    await expect(page.locator('section[aria-label="Kvitto att skicka"]')).toBeVisible();

    // OMLADDNING — fyndets ordagranna scenario (S115 Del 2): "bytte flik".
    // Sidan monteras om från noll: `registrerade`/`vantande` initieras tomma
    // igen (`useState<[]>([])`). Framgången är att sektionen ÄNDÅ finns
    // kvar, eftersom den läser EF:ens Postgres-svar, aldrig React-state.
    await page.reload();
    const block = page.locator('section[aria-label="Kvitto att skicka"]');
    await expect(block).toBeVisible();
    await expect(block.getByText('Task367 Testsson')).toBeVisible();
    await expect(block.getByRole('button', { name: 'Skicka 1 kvitto' })).toBeVisible();
  });
});
