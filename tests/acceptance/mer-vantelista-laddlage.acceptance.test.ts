import type { NetworkFixture } from '@msw/playwright';
import { http } from 'msw';
import type { z } from 'zod';
import type { WaitlistEntrySchema } from '../../src/domain/schemas';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, type Page, test } from './acceptance-bas';

/**
 * TASK-416.17 — Väntelista-skeletonens radanatomi (review-fynd PR #2397,
 * S123): efter TASK-416.9:s gap-6-fix kvarstod ett 225 px skift vid SAMMA
 * radantal (3 mot 3) mellan `isPending`-skelettet och det laddade läget —
 * Skeleton-primitivens `listRow` är ett generiskt `h-[3lh]`-block, medan
 * `WaitlistRow` (InitialAvatar + namn + `dl` med `pl-12` och fyra fältrader)
 * är väsentligt högre. `WaitlistSkeletonRow` (Waitlist.tsx) ger skelettraden
 * EXAKT samma yttre klasser, avatar-cirkel (fast `size-9`-höjd), namnrad och
 * fyra fältplatshållare som `WaitlistRow`.
 *
 * MÄTNING ÄR LEVERANS (AC #1/#2): boundingBox på rubriken OCH första
 * listraden är IDENTISK (`toEqual`, ±0 px) före och efter datalandning.
 * Håll-bar mock (samma mönster som `mer-aktivitetshistorik-laddlage.
 * acceptance.test.ts` och `mer-vantelista.acceptance.test.ts`s
 * `manualRelease`): `get-waitlist`-svaret PARKERAS obesvarat tills testet
 * explicit släpper det — isPending-grenen står deterministiskt tills
 * mätningen är tagen.
 *
 * Rubrik-skelettet bär INGEN egen breddklass (Skeleton-primitivens default
 * `w-full`, se `Waitlist.tsx`s isPending-kommentar): `toEqual` jämför HELA
 * boxen (x/y/bredd/höjd) — en smalare placeholder-bredd (t.ex. tidigare
 * `w-32`) hade fällt måttet trots identisk höjd och position.
 *
 * RUNDA 2 (review-fynd PR #2408): `Field` (Waitlist.tsx, samma struktur som
 * MailLog.tsx:s) staplar `dt` ovanpå `dd` under `sm:` (två line-boxar) och
 * lägger dem sida vid sida däröver (en line-box) — en enda Skeleton-rad per
 * fält matchade bara desktop-formen. Mobilviewporten 375×812 testas därför
 * EXPLICIT här också, med `FieldSkeleton`s responsiva tvåblocks-anatomi
 * (Waitlist.tsx).
 */

type Row = z.infer<typeof WaitlistEntrySchema>;

/** En komplett WaitlistEntry-rad (EF-svarets form) — samma fixtur-form som
 * `mer-vantelista.acceptance.test.ts`. Samtliga fyra fält (E-post/Telefon/
 * Ställde sig/Informationsmail 1) visas alltid — ingen är nullable — så
 * skelettets fyra platshållarrader möter en rad med samma antal. */
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: `recWL${Math.random().toString(36).slice(2, 10)}`,
    fornamn: 'Anna',
    efternamn: 'Andersson',
    email: 'anna@example.se',
    telefon: '070-1234567',
    informationsmail1Skickad: null,
    createdTime: '2026-05-02T10:00:00.000Z',
    ...overrides,
  };
}

/** Håll-bar mock: `get-waitlist`-anropet PARKERAS obesvarat tills `slapp()`
 * anropas — isPending-grenen är deterministisk under mätningsfönstret. */
function hallbarMock(network: NetworkFixture, rows: Row[]): () => void {
  let slapp = () => {};
  const gate = new Promise<void>((resolve) => {
    slapp = resolve;
  });
  network.use(
    http.get(EF('get-waitlist'), async () => {
      await gate;
      return json({ waitlist: rows });
    }),
  );
  return () => slapp();
}

