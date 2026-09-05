import {
  bekraftelseFixtur,
  FIXTUR_FEL_ID,
} from '../../src/components/betalningar/prototype/fixtur';
import { expect, type Page, type Route, test } from '../support/test-bas';

/**
 * PROMOVERINGS-GRINDEN för bekräftelsesteget (`ADR-103` B4, `TASK-402.3`
 * AC #9) — ariaSnapshot-PARET: referenserna fångas i VARIANT-LÄGET
 * (`?variant=c&data=fixtur`) FÖRE flippen, i en EGEN commit, och samma
 * referenser prövas mot den PROMOVERADE ytan efter den.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ORDNINGEN ÄR ENKELRIKTAD — DÄRFÖR EN EGEN COMMIT
 * ═══════════════════════════════════════════════════════════════════════════
 * `VariantC` renderas i dag bara under `variant === 'c'`
 * (`src/routes/_authenticated/mer/betalningar_.registrera.tsx`), och
 * `data=fixtur` är den enda vägen till prototypens in-memory-lager
 * (`bekraftelseSimulering.ts`). Båda villkoren flippas i promoveringen, så
 * FÖRE-läget UPPHÖR ATT EXISTERA i samma stund flippen landar — precis som
 * `segment-`/`persondetalj-`/`personer-promoverings-grind` redan etablerat.
 * Referenserna låses därför i sin egen commit, före varje kodändring i formen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR STAGING-E2E OCH INTE `tests/visual/` — STRUKTURELLT, INTE EN SMAK
 * ═══════════════════════════════════════════════════════════════════════════
 * DIVERGENS MOT UPPDRAGET, ÖPPET BOKFÖRD (`ADR-086`): uppdraget bad om filen
 * `tests/visual/bekraftelsesteget-promoverings-grind.spec.ts` "i fixturvärlden
 * (hermetisk)". Den klassen kan STRUKTURELLT inte rendera denna route:
 * `playwright.config.ts` sätter `VITE_FEATURE_BETALNINGAR: 'av'` för HELA den
 * delade visual/acceptance/webblasarbeteende/manifest-fixturvärlden, och
 * routens `beforeLoad` kastar `redirect({ to: '/mer' })` när `betalningarPa()`
 * är falskt. Att flippa den delade flaggan äger `TASK-346.7` (utan en mockad
 * Realtime-kanal fäller `JobbLyssnare` VARJE autentiserat test i klassen —
 * mätt 48/48, se konfigurationens egen kommentar).
 *
 * PRD `TASK-402` § Testbeslut punkt 2 säger samma sak i klartext
 * ("betalningsflaggan är av i den hermetiska fixturvärlden; att slå på den där
 * äger TASK-346.7") och pekar ut denna skarv. Formen följer därför
 * `betalningar-inkorg-utskicksflode.staging.test.ts` rakt av: `page.route`,
 * aldrig `network.use()`; ingen delad staging-data rörs.
 * `tests/webblasarbeteende/__aria__/uppdateringsnotis-promoverings-grind.test.ts`
 * är precedenten för att en promoverings-grind bor utanför `tests/visual/`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DATAT ÄR SAMMA I BÅDA LÄGENA — OCH DET ÄR HELA POÄNGEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Mockarna nedan är på plats REDAN i FÖRE-committen fast prototypens
 * `data=fixtur` aldrig rör nätverket (`useOppnaBetalningar(data === 'staging')`
 * — hämtningen är `enabled: false`). De är alltså oanvända här och används
 * fullt ut EFTER flippen. Följden är att diffen mellan FÖRE- och
 * EFTER-committen i denna fil är EN RAD: sök-parametern i `oppna()`. Allt
 * annat — lägena, lokatorerna, referensnamnen — står stilla, vilket är det
 * enda sättet identitetsbeviset kan läsas utan att någon behöver ta vårt ord
 * för det.
 *
 * `hamta-oppna-betalningar` svarar med `bekraftelseFixtur()` — SAMMA tio rader
 * ("Lottas morgon") som prototypens fixtur-läge bygger sina rader ur, så
 * innehållet är byte-identiskt och inte bara likt. SKARV MOT `TASK-402.6`:
 * importen pekar in i `prototype/`, som rivs där; fixturen flyttar då hit
 * eller till `tests/support/`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SCOPET ÄR `main form`, INTE HELA SIDAN
 * ═══════════════════════════════════════════════════════════════════════════
 * `VariantC`s rot ÄR sidans enda `<form>`. Att scopa dit utesluter två noder
 * som hör till DEV-substratet och inte till formen: `PrototypeSwitcher`-railen
 * (a/b/c) och `SidRam`-chevronen ligger båda som SYSKON till formen i
 * `BekraftelsestegPrototype.tsx`. Samma strukturella avgränsning som
 * `segment-promoverings-grind.spec.ts` löste med testid-scope — här räcker
 * DOM-formen, ingen ny markör behövs i källan.
 *
 * Ångra-dialogen är undantaget: `Modal` (react-aria) renderar i en PORTAL
 * utanför formen, så det läget scopas till `role="dialog"`.
 *
 * VARFÖR ARIASNAPSHOT OCH INTE PIXLAR (`ADR-103` B4): deterministiskt, noll
 * nya beroenden, jämför STRUKTUR + TILLGÄNGLIGT NAMN. Facit-bilderna
 * (`tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/`) är
 * regressionsstöd för Marcus öga, inte för maskinen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FÖRVÄNTAD DELTA — SKRIVEN FÖRE FLIPPEN, INTE EFTERÅT
 * ═══════════════════════════════════════════════════════════════════════════
 * Tre av tio referenser KAN inte överleva flippen oförändrade, och att säga
 * det här — i FÖRE-committen, innan någon sett utfallet — är skillnaden mellan
 * en bokförd avvikelse och en bortförklaring. `ADR-103` B2 steg 1 promoverar
 * FORMEN och byter DATAVÄGARNA; två noder i efterläget ÄR datavägar som
 * prototypen aldrig hade:
 *
 *   1. `button "Förhandsgranska …" [disabled]` + `tooltip "Öppnar kvittot som
 *      PDF i den skarpa ytan. Inte byggt i prototypen."` — prototypens
 *      `InertForhandsgranska` (`VariantC.tsx`). Facit-manifestet säger det
 *      självt under § ÖPPET TILL PRD:N: "Förhandsgranska är inert i
 *      prototypen (ingen PDF ur fixtur)". Efter flippen är knappen inkorgens
 *      RIKTIGA (`RegistreratNuBlock.tsx`), utan `[disabled]` och utan
 *      tooltip-nod.
 *   2. `text: N kvitton hör till registreringen` — en `sr-only`-span märkt
 *      "Prototypens hjälpvärde, för tydlighet vid granskningen"
 *      (`VariantC.tsx`). Den hör till granskningen av prototypen, inte till
 *      formen, och följer inte med.
 *
 * Berörda referenser: `efter-registrera` och `efter-skicka` (båda
 * viewporterna) samt `korning-pagar` (som ritar blocket när en tidigare
 * körning redan lagt rader där — här inte). De regenereras i FLIPP-committen
 * med diffen uppräknad rad för rad i PR-kroppen, och avvikelsen deklareras som
 * AMENDERING i facit-katalogen (`TASK-402.3` AC #9, `ADR-102` B5/R3) — samma
 * precedent som `segment-promoverings-grind.spec.ts` följde när
 * `SkalprovsVaxel` revs: "de två filerna omgenererades därför i
 * rivnings-committen … och ENDAST de två".
 *
 * De ÖVRIGA referenserna — utgångsläget, körningen pågår, Ångra-dialogen —
 * ska stå BYTE-IDENTISKA genom flippen. Det är där grinden faktiskt fäller.
 */

