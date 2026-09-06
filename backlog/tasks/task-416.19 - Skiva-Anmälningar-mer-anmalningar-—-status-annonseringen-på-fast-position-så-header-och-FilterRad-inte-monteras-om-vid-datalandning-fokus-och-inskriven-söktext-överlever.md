---
id: TASK-416.19
title: >-
  Skiva: Anmälningar (mer/anmalningar) — status-annonseringen på fast position
  så header och FilterRad inte monteras om vid datalandning (fokus och inskriven
  söktext överlever)
status: Done
assignee: []
created_date: '2026-09-06 16:37'
updated_date: '2026-09-06 19:53'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 746000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: review-agentens fynd på PR #2415 (TASK-416.2, S123, 2026-09-06), verifierat mot src/components/registrations/AnmalningarSida.tsx vid origin/main (~rad 838–848): i laddat läge skjuts <p role=status>N laddade</p> in FÖRE headerBlock (index 1), medan isPending/isError har headerBlock direkt efter sidRam (rad ~781–784/826–829). React reconcilerar barn positionellt utan keys, så header och FilterRad monteras om vid isPending→laddat och fokus/inskriven söktext tappas exakt vid landningen — det boundingBox-mätningen i TASK-416.4 inte kan se. Åtgärd: ett returträd med fasta positioner (förlaga TASK-416.8, Intresserade.tsx, PR #2395): status-annonseringen som sr-only <p role=status aria-live=polite> på fast position i alla tre grenar med tomt innehåll tills datan landat; därefter headerBlock, filterRadBlock, datakropp. Nytt acceptance-fall: fokus + inskriven text i FilterRads sökfält överlever isPending→laddat och isError→laddat, tvåsidigt bevisat. Beroende: ingen (416.4 landad).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Header och FilterRad har samma barnindex i isPending-, isError- och laddat läge (ett returträd, fasta positioner)
- [x] #2 Acceptance-test: fokus och inskriven söktext överlever isPending→laddat och isError→laddat, tvåsidigt bevisat
- [x] #3 Befintliga anmälnings-acceptance/visual-grinder gröna, axe-svep grönt, boundingBox-mätningen från 416.4 fortsatt identisk
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## AC #2 — divergens mot bokstaven (review-runda 1, PR #2423)

AC #2 är bockat, men den bokstavliga texten ("fokus och inskriven söktext i FilterRads sökfält överlever isPending→laddat och isError→laddat") byggdes INTE ordagrant — den är strukturellt omöjlig, av två oberoende, kod-verifierade skäl:

1. `src/components/primitives/FilterRad.tsx` rad 298–312: renderar ENBART dekorativa, ofokuserbara `Skeleton`-block för samtliga dimensioner så länge `FilterRad`s egen `isPending`-prop är sann. `dim.kontroll` (EventValjare med sökfältet) monteras alltså inte — och den propen är bunden (AnmalningarSida.tsx, `isPending={isPending}`) till EXAKT samma boolean som väljer sidans egen render-gren. Ett läge där sidan är pending MEN sökfältet fokuserbart kan alltså inte existera.
2. `src/components/registrations/AnmalningarSida.tsx` (rad ~645–655, `headingRef`-effekten): `headingRef.current?.focus()` körs OVILLKORLIGT första gången `registrations` blir sant, oavsett om övergången kom från isPending eller isError. Det är en befintlig, avsiktlig a11y-effekt ("Fokus -> <h1> ... en gång per laddning") — inte en bugg TASK-416.19 äger. Mätt empiriskt (headless Playwright): fokusen till h1 gör att en öppen EventValjare-popover stängs av sitt EGET, korrekta blur-beteende (WAI-ARIA combobox-mönstret), inte av en remount. `get-events` gjorde noll extra anrop under övergången (mätt via nätverksräknare) — det är alltså inte heller en bakgrundsrefetch som stör.

**Vad testerna faktiskt bevisar i stället** (`tests/acceptance/mer-anmalningar-form.acceptance.test.ts`, describe `Regressionsvakt: fasta syskon-positioner håller FilterRad odemonterad`): att `FilterRad`s DOM-nod-identitet (en `data-`-markör satt via `page.evaluate()` på `filter-panel`-noden) och dess interna öppna `useState`-state överlever BÅDA `isPending→laddat` och `isError→laddat` — den mekanism som är IMMUN mot de två gränserna ovan och som direkt motbevisar den ursprungliga remount-defekten (header/FilterRad bytte DOM-nod-identitet vid varje övergång, före fixen).

Bokfört enligt review-runda 1 fynd 2 (`utlatande-pr2423.json`): "kortet är repots durabla substrat ... AC:t bockat trots att bokstaven inte byggdes". Full motivering + kodreferenser finns även i PR #2423-kroppen och i komponentens/testfilens egna docblock.

## Mätningar (bokförs här så de överlever agentens scratchpad — review-runda 1 fynd 4)

**Visuell promoverings-grind** (`tests/visual/anmalningssidan-promoverings-grind.spec.ts`, ariaSnapshot + axe, visual-desktop + visual-mobile):
```
npm run test:visual -- anmalningssidan-promoverings-grind
```
→ 20 passed (33.0s), exit=0. Körd två gånger under skivan (runda 1 och runda 2), båda gånger 20/20 grönt.

