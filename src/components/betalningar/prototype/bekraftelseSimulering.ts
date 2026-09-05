import { useCallback, useMemo, useRef, useState } from 'react';
import type { Jobbstatus, OppenBetalning } from '@/domain/schemas';
import { normaliseraBeloppKlient, summeraKronorKlient, visaKronor } from '../belopp-inmatning';
import type { Betalsatt } from '../betalsatt-minne';
import { lasSenasteBetalsatt } from '../betalsatt-minne';
import {
  type Beloppsknapp,
  harledBeloppsknappar,
  harledRad,
  type InkorgsRad,
} from '../inkorg-harledningar';
import { FIXTUR_FEL_ID } from './fixtur';

/**
 * [PROTOTYPE] Bekräftelsestegets DELADE, TUNNA datalager (S121 beslut 8).
 *
 * De tre varianterna (A/B/C) delar INGEN layout — bara denna modul: raderna,
 * bulkvalen, den simulerade registreringen och de härledda talen. All
 * prisregel-logik LÅNAS ur `inkorg-harledningar.ts` (`harledRad`,
 * `harledBeloppsknappar`, `beloppsutfall`) — prototypen skriver inga egna
 * prisregler (uppdragets krav, och det enda sättet att vara trogen den skarpa
 * ytan formen ska promoveras till).
 *
 * INGEN RIKTIG MUTATION NÅGONSIN. `registrera()` kör en ren in-memory-
 * simulering; ingen `useRegistreraInbetalning`, ingen `useKoaKvitton`, inget
 * nätverk. "Förhandsgranska N" och "Skicka N kvitton" är inerta i varianterna.
 */

/**
 * Beloppsgenvägarna (beslut 2) plus `forslag` (konvergens varv 2, Marcus val
 * B 2026-09-05): appens eget förval per rad — avgiften för den som inte
 * betalat något, resten för den som redan betalat avgiften. `annat` = skriv
 * varje belopp för hand.
 */
export type Beloppsgenvag = 'forslag' | 'avgift' | 'allt' | 'annat';

export const BETALSATT: readonly Betalsatt[] = ['Swish', 'Bankgiro', 'Plusgiro'];

export type RadUtfall = { klass: 'registrerad'; text: string } | { klass: 'fel'; text: string };

/** En rad i bekräftelsesteget: den öppna betalningen plus hennes val på plats. */
export type BekraftelseRad = {
  /** Stabil nyckel = anmälans record-ID. */
  nyckel: string;
  /** Härledningen ur `harledRad` — kvar, avgiftKvar, förfallen, obekräftad. */
  inkorg: InkorgsRad;
  /** Beloppsgenvägarnas belopp för DENNA rad (`harledBeloppsknappar`). */
  beloppsknappar: Beloppsknapp[];
  /** Beloppet som ska registreras, som sträng (skrivbart). `''` = inget satt. */
  belopp: string;
  betalsatt: Betalsatt;
  /** ISO-datum, `YYYY-MM-DD`. */
  datum: string;
  medKvitto: boolean;
  /**
   * Markerad = med i registreringen (konvergens varv 5). Raderna kommer
   * markerade från inkorgen; ett tryck på kortet avmarkerar, som på
   * eventdetaljen och Åtgärds-sidan (`MarkerbartKort`). En avmarkerad rad
   * står kvar i listan, vit, och räknas ingenstans.
   */
  markerad: boolean;
  /** Notering, som i inkorgens formulär (varv 6). Ren text, ingen persistens. */
  notering: string;
  /**
   * Satt när det SENASTE bulk-beloppsvalet inte gick ihop för raden (avgiften
   * redan betald, eller en föreläsning utan fack). Raden får ingen siffra utan
   * en markering och väntar på hennes hand (beslut 2). Bär vilket val det var.
   */
  ejGenomforbar: Beloppsgenvag | null;
  /** Simuleringens utfall, satt efter "Registrera N". */
  utfall: RadUtfall | null;
  /** Låtsas-id för den registrerade inbetalningen (varv 13); `null` tills raden registrerats. */
  inbetalningId: string | null;
  /**
   * Kvittots läge efter registreringen — inkorgens `kvittolage`-tillstånd:
   * `ingen` (inget kryss), `vantar` (i kön, "Skicka N kvitton" väntar),
   * `koad`/`skickas`/`skickat`/`fel` (utskicksjobbets radstatus).
   */
  kvitto: Kvittoläge;
  kvittonummer: string | null;
};

