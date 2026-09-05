---
id: TASK-402.2
title: >-
  Skiva: Prefaktorering — inkorgens 'Registrerat nu'-block och radformulär som
  delade komponenter, med de tre formbytena
status: Done
assignee: []
created_date: '2026-09-05 19:02'
updated_date: '2026-09-05 22:54'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-402
ordinal: 698000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gör ändringen enkel innan den enkla ändringen görs: inkorgens 'Registrerat nu'-block bryts ut till en delad komponent som inkorgen renderar oförändrat, och inkorgens registreringsformulär får ett delat läge med Klar/Avbryt i stället för Registrera (samma fält i samma ordning, samma utfallsruta, samma fördröjning och autofokus) — en komponent, två konsumenter. I samma skiva görs prod-inkorgens tre formbyten i de delade komponenterna, så inkorgen och det kommande steget byter samtidigt: Förhandsgranska-knappens räknarchip tas bort (antalet bärs av det tillgängliga namnet 'Förhandsgranska N kvitton'; räknarchip-primitiven behålls för filterknappen), Ångra går via husets dialog (md-bredd, kortens hörnradie, rubrik 'Ångra registreringen?', kropp 'Namn · belopp · betalsätt' och konsekvensen, knappar 'Behåll' och 'Ångra registreringen'), och etiketten 'Registrera betalning' blir 'Registrera inbetalning'. Inkorgens beteende i övrigt är oförändrat. Täcker användarberättelser: 19, 31, 32.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inkorgens 'Registrerat nu'-block är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i lägena 'efter Registrera' och 'efter Registrera och skicka' vad gäller blockets rader (namn · betalsätt · kvittoläge · belopp · åtgärder, fast höjd på åtgärdskolumnen, ingen makuleringstext per rad) och knappraden ('Skicka N kvitton' + 'Förhandsgranska' utan räknarchip)
- [x] #2 Ångra i inkorgen öppnar dialogen identisk med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'Ångra-dialogen'; 'Behåll' stänger utan ändring, 'Ångra registreringen' raderar inbetalningen via inkorgens befintliga ångra-väg
- [x] #3 Inkorgens registreringsformulär finns i ett delat läge med Klar/Avbryt: Klar stänger, Avbryt återställer radens värden till dem som gällde när formuläret öppnades; inkorgens eget läge (Registrera) är oförändrat
- [x] #4 Etiketten 'Registrera inbetalning' ersätter 'Registrera betalning' på anmälans betalningsyta och personkortet; 'Registrera återbetalning' orörd
- [x] #5 Räknarchip-primitiven är oförändrad och filterknappens badge renderar som förut (visual-baslinjen för filterraden byte-identisk)
- [x] #6 Inkorgens befintliga tester (api-pure och staging-e2e för utskicksflödet) är gröna utan ändrad avsikt; nya fall täcker dialogen och den chip-lösa knappens tillgängliga namn
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
- [x] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
FÖRKRAV (S121 paus 3, 2026-09-05): prototypkoden (VariantC, BekraftelsestegPrototype, bekraftelseSimulering, fixtur, radfalt, routen betalningar_.registrera) ligger på grenen proto/s121-bekraftelsesteget (draft-PR #2325, 21 commits över main, DEV-grindad) — INTE på main. Landa #2325 via review-loopen (ready → review-agent → backstopp → armera) FÖRE denna skiva, eller basera skivans gren på proto-grenen. Facit-manifestet och markörerna följer med den landningen.

HANDOVER 2026-09-05 ~20:55 UTC (checkpoint, orkestrerar-order vid ~65% kontext):

GREN: task/402.2-prefaktorering-inkorgen, SHA d27b2675 (pushad).
PR: #2360 (draft, https://github.com/high-five-group/miranon-media-admin/pull/2360)
Basen: origin/proto/s121-bekraftelsesteget (PR #2325 ej mergad vid grenskapande) — diffen mot main bär #2325s 21 commits tills den landar.

KLART:
- src/components/betalningar/RegistreratNuBlock.tsx (NY): "Registrerat nu"-blocket utbrutet ur BetalningsInkorg.tsx. Formbyte 1 (räknarchip bort från Förhandsgranska, aria-label bär räkneformen oförändrat) och formbyte 3 (Ångra via husets DialogTrigger/Modal/Dialog, rounded-2xl, i stället för inline-bekräftelse) är byggda. min-h-9 flyttad från (rivna) makuleringstext-platshållaren till åtgärdskolumnen.
- src/components/betalningar/BetalningsInkorg.tsx: importerar RegistreratNuBlock, äger fortfarande alla mutationer (registrera/koa/radera/förhandsgranska), skickar dem som props. angraId-state riven, ersatt av delad angraFel-state (samma "senaste vinner"-mönster som forhandsgranskaFel).
- src/components/betalningar/RegistreraForm.tsx: nytt lage: 'registrera'|'redigera' som DISKRIMINERAD UNION (Props-typen), onRedigeringKlar-prop. spara() grenar tidigt i redigera-läget UTAN serveranrop. Knapprad: "Klar" ersätter "Registrera", "Registrera och skicka" döljs i redigera-läget.
- src/routes/dev/registrera-form-redigera.tsx (NY): DEV-only route (beforeLoad-redirect i prod, samma mönster som /dev/primitives) som bevisar redigera-läget LEVANDE utan att röra prototypen.
- Formbyte 3 (etikett "Registrera betalning" -> "Registrera inbetalning"): AnmalansBetalningar.tsx (anmälans betalningsyta) och PersonBetalningar.tsx (personkortet) — RegistreraYta-anropen fick explicit etikett-prop. PanelBetalningar.tsx (Åtgärds-panelen), BetalningsInkorg.tsx (inkorgens egen knapp), OmbokningsKvitto.tsx, Genvagar.tsx, RegistreraForm.tsx (aria-label) medvetet ORÖRDA — utanför kortets tvåyta-scope (bokfört som fynd, se nedan).
- Testfiler: tests/api/betalningar-inkorg-statusyta-form.test.ts + tests/api/kvitto-forhandsgranskning.test.ts retargeterade till RegistreratNuBlock.tsx (30 test gröna). tests/e2e/betalningar-inkorg-forhandsgranska-alla.staging.test.ts: tre toHaveText('Förhandsgranska N') -> 'Förhandsgranska' (chip riven), kommentarer uppdaterade. tests/e2e/betalningar-inkorg-utskicksflode.staging.test.ts: makuleringstext-assertion inverterad (not.toBeVisible), TVÅ NYA tester tillagda (Ångra-dialog Behåll/Escape/radera, chip-lös Förhandsgranska N=1).
- Facit-skärmdumpar tagna mot SKARP kod (mockade nätverksanrop via page.route, ingen skarp staging-skrivning) i tasks/sessions/bilagor/task-402.2-facit-jamforelse/ — matchar facit-bilderna (registrerat-nu-block, ångra-dialog) mycket väl vid visuell jämförelse.

KÄND BUGG, EJ FIXAD — FIXA FÖRST:
RegistreratNuBlock.tsx's blockAktivt-härledning (sök "const blockAktivt") läser:
  const blockAktivt = registrerade.some((post) => { const lage = kvittolage(...); return lage.fel || !lage.kanAngra; });
Detta är FEL. Originalets Kvittolage hade ett EGET 'vila'-fält, separat från 'kanAngra':
  - !medKvitto -> kanAngra:true, vila:true
  - i lokal kö (vantande) -> kanAngra:true, vila:FALSE (AKTIV/guld!)
  - jobbrad skickat -> kanAngra:false, vila:true
  - jobbrad pagar/vantar/fel/fallback -> kanAngra:false, vila:false
Jag tog bort 'vila' av misstag när jag rev 'angraSkal' (makuleringstexten) — de är INTE samma fält. FIX: lägg tillbaka 'vila' i Kvittolage-typen och kvittolage()-funktionen (exakt originalets logik, bara utan angraSkal), och ändra blockAktivt till:
  const blockAktivt = registrerade.some((post) => !kvittolage(post, vantande, jobbrader).vila);

Detta fäller just nu LIVE (mätt via PLAYWRIGHT_TEST_BASE_URL=http://localhost:5174 npx playwright test --project=chromium-authenticated mot egen lokal dev-server på port 5174, .env.development, staging-semaforen använd):
  1) "raden vilar (neutral ton) när kvittot är skickat; blocket är AKTIVT (guld) medan kön väntar" — förväntar TON_AKTIV (guld) direkt efter registrering (kvitto i lokal kö), fick TON_VILA. Detta är EXAKT bugen ovan.
  2) "EN statusyta... höjd är IDENTISK köat och klart @ mobil (375x800)" — kootHojd=200, klarHojd=182 (18px diff). MISSTANKE: samma rotorsak (blockAktivt fel => fel bakgrundston => ev. annan class-väg), men INTE VERIFIERAD ännu — mät om på nytt EFTER fix 1, det kan vara en SEPARAT height-bugg (Button sm-storlek min-h-8 vs actions-spannets min-h-9 — kolla om något annat än blockAktivt påverkar denna specifika mätning).
  3) "Ångra öppnar husets dialog... Behåll ska ha default-fokus" — toBeFocused() på Behåll-knappen fallerar (inactive). INTE ÄNNU DIAGNOSTISERAT om detta är en genuin brist i AngraKnapp/DialogTrigger-uppsättningen eller ett test-timing-fel (kanske behöver en kort waitFor eller så landar fokus på dialog-roten istället för första knappen — kolla react-aria-components Dialog-defaultbeteende, ev jämför med ett annat befintligt Dialog-test i repot som redan verifierar default-fokus för att se om mönstret där skiljer sig).

