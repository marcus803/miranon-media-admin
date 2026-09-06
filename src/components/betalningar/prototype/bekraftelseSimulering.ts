import { useCallback, useMemo, useRef, useState } from 'react';
import type { Jobbstatus, OppenBetalning } from '@/domain/schemas';
import {
  aktivtBeloppslage,
  arRegistrerbar,
  type BekraftelseRad,
  type Beloppsgenvag,
  type Beloppslage,
  beloppForNyMarkerad,
  byggRader,
  genvagsbelopp,
  type Kvittoläge,
  type Radvarden,
  sattBeloppslage,
  summera,
} from '../bekraftelsesteg-harledningar';
import type { BekraftelsestegModell } from '../bekraftelsesteg-modell';
import { visaKronor } from '../belopp-inmatning';
import type { Betalsatt } from '../betalsatt-minne';
import { lasSenasteBetalsatt } from '../betalsatt-minne';
import { jobbDelutfall } from '../inkorg-harledningar';
import { FIXTUR_FEL_ID } from './fixtur';

/**
 * [PROTOTYPE] Bekräftelsestegets SIMULERINGSLAGER (S121 beslut 8) — DEV-ONLY
 * sedan promoveringen (`TASK-402.3`), rivs i `TASK-402.6`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SOM FLYTTADE UT, OCH VAD SOM BLEV KVAR (TASK-402.3)
 * ═══════════════════════════════════════════════════════════════════════════
 * De RENA härledningarna — raden, avstämningen, summeringen, grupperingen,
 * "vad kan registreras nu" — bor sedan promoveringen i
 * `../bekraftelsesteg-harledningar.ts`. De var aldrig prototyp-kod; de bär
 * avstämningen Lotta jämför mot kontoutdraget och ska överleva rivningen av
 * denna fil. Filen RE-EXPORTERAR dem oförändrade, så `VariantA`/`VariantB`/
 * `radfalt.tsx` kompilerar utan en enda ändrad importrad.
 *
 * Kvar HÄR är exakt det som dör med prototypen: den simulerade körningen, det
 * simulerade kvittojobbet, och den påhittade felraden.
 *
 * INGEN RIKTIG MUTATION NÅGONSIN. `registrera()` kör en ren in-memory-
 * simulering; ingen `useRegistreraInbetalning`, ingen `useKoaKvitton`, inget
 * nätverk. Den skarpa modellen bor i `../useBekraftelsesteg.ts` och är den
 * ENDA som rör servern.
 *
 * All prisregel-logik LÅNAS ur `inkorg-harledningar.ts` — prototypen skriver
 * inga egna prisregler, och gjorde det aldrig.
 */

export {
  type Avstamning,
  antalRegistreradeKvitton,
  arRegistrerbar,
  avstamning,
  BETALSATT,
  type BekraftelseRad,
  type Beloppsgenvag,
  type Beloppsklass,
  baraOmkorning,
  beloppsklass,
  type EventGruppRader,
  type Fas,
  forslagsbelopp,
  genvagsbelopp,
  grupperaRader,
  type Kvittoläge,
  markeringsSkal,
  omkorningsUrval,
  type RadUtfall,
  radbelopp,
  type Summering,
  summera,
} from '../bekraftelsesteg-harledningar';
/** Modell-typen bor i `bekraftelsesteg-modell.ts` (den `Pick`:ar ur blockets
    egna props) — re-exporteras här så `VariantA`/`VariantB` behåller sina
    importrader oförändrade fram till rivningen i `TASK-402.6`. */
export type { BekraftelsestegModell } from '../bekraftelsesteg-modell';

const FEL_TEXT = 'Beloppet kunde inte sparas. Försök igen.';

