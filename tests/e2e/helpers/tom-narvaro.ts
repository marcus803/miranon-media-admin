import type { Page, Route } from '@playwright/test';

/**
 * Delad tom-stub för get-attendance.
 *
 * TASK-416.16: eventdetaljsidan (`EventDetail.tsx`) prefetchar sedan denna
 * skiva `get-attendance` för DET egna eventet, ovillkorligt på eventets
 * status, vid sidmount OCH vid hover/fokus på Check-in-ingången
 * (ADR-078 beslut 3) — samma nyckel/queryFn som `EventCheckin.tsx`. Varje
 * e2e-svit som besöker `/event/$eventId` (bare eventdetaljen, inte
 * `/narvaro`/`/atgarder`-undersidorna) träffar därför nu EN get-attendance-
 * begäran den inte bad om. De flesta sviter bryr sig inte om
 * attendance-svarets EGNA form (den bevisas av
 * `tests/e2e/event-narvaro-register.staging.test.ts` och
 * `tests/acceptance/event-checkin-dorrlistan.acceptance.test.ts`) och
 * stubbar därför tomt, så sidans övriga sviter förblir deterministiska —
 * SAMMA mönster som `helpers/tomma-anteckningar.ts` (task-47) redan löste för
 * get-event-notes-stubben (den delade shotgun-surgery-klassen: en glömd
 * handler i ett nytt anropsställe är osynlig tills sviten körs mot riktigt
 * nät eller mot en hermetik-vakt).
 *
 * Filerna som fick denna stub tillagd vid TASK-416.16 (samtliga navigerar
 * till bare `/event/$eventId` och hade INGEN egen get-attendance-mock sedan
 * tidigare): `event-detail`, `event-bekraftelse`, `event-bor-over`,
 * `event-deltagare`, `mark-paid`, `betalningar-inkorg-markera-lage`,
 * `aktivitetslogg-skarv`. `event-narvaro-register.staging.test.ts` mockar
 * get-attendance själv (dess eget ämne — en räknare bevisar antalet anrop)
 * och använder INTE denna hjälpare.
 */

export const GET_ATTENDANCE_GLOB = '**/functions/v1/get-attendance*';

/** Stubbar get-attendance deterministiskt till en tom lista. */
export async function mockTomNarvaro(page: Page): Promise<void> {
  await page.route(GET_ATTENDANCE_GLOB, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ attendance: [] }),
    });
  });
}
