/**
 * [TASK-402.1, PRD TASK-402 § Markera-läget i inkorgen] Markeringsminnet —
 * inkorgens urval av rader som ska registreras i bekräftelsesteget.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR ETT MINNE OCH INTE BARA `useState`
 * ═══════════════════════════════════════════════════════════════════════════
 * PRD § Markera-läget: markeringen "bor i ett sessionsbundet markeringsminne
 * (samma klass som inkorgens betalsätts-minne) så den överlever hoppet till
 * steget och tillbaka". Hoppet till `/mer/betalningar/registrera` UNMOUNTAR
 * inkorgen — det är en egen route, un-nestad med avsikt (PRD berättelse 5) —
 * så ett rent komponent-state hade dött vid navigeringen och gjort
 * tillbaka-pilen (berättelse 6, AC #4) till ett omtag i stället för en retur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `sessionStorage`, INTE `localStorage` — SKILLNADEN MOT BETALSÄTTS-MINNET
 * ═══════════════════════════════════════════════════════════════════════════
 * `betalsatt-minne.ts` är samma KLASS av modul (rena funktioner över ett
 * webblagrings-API, kastar aldrig) men bär en annan LIVSLÄNGD med avsikt:
 * betalsättet är en preferens som ska överleva i veckor, markeringen är ett
 * pågående arbetsmoment. En markering som kom tillbaka efter en omstart nästa
 * lördag vore ett spöke — Lotta skulle mötas av "Registrera 6" utan att veta
 * vilka sex. `sessionStorage` dör med fliken och är därför den ärliga
 * livslängden för "det jag håller på med just nu".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REGLERNA ÄR RENA FUNKTIONER, LAGRET ÄR TUNT (AC #6)
 * ═══════════════════════════════════════════════════════════════════════════
 * Allt som HAR en regel — vad som får ligga kvar i minnet, vad "alla synliga"
 * betyder, vilka sökvägar som är betalningsfamiljen — är rena funktioner över
 * indata → utdata, testade i `tests/api/markerings-minne.test.ts` utan
 * webbläsare. Bara de tre nedersta funktionerna rör `sessionStorage`, och de
 * gör ingenting annat än att koda/avkoda med reglerna ovan.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KASTAR ALDRIG
 * ═══════════════════════════════════════════════════════════════════════════
 * Samma kontrakt som `betalsatt-minne.ts`: `sessionStorage` kan kasta redan
 * vid ÅTKOMST i privat läge och i webbläsare som blockerar lagring. Faller
 * läsningen börjar Lotta med tom markering, faller skrivningen tappas minnet
 * över route-bytet — aldrig en inbetalning. Markeringen är ett urval, inte
 * data.
 */

const MARKERING_NYCKEL = 'mm.betalningar.markering';

/** Avdelaren i lagringssträngen. Anmälnings-record-ID:n (`recXXXXXXXXXXXXXX`)
    kan aldrig innehålla ett komma, samma antagande routens `ids`-parameter
    redan vilar på (`betalningar_.registrera.tsx` § `ids`). */
const AVDELARE = ',';

/* ═══════════════════════════ REGLERNA (RENA) ═══════════════════════════ */

/**
 * Tillhör sökvägen betalningsfamiljen?
 *
 * PRD § Markera-läget: markeringen rensas "vid navigation utanför
 * betalningsfamiljen". Familjen är inkorgen och dess undersidor — i dag
 * inkorgen själv (`/mer/betalningar`) och bekräftelsesteget
 * (`/mer/betalningar/registrera`, un-nestad route men samma familj för Lotta).
 *
 * PREFIXET MÅSTE BÄRA SITT SNEDSTRECK. `startsWith('/mer/betalningar')` ensamt
 * hade sagt ja till en framtida `/mer/betalningarXYZ` — en syskonroute, inte
 * ett barn. Därför exakt likhet ELLER prefix med avdelare.
 *
 * Trailing slash godtas (`/mer/betalningar/`): den är samma sida för routern
 * och ska inte kosta Lotta hennes urval.
 */
export function arBetalningsfamiljen(pathname: string): boolean {
  const utanSlutSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return utanSlutSlash === '/mer/betalningar' || utanSlutSlash.startsWith('/mer/betalningar/');
}

/**
 * Avkodar lagringssträngen. TOLERANT MED AVSIKT: en tom sträng, en trasig
 * post från en äldre version, eller ett `null` från en tom lagring ska ge ett
 * tomt urval — aldrig ett kastat fel som skulle ta ner inkorgen vid
 * sidladdning. Tomma segment och blanksteg skalas bort, dubbletter faller
 * (`Set`), ordningen bevaras.
 */
export function avkodaMarkering(ratt: string | null | undefined): string[] {
  if (!ratt) return [];
  const rensat = ratt
    .split(AVDELARE)
    .map((s) => s.trim())
    .filter((s) => s !== '');
  return [...new Set(rensat)];
}

/** Kodar urvalet till lagringssträngen. Invers till `avkodaMarkering` för
    varje indata den funktionen kan producera. */
export function kodaMarkering(ids: Iterable<string>): string {
  return [...new Set(ids)].join(AVDELARE);
}

