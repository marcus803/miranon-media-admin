import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MessageBox } from '@/components/primitives';
// `SidRamKnapp` nås via modulen, inte via barrel-filen: `primitives/index.ts`
// exporterar bara `SidRam`. Samma importform som den andra konsumenten redan
// använder (`segment/prototyp/VariantD.tsx`).
import { SidRamKnapp } from '@/components/primitives/SidRam';
import { Skeleton } from '@/components/primitives/Skeleton';
import { useOppnaBetalningar } from '@/data/betalningar/useBetalningar';
import type { OppenBetalning } from '@/domain/schemas';
import { idagIso } from './idag';
import { type Importminne, lasImport } from './importminne';
import { rensaMarkering } from './markerings-minne';
import { VariantC } from './prototype/VariantC';
import { useBekraftelsesteg } from './useBekraftelsesteg';

/**
 * [TASK-402.3] BEKRÄFTELSESTEGET — den PROMOVERADE ytan.
 *
 * Formen är `VariantC` (facit-låst 2026-09-05, `ADR-102`), datavägarna är
 * inkorgens (`useBekraftelsesteg`). Denna fil är det tunna lagret mellan dem:
 * sidkromet, urvalet ur sök-parametern och de tre lägen som inte är formen
 * (hämtar, fel, tomt).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * URVALET KOMMER UR `ids`, INTE UR EN EGEN FRÅGA (PRD § Routen och matarna)
 * ═══════════════════════════════════════════════════════════════════════════
 * "Matarna lämnar över raderna som anmälnings-ID:n i sök-parametern `ids`;
 * steget hämtar de öppna betalningarna för dem via inkorgens befintliga
 * läsväg och bygger raderna." Läsvägen är `useOppnaBetalningar` — SAMMA
 * query-nyckel som inkorgen, Hem-kortet och Åtgärds-panelen redan delar, så
 * hoppet hit kostar noll extra nätverksanrop när cachen är varm.
 *
 * ORDNINGEN ÄR HÄMTNINGENS, inte `ids`-strängens. Ett `filter` över svaret
 * bevarar EF:ens egen sortering, vilket är det som gör att eventgrupperna
 * ligger i samma ordning som i inkorgen (Marcus varv 4/5: *"Lotta måste känna
 * igen sig"*). En sortering efter `ids` hade gjort ordningen till en
 * egenskap hos MATAREN — tre matare, tre ordningar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TILLBAKA-PILEN ÄR HISTORIK-TILLBAKA MED FALLBACK (skarv mot TASK-402.5)
 * ═══════════════════════════════════════════════════════════════════════════
 * PRD § Routen och matarna: "Tillbaka-pilen återvänder till mataren." Med tre
 * matare (inkorgens markera-läge, kontoutdraget, Åtgärds-sidan) kan målet inte
 * vara en literal. `useCanGoBack()` + `router.history.back()` går tillbaka dit
 * Lotta faktiskt kom ifrån; saknas historik (direktlänk, ny flik, delad URL)
 * faller den till inkorgen, som är stegets naturliga hem.
 *
 * FÖLJDEN FÖR `TASK-402.5`: Åtgärds-sidans matare behöver bara NAVIGERA hit
 * med sitt `ids` — den behöver inte skicka med ett retur-mål, och denna fil
 * behöver inte känna till att den finns.
 *
 * `SidRamKnapp` och inte `SidRam`: den senare är wrappad i `createLink` och
 * renderar ett `<a href>`, vilket kräver ett känt mål. Geometrin är delad
 * (`CHEVRON_KLASS`), så sidkromet är identiskt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SKARV MOT TASK-402.1: MARKERINGSMINNET RENSAS EFTER EN LYCKAD KÖRNING
 * ═══════════════════════════════════════════════════════════════════════════
 * Inkorgens markera-läge (`TASK-402.1`) bär ett sessionsbundet
 * markeringsminne som PRD:n säger ska rensas "vid registrering, Rensa och
 * navigation utanför betalningsfamiljen". Krokpunkten fanns HÄR, namngiven
 * och tom: `efterRegistrering` nedan.
 *
 * [TASK-402.1, 2026-09-06] SKARVEN ÄR SLUTEN och den höll: no-op:en byttes mot
 * `rensaMarkering()` från `markerings-minne.ts` och EN import. Körningen,
 * ögonblicksbilden och `useBekraftelsesteg` är orörda — diffen mot denna fil
 * är kroppen i `efterRegistrering` plus importraden, ingenting annat.
 */

