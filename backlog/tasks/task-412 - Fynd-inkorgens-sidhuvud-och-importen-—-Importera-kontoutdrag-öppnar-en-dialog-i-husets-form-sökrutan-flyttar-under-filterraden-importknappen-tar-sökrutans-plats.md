---
id: TASK-412
title: >-
  Fynd: inkorgens sidhuvud och importen — Importera kontoutdrag öppnar en dialog
  i husets form, sökrutan flyttar under filterraden, importknappen tar sökrutans
  plats
status: To Do
assignee: []
created_date: '2026-09-06 09:59'
updated_date: '2026-09-06 10:12'
labels:
  - ready-for-agent
dependencies:
  - TASK-410
ordinal: 714000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus prod-granskning 2026-09-06 (S121 resume 4, QA-vandringen TASK-402.7 påbörjad i prod), två fynd i samma sidhuvud. (1) IMPORTEN SOM DIALOG. Marcus: 'När jag trycker på Importera kontoutdrag så kommer den rutan upp nedanför filtreringskomponenten när den är utfälld, det är inte bra. Jag vill istället att när jag trycker importera kontoutdrag så öppnas en dialogruta i husets form.' Fakta: importytan renderas inline i inkorgen när visaImport är sant (src/components/betalningar/BetalningsInkorg.tsx:582 state, rad 1664 <SwishImport oppna={rader} onStang={stangImport} />), under filterraden och listan; knappen göms medan ytan är öppen (rad 1531). SwishImport (src/components/betalningar/SwishImport.tsx) bär filväljaren, kolumnmappningen ('mappningsdialogen' är en inline-sektion, INTE en Dialog-komponent — grep ger inga Modal/Dialog-anrop i filen), signaturen, bankminnet och matchningen; sedan skrivs importminnet och den NAVIGERAR till bekräftelsesteget (§ ÖVERLÄMNINGEN). Husets form: Modal-primitiven (src/components/primitives/Modal.tsx, ADR-044: react-aria overlay, fokus-trap, Esc, fokus-retur) komponerad med Dialog (src/components/primitives/Dialog.tsx, size sm/md/lg) — samma par som Ångra-dialogen i RegistreratNuBlock.tsx, SegmentMailCompose.tsx och AtgardsSida.tsx. Krav: HELA importytan (fil → mappning → matchning) lever som steg INUTI EN dialog, aldrig dialog-i-dialog; dialogen stängs när överlämningen navigerar till steget; avbryt återställer inget bankminne (minnet är sparat med avsikt, § ÖVERLÄMNINGEN). Sidhöjden under filterraden påverkas inte längre av importen. (2) SIDHUVUDETS RYTM. Marcus: 'nu när vi ska ha filtreringskomponenten utfälld som default så tror jag vi ska flytta ner sökrutan till under filtreringskomponenten istället för över, och knappen importera kontoutdrag kan placeras där sökrutan är just nu.' Fakta: FilterRad-primitiven (src/components/primitives/FilterRad.tsx) har en övre rad [children flex-1][gap-4][tratt] (rad ~245–250) där inkorgen lägger sökfältet som children (BetalningsInkorg.tsx:1603), och panelen med dimensionerna fälls ut UNDER (DisclosurePanel, mt-6 rounded-2xl bg-bg-muted p-4). Sidhuvudet (rad 1465–1560) bär i dag rubriken + Importera-knappen + ett tomt spegel-spår som linjerar knappens högerkant med sökrutans (Marcus dom 2026-09-01, kommentarblocket) — den domen ersätts nu ÖPPET: knappen flyttar in i filterradens övre rad (children-slotten), sökfältet blir en egen rad under den utfällda panelen, och sidhuvudet behåller bara rubriken. Skriv om kommentarblocket så att 2026-09-01-domen och 2026-09-06-omprövningen båda står kvar med skäl; riv spegel-spåret om det inte längre linjerar något. Beroende: TASK-410 (filterraden utfälld) — bygg ovanpå 410:s gren. Inkorgen har inget facit-lås. Tillgänglighet: sökfältets etikett/landmärke oförändrat, dialogens rubrik är dialogens namn, fokus går in i dialogen vid öppning och tillbaka till knappen vid stängning (Modal-primitiven sköter det — verifiera i test).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ett tryck på Importera kontoutdrag öppnar en dialog i husets form (Modal + Dialog) med filväljaren; kolumnmappning och matchning sker som steg inuti samma dialog; ingen dialog-i-dialog; sidan under filterraden ändrar inte höjd
- [ ] #2 Överlämningen till bekräftelsesteget fungerar som förut (importminnet skrivs, sedan navigering) och dialogen är stängd när steget visas; Esc/Avbryt stänger utan att röra bankminnet
- [ ] #3 Fokus flyttas in i dialogen vid öppning och tillbaka till knappen vid stängning; dialogen bär rubrik som namn; axe-svep utan fel; befintliga import-tester (bankimport-parser, staging-e2e för importen om berörd) gröna och ett test täcker dialogens öppning/stängning
- [ ] #4 Importera-knappen är borta ur sidhuvudet och sökrutan står KVAR i filterradens övre rad; till höger om tratten sitter en rund ikon-knapp med tre prickar (samma mått och klasser som tratten, tydligt tillgängligt namn) som öppnar husets Meny med posten Importera kontoutdrag, vilken öppnar dialogen; sidhuvudet bär bara rubriken; kommentarblocket om 2026-09-01-domen amenderat och spegel-spåret rivet; övriga FilterRad-konsumenter oförändrade
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
OMPRÖVNING 2026-09-06 (Marcus, efter kortets mintning, ersätter beskrivningens del (2) om sökrutans flytt): 'Jag vet inte om de där med att flytta sökrutan blir bra när jag tänker efter. Jag tror vi kan behålla det som det är MEN vi tar bort knappen Importera kontoutdrag och skapar istället en rund ikon med tre prickar bredvid filtreringsikonen (till höger) som öppnar vår dropdown där det står Importera kontoutdrag. … jag vill liksom ha det lite renare upptill.' Alltså: sökrutan FLYTTAS INTE. Importera-knappen bort ur sidhuvudet. En rund ikon-knapp (lucide Ellipsis, samma mått/klasser som tratten — FilterRad.tsx:254–258, p-2.5 + 18 px ikon) till HÖGER om tratten öppnar husets Meny (src/components/primitives/Meny.tsx, MenuTrigger/Menu/MenuItem; förlagor: src/components/betalningar/InbetalningsLista.tsx rad ~646 och src/components/dokument/DokumentYta.tsx) med posten 'Importera kontoutdrag' som öppnar dialogen i del (1). FilterRad-primitiven behöver troligen en slot för en extra ändknapp efter tratten — lägg den som prop utan att ändra andra konsumenters utseende. Del (1), dialogen, står oförändrad. AC #3 (den gamla flytten) är borttaget; det nya kriteriet ligger sist i listan.
<!-- SECTION:NOTES:END -->
