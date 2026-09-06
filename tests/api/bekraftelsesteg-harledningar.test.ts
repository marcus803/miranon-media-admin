import { expect, test } from '@playwright/test';
import {
  antalRegistreradeKvitton,
  antalSattAlla,
  arRegistrerbar,
  avstamning,
  type BekraftelseRad,
  baraOmkorning,
  berorsAvSattAlla,
  blockrader,
  byggRader,
  grupperaRader,
  omkorningsUrval,
  radbelopp,
  saknarBelopp,
  sattAllaBelopp,
  summera,
  vantandeKvitton,
} from '../../src/components/betalningar/bekraftelsesteg-harledningar';
import type { OppenBetalning } from '../../src/domain/schemas';

/**
 * [TASK-402.3 AC #11, PRD TASK-402 § Testbeslut punkt 1] Bekräftelsestegets
 * RENA härledningar — avstämningen, summeringen, grupperingen, "vad kan
 * registreras nu" och omkörnings-urvalet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR api-pure OCH INTE EN KOMPONENTSVIT
 * ═══════════════════════════════════════════════════════════════════════════
 * `bekraftelsesteg-harledningar.ts` importerar INGEN React och rör inget
 * nätverk — den är indata → utdata hela vägen (dess eget filhuvud § INGEN
 * REACT HÄR). Repot har dessutom ingen komponent-renderingsrigg (`package.json`
 * bär bara Playwright), så en komponentsvit vore inte bara onödig utan
 * omöjlig; formen och de skarpa vägarna prövas i stället i
 * `tests/e2e/bekraftelsesteget.staging.test.ts` och promoverings-grinden.
 *
 * PRD:ns egen formulering styr vad ett bra test här gör: "Ett bra test här
 * prövar en rad-uppsättning och läser resultatet, aldrig interna hjälpare."
 * Varje fall nedan bygger därför sina rader med `byggRader` — samma funktion
 * ytan använder — och läser en publik härledning.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEGATIVA KONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * De troliga felen, inte halmgubbar:
 *   - omkörningen tar med rader som ALDRIG prövats (`filter(arRegistrerbar)`
 *     i stället för `omkorningsUrval`) — mätbart olika så fort Lotta markerar
 *     en ny rad efter en fallerad körning
 *   - `baraOmkorning` sant när INGEN rad är registrerbar (tom mängd)
 *   - summan räknad ur ALLA rader i stället för de registrerbara
 *   - avstämningens klass läst ur beloppets STORLEK i stället för ur radens
 *     egna kandidater
 */

/** Fixturens delade fält — bara det som skiljer sätts per rad. */
function betalning(
  over: Partial<OppenBetalning> &
    Pick<OppenBetalning, 'anmalanRecordId' | 'personNamn' | 'gallandePris' | 'summaInbetalt'>,
): OppenBetalning {
  const saknas = over.gallandePris === null ? null : over.gallandePris - over.summaInbetalt;
  return {
    personEpost: null,
    personTelefon: null,
    eventId: null,
    eventNamn: null,
    eventStartdatum: null,
    eventTyp: 'Kurs',
    anmalanStatus: 'Bekräftad',
    anmalningsavgift: null,
    summaInbetaltSpegel: over.summaInbetalt,
    spegelIFas: true,
    deadlineSlutbetalning: null,
    kvittonAttSkicka: 0,
    saknas,
    ...over,
  };
}

const RIM = {
  eventId: 'rec-event-rim1',
  eventNamn: 'Resor i medvetandet 1, Skövde',
  eventStartdatum: '2026-09-20',
  gallandePris: 2500,
  anmalningsavgift: 1000,
} as const;

const FJARR = {
  eventId: 'rec-event-fjarr',
  eventNamn: 'Fjärrskådning, Göteborg',
  eventStartdatum: '2026-09-27',
  gallandePris: 3500,
  anmalningsavgift: 1000,
} as const;

const IDAG = '2026-09-04';