/**
 * KROKPUNKTEN `TASK-402.1` FYLLER — NU FYLLD.
 *
 * Anropas EN gång när en körning gått från `registrerar` till `klart` och
 * minst en rad faktiskt registrerades. Den är avsiktligt en fri funktion och
 * inte en prop: markeringsminnet är ett SESSIONS-lokalt lager (samma klass som
 * `betalsatt-minne.ts`), inte något denna komponent ska ta emot uppifrån.
 *
 * [TASK-402.3 → TASK-402.1] Kroppen är utbytt mot `rensaMarkering()`, exakt
 * som skarven lovade: körningen, ögonblicksbilden och `useBekraftelsesteg` är
 * ORÖRDA. PRD § Markera-läget: minnet rensas "vid registrering, Rensa och
 * navigation utanför betalningsfamiljen" — detta är den första av de tre.
 *
 * VARFÖR "MINST EN RAD REGISTRERAD" ÄR RÄTT VILLKOR (och det står i
 * `StegMedKrok` nedan, inte här): en körning där ALLA rader fallerade lämnar
 * raderna kvar i listan med "Försök igen". Att rensa markeringen då hade tagit
 * ifrån Lotta urvalet i samma stund hon behöver det mest — tillbaka-pilen hade
 * lett till en inkorg utan markering trots att ingenting bokförts.
 */
function efterRegistrering(): void {
  rensaMarkering();
}

/** Tre rader räcker för att fylla listkortet visuellt (samma tal som
 *  `AnmalningarSida.tsx`/`EventCheckin.tsx`s skelettlistor) — bara den
 *  FÖRSTA radens geometri är mätt (AC #3), resten är utfyllnad. */
const SKELETT_RADER = ['a', 'b', 'c'] as const;

/**
 * [TASK-416.6, ADR-113 steg 4] LADDLÄGETS SKELETT — sidkromet renderat, den
 * nakna textraden ersatt med ett skelett i listkroppens SLUTGEOMETRI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR DENNA FIL DUPLICERAR STRUKTUR UR `VariantC.tsx` I STÄLLET FÖR ATT
 * ÅTERANVÄNDA DEN
 * ═══════════════════════════════════════════════════════════════════════════
 * `VariantC`/`BulkC` är FACIT-LÅST (promoverings-grinden,
 * `bekraftelsesteget-promoverings-grind.staging.test.ts`, ariaSnapshot
 * scopad till `data-testid="bekraftelsesteget"` — dess FÖRSTA rad är
 * `heading "Bulkregistrering"`). Rubriken lever alltså inuti den låsta
 * ytan och kan inte lyftas ut till ett delat `headerBlock` (AnmalningarSidas
 * mönster) utan att FLYTTA den ur snapshotens scope, vilket hade fällt
 * grinden. Vägen är i stället att SPEGLA klasserna hit, oberört av
 * `BulkC`: samma rot (`flex flex-col gap-6`), samma `<header
 * className="flex flex-col gap-1 px-4">`, samma `<h1
 * className="font-semibold text-3xl">Bulkregistrering</h1>` — så att
 * rubrikens `boundingBox()` blir IDENTISK i ladd- och laddat läge trots att
 * det är TVÅ olika DOM-noder som råkar rendera på samma plats (AC #3).
 *
 * PRD TASK-416s regel, ordagrant: "sidkromet — chevron, h1, sidhuvud,
 * filter-/sökrad, handlingsrad — renderas i ALLA query-tillstånd; bara
 * datakroppen växlar mellan skeleton och innehåll." Sidkromet HÄR är
 * `SidRamKnapp` (renderas redan ovillkorligt av `Bekraftelsesteget`) plus
 * denna rubrik.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR MELLANRUMMET MELLAN RUBRIK OCH FÖRSTA KORTET MÅSTE STÄMMA EXAKT
 * ═══════════════════════════════════════════════════════════════════════════
 * `EfterlagetsBlock` (`RegistreratNuBlock`) renderar `null` när ingenting är
 * registrerat än — modellens utgångsläge — så `BulkC`s FÖRSTA två
 * flex-barn under rubriken är i praktiken `header` och sektionen "Markerade
 * inbetalningar" (`flex flex-col gap-4 px-4`), separerade av rotens EGEN
 * `gap-6`. Skelettet härmar precis den kedjan (rot → header → sektion →
 * gruppwrapper → `<ul>` → `<li>`) utan ett extra lager, så avståndet ovanför
 * första kortet blir detsamma tal av samma skäl — inte en tillfällighet som
 * håller för just denna fixtur.
 *
 * Grupprubriken (`GruppRubrik`, en `<h2 className="font-semibold
 * text-lg">`) ersätts av ett `Skeleton`-block MED SAMMA `text-lg`-klass:
 * eventnamnet är okänt före hämtningen, men `text-lg` ensam räcker för att
 * blockets `1lh`-höjd matcha en riktig rubrikrad (`Skeleton.tsx`s egna
 * kontrakt — häromkring är det samma idiom `AnmalningarSida.tsx` redan
 * bevisat, `<Skeleton variant="text" className="w-40 text-small" />` bredvid
 * en riktig `text-small`-rad).
 *
 * KORTETS ANATOMI (`MarkerbartKort`/`KortHuvud`/beloppsknappen i
 * `VariantC.tsx`) speglas rad för rad: avatar-cirkeln (`size-9
 * shrink-0 rounded-full`), namnet (en textrad, `text-body`), beloppet
 * (`text-body`) och chevron-cirkeln. Chevronen är en INERT reserverad yta
 * utan shimmer — samma idiom som `EventCheckin.tsx`s kryssrute-reservation
 * (`size-11 shrink-0`, TASK-416.1) — den bär ingen data att vänta på, bara en
 * plats att inte hoppa till.
 *
 * Roselli-kontraktet (`Skeleton.tsx` filhuvud): blocken är `aria-hidden`
 * (dekorativa), och DENNA container äger `aria-busy` + det dolda
 * textbeskedet.
 */
