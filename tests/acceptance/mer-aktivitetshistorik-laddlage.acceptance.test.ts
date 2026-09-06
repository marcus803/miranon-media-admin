import AxeBuilder from '@axe-core/playwright';
import type { NetworkFixture } from '@msw/playwright';
import { delay, http } from 'msw';
import type { z } from 'zod';
import type { ActivityStatementSchema } from '../../src/domain/schemas';
import { REQUEST_ID_EXTENSION_IRI, XAPI_IRI_BASE } from '../../src/domain/schemas';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, type Page, test } from './acceptance-bas';

/**
 * TASK-416.3 — FilterRad monterad ÄVEN i isPending, kontrollerna isDisabled
 * tills kärnvyns data finns (PRD TASK-416: sidkromet — h1, filterrad —
 * renderas i ALLA query-tillstånd, bara listkroppen växlar; ADR-113
 * laddtrappan). Denna fil äger TVÅ separata bevis:
 *
 * 1. AC #1 — kontrollerna i FilterRad är faktiskt inerta (`disabled`/
 *    `data-disabled`) medan `isPending`, OCH fokus-beteendet den ursprungliga
 *    komponent-kommentaren (rad ~454–459 före denna skiva) skyddade är
 *    OFÖRÄNDRAT: ett val i en dropdown FÖRBLIR monterad och aktiverad genom
 *    ett efterföljande filterbyte (`keepPreviousData` håller `isPending`
 *    `false` vid varje refetch efter den första — se
 *    `useActivityLog.ts`), och tappar aldrig fokus under sig själv.
 * 2. AC #2 — MÄTNING: boundingBox på `<h1>`, FilterRad och FÖRSTA LISTRADEN
 *    är IDENTISK (`toEqual`, exakt) före och efter datalandning. Mätt med en
 *    HÅLL-BAR MOCK (`hem-laddlage.acceptance.test.ts`s mönster: `get-activity-
 *    log`-svaret parkeras obesvarat tills testet explicit släpper det) —
 *    detta är den enda tillförlitliga vägen att observera isPending-grenen
 *    deterministiskt (normallägets EF-svar är annars för snabbt för att
 *    hinna mäta före datalandning).
 *
 * FYNDET SOM STYRDE IMPLEMENTATIONEN (mätt, inte antaget): en FÖRSTA version
 * av denna skiva monterade FilterRad i isPending men lämnade `LaddLage`s
 * inre struktur orörd (en enda platshållarrad ovanför kort-containern). Det
 * gav en 29 px Y-avvikelse på FÖRSTA RADEN mellan isPending och laddat läge
 * — den laddade grenen bär EN EXTRA statusrad ("Visar N poster.") OCH en
 * per-grupp `<h2>` som `LaddLage`s enda platshållarrad inte reserverade
 * utrymme för, plus en `gap-1` i skeleton-radens textkolumn som
 * `AktivitetsRad.tsx`s riktiga textkolumn saknar (radhöjd 67 px mot 64 px).
 * `LaddLage` (AktivitetsHistorik.tsx) omstrukturerades till en Fragment med
 * BÅDA platshållarna på rätt nivå — se dess eget filhuvud för den fulla
 * geometrikedjan.
 *
 * `get-events` LIGGER I NORMALLÄGET (`handlers.ts`) — event-dropdownens
 * `eventerLaddar` är en OBEROENDE källa till disabled och rör sig inte
 * denna fils ärende (se `FilterRad`s eget filhuvud för OR-logiken).
 */

type Statement = z.infer<typeof ActivityStatementSchema>;

let idCounter = 0;
/** Deterministisk v4-formad UUID (Zod `.uuid()` kräver giltig UUID-form) —
 * speglar `mer-aktivitetshistorik.acceptance.test.ts`s identiska hjälpare. */
function testUuid(): string {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
}

function minuterSedan(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

/** Ett komplett xAPI-statement som passerar ActivityStatementSchema (trimmad
 * kopia, samma isolering som sviterna ovan väljer). */
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
      id: `${XAPI_IRI_BASE}/objects/registrations/rec-test-${idCounter}`,
      definition: {
        name: { 'sv-SE': objectName },
        type: `${XAPI_IRI_BASE}/activity-types/betalning`,
      },
    },
    context: { extensions: { [REQUEST_ID_EXTENSION_IRI]: testUuid() } },
    timestamp,
  } satisfies Statement;
}

