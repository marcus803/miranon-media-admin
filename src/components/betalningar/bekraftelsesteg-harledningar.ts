import type { OppenBetalning } from '@/domain/schemas';
import { normaliseraBeloppKlient, summeraKronorKlient, visaKronor } from './belopp-inmatning';
import type { Betalsatt } from './betalsatt-minne';
import { type ImportradIMinnet, importradsklass, oppnaKandidater } from './importminne';
import {
  type Beloppsknapp,
  harledBeloppsknappar,
  harledRad,
  type InkorgsRad,
} from './inkorg-harledningar';

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
  /**
   * [TASK-402.4] BANKRADEN raden kom ur, när mataren var kontoutdraget.
   * `undefined` för den manuella och Åtgärds-sidans matare — fältet är
   * frånvarande, inte tomt, så en rad utan import aldrig kan förväxlas med en
   * importrad vars referens råkade vara `null`.
   */
  import?: Importkoppling;
};

/**
 * Vad en importrad bär med sig in i registreringen.
 *
 * `bankreferens` ÄR DUBBLETTSKYDDET (AC #4). Den skickas med i
 * `registrera-inbetalning` exakt som den gamla bekräftelselistan gjorde, så
 * Postgres partiella unika index (`inbetalningar_bankreferens_unik_idx`) kan
 * avvisa en referens som redan finns och EF:en översätta det till 409
 * `dubblett_bankreferens`. Tappas fältet på vägen till servern försvinner
 * skyddet — därför bor det på RADEN och inte i ett sidoregister som kan glida
 * isär från den.
 */
