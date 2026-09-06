---
id: TASK-414.4
title: >-
  Skiva: Mailspärren accepterar Resends etikett-adresser och demopersonerna får
  delivered+namn@resend.dev
status: To Do
assignee: []
created_date: '2026-09-06 10:38'
labels:
  - ready-for-agent
dependencies:
  - TASK-414.1
parent_task_id: TASK-414
ordinal: 719000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Demot ska visa 'Kvitto skickat' sanningsenligt. I dag matchar mailspärren utanför prod mottagaradressen exakt mot en lista av fyra Resend-testadresser och avvisar allt annat, inklusive Resends dokumenterade etikettform (delivered+etikett@resend.dev) — så åtta demokvitton hade gått till samma adress eller fallerat. Skivan gör matchningen till ett mönster som accepterar etiketten på just Resends testdomän (förstapartsdokumentationen om test emails och labeling citeras i koden), lämnar prods väg orörd (ingen spärr där, som i dag), och ger demofixturens personer varsin etikettadress så att jobbmotorn rapporterar skickat per person och Resends logg kan skilja dem åt. Gäller varje staging-verifiering av bulkutskick, inte bara demot (research-passets fynd 2). Täcker användarberättelser: 6, 15.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Spärren accepterar delivered+<etikett>@resend.dev, bounced+…, complained+… enligt Resends dokumentation och avvisar fortfarande varje annan adress med dagens felmeddelande; tvåsidigt enhetstest i EF-lagrets testsvit
- [ ] #2 Prods väg är oförändrad: ENVIRONMENT=production passerar utan spärr, bevisat i test
- [ ] #3 Demofixturens tio personer bär varsin etikettadress (seed-definitionen i 414.1 uppdaterad) och en skarp körning i staging visar tio skickade kvitton med tio olika mottagare i jobbloggen och i Resends logg
- [ ] #4 Alla anropsställen som delar spärren (send-bulk och kvittoutskicket) går genom samma mönstermatchning; ingen kopia
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — ändringen i spärren är miljöoberoende kod men aktiveras bara utanför prod; prods beteende bevisat oförändrat i test
- [ ] #5 Inget mail når en människa — tvåsidigt bevis: etikettadress accepteras, okänd adress avvisas med samma fel som i dag
<!-- DOD:END -->