const HAMTA_OPPNA_BETALNINGAR = '**/functions/v1/hamta-oppna-betalningar*';
const REGISTRERA_INBETALNING = '**/functions/v1/registrera-inbetalning';
const KOA_KVITTON = '**/functions/v1/koa-kvitton';
const HAMTA_JOBBSTATUS = '**/functions/v1/hamta-jobbstatus*';
const HANTERA_INBETALNING = '**/functions/v1/hantera-inbetalning';

/** Facit-bildernas läge (`facit-bekraftelsesteget*.png`, 1440×900 @2x). */
const DESKTOP = { width: 1440, height: 900 };
/**
 * iPad 820 — PRD berättelse 24 och `TASK-402.3` AC #10. Facit saknar
 * iPad-bild MED AVSIKT (facit.json: "iPad 820 är INTE granskad av Marcus i
 * konvergensen"), så referensen här är formens FÖRSTA lås vid den bredden,
 * inte en jämförelse mot en godkänd bild.
 */
const IPAD = { width: 820, height: 1180 };

const JOBB_ID = 'c0ffee00-0001-4001-8001-000000000001';

type Json = Record<string, unknown>;

/** Deterministiskt inbetalnings-uuid per anmälan — mockens egen nyckel. */
function inbetalningsId(anmalanRecordId: string): string {
  const index = bekraftelseFixtur().findIndex((b) => b.anmalanRecordId === anmalanRecordId);
  const suffix = String(index + 1).padStart(2, '0');
  return `beca0000-0000-4000-8000-0000000000${suffix}`;
}