/**
 * "Lottas morgon" i miniatyr: TVÅ som redan betalat avgiften (slutbetalningar
 * à 1 500) och TVÅ nya (anmälningsavgifter à 1 000), fördelade över två event.
 * Samma anatomi som facit-fixturen, kort nog att räkna för hand.
 */
function morgonen(): BekraftelseRad[] {
  return byggRader(
    [
      betalning({ ...RIM, anmalanRecordId: 'rec-a', personNamn: 'Anna', summaInbetalt: 1000 }),
      betalning({ ...RIM, anmalanRecordId: 'rec-b', personNamn: 'Björn', summaInbetalt: 1000 }),
      betalning({ ...RIM, anmalanRecordId: 'rec-c', personNamn: 'Cecilia', summaInbetalt: 0 }),
      betalning({ ...FJARR, anmalanRecordId: 'rec-d', personNamn: 'David', summaInbetalt: 0 }),
    ],
    IDAG,
    'Swish',
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   § BYGGRADER — förvalet per rad
   ═══════════════════════════════════════════════════════════════════════════ */

test('byggRader förvalar avgiften för en ny anmälan och resten för den som betalat den', () => {
  const rader = morgonen();
  // Anna/Björn har betalat avgiften 1 000 av priset 2 500 ⇒ resten, 1 500.
  expect(radbelopp(rader[0])).toBe(1500);
  expect(radbelopp(rader[1])).toBe(1500);
  // Cecilia/David har inte betalat något ⇒ avgiften.
  expect(radbelopp(rader[2])).toBe(1000);
  expect(radbelopp(rader[3])).toBe(1000);
  // Alla kommer MARKERADE från mataren, med kvitto i.
  expect(rader.every((r) => r.markerad && r.medKvitto)).toBe(true);
});

test('byggRader lämnar beloppet TOMT när priset saknas i basen', () => {
  const rader = byggRader(
    [
      betalning({
        anmalanRecordId: 'rec-utan-pris',
        personNamn: 'Utan Pris',
        gallandePris: null,
        summaInbetalt: 0,
      }),
    ],
    IDAG,
    'Swish',
  );
  expect(rader[0].belopp).toBe('');
  expect(radbelopp(rader[0])).toBeNull();
  // NEGATIV KONTROLL: en rad utan belopp får aldrig registreras.
  expect(arRegistrerbar(rader[0])).toBe(false);
});

/* ═══════════════════════════════════════════════════════════════════════════
   § AVSTÄMNINGEN — Lottas klumpar
   ═══════════════════════════════════════════════════════════════════════════ */

test('avstamning grupperar i beloppsklasser med antal och summa', () => {
  const poster = avstamning(morgonen());
  // `resten` OCH INTE `allt` för Anna/Björn: knappens etikett är "resten" när
  // raden redan betalat något (`harledBeloppsknappar`), och facit kallar dem
  // "slutbetalningar". Testet skrevs först med `allt` och rättades mot koden,
  // inte tvärtom — manifestets avstämning ("6 anmälningsavgifter" /
  // "4 slutbetalningar") avgör.
  expect(poster).toEqual([
    { klass: 'avgift', antal: 2, summa: 2000 },
    { klass: 'resten', antal: 2, summa: 3000 },
  ]);
});

test('avstamning läser klassen ur radens EGNA kandidater, inte ur beloppets storlek', () => {
  // NEGATIV KONTROLL mot en trolig genväg: "1 000 kr = avgift". Här är
  // 1 000 kr HELA resten för en rad vars pris är 1 000 — alltså `allt`, inte
  // `avgift`, trots identiskt tal.
  const rader = byggRader(
    [
      betalning({
        anmalanRecordId: 'rec-billig',
        personNamn: 'Billig Kurs',
        gallandePris: 1000,
        anmalningsavgift: 1000,
        summaInbetalt: 0,
      }),
    ],
    IDAG,
    'Swish',
  );
  expect(radbelopp(rader[0])).toBe(1000);
  expect(avstamning(rader)).toEqual([{ klass: 'allt', antal: 1, summa: 1000 }]);
});

test('avstamning räknar en rad utan belopp som "saknas" med summa noll', () => {
  const rader = morgonen();
  rader[0] = { ...rader[0], belopp: '' };
  const saknas = avstamning(rader).find((p) => p.klass === 'saknas');
  expect(saknas).toEqual({ klass: 'saknas', antal: 1, summa: 0 });
});

/* ═══════════════════════════════════════════════════════════════════════════
   § SUMMERINGEN
   ═══════════════════════════════════════════════════════════════════════════ */

test('summera räknar bara de REGISTRERBARA raderna', () => {
  const rader = morgonen();
  expect(summera(rader).antal).toBe(4);
  expect(summera(rader).summa).toBe(5000);
  expect(summera(rader).antalKvitton).toBe(4);
});

test('summera utesluter avmarkerade och redan registrerade rader', () => {
  const rader = morgonen();
  rader[0] = { ...rader[0], markerad: false };
  rader[1] = { ...rader[1], utfall: { klass: 'registrerad', text: 'Registrerad' } };
  const s = summera(rader);
  // NEGATIV KONTROLL: en summering över ALLA rader hade gett 5 000 här.
  expect(s.antal).toBe(2);
  expect(s.summa).toBe(2000);
});

test('summera delar upp per betalsätt och per event', () => {
  const rader = morgonen();
  rader[3] = { ...rader[3], betalsatt: 'Bankgiro' };
  const s = summera(rader);
  expect(s.perBetalsatt).toEqual([
    { betalsatt: 'Swish', summa: 4000, antal: 3 },
    { betalsatt: 'Bankgiro', summa: 1000, antal: 1 },
  ]);
  expect(s.perEvent).toEqual([
    { eventNamn: 'Resor i medvetandet 1, Skövde', summa: 4000, antal: 3 },
    { eventNamn: 'Fjärrskådning, Göteborg', summa: 1000, antal: 1 },
  ]);
});

/* ═══════════════════════════════════════════════════════════════════════════
   § GRUPPERINGEN
   ═══════════════════════════════════════════════════════════════════════════ */

test('grupperaRader behåller hämtningens ordning, en grupp per event', () => {
  const grupper = grupperaRader(morgonen());
  expect(grupper.map((g) => g.eventNamn)).toEqual([
    'Resor i medvetandet 1, Skövde',
    'Fjärrskådning, Göteborg',
  ]);
  expect(grupper[0].rader.map((r) => r.inkorg.namn)).toEqual(['Anna', 'Björn', 'Cecilia']);
  expect(grupper[0].eventStartdatum).toBe('2026-09-20');
});

test('grupperaRader samlar rader utan event under EN grupp', () => {
  const rader = byggRader(
    [
      betalning({
        anmalanRecordId: 'rec-1',
        personNamn: 'En',
        gallandePris: 500,
        summaInbetalt: 0,
      }),
      betalning({
        anmalanRecordId: 'rec-2',
        personNamn: 'Två',
        gallandePris: 500,
        summaInbetalt: 0,
      }),
    ],
    IDAG,
    'Swish',
  );
  const grupper = grupperaRader(rader);
  expect(grupper).toHaveLength(1);
  expect(grupper[0].eventNamn).toBe('Utan event');
});

/* ═══════════════════════════════════════════════════════════════════════════
   § VAD KAN REGISTRERAS NU
   ═══════════════════════════════════════════════════════════════════════════ */

test('arRegistrerbar kräver markerad, giltigt belopp och att raden inte redan registrerats', () => {
  const [rad] = morgonen();
  expect(arRegistrerbar(rad)).toBe(true);
  expect(arRegistrerbar({ ...rad, markerad: false })).toBe(false);
  expect(arRegistrerbar({ ...rad, belopp: '' })).toBe(false);
  expect(arRegistrerbar({ ...rad, belopp: '0' })).toBe(false);
  expect(arRegistrerbar({ ...rad, utfall: { klass: 'registrerad', text: 'Registrerad' } })).toBe(
    false,
  );
});

test('en FALLERAD rad är fortfarande registrerbar — omkörningen är att registrera igen', () => {
  const [rad] = morgonen();
  expect(arRegistrerbar({ ...rad, utfall: { klass: 'fel', text: 'nekad' } })).toBe(true);
});

/* ═══════════════════════════════════════════════════════════════════════════
   § OMKÖRNINGS-URVALET (AC #6)
   ═══════════════════════════════════════════════════════════════════════════ */

test('omkorningsUrval tar BARA de rader som fallerat, aldrig de oprövade', () => {
  const rader = morgonen();
  // Anna och Björn registrerades, Cecilia fallerade, David markerades EFTER
  // körningen och har aldrig prövats.
  rader[0] = { ...rader[0], utfall: { klass: 'registrerad', text: 'Registrerad' } };
  rader[1] = { ...rader[1], utfall: { klass: 'registrerad', text: 'Registrerad' } };
  rader[2] = { ...rader[2], utfall: { klass: 'fel', text: 'nekad' } };

  expect(omkorningsUrval(rader).map((r) => r.inkorg.namn)).toEqual(['Cecilia']);
  // NEGATIV KONTROLL: den troliga genvägen tar med David också.
  expect(rader.filter(arRegistrerbar).map((r) => r.inkorg.namn)).toEqual(['Cecilia', 'David']);
});

test('baraOmkorning är sant först när ALLT registrerbart har fallerat en gång', () => {
  const rader = morgonen();
  expect(baraOmkorning(rader)).toBe(false);

  const alltFallerat = rader.map((r) => ({
    ...r,
    utfall: { klass: 'fel' as const, text: 'nekad' },
  }));
  expect(baraOmkorning(alltFallerat)).toBe(true);

  // En oprövad rad bland de fallerade ⇒ knappen heter "Registrera N", inte
  // "Försök igen".
  const blandat: BekraftelseRad[] = [...alltFallerat];
  blandat[3] = { ...blandat[3], utfall: null };
  expect(baraOmkorning(blandat)).toBe(false);
});

test('baraOmkorning är FALSKT för en tom mängd — knappen ska inte heta "Försök igen" utan rader', () => {
  // NEGATIV KONTROLL: `every` på en tom array är sant, så en implementation
  // utan längd-villkoret hade gett "Försök igen" på en sida där allt redan
  // registrerats.
  const allaKlara = morgonen().map((r) => ({
    ...r,
    utfall: { klass: 'registrerad' as const, text: 'Registrerad' },
  }));
  expect(allaKlara.filter(arRegistrerbar)).toHaveLength(0);
  expect(baraOmkorning(allaKlara)).toBe(false);
});

/* ═══════════════════════════════════════════════════════════════════════════
   § BRON TILL "REGISTRERAT NU"-BLOCKET
   ═══════════════════════════════════════════════════════════════════════════ */

test('blockrader lyfter bara REGISTRERADE rader, och bär radnyckeln för Ångra', () => {
  const rader = morgonen();
  rader[0] = {
    ...rader[0],
    utfall: { klass: 'registrerad', text: 'Registrerad' },
    inbetalningId: 'uuid-a',
    kvitto: 'vantar',
  };
  rader[1] = { ...rader[1], utfall: { klass: 'fel', text: 'nekad' } };

  const poster = blockrader(rader);
  expect(poster).toEqual([
    {
      inbetalningId: 'uuid-a',
      namn: 'Anna',
      belopp: 1500,
      betalsatt: 'Swish',
      medKvitto: true,
      radNyckel: 'rec-a',
    },
  ]);
});

test('blockrader hoppar över en registrerad rad som saknar inbetalningsId', () => {
  // Kan inte inträffa i den skarpa vägen (id:t kommer ur serverns svar), men
  // typen tillåter det — och en post utan id hade gjort Ångra och kvittokön
  // omöjliga att koppla till rätt rad.
  const rader = morgonen();
  rader[0] = { ...rader[0], utfall: { klass: 'registrerad', text: 'Registrerad' } };
  expect(blockrader(rader)).toHaveLength(0);
});

test('vantandeKvitton bär bara de rader som ligger i den session-lokala kön', () => {
  const rader = morgonen();
  rader[0] = { ...rader[0], inbetalningId: 'uuid-a', kvitto: 'vantar' };
  rader[1] = { ...rader[1], inbetalningId: 'uuid-b', kvitto: 'koad' };
  rader[2] = { ...rader[2], inbetalningId: 'uuid-c', kvitto: 'ingen' };

  expect(vantandeKvitton(rader)).toEqual([{ inbetalningId: 'uuid-a', namn: 'Anna', belopp: 1500 }]);
});

test('antalRegistreradeKvitton räknar registrerade rader med kvitto-kryss', () => {
  const rader = morgonen();
  rader[0] = {
    ...rader[0],
    utfall: { klass: 'registrerad', text: 'Registrerad' },
    medKvitto: true,
  };
  rader[1] = {
    ...rader[1],
    utfall: { klass: 'registrerad', text: 'Registrerad' },
    medKvitto: false,
  };
  rader[2] = { ...rader[2], utfall: { klass: 'fel', text: 'nekad' }, medKvitto: true };
  rader[3] = {
    ...rader[3],
    utfall: { klass: 'registrerad', text: 'Registrerad' },
    medKvitto: true,
  };

  // Anna och David: registrerade OCH med kvitto-kryss.
  expect(antalRegistreradeKvitton(rader)).toBe(2);

  // NEGATIV KONTROLL, och skälet till att funktionen alls finns:
  // `summera().antalKvitton` räknar det MOTSATTA urvalet — de rader som ännu
  // KAN registreras — alltså här bara Cecilia, den fallerade. Läste
  // "Skicka N kvitton" det talet efter en körning hade den erbjudit ETT kvitto
  // där TVÅ väntar.
  expect(summera(rader).antalKvitton).toBe(1);
});

/* ═══════════════════════════════════════════════════════════════════════════
   § SÄTT ALLA BELOPP (TASK-402.8) — knapparnas regel, kant för kant
   ═══════════════════════════════════════════════════════════════════════════

   Regeln har fyra kanter (`berorsAvSattAlla`), och tre av dem är sådana en
   implementation lätt får fel åt SAMMA håll: den rör en rad som inte skulle
   röras. Fallen nedan prövar därför alltid BÅDE att rätt rader ändrades och
   att fel rader står kvar oförändrade. */

test('sattAllaBelopp sätter varje markerad rads EGEN kandidat, inte ett delat belopp', () => {
  const rader = morgonen();
  // Anna/Björn har betalat avgiften (kandidat `allt` = resten, 1 500);
  // Cecilia/David har inte betalat något (kandidat `allt` = hela priset).
  const efter = sattAllaBelopp(rader, 'allt');
  expect(efter.map(radbelopp)).toEqual([1500, 1500, 2500, 3500]);
  // NEGATIV KONTROLL mot den troliga genvägen "alla får samma tal": David är
  // på ett event med ett ANNAT pris, och hans belopp måste skilja sig från
  // Cecilias trots att båda betalat noll.
  expect(radbelopp(efter[2])).not.toBe(radbelopp(efter[3]));
});

test('sattAllaBelopp med avgift ger avgiftKvar, och lämnar raden UTAN avgiftskandidat orörd', () => {
  const rader = morgonen();
  const fore = rader.map(radbelopp);
  const efter = sattAllaBelopp(rader, 'avgift');
  // Cecilia/David har hela avgiften kvar ⇒ 1 000.
  expect(radbelopp(efter[2])).toBe(1000);
  expect(radbelopp(efter[3])).toBe(1000);
  // KANTEN: Anna/Björn har redan betalat avgiften, alltså INGEN
  // avgifts-kandidat (`harledBeloppsknappar` drar bort knappen). Deras
  // belopp står kvar på appens förslag — de töms INTE, och de flyttas inte
  // till "Behöver din hand".
  expect(radbelopp(efter[0])).toBe(fore[0]);
  expect(radbelopp(efter[1])).toBe(fore[1]);
  expect(efter[0].ejGenomforbar).toBeNull();
  expect(saknarBelopp(efter[0])).toBe(false);
  // Och objektet är IDENTISKT, inte bara likt: en orörd rad ska inte ens ge
  // en ny referens.
  expect(efter[0]).toBe(rader[0]);
});

test('en rad utan kandidat alls (pris saknas i basen) rörs inte av något av valen', () => {
  const rader = byggRader(
    [
      betalning({
        anmalanRecordId: 'rec-utan-pris',
        personNamn: 'Utan Pris',
        gallandePris: null,
        summaInbetalt: 0,
      }),
    ],
    IDAG,
    'Swish',
  );
  expect(berorsAvSattAlla(rader[0], 'avgift')).toBe(false);
  expect(berorsAvSattAlla(rader[0], 'allt')).toBe(false);
  expect(antalSattAlla(rader, 'allt')).toBe(0);
  expect(sattAllaBelopp(rader, 'allt')[0]).toBe(rader[0]);
});

test('raderna i "Behöver din hand" rörs inte, ens när de HAR en kandidat', () => {
  const rader = morgonen();
  // Lotta har tömt Cecilias fält — raden ligger i hand-högen (`saknarBelopp`),
  // men hennes kandidater finns kvar. AC #3: högen rörs inte.
  rader[2] = { ...rader[2], belopp: '' };
  expect(saknarBelopp(rader[2])).toBe(true);
  expect(berorsAvSattAlla(rader[2], 'allt')).toBe(false);

  const efter = sattAllaBelopp(rader, 'allt');
  expect(efter[2].belopp).toBe('');
  expect(antalSattAlla(rader, 'allt')).toBe(3);
});

test('avmarkerade och redan registrerade rader rörs inte; en FALLERAD rad gör det', () => {
  const rader = morgonen();
  rader[0] = { ...rader[0], markerad: false };
  rader[1] = { ...rader[1], utfall: { klass: 'registrerad', text: 'Registrerad' } };
  rader[2] = { ...rader[2], utfall: { klass: 'fel', text: 'nekad' } };

  expect(berorsAvSattAlla(rader[0], 'allt')).toBe(false);
  expect(berorsAvSattAlla(rader[1], 'allt')).toBe(false);
  // Den fallerade raden ÄR med: "Försök igen" ska kunna köras med ett nytt
  // belopp, samma resonemang som `arRegistrerbar` bär.
  expect(berorsAvSattAlla(rader[2], 'allt')).toBe(true);

  const efter = sattAllaBelopp(rader, 'allt');
  expect(efter[0]).toBe(rader[0]);
  expect(efter[1]).toBe(rader[1]);
  expect(radbelopp(efter[2])).toBe(2500);
  expect(antalSattAlla(rader, 'allt')).toBe(2);
});

test('avstämningen räknar om efter ett sätt-alla-tryck', () => {
  // FÖRE: två slutbetalningar à 1 500 och två avgifter à 1 000.
  expect(avstamning(morgonen())).toEqual([
    { klass: 'avgift', antal: 2, summa: 2000 },
    { klass: 'resten', antal: 2, summa: 3000 },
  ]);
  // EFTER "Hela beloppet": Anna/Björn behåller sin `resten`-klass (deras
  // hela rest ÄR 1 500), Cecilia/David hoppar från `avgift` till `allt`.
  expect(avstamning(sattAllaBelopp(morgonen(), 'allt'))).toEqual([
    { klass: 'resten', antal: 2, summa: 3000 },
    { klass: 'allt', antal: 2, summa: 6000 },
  ]);
  expect(summera(sattAllaBelopp(morgonen(), 'allt')).summa).toBe(9000);
});
