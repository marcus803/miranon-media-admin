---
owner: marcus803
updated: 2026-09-06
review_by: 2026-12-06
status: draft
---

# Demoläge inne i den skarpa appen — branschmönster, och vad vår egen apparat tillåter

## Fråga

Hur bygger branschledande SaaS-produkter ett **demoläge inne i den skarpa
appen** — så att en icke-teknisk användare kan öva ett helt flöde med
**riktigt maskineri** (inklusive serverskapade dokument som kvitton) **utan
riktiga sidoeffekter** (mail, bokföring, nummerserier), med **återställning
till samma startläge varje gång**, och så att demot också tjänar som
**visnings- och testyta under utveckling**?

## Beslutet frågan ska informera

Tråd `T185` — ett demoläge för betalningsflödet (inkorg → markera →
bulkregistrering → kvitton köas och "skickas" → förhandsgranska → ångra →
import av kontoutdrag → Åtgärds-sidan). Marcus har avgjort VAD
(sessionsdok S121, 2026-09-06): *"Hon ska definitivt ha ett demoläge som
visar hela flödet inklusive kvitton."* VAR det bor är grillningskandidat.
**Detta pass beslutar ingenting** — det matar grillningen som Marcus
startar, och därefter ett PRD-kort.

## Kort svar

**Fem domar, i fallande styrka.**

1. **Ingen av de tolv undersökta produkterna simulerar sitt demoläge i
   klienten.** Samtliga kör riktig backend mot en isolerad datamängd, och
   isoleringen ligger på **kontonivå** (Stripe sandbox, Salesforce sandbox,
   Shopify development store, HubSpot test account, Intercom test workspace)
   eller på **organisations-/bolagsnivå inuti samma konto** (Xero Demo
   Company, QuickBooks sandbox company, **Bokio testbolag**). Det gör vårt
   alternativ (a) — webbläsarminne — till det enda av de fyra som saknar
   branschprecedent. Litteraturen om test-dubblar säger dessutom varför: en
   dubbel som inte kontraktstestas mot det riktiga systemet drifar och slutar
   bevisa något (Fowler, `ContractTest`; *Software Engineering at Google*
   kap. 13).

2. **Sidoeffekten som ALLA stänger av är mailen — och de stänger av den i
   plattformen, inte i affärslogiken.** Stripe: *"By default, Stripe doesn't
   email customers in sandboxes."* Salesforce: varje ny **och nyligen
   uppdaterad** sandbox faller tillbaka till `System email only`. Vi har redan
   samma spärr — `send-bulk.ts` rad 19–24 plus fyra anropsställen — och den är
   **miljöbunden, inte lägesbunden**: `ENVIRONMENT === 'production'` stänger av
   den helt. Ett demoläge som bor i PROD-projektet har alltså i dag **ingen
   mailspärr alls**.

3. **Återställning är ett schema plus en knapp, inte en av dem.** Xero Demo
   Company raderar allt användaren lagt till **efter 28 dagar** och kan
   dessutom återställas manuellt när som helst, varvid grunddatan står kvar.
   Salesforce Full Copy får uppdateras var 29:e dag, Partial Copy var 5:e.
   Vår `seed:review`-fixtur bär redan exakt den formen (livstidsstämpel +
   förfallo-svep, `TASK-95`) — mönstret finns hemma, det saknar bara en
   demo-adressat.

4. **Den närmaste förebilden är svensk och ligger en Google-sökning bort:
   Bokios testbolag.** Samma konto, egen bolagsväxel, permanent banner
   *"detta är ett testbolag"*, **vattenstämpel på fakturor och offerter**,
   e-fakturering avstängd, tak på 30 verifikationer, inga avgifter. Det är
   vägval (d) i drift hos en svensk bokföringsapp — och det är den enda
   källan i hela materialet som löser **märkningen av genererade dokument**
   i stället för att bara låta dem stanna i systemet.

5. **Vår hårdaste egna vägg är kvittonumret, och den syns inte förrän man
   läser migrationen.** `kvittonummer` är en **genererad kolumn**
   (`'MM-' || ar || '-' || lopnummer`) med kommentaren *"Formatet är en
   databasgaranti, inte en kodkonvention"*. Ett `DEMO-`-prefix i numret är
   alltså inte en kodändring utan en **schemaändring**. Serien är däremot
   redan **miljöseparerad via data** (`kvittoserie_golv` per år och miljö,
   fail-closed) — vilket gör staging till den enda plats där ett demokvitto
   i dag kan få ett äkta nummer utan att röra Rogers serie.

## 0. Vad som redan fanns — och vad som är nytt i detta pass

Läst i sin helhet före första sökningen.

**Beslut som redan avgjort delar av frågan:**

- **[ADR-050](../decisions/ADR-050-isolerad-staging-miljo.md)** (2026-06-13) —
  separat långlivat staging-projekt på Pro plus dedikerad Airtable-bas.
  **Väg C, branching, prövades och avvisades** som primär staging: *"Ephemera
  per-PR-miljöer; avvisat som PRIMÄR staging (vi vill ha en långlivad,
  konstant prod-spegel med deployad EF). Kan adderas senare för
  PR-previews."* Beslutets skäl **håller fortfarande** (§ 4), men frågan
  det avvisades mot var en annan än dagens.
- **[ADR-061](../decisions/ADR-061-lokal-miljo-isolation.md) Pelare 2** —
  `assertModeCoherent` vägrar varje icke-prod-mode som pekar på prod-refen.
  Reglerar bara `VITE_SUPABASE_URL`; en ANDRA URL i samma bundle ligger
  utanför vad grinden ser (§ 5.2).
- **[ADR-128](../decisions/ADR-128-inbetalningen-som-sanning-postgres-och-spegeln.md)
  beslut 5** — appen skriver en **spegel** i Airtable-basen vid varje
  registrerad inbetalning. Det är den kostnad som gör alternativ (b)/(d)
  dyrare än de ser ut (§ 3.3).
- **[ADR-129](../decisions/ADR-129-jobbmotorn-ko-cron-och-kick.md)** — kvittona
  går genom `pgmq` + cron + `EdgeRuntime.waitUntil`. "Riktigt maskineri" i
  Marcus mening betyder alltså **en riktig Postgres-instans**, inte en
  klientmodell.
- **[ADR-063](../decisions/ADR-063-airtable-bas-som-forstklassig-leverabel.md)**
  — basen är förstklassig leverabel och blir mall i Passionslyftet. Ett
  demoläge har därmed en andra, uttalad mottagare bortom Lotta.

**Befintliga research-pass som gränsar:**

- `oanvand-mock-branschpraxis-2026-07-28.md` — behandlar felskriven kontra
  legitimt oanvänd mock i **testsviter**. Rör inte demo-lägen och inte drift
  mot produktion. Ingen överlappning; drift-frågan (§ 7) är ny här.
- `hermetisk-vs-skarp-e2e-branschpraxis-2026-07-26.md`,
  `parallell-e2e-mot-delad-backend-2026-07-26.md`,
  `staging-fixturinventering-2026-08-10.md` — behandlar TESTKÖRNINGARS
  isolering mot staging. Angränsande mekanik (fixturer, sentineler, purge),
  men frågan "en människa övar i den skarpa appen" ställs aldrig.
- `kvitto-branschpraxis-och-svensk-ratt-2026-08-30.md` och
  `asynkront-kvittojobb-byggstenar-2026-08-30.md` — kvittots innehåll,
  rättsläge och jobbmotorns byggstenar. Numret och serien beskrivs; ett
  demokvittos numrering ställs aldrig.
