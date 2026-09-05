import { ChevronDown, CircleCheck, Info, type LucideIcon, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button as AriaButton, Checkbox } from 'react-aria-components';
import {
  Button,
  Input,
  MessageBox,
  Radio,
  RadioGroup,
  RaknarChip,
  Select,
  SelectItem,
} from '@/components/primitives';
import { InitialAvatar } from '@/components/primitives/InitialAvatar';
import { VALBARA_BETALSATT } from '@/domain/schemas';
import { beloppsFel, normaliseraBeloppKlient, visaKronor } from '../belopp-inmatning';
import type { Betalsatt } from '../betalsatt-minne';
import { type Beloppsutfall, beloppsutfall } from '../inkorg-harledningar';
import {
  antalRegistreradeKvitton,
  arRegistrerbar,
  avstamning,
  type BekraftelseRad,
  type BekraftelsestegModell,
  type Beloppsgenvag,
  type Beloppsklass,
  genvagsbelopp,
  grupperaRader,
  radbelopp,
} from './bekraftelseSimulering';
import { BetalsattSegment, DatumInput, KvittoKryss, RadMarken, RadUtfallRad } from './radfalt';

/**
 * [PROTOTYPE] Variant C — AVVIKELSE-FÖRST. Konvergens-passet (S121, Marcus
 * val 2026-09-05: *"Jag vill gå vidare med C"*), steg 2.
 *
 * Bevisar: MINSTA ANTAL HANDLINGAR. Appen förvalar allt och Lotta rör bara
 * undantagen. Sidan ÄR inkorgens lista med raderna markerade, plus en
 * avstämning och två knappar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARV 6 — INKORGENS KORT OCH FORMULÄR, INTE EN EGEN REDIGERARE (Marcus)
 * ═══════════════════════════════════════════════════════════════════════════
 *   • Eventnamnen skrivs ut fullt som inkorgen gör ("Resor i medvetandet 1,
 *     Skövde · 2026-09-20").
 *   • ALLA kort är lika höga: märkesraden (Förfallen/Obekräftad) reserverar
 *     sin höjd även när den är tom — samma grepp som inkorgens `min-h-9`-
 *     platshållare (`TASK-362`). Sekundärraden "Swish · 4 sep. · kvitto" är
 *     riven.
 *   • Beloppsknappen öppnar SAMMA VY som "Registrera betalning" i inkorgen:
 *     `RegistreraForm`s fält i samma ordning — Belopp i kronor, utfallsrutan
 *     (vad beloppet täcker), Betalsätt + Betalningsdatum, Notering, Skicka
 *     kvitto — i det gröna kortet. Den ENDA avvikelsen: knappraden säger
 *     "Klar" och "Avbryt", inte "Registrera"/"Registrera och skicka" —
 *     här registreras allt med knappen längst ner, en rad i taget vore en
 *     andra väg genom samma steg. Öppet bokfört för Marcus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARV 5 — KORTET ÄR KRYSSRUTAN (eventdetaljens/Åtgärders grammatik)
 * ═══════════════════════════════════════════════════════════════════════════
 * Raderna kom markerade från inkorgen; valt kort får `border-(--mm-success)`
 * + `bg-(--mm-success-bg)`, avmarkerat kort är vitt och räknas ingenstans.
 * Räknaren först ("10 av 10 betalningar markerade"). Efter registreringen är
 * lyckade kort vita och fallna gröna (Åtgärds-sidans `UtfallsKort`).
 *
 * VARV 2–4: beloppet förvals per rad ur datat (`forslagsbelopp`), bulkvalen
 * kvar som "Ändra för alla" under listan (val B), avstämningen i Lottas
 * klumpar ovanför Registrera, listan klass för klass ur `BetalningsInkorg`.
 */

type BulkNyckel = Extract<Beloppsgenvag, 'forslag' | 'avgift' | 'allt'>;