async function boxa(page: Page, testid: string) {
  const box = await page.getByTestId(testid).first().boundingBox();
  if (!box) throw new Error(`boundingBox saknas för ${testid}`);
  return box;
}

test.describe('Väntelista — skeletonradens anatomi (TASK-416.17)', () => {
  test('AC #1/#2 — MÄTNING: boundingBox på rubrik och första listraden är IDENTISK före och efter datalandning', async ({
    page,
    network,
  }) => {
    const slapp = hallbarMock(network, [
      row({ fornamn: 'Anna', efternamn: 'Andersson' }),
      row({ fornamn: 'Bo', efternamn: 'Bengtsson' }),
      row({ fornamn: 'Cecilia', efternamn: 'Carlsson' }),
    ]);
    await page.goto('/mer/vantelista');
    await expect(page.getByTestId('vantelista-skeleton-rad').first()).toBeVisible();

    const titelPending = await page
      .getByTestId('vantelista-skeleton-titelblock')
      .locator('span')
      .first()
      .boundingBox();
    const radPending = await boxa(page, 'vantelista-skeleton-rad');
    if (!titelPending) throw new Error('rubrik-skelettet saknar boundingBox i isPending');

    slapp();
    await expect(page.getByRole('heading', { level: 1, name: 'Väntelista' })).toBeVisible();
    await expect(page.getByText('Anna Andersson')).toBeVisible();

    const titelLoaded = await page.getByRole('heading', { level: 1 }).boundingBox();
    const radLoaded = await page.getByRole('listitem').first().boundingBox();
    if (!titelLoaded) throw new Error('rubriken saknar boundingBox i laddat läge');
    if (!radLoaded) throw new Error('första listraden saknar boundingBox i laddat läge');

    // EXAKT likhet (toEqual) — MÄTNING ÄR LEVERANS, ingen tolerans-marginal.
    expect(titelLoaded).toEqual(titelPending);
    expect(radLoaded).toEqual(radPending);
  });

  test('AC #1/#2 (mobil 375×812) — MÄTNING: boundingBox på rubrik och första listraden är IDENTISK före och efter datalandning', async ({
    page,
    network,
  }) => {
    // Samma viewport-bredd som `visual-mobile`-projektet — `Field`s
    // `sm:`-brytpunkt (640 px) är INTE aktiv här, så dt/dd staplas (två
    // line-boxar per fält) i stället för att radas (en line-box).
    await page.setViewportSize({ width: 375, height: 812 });
    const slapp = hallbarMock(network, [
      row({ fornamn: 'Anna', efternamn: 'Andersson' }),
      row({ fornamn: 'Bo', efternamn: 'Bengtsson' }),
      row({ fornamn: 'Cecilia', efternamn: 'Carlsson' }),
    ]);
    await page.goto('/mer/vantelista');
    await expect(page.getByTestId('vantelista-skeleton-rad').first()).toBeVisible();

    const titelPending = await page
      .getByTestId('vantelista-skeleton-titelblock')
      .locator('span')
      .first()
      .boundingBox();
    const radPending = await boxa(page, 'vantelista-skeleton-rad');
    if (!titelPending) throw new Error('rubrik-skelettet saknar boundingBox i isPending (mobil)');

    slapp();
    await expect(page.getByRole('heading', { level: 1, name: 'Väntelista' })).toBeVisible();
    await expect(page.getByText('Anna Andersson')).toBeVisible();

    const titelLoaded = await page.getByRole('heading', { level: 1 }).boundingBox();
    const radLoaded = await page.getByRole('listitem').first().boundingBox();
    if (!titelLoaded) throw new Error('rubriken saknar boundingBox i laddat läge (mobil)');
    if (!radLoaded) throw new Error('första listraden saknar boundingBox i laddat läge (mobil)');

    expect(titelLoaded).toEqual(titelPending);
    expect(radLoaded).toEqual(radPending);
  });
});
