---
id: TASK-414.7
title: 'Skiva: QA-vandring — demoläget ände till ände med Marcus och Lotta'
status: To Do
assignee: []
created_date: '2026-09-06 10:40'
labels:
  - ready-for-human
dependencies:
  - TASK-414.1
  - TASK-414.2
  - TASK-414.3
  - TASK-414.4
  - TASK-414.5
  - TASK-414.6
parent_task_id: TASK-414
ordinal: 722000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Manuell testplan, Marcus vid skärmen först och sedan Lotta (desktop 1440 och iPad 820):
1. Öppna prod-appen, Mer-menyn, tryck Demo — demoappen öppnas i ny flik, färdiginloggad, listen syns överst, statusen 'Gör i ordning demot …' passerar och inkorgen visar Lottas morgon (tio öppna betalningar över tre event).
2. Markera fem personer i två event, bulkregistrera med Anmälningsavgift, registrera och skicka — kvitton köas, skickas, får kvittonummer ur stagings serie; förhandsgranska ett kvitto: vattenstämpeln DEMO syns.
3. Ångra en rad — dialogen, raden tillbaka, inbetalningen borta.
4. Importera exempel-kontoutdraget — de fyra tillstånden, registrera resten.
5. Åtgärds-sidan: markera tre, registrera för markerade.
6. Tryck Börja om — startläget är tillbaka rad för rad (jämför mot punkt 1).
7. Stäng fliken, öppna Demo igen från Mer-menyn — startläget igen utan att trycka något.
8. Kontrollera i staging: inga mail till människor (jobbloggen visar Resend-testadresser), och i prod: inga nya rader i inbetalningar/kvitton och ingen aktivitet i Lottas bas under hela vandringen.
9. Nästa morgon: nattkörningen har återställt (jobbloggen), demot står i startläget.
10. Lotta gör punkt 1–7 själv utan instruktion; varje ställe hon tvekar bokförs som fynd.
Fynd → nya kort med exakt symptom och förväntat beteende.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Samtliga tio punkter genomgångna av Marcus och punkt 1–7 av Lotta, på desktop 1440 och iPad 820, med utfall per punkt i kortets notes
- [ ] #2 Prod-kontrollen i punkt 8 är gjord och bokförd: noll nya rader i prods inbetalningar och kvitton, noll ändringar i Lottas bas under vandringen
- [ ] #3 Alla fynd registrerade som egna kort; inget löst tyst i denna skiva
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
