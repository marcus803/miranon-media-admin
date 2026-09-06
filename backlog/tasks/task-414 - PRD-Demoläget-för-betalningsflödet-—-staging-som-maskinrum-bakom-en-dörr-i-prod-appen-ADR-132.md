---
id: TASK-414
title: >-
  PRD: Demoläget för betalningsflödet — staging som maskinrum bakom en dörr i
  prod-appen (ADR-132)
status: To Do
assignee: []
created_date: '2026-09-06 10:34'
labels: []
dependencies: []
ordinal: 715000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problemformulering
Lotta behöver ett övningsrum: hela betalningsflödet (inkorgen, markera, bulkregistrera, kvitton som köas och skickas, förhandsgranska, ångra, importera ett kontoutdrag, Åtgärds-sidans matare) exakt som i den skarpa appen, utan att en enda inbetalning bokförs på riktigt och utan att ett enda mail går ut till en människa. Marcus behöver dessutom kunna visa henne 'just det vi byggde' och låta henne prova det innan det används skarpt. I dag finns inget sådant rum: prototypens simulering syntes bara på en lokal dev-server och rivs (TASK-402.6); prod-appen bokför på riktigt sedan flaggan slogs på (S113); staging kräver en annan adress och en annan inloggning, och dess fixturer städas av svep.

### Lösning
Demot är samma app, byggd av samma kod, på en egen adress som talar med staging-projektet i stället för prod. Lotta öppnar det med ett klick på 'Demo' i Mer-menyn och kommer in färdiginloggad, i en ny flik. Överst ligger en permanent list: 'Demo. Inget sparas på riktigt, inga mail skickas.' med knapparna Börja om och Tillbaka till appen. Datan är 'Lottas morgon' — tre kommande event, tio personer med öppna betalningar, åtta swish och två bankgiro — som fast fixtur i staging, och den återställs till samma startläge varje gång dörren öppnas, på Börja om, och varje natt. Kvittona byggs av samma maskineri som de skarpa, får äkta nummer ur stagings egen serie och bär en diskret vattenstämpel DEMO. Mailen går till Resends testadresser, en per demoperson, så flödet visar 'skickat' sanningsenligt utan att någon människa får post. Allt är byggt hyresgäst-neutralt så att dörren kan bytas från länk till en växel i appen när Fas E:s tenant-modell landar.

### Användarberättelser
1. Som Lotta vill jag hitta 'Demo' i Mer-menyn, så att jag vet var övningsrummet finns utan att någon behöver visa mig.
2. Som Lotta vill jag komma in i demot med ett klick, utan att logga in en gång till, så att tröskeln är noll.
3. Som Lotta vill jag se en tydlig list i demot som säger att inget sparas på riktigt och inga mail skickas, så att jag vågar trycka på allt.
4. Som Lotta vill jag att demot ser ut och beter sig exakt som den skarpa appen, så att det jag lär mig gäller när jag gör det på riktigt.
5. Som Lotta vill jag öva att markera flera personer i inkorgen och bulkregistrera deras inbetalningar, så att jag känner igen mig när kontoutdraget kommer på riktigt.
6. Som Lotta vill jag se kvitton köas, skickas och få riktiga kvittonummer, så att jag förstår vad som händer efter Registrera och skicka.
7. Som Lotta vill jag kunna förhandsgranska ett demokvitto som ser ut som ett riktigt, så att jag vet vad mottagaren får.
8. Som Lotta vill jag att demokvittot är märkt DEMO, så att jag aldrig förväxlar det med ett riktigt om jag sparar eller vidarebefordrar det.
9. Som Lotta vill jag kunna ångra en registrering i demot, så att jag ser att det går att rätta ett misstag.
10. Som Lotta vill jag kunna importera ett exempel-kontoutdrag i demot, så att jag har provat importen innan jag gör den på riktigt.
11. Som Lotta vill jag kunna trycka Börja om och få tillbaka startläget, så att jag kan öva samma sak flera gånger.
12. Som Lotta vill jag att demot står i startläget varje gång jag öppnar det, så att jag inte behöver städa efter mig eller efter någon annan.
13. Som Lotta vill jag kunna trycka Tillbaka till appen och hamna där jag var, så att demot aldrig blir en återvändsgränd.
14. Som Marcus vill jag kunna be Lotta prova just det vi byggde i går, i demot, så att hon ger återkoppling före skarp användning.
15. Som Marcus vill jag att demot aldrig kan skriva i prod-projektet eller skicka mail till en människa, mekaniskt och bevisat, så att övningsrummet inte kan skada verksamheten.
16. Som Marcus vill jag att varje del av demot är byggd hyresgäst-neutralt, så att Fas E:s tenant-modell bara byter dörren och inte river resten.
17. Som utvecklare vill jag att demofixturen aldrig städas av staging-CI:s purge eller granskningsfixturernas förfallo-svep, så att demot inte plötsligt är tomt.
18. Som utvecklare vill jag att återställningen är idempotent och mätt, så att två körningar i rad ger exakt samma tillstånd.

