import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Button as AriaButton, Checkbox } from 'react-aria-components';
import { Button } from '@/components/primitives';
import { InitialAvatar } from '@/components/primitives/InitialAvatar';
import {
  baraOmkorning as arBaraOmkorning,
  arRegistrerbar,
  avstamning,
  type BekraftelseRad,
  type BekraftelsestegModell,
  type Beloppsklass,
  blockrader,
  grupperaRader,
  radbelopp,
  summera,
  vantandeKvitton,
} from '../bekraftelsesteg-harledningar';
import { visaKronor } from '../belopp-inmatning';
import { RegistreraForm } from '../RegistreraForm';
import { RegistreratNuBlock } from '../RegistreratNuBlock';
import { RadMarken } from './radfalt';

/**
 * BEKRÄFTELSESTEGETS FORM — variant C, "Avvikelse-först" (S121, Marcus val
 * 2026-09-05: *"Jag vill gå vidare med C"*), FACIT-LÅST efter nitton
 * konvergensvarv (*"Lås som facit."*) och PROMOVERAD i `TASK-402.3`.
 *
 * Sidan ÄR inkorgens lista med raderna markerade, plus en avstämning och två
 * knappar. Efter registreringen ÄR sidan inkorgens "Registrerat nu"-block.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROMOVERINGEN (TASK-402.3): FORMEN ÄR ORÖRD, VÄGARNA ÄR SKARPA
 * ═══════════════════════════════════════════════════════════════════════════
 * `ADR-103` B2 steg 1: "prototypens form promoveras — villkoret flippas så
 * variant-formen blir den ovillkorliga; skarpas DATAVÄGAR behålls". Tre
 * konkreta byten gjordes här, alla i den riktningen:
 *
 *   1. EFTERLÄGET är nu det DELADE `RegistreratNuBlock` (`TASK-402.2`) i
 *      stället för en kopia i denna fil. Formen är densamma — 402.2 skrev om
 *      prod-inkorgens block TILL facit-formen, det var hela dess uppdrag —
 *      men knapparna leder någonstans: "Förhandsgranska" öppnar en riktig
 *      PDF, "Skicka igen" köar om, Ångra raderar. Prototypens
 *      `InertForhandsgranska` (med sitt "Inte byggt i prototypen"-tooltip)
 *      och dess `sr-only`-hjälpvärde är därmed borta. Det är den enda
 *      skillnaden promoverings-grinden mäter i efterläget, och den är
 *      bokförd som amendering i facit-katalogen.
 *   2. RADFORMULÄRET är nu det DELADE `RegistreraForm` i `redigera`-läget
 *      (`TASK-402.2` AC #3) i stället för en kopia. Samma fält i samma
 *      ordning, samma utfallsruta, samma fördröjning och autofokus — en
 *      komponent, två konsumenter (PRD berättelse 31).
 *   3. HÄRLEDNINGARNA läses ur `../bekraftelsesteg-harledningar.ts`, som
 *      överlever rivningen av simuleringslagret.
 *
 * Filen ligger kvar under `prototype/` till `TASK-402.6` — namnet flyttar
 * med rivningen, inte med promoveringen (uppdragets claim-gräns: ingen rename
 * nu).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARV 15 — REGISTRERINGEN ÄR ETT STEG, INTE TIO (Marcus efter varv 13:
 * *"fullständigt kaos på sidan"*, och *"kör på förslaget, alla tre
 * punkterna"*)
 * ═══════════════════════════════════════════════════════════════════════════
 * Varv 13 lät varje registrerad rad vandra från listan till blocket medan
 * körningen pågick: sidan växte, grupper försvann, knapparna räknade ner —
 * tio omritningar på 3,5 sekunder, och i skicka-flödet en andra våg för
 * kvittona. Inkorgens block är byggt för EN rad i taget; bulken behöver ett
 * eget förlopp. Tre punkter:
 *   1. Under körningen står listan STILLA (ögonblicksbild från knapptrycket,
 *      dimmad, `aria-busy`); knappen bär spinnern och tipsraden räkningen
 *      "3 av 10 registrerade …" (NN/g: beskrivande text med räkning). Inget
 *      på sidan byter plats förrän allt är klart.
 *   2. Resultatet ritas EN gång: blocket "Registrerat nu" på listans plats,
 *      statusraden i huvudet säger utfallet ("9 inbetalningar registrerade,
 *      1 kunde inte registreras"), och raden som fallerade står kvar under
 *      med felet; knappen heter då "Försök igen".
 *   3. Makuleringstexten per rad är borta i bulkläget — kvittoläget är en
 *      kort rad per person, jobbets framsteg står i blockets statusrad
 *      (inkorgens `jobbDelutfall`), och raderna håller samma höjd genom
 *      hela utskicket så inget hoppar.
 *
 * VARV 12: bulkvalen rivna. VARV 5–11: kortet är kryssrutan (grönt = valt),
 * inkorgens kort och formulär i kortet, beloppet platt med chevron.
 * VARV 2–4: förslaget per rad (`forslagsbelopp`), avstämningen i Lottas
 * klumpar, listan klass för klass ur `BetalningsInkorg`.
 */

