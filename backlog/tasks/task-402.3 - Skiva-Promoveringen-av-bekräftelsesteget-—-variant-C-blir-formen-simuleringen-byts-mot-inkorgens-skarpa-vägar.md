---
id: TASK-402.3
title: >-
  Skiva: Promoveringen av bekräftelsesteget — variant C blir formen,
  simuleringen byts mot inkorgens skarpa vägar
status: To Do
assignee: []
created_date: '2026-09-05 19:02'
updated_date: '2026-09-05 19:19'
labels:
  - ready-for-agent
dependencies:
  - TASK-402.2
parent_task_id: TASK-402
ordinal: 699000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bekräftelsesteget på /mer/betalningar/registrera renderar variant C:s form ovillkorligt (ADR-103 B2 steg 1) och registrerar på riktigt: steget tar anmälnings-ID:n ur sök-parametern ids, hämtar de öppna betalningarna via inkorgens läsväg och bygger raderna; 'Registrera N inbetalningar' registrerar raderna en i taget via inkorgens registreringsväg (en post per rad, samma kontrakt och idempotensregler som enradsregistreringen, inget batch-kontrakt), med sidan stilla under körningen (ögonblicksbild bär listan, dimmad och upptagen, knappen bär spinnern med skärmläsarbesked, tipsraden bär räkningen 'k av N registrerade …' som förloppsindikator som kan frågas men inte annonseras per steg, summan ur ögonblicksbilden) och resultatet ritat en gång när alla svarat: det delade 'Registrerat nu'-blocket på listans plats, statusraden 'N inbetalningar registrerade, M kunde inte registreras', fallerade rader kvar i listan med felet och knappen 'Försök igen' som kör bara dem. 'Registrera och skicka N kvitton' (även Ctrl/⌘+Enter) köar kvittona direkt via inkorgens köväg; 'Skicka N kvitton' och 'Förhandsgranska' under blocket och Ångra-dialogen använder inkorgens befintliga vägar. Statusraden annonserar start och slut. Varianterna A och B, växlaren och simuleringslagret finns kvar bakom DEV tills Marcus stämpel (rivs i egen skiva). Skivan avslutas med ariaSnapshot-paret (variant-läget före flippen mot den promoverade ytan efter), iPad 820-granskning av Marcus, och ett staging-skarpbevis med tio rader. Täcker användarberättelser: 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25, 26, 28, 29, 30, 33.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bekräftelsesteget är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'utgångsläget' (rubrik, statusrad, listan grupperad per event med kortet som kryssruta, beloppet platt med chevron, 'Behöver din hand', avstämning, summaraden 'N inbetalningar', tipsraden, de två knapparna)
- [ ] #2 Under körningen är sidan identisk med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'körningen pågår': sidhöjden är konstant från knapptryck till resultat (mätt), listan dimmad och aria-busy, korten tar inga tryck, spinnern i den tryckta knappen, räkningen 'k av N registrerade …' som role=progressbar, statusraden 'Registrerar N inbetalningar …'
- [ ] #3 Efter registreringen är sidan identisk med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'efter Registrera' respektive 'efter Registrera och skicka', inklusive statusradens utfallstext, fallerad rad kvar i listan med felet och knappen 'Försök igen'
- [ ] #4 Ångra öppnar dialogen identisk med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'Ångra-dialogen'; raden går tillbaka till listan efter 'Ångra registreringen'
- [ ] #5 Varje rad registreras via inkorgens befintliga registreringsväg med samma kontrakt som enradsregistreringen; kvittona köas via inkorgens befintliga köväg; ingen ny Edge Function och inget batch-kontrakt
- [ ] #6 En rad vars anrop fallerar stannar i listan med felet, de övriga registreras ändå, och 'Försök igen' kör enbart de fallerade raderna
- [ ] #7 Kortets formulär är det delade registreringsformuläret i Klar/Avbryt-läge; Avbryt återställer radens värden
- [ ] #8 Tillgänglighet: statusraden är polite och annonserar start och slut (aldrig per rad); räkningen är role=progressbar med aria-valuenow/-valuemax/-valuetext; kortet bär 'Markerad'/'Inte markerad' för skärmläsare; Ångra-knapparna bär personens namn; axe-svep utan fel
- [ ] #9 ariaSnapshot-paret per yta (variant-läget FÖRE flippen mot den promoverade ytan EFTER) är taget och identiskt; paret deklareras som 'referenser' i facit.json via en AMENDERING-fil (manifestet är agent-fruset)
- [ ] #10 Marcus har granskat den promoverade ytan mot facit-bilderna på desktop 1440 och iPad 820 (iPad-formen bokförs som amendering-bilder i facit-katalogen)
- [ ] #11 Staging-skarpbevis: tio rader registrerade via steget, kvitton köade, inbetalningarna verifierade i Postgres och basens spegel; staging-e2e (samma skarv som inkorgens utskicksflödes-test) täcker körningen, resultatet, fallerad rad, omkörning, Ångra-dialogen och kvittokön; api-pure täcker avstämning, summering, gruppering, 'vad kan registreras nu' och omkörnings-urvalet
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
- [ ] #5 Promoveringsgrinden grön: ariaSnapshot-par (variant-läget FÖRE flippen mot den promoverade ytan EFTER) utan skillnad, och visual-baslinjen omtagen på den godkända ytan efter Marcus stämpel (ADR-103 B4)
- [ ] #6 Staging-skarpbevis: tio rader registrerade via steget mot staging med kvitton köade, inbetalningarna verifierade i Postgres och basens spegel
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
FÖRKRAV (S121 paus 3, 2026-09-05): samma som 402.2 — prototypgrenen proto/s121-bekraftelsesteget (draft-PR #2325) måste vara landad på main (eller vara skivans bas). AC #10 (Marcus granskning desktop + iPad) är ett Marcus-moment: i AFK byggs allt annat och skivan lämnas med AC #10 öppet och en granskningsvy (dev-server-adress + facit-bilder) i kortets notes.
<!-- SECTION:NOTES:END -->