/**
 * Mockar EXAKT de fem Edge Functions steget rör i sitt promoverade läge.
 *
 * `registrera-inbetalning` FALLERAR FÖRSTA GÅNGEN för `FIXTUR_FEL_ID`
 * (Gunnar Falk) och lyckas vid omkörningen — samma berättelse prototypens
 * `felUtlostRef` bär (`bekraftelseSimulering.ts`), så FÖRE- och EFTER-läget
 * producerar samma utfall utan att formen behöver veta vilket läge den står i.
 *
 * `hamta-jobbstatus` svarar `jobb: null` tills `koa-kvitton` skapat ett jobb —
 * samma villkor `useJobbstatus` självt bär (`aktiv: jobbId !== undefined`).
 * Kvittonumren tilldelas i KÖ-ORDNING (`MM-2026-1001` och uppåt), vilket är
 * ordningen prototypens `korJobb` redan ger.
 */
async function mocka(page: Page, hallForstaSvaret = false): Promise<void> {
  const fixtur = bekraftelseFixtur();
  let felUtlost = false;

  /**
   * SVARSFÖRDRÖJNINGEN ÄR MEDVETET SATT TILL PROTOTYPENS EGEN (350 ms/rad,
   * `bekraftelseSimulering.ts` § `registrera`). Utan den svarar mocken
   * omedelbart, körningens `k av N`-fönster kollapsar, och pågår-läget vore
   * fångbart i den ena världen men inte i den andra — alltså ett par som
   * jämför två olika saker.
   */
  const SVARSTID_MS = 350;

  /**
   * GRINDEN SOM GÖR PÅGÅR-LÄGET DETERMINISTISKT I DEN SKARPA VÄRLDEN.
   *
   * Prototypens körning drivs av `setTimeout` I SIDAN och fryses därför av
   * `page.clock.pauseAt` (se pågår-testet). Den promoverade ytans körning
   * drivs av NÄTVERKET, som klockan inte rör. Grinden är motsvarigheten:
   * första `registrera-inbetalning`-svaret hålls inne, så räkningen står på
   * "0 av 10" lika stilla som den gör bakom en pausad klocka. Två mekanismer,
   * EN effekt — vilket är vad paret kräver för att jämföra samma läge.
   *
   * Den släpps aldrig av testet: läget ska stå still tills testet är slut.
   * Playwright river route-handlers vid sidstängning.
   */
  let forstaSvaret = true;
  const grind = hallForstaSvaret
    ? new Promise<void>(() => {
        /* aldrig löst — se docblocket ovan */
      })
    : Promise.resolve();

  await page.route(HAMTA_OPPNA_BETALNINGAR, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ betalningar: fixtur, forfallna: 1 }),
    });
  });

  await page.route(REGISTRERA_INBETALNING, async (route: Route) => {
    const body = route.request().postDataJSON() as {
      anmalanRecordId: string;
      belopp: string;
      betalsatt: string;
      betalningsdatum?: string;
    };
    const rad = fixtur.find((b) => b.anmalanRecordId === body.anmalanRecordId);
    if (!rad) {
      await route.fulfill({ status: 400, body: `okänd anmalanRecordId: ${body.anmalanRecordId}` });
      return;
    }
    if (forstaSvaret) {
      forstaSvaret = false;
      await grind;
    }
    await new Promise((klar) => setTimeout(klar, SVARSTID_MS));
    if (rad.anmalanRecordId === FIXTUR_FEL_ID && !felUtlost) {
      felUtlost = true;
      /**
       * 422 OCH INTE 500 — MÄTT UNDER BYGGET, INTE VALT PÅ KÄNSLA.
       *
       * Första EFTER-körningen svarade 500 här, och ALLA TIO raderna
       * registrerades ändå: `fetchWithRetry` (`src/data/utils.ts`) retryar
       * 5xx tre gånger med exponentiell backoff, så mockens enda fel-svar
       * konsumerades av retry-lagret och andra försöket lyckades. Det är
       * KORREKT produktionsbeteende — ett övergående serverfel ska läkas utan
       * att Lotta ser något — men det gör 5xx obrukbart för att pröva
       * fel-radens FORM.
       *
       * 4xx returneras direkt utan retry (samma fil, § Strategi), och är
       * dessutom det realistiska fallet: EF:en avvisar en payload den inte
       * accepterar. Prototypens motsvarighet (`FIXTUR_FEL_ID` +
       * `felUtlostRef`) hade ingen server och därmed inget retry-lager att
       * ta hänsyn till.
       */
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Beloppet kunde inte sparas. Försök igen.' }),
      });
      return;
    }
    const nu = new Date().toISOString();
    const belopp = Number(body.belopp.replace(/\s/g, '').replace(',', '.'));
    const summa = rad.summaInbetalt + belopp;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        inbetalning: {
          id: inbetalningsId(rad.anmalanRecordId),
          anmalanRecordId: rad.anmalanRecordId,
          ogonblicksbildNamn: rad.personNamn,
          ogonblicksbildEvent: rad.eventNamn,
          ogonblicksbildEventdatum: rad.eventStartdatum,
          belopp,
          betalsatt: body.betalsatt,
          betalningsdatum: body.betalningsdatum ?? nu.slice(0, 10),
          typ: 'inbetalning',
          status: 'aktiv',
          makuleradSkal: null,
          makuleradNar: null,
          bankreferens: null,
          kvittoId: null,
          notering: null,
          skapadAv: 'staging-user@miranon.test',
          skapadNar: nu,
        },
        harledning: {
          summa,
          gallandePris: rad.gallandePris,
          saknas: rad.gallandePris === null ? null : rad.gallandePris - summa,
          avgiftKlar: true,
          alltKlart: rad.gallandePris !== null && summa >= rad.gallandePris,
          arForelasning: false,
        },
        spegel: { skrivet: true, forsok: 1, skal: null },
      }),
    });
  });

  let jobbstatusSvar: Json = {
    jobb: null,
    rader: [],
    sammanfattning: { totalt: 0, skickade: 0, fel: 0, kvar: 0 },
  };

  await page.route(KOA_KVITTON, async (route: Route) => {
    const nu = new Date().toISOString();
    const body = route.request().postDataJSON() as { inbetalningIds: string[] };
    jobbstatusSvar = {
      jobb: {
        id: JOBB_ID,
        jobbtyp: 'kvitto',
        status: 'avslutat',
        skapadAv: 'staging-user@miranon.test',
        skapadNar: nu,
        avslutadNar: nu,
      },
      rader: body.inbetalningIds.map((id, i) => ({
        id: `c0ffee00-0002-4002-8002-${String(i).padStart(12, '0')}`,
        jobbId: JOBB_ID,
        jobbtyp: 'kvitto',
        objektId: id,
        status: 'skickat',
        skal: null,
        forsok: 1,
        skapadNar: nu,
        paborjadNar: nu,
        avslutadNar: nu,
        uppdateradNar: nu,
        kvittonummer: `MM-2026-${1001 + i}`,
      })),
      sammanfattning: {
        totalt: body.inbetalningIds.length,
        skickade: body.inbetalningIds.length,
        fel: 0,
        kvar: 0,
      },
    };
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

  await page.route(HAMTA_JOBBSTATUS, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jobbstatusSvar),
    });
  });

  await page.route(HANTERA_INBETALNING, async (route: Route) => {
    const body = route.request().postDataJSON() as { atgard: string; inbetalningId: string };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        atgard: body.atgard,
        inbetalningId: body.inbetalningId,
        harledning: {
          summa: 0,
          gallandePris: 2500,
          saknas: 2500,
          avgiftKlar: false,
          alltKlart: false,
          arForelasning: false,
        },
        spegel: { skrivet: true, forsok: 1, skal: null },
      }),
    });
  });
}

