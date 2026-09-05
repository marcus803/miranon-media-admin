import type { Jobbstatus, OppenBetalning } from '@/domain/schemas';
import { normaliseraBeloppKlient, summeraKronorKlient, visaKronor } from './belopp-inmatning';
import type { Betalsatt } from './betalsatt-minne';
import {
  type Beloppsknapp,
  harledBeloppsknappar,
  harledRad,
  type InkorgsRad,
} from './inkorg-harledningar';
import type { SessionsRad, VantandeKvitto } from './RegistreratNuBlock';

/**
 * [TASK-402.3] Bekräftelsestegets RENA HÄRLEDNINGAR — raden, avstämningen,
 * summeringen, grupperingen, "vad kan registreras nu" och omkörnings-urvalet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR MODULEN FINNS: FUNKTIONERNA LEVDE I ETT SIMULERINGSLAGER SOM RIVS
 * ═══════════════════════════════════════════════════════════════════════════
 * Fram till promoveringen bodde de här funktionerna i
 * `prototype/bekraftelseSimulering.ts` — samma fil som bär prototypens
 * in-memory-mutation, och som `ADR-103` B2 steg 4 river efter Marcus stämpel
 * (`TASK-402.6`). Härledningarna är däremot INTE prototyp-kod: de bär
 * avstämningen Lotta jämför med kontoutdraget, och de ska överleva rivningen.
 *
 * Flytten är REN — funktionskropparna är oförändrade, ord för ord.
 * `bekraftelseSimulering.ts` RE-EXPORTERAR dem tills den rivs, så
 * `VariantA`/`VariantB`/`radfalt.tsx` fortsätter kompilera utan en enda
 * ändring i sina importrader.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INGEN EGEN PRISREGEL, ALDRIG
 * ═══════════════════════════════════════════════════════════════════════════
 * All prislogik LÅNAS ur `inkorg-harledningar.ts` (`harledRad`,
 * `harledBeloppsknappar`). Det var prototypens krav och det är den skarpa
 * ytans lika hårt: en andra pengalogik vid sidan av inkorgens är exakt det
 * `ADR-128` finns för att förhindra.
 *
 * INGEN REACT HÄR. Modulen är ren indata → utdata och testas som sådan
 * (`tests/api/bekraftelsesteg-harledningar.test.ts`) — hooken som driver
 * tillståndet bor i `useBekraftelsesteg.ts`, formen i `VariantC.tsx`.
 */

/**
 * Beloppsgenvägarna (grillningens beslut 2) plus `forslag` — appens eget
 * förval per rad. BULKVALEN ÄR RIVNA UR FORMEN sedan konvergens varv 12
 * (Marcus), men `forslag` lever kvar som radens startbelopp och typen bärs
 * fortfarande av `VariantA`/`VariantB` tills de rivs i `TASK-402.6`.
 */
export type Beloppsgenvag = 'forslag' | 'avgift' | 'allt' | 'annat';

export const BETALSATT: readonly Betalsatt[] = ['Swish', 'Bankgiro', 'Plusgiro'];

export type RadUtfall = { klass: 'registrerad'; text: string } | { klass: 'fel'; text: string };

export type Kvittoläge = 'ingen' | 'vantar' | 'koad' | 'skickas' | 'skickat' | 'fel';

export type Fas = 'redigera' | 'registrerar' | 'klart';

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
   * Markerad = med i registreringen. Raderna kommer markerade från mataren;
   * ett tryck på kortet avmarkerar, som på eventdetaljen och Åtgärds-sidan
   * (`MarkerbartKort`). En avmarkerad rad står kvar i listan, vit, och räknas
   * ingenstans.
   */
  markerad: boolean;
  /** Notering, som i inkorgens formulär. */
  notering: string;
  /**
   * Satt när det SENASTE bulk-beloppsvalet inte gick ihop för raden (avgiften
   * redan betald, eller en föreläsning utan fack). Raden får ingen siffra utan
   * en markering och väntar på hennes hand. Bär vilket val det var.
   */
  ejGenomforbar: Beloppsgenvag | null;
  /** Registreringens utfall, satt efter "Registrera N". */
  utfall: RadUtfall | null;
  /** Inbetalningens id ur serverns svar; `null` tills raden registrerats. */
  inbetalningId: string | null;
  /**
   * Kvittots läge efter registreringen — inkorgens `kvittolage`-tillstånd:
   * `ingen` (inget kryss), `vantar` (i den session-lokala kön), `koad`/
   * `skickas`/`skickat`/`fel` (utskicksjobbets radstatus).
   */
  kvitto: Kvittoläge;
  kvittonummer: string | null;
};

