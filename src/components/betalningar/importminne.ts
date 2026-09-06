import { z } from 'zod';
import type { Parsresultat } from './bankimport-parser';
import type { Importradstillstand } from './bankimport-rader';
import { radnyckel } from './bankimport-rader';

/**
 * [TASK-402.4, PRD TASK-402 § Kontoutdraget] IMPORTMINNET — överlämningen
 * från inkorgens kontoutdrags-import till bekräftelsesteget.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR ETT MINNE OCH INTE EN URL-PARAMETER
 * ═══════════════════════════════════════════════════════════════════════════
 * Steget är en EGEN route (`/mer/betalningar/registrera`, un-nestad med
 * avsikt — PRD berättelse 5), så inkorgen avmonteras vid hoppet och ett rent
 * komponent-state dör med den. Kvar finns två vägar: URL:en eller ett
 * sessionsbundet lager.
 *
 * URL:EN DUGER INTE, och det är ett kravsbeslut, inte en smakfråga: en
 * bankrad bär belopp, datum, bankreferens, betalarens namn, telefonnummer och
 * meddelande. Att lägga den datan i en sök-parameter hade skrivit
 * personuppgifter och betalningsdata i webbläsarens historik, i varje delad
 * länk och i varje serverlogg som råkar se URL:en. Uppdragets egen gräns säger
 * samma sak i en mening: "URL:en får inte bära raddatan".
 * `markerings-minne.ts` (`TASK-402.1`) löste samma överlämnings-problem för
 * inkorgens markering, och DEN datan är bara record-ID:n — här är innehållet
 * känsligare, aldrig mindre.
 *
 * URL:en bär därför en enda sak: `kalla=import`, alltså VILKEN matare som
 * fyllde steget. Raddatan bor här.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `sessionStorage`, SAMMA LIVSLÄNGD SOM MARKERINGSMINNET
 * ═══════════════════════════════════════════════════════════════════════════
 * En import är ett pågående arbetsmoment. En importlista som kom tillbaka
 * efter en omstart nästa lördag vore ett spöke — Lotta skulle mötas av rader
 * ur en fil hon inte längre har framför sig. `sessionStorage` dör med fliken
 * och är därför den ärliga livslängden. Skilj den från `bankmappning-minne.ts`
 * som är `localStorage`: kolumnmappningen och importloggen SKA överleva i
 * månader, listan ska inte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REGLERNA ÄR RENA FUNKTIONER, LAGRET ÄR TUNT (AC #5)
 * ═══════════════════════════════════════════════════════════════════════════
 * Tillståndsklassningen (`importradsklass`) är en ren funktion över indata och
 * prövas som sådan i `tests/api/importminne.test.ts` utan webbläsare — exakt
 * den form AC #5 kräver ("api-pure täcker tillståndsklassningen som ren
 * funktion"). Bara de tre nedersta funktionerna rör `sessionStorage`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KASTAR ALDRIG
 * ═══════════════════════════════════════════════════════════════════════════
 * Samma kontrakt som `markerings-minne.ts` och `betalsatt-minne.ts`:
 * `sessionStorage` kan kasta redan vid ÅTKOMST i privat läge. Faller läsningen
 * visar steget sitt "läs in kontoutdraget igen"-läge i stället för att
 * krascha; faller skrivningen märker importen det direkt och stannar kvar i
 * inkorgen (se `SwishImport.tsx` § ÖVERLÄMNINGEN).
 */

const IMPORT_NYCKEL = 'mm.betalningar.import';

/**
 * EN bankrad, som steget behöver se den.
 *
 * KANDIDATERNA ÄR ID:N, INTE RADER. Matchningen körs i inkorgen mot de öppna
 * betalningarna DÄR, men steget hämtar sin egen färska mängd — och mellan de
 * två ögonblicken kan en anmälan ha blivit betald i en annan flik. Att lagra
 * hela `InkorgsRad`-objekt hade fryst en bild av verkligheten som steget sedan
 * hade visat som sanning. ID:n tvingar fram en ny uppslagning mot färsk data,
 * och en kandidat som försvunnit faller då ut ur listan i stället för att
 * erbjudas (se `importradsklass`).
 */