export type Kvittoläge = 'ingen' | 'vantar' | 'koad' | 'skickas' | 'skickat' | 'fel';

export type Fas = 'redigera' | 'registrerar' | 'klart';

/** Beloppet en genväg ger för en rad, eller `null` när valet inte går ihop. */
export function genvagsbelopp(rad: BekraftelseRad, genvag: Beloppsgenvag): number | null {
  if (genvag === 'annat') return null;
  if (genvag === 'forslag') return forslagsbelopp(rad.beloppsknappar);
  const knapp = rad.beloppsknappar.find((k) => k.nyckel === genvag);
  return knapp ? knapp.belopp : null;
}

/**
 * Appens förval för en rad (Marcus berättelse, Del 4 § varv 2): finns en
 * avgift kvar att betala är det den — en ny anmälan betalar avgiften först.
 * Är avgiften redan betald är det resten. Saknas båda (pris saknas i basen)
 * finns inget förval.
 */
export function forslagsbelopp(knappar: readonly Beloppsknapp[]): number | null {
  const avgift = knappar.find((k) => k.nyckel === 'avgift');
  if (avgift) return avgift.belopp;
  const allt = knappar.find((k) => k.nyckel === 'allt');
  return allt ? allt.belopp : null;
}

/** Vad radens NUVARANDE belopp är, sett mot radens egna kandidater. */
export type Beloppsklass = 'avgift' | 'resten' | 'allt' | 'annat' | 'saknas';

export function beloppsklass(rad: BekraftelseRad): Beloppsklass {
  const belopp = radbelopp(rad);
  if (belopp === null) return 'saknas';
  for (const k of rad.beloppsknappar) {
    if (k.belopp !== belopp) continue;
    if (k.nyckel === 'avgift') return 'avgift';
    return k.etikett === 'resten' ? 'resten' : 'allt';
  }
  return 'annat';
}

/**
 * Avstämningen i Lottas klumpar: så många anmälningsavgifter, så många
 * slutbetalningar, så mycket. Det är kontoutdragets form — "sex à 1 000 och
 * fyra à 1 500" — och det hon jämför mot innan hon trycker Registrera.
 */
export type Avstamning = { klass: Beloppsklass; antal: number; summa: number }[];

export function avstamning(rader: readonly BekraftelseRad[]): Avstamning {
  const ordning: Beloppsklass[] = ['avgift', 'resten', 'allt', 'annat', 'saknas'];
  const karta = new Map<Beloppsklass, { antal: number; summa: number }>();
  for (const rad of rader) {
    const klass = beloppsklass(rad);
    const post = karta.get(klass) ?? { antal: 0, summa: 0 };
    post.antal += 1;
    post.summa += radbelopp(rad) ?? 0;
    karta.set(klass, post);
  }
  return ordning
    .filter((k) => karta.has(k))
    .map((klass) => ({ klass, ...(karta.get(klass) ?? { antal: 0, summa: 0 }) }));
}

/**
 * Läsbart skäl till att en rad markerats (bulk-valet gick inte ihop). Skiljer
 * "avgiften redan betald" från "föreläsning utan fack" — samma två fall
 * `harledBeloppsknappar` drar bort avgifts-knappen för.
 */
