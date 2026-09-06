import type { NetworkFixture } from '@msw/playwright';
import { http } from 'msw';
import type { z } from 'zod';
import type { MailLogEntrySchema } from '../../src/domain/schemas';
import { EF, json } from '../support/fixturvarld/handlers';
import { expect, type Page, test } from './acceptance-bas';

/**
 * TASK-416.17 — Maillogg-skeletonens radanatomi (review-fynd PR #2397, S123):
 * efter TASK-416.9:s gap-6-fix kvarstod ett 108 px skift vid SAMMA radantal
 * (3 mot 3) mellan `isPending`-skelettet och det laddade läget —
 * Skeleton-primitivens `listRow` är ett generiskt `h-[3lh]`-block, medan
 * `MailLogRow` (namn + upp till fyra fältrader) är väsentligt högre.
 * `MailLogSkeletonRow` (MailLog.tsx) ger skelettraden EXAKT samma yttre
 * klasser, namnrad och fyra fältplatshållare som `MailLogRow`.
 *
 * MÄTNING ÄR LEVERANS (AC #1/#2): boundingBox på rubriken OCH första
 * listraden är IDENTISK (`toEqual`, ±0 px) före och efter datalandning.
 * Håll-bar mock (samma mönster som `mer-aktivitetshistorik-laddlage.
 * acceptance.test.ts` och `mer-maillogg.acceptance.test.ts`s
 * `manualRelease`): `get-mail-log`-svaret PARKERAS obesvarat tills testet
 * explicit släpper det — isPending-grenen står deterministiskt tills
 * mätningen är tagen, i stället för att kapplöpa mot ett svar som kan hinna
 * landa innan mätningen sker.
 *
 * Rubrik-skelettet bär INGEN egen breddklass (Skeleton-primitivens default
 * `w-full`, se `MailLog.tsx`s isPending-kommentar): `toEqual` jämför HELA
 * boxen (x/y/bredd/höjd) — en smalare placeholder-bredd (t.ex. tidigare
 * `w-28`) hade fällt måttet trots identisk höjd och position.
 */

type Row = z.infer<typeof MailLogEntrySchema>;

/** En komplett MailLogEntry-rad (EF-svarets form) — samma fixtur-form som
 * `mer-maillogg.acceptance.test.ts`. Samtliga fyra fält ifyllda: skelettet
 * reserverar plats för `Field`-radernas MAX-antal (bara Segment/filter är
 * nullable i produktion), så mätningen måste möta en rad med alla fyra. */
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: `recML${Math.random().toString(36).slice(2, 10)}`,
    utskicksNamn: 'Vårnyhetsbrev',
    utskicksIds: ['recBULK01'],
    skickatTill: ['recPER01', 'recPER02'],
    antalSkickade: 2,
    datum: '2026-05-02T10:00:00.000Z',
    oppningsgrad: 0.5,
    filterSnapshot: 'Segment: aktiva deltagare',
    mailutskickCopy: null,
    ...overrides,
  };
}

/** Håll-bar mock: `get-mail-log`-anropet PARKERAS obesvarat tills `slapp()`
 * anropas — isPending-grenen är deterministisk under mätningsfönstret. */
function hallbarMock(network: NetworkFixture, rows: Row[]): () => void {
  let slapp = () => {};
  const gate = new Promise<void>((resolve) => {
    slapp = resolve;
  });
  network.use(
    http.get(EF('get-mail-log'), async () => {
      await gate;
      return json({ maillog: rows });
    }),
  );
  return () => slapp();
}

async function boxa(page: Page, testid: string) {
  const box = await page.getByTestId(testid).first().boundingBox();
  if (!box) throw new Error(`boundingBox saknas för ${testid}`);
  return box;
}

test.describe('Maillogg — skeletonradens anatomi (TASK-416.17)', () => {
  test('AC #1/#2 — MÄTNING: boundingBox på rubrik och första listraden är IDENTISK före och efter datalandning', async ({
    page,
    network,
  }) => {
    const slapp = hallbarMock(network, [
      row({ utskicksNamn: 'Vårnyhetsbrev' }),
      row({ utskicksNamn: 'Höstkampanj' }),
      row({ utskicksNamn: 'Vinterbrev' }),
    ]);
    await page.goto('/mer/maillogg');
    await expect(page.getByTestId('maillog-skeleton-rad').first()).toBeVisible();

    const titelPending = await page
      .getByTestId('maillog-skeleton-titelblock')
      .locator('span')
      .first()
      .boundingBox();
    const radPending = await boxa(page, 'maillog-skeleton-rad');
    if (!titelPending) throw new Error('rubrik-skelettet saknar boundingBox i isPending');

    slapp();
    await expect(page.getByRole('heading', { level: 1, name: 'Maillogg' })).toBeVisible();
    await expect(page.getByText('Vårnyhetsbrev')).toBeVisible();

    const titelLoaded = await page.getByRole('heading', { level: 1 }).boundingBox();
    const radLoaded = await page.getByRole('listitem').first().boundingBox();
    if (!titelLoaded) throw new Error('rubriken saknar boundingBox i laddat läge');
    if (!radLoaded) throw new Error('första listraden saknar boundingBox i laddat läge');

    // EXAKT likhet (toEqual) — MÄTNING ÄR LEVERANS, ingen tolerans-marginal.
    expect(titelLoaded).toEqual(titelPending);
    expect(radLoaded).toEqual(radPending);
  });
});
