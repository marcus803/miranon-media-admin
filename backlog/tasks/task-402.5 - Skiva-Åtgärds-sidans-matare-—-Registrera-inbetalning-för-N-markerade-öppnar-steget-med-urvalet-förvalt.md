---
id: TASK-402.5
title: >-
  Skiva: Åtgärds-sidans matare — 'Registrera inbetalning för N markerade' öppnar
  steget med urvalet förvalt
status: To Do
assignee: []
created_date: '2026-09-05 19:02'
labels:
  - ready-for-agent
dependencies:
  - TASK-402.3
parent_task_id: TASK-402
ordinal: 701000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Åtgärds-sidans betalningsblock får knappen 'Registrera inbetalning för N markerade' som öppnar bekräftelsesteget med de markerade personernas anmälningar som rader (sök-parametern ids). Per-person-panelen står kvar för läsning, enstaka registrering och återbetalning. Tillbaka-pilen från steget återvänder till Åtgärds-sidan med markeringen kvar. Obekräftade anmälningar registreras som vanligt och förblir märkta Obekräftad (beslut 5). Täcker användarberättelser: 22, 23.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Betalningsblocket visar 'Registrera inbetalning för N markerade' när minst en person är markerad; knappen navigerar till bekräftelsesteget med de markerade personernas anmälnings-ID:n som ids
- [ ] #2 Steget öppnat från Åtgärds-sidan är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'utgångsläget'
- [ ] #3 Tillbaka-pilen från steget återvänder till Åtgärds-sidan med markeringen kvar
- [ ] #4 Per-person-panelen (läsning, enstaka registrering, återbetalning) är oförändrad
- [ ] #5 Obekräftade anmälningar i urvalet registreras och förblir märkta Obekräftad; ingen bekräftelse skickas
- [ ] #6 Staging-e2e (samma skarv som Åtgärds-sidans kvitto-test) täcker knappen, navigationen och tillbaka-pilen med axe-svep utan fel
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
<!-- DOD:END -->