/**
 * DEN ENDA RADEN SOM BYTTE VID FLIPPEN.
 *
 * FÖRE (commit `d95b8e1a`): `?variant=c&data=fixtur&ids=…` — variant-läget med
 * prototypens in-memory-lager, där `ids` ignorerades av fixtur-grenen.
 * EFTER (denna commit): `?ids=…` — den promoverade ytan utan variantparameter.
 * Urvalet är matarens, raderna kommer ur `hamta-oppna-betalningar` (mockad
 * ovan med SAMMA tio rader), registreringen går via `registrera-inbetalning`.
 *
 * Diffa denna fil mot `d95b8e1a` för att se att inget annat rördes.
 */
const IDS = bekraftelseFixtur()
  .map((b) => b.anmalanRecordId)
  .join(',');
const STEG_URL = `/mer/betalningar/registrera?ids=${IDS}`;

/** Sidans form — `VariantC`s rot, utan DEV-substratets syskonnoder. */
function steget(page: Page) {
  return page.locator('main form');
}

async function oppna(
  page: Page,
  viewport: { width: number; height: number },
  /** Pågår-läget: frys sidans timers OCH håll första serversvaret inne. */
  frysKorningen = false,
) {
  await page.setViewportSize(viewport);
  /**
   * `no-preference` EXPLICIT, INTE ÄRVT — och det är en MÄTNING, inte en
   * försiktighetsåtgärd. Headless Chromium rapporterar
   * `prefers-reduced-motion: reduce` som default, och prototypens
   * `prefersReducedMotion()` (`bekraftelseSimulering.ts`) nollar då ALLA
   * fördröjningar: körningen blev instant och pågår-referensen fångade
   * SLUTLÄGET (mätt i denna fils första generering — statusraden sa
   * "9 inbetalningar registrerade" i en referens som skulle visa
   * "Registrerar 10 inbetalningar …"). Raden gäller båda världarna, så
   * paret jämför samma tempo.
   */
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Klockan INSTALLERAS före navigeringen (Playwrights krav) men PAUSAS först
  // efter att sidan renderat — en pausad klocka under app-boot fryser också
  // React/TanStacks egen schemaläggning.
  if (frysKorningen) await page.clock.install();
  await mocka(page, frysKorningen);
  await page.goto(STEG_URL);
  const form = steget(page);
  // ANKARET FÖRE VARJE SNAPSHOT: utgångslägets statusrad bevisar att alla tio
  // raderna landat och att modellen byggts — inte att en halvrenderad sida
  // råkade bära rätt rubrik.
  await expect(form.getByText('10 av 10 inbetalningar markerade')).toBeVisible({
    timeout: 15_000,
  });
  if (frysKorningen) {
    // Pausa vid SIDANS EGEN tid plus en marginal — `pauseAt` vägrar en
    // tidpunkt i det förflutna ("Cannot fast-forward to the past", mätt), och
    // en fast literal driver ifrån webbläsarens klocka så fort testet tar
    // några sekunder.
    const nu = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(nu + 500));
  }
  return form;
}

