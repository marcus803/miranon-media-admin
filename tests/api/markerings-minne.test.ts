import { expect, test } from '@playwright/test';
import {
  allaSynligaMarkerade,
  arBetalningsfamiljen,
  avkodaMarkering,
  kodaMarkering,
  markeraAllaSynliga,
  saneraMarkering,
  vaxlaMarkering,
} from '../../src/components/betalningar/markerings-minne';

/**
 * [TASK-402.1 AC #6, PRD TASK-402 § Testbeslut punkt 1] Markeringsminnets
 * REGLER som rena funktioner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARFÖR api-pure OCH INTE EN WEBBLÄSARSVIT
 * ═══════════════════════════════════════════════════════════════════════════
 * `markerings-minne.ts` är delad i två halvor med avsikt (dess eget filhuvud
 * § REGLERNA ÄR RENA FUNKTIONER, LAGRET ÄR TUNT): allt som HAR en regel är
 * indata → utdata utan `window`, och bara de tre nedersta funktionerna rör
 * `sessionStorage`. Den delningen är precis vad som gör AC #6 mekaniskt
 * uppfyllbart — reglerna prövas här, lagringen och det observerbara beteendet
 * i `tests/e2e/betalningar-inkorg-markera-lage.staging.test.ts`.
 *
 * Samma skäl som `bekraftelsesteg-harledningar.test.ts` redan bär: repot har
 * ingen komponent-renderingsrigg (`package.json` bär bara Playwright), så en
 * enhetstest av UI-tillståndet vore inte bara onödig utan omöjlig.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEGATIVA KONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * Varje regel prövas i BÅDA riktningar: att den släpper igenom det den ska
 * OCH att den fäller det den inte ska. En sanering som aldrig sanerar och en
 * familje-vakt som säger ja till allt är båda gröna mot ensidiga tester.
 */

const REC_A = 'recAAAAAAAAAAAAAA';
const REC_B = 'recBBBBBBBBBBBBBB';
const REC_C = 'recCCCCCCCCCCCCCC';

/* ═══════════════════ BETALNINGSFAMILJEN (AC #5) ═══════════════════ */

test.describe('arBetalningsfamiljen', () => {
  test('inkorgen själv och bekräftelsesteget hör till familjen', () => {
    expect(arBetalningsfamiljen('/mer/betalningar')).toBe(true);
    expect(arBetalningsfamiljen('/mer/betalningar/registrera')).toBe(true);
  });

  test('trailing slash är samma sida och kostar inte urvalet', () => {
    expect(arBetalningsfamiljen('/mer/betalningar/')).toBe(true);
    expect(arBetalningsfamiljen('/mer/betalningar/registrera/')).toBe(true);
  });

  test('sökvägar utanför familjen fälls — det är hela vitsen med vakten', () => {
    expect(arBetalningsfamiljen('/mer')).toBe(false);
    expect(arBetalningsfamiljen('/')).toBe(false);
    expect(arBetalningsfamiljen('/mer/anmalningar')).toBe(false);
    expect(arBetalningsfamiljen('/personer/recXYZ')).toBe(false);
    expect(arBetalningsfamiljen('/event/recXYZ/atgarder')).toBe(false);
  });

  test('ETT SYSKON MED SAMMA PREFIX ÄR INTE ETT BARN — prefixet bär sitt snedstreck', () => {
    // `startsWith('/mer/betalningar')` ensamt hade sagt ja här, och en
    // framtida syskonroute hade då tyst ärvt markeringen.
    expect(arBetalningsfamiljen('/mer/betalningarXYZ')).toBe(false);
    expect(arBetalningsfamiljen('/mer/betalningar-arkiv')).toBe(false);
  });
});

/* ═══════════════════ KODNING (LAGRINGSFORMEN) ═══════════════════ */

test.describe('avkodaMarkering / kodaMarkering', () => {
  test('rundtur bevarar ordningen', () => {
    expect(avkodaMarkering(kodaMarkering([REC_A, REC_B, REC_C]))).toEqual([REC_A, REC_B, REC_C]);
  });

  test('tomt urval kodas till tom sträng och tillbaka till tom lista', () => {
    expect(kodaMarkering([])).toBe('');
    expect(avkodaMarkering('')).toEqual([]);
  });

  test('TOLERANT AVKODNING: null, undefined och skräp ger tomt urval, aldrig ett kast', () => {
    expect(avkodaMarkering(null)).toEqual([]);
    expect(avkodaMarkering(undefined)).toEqual([]);
    expect(avkodaMarkering(',,,')).toEqual([]);
    expect(avkodaMarkering('   ')).toEqual([]);
  });

  test('blanksteg skalas bort och dubbletter faller', () => {
    expect(avkodaMarkering(` ${REC_A} , ${REC_B} , ${REC_A} `)).toEqual([REC_A, REC_B]);
  });

  test('kodning avdubblerar också — samma invariant åt båda hållen', () => {
    expect(kodaMarkering([REC_A, REC_A, REC_B])).toBe(`${REC_A},${REC_B}`);
  });
});

/* ═══════════════════ SANERINGEN (AC #3) ═══════════════════ */

