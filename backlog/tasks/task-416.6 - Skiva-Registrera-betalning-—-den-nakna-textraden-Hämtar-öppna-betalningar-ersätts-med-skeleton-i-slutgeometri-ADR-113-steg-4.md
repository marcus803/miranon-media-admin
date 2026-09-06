---
id: TASK-416.6
title: >-
  Skiva: Registrera betalning — den nakna textraden Hämtar öppna betalningar
  ersätts med skeleton i slutgeometri (ADR-113 steg 4)
status: Done
assignee: []
created_date: '2026-09-06 13:21'
updated_date: '2026-09-06 19:53'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 732000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #6 (S123). src/components/betalningar/Bekraftelsesteget.tsx:146–147 visar en naken textrad som enda laddbesked — exakt den form husets laddtrappa förbjuder (DESIGN-SYSTEM-SPEC §15 / ADR-113 steg 4, citerad ordagrant i PersonsList.tsx:842–843). VÄNTAR: startas först när S121:s PR #2378 (bekräftelsestegets form före stämpeln) och #2380/#2383 landat; bygg mot färsk main och mot stegets DÅ gällande form. Åtgärd: sidkromet renderat, skeleton i listkroppen med samma radgeometri som bekräftelsestegets kort.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ingen naken laddtext; skeleton i listkroppen med kortets riktiga höjd, sidkromet oförändrat under laddning
- [x] #2 Grenen är rebasad på main efter att #2378, #2380 och #2383 landat
- [x] #3 Promoverings-grinden (tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts) grön, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementerat: Bekraftelsesteget.tsx isLoading-grenen bytt mot BekraftelsestegetSkelett()
— sidkromet (SidRamKnapp, redan ovillkorligt) plus en SPEGLAD rubrik ("Bulkregistrering",
samma klasser/DOM-position som BulkC:s facit-låsta h1) och ett skelett i listkroppens
slutgeometri (VariantC.tsx:s MarkerbartKort-anatomi: avatar size-9, en textrad namn,
belopp, inert chevron-cirkel utan shimmer). VariantC.tsx/BulkC RÖRDA INTE — rubriken
kan inte lyftas ut till en delad headerBlock utan att lämna promoverings-grindens
facit-scope (data-testid="bekraftelsesteget"), så klasserna speglas i stället.

Mätning (staging, 1280x720, Chromium, ny fil tests/e2e/bekraftelsesteget-laddlage.staging.test.ts):
rubrikens boundingBox {x:372,y:116,width:536,height:36} IDENTISK ladd-/laddat läge.
Första kortets boundingBox {x:365,y:242.75,width:550,height:62} IDENTISK ladd-/laddat läge.
Axe-svep på ladd-läget (AxeBuilder, .include('main')): 0 violations.

Regressionskontroll (oförändrade, körda mot staging): bekraftelsesteget-promoverings-grind.staging.test.ts
11/11 grönt (facit-lås intakt), bekraftelsesteget-formen-fore-stampeln.staging.test.ts 22/22 grönt
inkl. axe, bekraftelsesteget.staging.test.ts 7/7 grönt inkl. axe.

