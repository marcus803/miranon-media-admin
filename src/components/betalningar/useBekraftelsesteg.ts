import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJobbstatus } from '@/data/betalningar/useJobbstatus';
import {
  useKoaKvitton,
  useRaderaInbetalning,
  useRegistreraInbetalning,
} from '@/data/mutations/inbetalningar';
import { useForhandsgranskaAllaKvitton, useForhandsgranskaKvitto } from '@/data/mutations/kvitton';
import type { OppenBetalning } from '@/domain/schemas';
import { skrivLaddningssida } from '@/lib/skriv-laddningssida';
import {
  arRegistrerbar,
  type BekraftelseRad,
  type Beloppsgenvag,
  baraOmkorning,
  byggRader,
  genvagsbelopp,
  omkorningsUrval,
  type Radvarden,
  summera,
  vantandeKvitton,
} from './bekraftelsesteg-harledningar';
import type { BekraftelsestegModell } from './bekraftelsesteg-modell';
import { visaKronor } from './belopp-inmatning';
import type { Betalsatt } from './betalsatt-minne';
import { lasSenasteBetalsatt, sparaBetalsatt } from './betalsatt-minne';
import { jobbDelutfall, tolkaTakfel } from './inkorg-harledningar';
import type { SessionsRad } from './RegistreratNuBlock';

/**
 * [TASK-402.3] Bekräftelsestegets SKARPA modell — samma `BekraftelsestegModell`
 * som prototypens simulering uppfyllde, men varje handling går genom
 * INKORGENS BEFINTLIGA vägar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INGEN NY EDGE FUNCTION, INGET BATCH-KONTRAKT (AC #5)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fyra mutationer, alla redan i bruk av `BetalningsInkorg.tsx`:
 *
 *   `useRegistreraInbetalning`  EN post per rad (`registrera-inbetalning`)
 *   `useKoaKvitton`             kvittokön (`koa-kvitton`)
 *   `useRaderaInbetalning`      Ångra (`hantera-inbetalning`, atgard radera)
 *   `useForhandsgranska*`       kvitto-PDF:en
 *
 * AVVÄGNINGEN ÄR PRD:NS EGEN (`TASK-402` § Körningen är ett steg): "N anrop om
 * cirka en halv sekund ligger inom spinner-fönstret för en morgons volym; ett
 * batch-kontrakt är en senare optimering om mätning kräver det". Priset är
 * synligt och bokfört: `useRegistreraInbetalning` invaliderar
 * `betalningar.all` + `registrations.all` efter VARJE rad, så en tio-raders
 * körning utlöser tio invalideringar. Det är exakt vad "samma kontrakt som
 * enradsregistreringen" betyder — en egen, tystare väg hade varit ett andra
 * kontrakt med egna buggar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SEKVENTIELLT, INTE PARALLELLT — OCH DET ÄR ETT BESLUT
 * ═══════════════════════════════════════════════════════════════════════════
 * `for … await` i stället för `Promise.all`. Tre skäl, i fallande ordning:
 *   1. RÄKNINGEN. "k av N registrerade …" är meningsfull bara om k växer
 *      monotont i en känd ordning (`ADR-112`s förloppskanal).
 *   2. AIRTABLE-TAKET. Varje `registrera-inbetalning` skriver spegeln, och
 *      taket DELAS med Lottas egna klick och automationerna A1–A11
 *      (`ADR-063` § S91-not). Tio parallella skrivningar är ett självmål.
 *   3. FELISOLERINGEN. En rad som fallerar ska inte kunna avbryta de andra
 *      (AC #6); ett `try`/`catch` per varv är den enklaste formen av det.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FELTEXTEN ÄR SERVERNS, INTE EN EGEN
 * ═══════════════════════════════════════════════════════════════════════════
 * En fallerad rad bär `err.message` rått — samma val `RegistreraForm.tsx`
 * redan gör vid `registrera.isError` (`{registrera.error.message}` i en
 * `role="alert"`). Prototypens `FEL_TEXT` ("Beloppet kunde inte sparas.
 * Försök igen.") var ett PÅHITT: fixturen hade ingen server att citera. Att
 * behålla den påhittade texten i den skarpa ytan hade dolt serverns egen
 * diagnos för Lotta — en formregression förklädd till formtrohet.
 * Skillnaden är bokförd som amendering i facit-katalogen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FÖRHANDSGRANSKNINGENS MÖNSTER ÄR INKORGENS, KOPIERAT MED AVSIKT
 * ═══════════════════════════════════════════════════════════════════════════
 * Fönstret öppnas SYNKRONT före `mutateAsync` (annars blockerar Safari
 * popupen), vakten är per nyckel i ett `Set` (inte `mutation.isPending` — den
 * är delad mellan rader), och felet nollställs vid varje nytt försök
 * (lokalt state självläker inte som TanStacks eget). Hela resonemanget står i
 * `BetalningsInkorg.tsx` § `forhandsgranskaKvitto` och upprepas inte här.
 *
 * ATT LOGIKEN FINNS PÅ TVÅ STÄLLEN ÄR EN BOKFÖRD KANDIDAT, INTE EN MISS:
 * `TASK-402.2` bröt ut BLOCKET (renderingen), inte containerns callbacks. En
 * delad `useForhandsgranskningsflode`-hook är rätt nästa steg — den rör
 * `BetalningsInkorg.tsx`, som ägs av `TASK-402.1` i denna våg, och gjordes
 * därför inte här.
 */