test.describe('saneraMarkering', () => {
  test('ID:n som inte längre är markerbara skärs bort', () => {
    // REC_B blev klar (fullbetald) mellan två hämtningar.
    expect(saneraMarkering([REC_A, REC_B, REC_C], [REC_A, REC_C])).toEqual([REC_A, REC_C]);
  });

  test('ett urval som helt ligger inom mängden rörs inte', () => {
    expect(saneraMarkering([REC_A, REC_B], [REC_A, REC_B, REC_C])).toEqual([REC_A, REC_B]);
  });

  test('TOM KANDIDATMÄNGD GER TOMT URVAL — anroparen äger "vet inte än"', () => {
    // Regeln är avsiktlig och farlig att missförstå: `useInkorgsMarkering`
    // anropar aldrig funktionen före EF-svaret, eftersom "inga öppna
    // betalningar" och "svaret har inte kommit" ser likadana ut här.
    expect(saneraMarkering([REC_A, REC_B], [])).toEqual([]);
  });

  test('tomt urval förblir tomt oavsett mängd', () => {
    expect(saneraMarkering([], [REC_A])).toEqual([]);
  });

  test('ordningen är urvalets, inte kandidatmängdens', () => {
    expect(saneraMarkering([REC_C, REC_A], [REC_A, REC_B, REC_C])).toEqual([REC_C, REC_A]);
  });
});

/* ═══════════════════ VÄXLINGEN ═══════════════════ */

test.describe('vaxlaMarkering', () => {
  test('bockar i och bockar ur', () => {
    const tomt: ReadonlySet<string> = new Set();
    const ett = vaxlaMarkering(tomt, REC_A, true);
    expect([...ett]).toEqual([REC_A]);
    expect([...vaxlaMarkering(ett, REC_A, false)]).toEqual([]);
  });

  test('INDATA MUTERAS ALDRIG — anroparens `Set` är orört efteråt', () => {
    const forut: ReadonlySet<string> = new Set([REC_A]);
    vaxlaMarkering(forut, REC_B, true);
    expect([...forut]).toEqual([REC_A]);
  });

  test('en växling utan verkan returnerar SAMMA referens (render-vakten)', () => {
    // Utan den här identiteten hade varje render skapat ett nytt `Set` och
    // fått React att loopa i sanerings-effekten.
    const nu: ReadonlySet<string> = new Set([REC_A]);
    expect(vaxlaMarkering(nu, REC_A, true)).toBe(nu);
    expect(vaxlaMarkering(nu, REC_B, false)).toBe(nu);
  });
});

/* ═══════════════════ "MARKERA ALLA SYNLIGA" (AC #2) ═══════════════════ */

test.describe('markeraAllaSynliga', () => {
  test('UNION, INTE ERSÄTTNING — rader från ett annat event överlever', () => {
    // Kärnan i AC #2 och skälet till etiketten "Markera alla synliga":
    // Lotta har bockat REC_A i event 1, filtrerar till event 2 och trycker
    // knappen. En ersättning hade raderat REC_A.
    const nu: ReadonlySet<string> = new Set([REC_A]);
    expect([...markeraAllaSynliga(nu, [REC_B, REC_C])]).toEqual([REC_A, REC_B, REC_C]);
  });

  test('tom synlig mängd lämnar urvalet orört, med samma referens', () => {
    const nu: ReadonlySet<string> = new Set([REC_A]);
    expect(markeraAllaSynliga(nu, [])).toBe(nu);
  });

  test('redan markerade synliga rader ger SAMMA referens (render-vakten)', () => {
    const nu: ReadonlySet<string> = new Set([REC_A, REC_B]);
    expect(markeraAllaSynliga(nu, [REC_A, REC_B])).toBe(nu);
  });

  test('indata muteras aldrig', () => {
    const forut: ReadonlySet<string> = new Set([REC_A]);
    markeraAllaSynliga(forut, [REC_B]);
    expect([...forut]).toEqual([REC_A]);
  });
});

/* ═══════════════════ KNAPPENS DÖDLÄGE ═══════════════════ */

test.describe('allaSynligaMarkerade', () => {
  test('sant när varje synlig rad är markerad', () => {
    expect(allaSynligaMarkerade(new Set([REC_A, REC_B]), [REC_A, REC_B])).toBe(true);
  });

  test('sant även när urvalet är STÖRRE än den synliga mängden', () => {
    // Filtrerat läge: två markerade, bara en synlig. Knappen har inget kvar
    // att göra och ska vara död.
    expect(allaSynligaMarkerade(new Set([REC_A, REC_B]), [REC_A])).toBe(true);
  });

  test('falskt så fort EN synlig rad saknas i urvalet', () => {
    expect(allaSynligaMarkerade(new Set([REC_A]), [REC_A, REC_B])).toBe(false);
    expect(allaSynligaMarkerade(new Set(), [REC_A])).toBe(false);
  });

  test('NOLL SYNLIGA GER SANT — en knapp utan verkan ska vara död, inte tryckbar', () => {
    expect(allaSynligaMarkerade(new Set(), [])).toBe(true);
    expect(allaSynligaMarkerade(new Set([REC_A]), [])).toBe(true);
  });
});
