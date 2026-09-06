---
id: TASK-414.1
title: >-
  Skiva: Demofixturen Lottas morgon i staging, purge-undantaget och
  återställningen aterstall-demo med nattkörning
status: To Do
assignee: []
created_date: '2026-09-06 10:35'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-414
ordinal: 716000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lotta ska hitta samma tio öppna betalningar i demot varje gång hon öppnar det. Skivan flyttar prototypens berättelse 'Lottas morgon' (tre kommande event, tio personer och anmälningar, åtta swish och två bankgiro, sex anmälningsavgifter och fyra slutbetalningar — ordagrant ur prototypens fixturfil) till ett seed-skript i seed:review-familjen som skapar fixturen i stagings Airtable-bas och Postgres: riktig svensk ort (inte ZZ-), RFC 2606-adresser i basen men Resend-testadresser med etikett (delivered+namn@resend.dev) som mottagaradress, ingen livstidsstämpel (förfallo-svepet rör den aldrig), och ett dokumenterat undantag i purge-policyn som säger varför den inte får matcha någon target. Seed-definitionen bär tenant_key demo från dag ett. Skivan bygger även Edge Function aterstall-demo i staging: idempotent, raderar demofixturens inbetalningar, kvitton och jobb i Postgres och återställer spegelfälten på fixturens anmälningar, lämnar grunddatan orörd; anropbar av demoanvändaren; schemalagd nattligen via pg_cron på samma sätt som jobb_cron_tick. Prototypens simuleringslager rörs inte här (rivs i TASK-402.6). Täcker användarberättelser: 5, 6, 11, 12, 17, 18.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run seed:demo skapar fixturen i staging idempotent (andra körningen ändrar ingenting) med bas-guard mot prod; fixturens event har riktig ort, personerna RFC 2606-adresser och Resend-testadresser med etikett som mottagare; ingen purge-target och inte förfallo-svepet matchar den (bevisat med purge-skriptets torrkörning och seed:review --sweep --dry-run)
- [ ] #2 Edge Function aterstall-demo i staging återställer fixturen till startläget: två körningar i rad ger samma rad-för-rad-tillstånd i Postgres (inbetalningar, kvitton, jobb) och i spegeln (Summa inbetalt, Saknas), mätt och bokfört i kortet
- [ ] #3 aterstall-demo körs nattligen via pg_cron i staging; körningen syns i jobbloggen; funktionen avvisar anrop från andra än demoanvändaren
- [ ] #4 Purge-policyn bär ett dokumenterat undantag för demofixturen med skäl; staging-CI:s setup-purge lämnar fixturen orörd (bevisat i en CI-körning)
- [ ] #5 Seed-definitionen bär tenant_key demo och är återanvändbar av den hermetiska testvärlden (TASK-409) som datakälla utan att dela mekanism
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — seed-skriptets bas-guard fäller på prods bas-ID och prods Supabase-ref; bevisat tvåsidigt
- [ ] #5 Inget mail når en människa — demopersonernas mailadresser är Resend-testadresser med etikett
<!-- DOD:END -->
