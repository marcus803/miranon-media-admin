import { ChevronDown, CircleCheck, Info, type LucideIcon, TriangleAlert, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button as AriaButton, Checkbox } from 'react-aria-components';
import { Button, Input, MessageBox, RaknarChip, Select, SelectItem } from '@/components/primitives';
import { InitialAvatar } from '@/components/primitives/InitialAvatar';
import { VALBARA_BETALSATT } from '@/domain/schemas';
import { beloppsFel, normaliseraBeloppKlient, visaKronor } from '../belopp-inmatning';
import type { Betalsatt } from '../betalsatt-minne';
import { type Beloppsutfall, beloppsutfall, jobbDelutfall } from '../inkorg-harledningar';
import {
  antalRegistreradeKvitton,
  arRegistrerbar,
  avstamning,
  type BekraftelseRad,
  type BekraftelsestegModell,
  type Beloppsklass,
  grupperaRader,
  radbelopp,
} from './bekraftelseSimulering';
import { KvittoKryss, RadMarken } from './radfalt';

/**
 * [PROTOTYPE] Variant C — AVVIKELSE-FÖRST. Konvergens-passet (S121, Marcus
 * val 2026-09-05: *"Jag vill gå vidare med C"*), steg 2.
 *
 * Sidan ÄR inkorgens lista med raderna markerade, plus en avstämning och två
 * knappar. Efter registreringen ÄR sidan inkorgens "Registrerat nu"-block.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARV 13 — EFTERLÄGET ÄR INKORGENS, INTE ETT EGET (Marcus: *"allt i
 * prototypen måste vara exakt som i prod-appen, annars kan jag ju inte
 * iterera"*)
 * ═══════════════════════════════════════════════════════════════════════════
 * Den tidigare resultatvyn (egna listor "Registrerade"/"Kunde inte
 * registreras") är riven. I stället:
 *   • "Registrera N betalningar" registrerar rad för rad; registrerade rader
 *     lämnar listan och dyker upp i `RegistreratNu` — inkorgens block
 *     (`BetalningsInkorg.tsx` § "Registrerat nu"), klass för klass:
 *     guldtonat medan något pågår, neutralt när allt vilar; rad = namn ·
 *     "betalsätt · kvittoläge" · belopp · åtgärd (Förhandsgranska / Skicka
 *     igen / Ångra); under listan "Skicka N kvitton" + "Förhandsgranska" med
 *     räknarchip, och statusraden "Skickar kvitton, 3 av 9 klara" →
 *     "9 kvitton skickade" ur inkorgens EGEN `jobbDelutfall`.
 *   • "Registrera och skicka N kvitton" gör samma registrering och köar
 *     kvittona direkt (inkorgens `vidRegistrerad` vid `skickaNu`), så
 *     raderna går "Kvitto köat" → "Kvitto skickas ..." → "Kvitto skickat ·
 *     MM-2026-1001" utan att Lotta trycker Skicka.
 *   • En rad vars registrering fallerar (Gunnar) STANNAR i listan, markerad,
 *     med felet under sig (inkorgens `registrera.isError`-rad), och
 *     "Registrera 1 betalning" är omkörningen. Andra försöket lyckas.
 *   • Ångra tar raden tillbaka till listan (inkorgens Ångra raderar
 *     inbetalningen).
 *   • Förhandsgranska öppnar en PDF i den skarpa ytan; här är knapparna
 *     inerta med ett tooltip som säger det (samma form som Hem-vyns
 *     `BulkAtgardsknapp` i sitt obyggda läge).
 * Ladda om sidan för att börja om — prototypens tillstånd lever i minnet.
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

/**
 * "Förhandsgranska" + upphöjt räknarchip — inkorgens `ForhandsgranskaEtikett`
 * (`TASK-393`), tecken för tecken inklusive det explicita blanksteget.
 */
function ForhandsgranskaEtikett({ antal }: { antal: number }) {
  return (
    <>
      {'Förhandsgranska '}
      <RaknarChip antal={antal} className="relative -top-1 min-w-6 tabular-nums" />
    </>
  );
}

export function VariantC({ modell }: { modell: BekraftelsestegModell }) {
  return <BulkC modell={modell} />;
}

