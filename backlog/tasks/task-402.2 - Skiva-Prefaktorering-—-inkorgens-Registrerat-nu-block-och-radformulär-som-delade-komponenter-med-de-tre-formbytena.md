---
id: TASK-402.2
title: >-
  Skiva: Prefaktorering — inkorgens 'Registrerat nu'-block och radformulär som
  delade komponenter, med de tre formbytena
status: To Do
assignee: []
created_date: '2026-09-05 19:02'
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
- [ ] #1 Inkorgens 'Registrerat nu'-block är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i lägena 'efter Registrera' och 'efter Registrera och skicka' vad gäller blockets rader (namn · betalsätt · kvittoläge · belopp · åtgärder, fast höjd på åtgärdskolumnen, ingen makuleringstext per rad) och knappraden ('Skicka N kvitton' + 'Förhandsgranska' utan räknarchip)
- [ ] #2 Ångra i inkorgen öppnar dialogen identisk med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'Ångra-dialogen'; 'Behåll' stänger utan ändring, 'Ångra registreringen' raderar inbetalningen via inkorgens befintliga ångra-väg
- [ ] #3 Inkorgens registreringsformulär finns i ett delat läge med Klar/Avbryt: Klar stänger, Avbryt återställer radens värden till dem som gällde när formuläret öppnades; inkorgens eget läge (Registrera) är oförändrat
- [ ] #4 Etiketten 'Registrera inbetalning' ersätter 'Registrera betalning' på anmälans betalningsyta och personkortet; 'Registrera återbetalning' orörd
- [ ] #5 Räknarchip-primitiven är oförändrad och filterknappens badge renderar som förut (visual-baslinjen för filterraden byte-identisk)
- [ ] #6 Inkorgens befintliga tester (api-pure och staging-e2e för utskicksflödet) är gröna utan ändrad avsikt; nya fall täcker dialogen och den chip-lösa knappens tillgängliga namn
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
<!-- DOD:END -->
