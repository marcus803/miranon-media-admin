---
id: TASK-402.7
title: 'Skiva: QA-vandring — bekräftelsesteget, tre matare, i staging med Marcus'
status: To Do
assignee: []
created_date: '2026-09-05 19:03'
labels:
  - ready-for-human
dependencies:
  - TASK-402.1
  - TASK-402.2
  - TASK-402.3
  - TASK-402.4
  - TASK-402.5
  - TASK-402.6
parent_task_id: TASK-402
ordinal: 703000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Manuell testplan i staging, Marcus vid skärmen (desktop 1440 och iPad 820):
1. Inkorgen: tryck Markera, bocka fem rader i två event, sök så att två markerade försvinner — räknaren säger '5 markerade'; Rensa nollar; Esc lämnar läget.
2. Markera tio rader, tryck 'Registrera 10' — steget öppnas med tio kort grupperade per event, alla markerade, beloppen förslagna; tryck tillbaka-pilen — inkorgen har markeringen kvar; tryck 'Registrera 10' igen.
3. Öppna ett kort via beloppet, ändra belopp och betalsätt, Klar; öppna ett annat, ändra, Avbryt — värdena återställs; avmarkera ett kort — avstämningen räknar om.
4. Tryck 'Registrera 9 inbetalningar' — sidan står stilla, räkningen tickar, resultatet ritas en gång: blocket överst, statusraden med utfallet, eventuell fallerad rad kvar med 'Försök igen'.
5. Tryck 'Skicka N kvitton' — raderna går köat → skickas → skickat med kvittonummer; statusraden 'N kvitton skickade'; Förhandsgranska öppnar kvittot.
6. Ångra en rad — dialogen; Behåll; Ångra igen — 'Ångra registreringen'; raden tillbaka i listan; inbetalningen borta i Postgres.
7. Ny omgång: 'Registrera och skicka N kvitton' — kvittona går direkt utan extra tryck.
8. Importera ett kontoutdrag med säker, osäker, omatchad och dubblett — steget visar de fyra tillstånden; dubbletten går inte att registrera; registrera resten.
9. Åtgärds-sidan: markera tre personer, 'Registrera inbetalning för 3 markerade' — steget med tre rader; registrera; tillbaka-pilen med markeringen kvar; en obekräftad förblir Obekräftad.
10. Skärmläsare (VoiceOver): start och slut annonseras, räkningen kan frågas, korten läses som kryssrutor, Ångra-knapparna bär namn.
11. Verifiera i Postgres och basens spegel att inbetalningarna, facken och kvittonumren stämmer.
Fynd → nya kort med exakt symptom och förväntat beteende.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Samtliga elva punkter i testplanen är genomgångna av Marcus i staging på desktop 1440 och iPad 820, med utfall per punkt bokfört i kortets notes
- [ ] #2 Alla fynd är registrerade som egna kort med symptom och förväntat beteende; inget fynd är löst tyst i denna skiva
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
