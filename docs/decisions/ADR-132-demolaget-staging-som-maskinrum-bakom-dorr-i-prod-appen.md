# ADR-132: Demoläget — staging som maskinrum bakom en dörr i prod-appen, byggt hyresgäst-neutralt inför Fas E

- **Status:** Accepted (Marcus kvittens S121 Del 7, 2026-09-06, på
  orkestrerarens sjupunktsförslag efter research-passet: *"Jag tycker de där
  låter skitbra. Bra att du blickar framåt. Vi ska röra oss mot Supabase och
  tenant och allt, bort från Airtable, så detta låter som rätt val och känns
  seriöst och proffsigt."*)
  **ADR-baren** (`~/.claude/CLAUDE.md` § ADR-BAR) klaras på alla tre villkor:
  **svårt att återställa** — i koherens: en andra driftsatt app-adress, en
  serverfunktion i prod som bär stagings service-nyckel, en fast fixtur i
  stagings bas och databas, en nattlig återställning, en märkning i
  kvittomallen och en ändrad mailspärr bygger tillsammans på att "demot bor i
  staging"; byter man plats efteråt måste alla sju bitar flyttas eller rivas.
  **Överraskande utan kontext** — den som hittar en `Demo`-post i prod-appens
  Mer-meny som öppnar en helt annan adress, eller ett kvitto med äkta nummer
  ur en annan serie och en vattenstämpel, undrar varför demot inte bara
  "ligger i appen". **Resultat av en verklig avvägning** — fyra vägar prövades
  mot tolv branschledare och tre mätta väggar i vår egen apparat; den valda
  bär ett synligt pris (en andra app-adress, en engångslänk) som redovisas i
  § Konsekvenser.
- **Datum:** 2026-09-06
- **Fas:** betalningsflödet (PRD `TASK-402`-familjen), tråd `T185`. Designas
  efter research-passet
  [`demolage-i-skarp-app-branschmonster-2026-09-06.md`](../research/demolage-i-skarp-app-branschmonster-2026-09-06.md)
  och sessionsdok S121 Del 5 + Del 7 § 7.3.
- **Rör:** en ny Vercel-adress för demoappen (samma kod, staging som backend)
  · `CORS_ALLOWED_ORIGINS` i staging-projektet · en ny Edge Function i PROD
  (`demo-inloggning`) och en i STAGING (`aterstall-demo`) · en fast
  demofixtur i stagings Airtable-bas och Postgres · `.purge-staging-policy.json`
  (dokumenterat undantag) · kvittomallen (`docs/mallar/bilagor/kvitto.html`,
  vattenstämpel) · mailspärren (`supabase/functions/_shared/send-bulk.ts`,
  `jobb-konsument`) · appens Mer-meny och en demolist · prototypens
  fixturdata (`src/components/betalningar/prototype/fixtur.ts`, flyttar).
- **Relation till tidigare beslut:** **bygger på**
  [`ADR-050`](ADR-050-isolerad-staging-miljo.md) (isolerad staging som långlivad
  prod-spegel — demot är en ANDRA roll för samma miljö, ingen omprövning av
  branching-avvisningen, se research § 11 fynd 5) ·
  [`ADR-128`](ADR-128-inbetalningen-som-sanning-postgres-och-spegeln.md)
  (kvittonumret ur en databassekvens; basen som app-skriven spegel — båda är
  skälen till att demot INTE kan bo i prod-projektet i dag) ·
  [`ADR-129`](ADR-129-jobbmotorn-ko-cron-och-kick.md) (jobbmotorn
  och kvittoutskicket är maskineriet demot ska köra oförändrat) ·
  [`ADR-102`](ADR-102-prototypen-ar-facit-skarpa-ska-vara-identisk.md)/[`ADR-103`](ADR-103-promoveringsformen-prototypen-promoveras-skarpa-bygget-avskaffas.md)
  (prototypens simuleringslager rivs i `TASK-402.6` som planerat; demot
  ersätter det på servernivå, inte i webbläsaren) ·
  [`ADR-080`](ADR-080-acceptance-klassen-hermetisk-utbrytning.md) (testvärlden
  fejkar nätverket vid protokollet — demot är INTE testvärlden, se
  § Konsekvenser). **Pekar framåt mot** Fas E:s målmodell
  (`docs/research/datamodell-research/06b-supabase-target.md` § A1
  `tenants`, *"soft multi-tenant från dag ett"*): varje del av beslutet är
  hyresgäst-neutral, så att dörren kan bytas från länk till växel när
  tenant-modellen landar.

## Kontext

### Vad Lotta behöver, och vad Marcus krävde

Lotta ska kunna öva hela betalningsflödet — inkorgen, markera, bulkregistrera,
kvitton som köas och skickas, förhandsgranska, ångra, importera ett
kontoutdrag — utan att något bokförs på riktigt och utan att ett enda mail går
ut till en människa. Idén föddes i S121 Del 5 (tråd `T185`) och avgjordes i
VAD 2026-09-06 (Del 7 § 7.3), i Marcus egna ord:

<!-- vale Vale.Terms = NO -->
<!-- Citaten är verbatim; Marcus skrev "lotta" med gemen. -->

- *"Hon ska definitivt ha ett demoläge som visar hela flödet inklusive
  kvitton."*
- *"Inga mail får ju gå ut så klart!! men istället för att lägga det i staging
  så vore det väl enklare för lotta om vi hade ett demoläge inne i appen"*
- *"Demon i prototypen funka ju jättebra, det här att jag bara laddade om sidan
  så var man tillbaka i demolägets startpunkt. … Dörren in kanske istället ska
  ligga i mer-menyn … Alla steg ingår. Demon måste ju visa allt EXAKT som
  skarpa prodappen gör … kvitton kan inte vara exempel PDF, det måste vara ett
  äkta 'Demo-kvitto' som genereras på samma sätt som våra skarpa kvitton …
  samma läge varje gång."*
- *"Viktigt att vi bygger demo-grejen ORDENTLIGT från början, för den kommer
  säkerligen byggas ut lite, eller användas ganska frekvent under
  utvecklingen. Du och jag utvecklar saker och sedan ber vi lotta testa demon
  för just det."*
- *"Vi ska röra oss mot Supabase och tenant och allt, bort från Airtable."*

<!-- vale Vale.Terms = YES -->

Två av kraven drar åt olika håll och det är hela problemet: prototypens
demo (webbläsarminne, omladdning = startläge) kändes rätt, men ett äkta kvitto
byggs på servern av sparade rader, med ett nummer ur en riktig serie. Ett
äkta demokvitto kräver alltså en server som sparar något.

### Tre väggar i vår egen apparat, mätta

1. **Kvittonumret är en databasgaranti.** `kvittonummer` är en genererad
   kolumn (`'MM-' || ar || '-' || lopnummer`) med kommentaren *"Formatet är
   en databasgaranti, inte en kodkonvention"*
   (`supabase/migrations/20260830195728_betalningsdomanen_inbetalningar_kvitton.sql`
   rad 227–287, `ADR-128` beslut 4). Ett `DEMO-`-prefix är en schemaändring.
   Serien är däremot redan miljöseparerad via data (`kvittoserie_golv` per år
   och miljö, fail-closed) — i staging får ett demokvitto ett äkta nummer i
   dag, utan att röra Rogers serie.
2. **Airtable-basen är en hemlighet per projekt.** `AIRTABLE_BASE_ID` läses
   per Edge-Function-projekt (`supabase/functions/_shared/airtable-client.ts`),
   och spegelskrivningen (`ADR-128` beslut 5) kan inte routas per rad. Ett
   demo i prod-projektet skriver in sig i Lottas riktiga bas — och läser
   event och personer därifrån.
3. **Mailspärren är miljöbunden, inte lägesbunden.** I icke-prod skickas bara
   till `RESEND_TEST_ADDRESSES`, annars svarar jobbet med felet *"Adressen …
   är inte en Resend-testadress — inget mail skickas i denna miljö"*
   (`supabase/functions/jobb-konsument/index.ts` rad 495–499). I prod finns
   ingen spärr alls (`ENVIRONMENT === 'production'`).

### Vad branschledarna gör

Research-passet (Opus, 2026-09-06) undersökte tolv produkter. Domarna, med
källorna i passets källförteckning:

- **Ingen simulerar sitt demo i klienten.** Stripe (sandboxes), Salesforce
  (sandboxes), Shopify (development stores), HubSpot, Intercom, Xero (Demo
  Company), QuickBooks (sandbox company) och Bokio (testbolag) kör alla
  riktig backend mot avskild data, på konto- eller organisationsnivå.
  Litteraturen om test-dubblar säger varför: en dubbel som inte
  kontraktstestas drifar och slutar bevisa något (Fowler, `ContractTest`;
  *Software Engineering at Google* kap. 13).
- **Mailen stängs av i plattformen, inte i affärslogiken.** Stripe: *"By
  default, Stripe doesn't email customers in sandboxes."* Salesforce: varje ny
  sandbox faller tillbaka till `System email only`.
- **Återställning är ett schema plus en knapp.** Xero raderar allt användaren
  lagt till efter 28 dagar och kan återställas manuellt när som helst;
  grunddatan står kvar.
- **Närmaste förebilden är svensk: Bokios testbolag.** Samma konto, egen
  bolagsväxel, permanent banner, vattenstämpel på fakturor, e-fakturering
  avstängd, tak på 30 verifikationer. Det är den enda källan som löser
  MÄRKNINGEN av genererade dokument.
- **Resend har egna testadresser med etiketter** (`delivered+namn@resend.dev`)
  — men vår spärr matchar strängen exakt och avvisar dem (passets § 3.1).

### Två mätningar gjorda inför denna ADR (2026-09-06, orkestrerarens fork)

**a) Vercels förhandsbyggen pekar i dag mot PROD.** Preview-deployen
`miranon-media-admin-dot85l7sz.vercel.app` (PR `#2378`, `TASK-402.8`, commit
`156f2c35`) hämtades genom Vercels delningslänk och dess 152 chunkar
grep:ades: exakt en Supabase-host, `lvjsfnphlauldxqlncpl.supabase.co` — prod
(staging är `pqtshyierkdgwdnxuirz`, `.env.staging`). Ingen
`VITE_FEATURE_BETALNINGAR`-sträng i förhandsbygget. Följd: ett förhandsbygge
kan i dag INTE tjäna som visningsyta mot demot, och var och en som klickar i
ett förhandsbygge rör Lottas riktiga data. Se § Konsekvenser och skiva 6:s
öppna form.

