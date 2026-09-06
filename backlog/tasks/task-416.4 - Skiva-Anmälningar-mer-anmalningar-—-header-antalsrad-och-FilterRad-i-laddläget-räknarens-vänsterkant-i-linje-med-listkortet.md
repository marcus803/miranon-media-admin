---
id: TASK-416.4
title: >-
  Skiva: Anmälningar (mer/anmalningar) — header, antalsrad och FilterRad i
  laddläget, räknarens vänsterkant i linje med listkortet
status: Done
assignee: []
created_date: '2026-09-06 13:20'
updated_date: '2026-09-06 17:07'
labels:
  - ready-for-agent
dependencies: []
parent_task_id: TASK-416
priority: medium
ordinal: 730000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: rapport D §4 #4 (S123). src/components/anmalningar/AnmalningarSida.tsx:652–679 (laddläge) mot 694–773 (laddat): saknar header med h1 (text-2xl) + antalsrad och FilterRad (744), ~110–120 px; skeleton-räknaren står flush-vänster medan listan sitter i ett -mx-4-kort så vänsterkanten flyttar. registrations.all värms, så exponeringen är låg men slår vid warmup-timeout, offline→online och efter 24 h persist-utgång. Åtgärd: rendera header + FilterRad i alla grenar, lägg skeleton i samma kortcontainer med samma radgeometri som den laddade raden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Header, antalsrad (skeleton för talet) och FilterRad renderas i isPending-, isError- och laddat läge
- [x] #2 Skeleton-rader ligger i samma -mx-4-kort som den laddade listan; vänsterkanten är identisk
- [x] #3 Mätning bifogad: boundingBox på h1, FilterRad och första listraden identiska före och efter datalandning
- [x] #4 Befintliga tester gröna, axe-svep grönt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [x] #2 Rörd fil-klass lokala grindar gröna (L147)
- [x] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MÄTNING (premiss-pass): kortets radnummer (652–679 laddläge, 694–773 laddat,
744 FilterRad) hämtade ur en read-only-audit mot 29a3c16d. Filen låg vid
ANDRA raden ur uppdraget (src/components/registrations/AnmalningarSida.tsx,
inte anmalningar/) — provat mot disk: den senare stämde, den förra fanns
aldrig i repot. Radnumren stämde approximativt (652/isPending-start,
694/loaded-start, 744/FilterRad — samtliga inom ±1 rad av vad audit angav).

ÅTGÄRD: headerBlock + filterRadBlock extraherade till DELAD JSX (samma
objekt) i alla tre grenar (isPending/isError/laddat) i stället för att bara
finnas i den laddade grenen. isPending/isError visar antalsraden som en
Skeleton (ingen pålitlig siffra), laddat visar riktig text. FilterRad får
isPending={isPending || isError} (panelens dropdown-/räknarskelett).

Skeleton-listkortet (redan -mx-4 sedan tidigare) hade EGEN geometribugg:
`p-4` (padding alla sidor) mot <ul>ens `px-4` + <li>ens egen `py-2.5` — gav
16 px extra Y-offset på FÖRSTA raden i skelettläget. Fixat: kortet till
`divide-y` + `px-4`, varje rad till egen `py-2.5` — exakt <ul>/<li>s boxmodell.

MÄTNING (Playwright, headless, 1280×720, hallbar mock av get-registrations,
temporär testfil raderad efter körning):

FÖRE fixen av skelettkortets padding:
  h1:        pending {x:372,y:116,w:536,h:30}  laddat {x:372,y:116,w:536,h:30}  IDENTISK
  FilterRad: pending {x:356,y:187,w:568,h:38}  laddat {x:356,y:187,w:568,h:38}  IDENTISK
  1:a raden: pending {x:373,y:258,w:534,h:49}  laddat {x:373,y:242,w:534,h:69}  Y AVVEK 16 px

EFTER fixen (divide-y + py-2.5 på skeletonraderna):
  h1:        pending {x:372,y:116,w:536,h:30}  laddat {x:372,y:116,w:536,h:30}  IDENTISK
  FilterRad: pending {x:356,y:187,w:568,h:38}  laddat {x:356,y:187,w:568,h:38}  IDENTISK
  1:a raden: pending {x:373,y:242,w:534,h:70}  laddat {x:373,y:242,w:534,h:69}  x/y/w IDENTISK, höjd 70/69 (1 px sub-pixel-avrundning)