### Implementationsbeslut
Styrande beslut i ADR-132 (åtta beslut, fyra invarianter). Sammanfattat: (1) staging-projektet är maskinrummet — Edge Functions, jobbmotor, kvittoserie, Airtable-bas och mailspärr används som de är. (2) Dörren: Mer-menyposten Demo anropar en ny Edge Function i prod, demo-inloggning, som med stagings service-nyckel som prod-secret mintar en engångslänk (magiclink) för EN fast demoanvändare, adress-allowlistad till just den, och öppnar demoappen i ny flik med token_hash som demoappen löser in; fallback är en vanlig inloggning på demoappen om korsprojekts-mintningen inte kan bevisas säker. (3) Demoappen är en egen Vercel-yta som bygger main med stagings publika VITE-värden och VITE_APP_LAGE=demo; listen renderas ovillkorligt i det läget; adressen läggs i stagings CORS-tillåtelselista. (4) Fixturen: Lottas morgon ur prototypens fixturfil flyttas till ett seed-skript i seed:review-familjen, seedas med riktig svensk ort och RFC 2606-adresser för personerna men Resend-testadresser för mailmottagning, utan livstidsstämpel, med dokumenterat undantag i purge-policyn, och bär tenant_key demo i seed-definitionen. (5) Återställning: Edge Function aterstall-demo i staging, idempotent, raderar demofixturens inbetalningar, kvitton och jobb och återställer spegelfälten; körs vid inträde, på Börja om och nattligen via pg_cron. (6) Kvittona: samma mall, äkta nummer ur stagings serie, vattenstämpel DEMO för demoanvändaren/demomiljön — malländringen mäts mot renderad PDF, aldrig ögonmätt. (7) Mailen: demopersonerna bär delivered+namn@resend.dev; mailspärren accepterar Resends etikett-adresser via mönster i stället för exakt sträng. (8) Visningsytan under utveckling: förhandsbyggen mot demot — skivan mintas först när Marcus valt form, eftersom mätning visar att Vercels förhandsbyggen i dag bygger mot prod.

### Testbeslut
Ett bra test här bevisar externt beteende mot riktig staging, inte implementationsdetaljer: att demoappens bundel inte bär prods host (spegelbild av den befintliga staging-bundelgrinden); att aterstall-demo är idempotent (två körningar, samma rad-för-rad-tillstånd, mätt mot Postgres och spegeln); att engångslänken bara kan mintas för demoanvändaren (allowlist-test i två riktningar, förlaga: test-invite-completion); att jobbmotorn rapporterar skickat för en Resend-testadress med etikett och fel för en okänd adress (tvåsidigt); att vattenstämpeln finns i demokvittot och saknas i ett skarpt (pdftotext, inte ögon); att listen och dess knappar finns i demoläget och saknas utanför. Förebilder: staging-e2e för inkorgens utskicksflöde, bekräftelsestegets staging-skarpbevis, test-fas4-prod-deploy för secret-hantering, mall:pdf för mallmätning. Skarpbevis per skiva i staging; ingen skiva bevisas mot prod utom dörrens minting, som bevisas med prods EF deployad av Marcus.

### Utanför omfattningen
Demo som egen hyresgäst i prod-projektet (Fas E, ADR-132 alternativ d). Den hermetiska testvärlden för betalningsfamiljen (TASK-409/413) — testvärlden fejkar nätverket, demot kör riktigt maskineri; de delar data, inte mekanism. Byte av Vercels förhandsbyggen till staging som allmän policy — eget beslut och eget kort. Andra flöden än betalningar i demot (fixturen byggs så att fler kan läggas till). Rivningen av prototypens simuleringslager (TASK-402.6, står som planerad).

### Estimat
Sju skivor plus QA: sex mintas nu (fixtur och återställning · demoläget i appen · driftsättningen av demoappen · mailspärren och demoadresserna · vattenstämpeln · dörren i Mer-menyn), en (visningsytan via förhandsbyggen) mintas efter Marcus beslut om förhandsbyggenas miljö. Storleksklass M; dörren och driftsättningen är HITL.

### ADR-koppling
ADR-132 (styrande, mintad i samma landning). Bygger på ADR-050 (isolerad staging), ADR-128 (kvittoserien, spegeln), ADR-129 (jobbmotorn, kvittoutskicket), ADR-102/ADR-103 (prototypens rivning), ADR-080 (testvärldens snitt). Pekar mot Fas E:s tenant-modell (06b § A1).

### Ytterligare anteckningar
Research: docs/research/demolage-i-skarp-app-branschmonster-2026-09-06.md (tolv produkter, ingen simulerar i klienten; Bokio som närmaste förebild; tre mätta väggar). Mätning inför ADR:n: Vercels förhandsbyggen pekar mot prod (chunk-grep på PR 2378:s preview) — ett fynd i sig, registrerat i ADR-132 § Konsekvenser; stagings bas bär 115 event varav 111 ZZ-fixturer, 1 573 personer, 194 anmälningar, 2 kvitton. Tråd T185. Marcus kvittens 2026-09-06: 'Jag tycker de där låter skitbra … detta låter som rätt val och känns seriöst och proffsigt.'
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Demot skriver aldrig i prod-projektet — bevisas per skiva: demoappens bundel bär inte prods Supabase-host, och ingen prod-Edge-Function anropas under skivans skarpbevis
- [ ] #5 Inget mail når en människa — demopersonernas adresser är Resend-testadresser och stagings spärr står kvar för allt annat; bevisat i jobbloggen vid skarpbeviset
<!-- DOD:END -->