Api-pure (30 test i de två retargeterade filerna + fulla 1669-testsviten): GRÖNA.
test:api:staging: GRÖN för alla betalningsdomän-tester; 3 OFÖRÄNDRADE fel i HELT ANDRA moduler (generate-event-attachment.staging.test.ts, update-record.staging.test.ts) — verkar vara pre-existerande/miljörelaterat, INTE verifierat mot main ännu.
typecheck / biome / build / check-langa-streck: GRÖNA (senast körda före de tre e2e-felen hittades — kör om EFTER blockAktivt-fixen för säkerhets skull, ingen kod-yta som skulle påverka dem rörs av fixen men verifiera ändå).

KVAR ATT GÖRA (i ordning):
1. Fixa blockAktivt (se ovan), kör om de tre fallerande e2e-testerna (samma kommando som ovan, PLAYWRIGHT_TEST_BASE_URL mot en egen lokal dev-server — port 5173 var upptagen av en annan process/agent vid mätning, använd en ledig port, t.ex. 5174, och kom ihåg staging-semaforen runt hela körningen).
2. Kör HELA test:api (pure+staging) + de tre e2e-filerna (utskicksflöde, förhandsgranska-alla, förhandsgranskning-oberoende) + relevanta a11y-sviter för inkorgen efter fixen, grönt hela vägen.
3. AC #6 kräver också nya test-fall för "den chip-lösa knappens tillgängliga namn" — delvis täckt (nya testet i utskicksflöde-filen + de tre uppdaterade i förhandsgranska-alla-filen), bedöm om det räcker.
4. Bocka AC 1–6 i kortet MED MÄTVÄRDE (--check-ac N) först när respektive AC är faktiskt verifierad — INGEN AC är bockad ännu.
5. DoD #4 facit-granskning: skärmdumparna finns i tasks/sessions/bilagor/task-402.2-facit-jamforelse/, men PR-kroppen behöver UPPDATERAS med en tydlig jämförelse-sektion (bilderna ligger där redan, bara texten/länken saknas i PR-beskrivningen).
6. PR-kroppen behöver en fullständig omskrivning från "WIP CHECKPOINT" till den riktiga leverans-formen (AC-status, grindutfall med exitkoder, formbytenas exakta ytor, bokförda fynd) NÄR skivan faktiskt är klar — använd INTE checkpoint-texten som slutgiltig PR-kropp.
7. Kortet ska INTE armeras eller sättas Done av byggagenten — orkestreraren gör det efter review-agent + CI.

