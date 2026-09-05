import { X } from 'lucide-react';
import type { RefObject } from 'react';
import { Button, Dialog, DialogTrigger, MessageBox, Modal } from '@/components/primitives';
import type { Jobbstatus } from '@/domain/schemas';
import { visaKronor } from './belopp-inmatning';
import type { Betalsatt } from './betalsatt-minne';
import { type JobbDelutfall, kanForhandsgranska } from './inkorg-harledningar';

/**
 * [TASK-402.2] Inkorgens "Registrerat nu"-block, UTBRUTET ur
 * `BetalningsInkorg.tsx` till en delad komponent (PRD TASK-402
 * § Implementationsbeslut, "Efterläget"): bekräftelsesteget (TASK-402.3)
 * återanvänder samma komponent för sitt efterläge, så en formändring görs på
 * ETT ställe och syns på båda ytorna. Facit-manifestet
 * `tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json`
 * (ytan `bekraftelsesteget`, lägena "efter Registrera"/"efter Registrera och
 * skicka"/"Ångra-dialogen") ÄR formen — denna fil skriver om prod-inkorgens
 * block TILL den formen, inte en ny.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÄGARSKAPET ÄR OFÖRÄNDRAT — BARA RENDERINGEN FLYTTADE
 * ═══════════════════════════════════════════════════════════════════════════
 * Alla mutationer (registrera, koa kvitton, radera/ångra, förhandsgranska)
 * ägs fortfarande av `BetalningsInkorg.tsx` (containern) och skickas hit som
 * callback-props. Denna fil härleder bara VAD raderna ska visa
 * (`kvittolage`, `blockAktivt`) och RITAR dem — samma lager-uppdelning som
 * `~/.claude/CLAUDE.md` § "Bygg i oberoende lager" kräver: datalagret nås via
 * sin adapter, aldrig kringgånget, och denna komponent rör ingen mutation
 * direkt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TRE FORMBYTEN GJORDA HÄR, ALLA FACIT-LÅSTA (TASK-402.2 AC #1/#2/#5)
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. RADENS MAKULERINGSTEXT ("Kvittot är på väg eller skickat. Ångra genom
 *    att makulera …") ÄR RIVEN. Facit-notens ord är exakta: "inkorgens
 *    makuleringstext per rad är BORTA" — VariantC-prototypens varv 15 punkt 3
 *    drog samma slutsats redan i bulkläget, och promoveringen (denna skiva)
 *    gör samma yta gälla i inkorgens EGET, en-rad-i-taget-läge, eftersom
 *    komponenten är delad. Kvittoläget syns ändå — det ÄR `lage.text` på
 *    radens andra rad ("Swish · Kvitto väntar på att skickas" osv); det som
 *    försvinner är FÖRKLARINGEN till varför Ångra inte erbjuds för ett kvitto
 *    som redan gått i väg. Åtgärdskolumnen bär i stället FAST HÖJD (`min-h-9`,
 *    samma mått knappen redan hade) så att raden aldrig byter höjd när
 *    antalet synliga knappar växlar mellan noll, en och två — ETT enkelt golv
 *    i stället för TASK-362:s tvåradiga textplatshållare.
 * 2. FÖRHANDSGRANSKA-KNAPPARNAS RÄKNARCHIP ÄR BORTA (TASK-393:s form riven
 *    HÄR, primitiven `RaknarChip` orörd — TASK-402.2 AC #5). Marcus fynd
 *    (S121, facit-notens "Ta bort chipset helt"): den synliga texten är
 *    alltid "Förhandsgranska", utan tal; antalet bärs av `aria-label`
 *    ("Förhandsgranska N kvitton"), som redan fanns på båda knapparna.
 * 3. ÅNGRA ÖPPNAR HUSETS DIALOG (ADR-044) I STÄLLET FÖR EN INLINE-BEKRÄFTELSE.
 *    md-bredd, `rounded-2xl` (kortens hörnradie — en avsiktlig, LOKAL
 *    avvikelse från primitivens `rounded`-default; en primitiv-bred ändring
 *    är en bokförd KANDIDAT utan eget kort, se PR-kroppen), rubrik "Ångra
 *    registreringen?", kropp "Namn · belopp · betalsätt" + konsekvensen,
 *    knappar "Behåll" (ghost, står FÖRST i DOM så react-arias default-fokus
 *    landar där) och "Ångra registreringen" (danger). Se `AngraKnapp` nedan.
 *
 * SERVER FÖRST ÄR OFÖRÄNDRAT, ÄVEN I DIALOGEN: till skillnad från
 * prototypens `close()`-vid-klick (ingen riktig mutation att vänta på i en
 * fixtur) stänger denna dialog FÖRST vid lyckad radering — precis den
 * invariant `BetalningsInkorg.tsx`s ursprungliga `angraRegistrering`-docblock
 * argumenterade för ("fallerar raderingen ska raden stå kvar exakt som den
 * var, och felet synas vid raden"). Ett fel håller dialogen öppen och visar
 * ett `role="alert"`-meddelande i kroppen — ett golv facit inte avbildar
 * (ingen av de fem låsta bilderna visar ett serverfel) men som
 * `~/.claude/CLAUDE.md` § "Dubbelriktad över-engineering-vakt" kräver
 * ("Golvet … skärs ALDRIG bort"): en tyst, spårlöst misslyckad radering vore
 * sämre än prototypens enklare form.
 */