/** Håll-bar mock (`hem-laddlage.acceptance.test.ts`s mönster, task-4.5-
 * ursprunget): `get-activity-log`-anropet PARKERAS obesvarat tills
 * `slappAlla()` anropas — isPending-grenen står deterministiskt tills
 * testet väljer att lämna den, i stället för att kapplöpa mot ett svar som
 * kan hinna landa innan mätningen sker. */
function hallbarMock(network: NetworkFixture) {
  const st = {
    parkerade: [] as Array<() => void>,
    slappAlla() {
      for (const slapp of this.parkerade.splice(0)) slapp();
    },
  };
  network.use(
    http.get(EF('get-activity-log'), async () => {
      await new Promise<void>((slapp) => st.parkerade.push(slapp));
      return json({
        statements: [statement({ objectName: 'Ofiltrerad post', timestamp: minuterSedan(1) })],
        nextCursor: null,
        total: 1,
      });
    }),
  );
  return st;
}

async function boxa(page: Page, testid: string) {
  const box = await page.getByTestId(testid).first().boundingBox();
  if (!box) throw new Error(`boundingBox saknas för ${testid}`);
  return box;
}

test.describe('Aktivitetshistoriken — laddläget bär FilterRad (TASK-416.3)', () => {
  test('AC #1 — FilterRad renderas i isPending med SAMTLIGA kontroller isDisabled', async ({
    page,
    network,
  }) => {
    hallbarMock(network);
    await page.goto('/mer/aktivitetshistorik');

    // isPending-grenen: skeleton-raderna är den entydiga signalen (normal-
    // lägets svar är parkerat, kan aldrig landa och slå om till den andra
    // grenen under testet).
    await expect(page.getByTestId('aktivitetshistorik-skeleton-rad').first()).toBeVisible();

    const filterrad = page.getByTestId('aktivitetshistorik-filterrad');
    await expect(filterrad).toBeVisible();

    // Kategori/Event-Selecten (RAC): `isDisabled` renderas som ett NATIVT
    // `disabled`-attribut på trigger-knappen — Playwrights `toBeDisabled()`
    // läser exakt det.
    await expect(filterrad.getByRole('button', { name: 'Kategori' })).toBeDisabled();
    await expect(filterrad.getByRole('button', { name: 'Event' })).toBeDisabled();

    // Tidsperiod-ToggleButtonGroupen: varje pill är en egen `<button
    // role="radio">`, disabled-tillståndet syns per knapp OCH som
    // `data-disabled` på grupp-containern (ToggleButtonGroup.tsx:s
    // `itemVariants`/`data-[disabled]`-golv).
    const tidsperiodGrupp = filterrad.getByRole('radiogroup', { name: 'Tidsperiod' });
    await expect(tidsperiodGrupp).toHaveAttribute('data-disabled', 'true');
    await expect(filterrad.getByRole('radio', { name: 'Allt' })).toBeDisabled();
    await expect(filterrad.getByRole('radio', { name: 'Idag' })).toBeDisabled();

    // DatumFalt (RAC DateRangePicker): `isDisabled` propagerar `data-disabled`
    // till `Group`-wrappern (RAC-mekanik, DatumFalt.tsx:s nya prop).
    const datumGrupp = filterrad.getByRole('group');
    await expect(datumGrupp).toHaveAttribute('data-disabled', 'true');
  });

  test('AC #1 — fokus-beteendet oförändrat: FilterRad förblir monterad och AKTIVERAD (ej isDisabled) genom ett efterföljande filterbyte, ett dropdown-val tappar aldrig fokus', async ({
    page,
    network,
  }) => {
    // FÖRSTA hämtningen svarar direkt (normal `isPending` → laddat, ingen
    // håll-bar mock behövs här) — det är EFTERFÖLJANDE filterbyten som ska
    // bevisas ALDRIG trigga isPending igen (`keepPreviousData`,
    // useActivityLog.ts). Den FILTRERADE grenen fördröjs medvetet: utan en
    // riktig fördröjning kunde svaret hinna landa innan assertionen läses,
    // och testet hade bevisat sin egen tur snarare än `keepPreviousData`.
    network.use(
      http.get(EF('get-activity-log'), async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('category') === `${XAPI_IRI_BASE}/activity-types/betalning`) {
          await delay(400);
          return json({
            statements: [statement({ objectName: 'Betalning-post', timestamp: minuterSedan(1) })],
            nextCursor: null,
          });
        }
        return json({
          statements: [statement({ objectName: 'Ofiltrerad post', timestamp: minuterSedan(1) })],
          nextCursor: null,
        });
      }),
    );

    await page.goto('/mer/aktivitetshistorik');
    await expect(page.getByText('Ofiltrerad post')).toBeVisible();

    const kategoriTrigger = page.getByRole('button', { name: 'Kategori' });
    await kategoriTrigger.click();
    await page.getByRole('option', { name: 'Betalning' }).click();

    // MITT I den 400 ms-fördröjda hämtningen (Betalning-post har INTE
    // landat än — OMEDELBAR, icke-återförsökande avläsning, speglar
    // `mer-aktivitetshistorik-filter.acceptance.test.ts`s identiska mönster
    // för samma bevisklass): FilterRad-testid:t är fortfarande där, kategori-
    // triggern är INTE disabled (isPending blev aldrig sant) och har KVAR
    // fokus efter valet (RAC återför fokus till triggern när popovern
    // stänger — tappas det hade det synts här).
    const filterradSynligMittIFlodet = await page
      .getByTestId('aktivitetshistorik-filterrad')
      .isVisible();
    const kategoriDisabledMittIFlodet = await kategoriTrigger.isDisabled();
    const kategoriFokuseradMittIFlodet = await kategoriTrigger.evaluate(
      (el) => el === document.activeElement,
    );
    const gammalPostKvarMittIFlodet = await page.getByText('Ofiltrerad post').isVisible();
    const laddLageSynligtMittIFlodet = await page
      .getByTestId('aktivitetshistorik-skeleton-rad')
      .count();

    expect(filterradSynligMittIFlodet).toBe(true); // aldrig unmountad
    expect(kategoriDisabledMittIFlodet).toBe(false); // isPending blev ALDRIG sant igen
    expect(kategoriFokuseradMittIFlodet).toBe(true); // fokus tappat INTE under valet
    expect(gammalPostKvarMittIFlodet).toBe(true); // keepPreviousData — gammal data orörd
    expect(laddLageSynligtMittIFlodet).toBe(0); // ingen flimrande LaddLage

    await expect(page.getByText('Betalning-post')).toBeVisible();
    await expect(kategoriTrigger).not.toBeDisabled();
  });

  test('AC #2 — MÄTNING: boundingBox på h1, FilterRad och första listraden är IDENTISK före och efter datalandning', async ({
    page,
    network,
  }) => {
    const st = hallbarMock(network);
    await page.goto('/mer/aktivitetshistorik');
    await expect(page.getByTestId('aktivitetshistorik-skeleton-rad').first()).toBeVisible();

    const h1Pending = await page.getByRole('heading', { level: 1 }).boundingBox();
    const filterPending = await boxa(page, 'aktivitetshistorik-filterrad');
    const radPending = await boxa(page, 'aktivitetshistorik-skeleton-rad');
    if (!h1Pending) throw new Error('h1 saknar boundingBox i isPending');

    st.slappAlla();
    await expect(page.getByText('Ofiltrerad post')).toBeVisible();

    const h1Loaded = await page.getByRole('heading', { level: 1 }).boundingBox();
    const filterLoaded = await boxa(page, 'aktivitetshistorik-filterrad');
    const radLoaded = await page.getByRole('listitem').first().boundingBox();
    if (!h1Loaded) throw new Error('h1 saknar boundingBox i laddat läge');
    if (!radLoaded) throw new Error('första listraden saknar boundingBox i laddat läge');

    // EXAKT likhet (toEqual) — MÄTNING ÄR LEVERANS, ingen tolerans-marginal.
    expect(h1Loaded).toEqual(h1Pending);
    expect(filterLoaded).toEqual(filterPending);
    expect(radLoaded).toEqual(radPending);
  });

  test('axe 0 violations i isPending (FilterRad synlig och disabled)', async ({
    page,
    network,
  }) => {
    hallbarMock(network);
    await page.goto('/mer/aktivitetshistorik');
    await expect(page.getByTestId('aktivitetshistorik-skeleton-rad').first()).toBeVisible();
    await expect(page.getByTestId('aktivitetshistorik-filterrad')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