FYND ATT BOKFÖRA I SLUTRAPPORTEN (redan identifierade, inte agerade på):
- "Registrera betalning"-etiketten står ORÖRD i: hem/Genvagar.tsx, events/atgarder/AtgardsSida.tsx (via PanelBetalningar.tsx), registrations/AnmalanDetail.tsx (kommentar, faktisk knapp går via AnmalansBetalningar redan åtgärdad), registrations/OmbokningsKvitto.tsx (TillBetalning-komponenten — klickar programmatiskt på REGISTRERA_TRIGGER_ID, vars etikett NU är "Registrera inbetalning" — denna knapps EGEN text säger fortfarande "Registrera betalning", en genuin INKONSEKVENS värd att flagga för Marcus), RegistreraForm.tsx (form-aria-label, delad av alla lägen, medvetet ORÖRD eftersom inkorgen behåller sin identitet).
- Ingen visuell baslinje hittad specifikt för betalningsinkorgens filterrad (sökt med grep -rli filterrad tests/visual/ och find tests/visual -iname '*filter*'/'*betalning*') — AC #5 verifierad genom att FilterRad.tsx och RaknarChip-användningen där INTE rörts av denna skiva (grep bekräftar).
- Modal-primitivens hörnradie (rounded -> rounded-2xl) används LOKALT i AngraKnapp (className på <Modal>), INTE ändrad i primitiven själv — bokförd KANDIDAT utan eget kort, som uppdraget bad om.

SLUTFÖRD 2026-09-05 ~21:30 UTC (fortsättning efter checkpointen ovan, samma agent):