**b) Stagings Airtable-bas är redan en fixturvärld.** Räknat via API:t med
`STAGING_AIRTABLE_TOKEN` (bas `apphjj8Q7lkXCMsL4`, samma som
`.purge-staging-policy.json` § `expectedBaseId`): Eventplanering **115** rader
varav **111** bär `ZZ-`-prefix (sentineler/fixturer) och **4** inte; Personer
**1 573**; Anmälningar **194**; Kvitton **2**. Demofixturen ("Lottas morgon",
tre event, tio anmälningar) är alltså liten i förhållande till basen, och
den behöver en ort som INTE matchar någon purge-target (targets matchar
`ZZ-create-event-test*`, `ZZ-plats-*`, `create-test+…@staging.test` m.fl. —
en fixtur med en riktig svensk ort och `@example.com`-adresser, som
`seed:review` redan gör, faller utanför varje target). `seed:review`s
livstidsstämpel är den enda svep-mekanismen utöver policyn, och den läser
en `[`-inledd stämpel i eventets Notering — en fixtur utan stämpel rörs
aldrig av svepet.

## Beslut

### 1. Maskinrummet är staging-projektet

Demot kör mot staging-projektet (`pqtshyierkdgwdnxuirz`): samma Edge
Functions, samma jobbmotor, samma kvittomall, stagings egen kvittoserie,
stagings Airtable-bas, stagings mailspärr. Det är plattformsnivå-isolering
(Stripe/Salesforce-klassen), och ingenting av det behöver byggas.