/** EN registrering Lotta gjort i den här sessionen — blockets radmodell. */
export type SessionsRad = {
  inbetalningId: string;
  namn: string;
  belopp: number;
  betalsatt: Betalsatt;
  /** Lottas kryss vid registreringen. Falskt ⇒ raden ska aldrig få ett kvitto. */
  medKvitto: boolean;
  /**
   * Inkorgsradens nyckel (anmälans record-ID), när registreringen kom
   * därifrån. `undefined` för importerade rader, som inte hör till en
   * synlig rad.
   *
   * Den finns HÄR bara för Ångra: kvittenstexten ("500 kr registrerat …") bor
   * i containerns `kvittenser` under den nyckeln, och en ångrad registrering
   * måste ta med sig sin kvittens. Annars står ett kvitto kvar på personens
   * kort och påstår att något registrerades som inte längre finns.
   */
  radNyckel?: string;
};

/** ETT kvitto som väntar på att skickas — containerns session-lokala kö. */
export type VantandeKvitto = { inbetalningId: string; namn: string; belopp: number };

/**
 * Vad raden säger om kvittot, plus vilka åtgärder raden får erbjuda.
 *
 * `kanAngra` ÄR AVSIKTLIGT SNÄV (pass 11, Marcus: *"jag kan ju inte ens ta
 * bort Bengt Lindqvist som ligger i granskningsblocket nu, det måste ju gå,
 * eller?"*). Ångra RADERAR inbetalningen — den får bara erbjudas när vi VET
 * att inget kvitto gått i väg:
 *
 *   • inget kvitto begärt (kryssrutan var ur) ⇒ det finns inget att hinna före
 *   • raden ligger i den SESSION-LOKALA kön ⇒ Lotta har inte tryckt på knappen
 *
 * Allt annat får `kanAngra: false` — särskilt `vantar` (köad på SERVERN) är
 * medvetet utesluten trots att kvittot ännu inte skickats: jobbmotorn kan
 * plocka raden i samma sekund, och en radering som kapplöper med en
 * utskickande worker är exakt det vi inte ska bjuda in till. Servern är ändå
 * sista instans — `hantera-inbetalning` skiljer radera (före kvitto) från
 * makulera (efter) — men grinden ska inte förlita sig på att en skarp
 * operation fallerar snyggt.
 *
 * [TASK-402.2] `vila` ÄR EGET FRÅN `kanAngra` — DE FÖRVÄXLADES EN GÅNG UNDER
 * DENNA SKIVAS BYGGE, BOKFÖRT SOM LÄRDOM. `vila` styr blockets guld/vila-ton
 * (TASK-362): sant när raden är FÄRDIGBEHANDLAD och inte kräver
 * uppmärksamhet (inget kvitto alls, ELLER kvittot har GÅTT I VÄG), falskt
 * medan något fortfarande pågår (köat i sessionen, köat/pågår på servern)
 * ELLER har fallerat. "Kvitto väntar på att skickas" (i den lokala kön) har
 * `kanAngra: true` (radering är fortfarande säker) MEN `vila: false` (Lotta
 * har en handling kvar att göra) — de två fälten pekar alltså åt OLIKA håll
 * i just det läget, och en implementation som antar att de alltid
 * sammanfaller (`!kanAngra` som stand-in för `!vila`) ger blockets ton FEL
 * i exakt detta, mest VANLIGA läget (en nyss registrerad rad som väntar på
 * att skickas). Se `BetalningsInkorg.tsx`s ursprungliga `Kvittolage`-docblock
 * (git-historik) för samma fält, innan blocket flyttade hit.
 */