export function markeringsSkal(rad: BekraftelseRad): string {
  const { anmalningsavgift, gallandePris, summaInbetalt } = rad.inkorg.betalning;
  if (rad.ejGenomforbar === 'avgift') {
    if (anmalningsavgift !== null && gallandePris !== null && anmalningsavgift >= gallandePris) {
      return 'Ett pris utan anmälningsavgift. Välj "Allt som saknas" eller skriv beloppet.';
    }
    if (anmalningsavgift !== null && summaInbetalt >= anmalningsavgift) {
      return 'Anmälningsavgiften är redan betald. Välj "Allt som saknas" eller skriv beloppet.';
    }
  }
  if (gallandePris === null) return 'Priset saknas i basen. Skriv beloppet för hand.';
  return 'Välj ett belopp eller skriv det för hand.';
}

/** Beloppet en rad faktiskt bär, som tal, eller `null` när fältet inte duger. */
export function radbelopp(rad: BekraftelseRad): number | null {
  const tal = normaliseraBeloppKlient(rad.belopp);
  return tal !== null && tal > 0 ? tal : null;
}

/**
 * Kan raden registreras nu? Markerad, giltigt belopp, och inte redan
 * registrerad — en rad vars registrering FALLERADE är omkörbar (inkorgens
 * "försök igen" är att registrera igen).
 */
export function arRegistrerbar(rad: BekraftelseRad): boolean {
  if (!rad.markerad) return false;
  if (rad.utfall?.klass === 'registrerad') return false;
  return radbelopp(rad) !== null;
}

/**
 * Antal kvitton för de FAKTISKT REGISTRERADE raderna — det tal "Skicka N
 * kvitton" ska bära efter registreringen. `summera` duger inte här: efter
 * registreringen är utfallet satt, så `arRegistrerbar` ger noll.
 */
export function antalRegistreradeKvitton(rader: readonly BekraftelseRad[]): number {
  return rader.filter((r) => r.utfall?.klass === 'registrerad' && r.medKvitto).length;
}

export type Summering = {
  /** Antal rader som kan registreras nu. */
  antal: number;
  /** Summan av deras belopp. */
  summa: number;
  /** Summa per betalsätt, i BETALSATT-ordning (utelämnar noll-poster). */
  perBetalsatt: { betalsatt: Betalsatt; summa: number; antal: number }[];
  /** Summa per event, i radordning (utelämnar noll-poster). */
  perEvent: { eventNamn: string; summa: number; antal: number }[];
  /** Antal rader vars kvitto-kryss är i. */
  antalKvitton: number;
};

export function summera(rader: readonly BekraftelseRad[]): Summering {
  const registrerbara = rader.filter(arRegistrerbar);
  const belopp = registrerbara.map((r) => radbelopp(r) ?? 0);

  const perBetalsattKarta = new Map<Betalsatt, { summa: number; antal: number }>();
  for (const r of registrerbara) {
    const post = perBetalsattKarta.get(r.betalsatt) ?? { summa: 0, antal: 0 };
    post.summa = summeraKronorKlient([post.summa, radbelopp(r) ?? 0]);
    post.antal += 1;
    perBetalsattKarta.set(r.betalsatt, post);
  }

  const perEventKarta = new Map<string, { summa: number; antal: number }>();
  for (const r of registrerbara) {
    const namn = r.inkorg.betalning.eventNamn ?? 'Utan event';
    const post = perEventKarta.get(namn) ?? { summa: 0, antal: 0 };
    post.summa = summeraKronorKlient([post.summa, radbelopp(r) ?? 0]);
    post.antal += 1;
    perEventKarta.set(namn, post);
  }

  return {
    antal: registrerbara.length,
    summa: summeraKronorKlient(belopp),
    perBetalsatt: BETALSATT.filter((b) => perBetalsattKarta.has(b)).map((betalsatt) => ({
      betalsatt,
      ...(perBetalsattKarta.get(betalsatt) as { summa: number; antal: number }),
    })),
    perEvent: [...perEventKarta.entries()].map(([eventNamn, v]) => ({ eventNamn, ...v })),
    antalKvitton: registrerbara.filter((r) => r.medKvitto).length,
  };
}

export type EventGruppRader = {
  eventId: string;
  eventNamn: string;
  eventStartdatum: string | null;
  rader: BekraftelseRad[];
};