### 2. Dörren i prod-appens Mer-meny öppnar demot färdiginloggad

En post `Demo` i Mer-menyn anropar en ny Edge Function i PROD,
`demo-inloggning`, som med stagings service-nyckel (prod-secret) mintar en
engångslänk för EN fast demoanvändare (`auth.admin.generateLink`, typ
`magiclink`, adress-allowlistad till exakt den användaren — samma härdning
som `supabase/functions/test-invite-completion/index.ts` § ADRESS-ALLOWLIST)
och öppnar demoappen i ny flik med `token_hash`; demoappen löser in den
(`verifyOtp`). Lotta ser aldrig en inloggningsruta. Fallback om
korsprojekts-mintningen inte kan bevisas i skiva 5: en vanlig inloggning på
demoappen, en gång, med sessionen bevarad.

### 3. Demoappen är en egen Vercel-adress som bygger samma kod mot staging

En andra Vercel-yta (eget projekt eller egen miljö — skiva 1 avgör mot
Vercels förstapartsdokumentation) bygger `main` med stagings publika
`VITE_`-värden och `VITE_APP_LAGE=demo`. Appen visar då en permanent list
överst: *"Demo. Inget sparas på riktigt, inga mail skickas."* med knapparna
**Börja om** och **Tillbaka till appen**. Adressen läggs i stagings
`CORS_ALLOWED_ORIGINS`. Demoappen är samma kod som prod — det är
definitionen av *"EXAKT som skarpa prodappen"*.

