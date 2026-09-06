import type { Jobbstatus } from '@/domain/schemas';
import type {
  BekraftelseRad,
  Beloppsgenvag,
  Fas,
  ObestamdImportrad,
  Radvarden,
  SattAllaVal,
  Summering,
} from './bekraftelsesteg-harledningar';
import type { Betalsatt } from './betalsatt-minne';
import type { Importoversikt } from './importminne';
import type { InkorgsRad } from './inkorg-harledningar';
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
  /**
   * [TASK-402.8] "Sätt alla belopp": varje MARKERAD rad utanför "Behöver din
   * hand" får sin egen kandidat för valet, och en rad utan kandidat rörs inte.
   * Regeln är ren och bor i `sattAllaBelopp` (`bekraftelsesteg-harledningar`);
   * båda modell-implementationerna kallar den, så formen kan inte se skillnad.
   *
   * OBLIGATORISK OCH INTE VALFRI, till skillnad från importfälten nedan:
   * `VariantC` renderar knapparna ovillkorligt, så en modell utan metoden vore
   * en yta med två knappar som inte gör något. Prototypens simulering får
   * därför samma tre rader kod tills `TASK-402.6` river den.
   */
  sattAllaBelopp: (val: SattAllaVal) => void;
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

  /* ═══ KONTOUTDRAGET SOM MATARE (TASK-402.4) ═════════════════════════════
     TRE VALFRIA FÄLT, OCH VALFRIHETEN ÄR ETT LAGERBESLUT.

     Modellen uppfylls av TVÅ implementationer (se typens docblock ovan), och
     den andra är prototypens simulering — substrat som `TASK-402.6` river
     efter Marcus stämpel och som denna skivas claim-gräns uttryckligen inte
     rör. Obligatoriska fält hade tvingat fram en ändring där, i kod som är på
     väg bort.

     Frånvaron är dessutom SANN och inte en bekvämlighet: den manuella mataren
     och Åtgärds-sidans matare har ingen import, så `undefined` betyder exakt
     vad det ser ut att betyda. Formen läser dem med `?? []` respektive `??
     null` och renderar då ingenting nytt — vilket är varför `VariantC`s
     utgångsläge för säkra rader förblir byte för byte facits (AC #1). */

  /**
   * Importrader som ännu inte pekar på en anmälan, plus dubbletterna.
   * `undefined` när mataren inte var kontoutdraget.
   */
  importrader?: ObestamdImportrad[];
  /**
   * Väljer anmälan för en obestämd importrad. Raden lämnar `importrader` och
   * blir en vanlig, markerad `BekraftelseRad` i samma tick — bocken och valet
   * hör ihop, exakt som i den rivna bekräftelselistan (`SwishImport.tsx`
   * § VALET OCH BOCKEN HÖR IHOP).
   */
  valjImportanmalan?: (nyckel: string, anmalanRecordId: string) => void;
  /**
   * Sökningen en OMATCHAD bankrad erbjuder, i inkorgens egen rankning
   * (`rankaTraffar`). Funktionen och inte sökrymden: rankningen behöver
   * `idag` för sin förfallo-ordning, och det värdet bor i modellen — formen
   * ska inte behöva känna till det för att kunna rita ett sökfält.
   */
  sokImportanmalan?: (sokterm: string) => InkorgsRad[];
  /** Filen raderna kom ur, plus parserns två räknade högar. */
  importkalla?: Importoversikt | null;
};