export const ImportradSchema = z.object({
  /** Radens stabila nyckel, `bankimport-rader.ts` § `radnyckel`. */
  nyckel: z.string(),
  /** Filens egen radräkning, 1-baserad. Bär ordningen. */
  radnummer: z.number(),
  /** Bankradens belopp i kronor, redan normaliserat av parsern. */
  belopp: z.number(),
  /** Bankradens datum, ISO `YYYY-MM-DD`, eller `null` när filen saknar det. */
  datum: z.string().nullable(),
  /** Bankens referens: dubblettnyckeln mot databasens partiella unika index. */
  bankreferens: z.string().nullable(),
  /** Betalarens namn som banken registrerat det (Swish-ägaren). */
  namn: z.string().nullable(),
  telefon: z.string().nullable(),
  meddelande: z.string().nullable(),
  /** Matchningens klass i inkorgen. Dubbletten är en ÖVERLAGRING, inte en klass här. */
  matchning: z.enum(['saker', 'osaker', 'omatchad']),
  /** Matchningens skäl i klartext. Visas på raden i hand-högen. */
  grund: z.string(),
  /** Kandidaternas anmälnings-record-ID:n, bäst först. */
  kandidater: z.array(z.string()),
  /** Anmälan raden ska bokföras på. Satt bara när matchningen var säker. */
  vald: z.string().nullable(),
  /** Datumet raden importerades tidigare, enligt den lokala importloggen. */
  tidigareImporterad: z.string().nullable(),
});

export type ImportradIMinnet = z.infer<typeof ImportradSchema>;

export const ImportminneSchema = z.object({
  /**
   * Tidpunkten minnet skrevs, ISO. IDENTITETEN steget bygger sin
   * ombyggnads-signatur på: en NY import ger ett nytt värde och därmed nya
   * rader, medan en refetch av de öppna betalningarna aldrig gör det.
   */
  skapad: z.string(),
  filnamn: z.string(),
  /** Banknamnet ur kolumnmappningen. Tomt när mappningen saknar det. */
  bank: z.string(),
  /** Rader lästa ur filen (efter parserns radfilter). */
  lasta: z.number(),
  /** Rader i filen som inte var inbetalningar. */
  bortfiltrerade: z.number(),
  /** Parserns radfel, per filrad. */
  fel: z.array(z.object({ radnummer: z.number(), skal: z.string() })),
  rader: z.array(ImportradSchema),
});

export type Importminne = z.infer<typeof ImportminneSchema>;

/** Det steget behöver veta om KÄLLAN, utan raderna. */
export type Importoversikt = Omit<Importminne, 'rader' | 'skapad'>;

/**
 * [TASK-416.6 fix-runda 2, fynd 1] `Importoversikt` UR ETT MINNE — DELAD, INTE
 * DUBBLERAD.
 *
 * `useBekraftelsesteg.ts`s modell och `Bekraftelsesteget.tsx`s laddläges-
 * skelett behöver EXAKT samma härledning: `kalla`/`minne` är BÅDA kända
 * SYNKRONT vid monteringen (`kalla` är en route-prop, `minne` läses via
 * `lasImport()` i en `useState`-initierare — ingendera väntar på
 * `hamta-oppna-betalningar`). Skelettet kan alltså visa den RIKTIGA
 * `Kallrad`-datan i stället för att gissa eller reservera en tom rad, men bara
 * om härledningen är BYTE-IDENTISK med modellens — annars kan de två glida
 * isär utan att någon grind ser det. En ren funktion, ett anropsställe per
 * konsument, är den enda formen som garanterar det.
 */
export function importoversiktFranMinne(minne: Importminne | null): Importoversikt | null {
  if (minne === null) return null;
  return {
    filnamn: minne.filnamn,
    bank: minne.bank,
    lasta: minne.lasta,
    bortfiltrerade: minne.bortfiltrerade,
    fel: minne.fel,
  };
}

/* ═══════════════════════════ REGLERNA (RENA) ═══════════════════════════ */

/** De fyra radtillstånden ur kortets AC #2. */
export type Importradsklass = 'saker' | 'osaker' | 'omatchad' | 'dubblett';

/**
 * Radens tillstånd, avgjort mot de betalningar som är öppna JUST NU.
 *
 * ORDNINGEN ÄR EN RANGORDNING, inte en godtycklig if-kedja:
 *
 *   1. DUBBLETT SLÅR ALLT. En bankreferens som redan är importerad får aldrig
 *      bockas i, hur säker matchningen än var (AC #4). Att låta en säker
 *      telefonträff vinna över dubblett-märkningen hade gett Lotta ett
 *      förbockat kort för pengar som redan är bokförda, med serverns 409 som
 *      enda räddning.
 *   2. SÄKER kräver att den valda anmälan FORTFARANDE är öppen. Var den det i
 *      inkorgen men inte längre (en annan flik hann registrera den) är raden
 *      inte säker, den är omatchad — och det är rätt svar, inte ett fel.
 *   3. OSÄKER kräver minst en kandidat som fortfarande är öppen. En rad vars
 *      alla kandidater stängts har inget att välja mellan och faller till
 *      omatchad, där sökfältet tar vid.
 *   4. OMATCHAD är restklassen, med sökfältet som utväg.
 *
 * `oppnaIds` är anmälnings-record-ID:n för de öppna betalningarna. TOM MÄNGD
 * GER ALLTID `omatchad` (utom för dubbletter), och det är anroparens ansvar
 * att inte klassa innan hämtningen svarat: "inga öppna betalningar" och "vet
 * inte än" ser likadana ut här, och funktionen får inte gissa. Samma kontrakt
 * som `markerings-minne.ts` § `saneraMarkering`.
 */