type Kvittolage = {
  text: string;
  fel: boolean;
  kanAngra: boolean;
  vila: boolean;
};

/**
 * Kvittots läge för EN registrerad rad, läst ur de TVÅ källor som redan
 * finns — ingen ny state, ingen ny serverlogik.
 *
 * ORDNINGEN ÄR EN PRIORITETSORDNING, inte en slump:
 *  1. INGET KVITTO vinner allt. Kryssrutan var ur vid registreringen, och då
 *     ska raden aldrig säga något om skickning.
 *  2. KÖN (`vantande`) går före jobbet. Ligger raden i den session-lokala kön
 *     har Lotta ännu inte tryckt på knappen — jobbet vet inte om den.
 *  3. JOBBRADEN är sanningen om arbetet (ADR-129 beslut 2). Den nås på
 *     `objektId`, som ÄR inbetalningens id.
 *  4. FALLBACKEN SÄGER ALDRIG "SKICKAT". Raden kan ha köats i ett TIDIGARE
 *     jobb i samma session, och då finns ingen jobbrad att läsa. "Köat" är
 *     då allt vi vet.
 */
function kvittolage(
  rad: SessionsRad,
  vantande: readonly VantandeKvitto[],
  jobbrader: readonly Jobbstatus['rader'][number][],
): Kvittolage {
  const angrabar = { fel: false, kanAngra: true };

  if (!rad.medKvitto) return { text: 'Inget kvitto', ...angrabar, vila: true };
  if (vantande.some((v) => v.inbetalningId === rad.inbetalningId)) {
    return { text: 'Kvitto väntar på att skickas', ...angrabar, vila: false };
  }

  const jobbrad = jobbrader.find((j) => j.objektId === rad.inbetalningId);
  if (jobbrad?.status === 'skickat') {
    return {
      text: jobbrad.kvittonummer ? `Kvitto skickat · ${jobbrad.kvittonummer}` : 'Kvitto skickat',
      fel: false,
      kanAngra: false,
      vila: true,
    };
  }
  if (jobbrad?.status === 'pagar') {
    return { text: 'Kvitto skickas ...', fel: false, kanAngra: false, vila: false };
  }
  if (jobbrad?.status === 'vantar') {
    return { text: 'Kvitto köat', fel: false, kanAngra: false, vila: false };
  }
  if (jobbrad?.status === 'fel') {
    return {
      text: `Kvittot kunde inte skickas: ${jobbrad.skal ?? 'okänt skäl'}`,
      fel: true,
      kanAngra: false,
      vila: false,
    };
  }

  return { text: 'Kvitto köat', fel: false, kanAngra: false, vila: false };
}

/**
 * Inert visuell hjälpare — den synliga etiketten är alltid "Förhandsgranska"
 * (formbyte 2 ovan, ingen `RaknarChip` längre); antalet bärs uteslutande av
 * anroparens `aria-label`. Två call sites (ett-kvitto-fallet och
 * "alla"-fallet) delade tidigare `ForhandsgranskaEtikett`
 * (`BetalningsInkorg.tsx`, riven i samma commit som denna fil skapades) —
 * utan chippet är det bara en textsträng, ingen egen komponent behövs.
 */
const FORHANDSGRANSKA_TEXT = 'Förhandsgranska';

/**
 * ÅNGRA-DIALOGEN (formbyte 3): husets `DialogTrigger`/`Modal`/`Dialog`
 * (ADR-044) i stället för en inline-bekräftelse. Se filens docblock för
 * SERVER-FÖRST-resonemanget och `rounded-2xl`-avvikelsen.
 */