const BULKVAL: { nyckel: BulkNyckel; etikett: string }[] = [
  { nyckel: 'forslag', etikett: 'Som vi föreslår' },
  { nyckel: 'avgift', etikett: 'Anmälningsavgift för alla' },
  { nyckel: 'allt', etikett: 'Allt som saknas för alla' },
];

const KLASS_ORD: Record<Beloppsklass, { ett: string; flera: string }> = {
  avgift: { ett: 'anmälningsavgift', flera: 'anmälningsavgifter' },
  resten: { ett: 'slutbetalning', flera: 'slutbetalningar' },
  allt: { ett: 'hela beloppet', flera: 'hela beloppet' },
  annat: { ett: 'eget belopp', flera: 'egna belopp' },
  saknas: { ett: 'rad utan belopp', flera: 'rader utan belopp' },
};

/** Utfallsrutans form — kopierad ur `RegistreraForm.tsx` § UTFALL_FORM. */
const UTFALL_FORM: Record<
  Beloppsutfall['ton'],
  { intent: 'success' | 'warning' | 'info'; Ikon: LucideIcon }
> = {
  tacker: { intent: 'success', Ikon: CircleCheck },
  over: { intent: 'warning', Ikon: TriangleAlert },
  delvis: { intent: 'info', Ikon: Info },
  okant: { intent: 'info', Ikon: Info },
};

/** Raden saknar ett belopp — bulkvalet gick inte ihop, eller fältet är tomt. */
function saknarBelopp(rad: BekraftelseRad): boolean {
  return rad.ejGenomforbar !== null || rad.belopp.trim() === '';
}