### 4. Demodatan är "Lottas morgon" som fast fixtur, undantagen från svep

Fixturen ur prototypen (tre framtida event, tio personer och anmälningar, åtta
swish och två bankgiro, sex anmälningsavgifter och fyra slutbetalningar —
Marcus berättelse verbatim i `fixtur.ts`) seedas i stagings bas och Postgres
via ett seed-skript i `seed:review`-familjen, med riktig svensk ort och
`@example.com`-adresser (RFC 2606) så att den faller utanför varje
purge-target, utan livstidsstämpel så att förfallo-svepet aldrig rör den,
och med ett dokumenterat undantag i `.purge-staging-policy.json` som säger
varför. Fixturen bär `tenant_key: demo` i sin seed-definition från dag ett.

### 5. Återställning: vid inträde, på knapp, och varje natt

En Edge Function i STAGING, `aterstall-demo`, är idempotent: den raderar
demofixturens inbetalningar, kvitton och jobb i Postgres, återställer
spegelfälten på fixturens anmälningar och lämnar grunddatan orörd. Den körs
(a) när dörren öppnas, (b) på **Börja om**, (c) varje natt via pg_cron (samma
mekanism som `jobb_cron_tick`, `ADR-129`). Det är Xeros mönster med knapp och
klocka, och det ger tillbaka prototypens egenskap "samma läge varje gång".

### 6. Kvittona är äkta — och märkta

Demokvittot byggs av samma kod, med nummer ur stagings egen serie. För
demoanvändaren/demomiljön bär mallen dessutom en diskret vattenstämpel
**DEMO** (Bokio-precedent). Beteendet är exakt; dokumentet går inte att
förväxla med ett riktigt kvitto om någon vidarebefordrar det. Det är den enda
punkt där beslutet avviker från "exakt", och skälet är förväxlingsrisken —
Marcus kvitterade förslaget med den punkten utskriven.

### 7. Mailen går till Resends testadresser, en per demoperson

