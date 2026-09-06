---
id: TASK-402.8
title: >-
  Skiva: Bekräftelsestegets form före stämpeln — pillsen bort ur korten, namnet
  klipps, beloppsknapparna Anmälningsavgift/Hela beloppet under listan
status: To Do
assignee: []
created_date: '2026-09-06 09:24'
labels:
  - ready-for-agent
dependencies:
  - TASK-402.3
parent_task_id: TASK-402
ordinal: 712000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus prod-granskning av bekräftelsesteget 2026-09-06 (S121 resume 4, under 402.3 AC #10). Tre ändringar i variant C:s form FÖRE stämpeln (facit.json godkand: null, B3-spärren aktiv). (1) PILLSEN BORT: Förfallen/Obekräftad renderas i kortets huvud i både ihopfällt och öppet läge via RadMarken (src/components/betalningar/prototype/radfalt.tsx:247–262) anropad från KortHuvud (src/components/betalningar/prototype/VariantC.tsx:577, även HandKort rad 975). De tas bort ur steget. Inkorgen har egen markup (src/components/betalningar/BetalningsInkorg.tsx:2103–2118) och rörs inte. Skäl: grillningens beslut 5 (obekräftad registreras som vanligt, bekräftelsen sköts på Åtgärds-sidan) och att förfallen inte ändrar handlingen på denna sida — signalerna bor i inkorgen där Lotta prioriterar. Marcus: 'Pillsen bort, det blir bra.' (2) NAMNET KLIPPS: VariantC.tsx:576 saknar truncate, ett långt namn radbryter och flyttar layouten; inkorgen klipper från sm (BetalningsInkorg.tsx:2078 sm:truncate). Kortet får ALDRIG ändra höjd eller layout av ett långt namn — namnet klipps med ellips på en rad, fullständigt namn nås via title-attribut/sr-only. (3) BELOPPSKNAPPARNA: två knappar UNDER listan (antagande: mellan listan och avstämningen — Marcus ser placeringen i facit-iterationen), etikett 'Sätt alla belopp:' med 'Anmälningsavgift' och 'Hela beloppet' — INTE 1 000/2 500 (beloppen är per event och per person: en som redan betalat 2 000 får 500), INTE slider/strömbrytare (två knappar, appens förslag står kvar tills hon trycker). Tryck sätter varje markerad rads belopp till radens EGEN kandidat ur inkorgens prislogik (harledBeloppsknappar, src/components/betalningar/inkorg-harledningar.ts:365–389: avgift = avgiftKvar, allt = kvar); rader utan kandidat och raderna i 'Behöver din hand' rörs inte; per-rad-redigering efteråt fungerar som förut. Mekaniken finns redan i den skarpa hooken: sattGenvag/aktivGenvag (src/components/betalningar/useBekraftelsesteg.ts:255–266, kontrakterade i bekraftelsesteg-modell.ts:82,86) utan konsument i VariantC; UI-förlagan BeloppsgenvagsKnappar (radfalt.tsx:22–61) lever bara i A/B som rivs i 402.6 — porta formen, riv inte förlagan här. Historik: konvergensvarv 12 rev 'Ändra för alla'-blocket (Marcus: 'Vad ska hon med det till egentligen?'); denna smalare form är Marcus omprövning 2026-09-06 ('i 8 av 10 fall betalar de anmälningsavgiften först, ibland allt direkt'). Facit: nya facit-bilder för berörda lägen + AMENDERING-fil per ADR-102, ariaSnapshot-referenserna omtagna; 402.3 AC #10 görs om på den nya formen; 402.6 (stämpel + rivning) ska bero på denna skiva.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pillsen Förfallen och Obekräftad renderas inte i bekräftelsestegets kort, varken ihopfällt eller öppet, inte heller i Behöver-din-hand-högen; inkorgens pills är oförändrade
- [ ] #2 Ett namn längre än kortets utrymme klipps med ellips på en rad (test med ett 60-teckens namn på desktop 1440 och iPad 820); kortets höjd och övriga element är oförändrade; fullständigt namn nås via title-attribut eller sr-only
- [ ] #3 Under listan finns 'Sätt alla belopp:' med knapparna Anmälningsavgift och Hela beloppet; ett tryck sätter varje markerad rads belopp till radens egen kandidat (avgiftKvar respektive kvar); rader utan kandidat och Behöver-din-hand-högen rörs inte; avstämningen och summaraden räknar om
- [ ] #4 Appens förslag per rad står kvar tills en knapp trycks; per-rad-redigering efteråt fungerar som förut; knapparna nås med tangentbord, bär tydliga namn för skärmläsare och trycket annonseras i statusraden; axe-svep utan fel
- [ ] #5 Nya facit-bilder för de berörda lägena och en AMENDERING-fil i tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/; ariaSnapshot-referenserna omtagna; api-pure-tester täcker sätt-alla-regeln inklusive rad utan kandidat
- [ ] #6 Marcus har granskat den nya formen mot facit-bilderna på desktop 1440 och iPad 820 (ersätter 402.3 AC #10:s granskning på den gamla formen)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