/** Beloppet en genväg ger för en rad, eller `null` när valet inte går ihop. */
export function genvagsbelopp(rad: BekraftelseRad, genvag: Beloppsgenvag): number | null {
  if (genvag === 'annat') return null;
  if (genvag === 'forslag') return forslagsbelopp(rad.beloppsknappar);
  const knapp = rad.beloppsknappar.find((k) => k.nyckel === genvag);
  return knapp ? knapp.belopp : null;
}

/**
 * Appens förval för en rad (Marcus berättelse, S121 Del 4 § varv 2): finns en
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
 * [TASK-402.3 AC #6] OMKÖRNINGS-URVALET: vilka rader "Försök igen" faktiskt
 * kör. Regeln är EN mening — de registrerbara rader som redan fallerat EN
 * gång — men den är värd en egen, testbar funktion av två skäl.
 *
 * För det FÖRSTA är den inte samma sak som `rader.filter(arRegistrerbar)`:
 * ett omkörnings-tryck får aldrig dra med sig en rad som ännu inte prövats
 * (t.ex. en som Lotta markerade EFTER den första körningen), och inte heller
 * en rad vars fel Lotta redan läkt genom att ändra beloppet — den senare bär
 * fortfarande `utfall.klass === 'fel'` tills nästa körning skriver över det,
 * vilket är rätt: den ska köras med.
 *
 * För det ANDRA avgör den knappens ORD. `baraOmkorning` nedan är sant först
 * när INGA andra registrerbara rader finns kvar, och det är då knappen byter
 * från "Registrera N inbetalningar" till "Försök igen".
 */
export function omkorningsUrval(rader: readonly BekraftelseRad[]): BekraftelseRad[] {
  return rader.filter((rad) => arRegistrerbar(rad) && rad.utfall?.klass === 'fel');
}

/**
 * Är allt som går att registrera redan fallerat en gång? Då är knappen en
 * OMKÖRNING, inte en förstagångsregistrering.
 */