export function importradsklass(
  rad: ImportradIMinnet,
  oppnaIds: ReadonlySet<string>,
): Importradsklass {
  if (rad.tidigareImporterad !== null) return 'dubblett';
  if (rad.vald !== null && oppnaIds.has(rad.vald)) return 'saker';
  if (rad.kandidater.some((id) => oppnaIds.has(id))) return 'osaker';
  return 'omatchad';
}

/**
 * Kandidaterna som fortfarande är öppna, i lagrad ordning (bäst först).
 *
 * Filtreringen är samma sanering som klassningen gör, och de två MÅSTE läsa
 * samma mängd: en rad klassad `osaker` vars kandidatlista renderades ofiltrerad
 * hade visat förslagsknappar som pekar på anmälningar som inte längre går att
 * registrera.
 */
export function oppnaKandidater(rad: ImportradIMinnet, oppnaIds: ReadonlySet<string>): string[] {
  return rad.kandidater.filter((id) => oppnaIds.has(id));
}

/**
 * Bygger minnet ur importens egna tillstånd.
 *
 * `Importradstillstand` bär tre fält som INTE följer med: `ibockad`,
 * `medKvitto` och `utfall`. Alla tre hörde till den gamla bekräftelselistan i
 * inkorgen (riven i denna skiva, AC #3) och ägs nu av steget — bocken av
 * kortets kryssruta, kvittot av radformuläret, utfallet av körningen. Att
 * skicka med dem hade varit att lämna över ett halvt beslut.
 */
export function tillImportminne(
  parsat: Parsresultat,
  rader: readonly Importradstillstand[],
  kalla: { filnamn: string; bank: string; skapad: string },
): Importminne {
  return {
    skapad: kalla.skapad,
    filnamn: kalla.filnamn,
    bank: kalla.bank,
    lasta: rader.length,
    bortfiltrerade: parsat.bortfiltrerade.length,
    fel: parsat.fel.map((post) => ({ radnummer: post.radnummer, skal: post.skal })),
    rader: rader.map((rad) => {
      const { transaktion } = rad.rad;
      return {
        nyckel: radnyckel(rad.rad),
        radnummer: rad.rad.radnummer,
        belopp: transaktion.belopp,
        datum: transaktion.datum,
        bankreferens: transaktion.bankreferens,
        namn: transaktion.namn,
        telefon: transaktion.telefon,
        meddelande: transaktion.meddelande,
        matchning: rad.matchning.klass,
        grund: rad.matchning.grund,
        kandidater: rad.matchning.kandidater.map((k) => k.betalning.anmalanRecordId),
        vald: rad.vald,
        tidigareImporterad: rad.tidigareImporterad,
      };
    }),
  };
}

/**
 * Avkodar lagringssträngen. TOLERANT MED AVSIKT, och validerad med schemat: en
 * trasig post från en äldre version ska ge `null` (steget visar sitt "läs in
 * kontoutdraget igen"-läge), aldrig ett kastat fel som tar ner sidan vid
 * inladdning. Samma val som `bankmappning-minne.ts` gör med `safeParse` för
 * sina två lagringsytor.
 */
export function avkodaImportminne(ratt: string | null | undefined): Importminne | null {
  if (!ratt) return null;
  try {
    const utfall = ImportminneSchema.safeParse(JSON.parse(ratt));
    return utfall.success ? utfall.data : null;
  } catch {
    return null;
  }
}

/* ═══════════════════════ LAGRET (RÖR `sessionStorage`) ═══════════════════════ */

/** Läser minnet. Kastar aldrig — se filhuvudet. */
export function lasImport(): Importminne | null {
  try {
    return avkodaImportminne(window.sessionStorage.getItem(IMPORT_NYCKEL));
  } catch {
    return null;
  }
}

/**
 * Skriver minnet. Returnerar `false` när lagringen inte gick att skriva, så
 * anroparen kan LÅTA BLI att navigera i stället för att skicka Lotta till en
 * tom sida. Kastar aldrig.
 */
export function sparaImport(minne: Importminne): boolean {
  try {
    window.sessionStorage.setItem(IMPORT_NYCKEL, JSON.stringify(minne));
    return true;
  } catch {
    return false;
  }
}

/** Rensar minnet. Kastar aldrig. */
export function rensaImport(): void {
  try {
    window.sessionStorage.removeItem(IMPORT_NYCKEL);
  } catch {
    // Se filhuvudet.
  }
}