- `ui-prototyp-till-produktion-frontier-processer-2026-08-08.md` och
  `prototypkod-isolering-och-parallella-strommar-branschmonster-2026-08-08.md`
  — hur prototypkod isoleras och promoveras. **Åldrat i en punkt:** de skrevs
  före `ADR-103` (promoveringsformen) och behandlar prototypen som en
  temporär yta som rivs. `T185` frågar det motsatta — om något ska ÖVERLEVA
  rivningen — och den frågan finns inte i något befintligt pass.

**Vad som därför är nytt här:** branschmönstret för demoläge inne i en skarp
app (ingen tidigare täckning), mailspärrens form som produktfunktion snarare
än testskydd, kvittoseriens och spegelns konsekvenser för var ett demo kan
bo, samt en prövning av de fyra vägval orkestreraren formulerat.

## 1. I klartext (för en läsare utan tekniska förkunskaper)

Tänk dig att appen är en verklig lokal där Lotta arbetar. Ett demoläge är ett
**övningsrum** bredvid den lokalen. Frågan är vad övningsrummet ska vara.

- Det **kan vara en teaterkuliss** — allt ser rätt ut, men bakom väggarna
  finns ingenting. Det är billigt att bygga och farligt att lita på: när
  lokalen byggs om följer kulissen inte med, och till slut övar man på något
  som inte längre liknar verkligheten. Det är vad forskningen om
  "test-dubblar" varnar för.
- Det **kan vara ett riktigt rum med riktiga maskiner men låtsaspost** — allt
  fungerar på riktigt, breven skrivs ut och adresseras, men de går ner i en
  låda i stället för ut i brevlådan. Det är vad Stripe, Xero, Salesforce och
  alla andra vi tittat på faktiskt har byggt.
- Och rummet **städas** — antingen på en klocka (Xero: allt du lade till
  försvinner efter 28 dagar) eller när någon trycker på en knapp
  ("Återställ"). Eller så görs rummet så litet att det aldrig behöver städas:
  svenska Bokio låter dig skapa ett "testbolag" i samma inloggning, men bara
  med plats för 30 bokföringsposter, med ordet "testbolag" alltid synligt
  överst och med en vattenstämpel tvärs över varje faktura du skriver ut.

Vår situation har tre särdrag som gör valet mindre fritt än det låter:

1. **Kvittonumret är en riktig, laglig löpande serie.** Databasen räknar upp
   den själv och tillåter inte ett påhittat nummer. Ett demokvitto kan därför
   inte få numret "DEMO-1" utan att vi bygger om databasen.
2. **Registrerar man en betalning skrivs den också in i Lottas Airtable-bas**
   — den riktiga. Ett övningsrum inuti den riktiga lokalen skulle alltså
   lämna spår i hennes bokföringsunderlag.
3. **Mailspärren gäller bara utanför den skarpa miljön.** I den skarpa appen
   finns i dag ingen spärr alls — där GÅR mailen ut.

Det är därför frågan "var ska demot bo?" inte är en smaksak.

## 2. Branschmönstren — vem gör vad

| Produkt | Mönster | Isolering | Återställning | Sidoeffekter | Inloggning | Dokument / nummer |
|---|---|---|---|---|---|---|
| **Stripe** | Sandbox (efterföljare till "test mode") | Eget isolerat testkonto; upp till 5 utöver test mode-sandboxen; objekt i ett läge är oåtkomliga i det andra | Ingen schemalagd; `Delete test data` på begäran, ej ångerbar; en sandbox kan raderas och skapas om | *"By default, Stripe doesn't email customers in sandboxes"* — kvittomail vid betald faktura går INTE ut; kortnätverk rör aldrig pengar | Samma inloggning, växling i Dashboardens kontoväljare; separata API-nycklar | Hittade ingen källa om fakturanummerserien mellan lägen |
| **Xero Demo Company** | Demoföretag i samma konto | Egen "organisation"; endast du ser din egen data | **Auto efter 28 dagar** (raderar bara det DU lagt till) + manuell `Reset` när som helst; grunddatan överlever | Hittade ingen förstapartskälla om utgående mail/fakturor | Samma inloggning, växling i organisationsväljaren | Hittade ingen källa om nummerserien vid reset |
| **Salesforce** | Sandbox per typ | Egen org-kopia (Developer / Partial Copy / Full) | Refresh-intervall per typ: **Full 29 dagar**, **Partial Copy 5 dagar** | **`System email only` är DEFAULT för nya och uppdaterade sandboxes** — bara systemmail (nya användare, lösenordsåterställning) släpps ut | Separat inloggning (användarnamn med sandbox-suffix) | Hittade ingen källa |
| **Shopify** | Development store | Egen butiksinstans under partnerorganisationen | Hittade ingen källa om schemalagd återställning | Betalningar simuleras via **Bogus Gateway** (kortnr `1` lyckas, `2` misslyckas); riktiga betalningar kräver betalplan | Partner Dashboard, samma konto | Hittade ingen källa |
| **QuickBooks** | Sandbox company | Separat företag under utvecklarkontot, upp till 10 | **Kan inte återställas** — exempeldatan går inte att nollställa; man raderar allt eller skapar en ny sandbox | Hittade ingen källa | Samma Intuit-inloggning, `Switch Company` | Hittade ingen källa |
| **Intercom** | Test workspace | Eget workspace | Ingen — man **raderar** hela test-workspacet i stället | — | Samma konto | *"There's not a way to push/migrate your messages or workflows from the test workspace to your production workspace"* |
| **HubSpot** | Test account (gratis, 90 dgr) kontra Standard Sandbox (Enterprise) | Separat konto | Test-kontot löper ut efter 90 dagar | Sandbox = *"a safe and secure environment where you can test ... without impacting anything in your standard account"* | Developer-portal | — |
| **Sentry** | `sandbox.sentry.io` med förpopulerad data | Egen demo-org | Demot är ett **underhållet, körbart referensprojekt** (`sentry-demos`), inte en engångsdump | — | Ingen inloggning krävs | — |
| **Grafana** | `play.grafana.org` | Egen instans i eget kluster | Explicit **"Reset dashboards"**-knapp som återställer originalläget | — | Ingen inloggning krävs | — |

### 2.1 De svenska bokföringsapparna — och Bokio som närmaste förebild

Fem svenska/nordiska aktörer undersöktes eftersom domänen är vår egen. Bilden
är delad: två av fem har ett riktigt demoläge **inuti** produkten, tre löser
det med en egen provperiod på ett eget bolag.

| Produkt | Demoläge inne i appen? | Form |
|---|---|---|
| **Bokio** | **Ja** | Testbolag i samma konto |
| **SpeedLedger** | **Ja** | Demoföretag med fiktiva bankhändelser, skilt från 14-dagars testkonto |
| **Fortnox** | Nej för vanlig kund | 30-dagars gratisversion på eget organisationsnummer, förifylld med exempeldata; separat: upp till 30 sandbox-bolag i utvecklarportalen; separat: klick-runt-demo i mobilappen |
| **Visma eEkonomi** | Nej | Eget demoföretag per registrering, nås via mailad länk |
| **Björn Lundén / Lundify** | Ingen källa hittad | 30 dagars gratis testperiod plus bokade demos |

**Bokio är den enskilt närmaste förebilden i hela materialet**, och det som gör
den värd att läsa noga är att den löser exakt de tre problem vår fråga ställer.
Verifierat förstapart:

- **Var dörren sitter:** *"klicka därefter på företagsnamnet uppe till vänster
  -> Skapa ett testföretag"* — samma konto, ingen ny inloggning.