function BekraftelsestegetSkelett() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Hämtar öppna betalningar …</span>
      <header className="flex flex-col gap-1 px-4">
        <h1 className="font-semibold text-3xl">Bulkregistrering</h1>
        <Skeleton variant="text" className="w-48 text-small" />
      </header>
      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="w-40 text-lg" />
          <ul className="-mx-4 flex flex-col gap-2 rounded-2xl border border-transparent bg-bg-muted p-2 contrast-more:border-border-strong">
            {SKELETT_RADER.map((k) => (
              <li
                key={k}
                className="rounded-2xl border border-transparent bg-surface p-3 contrast-more:border-border-strong"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                    <Skeleton variant="text" className="size-9 shrink-0 rounded-full" />
                    <Skeleton variant="text" className="w-2/5 text-body" />
                  </div>
                  <div className="inline-flex items-center gap-3 self-start sm:self-auto">
                    <Skeleton variant="text" className="w-16 text-body" />
                    <span aria-hidden="true" className="mr-1 size-9 shrink-0 rounded-full" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Bekraftelsesteget({ ids, kalla }: { ids?: string; kalla?: 'import' }) {
  const fraga = useOppnaBetalningar();
  const navigate = useNavigate();
  const router = useRouter();
  const kanGaTillbaka = useCanGoBack();
  const idag = idagIso();

  const valdaIds = useMemo(
    () =>
      ids
        ? ids
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [ids],
  );

  /**
   * [TASK-402.4] IMPORTMINNET LÄSES EN GÅNG, VID MONTERINGEN.
   *
   * `useState`-initieraren och inte `useMemo`: en `useMemo` är en
   * OPTIMERING som React uttryckligen får kasta och räkna om, och en
   * omräkning här hade läst `sessionStorage` på nytt mitt i sessionen — efter
   * att en annan flik hunnit skriva en ny import. Raderna Lotta ser ska vara
   * de hon kom hit med. Ett nytt minne kräver en ny navigering, alltså en ny
   * montering, vilket är exakt vad importen gör.
   */
  const [minne] = useState(() => (kalla === 'import' ? lasImport() : null));

  const oppna = useMemo<OppenBetalning[]>(() => {
    const alla = fraga.data?.betalningar ?? [];
    // IMPORTEN FÅR HELA MÄNGDEN. En omatchad rads sökfält söker i samma rymd
    // som inkorgens sökning gör (`rankaTraffar` över alla öppna), och en
    // kandidat måste gå att slå upp oavsett urval. Den manuella mataren får
    // sitt urval, oförändrat sedan TASK-402.3.
    if (kalla === 'import') return alla;
    if (valdaIds.length === 0) return [];
    const valda = new Set(valdaIds);
    return alla.filter((b) => valda.has(b.anmalanRecordId));
  }, [fraga.data, kalla, valdaIds]);

  const tillbaka = () => {
    if (kanGaTillbaka) {
      router.history.back();
      return;
    }
    void navigate({ to: '/mer/betalningar' });
  };

  return (
    <section className="flex flex-col gap-4">
      <SidRamKnapp tillbakaEtikett="Tillbaka" onTillbaka={tillbaka} />
      {fraga.isLoading ? (
        <BekraftelsestegetSkelett />
      ) : fraga.isError ? (
        <div className="px-4">
          <MessageBox intent="warning" title="Betalningarna kunde inte hämtas">
            {fraga.error instanceof Error ? fraga.error.message : 'Okänt fel'}
          </MessageBox>
        </div>
      ) : kalla === 'import' ? (
        /* [TASK-402.4] IMPORTVÄGEN HAR SITT EGET TOMLÄGE, och det säger något
           ANNAT än den manuella vägens. Kommer hon hit med `kalla=import` men
           utan minne har överlämningen gått förlorad (fliken stängdes,
           `sessionStorage` blockerad, adressen delad till en annan
           webbläsare) — och rätt handling är att läsa in filen igen, inte att
           markera rader. Att visa den manuella textens "markera raderna i
           betalningsinkorgen" hade skickat henne åt fel håll.

           NOLL RADER I MINNET ÄR INTE TOMT. En import där varje bankrad är en
           dubblett har noll registrerbara rader men allt att visa, så
           mängdvillkoret läser MINNET och inte de öppna betalningarna. */
        minne === null ? (
          <p className="px-4 py-8 text-body text-text-secondary">
            Importen kunde inte läsas. Öppna Importera kontoutdrag i betalningsinkorgen och välj
            filen igen.
          </p>
        ) : (
          <StegMedKrok oppna={oppna} idag={idag} minne={minne} />
        )
      ) : oppna.length === 0 ? (
        /* TOMLÄGET — INGEN FACIT-BILD FINNS, och det är bokfört som amendering
           i facit-katalogen i stället för att göras tyst. Två vägar hit, EN
           text: ingen `ids` alls (någon öppnade adressen för hand) eller ett
           urval som inte längre är öppet (raderna hann registreras i en annan
           flik). Båda betyder samma sak för Lotta — det finns inget att
           bekräfta — och en text som gissade vilken av dem det var hade kunnat
           ha fel. */
        <p className="px-4 py-8 text-body text-text-secondary">
          Inga inbetalningar att bekräfta. Markera raderna i betalningsinkorgen och tryck
          Registrera.
        </p>
      ) : (
        <StegMedKrok oppna={oppna} idag={idag} minne={null} />
      )}
    </section>
  );
}

/**
 * Formen plus krokpunkten. Egen komponent enbart för att `useEffect`-anropet
 * ska monteras med formen — inte köra i lägena "hämtar"/"fel"/"tomt", där
 * ingen körning kan ha skett.
 *
 * [TASK-402.4] MODELLEN BYGGS HÄR, INTE I FÖRÄLDERN — och det är en rättelse,
 * inte en omflyttning. Hooken låg tidigare i `Bekraftelsesteget` och kördes
 * därmed också medan hämtningen pågick, alltså med en TOM mängd öppna
 * betalningar; raderna byggdes om först när svaret kom, via
 * ombyggnads-signaturen. För den manuella mataren var det osynligt (samma
 * rader byggdes två gånger), men importens klassning läser mängden och hade
 * stämplat varje rad `omatchad` i det första varvet. Att montera formen —
 * och därmed hooken — först när datat finns tar bort hela tillståndet i
 * stället för att kompensera för det.
 */
function StegMedKrok({
  oppna,
  idag,
  minne,
}: {
  oppna: readonly OppenBetalning[];
  idag: string;
  minne: Importminne | null;
}) {
  const modell = useBekraftelsesteg(oppna, idag, minne);
  return <FormenMedKrok modell={modell} />;
}

function FormenMedKrok({ modell }: { modell: ReturnType<typeof useBekraftelsesteg> }) {
  const harRegistrerat = modell.rader.some((r) => r.utfall?.klass === 'registrerad');
  const klart = modell.fas === 'klart';
  // `useEffect` och INTE `useMemo`: kroken är en SIDOEFFEKT, och React kör
  // memo-funktioner om utan att beroenden ändrats (dokumenterat beteende, och
  // dubbelt i StrictMode). Beroendelistan gör att den fyrar en gång per
  // övergång till "klart med minst en registrerad rad".
  useEffect(() => {
    if (klart && harRegistrerat) efterRegistrering();
  }, [klart, harRegistrerat]);
  return <VariantC modell={modell} />;
}