Den KÄNDA BUGGEN (blockAktivt) och de TVÅ ytterligare live-buggarna (mobil-höjdregression via saknad `truncate`, samt testets felaktiga antagande om Ångra-dialogens default-fokus) är ALLA rättade och verifierade LIVE. Se commit 235d320f för fullständig felbeskrivning i commit-meddelandet.

SLUTLIGT LÄGE: SHA 235d320f, PR #2360 (fortsatt draft — orkestreraren armerar efter review-agent + CI). AC #1–#6 och DoD #1–#4 avbockade i kortet med mätvärde.

Grindar, alla gröna (se PR-kroppen för fullständig tabell):
- typecheck/biome/build/check-langa-streck: exit 0
- test:api:pure (fullt): 1669/1669 gröna
- test:api:staging (fullt): grön för betalningsdomänen, 3 opåverkade förhandsexisterande fel i andra moduler
- e2e (3 filer, 24 test): ALLA gröna efter buggfixarna

Bokförda fynd (se PR-kroppen för fullständig lista): OmbokningsKvitto.tsx-inkonsekvensen ("Registrera betalning" kvar där trots att den klickar på en trigger som nu heter "Registrera inbetalning"), ingen visuell baslinje för filterraden, Modal-hörnradie-kandidaten.

Ingen ytterligare handoff behövs — skivan är komplett från byggagentens sida. Nästa steg ägs av orkestreraren (review-agent i färsk kontext, sedan armering).

RUNDA 2 2026-09-05 22:11 UTC: fynd 1-3 (review-agentens utlåtande, granskad SHA 71f40c5e) rättade — SHA 0372f854. Fynd 1: facit-skärmdumparna i tasks/sessions/bilagor/task-402.2-facit-jamforelse/ regenererade mot SHA 0372f854 (samma metod: mockade nätverksanrop via page.route, egen lokal dev-server port 5174, staging-semaforen; desktop 1440x900 @2x). RGB vid (1700,460): efter Registrera = rgb(251,243,224) (TON_AKTIV, korrekt guld), efter Registrera och skicka = rgb(245,245,243) (TON_VILA). Ingen avvikelse mot facit, ingen AMENDERING behövs. Fynd 2: stale default-fokus-kommentarer i RegistreratNuBlock.tsx och betalningar-inkorg-utskicksflode.staging.test.ts rättade (dialogen sjalv far fokus, inte Behall) - ingen kodandring, testets assertion var redan korrekt. Fynd 3: OmbokningsKvitto.tsx TillBetalning-knappens text 'Registrera betalning' -> 'Registrera inbetalning' (orkestrerarens beslut), motsvarande assertion i anmalan-ombokning.acceptance.test.ts uppdaterad. Grindar grona: typecheck/biome/build/langa-streck 0; test:api 1 fel (opaverkat, forhandsexisterande, generate-event-attachment.staging.test.ts, annan modul); acceptance-filen 19/19; alla tre e2e-filer 24/24. PR #2360 fortsatt draft.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landad som PR #2360 → main 364f75b9 (2026-09-05 22:39 UTC). AFK-proveniens: S121 resume 3 (Marcus mandat vid paus 3), bygg-agent Sonnet 5 i egen worktree; checkpoint på Marcus order vid ~65 % kontext (d27b2675 + HANDOVER i notes), slutförd i samma session (71f40c5e). Review-loopen: runda 1 risk medel, tre fynd (DoD #4-bilder tagna före vila-fixen, två fokus-kommentarer, OmbokningsKvitto-etikett) → fix-agent (0372f854, 68b7daad: bilder regenererade med RGB-bevis 251,243,224 aktiv / 245,245,243 vila) → runda 2 risk låg, 0 fynd, AC #1–#6 håller; review-loop-beslut exit 0, backstopp exit 0. Kö-CI grön; post-merge run 33996542511 grön attempt 1 (staging 11m46s mot 12-min-taket → TASK-404). Levererat: RegistreratNuBlock.tsx (delat block), RegistreraForm redigera-läge (diskriminerad union) + DEV-route /dev/registrera-form-redigera, räknarchip bort från Förhandsgranska, Ångra via husets dialog, etiketten Registrera inbetalning på anmälans betalningsyta, personkortet och OmbokningsKvitto. Lokalt: api-pure 1669/1669, staging-e2e 24/24 (tre filer), typecheck/biome/build/långa-streck 0. Bokförda fynd: TASK-405 (etiketten på övriga ytor), Modal-hörnradie rounded-2xl lokal på användningen (kandidat utan kort). Sessionsdok S121 Del 6 §6.3.
<!-- SECTION:FINAL_SUMMARY:END -->