- **Att man vet var man är:** *"Högst upp så ser du hela tiden en indikation
  på att detta är ett testbolag."* Permanent, inte en engångsdialog.
- **Att dokumenten märks:** *"Vattenstämpel på fakturor och offerter."* Detta
  är den precedent jag först trodde saknades — den finns, och den ligger i
  vår egen domän och vårt eget land.
- **Att sidoeffekterna stängs:** *"Ej möjligt att skicka e-faktura"*, Zettle
  fungerar inte, företagskortet kan inte aktiveras, ingen AGI-fil, ingen
  export av bokföringsdata, lönespecifikationer bär endast testdata.
- **Att övningen har ett tak:** **max 30 verifikationer**. Det är den
  intressantaste designidén i materialet — i stället för att bevaka att
  ingen missbrukar testbolaget har Bokio gjort missbruk strukturellt
  ointressant. Ett tak är billigare än en vakt.
- **Att det är gratis:** *"Det finns inga avgifter på testbolag."*

Bokio dokumenterar **ingen automatisk återställning**. Övningsrummet städas
alltså aldrig — men eftersom det bara rymmer 30 verifikationer behöver det
inte städas.

### 2.2 Öppen källkod — seed finns överallt, reset nästan ingenstans

Sju OSS-projekt granskades för att se hur de seedar och återställer publika
demo-instanser. Fyndet är entydigt och delvis negativt.

- **Seed-skript finns i alla:** Cal.com (`scripts/seed.ts` plus fem
  specialiserade varianter), Twenty CRM (`workspace:seed:dev` med en
  `--light`-flagga som hoppar över demo-objekt och begränsar till fem poster
  per objekt), Dub.co (`pnpm run script dev/seed`, med `--truncate` för att
  radera först), Formbricks (`packages/database/src/seed.ts`), Documenso
  (`prisma:seed`), Plane (seedar sedan PR #6964 **varje ny workspace**
  automatiskt med exempelprojekt).
- **Publik, cron-återställd demo-instans hittades hos ingen av de sex.** Det
  är seed-för-lokal-utveckling, inte ett underhållet demo. Documenso är
  närmast med en dokumenterad **staging-miljö** (`stg-app.documenso.com`) som
  kräver ett **eget nytt konto** — *"You can't use your production account"*
  — vilket är exakt (c)-variantens friktion, i skarp drift hos någon annan.
- **Formbricks bär en spärr värd att kopiera i anda:** seed-skriptet vägrar
  köra i produktion om inte `ALLOW_SEED=true` sätts uttryckligen, och avslutar
  med felkod. Det är samma fail-closed-form som vår egen
  `allokera_kvittonummer()`.
- **Odoo är det enda projektet med demo-data som förstklassigt begrepp:**
  demo-data deklareras i modulens manifest under nyckeln `"demo"`, i en egen
  `demo/`-mapp strikt skild från master-data, och laddas eller utelämnas vid
  databasskapandet (`--with-demo` / `--without-demo`). Det **kan inte tas bort
  i efterhand** — valet görs en gång, vid skapandet. Runbot ger varje bygge en
  helt ny isolerad databas med demo-data.

**Vad det betyder för oss:** ett seed-skript är inte ett demo. Skillnaden är
återställningen och underhållet, och den skillnaden är precis vad de sex OSS-
projekten saknar och vad Xero, Bokio och Grafana har. Vi har redan
seed-skriptet (`seed:review`); vi har inte demot.

### 2.3 Mönstren

**Fyra mönster faller ut, och de är olika svar på olika frågor.**

- **Sandlådan som eget konto** (Stripe, Salesforce, Shopify, HubSpot,
  Intercom) — maximal isolering, priset är en andra inloggning eller åtminstone
  en kontoväxling, och en andra datamängd att underhålla.
- **Demoorganisationen inuti samma konto** (Xero, QuickBooks, **Bokio**) —
  närmast vår domän, eftersom det är bokföring och eftersom användaren aldrig
  lämnar sin inloggning. Xero löser **återställning** som produktfunktion;
  Bokio löser **märkning och strypta sidoeffekter** som produktfunktion.
  Ingen av dem gör bådadera.
- **Den publika, underhållna demon** (Sentry, Grafana) — demot behandlas som
  en produkt med egen källkod och egen reset-knapp. Det är formen om demot ska
  bära Passionslyft-rollen (`ADR-063`), inte bara Lottas övning.
- **Seed utan demo** (Cal.com, Twenty, Dub.co, Formbricks, Plane) — vanligast
  i öppen källkod, och inte ett svar på vår fråga. Det är ett
  utvecklarverktyg, inte ett övningsrum.

**Precedensrymden är olika tjock i olika celler, och det ska sägas rakt ut.**
Isolering och inloggning har tolv källor och samstämmiga mönster.
Återställning har tre (Xero, Grafana, Odoo Runbot). **Märkning av genererade
dokument har exakt EN** — Bokios vattenstämpel på fakturor och offerter. De
övriga löser problemet genom att dokumentet aldrig lämnar systemet, inte
genom att märka det. En precedent är inte ett mönster; det är ett existensbevis.

## 3. Sidoeffekterna, en i taget

### 3.1 Mail — och en mätning som ändrar en förutsättning

**Vad branschen gör:** plattformen, inte affärslogiken, bär spärren. Rails
löser det med en `ActionMailer`-interceptor registrerad i en initializer
(`mail_interceptor`-gemet), Laravel med `Mail::alwaysTo()` i en
ServiceProvider, Django med `EMAIL_BACKEND = console`. Postmark har en
**sandbox server** där mailet levereras *"to a black hole"* men ändå syns som
`Delivered` i UI och webhooks — precis den egenskap ett demo behöver, för
flödet ska SE normalt ut. SendGrid gör samma sak med
`mail_settings.sandbox_mode`. Inget etablerat paraplynamn för mönstret
hittades.

**Vad vi redan har:** samma spärr, på fyra ställen
(`send-bulk.ts`, `send-receipt.ts`, `send-action-email.ts`,
`confirm-registrations.ts`, plus `jobb-konsument/index.ts:495–499`). Listan är
fyra adresser, verbatim ur `supabase/functions/_shared/send-bulk.ts` rad
19–24: `delivered@`, `bounced@`, `complained@`, `suppressed@resend.dev`.

**Det nya fyndet, mätt:** Resend stöder **etiketter** på sina testadresser.
Förstapart, verbatim: *"All test email addresses support labeling, which
enables you to send emails to the same test address in multiple ways"* — med
undantaget att `suppressed@` *"does not support labeling yet"*. Det betyder
att `delivered+lotta@resend.dev` och `delivered+bengt@resend.dev` är två
åtskiljbara demomottagare hos Resend.

**Men vår egen spärr släpper inte igenom dem.** Predikatet är
`RESEND_TEST_ADDRESSES.includes(spec.email)` — exakt strängmatchning. Mätt mot
listan verbatim (Node 24.13.1, 2026-09-06):

```text
SLÄPPS IGENOM  delivered@resend.dev
AVVISAS        delivered+lotta@resend.dev
AVVISAS        delivered+bengt.andersson@resend.dev
AVVISAS        bounced+demo@resend.dev
AVVISAS        lotta@miranon.se
```

Ett demo där åtta deltagare får varsitt kvitto skulle alltså i dag skicka
**alla åtta till samma adress**, och maill oggen kan inte skilja dem åt. Att
byta `.includes()` mot ett prefix-/etikett-medvetet predikat är en liten
ändring med stor demo-effekt — men den vidgar spärrens yta och hör därför till
grillningen, inte hit.

