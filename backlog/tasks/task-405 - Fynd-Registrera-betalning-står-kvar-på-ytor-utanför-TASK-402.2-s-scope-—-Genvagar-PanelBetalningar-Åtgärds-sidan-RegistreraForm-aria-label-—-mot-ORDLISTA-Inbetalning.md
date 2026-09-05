---
id: TASK-405
title: >-
  Fynd: 'Registrera betalning' står kvar på ytor utanför TASK-402.2:s scope —
  Genvagar, PanelBetalningar/Åtgärds-sidan, RegistreraForm-aria-label — mot
  ORDLISTA Inbetalning
status: To Do
assignee: []
created_date: '2026-09-05 21:55'
labels:
  - ready-for-agent
dependencies: []
ordinal: 706000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fött ur review-loopen på PR #2360 (TASK-402.2, 2026-09-05). Skivan bytte etiketten till 'Registrera inbetalning' på anmälans betalningsyta (AnmalansBetalningar.tsx) och personkortet (PersonBetalningar.tsx) per AC #4; OmbokningsKvitto.tsx:s TillBetalning-knapp (som klickar triggern REGISTRERA_TRIGGER_ID) rättas i samma PR eftersom PR:en själv skapade inkonsekvensen. Kvar med 'Registrera betalning' (grep 2026-09-05): src/components/hem/Genvagar.tsx, src/components/betalningar/PanelBetalningar.tsx (Åtgärds-sidans panel, via AtgardsSida.tsx), src/components/betalningar/RegistreraForm.tsx (formulärets aria-label, delad av alla lägen), src/components/betalningar/BetalningsInkorg.tsx (inkorgens egen knapp) och kommentarer i registrations/AnmalanDetail.tsx. ORDLISTA säger Inbetalning; PRD TASK-402 berättelse 32 vill att inkorgen och steget säger samma sak. Per träff ska semantiken prövas: en panel eller rubrik som täcker BÅDE inbetalning och återbetalning får inte döpas till 'inbetalning'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Varje förekomst av 'Registrera betalning' i src/ klassad: byts (inbetalning avses) eller behålls med skäl (täcker återbetalning/generisk), bokfört i kortet
- [ ] #2 Bytena gjorda med befintliga tester/aria-fixturer uppdaterade utan ändrad avsikt; axe utan fel på rörda ytor
- [ ] #3 Inga hårdkodade dubbletter kvar: etiketten kommer ur en gemensam konstant eller prop där två ytor delar den
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