function AngraKnapp({
  post,
  onAngra,
  angraPending,
  angraFel,
  onOppna,
}: {
  post: SessionsRad;
  /** Kastar vid fel — dialogen håller sig då öppen (se `.catch` nedan). */
  onAngra: (post: SessionsRad) => Promise<void>;
  angraPending: boolean;
  angraFel: string | null;
  /** Ett NYTT försök gör ett gammalt fel inaktuellt — samma regel som
      `forhandsgranskaFel`. Här triggas nollställningen redan vid ÖPPNING,
      inte bara vid knapptryck: annars hade rad B:s dialog kunnat visa rad
      A:s gamla felmeddelande i det korta fönstret innan B faktiskt försökt. */
  onOppna: () => void;
}) {
  return (
    <DialogTrigger onOpenChange={(oppen) => oppen && onOppna()}>
      <Button intent="ghost" size="sm" aria-label={`Ångra registreringen för ${post.namn}`}>
        Ångra
      </Button>
      <Modal isDismissable className="rounded-2xl">
        <Dialog
          size="md"
          title="Ångra registreringen?"
          actions={({ close }) => (
            <>
              <Button intent="ghost" onPress={close}>
                Behåll
              </Button>
              <Button
                intent="danger"
                isLoading={angraPending}
                onPress={() => {
                  onAngra(post)
                    .then(close)
                    .catch(() => {
                      // Felet visas i kroppen nedan (`angraFel`) — dialogen
                      // hålls medvetet öppen, se filens docblock § SERVER FÖRST.
                    });
                }}
              >
                Ångra registreringen
              </Button>
            </>
          )}
        >
          <div className="flex flex-col gap-2">
            <p className="m-0">
              <span className="font-semibold">{post.namn}</span>
              <span className="text-text-secondary">
                {` · ${visaKronor(post.belopp)} kr · ${post.betalsatt}`}
              </span>
            </p>
            <p className="m-0 text-small text-text-secondary">
              {post.medKvitto
                ? 'Inbetalningen raderas och kvittot skickas inte. Raden går tillbaka till listan.'
                : 'Inbetalningen raderas. Raden går tillbaka till listan.'}
            </p>
            {angraFel !== null && (
              <p role="alert" className="text-(color:--mm-input-error-text) text-small">
                {angraFel}
              </p>
            )}
          </div>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

export type RegistreratNuBlockProps = {
  /** Fokus-mål efter en ångrad rad — se `BetalningsInkorg.tsx`s eget bruk. */
  granskningsBlockRef: RefObject<HTMLElement | null>;
  registrerade: SessionsRad[];
  vantande: VantandeKvitto[];
  jobbrader: readonly Jobbstatus['rader'][number][];
  utfall: JobbDelutfall | null;
  /** Jobbrader som INTE hör till `registrerade` — se containerns docblock
      § "JOBBRADER SOM GRANSKNINGSBLOCKET INTE REDAN VISAR". */
  ovrigaJobbrader: readonly Jobbstatus['rader'][number][];
  bekraftelseSynlig: boolean;
  onDoljBekraftelse: () => void;
  koaPending: boolean;
  onSkickaKvitton: () => void;
  vantandeIds: string[];
  enSamKo: boolean;
  ensamKandidat: SessionsRad | null;
  forhandsgranskaPagar: ReadonlySet<string>;
  forhandsgranskaAllaPagar: boolean;
  onForhandsgranska: (inbetalningId: string, namn: string) => void;
  onForhandsgranskaAlla: (inbetalningIds: readonly string[]) => void;
  onSkickaIgen: (inbetalningId: string) => void;
  /** Kastar vid fel — se `AngraKnapp`. */
  onAngra: (post: SessionsRad) => Promise<void>;
  angraPending: boolean;
  angraFel: string | null;
  onAngraDialogOppen: () => void;
  forhandsgranskaFel: { namn: string | null; message: string } | null;
};

/**
 * Inkorgens "Registrerat nu"-block. Renderar ingenting när ingen registrering
 * gjorts än — samma villkor som containerns tidigare `{registrerade.length >
 * 0 && (…)}`, nu ETT tidigt return i stället för ett villkor vid call site.
 */
export function RegistreratNuBlock({
  granskningsBlockRef,
  registrerade,
  vantande,
  jobbrader,
  utfall,
  ovrigaJobbrader,
  bekraftelseSynlig,
  onDoljBekraftelse,
  koaPending,
  onSkickaKvitton,
  vantandeIds,
  enSamKo,
  ensamKandidat,
  forhandsgranskaPagar,
  forhandsgranskaAllaPagar,
  onForhandsgranska,
  onForhandsgranskaAlla,
  onSkickaIgen,
  onAngra,
  angraPending,
  angraFel,
  onAngraDialogOppen,
  forhandsgranskaFel,
}: RegistreratNuBlockProps) {
  if (registrerade.length === 0) return null;

  /* [TASK-362] BLOCKETS TON: varning SÅ LÄNGE något faktiskt pågår eller har
     fallerat, annars vila. Marcus 2026-09-02 (S113 resume 8-röktestet): den
     gula fonden stod kvar oavsett vad raderna faktiskt sa — en rad vars
     kvitto redan gått i väg bär exakt lika mycket varningston som en rad som
     fortfarande väntar. `some(!vila)` läser samma `kvittolage` raderna
     redan visar, så tonen kan aldrig säga något annat än vad texten säger.
     [TASK-402.2, RÄTTAD LIVE-BUGG] `vila` är INTE samma sak som `kanAngra`
     — se `Kvittolage`s eget docblock. En tidigare version av denna rad
     läste `lage.fel || !lage.kanAngra`, vilket gav FEL svar för "Kvitto
     väntar på att skickas" (kanAngra: true, vila: false): blocket vilade i
     neutral ton direkt efter registrering i stället för att stå AKTIVT
     (guld) tills kvittot faktiskt skickats — mätt rött i e2e-sviten
     (`betalningar-inkorg-utskicksflode.staging.test.ts`), rättat här. */
  const blockAktivt = registrerade.some((post) => !kvittolage(post, vantande, jobbrader).vila);

  return (
    /* ETT RIKTIGT BLOCK-I-BLOCK (pass 11, Marcus: *"VA FAN är det här för
       granskningsblock? FAN va dåligt"*).

       ROTORSAKEN, MÄTT: raderna BAR redan inbetalningsradernas kortform
       (`rounded-2xl … bg-surface p-3`) — men behållaren var genomskinlig
       och `body` bär `--mm-bg` = `--p-neutral-0`, alltså VITT. Vita kort
       på en vit botten är osynliga kort, och det Marcus såg var därför
       lös text som svävade. Exakt samma rotorsak som fynd 1 i listan.

       Behållaren är nu bilage-ytans `GRUPPKORT`-form (tonad yta vars
       padding ÄR rännan mellan korten) — samma block-i-block-grepp som
       pass 8 gav "Senaste inbetalningar" på personkortet och anmälans
       detaljvy. Radformen är oförändrad; det var aldrig den som var fel. */
    /* ═══ GULD-TONAD YTA MED KONTUR (Marcus 2026-09-01) ═══
       Ordagrant: *"Kanske ska vi ha gul bakgrund med kontur på
       granskningsblocket, så det syns tydligare? Eller guld/gul eller vad
       vi har"*.

       TOKENVALET, ur husets EGEN familj — ingen ny token, ingen hårdkodad
       färg:
         yta    `bg-primary-tint`   = `--mm-primary-tint` = `--p-gold-100`
         kontur `border-primary-muted` = `--mm-primary-muted` = `--p-gold-400`
         kontrast-more `border-primary` = `--mm-primary` = `--p-gold-500`
       Guldet ÄR husets primärfärg (`semantic.css` § Primär), så "gul" och
       "vad vi har" pekar på samma ställe.

       MÄTVÄRDEN (WCAG 2, sRGB, mot `--p-gold-100` #fbf3e0):
         `--mm-text` #242424 ......... 14,04:1
         `--mm-text-secondary` ....... 7,16:1
         `--mm-text-muted` #6b6b6b ... 4,82:1   ✓ AA normal text (4,5:1)
         sage-knappen #606b57 ........ 5,08:1   ✓ 1.4.11 icke-text (3:1)
         vit text PÅ sage ............ 5,62:1   ✓ oförändrad, knappens egen yta
         vita kort mot ytan .......... 1,11:1
         konturen mot vit sida ....... 2,33:1, och 2,57:1 i contrast-more
       SAGE-KNAPPEN ÄR OFÖRÄNDRAD I FÄRG OCH FORM — den är husets standard
       för externa utskick och får inte färgändras.

       KONTUREN ÄR SYNLIG I VILA, till skillnad från repots vanliga
       `border-transparent` + `contrast-more`-idiom. */
    /* ═══ INGA VITA KORT I BLOCKET (Marcus 2026-09-01, pass 14) ═══
       Raderna låg som vita `bg-surface`-kort på guld-tinten — alltså en
       tredje ton i ett block som bara har två. De ligger nu DIREKT på
       guldytan, skilda av hårlinjer i blockets EGEN konturton, vilket är
       samma bank-anatomi som `InbetalningsLista.tsx` fick i samma pass. */
    /* INGEN `mx-4`: blocket ska ha SAMMA bredd som kortlistorna och
       menybaren. Listorna når 568 px genom `-mx-4` ur en `px-4`-förälder;
       detta block hänger direkt i sin förälders `<section>`, som redan ÄR
       den bredden. */
    <section
      /* RUBRIKEN "Registrerat nu" ÄR RIVEN (Marcus: *"känns överflödig"*).
         Den var blockets tillgängliga namn OCH fokus-mål efter en ångrad
         rad, så båda rollerna flyttade hit i samma andetag: `aria-label`
         ger namnet, `tabIndex={-1}` gör noden fokuserbar programmatiskt.

         `<section>` OCH INTE `<div role="group">`: en `region`-landmark MED
         tillgängligt namn är exakt vad blocket är: en namngiven del av
         betalningssidan. */
      ref={granskningsBlockRef}
      tabIndex={-1}
      aria-label="Registrerat nu"
      /* ═══ SYMMETRISK LUFT (Marcus 2026-09-01, pass 14) ═══
         `p-4` sätter luftbandet till 16 px, och listans `-my-2` drar
         tillbaka exakt radernas egen `py-2` vid ändarna — tre lika band
         (överkant → text, text → knapp, knapp → underkant). */
      className={
        blockAktivt
          ? 'flex flex-col gap-4 rounded-2xl border border-primary-muted bg-primary-tint p-4 contrast-more:border-primary'
          : 'flex flex-col gap-4 rounded-2xl border border-transparent bg-bg-muted p-4 contrast-more:border-border-strong'
      }
    >
      <ul
        className={
          blockAktivt
            ? '-my-2 flex flex-col divide-y divide-primary-muted contrast-more:divide-primary'
            : '-my-2 flex flex-col divide-y divide-border'
        }
      >
        {registrerade.map((post) => {
          const lage = kvittolage(post, vantande, jobbrader);
          return (
            <li key={post.inbetalningId} className="py-2">
              {/* KÄRNRADEN — titel/sekundärled, belopp, åtgärd. EGEN NOD,
                  skild från panelerna nedan (Marcus: *"'Ångra'-knappen
                  sitter inte centrerat höjdmässigt på kortet"*).
                  `items-center` CENTRERAR MOT KÄRNRADEN, inte mot hela
                  `<li>`. */}
              <div className="flex flex-nowrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="w-full truncate font-medium text-body">{post.namn}</span>
                  {/* [TASK-402.2, RÄTTAD LIVE-BUGG] `truncate` — UTAN den
                      radbryter denna rad till TVÅ rader när åtgärdskolumnen
                      bredvid bär en bredare knapp ("Ångra", ~64 px) och till
                      EN rad när kolumnen är tom (kvittot redan skickat,
                      `kanAngra: false`), eftersom bredden som återstår för
                      textkolumnen då växer. Mätt live vid mobilbredd
                      (375 px, `betalningar-inkorg-utskicksflode.staging
                      .test.ts`s viewport-matris): raden gick från 78 px
                      (köat, radbruten) till 60 px (klart, en rad) — exakt
                      den regression `min-h-9`-golvet på åtgärdskolumnen
                      skulle förhindra, fast orsakad av EN ANNAN kolumn.
                      `truncate` gör radens höjd oberoende av bredden
                      grannkolumnen råkar ta, precis som namnraden ovan
                      redan är. */}
                  <span className="w-full truncate text-caption text-text-muted">
                    {[post.betalsatt, lage.text].join(' · ')}
                  </span>
                </span>

                {/* BELOPPSKOLUMNEN — samma sifferpelare som
                    `InbetalningsLista`. `tabular-nums` är vad som gör
                    högerkanten till en linje. */}
                <span className="shrink-0 font-medium text-body tabular-nums">
                  {`${visaKronor(post.belopp)} kr`}
                </span>

                {/* [TASK-402.2, formbyte 1] `min-h-9` FLYTTADE HIT — facit
                    kräver "fast höjd på åtgärdskolumnen" i stället för
                    TASK-362:s makuleringstext-platshållare (riven, se filens
                    docblock). 36 px (`min-h-9`) är knappstorleken `sm`s egen
                    höjd, så raden är lika hög med noll, en och två knappar —
                    kvittoläget byter TEXT (i kärnradens sekundärled ovan),
                    aldrig radens höjd. */}
                <span className="flex min-h-9 shrink-0 items-center gap-2">
                  {/* [TASK-353, oförändrad plats/villkor sedan TASK-370.4]
                      FÖRHANDSGRANSKA — bara på en rad vars kvitto ännu INTE
                      gått i väg, och bara när kön har FLERA rader.
                      `kanForhandsgranska` äger regeln; JSX bedömer inte.

                      EGET TILLGÄNGLIGT NAMN PER RAD. Åtta knappar som alla
                      heter "Förhandsgranska" är åtta identiska namn i
                      skärmläsarens knapplista — `aria-label` namnger
                      personen. */}
                  {!enSamKo && kanForhandsgranska(post, vantandeIds) && (
                    <Button
                      intent="secondary"
                      emphasis="outline"
                      size="sm"
                      isLoading={forhandsgranskaPagar.has(post.inbetalningId)}
                      loadingText="Förhandsgranskar …"
                      aria-label={`Förhandsgranska kvittot till ${post.namn}`}
                      onPress={() => onForhandsgranska(post.inbetalningId, post.namn)}
                    >
                      Förhandsgranska
                    </Button>
                  )}
                  {/* SKICKA IGEN, bara på en FALLERAD rad — samma mutation
                      (`koaKvitton`) som "alla"-flödet bär. EGET TILLGÄNGLIGT
                      NAMN, samma skäl som Förhandsgranska ovan
                      (granskningsfynd runda 1, PR #2193). */}
                  {lage.fel && (
                    <Button
                      intent="secondary"
                      emphasis="outline"
                      size="sm"
                      isDisabled={koaPending}
                      aria-label={`Skicka kvittot till ${post.namn} igen`}
                      onPress={() => onSkickaIgen(post.inbetalningId)}
                    >
                      Skicka igen
                    </Button>
                  )}
                  {/* [TASK-402.2, formbyte 3] ÅNGRA — se `AngraKnapp` för
                      dialogen. EN ENKEL KNAPP, INTE EN ⋯-MENY (bokfört val,
                      pass 11): raden har som mest EN åtgärd i detta läge. */}
                  {lage.kanAngra && (
                    <AngraKnapp
                      post={post}
                      onAngra={onAngra}
                      angraPending={angraPending}
                      angraFel={angraFel}
                      onOppna={onAngraDialogOppen}
                    />
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {/* [TASK-362] EN STATUSYTA, RESERVERAD HÖJD, FRÅN KÖAT TILL KLART.
          Marcus 2026-09-02 (S113 resume 8-röktestet): *"jag gillade inte
          riktigt allt som händer UNDER utskicket, den gula rutan förändrades
          i höjd, olika toastar etc, det var liksom inte 'rent' eller
          'elegant'"*.

          EN slot, `min-h-10` (matchar knappens egen höjd — `Button.tsx`
          `size.md: 'min-h-10'`), som visar EXAKT en av tre saker i sekvens:
          knappen (köat) → en tyst statusrad (pågår/klart) → ingenting (dold,
          eller nästa handling gjorde den inaktuell).

          [REVIEW RUNDA 1, FYND 1] `bekraftelseSynlig` styr ENDAST
          success-radens synlighet. En `warning` (och en `info`, av samma
          princip) har INGEN egen dölj-flagga alls: den finns kvar SÅ LÄNGE
          `utfall` beskriver den, och `utfall` byter bara innehåll när ETT
          NYTT jobb faktiskt startar.

          [REVIEW RUNDA 1, FYND 2 — golvet är RESPONSIVT, `min-h-22
          sm:min-h-10`.] Vid mobilbredd (375 px, under Tailwinds `sm`,
          640 px) WRAPPAR knapparaden ("Skicka 1 kvitto" + "Förhandsgranska")
          till TVÅ rader (mätt: slotten går från 40 px till 88 px). */}
      {(vantande.length > 0 || (utfall !== null && ovrigaJobbrader.length === 0)) && (
        <div className="flex min-h-22 flex-col justify-center gap-2 sm:min-h-10">
          {vantande.length > 0 && (
            /* [TASK-353] KNAPPRADEN, inte en ensam knapp. `self-start` ger
               samma horisontella läge som knappen (svepet ovan är
               `flex flex-col`), och "Förhandsgranska" hamnar bredvid i
               stället för under. `flex-wrap` gör att paret bryter snyggt på
               en smal iPad-kolumn.

               [REVIEW RUNDA 1, FYND 1] `&&` I STÄLLET FÖR `? :` MOT
               status-noderna nedan — knapprad och `warning`/`info` kan
               samexistera i slotten: båda är sanna samtidigt (ett jobb
               fallerade ELLER pågår OCH en ny rad väntar), och ska synas
               samtidigt. */
            <div className="flex flex-wrap items-center gap-2 self-start">
              <Button intent="success" onPress={onSkickaKvitton} isLoading={koaPending}>
                {`Skicka ${vantande.length} ${vantande.length === 1 ? 'kvitto' : 'kvitton'}`}
              </Button>

              {/* [TASK-353] BREDVID SKICKA-KNAPPEN — bara när kön har exakt
                  ETT kvitto (`enSamKo`). Ordningen är avsiktlig: Skicka
                  först, Förhandsgranska efter.

                  [TASK-402.2, formbyte 2] Synlig text är "Förhandsgranska"
                  utan tal (`FORHANDSGRANSKA_TEXT`) — räknarchippet är rivet,
                  `aria-label` bär räkneformen precis som förut. */}
              {ensamKandidat !== null && kanForhandsgranska(ensamKandidat, vantandeIds) && (
                <Button
                  intent="secondary"
                  emphasis="outline"
                  isLoading={forhandsgranskaPagar.has(vantande[0].inbetalningId)}
                  loadingText="Förhandsgranskar …"
                  aria-label={`Förhandsgranska ${vantande.length} ${vantande.length === 1 ? 'kvitto' : 'kvitton'}`}
                  onPress={() => onForhandsgranska(vantande[0].inbetalningId, vantande[0].namn)}
                >
                  {FORHANDSGRANSKA_TEXT}
                </Button>
              )}

              {/* [TASK-370.4, S116 beslut 1] DEN KOMBINERADE
                  FÖRHANDSGRANSKNINGEN — BREDVID "Skicka N kvitton", bara när
                  kön har TVÅ ELLER FLER väntande (`!enSamKo`). INGET
                  `kanForhandsgranska`-villkor här: kön (`vantande`) ÄR PER
                  DEFINITION de kvitton som väntar, så hela listan är alltid
                  ett giltigt anrop så länge den inte är tom. */}
              {!enSamKo && (
                <Button
                  intent="secondary"
                  emphasis="outline"
                  isLoading={forhandsgranskaAllaPagar}
                  loadingText="Förhandsgranskar …"
                  aria-label={`Förhandsgranska ${vantande.length} kvitton`}
                  onPress={() => onForhandsgranskaAlla(vantandeIds)}
                >
                  {FORHANDSGRANSKA_TEXT}
                </Button>
              )}
            </div>
          )}

          {/* WARNING — EGEN NOD, HELT OBEROENDE AV `vantande`. NN/g:s regel:
              ett DELVIS eller HELT misslyckat utskick är inte en
              toast-kandidat — det kräver uppmärksamhet och stannar tills
              ETT NYTT JOBB gör det inaktuellt. */}
          {utfall !== null && utfall.intent === 'warning' && ovrigaJobbrader.length === 0 && (
            <MessageBox intent="warning" title={utfall.rubrik}>
              Utfallet per kvitto står på raderna ovan.
            </MessageBox>
          )}

          {/* [TASK-362/FYND 4] KOMPAKT STATUSRAD — ALLTID MONTERAD, OBEROENDE
              av `vantande`. Bara INNEHÅLLET växlar mellan tomt och
              `utfall.rubrik` — samma "empty live region"-form `Notis.tsx`
              dokumenterar. `role="status"` + `aria-live="polite"`, aldrig
              `alert` här (ingen varning). */}
          {utfall !== null && ovrigaJobbrader.length === 0 && (
            <p
              role="status"
              aria-live="polite"
              data-testid="inkorg-sandstatus"
              className="flex items-center justify-between gap-3 text-small text-text-muted"
            >
              {(utfall.intent === 'info' || (utfall.intent === 'success' && bekraftelseSynlig)) && (
                <>
                  <span>{utfall.rubrik}</span>
                  {utfall.intent === 'success' && (
                    <Button
                      intent="ghost"
                      size="sm"
                      aria-label="Stäng bekräftelse"
                      onPress={onDoljBekraftelse}
                      className="shrink-0"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* FELET SÄGS PÅ SIDAN, inte i det fönster som stängdes. `role="alert"`
          därför att Lotta just tryckte och väntar på något som inte kom.
          `forhandsgranskaFel.namn` avgör TEXTFORMEN — `null` (alla-flödet)
          får inget klientbyggt "Kvittot till X …"-prefix. */}
      {forhandsgranskaFel && (
        <p role="alert" className="text-(color:--mm-input-error-text) text-caption">
          {forhandsgranskaFel.namn
            ? `Kvittot till ${forhandsgranskaFel.namn} kunde inte förhandsgranskas: ${forhandsgranskaFel.message}`
            : `Förhandsgranskningen av alla kunde inte skapas: ${forhandsgranskaFel.message}`}
        </p>
      )}
    </section>
  );
}
