import type { Jobbstatus } from '@/domain/schemas';
import type {
  BekraftelseRad,
  Beloppsgenvag,
  Fas,
  Radvarden,
  Summering,
} from './bekraftelsesteg-harledningar';
import type { Betalsatt } from './betalsatt-minne';
import type { RegistreratNuBlockProps } from './RegistreratNuBlock';

/**
 * [TASK-402.3] KONTRAKTET MELLAN BEKRÄFTELSESTEGETS FORM OCH DESS DATALAGER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR TYPERNA BOR I EN EGEN FIL
 * ═══════════════════════════════════════════════════════════════════════════
 * `BekraftelseBlockKopplingar` plockar sina fält ur `RegistreratNuBlockProps`,
 * som bor i en `.tsx`-fil. `tsconfig.tests.json` kompilerar api-pure-sviten
 * UTAN `--jsx`, så varje typimport från komponentlagret fäller `TS6142` i den
 * sviten (mätt under bygget). Härledningarna
 * (`bekraftelsesteg-harledningar.ts`) måste därför förbli fria från
 * komponentimporter — de ÄR det api-pure prövar.
 *
 * Modellen har ingen sådan begränsning: den konsumeras bara av `VariantC.tsx`,
 * `useBekraftelsesteg.ts` och prototypens simulering, aldrig av ett test som
 * körs utan JSX. Att `Pick`:a ur blockets EGNA props i stället för att skriva
 * av dem är dessutom det enda sättet att garantera att de två inte kan drifta:
 * byter blocket signatur på en callback fäller kompilatorn HÄR, inte i en
 * granskning.
 */

/**
 * Efterlägets kopplingar — allt `RegistreratNuBlock` behöver som INTE går att
 * härleda ur raderna.
 *
 * SEPARATIONEN ÄR AVSIKTLIG. Raderna (`modell.rader`) är samma i båda
 * världarna; det som skiljer den promoverade ytan från DEV-prototypen är
 * VART knapparna leder — och det är exakt denna typ. Formen (`VariantC`) ser
 * bara ett objekt med callbacks och vet aldrig vilken värld den står i.
 *
 * Utelämnade med avsikt: `registrerade`, `vantande`, `vantandeIds`,
 * `enSamKo`, `ensamKandidat` och `ovrigaJobbrader`. Alla sex HÄRLEDS ur
 * raderna i `VariantC` (`blockrader`, `vantandeKvitton`) och skulle som
 * kopplingar ha kunnat säga något annat än listan visar.
 */
export type BekraftelseBlockKopplingar = Pick<
  RegistreratNuBlockProps,
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
 * ångra-vägar) och prototypens `useBekraftelsesteg` i
 * `prototype/bekraftelseSimulering.ts` (in-memory, rivs i `TASK-402.6`).
 * Formen ser ingen skillnad.
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