**Och den viktigaste kanten:** spärren är villkorad på
`Deno.env.get('ENVIRONMENT') === 'production'`. Den finns **inte** i prod. Ett
demoläge som bor i prod-projektet ärver alltså ingen mailspärr — den måste
byggas, och den blir då den första spärr i repot som är LÄGES-bunden i stället
för MILJÖ-bunden. Det är ett kvalitativt annat åtagande än det vi har i dag.

### 3.2 Dokument och nummerserier — den hårdaste väggen

`kvittonummer` är en **genererad kolumn** i Postgres:

```sql
kvittonummer text
  generated always as ('MM-' || ar::text || '-' || lopnummer::text) stored,
```

med tabellkommentaren *"Formatet är en databasgaranti, inte en
kodkonvention"*. Kolumnen kan inte skrivas. Ett `DEMO-`-prefix, en egen
demoserie eller ett nummer utanför formatet kräver alltså en **migration**,
inte en flagga — och det river den garanti `ADR-109` beslut 1 och `ADR-128`
beslut 4 byggde med avsikt.

Serien är däremot **redan miljöseparerad, via data**: `kvittoserie_golv` bär
startvärdet per år **och miljö**, och `allokera_kvittonummer()` är fail-closed
mot ett saknat golv (*"den kastar hellre än gissar 1001 och kolliderar med den
gamla serien"*). Konsekvensen är skarp:

- **I staging** får ett demokvitto ett äkta `MM-2026-<n>` ur stagings egen
  serie, utan att någonsin röra Rogers bokföring. Det är exakt vad Marcus
  beställt — *"ett äkta 'Demo-kvitto' som genereras på samma sätt som våra
  skarpa kvitton"* — och det finns i dag.
- **I prod** förbrukar varje demokvitto ett nummer ur den **riktiga** serien.
  Hål är en accepterad konsekvensklass (*"ett nummer som aldrig blev ett
  kvitto återanvänds aldrig"*), men det är hål i en bokföringsserie, inte i en
  räknare — och de uppstår då av övning, inte av fel.

Vill man ändå märka dokumentet finns en väg som INTE rör numret: en
**vattenstämpel eller en DEMO-rad i mallen**, styrd av samma data som redan
skiljer miljöerna åt. Den vägen har precedent — Bokio lägger *"vattenstämpel
på fakturor och offerter"* i sitt testbolag (§ 2.1) — och den bryter ingen
databasgaranti, eftersom den rör renderingen och inte serien. Vår
PDF-rendering går via en extern motor per event
([ADR-119](../decisions/ADR-119-pdf-renderingsvagen-extern-motor-per-event.md)),
så en vattenstämpel är en mall-ändring, inte en motorändring. Att den ändå
inte är gratis: mallen är Lottas designade förlaga, och varje avvikelse från
den mäts (`CLAUDE.md` § Bilagemallarnas FÖRLAGOR).

### 3.3 Airtable-spegeln — sidoeffekten som är lätt att glömma

`ADR-128` beslut 5: appen skriver en **spegel** i Airtable-basen vid varje
registrerad inbetalning, så att Lottas vyer, rollups och automationer
fortsätter fungera. Basadressen läses ur **en enda per-projekt-hemlighet**:
`Deno.env.get('AIRTABLE_BASE_ID')`
(`supabase/functions/_shared/airtable-client.ts:51`), satt per Supabase-projekt
enligt `ADR-050` beslut 3.

Följden är strukturell, inte en detalj: **ett demo som kör i prod-projektet
speglar till Lottas riktiga bas**, oavsett hur välisolerade demoraderna är i
Postgres. Det kan inte routas bort med en tenant-kolumn — det kräver att
spegelskrivningen blir bas-medveten, alltså ny kod i EF-lagret.

## 4. Återställning

**Branschens två former, och de kombineras:**

- **Schemalagd.** Xero: allt användaren lagt till raderas efter 28 dagar.
  Salesforce: Full Copy var 29:e dag, Partial Copy var 5:e.
- **På begäran.** Xero `Reset` (grunddatan överlever, bara dina tillägg
  försvinner), Grafana Play "Reset dashboards", Stripe `Delete test data`
  (ej ångerbar).

QuickBooks är motexemplet som är värt att minnas: sandboxens exempeldata kan
**inte** återställas — man raderar allt eller skapar en ny sandbox. En demo
utan reset-väg blir alltså snabbt en demo man överger.

**Vad vi redan har hemma:** `scripts/seed-review-fixture.mjs` bär formen
redan. Fixturen stämplas med ett utgångsdatum i eventets `Notering`
(14 dagar default, `--livstid N`, `TASK-95`), förfallo-svepet städar det som
passerat, och en fixtur vars stämpel inte passerat rörs aldrig — *"det är
granskningen pågår"*. Skriptet bär dessutom bas-guard mot prod, korsläsning
mot `.purge-staging-policy.json` och förbud mot att röra permanenta
rollup-fixturer.

Det är Xeros mönster, redan byggt, med en annan adressat. Det som saknas är
inte mekaniken utan **en reset-knapp inne i appen** — i dag är återställning
ett kommando i en terminal, alltså inget Lotta kan göra själv.

**Supabase Branching prövad som återställningsmekanism:** en branch är
förstapart *"a separate environment with its own Supabase instance and API
credentials"* och startar med projektets Edge Functions redan deployade.
Persistenta grenar är *"long-lived and recommended for environments like
staging, QA, or development"* och pausas eller raderas inte automatiskt. De är
data-lösa som default och seedas via `supabase/seed.sql` eller "Include
data". Kostnaden är **$0,01344 per gren och timme** på Pro/Team/Enterprise —
en gren som står uppe dygnet runt är alltså ≈ 9,7 USD/månad, och den täcks
inte av planens compute-krediter.

`ADR-050` avvisade branching som PRIMÄR staging med skälet *"vi vill ha en
långlivad, konstant prod-spegel"*. Det skälet **håller** — men det uttalar sig
inte om en gren som en TREDJE, kort-livad demo-miljö. Formen skulle ge en
perfekt återställning (kasta grenen, skapa ny ur seed), och den skulle
samtidigt ge en **tredje** URL, en tredje uppsättning EF-hemligheter och en
tredje användardatabas att hålla i synk. Ingen förstapartskälla avråder från
att använda en persistent gren som demo-backend; ingen rekommenderar det
heller.

## 5. Inloggningen — den svåraste tekniska frågan

### 5.1 Vad branschen gör

Tre svar, i ordning efter hur nära de ligger vår situation:

- **Samma session, lägesväxlare** (Stripe, Xero, QuickBooks). Användaren
  loggar in en gång och byter läge i en väljare. Stripe: *"click **Sandboxes**
  within the Dashboard account picker"*. Detta är den upplevelse Marcus
  beställt — dörren i Mer-menyn.
- **Egen inloggning** (Salesforce, med sandbox-suffix på användarnamnet).
  Robust, men det är precis den friktion en icke-teknisk användare fastnar i.
- **Ingen inloggning alls** (Sentry sandbox, Grafana Play). Bara möjligt när
  demot inte innehåller något som liknar riktiga personuppgifter.

### 5.2 Vad vår apparat tillåter

Tre mätta fakta ur vår egen kod avgör rymden.

1. **Klienten binds till EN Supabase-URL vid bygget.** `createClient` anropas
   en gång på modulnivå med `env.VITE_SUPABASE_URL`
   (`src/data/config/supabase-client.ts:41`), och `callEdgeFunction` /
   `postEdgeFunction` bygger sina URL:er ur samma konstant (rad 83, 110).
   Betalningsportarna går rakt på dem
   (`src/data/adapters/betalningsportar.ts`) — de går INTE via
   `DataSourceAdapter`-DI:n, med avsikt (`ADR-128` beslut 3: betalningsdata
   har aldrig legat i Airtable). Vägval (c) kräver alltså **en andra
   klientinstans och en andra URL i samma bundle**, inte en flagga.
2. **En sådan bundle bryter en etablerad invariant.**
   `scripts/check-staging-bundle.sh` grindar att staging-hosten finns i
   `dist/assets` och att prod-hosten **inte** gör det. Grinden körs bara på
   staging-byggen, så den skulle inte fälla ett prod-bygge med två hostar —
   men principen "exakt en host per bundle" är hela dess skäl.
   `assertModeCoherent` (`src/lib/env-coherence.ts`) ser bara
   `VITE_SUPABASE_URL` och skulle vara blind för den andra.
3. **En session i projekt A duger inte i projekt B.** Supabase förstapart:
   *"Each project is provisioned with a unique JWT secret used to sign and
   verify auth tokens."* Lotta inloggad i prod-appen kan alltså inte anropa
   stagings API utan en **andra** inloggning, eller utan att vi mintar en
   session server-side. `auth.admin.generateLink` finns och kan göra det, men
   kräver `service_role` och *"should only be called on a trusted server"* —
   och det scenariot (EF i projekt A mintar session i projekt B) är **inte
   dokumenterat** av Supabase. Det vore ny, oprövad mark, och det är
   `service_role` i den mest känsliga positionen vi har.

**Rad-nivå-isolering i ETT projekt** är däremot väl dokumenterad förstapart.
Supabase RLS-guiden är explicit om var tenant-claimet får bo:
*"creating an RLS policy that relies on the `user_metadata` claim can create
security issues in your application as this information can be modified by
authenticated end users"* — `app_metadata` är platsen, och deras egen
exempelpolicy läser `auth.jwt() -> 'app_metadata'`. Det är teknikgrunden under
vägval (d).

## 6. Demot som utvecklingsyta

Marcus: *"den kommer säkerligen byggas ut lite, eller användas ganska
frekvent under utvecklingen."* Två etablerade former svarar på det, och de
löser olika problem.

- **Preview-deploy med egen databasgren.** Vercel förstapart: *"Preview
  environments allow you to deploy and test changes in a live setting, without
  affecting your production site"* — en URL per commit och per gren. Neon
  parar det med copy-on-write-grenar: *"each Neon branch is ready instantly
  with a perfect 'copy' of the data and schema of its parent"*. Formen ger
  "prova precis det vi byggde" utan att något permanent behöver underhållas.
  Priset i vår stack är Supabase-grenens timkostnad (§ 4) och att varje
  preview får en egen, tom backend som måste seedas.
- **Riktad funktionsflagga.** LaunchDarkly kallar det targeting rules och
  segments; Unleash löser det med constraints (deras egen dokumentation
  exemplifierar just en betagrupp); OpenFeature standardiserar `targeting
  key`. **Ingen enhetlig branschterm** hittades tvärs leverantörerna. Vi har
  redan ett flagg-mönster hemma — `VITE_FEATURE_BETALNINGAR` med tre lägen
  (`pa`, `av`, frånvarande) — men det är **bygg-bundet**, inte per användare.
  En demoflagga per användare vore en ny klass i repot.

**Sentry-formen är den som svarar på Marcus andra mening.** `sentry-demos` är
ett riktigt, körbart referensprojekt som underhålls för att demot ska fungera
— demot är alltså en produkt med egen kod, inte en engångsseed. Det är den
form som håller om demot ska bära både Lottas övning och Passionslyft-mallen.
Kostnaden är den uppenbara: det är en yta till som måste följa med varje
ändring i flödet.

Sekundärlitteraturen sätter en siffra på den kostnaden — *"Production clones
can consume up to 20% of product engineering time"* — men den kommer från
demoplattforms-leverantörer med intresse i slutsatsen och ska läsas som en
storleksordning, inte som en mätning.

## 7. Drifter en klient-simulering isär från servern?

**Ja, och litteraturen är samstämmig om mekanismen.**

Martin Fowlers bliki `ContractTest` ställer frågan rakt: *"testing against a
double always raises the question of whether the double is indeed an accurate
representation of the external service, and what happens if the external
service changes its contract?"* — och `The Practical Test Pyramid` gör den
konkret: *"How can we ensure that the fake server we set up behaves like the
real server? With the current implementation, the separate service could
change its API and our tests would still pass."*

*Software Engineering at Google* kapitel 13 lägger till ägarskapsvillkoret:
*"A fake also requires maintenance: whenever the behavior of the real
implementation changes, the fake must also be updated to match this behavior.
Because of this, the team that owns the real implementation should write and
maintain a fake."* — och trohetskravet: *"a fake should maintain fidelity to
the API contracts of the real implementation."*

**Två nyanser innan detta används som argument.**

Först: **litteraturen dömer inte ut dubbeln, den dömer ut den OKONTROLLERADE
dubbeln.** Botemedlet är kontraktstester körda mot båda sidor, ägda av den som
äger den riktiga implementationen. En klient-simulering med ett kontraktstest
mot de nio betalningsportarnas scheman vore alltså inte samma sak som
prototypens simuleringslager.

Sedan: **vår prototyp klarade sig av ett skäl som inte skalar.**
`bekraftelseSimulering.ts` säger det själv — de rena härledningarna flyttade
ut till `bekraftelsesteg-harledningar.ts` och delas med den skarpa modellen;
kvar i simuleringen ligger *"den simulerade körningen, det simulerade
kvittojobbet, och den påhittade felraden"*. Det är exakt de tre delar som
skulle drifta, och de tre delar Marcus krav (*"riktigt maskineri … äkta
Demo-kvitto"*) uttryckligen underkänner.

Jag hittade **ingen förstapartskälla** som specifikt behandlar "demoläge i
frontend som drifar från backend" — argumentet ovan är en tillämpning av
test-dubbel-litteraturen på ett angränsande fall, inte ett citat om just detta.

## 8. Prövning av de fyra vägvalen

### (a) Webbläsarminne, som prototypen

**Prövad mot fynden: faller på Marcus egna krav, inte på drift-argumentet.**
Kravet *"kvitton kan inte vara exempel PDF, det måste vara ett äkta
'Demo-kvitto' som genereras på samma sätt som våra skarpa kvitton"* kan per
definition inte uppfyllas av en klient som aldrig når `jobb-konsument`,
`preview-receipt` eller kvittoledgern. Drift-litteraturen (§ 7) är det andra,
svagare argumentet — svagare därför att det har ett botemedel
(kontraktstester) som vi skulle kunna bygga.

Den har dock **en egenskap ingen annan väg har**: återställning är gratis och
perfekt. Omladdning ger startläget, varje gång, utan skript, utan svep, utan
kostnad. Marcus mätte den själv: *"funka ju jättebra."* Den egenskapen bör
inte tappas bort i grillningen bara för att vägen faller på andra grunder.

**Ingen branschprecedent hittad** för klient-simulerat demoläge i en
produktionsapp.

### (b) Demodata i prods egen databas, utan tenant-begrepp

**Faller på tre mätta punkter, varav två inte var nämnda i frågeställningen.**

1. Kvittoserien: varje demokvitto förbrukar ett riktigt nummer ur Rogers serie
   (§ 3.2).
2. **Airtable-spegeln**: registreringen skriver in sig i Lottas riktiga bas,
   och basadressen är en per-projekt-hemlighet som inte kan routas per rad
   (§ 3.3).
3. **Ingen mailspärr**: `ENVIRONMENT === 'production'` stänger av den
   befintliga spärren helt (§ 3.1).

Detta är den väg orkestreraren avfärdade snabbt, och avfärdandet var rätt —
men skälen ovan är fler och hårdare än de som angavs.

### (c) Staging som demots maskinrum inuti prodappen

**Tekniskt möjlig, men den kostar två invarianter och en oprövad mekanism.**

- En andra Supabase-klient och en andra URL i prod-bundeln (§ 5.2 punkt 1–2).
- Inloggningen: separat inloggning mot staging, eller en server-mintad session
  över projektgräns som **inte är ett dokumenterat Supabase-mönster** och som
  placerar `service_role` i den känsligaste positionen vi har (§ 5.2 punkt 3).

Men lägg märke till vad den ger: **stagings kvittoserie, stagings
Airtable-bas, stagings mailspärr och stagings jobbmotor — alla tre
sidoeffekterna är redan lösta där.** Det är den enda vägen där kravet "äkta
Demo-kvitto med äkta nummer, inga mail, inga spår i Lottas bas" är uppfyllt av
apparat som redan finns och redan grindas.

En VARIANT som passet inte kan avfärda, och som frågan inte listade: **demot
bor i stagingappen, och dörren i prod-appens Mer-meny är en länk dit.** Då
finns ingen andra klient, ingen andra URL i bundeln och ingen mintad session
— bara en andra inloggning. Det är Salesforce-mönstret, och friktionen är en
inloggning, inte en arkitektur. Att prototypens fixtur i dag är osynlig i
stagingappen är ett separat, litet problem (§ 11, fynd 1).

### (d) Demo som egen tenant i prod-projektet

**Den bäst belagda vägen i branschen, och den som bär mest ny mekanik hos
oss. De två sakerna är båda sanna samtidigt.**

Grunden är solid och förstapartsdokumenterad: RLS med tenant-claim i
`app_metadata`, aldrig `user_metadata` (§ 5.2). Inloggningen blir sömlös —
samma session, samma app, en växel. Det är **Xero- och Bokio-mönstret**, och
Bokio är en svensk bokföringsapp som kör det i drift med banner, vattenstämpel,
strypta integrationer och ett tak på 30 verifikationer (§ 2.1). Att kalla (d)
"exotisk" vore fel: det är den mest beprövade formen i vår egen domän.

**Bokios verkliga lärdom är dock inte tenant-modellen — det är taket.** De
bevakar inte testbolaget, de gör det för litet för att spela roll: 30
verifikationer, ingen export, ingen e-faktura, ingen AGI-fil. Varje spärr är
en avstängd väg ut ur systemet, inte en villkorad väg ut. Det är en billigare
säkerhetsmodell än vår, och den är värd att pröva i grillningen oavsett vilket
vägval som vinner.

Men i vår apparat kräver (d) **fyra nya saker**, var och en ett åtagande:

1. En **egen kvittoserie per tenant** — vilket är en schemaändring i en tabell
   vars hela poäng är att formatet är en databasgaranti (§ 3.2).
2. En **bas-medveten spegelskrivning** i EF-lagret, eftersom
   `AIRTABLE_BASE_ID` är en per-projekt-hemlighet (§ 3.3).
3. En **läges-bunden mailspärr** i prod — den första i repot; alla befintliga
   är miljöbundna (§ 3.1).
4. **RLS-policyer på hela betalningsdomänen** plus en tenant-kolumn i
   inbetalningar, kvitton, jobbtabellen och spegelvägen.

Var och en är byggbar. Tillsammans är de en produktfunktion i klass med
betalningsdomänen själv — och varje ny spärr blir en punkt där ett fel
betyder att demodata eller demomail hamnar i verkligheten. Det är den
riskprofil grillningen behöver väga mot bekvämligheten i en sömlös
inloggning.

**Punkt 2 är den som skiljer oss från Bokio.** Bokios testbolag har ingen
Airtable-spegel att routa — hela deras data bor i deras eget system. Vår
spegel (`ADR-128` beslut 5) är den enda av de fyra punkterna som saknar
motsvarighet i förebilden, och därmed den enda vi inte kan kopiera en lösning
för. Om (d) väljs bör den frågan lösas först, inte sist.

## 9. Vad jag inte kunde belägga

- **Xero:** om riktiga fakturor eller mail kan gå ut från demoföretaget, och
  vad som händer med fakturanummerserien vid reset. Två sökvägar, ingen
  förstapartskälla. Det är den enskilt mest relevanta luckan, eftersom Xero är
  den närmaste domänmotsvarigheten.
- **Stripe:** hur fakturanummerserien hanteras mellan sandbox och live mode
  (delad räknare eller inte).
- **Vattenstämpling utanför Bokio:** ingen av de elva övriga produkterna
  beskriver märkning av genererade dokument i demoläge. Bokio är den enda
  träffen, och den är verifierad förstapart. Ett existensbevis, inte ett
  mönster.
- **Bokios återställning:** hjälpsidan nämner ingen automatisk eller manuell
  reset av testbolaget. Om den finns hittade jag den inte. Sidan om att
  konvertera ett testbolag till ett riktigt företag existerar enligt
  sökindex men gav 404 vid direkthämtning — vilket är intressant just för
  `T185`, eftersom "demot blir skarpt" är en fråga som kan komma upp.
- **SpeedLedgers demoföretag:** teknisk isolering, reset-mekanik och
  eventuell märkning kunde inte beläggas — bara att funktionen finns och
  innehåller fiktiva bankhändelser.
- **Fortnox, Visma, Björn Lundén / Lundify:** ingen källa på mailutskick,
  återställning eller nummer-märkning i deras prov-/testytor.
- **Publik, cron-återställd demo-instans i något av de sex OSS-projekten:**
  ingen hittad. Endast seed-skript för lokal utveckling plus Documensos
  staging-miljö och Odoos Runbot. Detta är den mest omfattande sökning som
  gjordes utan positivt resultat.
- **Twenty CRM:s tidigare `demo.env.guard.ts`:** filen finns i äldre forkar
  men inte i huvudgrenen, så VAD den spärrade (mail, skrivning, radering)
  kunde inte läsas. Namnet bytte från "demo" till "dev" uppströms.
- **Odoo Runbots exakta återställningsintervall:** *"efter några timmar"*
  kommer från en sekundärkälla, inte ur förstapartsdokumentationen.
- **Salesforce Developer / Developer Pro refresh-intervall (1 dag):** endast
  samstämmiga sekundärkällor; förstapartssidan renderades inte vid direkt
  hämtning. `Partial Copy 5 dagar` och `Full 29 dagar` är däremot
  förstapartsverifierade.
- **Supabase persistent branch som permanent demo-backend:** ingen
  förstapartskälla varken rekommenderar eller avråder. Den dokumenterade
  rekommendationen stannar vid staging/QA/dev.
- **`auth.admin.generateLink` mot ETT ANNAT projekt från en Edge Function:**
  ingen förstapartskälla bekräftar eller dementerar scenariot. Resonemanget i
  § 5.2 är härlett ur JWT-hemlighetens projektbundenhet, inte citerat.
- **"Demo environment as a first-class product surface"** som uttalad praxis
  hos Stripe, Shopify, Segment, Airbnb, Intercom eller Retool: riktad sökning
  gav inga träffar i deras egna engineering-bloggar. Sentry och Grafana visar
  formen i praktiken utan att namnge den.
- **Ett etablerat namn på "allt utgående mail till en fångstadress i
  icke-prod"**: bara ramverksspecifika mekanismnamn hittades, inget
  paraplybegrepp.
- **Att `import.meta.env.DEV` är falskt i ett riktigt bygge av VÅR app:**
  mätt mot en minimal Vite-app (Vite 8.2.2, `--mode staging`, bundeln bar
  `PROD_GREN`), inte mot `npm run build:staging` i detta repo. Slutsatsen att
  dev-grindade rutter är onåbara i stagingappen är därmed stark men inte
  körd ände-till-ände här.

## 10. Rekommendation inför grillningen

**Detta är en rekommendation, inte ett beslut. Marcus grillar, Marcus
beslutar.**

Materialet pekar mot att frågan bör delas i **två** i stället för att avgöras
som en:

**Först: skilj "Lottas övningsrum" från "vår visningsyta under utveckling".**
De har olika krav. Övningsrummet behöver stabilitet, samma startläge och en
återställningsknapp hon själv kan trycka på. Visningsytan behöver färskhet —
den ska visa det vi byggde i går. Sentry löser dem med samma artefakt;
Vercel/Neon-mönstret löser dem med två. Att anta att en yta räcker är just det
antagande grillningen bör pröva.

**Sedan, för övningsrummet: två vägar står kvar, och de skiljer sig i VAR
kostnaden ligger, inte i hur stor den är.**

- **(c)-varianten — demot bor i stagingappen, dörren i prod-appens Mer-meny
  är en länk dit.** Kvittoserien, mailspärren, Airtable-basen och jobbmotorn
  är redan rätt där. Priset är en andra inloggning för Lotta, och priset är
  **synligt, litet och engångsartat**. Documenso kör exakt denna form i
  drift, inklusive kravet på ett separat konto (§ 2.2).
- **(d) — demo som egen tenant i prod-projektet.** Bäst belagd i branschen
  (Xero, Bokio, QuickBooks) och sömlös för användaren. Priset är fyra nya
  mekanismer, varav en — den bas-medvetna spegelskrivningen — saknar
  förebild att kopiera (§ 8 d). Priset är **osynligt, återkommande och
  fördelat över hela betalningsdomänen**.

**Passets egen bedömning, öppet deklarerad som bedömning:** (c)-varianten är
den jag skulle bygga först, eftersom den ger Marcus krav uppfyllda av apparat
som redan finns och redan grindas, och eftersom en andra inloggning är en
friktion som kan mätas på en människa på fem minuter. Men den bedömningen
vilar på antagandet i fråga 1 nedan, och det antagandet är Marcus att pröva —
inte mitt.

**Fyra frågor grillningen behöver svara på, i den ordningen:**

1. **Är en andra inloggning acceptabelt för Lotta?** Hela valet mellan (c) och
   (d) hänger på det, och det är den enda frågan i listan som inte kan
   besvaras med research. Är svaret nej blir (d) den enda vägen till en sömlös
   upplevelse — och då är de fyra åtagandena i § 8 (d) priset, inte en
   invändning.
2. **Ska demokvittot vara omärkt eller märkt?** Ett äkta nummer ur stagings
   serie är omärkt och oskiljaktigt från ett skarpt kvitto. Är det önskat
   (maximal realism, Marcus krav som det står) eller farligt (någon förväxlar
   dem)? Bokio har valt märkning — vattenstämpel plus permanent banner — och
   är den enda precedenten. Frågan är om Marcus krav *"exakt som skarpa
   prodappen"* och en vattenstämpel är förenliga eller motsatta.
3. **Vem trycker på återställningsknappen, och var sitter den?** I dag är
   återställning ett terminalkommando. Xero-mönstret säger att den ska sitta i
   appen och ha en klocka bredvid sig. **Bokios svar är ett tredje:** bygg
   inget städ — sätt ett tak (30 verifikationer) och låt rummet vara litet.
   Det är den billigaste vägen i materialet och den bör prövas innan en
   reset-knapp speccas.
4. **Ska demot vara ETT flöde eller appens hela yta?** Frågan gäller
   betalningsflödet i dag. Blir svaret "hela appen" är det en produktfunktion
   av `ADR-063`-klass, inte en skiva — och då bör ADR-baren prövas innan
   bygget börjar.

**En sak som inte bör förloras oavsett väg:** prototypens
återställningsegenskap. Att omladdning ger startläget, varje gång, utan
åtgärd, är den enda egenskap i hela materialet som ingen av branschledarna
matchar. Vilken väg som än väljs bör den frågan ställas: hur kommer Lotta
tillbaka till startläget, och hur många klick kostar det?

## 11. Oväntade fynd — triage enligt ADR-053

**Fynd 1 — prototypfixturen är redan osynlig i stagingappen. Registreras.**
Marcus paus-citat antar att fixturen kan demonstreras i stagingappen. Den kan
den inte i dag: prototypytorna är grindade på `import.meta.env.DEV`
(`src/routes/_authenticated/mer/betalningar_.registrera.tsx:95` och tio andra
ställen), och `DEV` är falskt i varje `vite build` — mätt mot Vite 8.2.2 med
`--mode staging`: en minimal app byggd i det läget bar `PROD_GREN`, inte
`DEV_GREN_LEVER`. Fixturen syns alltså bara på en lokal dev-server. Det
påverkar `T185`:s premiss direkt och hör hemma i grillningen. Blockerar ej
nuvarande arbete.

**Fynd 2 — vår mailspärr blockerar Resends etikettfunktion. Registreras.**
Mätningen i § 3.1. Konsekvensen sträcker sig bortom demot: varje
staging-verifiering av ett bulkutskick skickar i dag allt till samma fyra
adresser och kan inte skilja mottagare åt i maillogg eller webhooks. Kandidat
för ett eget litet kort oavsett vad `T185` landar i. Blockerar ej.

**Fynd 3 — `check-staging-bundle.sh` är enkelriktad. Registreras som
observation, inte som brist.** Grinden verifierar att ett STAGING-bygge inte
bär prod-hosten, men ingen grind verifierar att ett PROD-bygge inte bär
staging-hosten. I dag är det ofarligt (ingen kod refererar två hostar); väljs
vägval (c) i sin klient-inbäddade form blir det en lucka som måste stängas.
Blockerar ej.

**Fynd 4 — `VITE_FEATURE_BETALNINGAR` är bygg-bunden, inte användarbunden.
Förkastas som eget spår, noteras här.** Den kan inte bära ett demoläge per
användare utan att byta klass. Ingen åtgärd föreslås; noteringen finns för att
den flaggan annars ser ut som en färdig lösning.

**Fynd 5 — `ADR-050`:s branching-avvisning gäller en annan fråga. Förkastas
som omprövning.** Skälet (*"långlivad, konstant prod-spegel"*) håller för
staging-rollen och prövas inte om. Att en gren skulle kunna bära en TREDJE,
demo-roll är en ny fråga som inte var uppe 2026-06-13, och den bör i så fall
ställas som en egen ADR — inte som en tyst utvidgning av ADR-050.

## Källförteckning

**Förstapart — leverantörernas egen dokumentation:**

- Stripe, Sandboxes — <https://docs.stripe.com/sandboxes>
- Stripe, Testing use cases (test mode, `Delete test data`, `Test email`) —
  <https://docs.stripe.com/test-mode>
- Xero Central, Use the demo company —
  <https://central.xero.com/s/article/Use-the-demo-company>
- Salesforce Help, Email Deliverability (sandbox-default `System email only`)
  — <https://help.salesforce.com/s/articleView?id=platform.data_sandbox_email_deliverability.htm&type=5>
- Salesforce Help, sandbox refresh-intervall (Partial Copy 5 dgr, Full 29 dgr)
  — <https://help.salesforce.com/s/articleView?id=000373093>
- Shopify Help, Test orders in development stores (Bogus Gateway) —
  <https://help.shopify.com/en/partners/manage-clients-stores/development-stores/test-orders-in-dev-stores>
- Intuit, Manage your sandboxes —
  <https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes/manage-your-sandboxes>
- Intercom, Best practices for testing Intercom and going live —
  <https://www.intercom.com/help/en/articles/7321743-best-practices-for-testing-intercom-and-going-live>
- HubSpot, Account types —
  <https://developers.hubspot.com/docs/getting-started/account-types>
- HubSpot, Standard sandbox —
  <https://knowledge.hubspot.com/account-management/set-up-a-hubspot-standard-sandbox-account>
- Sentry-demos (demot som underhållet referensprojekt) —
  <https://github.com/sentry-demos>
- **Bokio, Skapa testbolag** (banner, vattenstämpel, 30 verifikationer,
  strypta integrationer, inga avgifter) —
  <https://www.bokio.se/hjalp/komma-igang/skapa-ett-konto/skapa-testbolag/>
- SpeedLedger, Testkonto och Demoföretag —
  <https://www.speedledger.se/testkonto/>
- Fortnox, Testa gratis —
  <https://www.fortnox.se/testa>
- Fortnox, Kom igång med utvecklarportalen (upp till 30 testmiljöer) —
  <https://support.fortnox.se/kom-igang/integrationer/kom-igang-med-utvecklarportalen>
- Visma, Prova eEkonomi (demoföretag via mailad länk) —
  <https://support.spiris.se/visma-administration-2000/content/online-help/eekonomi-prova.htm>
- Björn Lundén / Lundify, Demo —
  <https://bjornlunden.com/se/demo/>
- Documenso, Demo environment (`stg-app.documenso.com`, eget konto krävs) —
  <https://github.com/documenso/documenso/blob/main/apps/docs/content/docs/developers/demo-environment/index.mdx>
- Twenty CRM, `data-seed-dev-workspace.command.ts` —
  <https://github.com/twentyhq/twenty/blob/main/packages/twenty-server/src/database/commands/data-seed-dev-workspace.command.ts>
- Formbricks, `packages/database/src/seed.ts` (`ALLOW_SEED`-spärren) —
  <https://github.com/formbricks/formbricks/blob/main/packages/database/src/seed.ts>
- Dub.co, `apps/web/scripts/dev/seed.ts` (`--truncate`) —
  <https://github.com/dubinc/dub/blob/main/apps/web/scripts/dev/seed.ts>
- Cal.com (community edition), `scripts/seed.ts` —
  <https://github.com/calcom/cal.diy/blob/main/scripts/seed.ts>
- Plane, PR #6964 (automatisk workspace-seed) —
  <https://github.com/makeplane/plane/pull/6964>
- Odoo, Define module data (`"demo"`-manifestnyckeln, `--without-demo`) —
  <https://www.odoo.com/documentation/18.0/developer/tutorials/define_module_data.html>
- Resend, Test email addresses and labeling —
  <https://resend.com/docs/dashboard/emails/send-test-emails>
- Postmark, Sandbox mode —
  <https://postmarkapp.com/developer/user-guide/sandbox-mode>
- Twilio SendGrid, Sandbox mode —
  <https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sandbox-mode>
- Django, Sending email (console backend) —
  <https://docs.djangoproject.com/en/6.0/topics/email/>
- Supabase, Branching —
  <https://supabase.com/docs/guides/deployment/branching>
- Supabase, Pricing (branching $0,01344/gren/timme) —
  <https://supabase.com/pricing>
- Supabase, Row Level Security (`app_metadata` kontra `user_metadata`) —
  <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase, Migrating auth users between projects (JWT-hemlighet per projekt)
  — <https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects>
- Supabase, `auth.admin.generateLink` —
  <https://supabase.com/docs/reference/javascript/auth-admin-generatelink>
- Vercel, Deployment environments (preview) —
  <https://vercel.com/docs/deployments/environments>
- LaunchDarkly, Targeting rules —
  <https://launchdarkly.com/docs/home/flags/target-rules>
- Unleash, Activation strategies (constraints, betagrupp) —
  <https://docs.getunleash.io/concepts/activation-strategies>
- OpenFeature, Evaluation context (`targeting key`) —
  <https://openfeature.dev/specification/sections/evaluation-context/>

**Tredjepart / litteratur:**

- Martin Fowler, `ContractTest` —
  <https://martinfowler.com/bliki/ContractTest.html>
- Martin Fowler, The Practical Test Pyramid (Contract Tests) —
  <https://martinfowler.com/articles/practical-test-pyramid.html>
- *Software Engineering at Google*, kap. 13 Test Doubles —
  <https://abseil.io/resources/swe-book/html/ch13.html>
- Pact, FAQ —
  <https://docs.pact.io/faq>
- Neon, Vercel-integrationen (gren per preview-deploy) —
  <https://neon.com/blog/neon-vercel-native-integration>
- `mail_interceptor` (Rails ActionMailer-interceptor) —
  <https://github.com/bigbinary/mail_interceptor>
- Laravel News, Avoiding accidental email sends (`Mail::alwaysTo`) —
  <https://laravel-news.com/avoiding-accidental-email-sends>
- Reprise, Demo environments guide (kostnadssiffran, partisk källa) —
  <https://www.reprise.com/resources/blog/demo-environments-guide>
- Odoo Runbot (ny isolerad databas per bygge; intervallet är sekundärkälla) —
  <https://odoo-development.readthedocs.io/en/latest/ci/runbot.html>

**Egna mätningar (2026-09-06, detta repo):**

- Icke-prod-adresspredikatet mot etikettadresser — Node 24.13.1, listan
  verbatim ur `supabase/functions/_shared/send-bulk.ts` rad 19–24.
- `import.meta.env.DEV` i ett `--mode staging`-bygge — Vite 8.2.2, minimal
  app, bundeln bar `PROD_GREN`.

**Repo-källor (fil och rad):**

- `supabase/functions/_shared/send-bulk.ts:19–24` (`RESEND_TEST_ADDRESSES`)
- `supabase/functions/jobb-konsument/index.ts:495–499` (icke-prod-spärren)
- `supabase/functions/_shared/airtable-client.ts:51` (`AIRTABLE_BASE_ID`)
- `supabase/migrations/20260830195728_betalningsdomanen_inbetalningar_kvitton.sql`
  rad 227–290 (genererad `kvittonummer`-kolumn), 313–395
  (`kvittoserie_golv` + `allokera_kvittonummer`)
- `src/data/config/supabase-client.ts:41, 83, 110` (klienten och EF-URL:erna)
- `src/data/adapters/betalningsportar.ts` (nio portar, rakt på EF-lagret)
- `src/lib/env-coherence.ts` (`assertModeCoherent`, ADR-061 Pelare 2)
- `scripts/check-staging-bundle.sh` (en host per bundle)
- `scripts/seed-review-fixture.mjs` (livstid + förfallo-svep)
- `src/env.ts` (`VITE_FEATURE_BETALNINGAR`, tre lägen, bygg-bunden)
- `src/components/betalningar/prototype/bekraftelseSimulering.ts`
  (vad som simuleras och vad som inte gör det)
