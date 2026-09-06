---
id: TASK-406
title: >-
  Fynd: 'Avbryt' i det delade registreringsformuläret missar efter
  beloppsinmatning — knappen flyttar 29 px vid blur mellan mousedown och mouseup
  (inkorgen och bekräftelsesteget)
status: To Do
assignee: []
created_date: '2026-09-06 00:28'
labels:
  - ready-for-human
dependencies: []
ordinal: 707000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mätt av bygg-agenten i TASK-402.3 (2026-09-06, PR #2362, Opus): efter en beloppsinmatning i RegistreraForm (delad sedan TASK-402.2) flyttar 'Avbryt'-knappen 29 px (612,75 → 641,75 px) när fältet blurrar — utfallsrutan får sitt innehåll och trycker ner knappraden mellan mousedown och mouseup, så klicket träffar inget. Gäller inkorgens radformulär lika mycket som bekräftelsestegets kort; INTE infört av 402.3. Föreslagen fix: reserverad höjd på utfallsrutan (eller att blurren inte ändrar layout före pointerup). Det är en FORMÄNDRING på en facit-låst yta (s121-bekraftelsesteget-konvergens, inkorgens facit) och behöver facit-prövning + AMENDERING (ADR-102 B5/R3) — därför ready-for-human: Marcus väljer form.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reproduktion i staging-e2e: belopp matas in, Avbryt trycks direkt, formuläret stänger och värdena återställs — rött före fix, grönt efter
- [ ] #2 Fixen ändrar inte layouten i något av facitets fem lägen (ariaSnapshot-paret och pixelmätning mot facit-bilderna) eller bokförs som AMENDERING med bild
- [ ] #3 Inkorgens radformulär verifierat lika (samma delade komponent), befintliga e2e gröna
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