/**
 * Skär bort ID:n som inte längre är markerbara.
 *
 * VARFÖR DEN BEHÖVS: en markerad rad kan sluta vara markerbar mellan två
 * hämtningar — den registrerades i en annan flik, eller blev KLAR av en
 * registrering här (AC #3: klara rader kan inte markeras). Ett urval som
 * pekade på en sådan rad hade räknat fel i "Registrera N" och skickat ett
 * spök-ID vidare till steget, som då tyst hade visat färre rader än knappen
 * lovade. Samma sanering, samma skäl, som `Deltagare.tsx`
 * § `useMarkeringsLage`.
 *
 * VARFÖR DEN INTE FÅR KÖRAS MOT FILTRERADE RADER: kandidatmängden är ALLA
 * öppna rader, aldrig de synliga. Markeringen ska överleva sök och filter
 * (AC #2) — saneras den mot vyn försvinner precis de rader Lotta plockat från
 * ett annat event.
 *
 * TOM KANDIDATMÄNGD GER TOMT URVAL, och det är anroparens ansvar att inte
 * anropa funktionen innan hämtningen svarat: "inga öppna betalningar" och
 * "vet inte än" ser likadana ut här, och funktionen får inte gissa.
 */
export function saneraMarkering(
  valda: Iterable<string>,
  markerbaraIds: Iterable<string>,
): string[] {
  const kvar = new Set(markerbaraIds);
  return [...new Set(valda)].filter((id) => kvar.has(id));
}

/** Bockar i eller ur EN rad. Ren över `ReadonlySet` så anroparen aldrig
    muterar sitt eget state. */
export function vaxlaMarkering(
  valda: ReadonlySet<string>,
  id: string,
  vald: boolean,
): ReadonlySet<string> {
  if (vald === valda.has(id)) return valda;
  const nasta = new Set(valda);
  if (vald) nasta.add(id);
  else nasta.delete(id);
  return nasta;
}

/**
 * "Markera alla synliga" — UNION, inte ersättning.
 *
 * SKILLNADEN MOT EVENTDETALJEN ÄR HELA SKÄLET TILL ETIKETTEN. Där heter
 * knappen "Markera alla" och sätter urvalet till kandidatmängden rakt av
 * (`setValda(new Set(kandidatIds))`), eftersom eventsidans register visar EN
 * mängd. Inkorgen har sök och filter, så "alla" är tvetydigt: en ersättning
 * hade RADERAT de rader Lotta plockat från ett annat event så fort hon
 * filtrerade om och tryckte igen — raka motsatsen till AC #2:s löfte. Unionen
 * lägger till de synliga och rör inte resten (S121 Del 2 beslut 6: etiketten
 * är "Markera alla synliga" just därför).
 */
export function markeraAllaSynliga(
  valda: ReadonlySet<string>,
  synligaIds: Iterable<string>,
): ReadonlySet<string> {
  const nasta = new Set(valda);
  let andrat = false;
  for (const id of synligaIds) {
    if (!nasta.has(id)) {
      nasta.add(id);
      andrat = true;
    }
  }
  return andrat ? nasta : valda;
}

/**
 * Är varje synlig rad redan markerad? Styr `isDisabled` på "Markera alla
 * synliga" (eventdetaljens `allaValda`-form).
 *
 * NOLL SYNLIGA GER `true` — knappen ska vara död när det inte finns något att
 * markera. Ett `false` här hade gett en tryckbar knapp som inte gör någonting,
 * vilket är precis den döda kontroll `FilterRad`s egen degradering finns för
 * att undvika.
 */
export function allaSynligaMarkerade(
  valda: ReadonlySet<string>,
  synligaIds: readonly string[],
): boolean {
  return synligaIds.every((id) => valda.has(id));
}

/* ═══════════════════════ LAGRET (RÖR `sessionStorage`) ═══════════════════════ */

/** Läser urvalet. Kastar aldrig — se filhuvudet. */
export function lasMarkering(): string[] {
  try {
    return avkodaMarkering(window.sessionStorage.getItem(MARKERING_NYCKEL));
  } catch {
    // Privat läge, blockerad lagring, eller en webbläsare som kastar på
    // access. Tomt urval duger; markeringen är ett arbetsmoment, inte data.
    return [];
  }
}

/** Skriver urvalet. Ett TOMT urval tar bort nyckeln i stället för att lagra
    en tom sträng — så att `sessionStorage` aldrig bär en post som betyder
    ingenting. Kastar aldrig. */
export function sparaMarkering(ids: Iterable<string>): void {
  try {
    const kodat = kodaMarkering(ids);
    if (kodat === '') window.sessionStorage.removeItem(MARKERING_NYCKEL);
    else window.sessionStorage.setItem(MARKERING_NYCKEL, kodat);
  } catch {
    // Se ovan.
  }
}

/**
 * Rensar minnet. Krokpunkten `Bekraftelsesteget.tsx` § `efterRegistrering`
 * anropar (PRD: markeringen rensas "vid registrering"), och inkorgens egen
 * navigations-vakt anropar den när Lotta lämnar betalningsfamiljen.
 * Kastar aldrig.
 */
export function rensaMarkering(): void {
  try {
    window.sessionStorage.removeItem(MARKERING_NYCKEL);
  } catch {
    // Se ovan.
  }
}
