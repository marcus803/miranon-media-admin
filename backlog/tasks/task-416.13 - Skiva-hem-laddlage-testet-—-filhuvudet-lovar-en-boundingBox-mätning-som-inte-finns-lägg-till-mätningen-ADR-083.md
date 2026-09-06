---
id: TASK-416.13
title: >-
  Skiva: hem-laddlage-testet — filhuvudet lovar en boundingBox-mätning som inte
  finns; lägg till mätningen (ADR-083)
status: To Do
assignee: []
created_date: '2026-09-06 13:23'
updated_date: '2026-09-06 15:50'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 739000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §6 (S123). tests/acceptance/hem-laddlage.acceptance.test.ts:35–38 beskriver sin bevisform som boundingBox-mätning UNDER laddning och identisk mätning EFTER data (toEqual). Filen har 5 tester och 17 expect, och boundingBox förekommer enbart i kommentaren. Prosa som påstår en mekanism som inte finns är ADR-083-klassen. Åtgärd: lägg till mätningen så filhuvudet blir sant — boundingBox på Hem-kortens rubriker och första rad före/efter att MSW-svaren släpps, toEqual. Beroende: Hem-skivan (skeleton-geometrin) bör landa först, annars blir testet rött av rätt skäl — bokför i så fall det röda som rött-först-bevis och ordna landningen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Testet mäter boundingBox före och efter datalandning på minst Nästa event, Nya anmälningar och Senaste aktivitet, med toEqual
- [x] #2 Filhuvudet beskriver exakt vad testet gör
- [x] #3 Acceptance-klassen grön i CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementerat: hem-laddlage.acceptance.test.ts fick den mätning filhuvudet
länge lovade (ADR-083). Fixtur medMatningsdata() (ETT event 2026-09-20,
TVÅ Obekräftade registreringar) triggar Nya anmälningar OCH Förfallna
betalningar samtidigt (utan att röra tomläget, som har ett KÄNT, avsiktligt
omätt geometri-skifte, PRD § Öppna frågor) och håller get-events/
get-registrations/get-activity-log parkerade (hallbarMockMedAktivitet,
byggd PÅ hallbarMock) så Senaste aktivitets EGNA, oberoende role=status
också kan mätas deterministiskt.

Huvudtestet (grönt) mäter boundingBox (toEqual, exakt) UNDER laddning och
EFTER datalandning för: Nästa event (h2 + hela kortkroppen — bekräftar att
TASK-416.9/cfcd3628s fix håller), Nya anmälningars h2, Senaste aktivitets h2
OCH första rad, samt Förfallna betalningars h2. Där en sektions Y-koordinat
legitimt förskjuts av EN ANNAN sektions data-styrda innehåll ("Bekräfta
alla"/"Skicka påminnelse till alla"-knapparna + "Att påminna"-underrubriken,
som bara kan existera EFTER att ett antal är känt) jämförs x/width/height
via en utanY()-hjälpare — mätt orsak, inte gissad (+41px/+112px i denna
fixtur).

DIVERGENS, rapporterad: Nya anmälningars OCH Förfallna betalningars FÖRSTA
RAD (Skeleton variant listRow) matchar INTE den riktiga avatar-radens
boundingBox — mätt bredd 568/höjd 72 (skelett) mot bredd 545/höjd 66
(riktig rad), samma defekt i båda komponenterna. TASK-416.9 (denna skivas
enda deklarerade beroende) rörde ALDRIG dessa två filer (dess diff cfcd3628
gällde uteslutande NastaEvent.tsx/SenasteAktivitetKompakt.tsx) — defekten
fanns redan innan och upptäcktes AV denna mätning. Bokförd som rött-först-
bevis i TVÅ separata test.fail()-test (Playwrights officiella "declare a
test as failing" mekanism: kör testet, kräv att det faktiskt fallerar, flagga
ett OVÄNTAT pass) i stället för att antingen (a) tysta fyndet genom att bara
mäta rubriken, eller (b) fixa Hem-komponenterna i denna skiva (RÖR INTE
src enligt uppdraget). test.fail() håller Acceptance-klassen grön (AC 3)
och självuppdaterar om defekten någon gång åtgärdas (oväntat pass flaggas).
Ingen ny backlog-post myntad — lämnat till orkestreraren/Marcus att bedöma.

Tvåsidigt bevis: en TEMPORÄR, ALDRIG committad ändring i
src/components/hem/NastaEvent.tsx (gap-4 till gap-9 i laddat läge) gjorde
huvudtestet rött (nastaEventKropp höjd 150 till 190) — återställd omedelbart
och verifierat att källkodskatalogen stod utan ändringar efteråt.

Grindar (rörd fil-klass): typecheck 0 fel, biome check 0 fel (repo-brett:
0 fel, förbefintliga varningar/infos orörda), check-langa-streck.mjs
0 ofångade (gäller src, denna skiva rör bara tests). npm run test:api:pure
1742/1742 gröna; test:apis api-staging-del blockerades av en AKTIV,
SAMTIDIG CI-körnings staging-preflight-lås (post-merge.yml, körning
34042154674) — miljövillkor, inte en regression av denna diff.

AMENDERING (orkestrerar-order, Marcus mandat, efter CI-fällning PR #2412):
CI-kön fällde PR:n i "Acceptance — tvåsidigt bevis (hermetik-självtest)"
(run 34043212879). Orsak: hermetik-självtestet (npm run test:acceptance:sjalvtest,
hermetik-vakt.ts) kör HELA acceptance-sviten UTAN fixturens svar och kräver
att VARJE test faller med OmockadRequestError — mina två test.fail()-test
"överlevde" i stället (de fallerade av ETT ANNAT skäl, den kända
geometri-defekten, inte ett omockat nätverksanrop), vilket självtestet
korrekt tolkar som "beviser ingenting om appens databeteende".

test.fail() är alltså FEL FORM i detta repo för att bokföra en känd defekt
i en acceptance-fil. Åtgärd: de två test.fail()-testen TOGS BORT helt.
Mätningen av Nya anmälningars och Förfallna betalningars RUBRIKER
(gröna, opåverkade av fyndet) behölls i huvudtestet. Filhuvudet skriver nu
att FÖRSTA RADEN på just dessa två kort mäts i TASK-416.18 (redan mintad),
tillsammans med fixen för listradsskelettet — samma skiva bevisar och löser,
i stället för att bevisa en defekt en delad testklass-mekanism inte kan
hantera isolerat.

Verifierat om: npm run test:acceptance:sjalvtest -- tests/acceptance/
hem-laddlage.acceptance.test.ts → 6/6 tester fällda med OmockadRequestError,
exit 0 (beviset håller). npx playwright test --project=acceptance
tests/acceptance/hem-laddlage.acceptance.test.ts → 6/6 passed, exit 0.
typecheck 0 fel, biome check 0 fel. Ny head-SHA på samma gren
(task/416.13-hem-laddlage-boundingbox): se PR #2412.
<!-- SECTION:NOTES:END -->