const KLASS_ORD: Record<Beloppsklass, { ett: string; flera: string }> = {
  avgift: { ett: 'anmälningsavgift', flera: 'anmälningsavgifter' },
  resten: { ett: 'slutbetalning', flera: 'slutbetalningar' },
  allt: { ett: 'hela beloppet', flera: 'hela beloppet' },
  annat: { ett: 'eget belopp', flera: 'egna belopp' },
  saknas: { ett: 'rad utan belopp', flera: 'rader utan belopp' },
};

/** Raden saknar ett belopp — bulkvalet gick inte ihop, eller fältet är tomt. */
function saknarBelopp(rad: BekraftelseRad): boolean {
  return rad.ejGenomforbar !== null || rad.belopp.trim() === '';
}

function plural(antal: number, ett: string, flera: string): string {
  return `${antal} ${antal === 1 ? ett : flera}`;
}

/** Förslagsknappens ord — domänens korta former utskrivna. */
function forslagsEtikett(etikett: string): string {
  switch (etikett) {
    case 'anmälningsavgift':
      return 'Anmälningsavgift';
    case 'resten av anmälningsavgiften':
      return 'Resten av avgiften';
    case 'allt':
      return 'Allt som saknas';
    case 'resten':
      return 'Resten';
    default:
      return etikett.charAt(0).toUpperCase() + etikett.slice(1);
  }
}

/** Varför raden saknar belopp, i en mening Lotta kan handla på. */
function handSkal(rad: BekraftelseRad): string {
  const { anmalningsavgift, gallandePris, summaInbetalt } = rad.inkorg.betalning;
  if (rad.ejGenomforbar === 'avgift') {
    if (anmalningsavgift !== null && gallandePris !== null && anmalningsavgift >= gallandePris) {
      return 'Det här eventet har ett pris utan anmälningsavgift.';
    }
    if (anmalningsavgift !== null && summaInbetalt >= anmalningsavgift) {
      return 'Anmälningsavgiften är redan betald.';
    }
  }
  if (gallandePris === null) return 'Priset saknas i basen.';
  return 'Beloppet är tomt.';
}

/** Rubrik med räknarchip — segmentvyns "Färdiga grupper 14"-form. */
function SektionsRubrik({ id, antal, children }: { id: string; antal: number; children: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 font-semibold text-lg">
      {children}
      <span className="rounded-md bg-bg-emphasized px-1.5 py-0.5 font-medium text-caption text-text-secondary tabular-nums">
        {antal}
      </span>
    </h2>
  );
}

/**
 * Eventgruppens rubrik — KLASS FÖR KLASS inkorgens (`BetalningsInkorg.tsx`
 * § grupper.map): `h2 font-semibold text-lg`, datumet som rått ISO efter
 * " · " i en `ml-2 font-normal text-small text-text-muted`-span.
 */
function GruppRubrik({ namn, datum }: { namn: string; datum: string | null }) {
  return (
    <h2 className="font-semibold text-lg">
      {namn}
      {datum && (
        <span className="ml-2 font-normal text-small text-text-muted">
          {' · '}
          {datum}
        </span>
      )}
    </h2>
  );
}

