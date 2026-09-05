---
id: TASK-401
title: >-
  Fynd: DetaljGrupp renderar dt/dd utanför en dl (delad biblioteks-komponent)
  och RegelChip saknar print-kant — review-fynd på #2312, avskrivna vid
  landningen
status: To Do
assignee: []
created_date: '2026-09-05 17:11'
labels:
  - ready-for-agent
dependencies: []
ordinal: 695000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FYND (review-agent runda 1 på PR #2312 / TASK-390, 2026-09-05, utlåtande med risk lag; två info-fynd med action ask-user, avskrivna vid landningen på Marcus AFK-mandat samma dag och registrerade här per ADR-053: blockerar ej + värdefullt). (1) src/components/events/detail/DetaljGrupp.tsx rad ~30: containern som bär EtikettVardeRad-parens dt/dd är en vanlig div (data-testid grupp-kort), inte en dl. Enligt HTML5 content model är dt/dd giltiga bara som barn till en dl (direkt eller via en div-gruppering av dt/dd-par inuti dl:en); fristående dt/dd kan tappa term/definition-relationen i vissa hjälpmedel. Pre-existerande mönster i en DELAD komponent som konsumeras på eventsidorna (DetaljGrupp) och segmentets detaljvy (VariantD.tsx, RegelStruktur + Räknas ur-raden) — fixen hör hemma i DetaljGrupp.tsx och drar med sig aria-fixturerna för alla konsumerande ytor, därför eget kort. (2) src/components/segment/prototyp/VariantD.tsx rad ~793: RegelChip (den gröna, ingår-varianten) saknar print:border-success medan RegelChipDampad fick print:border-border i TASK-390 iteration 3; inget WCAG 1.4.1-brott (ikonform + sr-only-text särskiljer redan), en konsekvensfråga mellan syskonen. Källor: review-utlåtande r1 för #2312 (instrumenteringsloggen docs/reference/review-instrumentering.jsonl, tidsstämpel 2026-09-05T17:10:32Z) · S120 sessionsdok Del 6 · MDN/WHATWG HTML content model för dl/dt/dd.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DetaljGrupp.tsx: dt/dd-paren bärs av en dl enligt HTML-specen (dl som container, eller dt/dd-par grupperade i div inuti en dl); befintliga testid-attribut och layout oförändrade; alla konsumerande ytors aria-fixturer (tests/visual/__aria__/**) uppdaterade medvetet i samma landning med diffen redovisad.
- [ ] #2 RegelChip i VariantD.tsx bär en print-kant symmetrisk med RegelChipDampad (print:border-success eller motsvarande token); print-läget mätt på 1440 och 375.
- [ ] #3 typecheck 0, biome 0 nya fel, build grön, långa-streck-grinden grön, segment-promoverings-grinden och eventsidornas visual-grindar gröna efter fixtur-uppdateringen.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