**Tvåsidigt bevis, de nya regressionstesten i `mer-anmalningar-form.acceptance.test.ts`** (describe `Regressionsvakt: fasta syskon-positioner håller FilterRad odemonterad`):
```
npx playwright test --project=acceptance -g "Regressionsvakt: fasta syskon-positioner" tests/acceptance/mer-anmalningar-form.acceptance.test.ts
```
- Mot commit `4dd301bb` (runda 1:s head) MED fixen temporärt reverterad (`git checkout 4dd301bb -- src/components/registrations/AnmalningarSida.tsx`), testfilen orörd: **2 failed, exit=1** — markören saknades och panelen var stängd efter övergången i båda de då existerande testen.
- Mot fixen återställd (`git apply` av sparad diff): **2 passed (senare 3 passed efter runda 2:s tredje test), exit=0**.

**Hermetik-självtest** (`npm run test:acceptance:sjalvtest -- tests/acceptance/mer-anmalningar-form.acceptance.test.ts`): 35 tester · 35 fällda · 35 med `OmockadRequestError` som orsak → "BEVISET HÅLLER", exit=0.

**Övriga grindar, mätta i runda 2:** `npm run typecheck` exit=0 · `npx @biomejs/biome check .` exit=0 (0 nya diagnostik i de rörda filerna) · `npm run build` exit=0 · `node scripts/check-langa-streck.mjs` exit=0 (323 filer, 0 ofångade) · full `mer-anmalningar*.acceptance.test.ts`-svit (42 tester) exit=0.

Sakrisken i restrukturingen är strukturellt låg: laddat-lägets barnordning inuti ankaret är byte-identisk med den gamla laddat-grenen, så `ariaSnapshot`-referenserna behövde aldrig röras.

## Avvikelse från kortets Description: dataLaddadAnnonsering-formen (review-runda 1 fynd 5)

Kortets Description föreskrev "status-annonseringen som sr-only `<p role=status aria-live=polite>` på fast position i alla tre grenar **med tomt innehåll** tills datan landat". Implementationen (`dataLaddadAnnonsering = dataOkand ? null : <p role="status" ...>Anmälningarna laddade.</p>`) monterar i stället noden FÖRST när datan landat, aldrig tom-men-monterad dessförinnan — medan grannoden `filterAnnonsering` (samma fil) använder den ANDRA, alltid-monterade formen (`<p aria-live="polite">{periodAnnouncement}</p>`, tom sträng tills något finns).

**Beslut: koden ändras INTE.** Skäl:
- Positionsinvarianten (AC #1) påverkas inte — ett `null`-uttryck behåller sin plats i children-arrayen precis som en tom `<p>` hade gjort.
- Beteendet är OFÖRÄNDRAT mot `origin/main`: noden fanns bara i laddat-grenen där också, så ingen regression införs.
- Förlagan `Intresserade.tsx` (rad ~350–356) gör exakt samma sak (`!laddat ? <span>Laddar...</span> : isError ? null : <p role=status>...`).
- Fokusflytten till `<h1>` bär redan beskedet vid datalandning.

Ändras detta i en framtida skiva: kör om `anmalningssidan-promoverings-grind` — en alltid-monterad status-nod syns i pending-lägets aria-träd och kan kräva uppdaterade `ariaSnapshot`-referenser.

## Review-runda 2 (PR #2423) — a11y-regression fixad, tre kommentarer rättade

**Fynd 1 (warning, auto-fix):** `filterAnnonsering` satt sedan runda 1 på fast syskon-position i alla tre lägen, men de två effekterna som sätter `periodAnnouncement` (nu rad ~625 resp. ~638) vaktade bara `isPending`, inte `isError`. Eftersom `FilterRad` får `isPending={isPending}` (aldrig `dataOkand`, medveten design från TASK-416.4) är Period-`Select`n fullt interaktiv redan i felläget — ett periodbyte MEDAN felbeskedet visades satte då en falsk räknartext ("Visar anmälningar för … 0 anmälningar.") i en live-region bredvid `MessageBox`s `role="alert"`. Rättat: båda effekterna vaktas nu med `dataOkand` (isPending ELLER isError), deklarerad tidigare i komponenten (direkt efter registrations-frågan) så den kan användas av effekterna. Nytt tvåsidigt bevisat acceptance-test: "period-annonseringen förblir tyst under isError (dataOkand-vakt, review-runda 2)" — rött mot commit `4dd301bb` (falsk text hittad), grönt efter fixen.

**Fynd 3 (info, auto-fix):** tre kodkommentarer som beskrev den rivna tre-`return`-strukturen rättade: "early-returnsen" (rad ~383), "alla tre return-grenar" (rad ~663), och "De FYRA barnen" (nu FEM — filen har fem fasta syskon-positioner, förlagan Intresserade.tsx har fyra).

Ny head-SHA för PR #2423 efter runda 2: se PR:ens senaste commit (bygg-agentens slutrapport för denna runda).

REVIEW-RUNDA 3 (PR #2423, Opus, 2026-09-06, på mandat): konvergerad, 2 info bokförda här utan kodändring: (1) kommentaren vid dataOkand säger FYRA platser men konsumenterna är FEM (filterAnnonsering rad ~896 tillkom i samma commit) — skriv utan siffra nästa gång filen rörs. (2) Live-regionen filterAnnonsering är nu permanent monterad och återannonserar vid error→laddat med siffran från senaste period-/filterbytet (effekterna uppdaterar aldrig texten vid refetch — pre-existerande); nettot är tvetydigt eftersom dataLaddadAnnonsering monteras dynamiskt (opålitlig annonsering). Vill man eliminera återannonseringen: nollställ periodAnnouncement när dataOkand blir sann — eget kort, inte reflexfix. Landad cc98bbe4.
<!-- SECTION:NOTES:END -->
