---
id: TASK-410
title: >-
  Fynd: inkorgens filterrad är ihopfälld som default så Markera-knappen står
  ensam — ska vara utfälld från start
status: To Do
assignee: []
created_date: '2026-09-06 09:11'
updated_date: '2026-09-06 11:02'
labels:
  - ready-for-agent
dependencies: []
ordinal: 711000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus prod-granskning 2026-09-06 (S121 resume 4, QA-vandringen TASK-402.7 påbörjad i prod): när filterraden i betalningsinkorgen är ihopfälld står Markera-knappen ensam på raden och ser fel ut; utfälld ser raden rätt ut. Marcus: filterraden ska vara utfälld som default. Fakta: FilterRad är en primitiv (src/components/primitives/FilterRad.tsx) med internt state const [oppen, setOppen] = useState(false) på rad 222, ingen defaultOppen-/isOpen-prop i FilterRadProps (rad 58–86) och ingen persistens; inkorgen anropar den från src/components/betalningar/BetalningsInkorg.tsx:1603 med sökfältet i children. Förväntat: en explicit prop (t.ex. defaultOppen) på primitiven, satt av inkorgen, så andra konsumenter av FilterRad behåller sitt beteende; ingen global default-ändring. Inkorgen har inget facit-lås (inget facit.json för ytan), så ingen AMENDERING krävs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Betalningsinkorgens filterrad renderas utfälld vid första besöket utan att användaren tryckt på tratt-knappen; Dölj filter fungerar som förut
- [x] #2 FilterRad-primitiven bär en prop för start-läget; övriga konsumenter av FilterRad är oförändrade (grep på FilterRad-anrop bokförd i kortet)
- [x] #3 Befintliga acceptans-/e2e-tester för inkorgen gröna; ett test täcker start-läget
- [x] #4 Avståndet mellan Markera-knappens rad och filterkomponenten är 40 px (var 16 px, sektionens gap-4; ett första varv gav 24 px men räckte inte i granskning) — Marcus två varv 2026-09-06: "lägg mer luft mellan markera-knappen och filtreringskomponenten också" följt av "Jag vill ha mer luft ÖVER markera knappen, luften under är bra som det är nu." Luften UNDER (mot listan) är oförändrad 16 px.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
FilterRad-konsumenter (grep 2026-09-06, S121): src/components/betalningar/BetalningsInkorg.tsx:1603 (fick defaultOppen), src/components/aktivitetshistorik/AktivitetsHistorik.tsx:817 (oförändrad, ingen defaultOppen), src/components/events/EventsList.tsx:279 (oförändrad), src/components/registrations/AnmalningarSida.tsx:744 (oförändrad). Lösning: FilterRadProps fick en ny valfri prop defaultOppen (default false, oförändrat beteende), läst av useState vid mount. BetalningsInkorg.tsx är enda konsumenten som sätter defaultOppen (utan värde = true). Test: tests/e2e/betalningar-inkorg-markera-lage.staging.test.ts fick ett nytt describe TASK-410 som verifierar start-läget öppet + att toggling fortfarande fungerar; samma fils befintliga test som klickade 'Visa filter' för att nå panelen justerades (panelen är redan öppen nu).
<!-- SECTION:NOTES:END -->