Demopersonerna bär `delivered+<namn>@resend.dev`-adresser, så jobbmotorn
rapporterar *skickat* sanningsenligt och mailet hamnar i Resends sänka, aldrig
hos en människa. Det kräver att mailspärren accepterar Resends
etikett-adresser (mönster, inte exakt sträng) — research-passets fynd 2, som
gäller varje staging-verifiering av bulkutskick oavsett demot.

### 8. Förhandsbyggen som visningsyta — form öppen tills mätning a) är hanterad

Avsikten står: ett Vercel-förhandsbygge per PR pekat mot demot ger Marcus
länken *"Testa just det här"* till Lotta, med en återställning före. Men
mätning a) visar att förhandsbyggena i dag bygger mot PROD, vilket är ett
fynd i sig (varje granskning i ett förhandsbygge rör Lottas data). Skivan
för visningsytan mintas INTE förrän Marcus valt form: byta förhandsbyggenas
miljövärden till staging (då blir varje PR-preview ett demo, och
prod-granskning sker bara på `admin.miranon.dev`), eller låta demoappens egen
Vercel-yta bygga PR-grenar på begäran. Se § Konsekvenser.

### Invarianter, checkbara

- Demot skriver aldrig i prod-projektet: ingen kod i demoappen bär prods
  Supabase-host (spegelbild av `check-staging-bundle.sh`, som i dag bara
  vaktar åt ett håll — research § 11 fynd 3).
- Inget mail till en människa: demopersonernas adresser är Resend-testadresser
  och stagings spärr står kvar för allt annat.
- Återställningen är idempotent och mätt: två körningar i rad ger samma
  tillstånd, och tillståndet efter körning är fixturens startläge (rad för
  rad).
- Alla delar är hyresgäst-neutrala: fixturen, återställningen, vattenstämpeln
  och mailroutingen nycklas på demoanvändaren/`tenant_key: demo`, inte på
  "staging". Fas E-vägen är att byta dörren från engångslänk till en växel i
  appen (Bokio-formen) och låta resten stå.

## Alternativ som övervägdes

### (a) Webbläsarminne, som prototypen

Exakt gränssnitt, härmad server. Saknar branschprecedent helt (noll av tolv),
kan inte ge ett äkta kvitto, och varje serverändring
måste härmas i demot eller så ljuger demot (drift-argumentet). Prototypens
simuleringslager var dessutom redan osynligt i stagingappen
(`import.meta.env.DEV` är falskt i varje bygge — research § 11 fynd 1).
Förkastat.

### (b) Demodata i prods egen databas, utan hyresgäst-begrepp

Riktigt maskineri, men demokvittona äter nummer ur Lottas serie, demopersoner
hamnar i hennes bas, och mailspärren finns inte i prod (vägg 1–3). Förkastat.

### (c) Staging som maskinrum inuti prod-appen — valt, i länk-varianten

Research-passet prövade två former: en andra Supabase-klient i prod-bundeln
(en andra URL, en andra klient, en mintad session) och VARIANTEN där demot
bor i en egen app-adress och dörren i Mer-menyn är en länk dit. Den senare
valdes: ingen andra klient i prod-bundeln, ingen dubbel host att vakta,
och priset — en app-adress till och en engångslänk — är synligt, litet och
engångsartat. Documenso kör formen i drift.

### (d) Demo som egen hyresgäst i prod-projektet — Fas E:s form, inte dagens

Bäst belagd i branschen (Xero, Bokio, QuickBooks) och sömlös för användaren;
06b § A1 planerar `tenants` och `tenant_id` på alla domäntabeller. Men i dag
läser appen event och personer ur en Airtable-bas som är en hemlighet per
projekt; (d) kräver att varje Edge Function blir bas-medveten i både läs- och
skrivväg, plus egen kvittoserie per hyresgäst (schemaändring), en
lägesbunden mailspärr i prod och RLS på hela betalningsdomänen — fyra
mekanismer varav den bas-medvetna spegeln saknar förebild. Inte förkastad:
UPPSKJUTEN till Fas E, och beslutet ovan är byggt så att bytet då bara rör
dörren.

