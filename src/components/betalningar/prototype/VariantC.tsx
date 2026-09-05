import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Checkbox } from 'react-aria-components';
import { Button, MessageBox, Radio, RadioGroup, RaknarChip } from '@/components/primitives';
import { InitialAvatar } from '@/components/primitives/InitialAvatar';
import { visaKronor } from '../belopp-inmatning';
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
import {
  BeloppInput,
  BetalsattSegment,
  DatumInput,
  KvittoKryss,
  RadMarken,
  RadUtfallRad,
  SaknasKontext,
} from './radfalt';

/**
 * [PROTOTYPE] Variant C — AVVIKELSE-FÖRST. Konvergens-passet (S121, Marcus
 * val 2026-09-05: *"Jag vill gå vidare med C"*), steg 2.
 *
 * Bevisar: MINSTA ANTAL HANDLINGAR. Appen förvalar allt och Lotta rör bara
 * undantagen. Raderna ligger i två högar: de som saknar belopp öppna överst,
 * de som är klara komprimerade under, grupperade per event.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARV 2 — LOTTAS MORGON STYR (Marcus val B, 2026-09-05)
 * ═══════════════════════════════════════════════════════════════════════════
 * Marcus prövade varv 1 mot en verklig morgon (fixturen bär den nu, se
 * `fixtur.ts`): sex avgifter à 1 000 över tre event och fyra slutbetalningar
 * à 1 500 i ett event. Ett globalt "Vad betalade de?" har inget svar för en
 * blandad batch — och blandad är normalfallet. Därför:
 *   • BELOPPET FÖRVALS PER RAD ur datat (`forslagsbelopp`): avgiften för den
 *     som inte betalat något, resten för den som redan betalat avgiften. Alla
 *     tio blir rätt utan ett enda val.
 *   • BULKVALET FINNS KVAR (val B, "för att inte ta bort flexibilitet") som
 *     ett treval: Som vi föreslår · Anmälningsavgift för alla · Allt som saknas
 *     för alla — varje rad visar vad valet ger, i kronor, INNAN det görs.
 *   • AVSTÄMNINGEN i hennes klumpar ("6 anmälningsavgifter · 6 000 kr, 4
 *     slutbetalningar · 6 000 kr") står ovanför Registrera — det hon jämför
 *     mot kontoutdraget.
 *   • RADERNA GRUPPERAS PER EVENT (inkorgens form): de fyra slutbetalningarna
 *     ligger ihop, avgifterna syns per event.
 *   • RADENS EGNA KANDIDATER som förslagsknappar i redigeraren, så en
 *     rättelse är ett tryck efter utfällningen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HUSETS GRAMMATIK, INTE EN EGEN (varv 1, Marcus: *"håll appens bredd (!)"*)
 * ═══════════════════════════════════════════════════════════════════════════
 * Ytan lever i `<main>`s 600 px-kolumn och lånar formen från ytor som redan
 * finns: sidkrom (`SidRam` + `<h1>` i `px-4`); formulär som `<h2>` utanför
 * ett grått kort (Skapa event); grå gruppbehållare med vita kort (inkorgen)
 * respektive avdelade rader (Hem); rubrik med räknarchip (segmentvyn);
 * helbreddsknapp under listan (Hem § "Bekräfta alla"); en primär, syskonet
 * outline (`RegistreraForm`); max en varningssignal per rad (inkorgen).
 *
 * VAD SOM RÄKNAS SOM "BEHÖVER DIN HAND": en rad UTAN belopp — bulkvalet gick
 * inte ihop (`ejGenomforbar`) eller fältet är tomt. Obekräftad och förfallen
 * är MÄRKEN på raden var den än ligger (beslut 5). "Annat belopp" erbjuds
 * inte som bulkval — varje rad har sitt eget fält.
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

/**
 * Förslagsknappens ord. `harledBeloppsknappar` etiketterar med domänens
 * korta former; här står de utskrivna så knappen läser som en mening.
 */
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
    <h2 id={id} className="flex items-center gap-2 px-4 font-semibold text-lg">
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
 * " · " i en `ml-2 font-normal text-small text-text-muted`-span. Marcus varv
 * 4: *"EXAKT som på betalnings-sidan. Lotta måste känna igen sig."*
 * Avdelaren är en textnod så skärmläsaren inte läser namn och datum i ett svep.
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

