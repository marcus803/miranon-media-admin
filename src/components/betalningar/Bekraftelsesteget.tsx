import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { MessageBox } from '@/components/primitives';
// `SidRamKnapp` nås via modulen, inte via barrel-filen: `primitives/index.ts`
// exporterar bara `SidRam`. Samma importform som den andra konsumenten redan
// använder (`segment/prototyp/VariantD.tsx`).
import { SidRamKnapp } from '@/components/primitives/SidRam';
import { useOppnaBetalningar } from '@/data/betalningar/useBetalningar';
import type { OppenBetalning } from '@/domain/schemas';
import { idagIso } from './idag';
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

export function Bekraftelsesteget({ ids }: { ids?: string }) {
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

  const oppna = useMemo<OppenBetalning[]>(() => {
    if (valdaIds.length === 0) return [];
    const valda = new Set(valdaIds);
    return (fraga.data?.betalningar ?? []).filter((b) => valda.has(b.anmalanRecordId));
  }, [fraga.data, valdaIds]);

  const modell = useBekraftelsesteg(oppna, idag);

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
        <p className="px-4 py-8 text-body text-text-secondary">Hämtar öppna betalningar …</p>
      ) : fraga.isError ? (
        <div className="px-4">
          <MessageBox intent="warning" title="Betalningarna kunde inte hämtas">
            {fraga.error instanceof Error ? fraga.error.message : 'Okänt fel'}
          </MessageBox>
        </div>
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
        <StegMedKrok modell={modell} />
      )}
    </section>
  );
}

/**
 * Formen plus krokpunkten. Egen komponent enbart för att `useEffect`-anropet
 * ska monteras med formen — inte köra i lägena "hämtar"/"fel"/"tomt", där
 * ingen körning kan ha skett.
 */
function StegMedKrok({ modell }: { modell: ReturnType<typeof useBekraftelsesteg> }) {
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