export function baraOmkorning(rader: readonly BekraftelseRad[]): boolean {
  const registrerbara = rader.filter(arRegistrerbar);
  return registrerbara.length > 0 && registrerbara.every((r) => r.utfall?.klass === 'fel');
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
 * Grupperar raderna per event i FÖRSTA-SEDD-ordning (hämtningens ordning
 * bevaras — ingen egen sortering, steget speglar datat rakt av).
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

/**
 * Bygger stegets rader ur de öppna betalningarna. Startbeloppet är radens
 * FÖRVAL (`forslagsbelopp`): avgiften för den som inte betalat något, resten
 * för den som redan betalat avgiften. Husets visningsform ("1 000"), samma som
 * `RegistreraForm` § forifyllt — fältet ska se ut som raden bredvid.
 */
export function byggRader(
  oppna: readonly OppenBetalning[],
  idag: string,
  betalsatt: Betalsatt,
): BekraftelseRad[] {
  return oppna.map<BekraftelseRad>((betalning) => {
    const inkorg = harledRad(betalning, idag);
    const beloppsknappar = harledBeloppsknappar(inkorg);
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

/* ═══════════════════════════════════════════════════════════════════════════
   BRON TILL DET DELADE "REGISTRERAT NU"-BLOCKET (TASK-402.2)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * De registrerade raderna i blockets EGEN radmodell (`SessionsRad`).
 *
 * `radNyckel` sätts ALLTID här, till skillnad från importvägen: en rad i
 * steget kommer per definition ur en synlig inkorgsrad, och blocket behöver
 * nyckeln för att Ångra ska kunna skriva serverns omräkning rakt in i cachen
 * (`useRaderaInbetalning` § `skrivHarledningTillOppna`).
 */
export function blockrader(rader: readonly BekraftelseRad[]): SessionsRad[] {
  return rader
    .filter((r) => r.utfall?.klass === 'registrerad' && r.inbetalningId !== null)
    .map((r) => ({
      inbetalningId: r.inbetalningId as string,
      namn: r.inkorg.namn,
      belopp: radbelopp(r) ?? 0,
      betalsatt: r.betalsatt,
      medKvitto: r.medKvitto,
      radNyckel: r.nyckel,
    }));
}

/** Kvittona som ligger i den SESSION-LOKALA kön ("Skicka N kvitton"). */
export function vantandeKvitton(rader: readonly BekraftelseRad[]): VantandeKvitto[] {
  return rader
    .filter((r) => r.kvitto === 'vantar' && r.inbetalningId !== null)
    .map((r) => ({
      inbetalningId: r.inbetalningId as string,
      namn: r.inkorg.namn,
      belopp: radbelopp(r) ?? 0,
    }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODELLEN VARIANT C KONSUMERAR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Efterlägets kopplingar — allt `RegistreratNuBlock` behöver som INTE går att
 * härleda ur raderna.
 *
 * SEPARATIONEN ÄR AVSIKTLIG. Raderna (`modell.rader`) är samma i båda
 * världarna; det som skiljer den promoverade ytan från DEV-prototypen är
 * VART knapparna leder — och det är exakt denna typ. Formen (`VariantC`) ser
 * bara ett objekt med callbacks och vet aldrig vilken värld den står i.
 */
export type BekraftelseBlockKopplingar = Pick<
  import('./RegistreratNuBlock').RegistreratNuBlockProps,
  | 'granskningsBlockRef'
  | 'jobbrader'
  | 'utfall'
  | 'bekraftelseSynlig'
  | 'onDoljBekraftelse'
  | 'koaPending'
  | 'onSkickaKvitton'
  | 'forhandsgranskaPagar'
  | 'forhandsgranskaAllaPagar'
  | 'onForhandsgranska'
  | 'onForhandsgranskaAlla'
  | 'onSkickaIgen'
  | 'onAngra'
  | 'angraPending'
  | 'angraFel'
  | 'onAngraDialogOppen'
  | 'forhandsgranskaFel'
>;

/**
 * Modellen `VariantC` renderar. TVÅ implementationer uppfyller den:
 * `useBekraftelsesteg` (skarp — inkorgens registrerings-, kvitto- och
 * ångra-vägar) och `useBekraftelsestegSimulering` (DEV-prototypens in-memory-
 * lager, rivs i `TASK-402.6`). Formen ser ingen skillnad.
 */
export type BekraftelsestegModell = {
  rader: BekraftelseRad[];
  fas: Fas;
  /** Aktivt bulk-beloppsval (VariantA/B), eller `null`. */
  aktivGenvag: Beloppsgenvag | null;
  batchBetalsatt: Betalsatt;
  batchDatum: string;
  summering: Summering;
  sattGenvag: (genvag: Beloppsgenvag) => void;
  sattBetalsattAlla: (betalsatt: Betalsatt) => void;
  sattDatumAlla: (datum: string) => void;
  sattRadBelopp: (nyckel: string, belopp: string) => void;
  sattRadBetalsatt: (nyckel: string, betalsatt: Betalsatt) => void;
  sattRadDatum: (nyckel: string, datum: string) => void;
  sattRadKvitto: (nyckel: string, medKvitto: boolean) => void;
  sattRadMarkerad: (nyckel: string, markerad: boolean) => void;
  sattRadNotering: (nyckel: string, notering: string) => void;
  /**
   * [TASK-402.3 AC #7] Radformulärets "Klar" i ETT anrop — det delade
   * `RegistreraForm`s `redigera`-läge lämnar alla fem fälten samlade
   * (`RedigeringsVarden`), och en uppdatering per fält hade gett fem
   * omritningar där en räcker.
   */
  sattRadVarden: (nyckel: string, varden: Radvarden) => void;
  /**
   * Registrerar raderna EN I TAGET. `skickaNu` = "Registrera och skicka":
   * kvittona köas direkt när alla svarat, exakt som inkorgens `vidRegistrerad`
   * gör vid `resultat.skickaNu`.
   */
  registrera: (skickaNu: boolean) => void;
  /**
   * Körningens räkning medan `fas === 'registrerar'`: hur många av batchens
   * rader som är avgjorda. `null` utanför en körning.
   */
  korning: { totalt: number; klara: number } | null;
  /** Köar alla väntande kvitton ("Skicka N kvitton"). */
  skickaKvitton: () => void;
  /** Utskicksjobbet i `Jobbstatus`-form, så `jobbDelutfall` kan läsa det. */
  jobbstatus: Jobbstatus | undefined;
  /** Efterlägets kopplingar — se `BekraftelseBlockKopplingar`. */
  block: BekraftelseBlockKopplingar;
  /** Återställ till redigeringsläget (ny körning). */
  aterstall: () => void;
};

/** De fem fälten radformuläret lämnar tillbaka vid "Klar". */
export type Radvarden = Pick<
  BekraftelseRad,
  'belopp' | 'betalsatt' | 'datum' | 'medKvitto' | 'notering'
>;
