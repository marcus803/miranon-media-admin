import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RadioGroup as AriaRadioGroup, Radio } from 'react-aria-components';
import { Button, MessageBox, RaknarChip } from '@/components/primitives';
import { InitialAvatar } from '@/components/primitives/InitialAvatar';
import { visaKronor } from '../belopp-inmatning';
import {
  antalRegistreradeKvitton,
  arRegistrerbar,
  type BekraftelseRad,
  type BekraftelsestegModell,
  type Beloppsgenvag,
  genvagsbelopp,
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
 * [PROTOTYPE] Variant C — AVVIKELSE-FÖRST. Konvergens-passet, steg 2 (S121,
 * Marcus val 2026-09-05: *"Jag vill gå vidare med C"*).
 *
 * Bevisar: MINSTA ANTAL HANDLINGAR. Appen förvalar allt (belopp ur bulkvalet,
 * betalsätt = senast använda, datum = i dag) och Lotta rör bara undantagen.
 * Ett val överst — "Vad betalade de?" — sorterar raderna i två högar: de som
 * saknar belopp ligger öppna överst, de som är klara ligger komprimerade under.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STEG 2 — HUSETS GRAMMATIK, INTE EN EGEN (Marcus 2026-09-05: *"Implementera
 * appens sidkrom och det här, håll appens bredd (!)"*)
 * ═══════════════════════════════════════════════════════════════════════════
 * Divergens-steget bröt ut till 92 vw / 1100 px och ritade en egen sticky
 * knapprad som krockade med tabbaren. Steg 2 lever i `<main>`s 600 px-kolumn
 * och lånar formen från ytor som redan finns:
 *   • sidkrom: `SidRam`-chevron + `<h1>` i `px-4` (inkorgen, persondetaljen);
 *   • formulär: `<h2>` utanför ett grått kort med etiketter ovanför fälten
 *     (Skapa event § "Om eventet");
 *   • listor: grå gruppbehållare (`bg-bg-muted rounded-2xl`) med vita kort
 *     (inkorgens öppna rader) respektive avdelade rader (Hem-vyns listor);
 *   • rubrik med räknarchip ("Färdiga grupper 14", segmentvyn);
 *   • massåtgärd: helbreddsknapp under listan (Hem § "Bekräfta alla",
 *     `BulkAtgardsknapp`-formen: `flex flex-col` + `Button`);
 *   • en primär, syskonet outline (Marcus dom 2026-09-01, `RegistreraForm`);
 *   • MAX EN varningssignal per rad (`BetalningsInkorg` § pill-anatomin).
 *
 * VAD SOM RÄKNAS SOM "BEHÖVER DIN HAND": en rad UTAN belopp — bulkvalet gick
 * inte ihop (`ejGenomforbar`) eller fältet är tomt. Obekräftad och förfallen
 * är MÄRKEN på raden var den än ligger, inte skäl att lyfta den: beslut 5
 * säger att obekräftade registreras som vanligt, och en förfallen rad har ett
 * lika giltigt belopp som de andra. Divergens-steget lyfte båda; det gjorde
 * högen större utan att ge Lotta något att göra där.
 *
 * "Annat belopp" (beslut 2:s tredje genväg) erbjuds inte som bulkval här:
 * varje rad har sitt eget beloppsfält, och att tömma alla tio för hand är
 * motsatsen till variantens idé. Öppet bokfört, inte tyst borttaget.
 */

const GENVAGAR: {
  nyckel: Extract<Beloppsgenvag, 'avgift' | 'allt'>;
  etikett: string;
  under: string;
}[] = [
  { nyckel: 'avgift', etikett: 'Anmälningsavgift', under: 'Bara avgiften för platsen' },
  { nyckel: 'allt', etikett: 'Allt som saknas', under: 'Hela beloppet som är kvar' },
];

/** Raden saknar ett belopp — bulkvalet gick inte ihop, eller fältet är tomt. */
function saknarBelopp(rad: BekraftelseRad): boolean {
  return rad.ejGenomforbar !== null || rad.belopp.trim() === '';
}

/** Kort svenskt datum för radens sekundärled: "4 sep." */
function visaDag(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(d);
}

/**
 * Förslagsknappens ord. `harledBeloppsknappar` etiketterar med domänens
 * korta former (`anmälningsavgift`/`allt`/`resten`); här står de utskrivna,
 * så knappen läser som en mening: "Allt som saknas · 500 kr".
 */
function forslagsEtikett(etikett: string): string {
  switch (etikett) {
    case 'anmälningsavgift':
      return 'Anmälningsavgift';
    case 'allt':
      return 'Allt som saknas';
    case 'resten':
      return 'Resten';
    default:
      return etikett.charAt(0).toUpperCase() + etikett.slice(1);
  }
}

function plural(antal: number, ett: string, flera: string): string {
  return `${antal} ${antal === 1 ? ett : flera}`;
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
    <h2 id={id} className="flex items-center gap-2 px-4 font-semibold text-lg">
      {children}
      <span className="rounded-md bg-bg-emphasized px-1.5 py-0.5 font-medium text-caption text-text-secondary tabular-nums">
        {antal}
      </span>
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
  const klarId = useId();
  const { rader } = modell;

  const handhogen = rader.filter(saknarBelopp);
  const klarhogen = rader.filter((r) => !saknarBelopp(r));
  const registrerbara = rader.filter(arRegistrerbar);
  const kvitton = registrerbara.filter((r) => r.medKvitto).length;
  const antalEvent = new Set(
    rader.map((r) => r.inkorg.betalning.eventId ?? r.inkorg.betalning.eventNamn ?? 'utan-event'),
  ).size;
  const vald = modell.aktivGenvag === 'avgift' ? 'avgift' : 'allt';

  // Vad varje bulkval ger, räknat på raderna: så ser Lotta följden av valet
  // INNAN hon gör det, i stället för att läsa av tio rader efteråt.
  const utfallPerGenvag = useMemo(() => {
    const ut = new Map<'avgift' | 'allt', { antal: number; summa: number }>();
    for (const g of GENVAGAR) {
      let antal = 0;
      let summa = 0;
      for (const rad of rader) {
        const belopp = genvagsbelopp(rad, g.nyckel);
        if (belopp !== null) {
          antal += 1;
          summa += belopp;
        }
      }
      ut.set(g.nyckel, { antal, summa });
    }
    return ut;
  }, [rader]);

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
        <h1 className="font-semibold text-3xl">Registrera betalningar</h1>
        <p className="text-small text-text-secondary">
          {plural(rader.length, 'betalning', 'betalningar')} i{' '}
          {plural(antalEvent, 'event', 'event')}
        </p>
      </header>

      {/* ═══ BULKVALET — formulärets grammatik: h2 utanför, grått kort med fält ═══ */}
      <section aria-labelledby={valId} className="flex flex-col gap-3">
        <h2 id={valId} className="px-4 font-semibold text-lg">
          Vad betalade de?
        </h2>
        <div className="flex flex-col gap-4 rounded-2xl bg-bg-muted p-4">
          <AriaRadioGroup
            aria-label="Vad betalade de?"
            value={vald}
            onChange={(v) => modell.sattGenvag(v as 'avgift' | 'allt')}
            className="grid gap-2 sm:grid-cols-2"
          >
            {GENVAGAR.map((g) => {
              const u = utfallPerGenvag.get(g.nyckel) ?? { antal: 0, summa: 0 };
              return (
                <Radio
                  key={g.nyckel}
                  value={g.nyckel}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-border bg-surface p-3 text-left data-[selected]:border-primary not-data-[selected]:data-[hovered]:border-border-strong data-[selected]:bg-primary-tint data-[focus-visible]:outline-(--mm-focus-ring) data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 motion-safe:transition-colors contrast-more:data-[selected]:border-2"
                >
                  <span className="font-semibold text-body">{g.etikett}</span>
                  <span className="text-caption text-text-muted">{g.under}</span>
                  <span className="pt-1.5 text-small text-text-secondary tabular-nums">
                    {u.antal} av {rader.length} rader · {visaKronor(u.summa)} kr
                  </span>
                </Radio>
              );
            })}
          </AriaRadioGroup>
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

      {/* ═══ BEHÖVER DIN HAND — inkorgens kortgrammatik ═══ */}
      <section aria-labelledby={handId} className="flex flex-col gap-3">
        <SektionsRubrik id={handId} antal={handhogen.length}>
          Behöver din hand
        </SektionsRubrik>
        {handhogen.length === 0 ? (
          <p className="px-4 text-small text-text-secondary">
            Alla rader har ett belopp. Inget behöver dig här.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 rounded-2xl bg-bg-muted p-2">
            {handhogen.map((rad) => (
              <HandKort key={rad.nyckel} rad={rad} modell={modell} />
            ))}
          </ul>
        )}
      </section>

      {/* ═══ KLARA ATT REGISTRERA — komprimerade rader, utfällbara ═══ */}
      <section aria-labelledby={klarId} className="flex flex-col gap-3">
        <SektionsRubrik id={klarId} antal={klarhogen.length}>
          Klara att registrera
        </SektionsRubrik>
        {klarhogen.length === 0 ? (
          <p className="px-4 text-small text-text-secondary">Inga rader är klara än.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl bg-bg-muted px-1">
            {klarhogen.map((rad) => (
              <KlarRad key={rad.nyckel} rad={rad} modell={modell} />
            ))}
          </ul>
        )}
      </section>

      {/* ═══ SUMMAN OCH HANDLINGEN — Hem-vyns helbreddsknapp under listan ═══ */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 px-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-body">
              {plural(registrerbara.length, 'betalning', 'betalningar')}
            </span>
            <span className="font-semibold text-lg tabular-nums">
              {visaKronor(modell.summering.summa)} kr
            </span>
          </div>
          {handhogen.length > 0 && (
            <p className="text-caption text-text-secondary">
              {plural(handhogen.length, 'rad saknar', 'rader saknar')} belopp och registreras inte
              förrän du fyllt i det.
            </p>
          )}
        </div>
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

/**
 * Radens redigerare — belopp (valfritt), betalsätt, datum, kvitto. En form
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
  // samma flexrad som fälten radbröt ojämnt i kolumnens bredd (Datum hamnade
  // ensamt på en tredje rad, k01).
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
        {rad.beloppsknappar.length > 0 && (
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
        )}
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

/** En komprimerad "klar" rad — en rad per person, utfällbar för ändring. */
function KlarRad({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(false);
  const panelId = useId();
  const belopp = radbelopp(rad);
  const harMarken = rad.inkorg.forfallen || rad.inkorg.obekraftad;
  const eventNamn = rad.inkorg.betalning.eventNamn;

  return (
    <li className="flex flex-col">
      <button
        type="button"
        aria-expanded={oppen}
        aria-controls={oppen ? panelId : undefined}
        onClick={() => setOppen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
      >
        <InitialAvatar namn={rad.inkorg.namn} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-body">{rad.inkorg.namn}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-text-muted">
            {eventNamn && <span className="truncate">{eventNamn}</span>}
            {harMarken && <RadMarken rad={rad} />}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-medium text-body tabular-nums">
            {belopp === null ? 'Ogiltigt belopp' : `${visaKronor(belopp)} kr`}
          </span>
          <RadSammanfattning rad={rad} />
        </span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          className={`shrink-0 text-text-secondary motion-safe:transition-transform ${
            oppen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {oppen && (
        <div className="px-3 pb-3 pl-15">
          <RadRedigerare id={panelId} rad={rad} modell={modell} visaBelopp />
        </div>
      )}
    </li>
  );
}

/**
 * Under och efter registreringen: samma sida, raderna byter hög allteftersom
 * utfallet landar (beslut 4: utfall per rad i samma steg, ett fel stoppar
 * inte de andra). Rubriken får fokus när allt är klart.
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

  useEffect(() => {
    if (klart) statusRef.current?.focus();
  }, [klart]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Registrera betalningar</h1>
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
            {misslyckade.map((rad) => (
              <li
                key={rad.nyckel}
                className="flex flex-col gap-3 rounded-2xl border border-transparent bg-surface p-3 contrast-more:border-border-strong"
              >
                <UtfallRad rad={rad} />
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

      <section aria-labelledby={regId} className="flex flex-col gap-3">
        <SektionsRubrik id={regId} antal={registrerade.length}>
          Registrerade
        </SektionsRubrik>
        {registrerade.length === 0 ? (
          <p className="px-4 text-small text-text-secondary">Inga än.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl bg-bg-muted px-1">
            {registrerade.map((rad) => (
              <li key={rad.nyckel} className="px-3 py-3">
                <UtfallRad rad={rad} />
              </li>
            ))}
          </ul>
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
                <UtfallRad rad={rad} />
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
 * Rad i utfallslistorna: avatar · namn/event · belopp, med utfallet i
 * högerkolumnen när det är kort ("Registrerad · kvitto väntar") och på en
 * egen rad under när det är ett fel — feltexten är en mening och ska inte
 * trängas in bredvid beloppet.
 */
function UtfallRad({ rad }: { rad: BekraftelseRad }) {
  const belopp = radbelopp(rad);
  const eventNamn = rad.inkorg.betalning.eventNamn;
  const fel = rad.utfall?.klass === 'fel';
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