/**
 * Grupperar raderna per event i FÖRSTA-SEDD-ordning (fixturens/hämtningens
 * ordning bevaras — ingen egen sortering, prototypen speglar datat rakt av).
 */
export function grupperaRader(rader: readonly BekraftelseRad[]): EventGruppRader[] {
  const karta = new Map<string, EventGruppRader>();
  for (const rad of rader) {
    const { eventId, eventNamn, eventStartdatum } = rad.inkorg.betalning;
    const nyckel = eventId ?? eventNamn ?? 'utan-event';
    let grupp = karta.get(nyckel);
    if (!grupp) {
      grupp = {
        eventId: nyckel,
        eventNamn: eventNamn ?? 'Utan event',
        eventStartdatum,
        rader: [],
      };
      karta.set(nyckel, grupp);
    }
    grupp.rader.push(rad);
  }
  return [...karta.values()];
}

function byggRader(oppna: readonly OppenBetalning[], idag: string, betalsatt: Betalsatt) {
  return oppna.map<BekraftelseRad>((betalning) => {
    const inkorg = harledRad(betalning, idag);
    const beloppsknappar = harledBeloppsknappar(inkorg);
    // Startbelopp = "allt som saknas" (kvar), samma förval som radformuläret
    // (`RegistreraForm` § forifyllt). Okänt/betalt pris ⇒ tomt fält.
    // Förvalet per rad (varv 2, Marcus val B): avgiften för nya, resten för
    // dem som betalat avgiften. Husets visningsform ("1 000"), samma som
    // `RegistreraForm` § forifyllt — fältet ska se ut som raden bredvid.
    const forslag = forslagsbelopp(beloppsknappar);
    const start = forslag !== null ? visaKronor(forslag) : '';
    return {
      nyckel: inkorg.nyckel,
      inkorg,
      beloppsknappar,
      belopp: start,
      betalsatt,
      datum: idag,
      medKvitto: true,
      markerad: true,
      notering: '',
      ejGenomforbar: null,
      utfall: null,
      inbetalningId: null,
      kvitto: 'ingen',
      kvittonummer: null,
    };
  });
}

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

export type BekraftelsestegModell = {
  rader: BekraftelseRad[];
  fas: Fas;
  /** Aktivt bulk-beloppsval (för markering i UI), eller `null`. */
  aktivGenvag: Beloppsgenvag | null;
  batchBetalsatt: Betalsatt;
  batchDatum: string;
  summering: Summering;
  /** Sätt ett belopp på ALLA rader ur genvägen (beslut 2). */
  sattGenvag: (genvag: Beloppsgenvag) => void;
  /** Sätt betalsätt på ALLA rader (beslut 3). */
  sattBetalsattAlla: (betalsatt: Betalsatt) => void;
  /** Sätt datum på ALLA rader (beslut 3). */
  sattDatumAlla: (datum: string) => void;
  sattRadBelopp: (nyckel: string, belopp: string) => void;
  sattRadBetalsatt: (nyckel: string, betalsatt: Betalsatt) => void;
  sattRadDatum: (nyckel: string, datum: string) => void;
  sattRadKvitto: (nyckel: string, medKvitto: boolean) => void;
  /** Markera/avmarkera en rad (varv 5). */
  sattRadMarkerad: (nyckel: string, markerad: boolean) => void;
  sattRadNotering: (nyckel: string, notering: string) => void;
  /**
   * Kör den simulerade registreringen, en rad i taget (beslut 4). `skickaNu`
   * = "Registrera och skicka": kvittona köas direkt till utskicksjobbet,
   * exakt som inkorgens `vidRegistrerad` gör vid `resultat.skickaNu`.
   */
  registrera: (skickaNu: boolean) => void;
  /** Köar alla väntande kvitton till utskicksjobbet ("Skicka N kvitton"). */
  skickaKvitton: () => void;
  /** Ångra en registrering — raden går tillbaka till listan (inkorgens Ångra). */
  angra: (nyckel: string) => void;
  /** Utskicksjobbet i `Jobbstatus`-form, så inkorgens `jobbDelutfall` kan läsa det. */
  jobbstatus: Jobbstatus | undefined;
  /** Återställ till redigeringsläget (ny körning). */
  aterstall: () => void;
};

