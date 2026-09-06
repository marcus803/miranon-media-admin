---
id: TASK-414.2
title: >-
  Skiva: Appens demoläge — VITE_APP_LAGE=demo, listen Demo. Inget sparas på
  riktigt, inga mail skickas. med Börja om och Tillbaka till appen
status: To Do
assignee: []
created_date: '2026-09-06 10:37'
labels:
  - ready-for-agent
dependencies:
  - TASK-414.1
parent_task_id: TASK-414
ordinal: 717000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
När appen byggs med VITE_APP_LAGE=demo vet den att den är demoappen: överst på varje sida ligger en permanent list, 'Demo. Inget sparas på riktigt, inga mail skickas.', med knappen Börja om (anropar aterstall-demo och laddar om till inkorgen i startläget) och knappen Tillbaka till appen (öppnar prod-adressen). Listen renderas ovillkorligt i demoläget och aldrig utanför det; den är en del av layouten (ingen overlay), följer husets notistrappa (ADR-121) för sin ton och klarar prefers-contrast och skärmläsare. Vid inträde (första sidladdning i demoläget) anropas aterstall-demo en gång innan inkorgen visas, med en synlig status 'Gör i ordning demot …'. Läsning av läget går genom EN funktion i funktionsflaggor-modulen, som betalningarPa. Täcker användarberättelser: 3, 4, 11, 12, 13.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Byggt med VITE_APP_LAGE=demo visar appen listen överst på varje autentiserad sida; byggt utan visar den ingenting (tvåsidigt bevis i acceptanstest med båda värdena)
- [ ] #2 Börja om anropar aterstall-demo, visar synlig status under körningen och landar i inkorgen i startläget (staging-e2e mot fixturen från 414.1)
- [ ] #3 Tillbaka till appen öppnar prod-adressen (konfigurerad, inte hårdkodad) och listen bär tydliga tillgängliga namn; axe-svep utan fel; prefers-contrast: more ger full kontur
- [ ] #4 Vid första sidladdning i demoläget körs aterstall-demo en gång före inkorgen; en omladdning utan Börja om kör den inte igen (mätt i nätverksloggen)
- [ ] #5 Den befintliga staging-bundelgrinden får sin spegelbild: ett demobygge får inte bära prods host och ett prodbygge inte stagings, tvåsidigt bevisat
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — bygget i demoläget bär inte prods Supabase-host (spegelbild av check-staging-bundle, båda riktningar)
- [ ] #5 Inget mail når en människa — demoläget ändrar inga mottagaradresser; spärren i staging står kvar
<!-- DOD:END -->