function BulkC({ modell }: { modell: BekraftelsestegModell }) {
  const handId = useId();
  const { rader } = modell;
  const registrerar = modell.fas === 'registrerar';
  const [tryckt, setTryckt] = useState<'registrera' | 'skicka' | null>(null);
  useEffect(() => {
    if (!registrerar) setTryckt(null);
  }, [registrerar]);

  // Registrerade rader lämnar listan och bor i "Registrerat nu"; resten
  // (inklusive en rad vars registrering fallerade) står kvar i listan.
  const registrerade = rader.filter((r) => r.utfall?.klass === 'registrerad');
  const kvar = rader.filter((r) => r.utfall?.klass !== 'registrerad');
  const markerade = kvar.filter((r) => r.markerad);
  const handhogen = markerade.filter(saknarBelopp);
  const klarhogen = kvar.filter((r) => !r.markerad || !saknarBelopp(r));
  const klaraGrupper = useMemo(() => grupperaRader(klarhogen), [klarhogen]);
  const registrerbara = rader.filter(arRegistrerbar);
  const kvitton = registrerbara.filter((r) => r.medKvitto).length;
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
          setTryckt('skicka');
          modell.registrera(true);
        }
      }}
    >
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        {/* RÄKNAREN FÖRST — Åtgärds-sidans ordval, live så skärmläsaren hör
            när ett kort avmarkeras. */}
        <p role="status" aria-live="polite" className="text-small text-text-secondary">
          {kvar.length > 0
            ? `${markerade.length} av ${kvar.length} betalningar markerade`
            : 'Alla betalningar registrerade'}
        </p>
      </header>

      {registrerade.length > 0 && <RegistreratNu modell={modell} rader={registrerade} />}

      {/* ═══ LISTAN — inkorgens form, klass för klass (varv 4) ═══ */}
      {klarhogen.length > 0 && (
        <section aria-label="Markerade betalningar" className="flex flex-col gap-4 px-4">
          {klaraGrupper.map((grupp) => (
            <div key={grupp.eventId} className="flex flex-col gap-2">
              <GruppRubrik namn={grupp.eventNamn} datum={grupp.eventStartdatum} />
              <ul className={LISTA_KLASS}>
                {grupp.rader.map((rad) => (
                  <MarkerbartKort key={rad.nyckel} rad={rad} modell={modell} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

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
              <Button
                isDisabled={registrerbara.length === 0 || registrerar}
                isLoading={registrerar && tryckt === 'registrera'}
                onPress={() => {
                  setTryckt('registrera');
                  modell.registrera(false);
                }}
              >
                {registrerbara.length === 0
                  ? 'Registrera'
                  : `Registrera ${plural(registrerbara.length, 'betalning', 'betalningar')}`}
              </Button>
            </div>
            <div className="flex flex-col">
              <Button
                intent="secondary"
                emphasis="outline"
                isDisabled={kvitton === 0 || registrerar}
                isLoading={registrerar && tryckt === 'skicka'}
                onPress={() => {
                  setTryckt('skicka');
                  modell.registrera(true);
                }}
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
   "REGISTRERAT NU" — inkorgens block, klass för klass (varv 13)
   ═══════════════════════════════════════════════════════════════════════════ */

type Kvittolage = {
  text: string;
  fel: boolean;
  kanAngra: boolean;
  angraSkal: string | null;
  vila: boolean;
};

/** Inkorgens `kvittolage`, ord för ord, läst ur radens simulerade kvittoläge. */
function kvittolage(rad: BekraftelseRad): Kvittolage {
  const angrabar = { fel: false, kanAngra: true, angraSkal: null, vila: true };
  const makuleringsvag =
    'Kvittot är på väg eller skickat. Ångra genom att makulera inbetalningen på anmälans betalningsrader.';
  if (!rad.medKvitto || rad.kvitto === 'ingen') return { text: 'Inget kvitto', ...angrabar };
  if (rad.kvitto === 'vantar') {
    return { text: 'Kvitto väntar på att skickas', ...angrabar, vila: false };
  }
  if (rad.kvitto === 'skickat') {
    return {
      text: rad.kvittonummer ? `Kvitto skickat · ${rad.kvittonummer}` : 'Kvitto skickat',
      fel: false,
      kanAngra: false,
      angraSkal: makuleringsvag,
      vila: true,
    };
  }
  if (rad.kvitto === 'skickas') {
    return {
      text: 'Kvitto skickas ...',
      fel: false,
      kanAngra: false,
      angraSkal: makuleringsvag,
      vila: false,
    };
  }
  if (rad.kvitto === 'fel') {
    return {
      text: 'Kvittot kunde inte skickas: okänt skäl',
      fel: true,
      kanAngra: false,
      angraSkal: makuleringsvag,
      vila: false,
    };
  }
  return {
    text: 'Kvitto köat',
    fel: false,
    kanAngra: false,
    angraSkal: makuleringsvag,
    vila: false,
  };
}

/**
 * Inert knapp med tooltip — Hem-vyns `BulkAtgardsknapp`-form för det som
 * inte är byggt. Förhandsgranskningen öppnar en PDF i den skarpa ytan; det
 * finns ingen PDF att öppna ur en fixtur.
 */
function InertForhandsgranska({
  ariaLabel,
  children,
  size,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  size?: 'sm';
}) {
  const id = useId();
  return (
    <div className="group relative flex flex-col">
      <Button
        intent="secondary"
        emphasis="outline"
        size={size}
        aria-disabled="true"
        aria-label={ariaLabel}
        aria-describedby={id}
      >
        {children}
      </Button>
      <p
        id={id}
        role="tooltip"
        className="text-(color:--mm-surface) pointer-events-none absolute top-full left-0 z-10 mt-2 w-max max-w-64 rounded-lg bg-(--mm-text) px-3 py-2 text-caption opacity-0 shadow-md group-focus-within:opacity-100 group-hover:opacity-100 motion-safe:transition-opacity"
      >
        Öppnar kvittot som PDF i den skarpa ytan. Inte byggt i prototypen.
      </p>
    </div>
  );
}

function RegistreratNu({
  modell,
  rader,
}: {
  modell: BekraftelsestegModell;
  rader: BekraftelseRad[];
}) {
  const [angraNyckel, setAngraNyckel] = useState<string | null>(null);
  const [bekraftelseSynlig, setBekraftelseSynlig] = useState(true);
  const lagen = new Map(rader.map((r) => [r.nyckel, kvittolage(r)] as const));
  const blockAktivt = rader.some((r) => !(lagen.get(r.nyckel)?.vila ?? true));
  const vantande = rader.filter((r) => r.kvitto === 'vantar');
  const enSamKo = vantande.length === 1;
  const utfall = jobbDelutfall(modell.jobbstatus);
  // Ett NYTT jobb gör en avfärdad bekräftelse inaktuell (inkorgens `foregJobbId`).
  const jobbId = modell.jobbstatus?.jobb?.id;
  const foregJobbId = useRef(jobbId);
  useEffect(() => {
    if (foregJobbId.current !== jobbId) {
      foregJobbId.current = jobbId;
      setBekraftelseSynlig(true);
    }
  }, [jobbId]);

  return (
    <section
      tabIndex={-1}
      aria-label="Registrerat nu"
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
        {rader.map((rad) => {
          const lage = lagen.get(rad.nyckel) ?? kvittolage(rad);
          const angrarDenna = angraNyckel === rad.nyckel;
          const belopp = radbelopp(rad) ?? 0;
          return (
            <li key={rad.nyckel} className="py-2">
              <div className="flex flex-nowrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="w-full truncate font-medium text-body">{rad.inkorg.namn}</span>
                  <span className="w-full text-caption text-text-muted">
                    {[rad.betalsatt, lage.text].join(' · ')}
                  </span>
                  <span
                    className={
                      !lage.kanAngra && lage.angraSkal !== null
                        ? 'block min-h-9 w-full text-caption text-text-muted'
                        : 'invisible block min-h-9 w-full text-caption text-text-muted'
                    }
                    aria-hidden={lage.kanAngra || lage.angraSkal === null}
                  >
                    {lage.angraSkal ?? ' '}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-body tabular-nums">
                  {`${visaKronor(belopp)} kr`}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {!enSamKo && rad.kvitto === 'vantar' && (
                    <InertForhandsgranska
                      size="sm"
                      ariaLabel={`Förhandsgranska kvittot till ${rad.inkorg.namn}`}
                    >
                      Förhandsgranska
                    </InertForhandsgranska>
                  )}
                  {lage.fel && (
                    <Button
                      intent="secondary"
                      emphasis="outline"
                      size="sm"
                      aria-label={`Skicka kvittot till ${rad.inkorg.namn} igen`}
                      onPress={modell.skickaKvitton}
                    >
                      Skicka igen
                    </Button>
                  )}
                  {lage.kanAngra && !angrarDenna && (
                    <Button
                      intent="ghost"
                      size="sm"
                      aria-label={`Ångra registreringen för ${rad.inkorg.namn}`}
                      onPress={() => setAngraNyckel(rad.nyckel)}
                    >
                      Ångra
                    </Button>
                  )}
                </span>
              </div>
              {angrarDenna && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-caption">Ångra registreringen? Inbetalningen raderas.</span>
                  <Button
                    intent="danger"
                    size="sm"
                    onPress={() => {
                      modell.angra(rad.nyckel);
                      setAngraNyckel(null);
                    }}
                  >
                    Ja, ångra
                  </Button>
                  <Button intent="ghost" size="sm" onPress={() => setAngraNyckel(null)}>
                    Behåll
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(vantande.length > 0 || utfall !== null) && (
        <div className="flex min-h-22 flex-col justify-center gap-2 sm:min-h-10">
          {vantande.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 self-start">
              <Button intent="success" onPress={modell.skickaKvitton}>
                {`Skicka ${vantande.length} ${vantande.length === 1 ? 'kvitto' : 'kvitton'}`}
              </Button>
              <InertForhandsgranska
                ariaLabel={`Förhandsgranska ${vantande.length} ${vantande.length === 1 ? 'kvitto' : 'kvitton'}`}
              >
                <ForhandsgranskaEtikett antal={vantande.length} />
              </InertForhandsgranska>
            </div>
          )}
          {utfall !== null && utfall.intent === 'warning' && (
            <MessageBox intent="warning" title={utfall.rubrik}>
              Utfallet per kvitto står på raderna ovan.
            </MessageBox>
          )}
          {utfall !== null && (
            <p
              role="status"
              aria-live="polite"
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
                      onPress={() => setBekraftelseSynlig(false)}
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
      {/* Prototypens hjälpvärde, för tydlighet vid granskningen. */}
      <span className="sr-only">
        {`${antalRegistreradeKvitton(rader)} kvitton hör till registreringen`}
      </span>
    </section>
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
 * Radens formulär = INKORGENS `RegistreraForm`, fält för fält i samma
 * ordning: Belopp i kronor · utfallsrutan · Betalsätt + Betalningsdatum ·
 * Notering · Skicka kvitto · knappraden. Klar/Avbryt i stället för
 * Registrera — allt registreras med knappen längst ner (öppet bokfört).
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
  // efter att Lotta slutat skriva, eller direkt när hon lämnar fältet.
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
              // `border-y border-r` sluter rutan hos konsumenten, som inkorgen.
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
 * Åtgärds-sidans `MarkerbartDeltagarKort`). Beloppet är ett SYSKON till
 * kryssrutan (en knapp i en `<label>` är ogiltig HTML). Avbryt återställer
 * radens värden till dem som gällde när kortet öppnades. En rad vars
 * registrering fallerat visar felet under huvudet (inkorgens
 * `registrera.isError`-rad) och står kvar markerad för omkörning.
 */
function MarkerbartKort({ rad, modell }: { rad: BekraftelseRad; modell: BekraftelsestegModell }) {
  const [oppen, setOppen] = useState(false);
  const [innan, setInnan] = useState<Radvarden | null>(null);
  const panelId = useId();
  const belopp = radbelopp(rad);
  const vald = rad.markerad;
  const fel = rad.utfall?.klass === 'fel' ? rad.utfall.text : null;

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