/** Inkorgens listbehållare — `-mx-4` mot sektionens `px-4`, korten kant i kant. */
const LISTA_KLASS =
  '-mx-4 flex flex-col gap-2 rounded-2xl border border-transparent bg-bg-muted p-2 contrast-more:border-border-strong';

/** Inkorgens kortyta: grönt när markerat, vitt annars. */
function kortKlass(vald: boolean): string {
  return `rounded-2xl border p-3 ${
    vald
      ? 'border-(--mm-success) bg-(--mm-success-bg) contrast-more:border-(--mm-success)'
      : 'border-transparent bg-surface contrast-more:border-border-strong'
  }`;
}

export function VariantC({ modell }: { modell: BekraftelsestegModell }) {
  return <BulkC modell={modell} />;
}

function BulkC({ modell }: { modell: BekraftelsestegModell }) {
  const handId = useId();
  const { rader } = modell;
  const registrerar = modell.fas === 'registrerar';
  const [tryckt, setTryckt] = useState<'registrera' | 'skicka' | null>(null);
  // ÖGONBLICKSBILDEN (varv 15): raderna som de såg ut när knappen trycktes
  // bär listan genom hela körningen, så inget flyttar sig förrän resultatet
  // ritas i ett svep när `fas` blir `klart`.
  const [frusna, setFrusna] = useState<BekraftelseRad[] | null>(null);
  useEffect(() => {
    if (!registrerar) {
      setTryckt(null);
      setFrusna(null);
    }
  }, [registrerar]);
  const starta = (skickaNu: boolean) => {
    setFrusna(rader);
    setTryckt(skickaNu ? 'skicka' : 'registrera');
    modell.registrera(skickaNu);
  };
  const bas = registrerar && frusna ? frusna : rader;

  // Registrerade rader lämnar listan och bor i "Registrerat nu"; resten
  // (inklusive en rad vars registrering fallerade) står kvar i listan.
  const registrerade = bas.filter((r) => r.utfall?.klass === 'registrerad');
  const kvar = bas.filter((r) => r.utfall?.klass !== 'registrerad');
  const fallerade = kvar.filter((r) => r.utfall?.klass === 'fel');
  const markerade = kvar.filter((r) => r.markerad);
  const handhogen = markerade.filter(saknarBelopp);
  const klarhogen = kvar.filter((r) => !r.markerad || !saknarBelopp(r));
  const klaraGrupper = useMemo(() => grupperaRader(klarhogen), [klarhogen]);
  const registrerbara = bas.filter(arRegistrerbar);
  const kvitton = registrerbara.filter((r) => r.medKvitto).length;
  const avstamda = useMemo(() => avstamning(markerade), [markerade]);
  // Summan ur ögonblicksbilden, inte ur modellens levande rader — annars
  // sjönk "10 inbetalningar 12 000 kr" rad för rad under körningen (mätt).
  const summering = useMemo(() => summera(bas), [bas]);
  // Bara omkörning kvar: allt som går att registrera har redan fallerat en gång.
  const baraOmkorning = arBaraOmkorning(bas);
  const totalt = modell.korning?.totalt ?? registrerbara.length;
  // Statusraden annonserar START och SLUT (polite) — aldrig varje rad.
  const status = registrerar
    ? `Registrerar ${plural(totalt, 'inbetalning', 'inbetalningar')} …`
    : registrerade.length > 0
      ? fallerade.length > 0
        ? `${plural(registrerade.length, 'inbetalning registrerad', 'inbetalningar registrerade')}, ${fallerade.length} kunde inte registreras`
        : kvar.length > 0
          ? plural(registrerade.length, 'inbetalning registrerad', 'inbetalningar registrerade')
          : 'Alla inbetalningar registrerade'
      : `${markerade.length} av ${kvar.length} inbetalningar markerade`;
  const dimmad = registrerar
    ? ' pointer-events-none opacity-60 motion-safe:transition-opacity'
    : '';

  return (
    <form
      className="flex flex-col gap-6"
      // Enter i ett fält får ALDRIG registrera tio betalningar — bara den
      // uttryckliga genvägen nedan gör det. Formuläret finns för att bära
      // tangentbordshanteraren på ett element som får ha en (a11y-lint).
      onSubmit={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // Ctrl/⌘+Enter = "Registrera och skicka" (beslut 4), samma genväg som
        // radformuläret bär.
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && registrerbara.length > 0) {
          e.preventDefault();
          starta(true);
        }
      }}
    >
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        {/* RÄKNAREN FÖRST — Åtgärds-sidans ordval, live så skärmläsaren hör
            när ett kort avmarkeras. */}
        <p role="status" aria-live="polite" className="text-small text-text-secondary">
          {status}
        </p>
      </header>

      <EfterlagetsBlock modell={modell} registrerade={registrerade} />

      {/* ═══ LISTAN — inkorgens form, klass för klass (varv 4) ═══ */}
      {klarhogen.length > 0 && (
        <section
          aria-label="Markerade inbetalningar"
          aria-busy={registrerar || undefined}
          className={`flex flex-col gap-4 px-4${dimmad}`}
        >
          {klaraGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className={LISTA_KLASS}>
                {grupp.rader.map((rad) => (
                  <MarkerbartKort key={rad.nyckel} rad={rad} modell={modell} frusen={registrerar} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* ═══ BEHÖVER DIN HAND — bara när något faktiskt behöver henne ═══ */}
      {handhogen.length > 0 && (
        <section
          aria-labelledby={handId}
          aria-busy={registrerar || undefined}
          className={`flex flex-col gap-3 px-4${dimmad}`}
        >
          <SektionsRubrik id={handId} antal={handhogen.length}>
            Behöver din hand
          </SektionsRubrik>
          <ul className={LISTA_KLASS}>
            {handhogen.map((rad) => (
              <HandKort key={rad.nyckel} rad={rad} modell={modell} />
            ))}
          </ul>
        </section>
      )}

      {/* ═══ AVSTÄMNINGEN OCH HANDLINGEN — Hem-vyns helbreddsknapp under listan ═══ */}
      {kvar.length > 0 && (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1 px-4">
            {avstamda.map((post) => (
              <div key={post.klass} className="flex items-baseline justify-between gap-3">
                <dt className="text-body text-text-secondary">
                  {plural(post.antal, KLASS_ORD[post.klass].ett, KLASS_ORD[post.klass].flera)}
                </dt>
                <dd className="m-0 text-body text-text-secondary tabular-nums">
                  {post.klass === 'saknas' ? '' : `${visaKronor(post.summa)} kr`}
                </dd>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between gap-3 border-border border-t pt-2">
              <dt className="font-medium text-body">
                {plural(registrerbara.length, 'inbetalning', 'inbetalningar')}
              </dt>
              <dd className="m-0 font-semibold text-lg tabular-nums">
                {visaKronor(summering.summa)} kr
              </dd>
            </div>
          </dl>
          {registrerar && modell.korning ? (
            /* RÄKNINGEN på tipsradens plats — samma rad, samma höjd, så inget
               flyttar sig. `role="progressbar"` annonseras inte automatiskt
               (ingen live-region), skärmläsaren frågar värdet när hon vill;
               start och slut hörs via statusraden i huvudet. Samma två
               kanaler som Förberedelseskärmen (ADR-112). */
            <div
              role="progressbar"
              aria-label="Registrerar inbetalningar"
              aria-valuemin={0}
              aria-valuemax={modell.korning.totalt}
              aria-valuenow={modell.korning.klara}
              aria-valuetext={`${modell.korning.klara} av ${modell.korning.totalt} registrerade`}
              className="px-4 text-caption text-text-secondary tabular-nums"
            >
              {`${modell.korning.klara} av ${modell.korning.totalt} registrerade …`}
            </div>
          ) : (
            <p className="px-4 text-caption text-text-secondary">
              {handhogen.length > 0
                ? `${plural(handhogen.length, 'rad saknar', 'rader saknar')} belopp och registreras inte förrän du fyllt i det.`
                : 'Jämför med kontoutdraget innan du registrerar.'}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <Button
                isDisabled={registrerbara.length === 0 || registrerar}
                isLoading={registrerar && tryckt === 'registrera'}
                loadingText={`Registrerar ${plural(totalt, 'inbetalning', 'inbetalningar')}`}
                onPress={() => starta(false)}
              >
                {registrerbara.length === 0
                  ? 'Registrera'
                  : baraOmkorning
                    ? registrerbara.length === 1
                      ? 'Försök igen'
                      : `Försök igen med ${plural(registrerbara.length, 'inbetalning', 'inbetalningar')}`
                    : `Registrera ${plural(registrerbara.length, 'inbetalning', 'inbetalningar')}`}
              </Button>
            </div>
            <div className="flex flex-col">
              <Button
                intent="secondary"
                emphasis="outline"
                isDisabled={kvitton === 0 || registrerar}
                isLoading={registrerar && tryckt === 'skicka'}
                loadingText={`Registrerar ${plural(totalt, 'inbetalning', 'inbetalningar')} och skickar kvitton`}
                onPress={() => starta(true)}
              >
                {kvitton === 0
                  ? 'Registrera och skicka kvitton'
                  : `Registrera och skicka ${plural(kvitton, 'kvitto', 'kvitton')}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EFTERLÄGET — INKORGENS DELADE "REGISTRERAT NU"-BLOCK (TASK-402.2/402.3)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Bron mellan stegets rader och blockets egen radmodell.
 *
 * ALLT SOM GÅR ATT HÄRLEDA HÄRLEDS (`blockrader`, `vantandeKvitton`), och
 * resten kommer ur `modell.block` — som är det ENDA stället där den skarpa
 * ytan och DEV-prototypen skiljer sig åt. Formen ser aldrig vilken värld den
 * står i.
 */
function EfterlagetsBlock({
  modell,
  registrerade,
}: {
  modell: BekraftelsestegModell;
  registrerade: BekraftelseRad[];
}) {
  const poster = useMemo(() => blockrader(registrerade), [registrerade]);
  const vantande = useMemo(() => vantandeKvitton(registrerade), [registrerade]);
  const vantandeIds = vantande.map((v) => v.inbetalningId);
  const enSamKo = vantande.length === 1;
  /* Ett-kvitto-fallets rad, slagen upp i BLOCKRADERNA och inte i kön: kön bär
     bara id/namn/belopp, medan `kanForhandsgranska` behöver `medKvitto`. Samma
     uppslag `BetalningsInkorg.tsx` gör för sin `ensamKandidat`. */
  const ensamKandidat = enSamKo
    ? (poster.find((p) => p.inbetalningId === vantande[0].inbetalningId) ?? null)
    : null;
  /* Jobbrader som blocket INTE redan visar. I steget är kvittojobbet vårt
     eget, så mängden är normalt tom — men den räknas ut i stället för att
     antas: en rad som ångrats efter att kvittot köats lämnar en jobbrad utan
     motsvarande post, och blocket har en egen, korrekt hantering för det. */
  const ovrigaJobbrader = modell.block.jobbrader.filter(
    (jobbrad) => !poster.some((post) => post.inbetalningId === jobbrad.objektId),
  );

  return (
    <RegistreratNuBlock
      {...modell.block}
      registrerade={poster}
      vantande={vantande}
      vantandeIds={vantandeIds}
      enSamKo={enSamKo}
      ensamKandidat={ensamKandidat}
      ovrigaJobbrader={ovrigaJobbrader}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KORTEN I LISTAN — inkorgens kort, kryssrutan, formuläret
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Kortets huvud — avatar · namn (· märke), inkorgens `BetalningsradKort` med
 * EN rad; märket inline efter namnet så alla kort förblir exakt lika höga.
 */
function KortHuvud({ rad, vald }: { rad: BekraftelseRad; vald: boolean }) {
  const harMarken = rad.inkorg.forfallen || rad.inkorg.obekraftad;
  return (
    <>
      <InitialAvatar namn={rad.inkorg.namn} />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-body">{rad.inkorg.namn}</span>
        {harMarken && <RadMarken rad={rad} />}
        <span className="sr-only">{vald ? 'Markerad' : 'Inte markerad'}</span>
      </span>
    </>
  );
}

/**
 * [TASK-402.3 AC #7] RADENS FORMULÄR ÄR INKORGENS `RegistreraForm` I
 * `redigera`-LÄGET — en komponent, två konsumenter (PRD berättelse 31).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * "AVBRYT ÅTERSTÄLLER RADENS VÄRDEN" ÄR NU STRUKTURELLT, INTE EN KOPIA
 * ═══════════════════════════════════════════════════════════════════════════
 * Prototypen skrev varje tangenttryckning rakt in i modellen och tog en
 * ÖGONBLICKSBILD av radens fem fält vid öppningen (`innan`), som Avbryt
 * skrev tillbaka. Det delade formuläret håller i stället sin EGEN fältstate
 * och lämnar den samlat vid "Klar" (`onRedigeringKlar`). Konsumenten monterar
 * det villkorat (`{oppen && …}`), så en stängning avmonterar all lokal state:
 * Avbryt behöver inte återställa något, eftersom ingenting skrevs. En
 * återställning som inte kan glömmas slår en som måste kodas rätt.
 *
 * BETALSÄTTET FÖLJER SAMMA REGEL. `RegistreraForm` lyfter `betalsatt` till
 * anroparen (inkorgen delar det mellan rader), men i steget är det ett
 * RADFÄLT — skrevs det direkt till modellen hade Avbryt lämnat kvar det. Det
 * bor därför i kortets egen state medan formuläret är öppet och skrivs till
 * raden först vid Klar, tillsammans med de andra fyra.
 *
 * `startvarden` bär radens NUVARANDE värden. Utan den hade formuläret
 * förifyllt `rad.kvar` (hela resten) i stället för radens förval — se propens
 * docblock i `RegistreraForm.tsx` för det mätta fallet (Erik Holm: 1 000 mot
 * 2 500).
 */
function RadFormular({
  rad,
  modell,
  onKlar,
  onAvbryt,
}: {
  rad: BekraftelseRad;
  modell: BekraftelsestegModell;
  onKlar: () => void;
  onAvbryt: () => void;
}) {
  const [betalsatt, setBetalsatt] = useState(rad.betalsatt);
  return (
    <RegistreraForm
      rad={rad.inkorg}
      idag={rad.datum}
      betalsatt={betalsatt}
      onBetalsatt={setBetalsatt}
      // Kortets gröna ram ÄR grupperingen — samma val inkorgen gör, och av
      // samma skäl (Marcus 2026-09-01: "Inga fält som ser frikopplade ut
      // under en separatorlinje").
      visaAvdelare={false}
      lage="redigera"
      startvarden={{
        belopp: rad.belopp,
        betalsatt: rad.betalsatt,
        datum: rad.datum,
        medKvitto: rad.medKvitto,
        notering: rad.notering,
      }}
      onRedigeringKlar={(varden) => {
        modell.sattRadVarden(rad.nyckel, varden);
        onKlar();
      }}
      onAvbryt={onAvbryt}
    />
  );
}

/**
 * Inkorgens kort, och KORTET ÄR KRYSSRUTAN (eventdetaljens `MarkerbartKort`,
 * Åtgärds-sidans `MarkerbartDeltagarKort`). Beloppet är ett SYSKON till
 * kryssrutan (en knapp i en `<label>` är ogiltig HTML). En rad vars
 * registrering fallerat visar felet under huvudet (inkorgens
 * `registrera.isError`-rad) och står kvar markerad för omkörning.
 */
function MarkerbartKort({
  rad,
  modell,
  frusen = false,
}: {
  rad: BekraftelseRad;
  modell: BekraftelsestegModell;
  /** Körningen pågår: kortet står stilla och tar inga tryck (varv 15). */
  frusen?: boolean;
}) {
  const [oppen, setOppen] = useState(false);
  const panelId = useId();
  const belopp = radbelopp(rad);
  const vald = rad.markerad;
  const fel = rad.utfall?.klass === 'fel' ? rad.utfall.text : null;

  return (
    <li className={kortKlass(vald)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Checkbox
          isSelected={vald}
          isDisabled={frusen}
          onChange={(v) => {
            modell.sattRadMarkerad(rad.nyckel, v);
            // Avmarkeras ett ÖPPET kort stängs formuläret (Marcus fynd:
            // beloppet försvann annars). Ändringarna behålls.
            if (!v) setOppen(false);
          }}
          className="flex min-w-0 cursor-pointer items-center gap-3 sm:flex-1"
        >
          <KortHuvud rad={rad} vald={vald} />
        </Checkbox>
        {!oppen && (
          /* BELOPPET PLATT PÅ YTAN, chevronen med rund hover-platta i
             markeringens gröna (varv 9–10). */
          <AriaButton
            className="group inline-flex items-center gap-3 self-start data-[disabled]:cursor-not-allowed sm:self-auto"
            isDisabled={!vald || frusen}
            aria-expanded={false}
            aria-label={`Ändra belopp för ${rad.inkorg.namn}`}
            onPress={() => setOppen(true)}
          >
            <span
              className={`font-medium text-body tabular-nums ${
                vald ? 'text-text' : 'text-text-muted'
              }`}
            >
              {belopp === null ? 'Saknar belopp' : `${visaKronor(belopp)} kr`}
            </span>
            <span
              className={`mr-1 flex size-9 shrink-0 items-center justify-center rounded-full motion-safe:transition-colors ${
                vald
                  ? 'text-text-secondary group-data-[hovered]:bg-(--mm-success)/15 group-data-[hovered]:text-text'
                  : 'text-text-muted'
              }`}
            >
              <ChevronDown aria-hidden="true" size={20} />
            </span>
          </AriaButton>
        )}
      </div>
      {fel && (
        <p role="alert" className="text-(color:--mm-input-error-text) pt-2 text-small">
          {fel}
        </p>
      )}
      {oppen && vald && (
        <div id={panelId}>
          <RadFormular
            rad={rad}
            modell={modell}
            onKlar={() => setOppen(false)}
            onAvbryt={() => setOppen(false)}
          />
        </div>
      )}
    </li>
  );
}

/** Radens egna beloppskandidater som knappar — ett tryck sätter beloppet. */
function ForslagsKnappar({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  if (rad.beloppsknappar.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-text-muted">Förslag</span>
      {rad.beloppsknappar.map((k) => (
        <Button
          key={k.nyckel}
          size="sm"
          intent="secondary"
          emphasis="outline"
          onPress={() => modell.sattRadBelopp(rad.nyckel, visaKronor(k.belopp))}
        >
          {`${forslagsEtikett(k.etikett)} · ${visaKronor(k.belopp)} kr`}
        </Button>
      ))}
    </div>
  );
}

/**
 * En rad i "Behöver din hand": samma kort, formuläret öppet från början
 * (beloppet saknas), skälet och radens egna förslag ovanför.
 *
 * [TASK-402.3, BOKFÖRD FORMÄNDRING] Formuläret bär nu Klar/Avbryt även här.
 * Prototypens `RadFormular` kunde renderas UTAN knappar (den var en kopia och
 * ägde sin egen prop-yta); det delade `RegistreraForm` i `redigera`-läget
 * kräver båda callbacks — vilket är rätt kontrakt för en komponent som ska
 * kunna stängas. "Avbryt" fäller ihop kortet till dess belopps-rad, exakt som
 * ett `MarkerbartKort` som aldrig öppnats. INGEN FACIT-BILD VISAR DETTA LÄGE:
 * facit-fixturens tio rader bär alla ett belopp, så "Behöver din hand" är tom
 * i samtliga fem låsta bilder. Ändringen är därför en amendering utan
 * motbild, bokförd i facit-katalogen i stället för att göras tyst.
 */
function HandKort({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(true);
  return (
    <li className={kortKlass(true)}>
      <div className="flex items-center gap-3">
        <KortHuvud rad={rad} vald />
      </div>
      <p className="pt-3 text-small text-text-secondary">
        {handSkal(rad)} Skriv beloppet, eller välj ett förslag.
      </p>
      <div className="pt-2">
        <ForslagsKnappar rad={rad} modell={modell} />
      </div>
      {oppen ? (
        <RadFormular
          rad={rad}
          modell={modell}
          onKlar={() => setOppen(false)}
          onAvbryt={() => setOppen(false)}
        />
      ) : (
        <div className="pt-3">
          <Button intent="secondary" emphasis="outline" onPress={() => setOppen(true)}>
            {`Fyll i beloppet för ${rad.inkorg.namn}`}
          </Button>
        </div>
      )}
    </li>
  );
}