/** Ett låtsas-uuid för prototypens registrerade inbetalningar och jobb. */
function latsasUuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Hooken som bär prototypens hela in-memory-modell. Uppfyller SAMMA
 * `BekraftelsestegModell` som den skarpa `useBekraftelsesteg` — formen
 * (`VariantC`) ser ingen skillnad, vilket är hela poängen med
 * `ADR-103` B2 steg 1 ("det `protoDataMode` styr är datakälla, inte form").
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
  const [bekraftelseSynlig, setBekraftelseSynlig] = useState(true);
  const granskningsBlockRef = useRef<HTMLElement>(null);

  // Speglar `rader` synkront så `registrera()` kan läsa den aktuella
  // ögonblicksbilden utan att lägga en sidoeffekt i en state-updater.
  const raderRef = useRef(rader);
  raderRef.current = rader;
  // Nyckeln som förändras när `oppna`/`idag` byts (t.ex. staging-data landar)
  // så modellen byggs om utan att en effekt behövs.
  const signaturRef = useRef<string>('');
  const signatur = `${idag}|${oppna.map((o) => o.anmalanRecordId).join(',')}`;
  if (signatur !== signaturRef.current) {
    signaturRef.current = signatur;
    // Synkron ombyggnad vid ny data (React tillåter setState under render av
    // en annan komponent; här kör vi det bara när signaturen faktiskt bytt).
    setRader(byggRader(oppna, idag, startBetalsatt));
    setFas('redigera');
    setAktivGenvag('forslag');
    setBatchDatum(idag);
  }

  const sattGenvag = useCallback((genvag: Beloppsgenvag) => {
    setAktivGenvag(genvag);
    setRader((tidigare) =>
      tidigare.map((rad) => {
        if (genvag === 'annat') {
          // "Annat belopp": töm fälten så Lotta skriver varje belopp för hand.
          return { ...rad, belopp: '', ejGenomforbar: null };
        }
        const belopp = genvagsbelopp(rad, genvag);
        return belopp === null
          ? { ...rad, belopp: '', ejGenomforbar: genvag }
          : { ...rad, belopp: visaKronor(belopp), ejGenomforbar: null };
      }),
    );
  }, []);

  /**
   * [TASK-402.8] "Sätt alla belopp" — SAMMA rena regel som den skarpa hooken
   * kallar (`sattBeloppslage` i `../bekraftelsesteg-harledningar`). Prototypen
   * är granskningsytan Marcus tittar på (`?data=fixtur`), så knapparna måste
   * göra exakt samma sak här som i den skarpa vägen.
   */
  const sattBeloppslageNu = useCallback((lage: Beloppslage) => {
    // [varv 5] LÄGET ÄR TILLSTÅND, inte en engångshandling: det visas i
    // kapseln OCH styr vad en rad som markeras senare får för belopp.
    setAktivGenvag(lage);
    setRader((tidigare) => sattBeloppslage(tidigare, lage));
  }, []);

  const sattBetalsattAlla = useCallback((betalsatt: Betalsatt) => {
    setBatchBetalsatt(betalsatt);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, betalsatt })));
  }, []);

  const sattDatumAlla = useCallback((datum: string) => {
    setBatchDatum(datum);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, datum })));
  }, []);

  const andraRad = useCallback((nyckel: string, andring: Partial<BekraftelseRad>) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, ...andring } : rad)),
    );
  }, []);

  /* [varv 4] En handredigering (och en NY markering) släcker toggeln — samma
     regel och samma skäl som i den skarpa hooken. */
  const sattRadBelopp = useCallback(
    (nyckel: string, belopp: string) =>
      andraRad(nyckel, { belopp, ejGenomforbar: null, handredigerad: true }),
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
  /* [varv 5] EN NYMARKERAD RAD FÖLJER DET AKTIVA LÄGET.
     Läget är en levande regel, inte en engångshandling: markerar Lotta en rad
     mitt i "Hela beloppet" ska raden komma in med hela beloppet, inte med sitt
     förslag. Undantaget är raden hon skrivit beloppet på för hand
     (`handredigerad`) — den behåller sin siffra, annars hade ett bock-klick
     tyst kastat bort den. En AVmarkering rör ingenting.

     Uppslaget sker inuti uppdateraren, mot raden som den ser ut just nu —
     `beloppForNyMarkerad` prövar därför inte `markerad` (fältet är fortfarande
     `false` i det ögonblicket). */
  const sattRadMarkerad = useCallback(
    (nyckel: string, markerad: boolean) => {
      const lage = aktivtBeloppslage(aktivGenvag);
      setRader((tidigare) =>
        tidigare.map((rad) => {
          if (rad.nyckel !== nyckel) return rad;
          if (!markerad) return { ...rad, markerad: false };
          const belopp = beloppForNyMarkerad(rad, lage);
          return belopp === null
            ? { ...rad, markerad: true }
            : { ...rad, markerad: true, belopp, ejGenomforbar: null };
        }),
      );
    },
    [aktivGenvag],
  );
  const sattRadNotering = useCallback(
    (nyckel: string, notering: string) => andraRad(nyckel, { notering }),
    [andraRad],
  );
  const sattRadVarden = useCallback(
    (nyckel: string, varden: Radvarden) =>
      andraRad(nyckel, { ...varden, ejGenomforbar: null, handredigerad: true }),
    [andraRad],
  );

  // ═══ UTSKICKSJOBBET — simulerar kvittojobbet rad för rad ═══
  // Köade rader går `koad` → `skickas` → `skickat` med löpnummer i husets form
  // (`MM-2026-1001`, se `tests/api/kvitto-visa-skicka-igen.test.ts`). Inget
  // simulerat utskicksfel: Marcus berättelse bär ett registreringsfel
  // (Gunnar), inte ett kvittofel — ett påhittat andra fel hade varit brus.
  const lopnummerRef = useRef(1000);
  // Gunnar fallerar FÖRSTA gången, lyckas vid omkörning — så "Försök igen"
  // efter felet går att pröva som i den skarpa ytan.
  const felUtlostRef = useRef(false);
  const jobbIdRef = useRef<string | null>(null);
  const korJobb = useCallback(() => {
    const koade = raderRef.current.filter((r) => r.kvitto === 'koad').map((r) => r.nyckel);
    if (koade.length === 0) return;
    if (jobbIdRef.current === null) jobbIdRef.current = latsasUuid();
    const reducerad = prefersReducedMotion();
    void (async () => {
      for (const nyckel of koade) {
        setRader((t) => t.map((r) => (r.nyckel === nyckel ? { ...r, kvitto: 'skickas' } : r)));
        if (!reducerad) await delay(450);
        lopnummerRef.current += 1;
        const nummer = `MM-2026-${lopnummerRef.current}`;
        setRader((t) =>
          t.map((r) =>
            r.nyckel === nyckel ? { ...r, kvitto: 'skickat', kvittonummer: nummer } : r,
          ),
        );
      }
    })();
  }, []);

  const registrera = useCallback(
    (skickaNu: boolean) => {
      const attKora = raderRef.current.filter(arRegistrerbar).map((r) => r.nyckel);
      if (attKora.length === 0) return;
      setBekraftelseSynlig(false);
      setFas('registrerar');
      setKorning({ totalt: attKora.length, klara: 0 });
      const reducerad = prefersReducedMotion();
      void (async () => {
        for (const nyckel of attKora) {
          if (!reducerad) await delay(350);
          // Beslutet om fel tas UTANFÖR state-uppdateraren: React (StrictMode)
          // kör uppdaterare två gånger i dev, och en sidoeffekt där inne lät
          // Gunnar passera på andra varvet (mätt: han registrerades).
          const skaFalla = nyckel === FIXTUR_FEL_ID && !felUtlostRef.current;
          if (skaFalla) felUtlostRef.current = true;
          setRader((tidigare) =>
            tidigare.map((rad) => {
              if (rad.nyckel !== nyckel) return rad;
              if (skaFalla) return { ...rad, utfall: { klass: 'fel', text: FEL_TEXT } };
              const kvitto: Kvittoläge = rad.medKvitto ? (skickaNu ? 'koad' : 'vantar') : 'ingen';
              return {
                ...rad,
                utfall: {
                  klass: 'registrerad',
                  text: rad.medKvitto ? 'Registrerad · kvitto väntar' : 'Registrerad',
                },
                inbetalningId: latsasUuid(),
                kvitto,
              };
            }),
          );
          setKorning((k) => (k ? { ...k, klara: k.klara + 1 } : k));
        }
        setKorning(null);
        setFas('klart');
        // Nästa tick: refen speglar state först efter renderingen, annars
        // missar jobbet den sist registrerade raden (mätt: Johan blev kvar
        // som "köat").
        if (skickaNu) window.setTimeout(korJobb, 0);
      })();
    },
    [korJobb],
  );

  const skickaKvitton = useCallback(() => {
    setBekraftelseSynlig(false);
    setRader((t) => t.map((r) => (r.kvitto === 'vantar' ? { ...r, kvitto: 'koad' } : r)));
    // Kön läses ur refen i nästa tick, efter att state landat.
    window.setTimeout(korJobb, 0);
  }, [korJobb]);

  /** Ångra — raden går tillbaka till listan (inkorgens Ångra raderar posten). */
  const angra = useCallback(async (post: { inbetalningId: string }): Promise<void> => {
    setRader((t) =>
      t.map((r) =>
        r.inbetalningId === post.inbetalningId
          ? { ...r, utfall: null, inbetalningId: null, kvitto: 'ingen', kvittonummer: null }
          : r,
      ),
    );
  }, []);

  const jobbstatus = useMemo<Jobbstatus | undefined>(() => {
    const jobbId = jobbIdRef.current;
    const iJobb = rader.filter((r) => r.kvitto !== 'ingen' && r.kvitto !== 'vantar');
    if (jobbId === null || iJobb.length === 0) return undefined;
    const nu = new Date().toISOString();
    const jobbrader: Jobbstatus['rader'] = iJobb.map((r) => ({
      id: `${jobbId}-${r.nyckel}`,
      jobbId,
      jobbtyp: 'kvitto',
      objektId: r.inbetalningId ?? r.nyckel,
      status:
        r.kvitto === 'skickat'
          ? 'skickat'
          : r.kvitto === 'skickas'
            ? 'pagar'
            : r.kvitto === 'fel'
              ? 'fel'
              : 'vantar',
      skal: null,
      forsok: r.kvitto === 'koad' ? 0 : 1,
      skapadNar: nu,
      paborjadNar: r.kvitto === 'koad' ? null : nu,
      avslutadNar: r.kvitto === 'skickat' || r.kvitto === 'fel' ? nu : null,
      uppdateradNar: nu,
      kvittonummer: r.kvittonummer,
    }));
    const skickade = jobbrader.filter((j) => j.status === 'skickat').length;
    const fel = jobbrader.filter((j) => j.status === 'fel').length;
    const kvar = jobbrader.length - skickade - fel;
    return {
      jobb: {
        id: jobbId,
        jobbtyp: 'kvitto',
        status: kvar > 0 ? 'oppet' : 'avslutat',
        skapadAv: 'prototyp',
        skapadNar: nu,
        avslutadNar: kvar > 0 ? null : nu,
      },
      rader: jobbrader,
      sammanfattning: { totalt: jobbrader.length, skickade, fel, kvar },
    };
  }, [rader]);

  const aterstall = useCallback(() => {
    jobbIdRef.current = null;
    felUtlostRef.current = false;
    setRader(byggRader(oppna, idag, batchBetalsatt));
    setKorning(null);
    setFas('redigera');
    setAktivGenvag('forslag');
  }, [oppna, idag, batchBetalsatt]);

  const summering = useMemo(() => summera(rader), [rader]);
  const utfall = useMemo(() => jobbDelutfall(jobbstatus), [jobbstatus]);

  return {
    rader,
    fas,
    aktivGenvag,
    batchBetalsatt,
    batchDatum,
    summering,
    sattGenvag,
    sattBeloppslage: sattBeloppslageNu,
    sattBetalsattAlla,
    sattDatumAlla,
    sattRadBelopp,
    sattRadBetalsatt,
    sattRadDatum,
    sattRadKvitto,
    sattRadMarkerad,
    sattRadNotering,
    sattRadVarden,
    registrera,
    korning,
    skickaKvitton,
    jobbstatus,
    aterstall,
    /**
     * Efterlägets kopplingar i prototypens värld. Förhandsgranskningen är
     * INERT (det fanns aldrig en PDF att öppna ur en fixtur — facit.json
     * § ÖPPET TILL PRD:N säger det rakt ut), och "Skicka igen" faller
     * tillbaka på samma simulerade kvittojobb som "Skicka N kvitton".
     */
    block: {
      granskningsBlockRef,
      jobbrader: jobbstatus?.rader ?? [],
      utfall,
      bekraftelseSynlig,
      onDoljBekraftelse: () => setBekraftelseSynlig(false),
      koaPending: false,
      onSkickaKvitton: skickaKvitton,
      forhandsgranskaPagar: new Set<string>(),
      forhandsgranskaAllaPagar: false,
      onForhandsgranska: () => {},
      onForhandsgranskaAlla: () => {},
      onSkickaIgen: () => skickaKvitton(),
      onAngra: angra,
      angraPending: false,
      angraFel: null,
      onAngraDialogOppen: () => {},
      forhandsgranskaFel: null,
    },
  };
}