/**
 * Sentinel-nyckeln för "Förhandsgranska N kvitton" i `forhandsgranskaPagar`.
 *
 * SAMMA LITERAL som `BetalningsInkorg.tsx` § `FORHANDSGRANSKA_ALLA_NYCKEL`,
 * och kollisionsfri av samma skäl: inbetalnings-id:n är uuid:er, och `__alla__`
 * är inget uuid. Konstanten är LOKAL på båda ställena — de två `Set`:en är
 * skilda tillstånd i skilda komponenter och delar ingen nyckelrymd, så en
 * gemensam export hade antytt en koppling som inte finns.
 */
const FORHANDSGRANSKA_ALLA_NYCKEL = '__alla__';

function felText(fel: unknown): string {
  return fel instanceof Error ? fel.message : 'Okänt fel';
}

/**
 * Hooken som bär bekräftelsestegets hela tillstånd mot de skarpa vägarna.
 *
 * `oppna` är urvalet (matarens `ids`), `idag` är dagens ISO-datum. Byter
 * urvalet identitet byggs raderna om — men BARA när själva NYCKELMÄNGDEN
 * ändrats: `useRegistreraInbetalning`s invalidering ger en ny array-instans
 * efter varje rad, och utan signatur-jämförelsen hade körningen byggt om sina
 * egna rader mitt i sig själv.
 */