/**
 * Hooken som bär bekräftelsestegets hela in-memory-modell. Varianterna får den
 * som prop och renderar den var för sig — de delar denna, inget annat.
 */
export function useBekraftelsesteg(
  oppna: readonly OppenBetalning[],
  idag: string,
): BekraftelsestegModell {
  const startBetalsatt = useMemo(() => lasSenasteBetalsatt(), []);
  const [rader, setRader] = useState<BekraftelseRad[]>(() =>
    byggRader(oppna, idag, startBetalsatt),
  );
  const [fas, setFas] = useState<Fas>('redigera');
  const [aktivGenvag, setAktivGenvag] = useState<Beloppsgenvag | null>('forslag');
  const [batchBetalsatt, setBatchBetalsatt] = useState<Betalsatt>(startBetalsatt);
  const [batchDatum, setBatchDatum] = useState(idag);
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

  const sattBetalsattAlla = useCallback((betalsatt: Betalsatt) => {
    setBatchBetalsatt(betalsatt);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, betalsatt })));
  }, []);

  const sattDatumAlla = useCallback((datum: string) => {
    setBatchDatum(datum);
    setRader((tidigare) => tidigare.map((rad) => ({ ...rad, datum })));
  }, []);

  const sattRadBelopp = useCallback((nyckel: string, belopp: string) => {
    setRader((tidigare) =>
      tidigare.map((rad) =>
        rad.nyckel === nyckel ? { ...rad, belopp, ejGenomforbar: null } : rad,
      ),
    );
  }, []);

  const sattRadBetalsatt = useCallback((nyckel: string, betalsatt: Betalsatt) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, betalsatt } : rad)),
    );
  }, []);

  const sattRadDatum = useCallback((nyckel: string, datum: string) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, datum } : rad)),
    );
  }, []);

  const sattRadKvitto = useCallback((nyckel: string, medKvitto: boolean) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, medKvitto } : rad)),
    );
  }, []);

  const sattRadMarkerad = useCallback((nyckel: string, markerad: boolean) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, markerad } : rad)),
    );
  }, []);

  const sattRadNotering = useCallback((nyckel: string, notering: string) => {
    setRader((tidigare) =>
      tidigare.map((rad) => (rad.nyckel === nyckel ? { ...rad, notering } : rad)),
    );
  }, []);

  // ═══ UTSKICKSJOBBET (varv 13) — simulerar kvittojobbet rad för rad ═══
  // Köade rader går `koad` → `skickas` → `skickat` med löpnummer i husets form
  // (`MM-2026-1001`, se `tests/api/kvitto-visa-skicka-igen.test.ts`). Inget
  // simulerat utskicksfel: Marcus berättelse bär ett registreringsfel
  // (Gunnar), inte ett kvittofel — ett påhittat andra fel hade varit brus.
  const lopnummerRef = useRef(1000);
  // Gunnar fallerar FÖRSTA gången, lyckas vid omkörning — så "Registrera 1
  // betalning" efter felet går att pröva som i den skarpa ytan.
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
      setFas('registrerar');
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
        }
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
    setRader((t) => t.map((r) => (r.kvitto === 'vantar' ? { ...r, kvitto: 'koad' } : r)));
    // Kön läses ur refen i nästa tick, efter att state landat.
    window.setTimeout(korJobb, 0);
  }, [korJobb]);

  const angra = useCallback((nyckel: string) => {
    setRader((t) =>
      t.map((r) =>
        r.nyckel === nyckel
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
    setFas('redigera');
    setAktivGenvag('forslag');
  }, [oppna, idag, batchBetalsatt]);

  const summering = useMemo(() => summera(rader), [rader]);

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
    registrera,
    skickaKvitton,
    angra,
    jobbstatus,
    aterstall,
  };
}