export function VariantC({ modell }: { modell: BekraftelsestegModell }) {
  if (modell.fas !== 'redigera') return <ResultatC modell={modell} />;
  return <RedigeraC modell={modell} />;
}

function RedigeraC({ modell }: { modell: BekraftelsestegModell }) {
  const valId = useId();
  const handId = useId();
  const { rader } = modell;

  // MARKERINGEN (varv 5, eventdetaljens/Åtgärders grammatik): raderna kom
  // markerade från inkorgen; avmarkerade står kvar i listan (vita) men
  // räknas ingenstans — inte i högarna, inte i bulkvalen, inte i avstämningen.
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

  // Vad varje bulkval ger, räknat på raderna INNAN valet görs.
  const utfallPerVal = useMemo(
    () => new Map(BULKVAL.map((v) => [v.nyckel, bulkutfall(markerade, v.nyckel)] as const)),
    [markerade],
  );
  // Förslagets egen klumpsammanfattning ("6 anmälningsavgifter · 4 slutbetalningar").
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
        // Ctrl/⌘+Enter = "Registrera och skicka" (beslut 4), samma genväg som
        // radformuläret bär.
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && registrerbara.length > 0) {
          e.preventDefault();
          modell.registrera();
        }
      }}
    >
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        {/* RÄKNAREN FÖRST — Åtgärds-sidans ordval ("7 av 19 deltagare
            markerade"), live så skärmläsaren hör när ett kort avmarkeras. */}
        <p role="status" aria-live="polite" className="text-small text-text-secondary">
          {`${markerade.length} av ${rader.length} betalningar markerade`}
        </p>
      </header>

      {/* ═══ LISTAN — inkorgens form, klass för klass (Marcus varv 4) ═══
          Ingen egen rubrik: eventrubrikerna ÄR listans rubriker, som i
          inkorgen. `px-4` på sektionen + `-mx-4` på `<ul>` är inkorgens
          egen geometri (rubriken indragen, korten kant i kant). */}
      <section aria-label="Registreringsförslag" className="flex flex-col gap-4 px-4">
        {klarhogen.length === 0 ? (
          <p className="text-small text-text-muted">Ingen rad har ett belopp än.</p>
        ) : (
          klaraGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className="-mx-4 flex flex-col gap-2 rounded-2xl border border-transparent bg-bg-muted p-2 contrast-more:border-border-strong">
                {grupp.rader.map((rad) => (
                  <KlarRad key={rad.nyckel} rad={rad} modell={modell} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* ═══ BEHÖVER DIN HAND — bara när något faktiskt behöver henne ═══ */}
      {handhogen.length > 0 && (
        <section aria-labelledby={handId} className="flex flex-col gap-3">
          <SektionsRubrik id={handId} antal={handhogen.length}>
            Behöver din hand
          </SektionsRubrik>
          <ul className="flex flex-col gap-2 rounded-2xl bg-bg-muted p-2">
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

/** Radens betalsätt · datum · kvitto i ett andetag — sekundärledet. */
function RadSammanfattning({ rad }: { rad: BekraftelseRad }) {
  return (
    <span className="text-caption text-text-muted">
      {[rad.betalsatt, visaDag(rad.datum), rad.medKvitto ? 'kvitto' : 'inget kvitto'].join(' · ')}
    </span>
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
 * Radens redigerare — belopp (valfritt), datum, betalsätt, kvitto. En form
 * för hand-kortet och den utfällda klara raden; skillnaden är bara om
 * beloppet redan står öppet ovanför.
 */
function RadRedigerare({
  rad,
  modell,
  visaBelopp,
  id,
}: {
  rad: BekraftelseRad;
  modell: BekraftelsestegModell;
  visaBelopp: boolean;
  /** Panelens id — `aria-controls` på knappen som fäller ut den. */
  id: string;
}) {
  // Två fält av samma höjd på rad ett, pillen ensam på rad två: en pill i
  // samma flexrad som fälten radbröt ojämnt i kolumnens bredd (varv 1).
  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        {visaBelopp && (
          <BeloppInput
            rad={rad}
            onChange={(v) => modell.sattRadBelopp(rad.nyckel, v)}
            size="sm"
            className="w-32"
          />
        )}
        <DatumInput
          label="Datum"
          value={rad.datum}
          onChange={(v) => modell.sattRadDatum(rad.nyckel, v)}
          size="sm"
          className="w-36"
        />
      </div>
      {visaBelopp && <ForslagsKnappar rad={rad} modell={modell} />}
      <div className="flex flex-col items-start gap-1">
        <span className="text-(color:--mm-input-label-text) text-small">Betalsätt</span>
        <BetalsattSegment
          label={`Betalsätt för ${rad.inkorg.namn}`}
          value={rad.betalsatt}
          onChange={(v) => modell.sattRadBetalsatt(rad.nyckel, v)}
          size="sm"
        />
      </div>
      <KvittoKryss
        checked={rad.medKvitto}
        onChange={(v) => modell.sattRadKvitto(rad.nyckel, v)}
        label="Skicka kvitto"
      />
    </div>
  );
}

/** En rad i "Behöver din hand": vitt kort i grå behållare, beloppet öppet. */
function HandKort({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(false);
  const panelId = useId();
  const harMarken = rad.inkorg.forfallen || rad.inkorg.obekraftad;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-transparent bg-surface p-3 contrast-more:border-border-strong">
      <div className="flex items-center gap-3">
        <InitialAvatar namn={rad.inkorg.namn} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium text-body">{rad.inkorg.namn}</span>
          <SaknasKontext rad={rad} />
          {harMarken && (
            <div className="flex flex-wrap items-center gap-2">
              <RadMarken rad={rad} />
            </div>
          )}
        </div>
      </div>

      <p className="text-small text-text-secondary">
        {handSkal(rad)} Skriv beloppet, eller välj ett förslag.
      </p>

      <div className="flex flex-col gap-2">
        <BeloppInput
          rad={rad}
          onChange={(v) => modell.sattRadBelopp(rad.nyckel, v)}
          className="w-40"
        />
        <ForslagsKnappar rad={rad} modell={modell} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <RadSammanfattning rad={rad} />
        <Button
          intent="ghost"
          size="sm"
          aria-expanded={oppen}
          aria-controls={oppen ? panelId : undefined}
          onPress={() => setOppen((v) => !v)}
        >
          Ändra
          <ChevronDown
            aria-hidden="true"
            size={16}
            className={`motion-safe:transition-transform ${oppen ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>
      {oppen && <RadRedigerare id={panelId} rad={rad} modell={modell} visaBelopp={false} />}
    </li>
  );
}

/**
 * En förslagsrad = INKORGENS KORT, och KORTET ÄR KRYSSRUTAN — samma grammatik
 * som eventdetaljens `MarkerbartKort` och Åtgärds-sidans
 * `MarkerbartDeltagarKort`: valt kort får `border-(--mm-success)` +
 * `bg-(--mm-success-bg)`, avmarkerat kort är vitt (inkorgens vilande kort)
 * och räknas ingenstans. Raderna kom markerade från inkorgen (Marcus varv 5:
 * *"det måste 'funka' på samma sätt som när Lotta markerar på eventdetaljer
 * och 'drar med dem' in i åtgärder"*).
 *
 * Kryssrutan täcker avatar + namn + meta (ett tryck var som helst där
 * växlar). Beloppsknappen är ett SYSKON till kryssrutan, inte ett barn: en
 * knapp inuti en `<label>` är ogiltig HTML och hade växlat markeringen vid
 * varje belopps-tryck. Kortet (`<li>`) bär den gröna ytan så båda läser som
 * en enhet.
 */
function KlarRad({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(false);
  const panelId = useId();
  const belopp = radbelopp(rad);
  const kvar = rad.inkorg.kvar;
  const harMarken = rad.inkorg.forfallen || rad.inkorg.obekraftad;
  const vald = rad.markerad;

  return (
    <li
      className={`rounded-2xl border p-3 ${
        vald
          ? 'border-(--mm-success) bg-(--mm-success-bg) contrast-more:border-(--mm-success)'
          : 'border-transparent bg-surface contrast-more:border-border-strong'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Checkbox
          isSelected={vald}
          onChange={(v) => modell.sattRadMarkerad(rad.nyckel, v)}
          className="flex min-w-0 cursor-pointer items-center gap-3 sm:flex-1"
        >
          <InitialAvatar namn={rad.inkorg.namn} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-medium text-body sm:truncate">{rad.inkorg.namn}</span>
            <span className="text-caption text-text-muted sm:truncate">
              {kvar === null ? 'Pris saknas i basen' : `${visaKronor(kvar)} kr kvar att betala`}
            </span>
            <RadSammanfattning rad={rad} />
            {harMarken && (
              <span className="flex flex-wrap items-center gap-2">
                <RadMarken rad={rad} />
              </span>
            )}
            <span className="sr-only">{vald ? 'Markerad' : 'Inte markerad'}</span>
          </span>
        </Checkbox>
        <Button
          intent="primary"
          emphasis="outline"
          size="sm"
          className="self-start sm:self-auto"
          isDisabled={!vald}
          aria-expanded={oppen}
          aria-controls={oppen ? panelId : undefined}
          aria-label={`Ändra belopp för ${rad.inkorg.namn}`}
          onPress={() => setOppen((v) => !v)}
        >
          <span className="tabular-nums">
            {belopp === null ? 'Ogiltigt belopp' : `${visaKronor(belopp)} kr`}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={14}
            className={`shrink-0 motion-safe:transition-transform ${oppen ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>
      {oppen && vald && (
        <div className="mt-3 border-(--mm-success) border-t pt-3">
          <RadRedigerare id={panelId} rad={rad} modell={modell} visaBelopp />
        </div>
      )}
    </li>
  );
}

/**
 * Under och efter registreringen: samma sida, raderna byter hög allteftersom
 * utfallet landar (beslut 4: utfall per rad i samma steg, ett fel stoppar
 * inte de andra). Statusraden får fokus när allt är klart.
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
        <section aria-labelledby={felId} className="flex flex-col gap-3">
          <SektionsRubrik id={felId} antal={misslyckade.length}>
            Kunde inte registreras
          </SektionsRubrik>
          <ul className="flex flex-col gap-2 rounded-2xl bg-bg-muted p-2">
            {/* FALLNA KORT BEHÅLLER MARKERINGS-FORMEN (Åtgärds-sidans
                `UtfallsKort`): grönt betyder VALD, och de fallna är fortfarande
                valda så en omkörning träffar just dem. De lyckade är avbetade
                och därför vita. */}
            {misslyckade.map((rad) => (
              <li
                key={rad.nyckel}
                className="flex flex-col gap-3 rounded-2xl border border-(--mm-success) bg-(--mm-success-bg) p-3 contrast-more:border-(--mm-success)"
              >
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

      <section aria-labelledby={regId} className="flex flex-col gap-4">
        <SektionsRubrik id={regId} antal={registrerade.length}>
          Registrerade
        </SektionsRubrik>
        {registrerade.length === 0 ? (
          <p className="px-4 text-small text-text-secondary">Inga än.</p>
        ) : (
          registreradeGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2 px-4">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className="-mx-4 flex flex-col gap-2 rounded-2xl border border-transparent bg-bg-muted p-2 contrast-more:border-border-strong">
                {grupp.rader.map((rad) => (
                  <li
                    key={rad.nyckel}
                    className="rounded-2xl border border-transparent bg-surface p-3 contrast-more:border-border-strong"
                  >
                    <UtfallRad rad={rad} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {vantar.length > 0 && (
        <section aria-labelledby={vantarId} className="flex flex-col gap-3">
          <SektionsRubrik id={vantarId} antal={vantar.length}>
            Väntar
          </SektionsRubrik>
          <ul className="flex flex-col divide-y divide-border rounded-2xl bg-bg-muted px-1">
            {vantar.map((rad) => (
              <li key={rad.nyckel} className="px-3 py-3">
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
 * fel — feltexten är en mening och ska inte trängas in bredvid beloppet.
 * `visaEvent` för listor som inte är grupperade per event.
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