test.describe('promoverings-grinden — bekräftelsesteget (ADR-103 B4)', () => {
  for (const [namn, viewport] of [
    ['desktop', DESKTOP],
    ['ipad', IPAD],
  ] as const) {
    test(`${namn} — utgångsläget`, async ({ page }) => {
      const form = await oppna(page, viewport);
      await expect(form).toMatchAriaSnapshot({
        name: `bekraftelsesteget-utgangslage-${namn}.aria.yml`,
      });
    });

    test(`${namn} — körningen pågår`, async ({ page }) => {
      // KÖRNINGEN FRYSES VID k=0 — INTE fångas i ett fönster.
      //
      // MÄTT, INTE ANTAGET: `toMatchAriaSnapshot` bär en RETRY-LOOP (5 s), och
      // en referens som genereras utan befintlig baseline skrivs FÖRST när
      // loopen gett upp. Ett rörligt läge hinner alltså bli sitt eget slutläge
      // innan referensen skrivs — pågår-referensen bar i första körningen
      // statusraden "9 inbetalningar registrerade, 1 kunde inte registreras".
      // Med klockan pausad står "0 av 10 registrerade …" stilla i minst sex
      // sekunder realtid (mätt), alltså längre än retry-loopen.
      const form = await oppna(page, viewport, true);
      await form.getByRole('button', { name: 'Registrera 10 inbetalningar' }).click();
      // Ankaret fäller HÖGT om frysningen inte tog — bättre än en referens som
      // tyst skrivs ur fel läge.
      await expect(form.getByRole('progressbar')).toHaveText('0 av 10 registrerade …');
      await expect(form).toMatchAriaSnapshot({
        name: `bekraftelsesteget-korning-pagar-${namn}.aria.yml`,
      });
    });

    test(`${namn} — efter Registrera`, async ({ page }) => {
      const form = await oppna(page, viewport);
      await form.getByRole('button', { name: 'Registrera 10 inbetalningar' }).click();
      await expect(
        form.getByText('9 inbetalningar registrerade, 1 kunde inte registreras'),
      ).toBeVisible({ timeout: 20_000 });
      await expect(form).toMatchAriaSnapshot({
        name: `bekraftelsesteget-efter-registrera-${namn}.aria.yml`,
      });
    });

    test(`${namn} — Ångra-dialogen`, async ({ page }) => {
      const form = await oppna(page, viewport);
      await form.getByRole('button', { name: 'Registrera 10 inbetalningar' }).click();
      await expect(
        form.getByText('9 inbetalningar registrerade, 1 kunde inte registreras'),
      ).toBeVisible({ timeout: 20_000 });
      await form.getByRole('button', { name: 'Ångra registreringen för Anna Lindqvist' }).click();
      // PORTALEN: `Modal` renderar utanför formen, så dialogen scopas för sig.
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toMatchAriaSnapshot({
        name: `bekraftelsesteget-angra-dialog-${namn}.aria.yml`,
      });
    });

    test(`${namn} — efter Registrera och skicka`, async ({ page }) => {
      const form = await oppna(page, viewport);
      await form.getByRole('button', { name: 'Registrera och skicka 10 kvitton' }).click();
      await expect(form.getByText('9 kvitton skickade')).toBeVisible({ timeout: 30_000 });
      await expect(form).toMatchAriaSnapshot({
        name: `bekraftelsesteget-efter-skicka-${namn}.aria.yml`,
      });
    });
  }
});
