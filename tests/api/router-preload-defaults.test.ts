// ROUTER-PRELOAD-DEFAULTERNA (TASK-416.10 AC #1, review-grinden runda 1
// INFO 2) — api-pure (ren logik, ingen staging, inga creds, ingen browser).
//
// VAD SOM BEVISAS: `src/router.ts` sätter `defaultPreload: 'intent'` och
// `defaultPreloadStaleTime: 0` — utan detta hämtas route-chunken först vid
// klick i stället för på hover/fokus (se `router.ts`s eget docblock för
// hela resonemanget och källan mot TanStack Routers preloading-guide).
//
// Testet importerar INTE `src/router.ts` — samma etablerade mönster som
// `tests/api/personregister-farskhet.test.ts` § 3 redan använder och
// motiverar: modulen drar in `routeTree.gen.ts`, som i sin tur statiskt
// importerar VARJE routes fulla komponentträd (React-komponenter, CSS,
// window-beroende kod i sidkomponenter) — vilket api-pure-miljön (ingen
// browser, inget DOM) inte kan ladda. I stället läses filen som text och
// låses mot den EXAKTA options-raden, så en framtida drift i router.ts
// (t.ex. någon som råkar ta bort fältet vid en refaktor) fäller detta test
// i stället för att upptäckas i produktion som två väntesteg i följd igen.
//
// TVÅSIDIGT BEVISAT (byggsessionen, TASK-416.10): `defaultPreload: 'intent'`
// tillfälligt ändrat till `defaultPreload: false` i `src/router.ts` gav ett
// RÖTT test här (`toContain` föll), och återställning gav grönt igen —
// bokfört i PR-kroppen och kortets notes, inte bara påstått.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROUTER_FIL = path.join(REPO_ROOT, 'src', 'router.ts');

test('src/router.ts sätter defaultPreload: intent och defaultPreloadStaleTime: 0', () => {
  const kalla = readFileSync(ROUTER_FIL, 'utf8');

  expect(kalla, "router.ts ska sätta defaultPreload: 'intent' (hover/fokus/touchstart)").toContain(
    "defaultPreload: 'intent',",
  );
  expect(
    kalla,
    'router.ts ska sätta defaultPreloadStaleTime: 0 (delegerar färskhet till QueryClient)',
  ).toContain('defaultPreloadStaleTime: 0,');

  // Ingen route har en loader idag (TASK-416.10 premiss-pass), men skulle
  // en tillkomma ska den ALDRIG blockera navigeringen (ADR-078 beslut 1).
  // Detta test vaktar bara options-raderna, inte loader-disciplinen — se
  // ADR-078 för den regeln.
});
