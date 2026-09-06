---
id: TASK-402.4
title: >-
  Skiva: Kontoutdraget in i bekräftelsesteget — importens sista steg med fyra
  radtillstånd inom C:s form
status: In Progress
assignee: []
created_date: '2026-09-05 19:02'
updated_date: '2026-09-06 02:37'
labels:
  - ready-for-agent
dependencies:
  - TASK-402.3
parent_task_id: TASK-402
ordinal: 700000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Filläsning och kolumnmappning står kvar i inkorgen under 'Importera kontoutdrag'; när matchningen är gjord öppnas bekräftelsesteget med importens rader i stället för importens gamla bekräftelselista. Varje importrad bär sitt tillstånd som märke på kortet: säker (förbockad, belopp och datum från bankraden), osäker med kandidater (under 'Behöver din hand' med kandidaterna som förslagsknappar), omatchad (under 'Behöver din hand' med sökfält för anmälan) och dubblett (visas låst utan kryss, aldrig registrerbar). En redan importerad bankrad bockas aldrig i; dubblettskyddet på bankreferensen och 409-svaret är oförändrade. Registreringen och efterläget är stegets vanliga. Tillstånden prövades inte i prototypen: formen designas inom C:s form (kortet, hand-högen, förslagsknapparna) och varje avvikelse från facit bokförs som AMENDERING-fil med bilder i facit-katalogen för Marcus granskning i QA. Täcker användarberättelser: 20, 21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bekräftelsesteget med importrader är identiskt med facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json ytan bekraftelsesteget i läge 'utgångsläget' för säkra rader; osäkra, omatchade och dubbletter följer C:s kortform och 'Behöver din hand'-form och är frysta som AMENDERING-bilder i facit-katalogen
- [x] #2 Säker rad: förbockad med bankradens belopp och datum; osäker rad: i 'Behöver din hand' med kandidaterna som förslagsknappar; omatchad rad: i 'Behöver din hand' med sökfält för anmälan; dubblett: låst utan kryss och kan inte registreras
- [x] #3 Importens gamla bekräftelselista är riven; filläsning och kolumnmappning i inkorgen är oförändrade; parsern rörs inte
- [x] #4 En redan importerad bankrad (bankreferens finns) bockas aldrig i, och registrering av en dubblett avvisas av servern som i dag (409) — bevisat i staging-e2e
- [x] #5 Staging-e2e täcker de fyra tillstånden ände till ände från importerad fil till registrerade inbetalningar; api-pure täcker tillståndsklassningen som ren funktion
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
- [ ] #4 Facit-granskning: ytan bekraftelsesteget jämförd mot facit tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json (bilderna i samma katalog) i varje läge skivan rör — avvikelse bokförs som AMENDERING-fil i facit-katalogen, aldrig som tyst ändring (ADR-102 B5/R3)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## TASK-402.4 — levererad (draft-PR, staplad på #2363)

**Gren:** `task/402.4-kontoutdraget-in-i-steget`, baserad på
`origin/task/402.1-markera-laget-inkorgen` (`b360efd5`), som bär `402.3`
(`8b096530`). Ingen merge av `origin/main`.

### AC-status, mätta värden

- **AC #1 — identisk med facit för säkra rader.** TRE mätningar. (a) RGB-histogram
  (sharp, hela bilden): de elva vanligaste färgerna i importvyns utgångsläge finns
  alla i `facit-bekraftelsesteget.png` — NOLL nya färger. Osäker/Omatchad
  återanvänder facits warning-pill `rgb(253,244,238)`, Redan registrerad dess
  `bg-bg-muted` `rgb(245,245,243)`. (b) Vertikalt snitt vid x=1400 (@2x): ett
  säkert importkorts gröna fyllning är **120 px** hög med **20 px** gap — exakt
  facits tal. (c) Promoverings-grinden grön, 10/10 ariaSnapshot-lägen: den
  manuella matarens DOM är oförändrad. Osäkra/omatchade/dubbletter frysta i
  `AMENDERING-2026-09-06-importens-radtillstand.md` + tre PNG i facit-katalogen.
- **AC #2 — fyra tillstånd.** Säker: förbockad med bankens belopp och datum (mätt:
  David 2 500 kr, bankens siffra, inte appens 1 000). Osäker: hand-högen med
  kandidaterna som förslagsknappar (två knappar, en per öppen anmälan). Omatchad:
  hand-högen med sökfält i inkorgens rankning. Dubblett: egen sektion, `checkbox`
  count 0 och `button` count 0 inom sektionen.