## Konsekvenser

**Vinster:** Lotta får ett övningsrum som är exakt appen, med riktiga kvitton
och riktig kö, utan risk för hennes data eller hennes deltagares inkorgar;
Marcus får en visningsyta som reseedas på knapp; allt maskineri som demot
kör är redan grindat av staging-e2e; ingen simulering att hålla i synk.

**Pris, öppet redovisat:** en app-adress till att drifta (Vercel-yta, CORS,
miljövärden); stagings service-nyckel som secret i prod-projektet (den
känsligaste positionen vi har — därför allowlistad till en enda användare
och en enda länktyp, och det är skiva 5:s skarpbevis att bevisa); en fast
fixtur som staging-CI:s purge aldrig får matcha (dokumenterat undantag, och
en risk om någon lägger till en target som råkar matcha); vattenstämpeln är
en mall-ändring som mäts mot renderad PDF; etikett-stödet ändrar en spärr
som fyra anropsställen delar.

**Fynd ur mätning a), registrerat här (ADR-053: registrera, förkasta aldrig
tyst):** Vercels förhandsbyggen bygger mot PROD. Det är oberoende av demot
en risk — en PR-preview som en agent eller Marcus klickar i skriver mot
Lottas data. Åtgärden (byta preview-miljöns `VITE_SUPABASE_*` till staging,
eller stänga previews) är ett eget beslut och ett eget kort; beslut 8 ovan
väntar på det.

**Testvärlden är inte demot.** `TASK-409`/`TASK-413` bygger en hermetisk
fixturvärld som fejkar nätverket vid protokollet (`ADR-080` § "Snittet går
vid protokollet") för att bevisa appen på PR-ytan; demot kör riktigt maskineri
för att Lotta ska öva. De delar fixturdata (Lottas morgon) men inte
mekanism, och ska inte tvingas ihop — research-passets och 409-agentens
gemensamma slutsats.

**`TASK-402.6` står:** prototypens simuleringslager rivs som planerat;
`fixtur.ts` flyttar till seed-skriptet i skiva 2 innan rivningen.

**Åtaganden:** PRD-kortet med skivor bär bygget; ORDLISTA får posterna
**Demoläge** och **Demoapp**; `docs/reference/atkomst-och-nycklar.md` får
raden för stagings service-nyckel i prod när skiva 5 landar; `ADR-050` får en
Updates-rad om stagings andra roll.

**Återväckningsvillkor:** (a) Fas E:s `tenants` landar — då prövas (d) som
medvetet byte av dörr; (b) korsprojekts-mintningen kan inte bevisas säker i
skiva 5 — då gäller fallbacken (en inloggning) och beslut 2 amenderas;
(c) Vercel eller Supabase ändrar villkoren för en andra app-yta eller för
`generateLink`.

## Relaterat

- [`demolage-i-skarp-app-branschmonster-2026-09-06.md`](../research/demolage-i-skarp-app-branschmonster-2026-09-06.md)
  — hela options-rymden, källorna, fynden 1–5
- [`supabase-realtime-hermetisk-mock-2026-09-06.md`](../research/supabase-realtime-hermetisk-mock-2026-09-06.md)
  — varför testvärlden och demot skiljs åt
- Sessionsdok S121 Del 5 (idén, `T185`), Del 7 § 7.3 (avgjord i VAD, tre
  vägar mätta), `tasks/threads/README.md` rad `T185`
- `TASK-402` (PRD, bekräftelsesteget), `TASK-402.6` (rivningen), `TASK-409`,
  `TASK-413`
- `docs/research/datamodell-research/06b-supabase-target.md` § A1 (Fas E:s
  tenant-modell)

## Updates

Inga än.