/** Kort svenskt datum: "4 sep." */
function visaDag(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(d);
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

/** Vad ett bulkval ger över raderna — antal med belopp, och summan. */
function bulkutfall(rader: readonly BekraftelseRad[], nyckel: BulkNyckel) {
  let antal = 0;
  let summa = 0;
  for (const rad of rader) {
    const belopp = genvagsbelopp(rad, nyckel);
    if (belopp !== null) {
      antal += 1;
      summa += belopp;
    }
  }
  return { antal, summa };
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
 * " · " i en `ml-2 font-normal text-small text-text-muted`-span. Avdelaren är
 * en textnod så skärmläsaren inte läser namn och datum i ett svep.
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
  if (modell.fas !== 'redigera') return <ResultatC modell={modell} />;
  return <RedigeraC modell={modell} />;
}

function RedigeraC({ modell }: { modell: BekraftelsestegModell }) {
  const valId = useId();
  const handId = useId();
  const { rader } = modell;

  // MARKERINGEN (varv 5): avmarkerade står kvar i listan (vita) men räknas
  // ingenstans — inte i högarna, inte i bulkvalen, inte i avstämningen.
  const markerade = rader.filter((r) => r.markerad);
  const handhogen = markerade.filter(saknarBelopp);
  const klarhogen = rader.filter((r) => !r.markerad || !saknarBelopp(r));
  const klaraGrupper = useMemo(() => grupperaRader(klarhogen), [klarhogen]);
  const registrerbara = rader.filter(arRegistrerbar);
  const kvitton = registrerbara.filter((r) => r.medKvitto).length;
  const vald: BulkNyckel =
    modell.aktivGenvag === 'avgift' || modell.aktivGenvag === 'allt'
      ? modell.aktivGenvag
      : 'forslag';

  const utfallPerVal = useMemo(
    () => new Map(BULKVAL.map((v) => [v.nyckel, bulkutfall(markerade, v.nyckel)] as const)),
    [markerade],
  );
  const forslagsklumpar = useMemo(() => {
    const antal = new Map<Beloppsklass, number>();
    for (const rad of markerade) {
      const avgift = rad.beloppsknappar.find((k) => k.nyckel === 'avgift');
      const allt = rad.beloppsknappar.find((k) => k.nyckel === 'allt');
      let klass: Beloppsklass = 'saknas';
      if (avgift) klass = 'avgift';
      else if (allt) klass = allt.etikett === 'resten' ? 'resten' : 'allt';
      antal.set(klass, (antal.get(klass) ?? 0) + 1);
    }
    const ordning: Beloppsklass[] = ['avgift', 'resten', 'allt', 'annat', 'saknas'];
    return ordning
      .filter((k) => antal.has(k))
      .map((k) => plural(antal.get(k) ?? 0, KLASS_ORD[k].ett, KLASS_ORD[k].flera));
  }, [markerade]);
  const avstamda = useMemo(() => avstamning(markerade), [markerade]);

  return (
    <form
      className="flex flex-col gap-6"
      // Enter i ett fält får ALDRIG registrera tio betalningar — bara den
      // uttryckliga genvägen nedan gör det. Formuläret finns för att bära
      // tangentbordshanteraren på ett element som får ha en (a11y-lint).
      onSubmit={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && registrerbara.length > 0) {
          e.preventDefault();
          modell.registrera();
        }
      }}
    >
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        {/* RÄKNAREN FÖRST — Åtgärds-sidans ordval, live så skärmläsaren hör
            när ett kort avmarkeras. */}
        <p role="status" aria-live="polite" className="text-small text-text-secondary">
          {`${markerade.length} av ${rader.length} betalningar markerade`}
        </p>
      </header>

      {/* ═══ LISTAN — inkorgens form, klass för klass (varv 4) ═══ */}
      <section aria-label="Markerade betalningar" className="flex flex-col gap-4 px-4">
        {klarhogen.length === 0 ? (
          <p className="text-small text-text-muted">Ingen rad har ett belopp än.</p>
        ) : (
          klaraGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className={LISTA_KLASS}>
                {grupp.rader.map((rad) => (
                  <MarkerbartKort key={rad.nyckel} rad={rad} modell={modell} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* ═══ BEHÖVER DIN HAND — bara när något faktiskt behöver henne ═══ */}
      {handhogen.length > 0 && (
        <section aria-labelledby={handId} className="flex flex-col gap-3 px-4">
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

      {/* ═══ ÄNDRA FÖR ALLA — bulkvalen som verktyg under listan (val B) ═══ */}
      <section aria-labelledby={valId} className="flex flex-col gap-3">
        <h2 id={valId} className="px-4 font-semibold text-lg">
          Ändra för alla
        </h2>
        <div className="flex flex-col gap-4 rounded-2xl bg-bg-muted p-4">
          <RadioGroup
            label="Belopp för alla rader"
            hideLabel
            orientation="vertical"
            value={vald}
            onChange={(v) => modell.sattGenvag(v as BulkNyckel)}
          >
            {BULKVAL.map((v) => {
              const u = utfallPerVal.get(v.nyckel) ?? { antal: 0, summa: 0 };
              const utan = markerade.length - u.antal;
              let under: string;
              if (v.nyckel === 'forslag') under = forslagsklumpar.join(' · ');
              else if (utan === 0) under = `${u.antal} av ${markerade.length} rader`;
              else
                under = `${u.antal} av ${markerade.length} rader · ${plural(utan, 'rad får inget belopp', 'rader får inget belopp')}`;
              return (
                <Radio
                  key={v.nyckel}
                  value={v.nyckel}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 data-[selected]:border-primary data-[selected]:bg-primary-tint motion-safe:transition-colors contrast-more:data-[selected]:border-2"
                >
                  <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold text-body">{v.etikett}</span>
                      <span className="text-caption text-text-muted">{under}</span>
                    </span>
                    <span className="shrink-0 pt-0.5 font-medium text-body tabular-nums">
                      {visaKronor(u.summa)} kr
                    </span>
                  </span>
                </Radio>
              );
            })}
          </RadioGroup>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            <div className="flex flex-col items-start gap-1">
              <span className="text-(color:--mm-input-label-text) text-small">Betalsätt</span>
              <BetalsattSegment
                label="Betalsätt för alla rader"
                value={modell.batchBetalsatt}
                onChange={modell.sattBetalsattAlla}
              />
            </div>
            <DatumInput
              label="Datum"
              value={modell.batchDatum}
              onChange={modell.sattDatumAlla}
              className="w-40"
            />
          </div>
        </div>
      </section>

      {/* ═══ AVSTÄMNINGEN OCH HANDLINGEN — Hem-vyns helbreddsknapp under listan ═══ */}
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
              {plural(registrerbara.length, 'betalning', 'betalningar')}
            </dt>
            <dd className="m-0 font-semibold text-lg tabular-nums">
              {visaKronor(modell.summering.summa)} kr
            </dd>
          </div>
        </dl>
        <p className="px-4 text-caption text-text-secondary">
          {handhogen.length > 0
            ? `${plural(handhogen.length, 'rad saknar', 'rader saknar')} belopp och registreras inte förrän du fyllt i det.`
            : 'Jämför med kontoutdraget innan du registrerar.'}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <Button isDisabled={registrerbara.length === 0} onPress={modell.registrera}>
              {registrerbara.length === 0
                ? 'Registrera'
                : `Registrera ${plural(registrerbara.length, 'betalning', 'betalningar')}`}
            </Button>
          </div>
          <div className="flex flex-col">
            <Button
              intent="secondary"
              emphasis="outline"
              isDisabled={kvitton === 0}
              onPress={modell.registrera}
            >
              {kvitton === 0
                ? 'Registrera och skicka kvitton'
                : `Registrera och skicka ${plural(kvitton, 'kvitto', 'kvitton')}`}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * Kortets huvud — avatar · namn (· märke), inkorgens `BetalningsradKort` med
 * EN rad: Marcus varv 7 rev "kvar att betala"-raden och bad om namnet
 * centrerat mot initialerna. Märket (Förfallen/Obekräftad) står inline efter
 * namnet i stället för på en egen rad, så alla kort förblir exakt lika höga.
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
 * Radens formulär = INKORGENS `RegistreraForm`, fält för fält i samma
 * ordning: Belopp i kronor · utfallsrutan (vad beloppet täcker) · Betalsätt +
 * Betalningsdatum · Notering · Skicka kvitto · knappraden. `pt-3` utan
 * avdelare — så bor formuläret i inkorgens markerade kort. Skillnaden:
 * knapparna säger Klar/Avbryt (se filhuvudet), och det avtalade priset
 * (en mutation) är inte med i prototypen.
 */
function RadFormular({
  rad,
  modell,
  onKlar,
  onAvbryt,
}: {
  rad: BekraftelseRad;
  modell: BekraftelsestegModell;
  onKlar?: () => void;
  onAvbryt?: () => void;
}) {
  const fel = beloppsFel(rad.belopp);
  const belopp = radbelopp(rad);
  const felId = useId();
  const beloppRef = useRef<HTMLInputElement>(null);

  // FÖRDRÖJNINGEN — inkorgens `UTFALL_FORDROJNING_MS`: rutan byts EN sekund
  // efter att Lotta slutat skriva, eller direkt när hon lämnar fältet. Med
  // förifyllt värde står den rätt från start utan timeout.
  const [visatBelopp, setVisatBelopp] = useState(rad.belopp);
  useEffect(() => {
    if (visatBelopp === rad.belopp) return;
    const id = window.setTimeout(() => setVisatBelopp(rad.belopp), 1000);
    return () => window.clearTimeout(id);
  }, [rad.belopp, visatBelopp]);
  const visatTal = normaliseraBeloppKlient(visatBelopp);
  const utfall = visatTal === null || visatTal <= 0 ? null : beloppsutfall(rad.inkorg, visatTal);

  // Inkorgen fokuserar och markerar beloppet när formuläret öppnas.
  useEffect(() => {
    const falt = beloppRef.current;
    if (!falt) return;
    falt.focus();
    falt.select();
  }, []);

  return (
    <div className="flex flex-col gap-3 pt-3">
      <Input
        ref={beloppRef}
        label="Belopp i kronor"
        value={rad.belopp}
        onChange={(v) => modell.sattRadBelopp(rad.nyckel, v)}
        onBlur={() => setVisatBelopp(rad.belopp)}
        // Enter i beloppsfältet = Klar (inkorgens submit-på-Enter), aldrig
        // sidans registrering — ett nästlat `<form>` vore ogiltig HTML.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey) && onKlar && belopp !== null) {
            e.preventDefault();
            onKlar();
          }
        }}
        inputMode="decimal"
        autoComplete="off"
        placeholder="2 500,00"
        isInvalid={fel !== null}
        errorMessage={fel ?? undefined}
        aria-describedby={utfall ? felId : undefined}
      />
      <p id={felId} role="status" aria-live="polite" className="sr-only">
        {utfall?.text ?? ''}
      </p>
      {utfall &&
        (() => {
          const { intent, Ikon } = UTFALL_FORM[utfall.ton];
          return (
            <MessageBox
              intent={intent}
              // `border-y border-r` sluter rutan hos konsumenten, som inkorgen
              // (`RegistreraForm` § EN RIKTIG BOX): primitiven bär bara
              // vänsterkanten, och de tre kantbredderna tar intent-färgen.
              className="border-y border-r"
            >
              <span aria-hidden="true" className="flex items-start gap-2">
                <Ikon size={18} className="mt-0.5 shrink-0" />
                <span>{utfall.text}</span>
              </span>
            </MessageBox>
          );
        })()}
      <div className="flex flex-wrap gap-3">
        <Select
          label="Betalsätt"
          selectedKey={rad.betalsatt}
          onSelectionChange={(nyckel) => modell.sattRadBetalsatt(rad.nyckel, nyckel as Betalsatt)}
          className="min-w-40 flex-1"
        >
          {VALBARA_BETALSATT.map((satt) => (
            <SelectItem key={satt} id={satt}>
              {satt}
            </SelectItem>
          ))}
        </Select>
        <Input
          label="Betalningsdatum"
          type="date"
          value={rad.datum}
          onChange={(v) => modell.sattRadDatum(rad.nyckel, v)}
          className="min-w-40 flex-1"
        />
      </div>
      <Input
        label="Notering"
        hideLabel
        value={rad.notering}
        onChange={(v) => modell.sattRadNotering(rad.nyckel, v)}
        placeholder="Notering…"
        autoComplete="off"
      />
      <KvittoKryss
        checked={rad.medKvitto}
        onChange={(v) => modell.sattRadKvitto(rad.nyckel, v)}
        label="Skicka kvitto"
      />
      {(onKlar || onAvbryt) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {onKlar && (
            <Button isDisabled={belopp === null} onPress={onKlar}>
              Klar
            </Button>
          )}
          {onAvbryt && (
            <Button intent="ghost" onPress={onAvbryt}>
              Avbryt
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

type Radvarden = Pick<BekraftelseRad, 'belopp' | 'betalsatt' | 'datum' | 'medKvitto' | 'notering'>;

/**
 * Inkorgens kort, och KORTET ÄR KRYSSRUTAN (eventdetaljens `MarkerbartKort`,
 * Åtgärds-sidans `MarkerbartDeltagarKort`). Kryssrutan täcker avatar + text;
 * beloppsknappen är ett SYSKON (en knapp i en `<label>` är ogiltig HTML och
 * hade växlat markeringen). Beloppsknappen sitter där "Registrera betalning"
 * sitter i inkorgen och öppnar samma formulär i kortet. Avbryt återställer
 * radens värden till dem som gällde när kortet öppnades — som inkorgens
 * Avbryt kastar formulärets input.
 */
function MarkerbartKort({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(false);
  const [innan, setInnan] = useState<Radvarden | null>(null);
  const panelId = useId();
  const belopp = radbelopp(rad);
  const vald = rad.markerad;

  const oppna = () => {
    setInnan({
      belopp: rad.belopp,
      betalsatt: rad.betalsatt,
      datum: rad.datum,
      medKvitto: rad.medKvitto,
      notering: rad.notering,
    });
    setOppen(true);
  };
  const avbryt = () => {
    if (innan) {
      modell.sattRadBelopp(rad.nyckel, innan.belopp);
      modell.sattRadBetalsatt(rad.nyckel, innan.betalsatt);
      modell.sattRadDatum(rad.nyckel, innan.datum);
      modell.sattRadKvitto(rad.nyckel, innan.medKvitto);
      modell.sattRadNotering(rad.nyckel, innan.notering);
    }
    setOppen(false);
  };

  return (
    <li className={kortKlass(vald)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Checkbox
          isSelected={vald}
          onChange={(v) => modell.sattRadMarkerad(rad.nyckel, v)}
          className="flex min-w-0 cursor-pointer items-center gap-3 sm:flex-1"
        >
          <KortHuvud rad={rad} vald={vald} />
        </Checkbox>
        {!oppen && (
          /* BELOPPET PLATT PÅ YTAN (Marcus varv 9: *"ingen pill … skriv ut
             beloppet platt direkt på ytan bara, men separera beloppet lite
             mer från chevronen, och gör chevronen lite större och med
             hover"*). Hela knappen är träffytan; chevronen bär hovern som en
             rund platta, samma grepp som `SidRam`s chevron och filterradens
             tratt. Avmarkerat kort: dämpad text, ingen hover. */
          <AriaButton
            className="group inline-flex items-center gap-3 self-start data-[disabled]:cursor-not-allowed sm:self-auto"
            isDisabled={!vald}
            aria-expanded={false}
            aria-label={`Ändra belopp för ${rad.inkorg.namn}`}
            onPress={oppna}
          >
            <span
              className={`font-medium text-body tabular-nums ${
                vald ? 'text-text' : 'text-text-muted'
              }`}
            >
              {belopp === null ? 'Saknar belopp' : `${visaKronor(belopp)} kr`}
            </span>
            <span
              className={`-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full motion-safe:transition-colors ${
                vald
                  ? 'text-text-secondary group-data-[hovered]:bg-bg-emphasized group-data-[hovered]:text-text'
                  : 'text-text-muted'
              }`}
            >
              <ChevronDown aria-hidden="true" size={20} />
            </span>
          </AriaButton>
        )}
      </div>
      {oppen && vald && (
        <div id={panelId}>
          <RadFormular rad={rad} modell={modell} onKlar={() => setOppen(false)} onAvbryt={avbryt} />
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
 */
function HandKort({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
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
      <RadFormular rad={rad} modell={modell} />
    </li>
  );
}

/**
 * Under och efter registreringen: samma sida, raderna byter hög allteftersom
 * utfallet landar (beslut 4). Lyckade kort är vita (avbetade), fallna gröna
 * (fortfarande valda, Åtgärds-sidans `UtfallsKort`). Statusraden får fokus
 * när allt är klart.
 */
function ResultatC({ modell }: { modell: BekraftelsestegModell }) {
  const klart = modell.fas === 'klart';
  const statusRef = useRef<HTMLParagraphElement>(null);
  const regId = useId();
  const felId = useId();
  const vantarId = useId();

  const korda = modell.rader.filter(arRegistrerbar);
  const registrerade = modell.rader.filter((r) => r.utfall?.klass === 'registrerad');
  const misslyckade = modell.rader.filter((r) => r.utfall?.klass === 'fel');
  const vantar = korda.filter((r) => r.utfall === null);
  const total = registrerade.length + misslyckade.length + vantar.length;
  const kvitton = antalRegistreradeKvitton(modell.rader);
  const registreradeGrupper = useMemo(() => grupperaRader(registrerade), [registrerade]);

  useEffect(() => {
    if (klart) statusRef.current?.focus();
  }, [klart]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="text-small text-text-secondary outline-none"
        >
          {klart
            ? `${registrerade.length} av ${total} registrerade`
            : `Registrerar ${registrerade.length + misslyckade.length} av ${total} …`}
        </p>
      </header>

      {klart &&
        (misslyckade.length > 0 ? (
          <MessageBox
            intent="warning"
            title={`${plural(misslyckade.length, 'betalning', 'betalningar')} kunde inte registreras`}
          >
            De andra är registrerade. Raden som fallerade ligger kvar nedanför, så du kan försöka
            igen.
          </MessageBox>
        ) : (
          <MessageBox intent="success" title="Alla betalningar är registrerade">
            Kvittona ligger i kön och skickas när du trycker Skicka.
          </MessageBox>
        ))}

      {misslyckade.length > 0 && (
        <section aria-labelledby={felId} className="flex flex-col gap-3 px-4">
          <SektionsRubrik id={felId} antal={misslyckade.length}>
            Kunde inte registreras
          </SektionsRubrik>
          <ul className={LISTA_KLASS}>
            {misslyckade.map((rad) => (
              <li key={rad.nyckel} className={`flex flex-col gap-3 ${kortKlass(true)}`}>
                <UtfallRad rad={rad} visaEvent />
                <div className="flex flex-wrap gap-2 pl-12">
                  <Button size="sm" intent="secondary" emphasis="outline" isDisabled>
                    Försök igen
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby={regId} className="flex flex-col gap-4 px-4">
        <SektionsRubrik id={regId} antal={registrerade.length}>
          Registrerade
        </SektionsRubrik>
        {registrerade.length === 0 ? (
          <p className="text-small text-text-secondary">Inga än.</p>
        ) : (
          registreradeGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className={LISTA_KLASS}>
                {grupp.rader.map((rad) => (
                  <li key={rad.nyckel} className={kortKlass(false)}>
                    <UtfallRad rad={rad} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {vantar.length > 0 && (
        <section aria-labelledby={vantarId} className="flex flex-col gap-3 px-4">
          <SektionsRubrik id={vantarId} antal={vantar.length}>
            Väntar
          </SektionsRubrik>
          <ul className={LISTA_KLASS}>
            {vantar.map((rad) => (
              <li key={rad.nyckel} className={kortKlass(true)}>
                <UtfallRad rad={rad} visaEvent />
              </li>
            ))}
          </ul>
        </section>
      )}

      {klart && (
        <div className="flex flex-col gap-3">
          <MessageBox intent="info" title="Prototyp: inget skickas">
            Försök igen, Förhandsgranska och Skicka är avstängda i prototypen. I den skarpa ytan går
            kvittona genom inkorgens kö.
          </MessageBox>
          <div className="flex flex-wrap gap-2">
            <Button intent="secondary" emphasis="outline" isDisabled>
              {'Förhandsgranska '}
              <RaknarChip antal={kvitton} className="relative -top-1 min-w-6 tabular-nums" />
            </Button>
            <Button intent="success" isDisabled>
              {`Skicka ${plural(kvitton, 'kvitto', 'kvitton')}`}
            </Button>
            <Button intent="ghost" onPress={modell.aterstall}>
              Börja om (prototyp)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Rad i utfallslistorna: avatar · namn/betalsätt/datum · belopp, med utfallet
 * i högerkolumnen när det är kort och på en egen rad under när det är ett
 * fel. `visaEvent` för listor som inte är grupperade per event.
 */
function UtfallRad({ rad, visaEvent = false }: { rad: BekraftelseRad; visaEvent?: boolean }) {
  const belopp = radbelopp(rad);
  const fel = rad.utfall?.klass === 'fel';
  const eventNamn = visaEvent ? rad.inkorg.betalning.eventNamn : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <InitialAvatar namn={rad.inkorg.namn} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-body">{rad.inkorg.namn}</span>
          <span className="truncate text-caption text-text-muted">
            {[eventNamn, rad.betalsatt, visaDag(rad.datum)].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-medium text-body tabular-nums">
            {belopp === null ? '' : `${visaKronor(belopp)} kr`}
          </span>
          {rad.utfall === null ? (
            <span className="text-caption text-text-muted">Väntar …</span>
          ) : fel ? null : (
            <RadUtfallRad rad={rad} />
          )}
        </span>
      </div>
      {fel && (
        <div className="pl-12">
          <RadUtfallRad rad={rad} />
        </div>
      )}
    </div>
  );
}