- **AC #3 — gamla listan riven.** `SwishImport.tsx` 838 → **428 rader**;
  `Importrad`, `bekrafta()`, `sammanfattningstext`, `utfallstext`,
  `namnForVal`, `kandidatEtikett`, `radbeskrivning` och steget `'lista'` borta.
  `bankimport-parser.ts` **0 rader i diffen**. Filväljaren, mappningsdialogen,
  signaturen och det sparade bankminnet orörda.
- **AC #4 — dubbletten.** Loggad bankreferens ⇒ klassen `dubblett` slår även en
  EXAKT telefonträff (e2e-fall 2 mäter det på en anmälan som fortfarande är
  öppen). Serverns 409 avvisar: mätt i e2e med `code: 'dubblett_bankreferens'` —
  raden bär "Redan registrerad. Ingen ny inbetalning skapades.", AVMARKERAS, och
  referensen bokförs i importloggen. Bankreferensen mätt på alla fyra anropen.
- **AC #5 — tester.** `tests/e2e/betalningar-import-bekraftelsesteget.staging.test.ts`
  **9/9 gröna** (repots första import-e2e); `tests/api/importminne.test.ts`
  **29/29 gröna** för tillståndsklassningen som ren funktion.

### Grindar (exitkod mätt separat, aldrig via pipe)

`npm run typecheck` 0 · `npx @biomejs/biome check .` 0 ·
`node scripts/check-langa-streck.mjs` 0 (323 filer, 0 ofångade) ·
`npm run build` 0 · `bash scripts/check-facit.sh` 0 (17 manifest, 8 markörer) ·
`npm run check:docs` 0 (14/14) · e2e: nya sviten 9/9, stegets + promoverings-
grinden + markera-läget 30/30.
`npm run test:api` exit 1 — 2263 passerade, 3 fällda, alla FÖREXISTERANDE:
två `generate-event-attachment.staging.test.ts` (uppdragets kända hash-fel) och
en 30 s-timeout i `send-registration-confirmation.staging.test.ts` som gick
grön i omkörning (25,8 s mot 30 s tak, marginell sedan tidigare).

### Fynd bokförda, inte tyst hanterade

1. **[RÄTTAT] Ombyggnads-signaturen kunde fyra MITT I EN KÖRNING.**
   `useRegistreraInbetalning` invaliderar `betalningar.all` efter varje rad, och
   den nyss betalda anmälan lämnar de öppna — så den manuella matarens signatur
   ändrades av sin egen körning: `fas` föll till `redigera`, skrivna utfall gick
   förlorade, den registrerade radens kort försvann mitt i spinnern. Osynligt i
   `402.3`:s svit, vars mock svarar med en STATISK lista. Vakten `korningAger` i
   `useBekraftelsesteg` skyddar båda matarna; denna skivas e2e speglar servern
   och är mätningen.
2. **`raderAttRegistrera` i `bankimport-rader.ts` har ingen src-konsument kvar**
   efter rivningen (`sammanfattaImport`, `attHantera`, `redanImporterade`,
   `arDubblettfel` är alla fortfarande i bruk). Den är kvar och testad i
   `bankimport-matchning.test.ts`; en rivning hade tvingat fram en ändring i den
   testfil som vaktar matchningsreglerna denna skiva hänger på. Bokförd, inte gjord.
3. **`vidImporterade` i `BetalningsInkorg.tsx` är riven** — dess enda konsument
   var `SwishImport`s `onRegistrerade`, och Biome hade fällt den som oanvänd.
   Utanför "enbart anropsplatsen" men en direkt följd av den.
4. **`referenser` i `facit.json` utökas INTE.** Kortets AC #1 pekar på
   AMENDERING-bilder, och promoverings-grindens tio referenser är `402.3`:s
   FÖRE/EFTER-par som importlägena saknar en FÖRE-halva till. Skälet står i
   amenderingens egen sektion.
5. **Mät-fälla i e2e-mocken, bokförd i filen:** ett fabricerat inbetalnings-id som
   inte var ett giltigt UUID fälldes av `RegistreraInbetalningResultSchema` och
   såg ut som ett applikationsfel. Zod-dumpen stod i radens felruta.

### Öppet

Staging-sviten kördes lokalt mot egen dev-server på **port 4173** under
`scripts/staging-semaphore.sh` (5173 hölls av huvudkatalogens dev-server, och en
worktree-deriverad port saknar CORS-eko från staging-EF:erna — `#2362` § divergens 4).
<!-- SECTION:NOTES:END -->