Avvikelse bokförd: npm run test:api visade 2 fel i filer utanför scope
(get-person.staging.test.ts, send-registration-confirmation.staging.test.ts) — INTE orsakade
av denna diff. get-person-felet reproducerades oberoende i post-merge CI-körning 34044760522
(PR #2412, orört av denna gren) — pre-existing rött på main. send-registration-confirmation
föll konsekvent i tre lokala körningar (Request context disposed, 30s timeout) i en helt annan
domän (mailbekräftelse-gate). Ingendera fil är rörd av denna skiva.

--- FIX-RUNDA 2 (review-runda 1, Marcus mandat) ---

Fynd 1 (warning/ask-user, BulkC:s villkorade Kallrad-rad saknades i importflödets header):
avgjort mot koden — kalla (route-prop) och minne (lasImport(), läst i en useState-initierare)
är BÅDA kända SYNKRONT, oberoende av hamta-oppna-betalningar. Löst genom att RENDERA DEN RIKTIGA
Kallrad-komponenten (inte skeleton, inte kopia): (1) ny delad ren funktion
importoversiktFranMinne() i importminne.ts, använd av BÅDE useBekraftelsesteg.ts (ersätter
inline-objektet) och Bekraftelsesteget.tsx — enda källan, ingen dubblering. (2) Kallrad
exporterad ur VariantC.tsx (enda touchen av den facit-låsta filen — bara export-nyckelordet,
ingen renderingsändring, dokumenterat i komponentens eget docblock). (3) BekraftelsestegetSkelett
tar nu emot minne som prop och villkorar identiskt med BulkC. Nytt testfall (kalla=import,
sessionStorage seedad via addInitScript) mäter headerns TOTALA boundingBox — se mätvärden nedan.

Fynd 2 (warning/auto-fix, endast 1280x720 mätt): lade till MOBIL={width:390,height:844}
(CLAUDE.md:s mobilgolv) i samma for-loop-mönster som syskonfilerna. FÖRSTA körningen vid mobil
FÄLLDE verkligen (kortLadd.y=210.75 mot kortLaddat.y=235.5, 24,75 px diff) — review-hypotesen
var korrekt, inte bara försiktighetsprincip. Rotorsak: GruppRubrik (VariantC.tsx) saknar
truncate/whitespace-nowrap och radbryter till två rader när eventnamn+datum inte får plats
(mätt: h2 49,5 px vid 390 mot 24,75 px/rad — exakt mismatchen). Fix: skelettets grupprubrik-
platshållare fick en andra Skeleton-rad gated bakom `sm:hidden` (samma brytpunkt som redan
styr kortets egen sm:flex-row-omslag) — reserverar 2 rader under 640px, 1 rad däröver, matchat
mot mätningen i BÅDA viewports.

Bidirektionellt bevisat (negativ kontroll, sedan återställt och grönt igen): (a) tog bort
Kallrad-villkoret → import-testet föll (element hittades inte); (b) mobil-testet föll INNAN
tvåradsfixen (dokumenterat ovan) — samma körning bevisade sedan att fixen löser det.

MÄTT (staging, Chromium, 2026-09-06):
- desktop 1280x720: rubrik {x:372,y:116,w:536,h:36}, första kortet {x:365,y:242.75,w:550,h:62} — identiska ladd/laddat.
- mobil 390x844: rubrik {x:32,y:84,w:326,h:36}, första kortet {x:25,y:235.5,w:340,h:110} — identiska ladd/laddat (efter fix).
- import-flödet (desktop): header {x:356,y:116,w:568,h:123} — identisk ladd/laddat.

Grindar (exit-koder): typecheck 0, biome check . 0, check-langa-streck 0, build 0.
Regression (staging, oförändrade filer): bekraftelsesteget-promoverings-grind 11/11,
bekraftelsesteget-formen-fore-stampeln 22/22, bekraftelsesteget.staging.test.ts 7/7,
betalningar-import-bekraftelsesteget.staging.test.ts alla gröna (47 tester totalt i svepet),
importminne.test.ts (api-pure) 29/29.

--- FIX-RUNDA 3 (review-runda 2, Marcus mandat) ---

Fynd 1 (warning/ask-user, sm:hidden villkorar på fel variabel — textlängd, inte viewport):
avgjort som instruerat — behöll raden orört (ingen kodändring i VariantC.tsx utöver den
befintliga export:en), skrev docblocket i Bekraftelsesteget.tsx ärligt: skelettet speglar
DET VANLIGASTE utfallet (långt eventnamn+datum bryter till två rader under sm, mätt 49,5 px
vid 390px för 29-teckensnamnet "Resor i medvetandet 1, Skövde"), korta namn ("Fjärrskådning,
Göteborg" 23 tecken, "Psionautics, Stockholm" 22 tecken — båda i SAMMA fixtur) ger ett hopp på
24,75 px åt ANDRA hållet. Bokförd öppen kant tills GruppRubrik får en deterministisk radhöjd —
Marcus designbeslut, inte kod härifrån. Samma bokföring tillagd i testfilens eget docblock
(§ [FIX-RUNDA 3]).

Fynd 2 (info/ask-user, live-regionen for bred — Kallrads riktiga text annonserades atomiskt
med laddningsbeskedet): snävade role="status"/aria-live="polite"/aria-busy="true" + det dolda
"Hämtar öppna betalningar …"-beskedet till listkroppens EGEN wrapper (den del som faktiskt
laddar). Header (h1, statusrad-skelett, Kallrad) ligger nu UTANFÖR live-regionen, ingen ARIA-roll
på roten. Verifierat: BulkC:s laddade form (dess egen <p role="status">) är opåverkad
(VariantC.tsx orört denna runda) — promoverings-grinden 11/11 grönt bekräftar ingen dubbel
statusregion uppstår (de två regionerna existerar aldrig samtidigt, skelettet unmountas när
BulkC monteras). Befintlig testassertion `getByText('Hämtar öppna betalningar …')` hittar
fortfarande rätt nod (span flyttad, inte borttagen) — verifierat grönt i alla fyra
laddlage-testerna.

Fynd 3 (info/auto-fix, import-testet saknade axe + mobil): omstrukturerat till samma
for-loop-mönster som det manuella testet (desktop + mobil), AxeBuilder-svep tillagt på
laddläget i båda viewports — detta är den ENDA gren som monterar Kallrads RIKTIGA text/ikon i
skelettet, så a11y-täckningen var en genuin lucka.

MÄTT (staging, Chromium, 2026-09-06, workers enligt playwright.config.ts — 1 worker per fil,
ingen fullyParallel satt):
- desktop 1280x720: rubrik {x:372,y:116,w:536,h:36}, första kortet {x:365,y:242.75,w:550,h:62} — identiska.
- mobil 390x844: rubrik {x:32,y:84,w:326,h:36}, första kortet {x:25,y:235.5,w:340,h:110} — identiska.
- import desktop: header {x:356,y:116,w:568,h:123} — identisk.
- import mobil (NY): header {x:16,y:84,w:358,h:141} — identisk.
- Axe (båda manuella + båda import-varianter, 4 svep totalt): 0 violations vardera.

Grindar (exit-koder): typecheck 0, biome check . 0, check-langa-streck 0, build 0.
Regression (staging, VariantC.tsx/importminne.ts/useBekraftelsesteg.ts orörda denna runda):
promoverings-grinden 11/11, bekraftelsesteget.staging.test.ts 7/7, betalningar-import-
bekraftelsesteget.staging.test.ts 10/10 (alla axe-svep gröna).

REVIEW-RUNDA 3 (PR #2420, Opus, 2026-09-06, på mandat): konvergerad, 1 info bokförd här: promoverings-grindens första post-rebase-körning 20:42Z föll på en 15 s timeout i oppna() (data hann inte landa) medan staging bar CI-körning 34052164142; omkörning 20:44Z gav 11/11 grönt på samma träd, övriga sviter 16/16 20:45Z — klassad som staging-latens under delad last (A/B på samma träd), inte regression. ÖPPEN DESIGNFRÅGA MARCUS (bokförd kant, review r2): skelettets extra sm:hidden-rad speglar långa eventnamn (29 tecken bryter till två rader under sm), korta namn (fixturens 23/22 tecken) ger 24,75 px hopp åt andra hållet; lösningen är deterministisk radhöjd på GruppRubrik (whitespace-nowrap/truncate) i den facit-låsta VariantC.tsx = facit-omstämpling. Landad 331a505b.
<!-- SECTION:NOTES:END -->