export type Importkoppling = {
  /** Radens nyckel i importminnet (`rad-<n>`). */
  nyckel: string;
  /** Bankens referens, eller `null` när filen saknar kolumnen. */
  bankreferens: string | null;
  /** Betalarens namn i banken. Skiljer sig ofta från deltagarens. */
  bankNamn: string | null;
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

/* ═══════════════════════════════════════════════════════════════════════════
   SÄTT ALLA BELOPP (TASK-402.8) — TVÅ KNAPPAR, RADENS EGNA KANDIDATER
   ═══════════════════════════════════════════════════════════════════════════

   Marcus 2026-09-06, prod-granskningen: *"i 8 av 10 fall … betalar dem 1000 kr
   (anmälningsavgift) först och sedan resterande belopp (1500). Men ibland
   betalar ju folk allt direkt … Appen ska fortfarande föreslå 'rätt' belopp
   som den gör nu, men Lotta kan liksom skriva över beloppen med denna knapp."*

   REGELN ÄR REN OCH BOR HÄR, INTE I EN HOOK. Två implementationer av modellen
   (`useBekraftelsesteg` och prototypens simulering) ska ge exakt samma utfall,
   och regeln har fyra kanter som är värda ett api-pure-test var — inte en
   granskning per implementation.

   VARFÖR DEN INTE ÄR `sattGenvag`. Genvägarna (`Beloppsgenvag`, varianterna
   A/B) satte ALLA rader och gav en rad UTAN kandidat en tom siffra plus
   `ejGenomforbar` — alltså flyttade den raden till "Behöver din hand". Det är
   raka motsatsen till vad kortets AC #3 kräver: *"rader utan kandidat och
   Behöver-din-hand-högen rörs inte"*. Formen som Marcus omprövat är SMALARE än
   genvägarna, och att återanvända deras mekanik hade smugit in en flytt Lotta
   aldrig bad om. Genvägarna lever kvar orörda tills `TASK-402.6` river A/B. */

/** De två sätt-alla-valen. En äkta delmängd av `Beloppsgenvag`, med avsikt. */
export type SattAllaVal = 'avgift' | 'allt';

/**
 * Raden saknar ett belopp — den bor i "Behöver din hand".
 *
 * Flyttad hit ur `VariantC.tsx` i `TASK-402.8`: hög-indelningen och
 * sätt-alla-regeln måste läsa SAMMA predikat, annars kan en rad vara i högen
 * enligt formen och utanför den enligt regeln.
 */
export function saknarBelopp(rad: BekraftelseRad): boolean {
  return rad.ejGenomforbar !== null || rad.belopp.trim() === '';
}

/**
 * Ändrar ett sätt-alla-tryck denna rad? Fyra villkor, alla ur kortets AC #3.
 *
 *   1. MARKERAD. En avmarkerad rad räknas ingenstans och registreras inte —
 *      att ändra dess belopp hade varit en osynlig ändring.
 *   2. INTE REDAN REGISTRERAD. Raden är bokförd; dess belopp är historik.
 *      (En rad vars registrering FALLERADE är däremot med — den ska kunna
 *      köras om med ett nytt belopp, samma regel som `arRegistrerbar`.)
 *   3. INTE I "BEHÖVER DIN HAND". Högen väntar på Lottas hand, och ett
 *      bulk-tryck som fyllde den hade tagit ifrån henne just det beslutet.
 *   4. RADEN HAR KANDIDATEN. `genvagsbelopp` ger `null` när valet inte går
 *      ihop (avgiften redan betald, pris utan fack, pris saknas i basen) —
 *      då rörs raden inte alls. Den behåller appens förslag.
 */
export function berorsAvSattAlla(rad: BekraftelseRad, val: SattAllaVal): boolean {
  if (!rad.markerad) return false;
  if (rad.utfall?.klass === 'registrerad') return false;
  if (saknarBelopp(rad)) return false;
  return genvagsbelopp(rad, val) !== null;
}

/** Hur många rader ett sätt-alla-tryck faktiskt rör — knappens besked. */
export function antalSattAlla(rader: readonly BekraftelseRad[], val: SattAllaVal): number {
  return rader.filter((rad) => berorsAvSattAlla(rad, val)).length;
}

/**
 * Raderna efter ett sätt-alla-tryck. Berörda rader får sin EGEN kandidat
 * (`avgiftKvar` respektive `kvar`, ur inkorgens `harledBeloppsknappar`) — det
 * finns inget delat belopp, eftersom priset är per event och per person.
 *
 * Orörda rader returneras som SAMMA objekt, inte en kopia: React ska kunna se
 * på referensen att kortet inte ändrats.
 */
export function sattAllaBelopp(
  rader: readonly BekraftelseRad[],
  val: SattAllaVal,
): BekraftelseRad[] {
  return rader.map((rad) => {
    if (!berorsAvSattAlla(rad, val)) return rad;
    const belopp = genvagsbelopp(rad, val);
    return belopp === null ? rad : { ...rad, belopp: visaKronor(belopp), ejGenomforbar: null };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ÅTERSTÄLL FÖRSLAGEN (TASK-402.8 varv 3) — VÄGEN TILLBAKA
   ═══════════════════════════════════════════════════════════════════════════

   Marcus 2026-09-06: *"Sedan borde väl det finnas en 'Ångra knapp' också här
   eller? Om hon vill ändra tillbaka till föreslaget belopp?"*

   VAD DEN ÅTERSTÄLLER TILL: `forslagsbelopp`, alltså exakt det raden hade när
   sidan byggdes (`byggRader`). Inte "beloppet före senaste trycket" — en
   ångra-STACK hade krävt en historik som ingenting annat på sidan har, och
   den hade dessutom svarat på en annan fråga än Marcus ställde.

   VAD DEN RÖR: varje MARKERAD, ej registrerad rad utanför "Behöver din hand"
   vars belopp AVVIKER från förslaget — inklusive rader Lotta skrivit för
   hand. Att bara backa det ett bulk-tryck ändrade hade varit en osynlig
   skillnad: blockets egen text lovar "alla markerade rader", och en knapp som
   hemligt undantar de handskrivna raderna är omöjlig att förutsäga.

   VAD DEN INTE RÖR: rader utan förslag (priset saknas i basen), hand-högen,
   avmarkerade och redan registrerade rader — samma fyra kanter som
   `sattAllaBelopp`, av samma skäl.

   VARFÖR "AVVIKER" INGÅR I PREDIKATET: en rad som redan bär sitt förslag
   ÄNDRAS inte av knappen och ska därför inte räknas i beskedet. Är ingen rad
   avvikande betyder knappen ingenting, och då är den avstängd. */

/**
 * Skulle en återställning ändra denna rad? Fyra kanter som `berorsAvSattAlla`
 * plus en femte: beloppet måste faktiskt AVVIKA från förslaget.
 */
export function berorsAvAterstallning(rad: BekraftelseRad): boolean {
  if (!rad.markerad) return false;
  if (rad.utfall?.klass === 'registrerad') return false;
  if (saknarBelopp(rad)) return false;
  const forslag = forslagsbelopp(rad.beloppsknappar);
  if (forslag === null) return false;
  return radbelopp(rad) !== forslag;
}

/** Hur många rader en återställning faktiskt ändrar — knappens besked. */
export function antalAterstallning(rader: readonly BekraftelseRad[]): number {
  return rader.filter(berorsAvAterstallning).length;
}

/**
 * Raderna efter "Återställ förslagen". Orörda rader returneras som SAMMA
 * objekt, precis som i `sattAllaBelopp`.
 */
export function aterstallForslag(rader: readonly BekraftelseRad[]): BekraftelseRad[] {
  return rader.map((rad) => {
    if (!berorsAvAterstallning(rad)) return rad;
    const forslag = forslagsbelopp(rad.beloppsknappar);
    return forslag === null ? rad : { ...rad, belopp: visaKronor(forslag), ejGenomforbar: null };
  });
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
   KONTOUTDRAGET SOM MATARE (TASK-402.4)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * En importrad som ännu inte pekar på en anmälan — eller som aldrig ska göra
 * det (dubbletten).
 *
 * VARFÖR DEN INTE ÄR EN `BekraftelseRad`: stegets rad ÄR en öppen betalning
 * med Lottas val ovanpå. `inkorg`, `beloppsknappar` och hela prislogiken
 * förutsätter en anmälan. En omatchad bankrad har ingen, och en osäker har
 * flera kandidater där ett val vore en gissning med en bock framför —
 * precis det `bankimport-rader.ts` § DE TRE DEFAULTVÄRDENA förbjuder.
 *
 * Att ge `BekraftelseRad` en nullbar `inkorg` hade spridit den nullbarheten
 * till varje härledning, varje summering och varje kort i formen, för ett
 * tillstånd som per definition är ÖVERGÅENDE: så fort Lotta väljer en anmälan
 * blir raden en fullvärdig `BekraftelseRad` (`byggImportrad`) och lämnar denna
 * typ för alltid. Dubbletten är undantaget som aldrig konverteras, och det är
 * hela dess poäng.
 */
export type ObestamdImportrad = {
  nyckel: string;
  /** `saker` finns inte här — en säker rad är redan en `BekraftelseRad`. */
  klass: 'osaker' | 'omatchad' | 'dubblett';
  /** Betalarens namn i banken, eller husets fallback. */
  namn: string;
  belopp: number;
  datum: string | null;
  telefon: string | null;
  meddelande: string | null;
  bankreferens: string | null;
  /** Matchningens skäl i klartext, eller dubblettens. */
  grund: string;
  /** Kandidaterna som fortfarande är öppna, bäst först. Tom för omatchad/dubblett. */
  kandidater: InkorgsRad[];
  /** Datum raden importerades tidigare. Satt endast för dubbletter. */
  tidigareImporterad: string | null;
};

/**
 * En bankrad som PEKAR PÅ en anmälan blir en vanlig stegrad — med bankradens
 * belopp och datum i stället för radens förval.
 *
 * BELOPPET ÄR BANKENS, ALLTID (AC #2: "säker rad: förbockad med bankradens
 * belopp och datum"). Det är hela skillnaden mot den manuella mataren, där
 * beloppet är appens förslag: banken VET vad som betalades, appen gissar.
 *
 * DATUMET FALLER TILL `idag` när filen saknar det, och det är parserns egen
 * gräns som gör fallet möjligt (`Transaktion.datum` är nullbar med avsikt:
 * "ett saknat datum är något Lotta behöver se och fylla i"). Hon ser det
 * genom att öppna radformuläret, där datumet står som vilket annat fält som
 * helst.
 */
export function byggImportrad(
  betalning: OppenBetalning,
  bankrad: {
    nyckel: string;
    belopp: number;
    datum: string | null;
    bankreferens: string | null;
    namn: string | null;
  },
  idag: string,
  betalsatt: Betalsatt,
): BekraftelseRad {
  const inkorg = harledRad(betalning, idag);
  return {
    nyckel: inkorg.nyckel,
    inkorg,
    beloppsknappar: harledBeloppsknappar(inkorg),
    belopp: visaKronor(bankrad.belopp),
    betalsatt,
    datum: bankrad.datum ?? idag,
    medKvitto: true,
    markerad: true,
    notering: '',
    ejGenomforbar: null,
    utfall: null,
    inbetalningId: null,
    kvitto: 'ingen',
    kvittonummer: null,
    import: {
      nyckel: bankrad.nyckel,
      bankreferens: bankrad.bankreferens,
      bankNamn: bankrad.namn,
    },
  };
}

/**
 * Delar importens rader i de två högar formen renderar: de som är klara att
 * registreras och de som väntar på Lottas hand.
 *
 * ORDNINGEN ÄR FILENS (`radnummer`), inte hämtningens — och det är ett
 * medvetet avsteg från den manuella matarens regel (`Bekraftelsesteget.tsx`
 * § ORDNINGEN ÄR HÄMTNINGENS). Skälet är att Lotta jämför mot kontoutdraget
 * hon har framför sig: raderna i appen ska ligga i samma ordning som raderna i
 * filen. Grupperingen per event sker efteråt (`grupperaRader`) och rör bara de
 * klara raderna.
 *
 * `oppna` är HELA mängden öppna betalningar, inte ett urval: en omatchad rads
 * sökfält söker i samma rymd som inkorgens sökning, och en kandidat måste gå
 * att slå upp oavsett om den råkade ligga i något urval.
 */
export function byggImportsteg(
  rader: readonly ImportradIMinnet[],
  oppna: readonly OppenBetalning[],
  idag: string,
  betalsatt: Betalsatt,
): { rader: BekraftelseRad[]; obestamda: ObestamdImportrad[] } {
  const perId = new Map(oppna.map((b) => [b.anmalanRecordId, b]));
  const oppnaIds = new Set(perId.keys());
  const klara: BekraftelseRad[] = [];
  const obestamda: ObestamdImportrad[] = [];

  for (const rad of [...rader].sort((a, b) => a.radnummer - b.radnummer)) {
    const klass = importradsklass(rad, oppnaIds);
    if (klass === 'saker') {
      // `vald` ÄR satt och öppen — det är vad `saker` betyder (se
      // `importradsklass`), så uppslaget kan inte missa.
      klara.push(
        byggImportrad(perId.get(rad.vald as string) as OppenBetalning, rad, idag, betalsatt),
      );
      continue;
    }
    obestamda.push({
      nyckel: rad.nyckel,
      klass,
      namn: rad.namn ?? 'Utan namn',
      belopp: rad.belopp,
      datum: rad.datum,
      telefon: rad.telefon,
      meddelande: rad.meddelande,
      bankreferens: rad.bankreferens,
      grund:
        klass === 'dubblett'
          ? 'Den här bankraden är redan registrerad. Ingen ny inbetalning skapas.'
          : rad.grund,
      kandidater:
        klass === 'osaker'
          ? oppnaKandidater(rad, oppnaIds).map((id) =>
              harledRad(perId.get(id) as OppenBetalning, idag),
            )
          : [],
      tidigareImporterad: rad.tidigareImporterad,
    });
  }

  return { rader: klara, obestamda };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRON TILL DET DELADE "REGISTRERAT NU"-BLOCKET (TASK-402.2)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Blockets radmodell, DEKLARERAD HÄR I STÄLLET FÖR IMPORTERAD — och det är
 * inte en dubblett utan ett medvetet lagerval.
 *
 * `RegistreratNuBlock.tsx` är en `.tsx`-fil, och `tsconfig.tests.json`
 * kompilerar api-pure-sviten UTAN `--jsx` (mätt: `error TS6142` på varje
 * typimport härifrån). En ren härledningsmodul som ska kunna testas som ren
 * funktion får därför inte peka in i komponentlagret alls — beroendet går EN
 * väg, och den vägen är nedåt.
 *
 * TYPERNA KAN INTE DRIFTA I TYSTHET: `VariantC.tsx` matar `blockrader()`s
 * resultat rakt in i `RegistreratNuBlock`s `registrerade`-prop, och
 * TypeScripts strukturella typning fäller call site i samma sekund fälten
 * skiljer sig. Kontraktet bevakas alltså av kompilatorn, på det ställe där
 * det faktiskt används.
 */
export type Blockrad = {
  inbetalningId: string;
  namn: string;
  belopp: number;
  betalsatt: Betalsatt;
  /** Lottas kryss vid registreringen. */
  medKvitto: boolean;
  /** Anmälans record-ID — blocket behöver den för Ångras cache-patch. */
  radNyckel?: string;
};

/** Ett kvitto i den SESSION-LOKALA kön. Samma lagerskäl som `Blockrad`. */
export type KoatKvitto = { inbetalningId: string; namn: string; belopp: number };

/**
 * De registrerade raderna i blockets radmodell.
 *
 * `radNyckel` sätts ALLTID här, till skillnad från importvägen: en rad i
 * steget kommer per definition ur en synlig inkorgsrad, och blocket behöver
 * nyckeln för att Ångra ska kunna skriva serverns omräkning rakt in i cachen
 * (`useRaderaInbetalning` § `skrivHarledningTillOppna`).
 *
 * En registrerad rad UTAN `inbetalningId` hoppas över. Den kan inte uppstå i
 * den skarpa vägen (id:t kommer ur serverns svar), men typen tillåter den —
 * och en post utan id hade gjort Ångra och kvittokön omöjliga att koppla till
 * rätt rad.
 */
export function blockrader(rader: readonly BekraftelseRad[]): Blockrad[] {
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
export function vantandeKvitton(rader: readonly BekraftelseRad[]): KoatKvitto[] {
  return rader
    .filter((r) => r.kvitto === 'vantar' && r.inbetalningId !== null)
    .map((r) => ({
      inbetalningId: r.inbetalningId as string,
      namn: r.inkorg.namn,
      belopp: radbelopp(r) ?? 0,
    }));
}

/** De fem fälten radformuläret lämnar tillbaka vid "Klar". */
export type Radvarden = Pick<
  BekraftelseRad,
  'belopp' | 'betalsatt' | 'datum' | 'medKvitto' | 'notering'
>;