export function useBekraftelsesteg(
  oppna: readonly OppenBetalning[],
  idag: string,
): BekraftelsestegModell {
  const startBetalsatt = useMemo(() => lasSenasteBetalsatt(), []);
  const [rader, setRader] = useState<BekraftelseRad[]>(() =>
    byggRader(oppna, idag, startBetalsatt),
  );
  const [fas, setFas] = useState<'redigera' | 'registrerar' | 'klart'>('redigera');
  const [korning, setKorning] = useState<{ totalt: number; klara: number } | null>(null);
  const [aktivGenvag, setAktivGenvag] = useState<Beloppsgenvag | null>('forslag');
  const [batchBetalsatt, setBatchBetalsatt] = useState<Betalsatt>(startBetalsatt);
  const [batchDatum, setBatchDatum] = useState(idag);
  const [jobbId, setJobbId] = useState<string | undefined>(undefined);
  const [bekraftelseSynlig, setBekraftelseSynlig] = useState(true);
  const [angraFel, setAngraFel] = useState<string | null>(null);
  const [forhandsgranskaPagar, setForhandsgranskaPagar] = useState<ReadonlySet<string>>(new Set());
  const [forhandsgranskaFel, setForhandsgranskaFel] = useState<{
    namn: string | null;
    message: string;
  } | null>(null);
  const granskningsBlockRef = useRef<HTMLElement>(null);

  // Speglar `rader` synkront så `registrera()` kan läsa ögonblicksbilden utan
  // att lägga en sidoeffekt i en state-updater.
  const raderRef = useRef(rader);
  raderRef.current = rader;

  const signaturRef = useRef<string>('');
  const signatur = `${idag}|${oppna.map((o) => o.anmalanRecordId).join(',')}`;
  if (signatur !== signaturRef.current) {
    signaturRef.current = signatur;
    setRader(byggRader(oppna, idag, startBetalsatt));
    setFas('redigera');
    setAktivGenvag('forslag');
    setBatchDatum(idag);
  }

  /**
   * [MÄTT FYND, RÄTTAT] ETT NYTT JOBB GÖR EN AVFÄRDAD BEKRÄFTELSE AKTUELL IGEN
   * — samma effekt `BetalningsInkorg.tsx` bär, och av exakt samma skäl.
   *
   * `registrera()` och `skickaKvitton()` sätter `bekraftelseSynlig = false`
   * ("nästa handling gör den gamla bekräftelsen inaktuell", TASK-362). Utan
   * denna effekt blockerade den avfärdningen sedan den NYA sändningens egen
   * status: efter "Registrera och skicka" gick alla nio kvittona i väg, men
   * blockets statusrad stod TOM där "9 kvitton skickade" skulle synas —
   * `jobbDelutfall` ger `intent: 'success'`, och success-raden är villkorad av
   * `bekraftelseSynlig` (`RegistreratNuBlock.tsx`). Mätt i promoverings-
   * grindens första EFTER-körning: raden `- status` renderades tom.
   *
   * `useRef` och inte ett andra `useState`: jämförelsen ska grinda EN
   * `setBekraftelseSynlig`, inte trigga en egen render.
   */
  const foregJobbId = useRef(jobbId);
  useEffect(() => {
    if (foregJobbId.current !== jobbId) {
      foregJobbId.current = jobbId;
      setBekraftelseSynlig(true);
    }
  }, [jobbId]);

  const registrera = useRegistreraInbetalning();
  const koa = useKoaKvitton();
  const radera = useRaderaInbetalning();
  const forhandsgranska = useForhandsgranskaKvitto();
  const forhandsgranskaAllaMutation = useForhandsgranskaAllaKvitton();
  const jobb = useJobbstatus(jobbId, jobbId !== undefined);

  const sattGenvag = useCallback((genvag: Beloppsgenvag) => {
    setAktivGenvag(genvag);
    setRader((tidigare) =>
      tidigare.map((rad) => {
        if (genvag === 'annat') return { ...rad, belopp: '', ejGenomforbar: null };
        const belopp = genvagsbelopp(rad, genvag);
        return belopp === null
          ? { ...rad, belopp: '', ejGenomforbar: genvag }
          : { ...rad, belopp: visaKronor(belopp), ejGenomforbar: null };
      }),
    );
  }, []);

  const sattBetalsattAlla = useCallback((betalsatt: Betalsatt) => {
    setBatchBetalsatt(betalsatt);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, betalsatt })));
  }, []);

  const sattDatumAlla = useCallback((datum: string) => {
    setBatchDatum(datum);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, datum })));
  }, []);

  /** En fältändring på EN rad — den enda formen alla `sattRad*` behöver. */
  const andraRad = useCallback((nyckel: string, andring: Partial<BekraftelseRad>) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, ...andring } : rad)),
    );
  }, []);

  const sattRadBelopp = useCallback(
    (nyckel: string, belopp: string) => andraRad(nyckel, { belopp, ejGenomforbar: null }),
    [andraRad],
  );
  const sattRadBetalsatt = useCallback(
    (nyckel: string, betalsatt: Betalsatt) => andraRad(nyckel, { betalsatt }),
    [andraRad],
  );
  const sattRadDatum = useCallback(
    (nyckel: string, datum: string) => andraRad(nyckel, { datum }),
    [andraRad],
  );
  const sattRadKvitto = useCallback(
    (nyckel: string, medKvitto: boolean) => andraRad(nyckel, { medKvitto }),
    [andraRad],
  );
  const sattRadMarkerad = useCallback(
    (nyckel: string, markerad: boolean) => andraRad(nyckel, { markerad }),
    [andraRad],
  );
  const sattRadNotering = useCallback(
    (nyckel: string, notering: string) => andraRad(nyckel, { notering }),
    [andraRad],
  );
  const sattRadVarden = useCallback(
    (nyckel: string, varden: Radvarden) => andraRad(nyckel, { ...varden, ejGenomforbar: null }),
    [andraRad],
  );

  /**
   * KÖRNINGEN (AC #2/#3/#5/#6). En rad i taget; en fallerad rad stannar i
   * listan med sitt fel och stoppar aldrig de övriga.
   *
   * `attKora` är en ÖGONBLICKSBILD tagen vid knapptrycket — vyn fryser sina
   * kort samtidigt (`VariantC`s `frusna`), så de två kan inte glida isär.
   */
  const registrera_ = useCallback(
    (skickaNu: boolean) => {
      const nuvarande = raderRef.current;
      const attKora = baraOmkorning(nuvarande)
        ? omkorningsUrval(nuvarande)
        : nuvarande.filter(arRegistrerbar);
      if (attKora.length === 0) return;

      setBekraftelseSynlig(false);
      setAngraFel(null);
      setFas('registrerar');
      setKorning({ totalt: attKora.length, klara: 0 });

      void (async () => {
        const attKoa: string[] = [];
        for (const rad of attKora) {
          try {
            const svar = await registrera.mutateAsync({
              anmalanRecordId: rad.nyckel,
              // RÅ STRÄNG, alltid — normaliseringen sker server-side
              // (`RegistreraInbetalningInput.belopp`s eget docblock).
              belopp: rad.belopp,
              betalsatt: rad.betalsatt,
              betalningsdatum: rad.datum,
              ...(rad.notering.trim() === '' ? {} : { notering: rad.notering }),
            });
            const id = svar.inbetalning.id;
            if (rad.medKvitto && skickaNu) attKoa.push(id);
            andraRad(rad.nyckel, {
              utfall: {
                klass: 'registrerad',
                text: rad.medKvitto ? 'Registrerad · kvitto väntar' : 'Registrerad',
              },
              inbetalningId: id,
              kvitto: rad.medKvitto ? (skickaNu ? 'koad' : 'vantar') : 'ingen',
            });
          } catch (fel) {
            andraRad(rad.nyckel, { utfall: { klass: 'fel', text: felText(fel) } });
          }
          setKorning((k) => (k ? { ...k, klara: k.klara + 1 } : k));
        }
        setKorning(null);
        setFas('klart');
        // Betalsättet som faktiskt användes blir nästa gångs förval — samma
        // `sparaBetalsatt`-punkt som inkorgens `vidRegistrerad` bär.
        const sistaBetalsatt = attKora.at(-1)?.betalsatt;
        if (sistaBetalsatt) sparaBetalsatt(sistaBetalsatt);

        if (attKoa.length > 0) {
          try {
            const svar = await koa.mutateAsync({ inbetalningIds: attKoa });
            setJobbId(svar.jobbId ?? undefined);
          } catch {
            // Kvittokön fallerade — raderna ÄR registrerade och står kvar i
            // blocket som köade. Felet syns i blockets statusrad så fort
            // jobbstatus svarar; att kasta här hade rivit hela körningens
            // resultat för ett fel som rör kvittona, inte pengarna.
          }
        }
      })();
    },
    [andraRad, koa, registrera],
  );

  const skickaKvitton = useCallback(() => {
    const kon = vantandeKvitton(raderRef.current);
    if (kon.length === 0) return;
    setBekraftelseSynlig(false);
    koa.mutate(
      { inbetalningIds: kon.map((v) => v.inbetalningId) },
      {
        onSuccess: (svar) => {
          setJobbId(svar.jobbId ?? undefined);
          setRader((t) => t.map((r) => (r.kvitto === 'vantar' ? { ...r, kvitto: 'koad' } : r)));
        },
      },
    );
  }, [koa]);

  /** "Skicka igen" på EN fallerad rad — samma köväg, ett id. */
  const skickaIgen = useCallback(
    (inbetalningId: string) => {
      setBekraftelseSynlig(false);
      koa.mutate(
        { inbetalningIds: [inbetalningId] },
        { onSuccess: (svar) => setJobbId(svar.jobbId ?? undefined) },
      );
    },
    [koa],
  );

  /**
   * ÅNGRA (AC #4). SERVERN FÖRST — raden går tillbaka till listan först när
   * raderingen lyckats, aldrig optimistiskt. Kastar vidare så
   * `RegistreratNuBlock`s `AngraKnapp` håller dialogen öppen och visar felet
   * i kroppen (dess eget kontrakt).
   */
  const angra = useCallback(
    async (post: SessionsRad): Promise<void> => {
      try {
        await radera.mutateAsync({
          inbetalningId: post.inbetalningId,
          anmalanRecordId: post.radNyckel,
        });
      } catch (fel) {
        setAngraFel(felText(fel));
        throw fel;
      }
      setRader((t) =>
        t.map((r) =>
          r.inbetalningId === post.inbetalningId
            ? { ...r, utfall: null, inbetalningId: null, kvitto: 'ingen', kvittonummer: null }
            : r,
        ),
      );
      granskningsBlockRef.current?.focus();
    },
    [radera],
  );

  const forhandsgranskaKvitto = useCallback(
    (inbetalningId: string, namn: string) => {
      if (forhandsgranskaPagar.has(inbetalningId)) return;
      setForhandsgranskaFel(null);
      const fonster = window.open('', '_blank');
      skrivLaddningssida(fonster, {
        titel: 'Skapar förhandsgranskningen …',
        text: `Ett ögonblick, kvittot till ${namn} renderas och visas här om några sekunder.`,
      });
      setForhandsgranskaPagar((tidigare) => new Set(tidigare).add(inbetalningId));
      void forhandsgranska
        .mutateAsync(inbetalningId)
        .then(
          ({ url }) => {
            if (fonster && !fonster.closed) fonster.location.href = url;
          },
          (fel: unknown) => {
            if (fonster && !fonster.closed) fonster.close();
            setForhandsgranskaFel({ namn, message: felText(fel) });
          },
        )
        .finally(() => {
          setForhandsgranskaPagar((tidigare) => {
            if (!tidigare.has(inbetalningId)) return tidigare;
            const nasta = new Set(tidigare);
            nasta.delete(inbetalningId);
            return nasta;
          });
        });
    },
    [forhandsgranska, forhandsgranskaPagar],
  );

  const forhandsgranskaAlla = useCallback(
    (inbetalningIds: readonly string[]) => {
      if (forhandsgranskaPagar.has(FORHANDSGRANSKA_ALLA_NYCKEL)) return;
      setForhandsgranskaFel(null);
      const fonster = window.open('', '_blank');
      skrivLaddningssida(fonster, {
        titel: 'Skapar förhandsgranskningen …',
        text: `Ett ögonblick, ${inbetalningIds.length} kvitton renderas och visas här om några sekunder.`,
      });
      setForhandsgranskaPagar((tidigare) => new Set(tidigare).add(FORHANDSGRANSKA_ALLA_NYCKEL));
      void forhandsgranskaAllaMutation
        .mutateAsync([...inbetalningIds])
        .then(
          ({ url }) => {
            if (fonster && !fonster.closed) fonster.location.href = url;
          },
          (fel: unknown) => {
            if (fonster && !fonster.closed) fonster.close();
            const message = felText(fel);
            // EF:ens tak-text är engelsk valideringsprosa; `tolkaTakfel`
            // lämnar ut TALET så Lotta får en svensk mening i stället.
            const tak = tolkaTakfel(message);
            setForhandsgranskaFel({
              namn: null,
              message:
                tak === null
                  ? message
                  : `Förhandsgranskningen tar högst ${tak} kvitton åt gången. Skicka i två omgångar.`,
            });
          },
        )
        .finally(() => {
          setForhandsgranskaPagar((tidigare) => {
            if (!tidigare.has(FORHANDSGRANSKA_ALLA_NYCKEL)) return tidigare;
            const nasta = new Set(tidigare);
            nasta.delete(FORHANDSGRANSKA_ALLA_NYCKEL);
            return nasta;
          });
        });
    },
    [forhandsgranskaAllaMutation, forhandsgranskaPagar],
  );

  const aterstall = useCallback(() => {
    setRader(byggRader(oppna, idag, batchBetalsatt));
    setKorning(null);
    setFas('redigera');
    setAktivGenvag('forslag');
    setJobbId(undefined);
  }, [oppna, idag, batchBetalsatt]);

  const summering = useMemo(() => summera(rader), [rader]);
  const jobbstatus = jobb.data;
  const utfall = useMemo(() => jobbDelutfall(jobbstatus), [jobbstatus]);

  return {
    rader,
    fas,
    aktivGenvag,
    batchBetalsatt,
    batchDatum,
    summering,
    sattGenvag,
    sattBetalsattAlla,
    sattDatumAlla,
    sattRadBelopp,
    sattRadBetalsatt,
    sattRadDatum,
    sattRadKvitto,
    sattRadMarkerad,
    sattRadNotering,
    sattRadVarden,
    registrera: registrera_,
    korning,
    skickaKvitton,
    jobbstatus,
    aterstall,
    block: {
      granskningsBlockRef,
      jobbrader: jobbstatus?.rader ?? [],
      utfall,
      bekraftelseSynlig,
      onDoljBekraftelse: () => setBekraftelseSynlig(false),
      koaPending: koa.isPending,
      onSkickaKvitton: skickaKvitton,
      forhandsgranskaPagar,
      forhandsgranskaAllaPagar: forhandsgranskaPagar.has(FORHANDSGRANSKA_ALLA_NYCKEL),
      onForhandsgranska: forhandsgranskaKvitto,
      onForhandsgranskaAlla: forhandsgranskaAlla,
      onSkickaIgen: skickaIgen,
      onAngra: angra,
      angraPending: radera.isPending,
      angraFel,
      onAngraDialogOppen: () => setAngraFel(null),
      forhandsgranskaFel,
    },
  };
}
