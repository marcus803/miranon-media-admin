---
id: TASK-402.1
title: >-
  Skiva: Markera-läget i betalningsinkorgen — eventdetaljens form, Registrera N
  öppnar steget
status: To Do
assignee: []
created_date: '2026-09-05 19:02'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-402
ordinal: 697000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lotta trycker Markera i betalningsinkorgen; varje öppen rad i alla eventgrupper får ett kryss (klara rader har inget), en åtgärdsrad visar 'Registrera N' som primär knapp, 'Markera alla synliga' och 'Rensa', och Esc avbryter läget. I läget bockar ett tryck på raden i stället för att öppna radformuläret. Markeringen bevaras när hon söker eller filtrerar, räknaren 'N markerade' syns även när markerade rader är bortfiltrerade, och markeringen ligger i ett sessionsbundet markeringsminne så den finns kvar när hon går till bekräftelsesteget och tillbaka; den rensas vid registrering, Rensa eller när hon lämnar betalningsfamiljen. 'Registrera N' navigerar till bekräftelsesteget med de markerade anmälningarnas ID:n i sök-parametern ids. Formen ärvs från eventdetaljens markera-läge — samma knappar, samma åtgärdsrad, samma grammatik (S121 Del 2 beslut 6). Täcker användarberättelser: 1, 2, 3, 4, 6, 27.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Markera-läget i inkorgen är identiskt med eventdetaljens markera-läge i form (Markera-knappen, kryss per öppen rad, åtgärdsraden med 'Registrera N' primär, 'Markera alla synliga', 'Rensa', Esc avbryter, tryck på rad bockar) — mätt med DOM-jämförelse mot eventdetaljen, inte ögonmått
- [ ] #2 Markeringen bevaras över sök och filter i inkorgen; räknaren 'N markerade' visar rätt tal även när alla markerade rader är bortfiltrerade
- [ ] #3 Klara rader (inget kvar att betala) saknar kryss och kan inte markeras
- [ ] #4 'Registrera N' navigerar till /mer/betalningar/registrera med ids satt till de markerade anmälningarnas ID:n; tillbaka-pilen från steget återvänder till inkorgen med markeringen kvar
- [ ] #5 Markeringsminnet rensas vid registrering, vid Rensa och vid navigation utanför betalningsfamiljen — bevisat i staging-e2e
- [ ] #6 Staging-e2e (samma skarv som inkorgens utskicksflödes-test) täcker markera, filtrera, räknare, Registrera N, Esc och tillbaka-pilen, med axe-svep utan fel; api-pure täcker markeringsminnets regler som rena funktioner
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