GRINDAR (exitkoder mätta, ej antagna):
  typecheck: 0 · biome check .: 0 (filen enskilt: 0 diagnoser) ·
  build: 0 · check-langa-streck.mjs: 0 (323 filer, 0 ofångade) ·
  test:api (api-pure+api-staging): 2242 passed, 24 failed — SAMTLIGA 24 i
    *.staging.test.ts mot LIVE Supabase-staging (network/context-disposed/
    timeout — "Target page, context or browser has been closed",
    "Request context disposed", ett par staging-datatillstånd som redan
    avvek från förväntan). INGEN av de 24 rör registrations-UI:t eller filen
    som ändrats; api-pure (ren logik, ingen nätverksberoende) är 100% grönt.
    Bedömning: pre-existing miljö-/nätverksflak i denna sandbox, ej en
    regression av denna skiva — flaggat öppet, inte tyst ignorerat.
  tests/acceptance/mer-anmalningar-form.acceptance.test.ts +
    mer-anmalningar.acceptance.test.ts: 39/39 passed.
  tests/visual/anmalningssidan-promoverings-grind.spec.ts (visual-desktop):
    10/10 passed — ariaSnapshot-låset på det LADDADE läget opåverkat, axe 0
    violations i alla fyra tillstånd (lista/filtrerat/tomt/fel) inklusive
    fellägets nya header+FilterRad.

RUNDA 2 (review-grinden runda 1, orkestrerare på Marcus mandat 2026-09-06):
fynd — dataOkand (isPending||isError) matades in i FilterRads isPending-prop
och i antalsradens skeleton-vakt, vilket i isError renderade ett EVIGT
animerat laddskelett fast källan definitivt fallerat (vilseledande status).
Fix: FilterRad får isPending={isPending} rakt av (matchar EventsList.tsx
~rad 279-292). Antalsraden visar Skeleton ENBART i isPending; i isError
renderas ingen platshållare alls (null) — kromet (h1 + FilterRads ärligt
tomma/degraderade kontroller) plus MessageBox-felbeskedet bär tillståndet.
dataOkand behålls, men ENDAST för att styra "Visa alla anmälningar"-länken
(döljs i både isPending och isError, av samma skäl som tidigare — länken
syftar på en räknare som inte finns i något av lägena).

Info-fynd bokförda, EJ åtgärdade (enligt orkestrerarens instruktion):
- 1 px-avvikelsen (70 mot 69) på första radens boundingBox mellan pending
  och laddat kvarstår (sub-pixel-avrundning, se mätningen ovan).
- isPending-grenen saknar egen axe-täckning — repo-bred, medveten
  konvention (samma undantag som tests/visual/anmalningssidan-promoverings-
  grind.spec.ts docblock bokför för ariaSnapshot: "laddningsläget ... är
  tidsberoende och hade gjort referensen spröd").

Grindar efter fix (exitkoder mätta): typecheck 0 · biome check (filen) 0 ·
check-langa-streck.mjs 0 (323 filer, 0 fynd) · mer-anmalningar-form +
mer-anmalningar acceptance 39/39 · anmalningssidan-promoverings-grind
(visual-desktop, inkl. axe på fel(4xx)-läget) 10/10.

Ny head-SHA: se PR #2392 — pushad, ej armerad, ej Done.

AC #1 PRECISERAT (S123 stängningsbatch 1, 2026-09-06, orkestreraren på Marcus mandat): antalsraden visar Skeleton ENBART i isPending; i isError renderas header och FilterRad oförändrat men antalsraden är null (ingen shimmer i fel, felbeskedet bär tillståndet). Det är mandat-beslutet ur review-runda 1 på PR #2392 och principen tvärs 416.4/416.8/416.1: skeleton/shimmer bara i pending, aldrig i fel. AC-texten 'skeleton för talet' ska läsas med den avgränsningen.
<!-- SECTION:NOTES:END -->
