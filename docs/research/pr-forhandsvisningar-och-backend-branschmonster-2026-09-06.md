---
owner: marcus803
updated: 2026-09-06
review_by: 2027-03-06
status: draft
---

# Förhandsvisningar per pull request och deras backend — branschmönstret, och vad vi bör göra

> **Proveniens:** avgränsat research-pass 2026-09-06 (S121), Opus, beställt för
> att informera `TASK-415`. Frågan, som den ställdes:
>
> *"Hur kopplar professionella team sina automatiska förhandsvisningar per PR
> (Vercel Preview Deployments och motsvarande) till en backend, så att en
> förhandsvisning aldrig kan röra produktionsdata men ändå visar funktionen med
> riktig data att klicka i — och vad är det etablerade mönstret för team i vår
> storlek och stack?"*
>
> Passet mätte sex saker i vår egen apparat (§ 1) i stället för att citera dem,
> och läste förstapartsdokumentation hos Vercel, Supabase, Heroku, Netlify,
> Neon, Render och Railway. Ingen kod, ingen ADR och inget kort rört — enda
> leveransen är denna fil.
>
> **Läsanvisning:** § Kort svar är skriven för en läsare utan tekniska
> förkunskaper och räcker för att fatta beslutet. Resten är underlaget.

---

## Kort svar — i klartext

### Vad problemet är

Varje gång vi förbereder en ändring bygger Vercel automatiskt en egen liten
kopia av appen på en egen webbadress, så att ändringen går att titta på innan
den släpps. Den kopian kallas **förhandsvisning**.

Problemet: förhandsvisningen är i dag kopplad till **den riktiga databasen** —
Lottas riktiga event, riktiga anmälningar, riktiga personer. Den ser ut som en
testkopia men är det inte. Trycker någon på *Registrera* i en förhandsvisning
bokförs det på riktigt, och ett mail kan gå till en riktig människa.

Två saker mildrar bilden, och båda är mätta i dag:

1. **Förhandsvisningarna är inte öppna för vem som helst.** Adressen kräver
   inloggning hos Vercel, alltså i praktiken Marcus. Risken är inte att
   främlingar hittar dit; risken är att den som *bjuds in* att titta — Lotta,
   till exempel — tror att hon klickar i en övningsvärld.
2. **Det går att laga utan att bygga något nytt.** Vi har redan en färdig
   parallellvärld (staging) med egna event, egna personer och en spärr som
   hindrar mail från att gå ut. Den behöver bara kopplas på.

### Vad proffsen gör

Alla stora aktörer gör samma sak i grunden: **en förhandsvisning ska aldrig
tala med produktionsdatabasen.** Heroku, som uppfann formen, säger det rakt ut i
sin dokumentation — kopiera inte riktig data till testmiljöer. Vercel,
Netlify, Render, Railway, Neon och Supabase erbjuder alla ett sätt att låta
förhandsvisningen få sin egen, ofarliga datakälla.

Skillnaden mellan dem är bara *hur långt* de går:

- **Den lyxiga formen:** varje förslag får en helt egen, tillfällig databas
  som skapas och slängs automatiskt. Kostar pengar per timme och kräver att
  varje ny databas fylls med övningsdata.
- **Den vanliga formen för team i vår storlek:** alla förhandsvisningar delar
  **en** gemensam övningsmiljö. Ingen extra kostnad, inget nytt att underhålla.

Vi har redan den gemensamma övningsmiljön. Vi har den till och med fylld med
data: 115 event och drygt 1 500 personer i stagings egen värld.

### Vad vi bör göra

**Koppla förhandsvisningarna till staging i stället för till produktionen.**

Det är två handgrepp:

1. Marcus ändrar tre inställningar i Vercel så att förhandsvisningar pekar mot
   övningsmiljön. Ingen kod behövs för det steget — det är mätt i dag (§ 1.1).
2. En liten kodändring i övningsmiljöns dörrvakt, så att den släpper in
   förhandsvisningarnas adresser. Dörrvakten godkänner i dag bara adresser den
   känner igen bokstav för bokstav, och en förhandsvisning får en ny adress
   varje gång. Ändringen görs **bara i övningsmiljön** — produktionens dörrvakt
   rörs inte.

Efter det: en förhandsvisning är en riktig, klickbar app med riktig data att
titta på — men det är övningsdata, och inga mail går ut. Vill man se hur något
ser ut med Lottas riktiga uppgifter gör man det på den vanliga adressen,
`admin.miranon.dev`.

### Vad det kostar

**Noll kronor.** Ingen ny prenumeration, ingen ny tjänst, inget nytt att
betala per månad. Kostnaden är ungefär en halv dags arbete: kodändringen i
dörrvakten, ett par tester som bevisar att den inte släpper in fel adresser,
och en kontroll av att förhandsvisningen faktiskt pekar rätt efteråt.

Alternativet som kostar pengar — en egen tillfällig databas per förslag — är
det branschen bygger när många utvecklare arbetar samtidigt och stör varandra.
Vi är två. Den formen löser ett problem vi inte har, och skulle behöva en egen
ny apparat för att fyllas med data varje gång.

### Vad du behöver säga ja eller nej till

> **Ja/nej-frågan:** ska förhandsvisningarna kopplas om till övningsmiljön
> (staging), med den lilla kodändringen i övningsmiljöns dörrvakt som det
> kräver — och med den uttryckliga konsekvensen att granskning mot Lottas
> riktiga data därefter alltid sker på `admin.miranon.dev`, aldrig i en
> förhandsvisning?

Säger du **ja** blir samma omkoppling också grunden för demoappen: samma
inställningar, samma dörrvakt, en yta att underhålla i stället för två.

Säger du **nej** står allt kvar som i dag, och då ska ingen — inte Lotta,
inte en granskare — bjudas in i en förhandsvisning utan att först få veta att
allt hon gör där är på riktigt.

---

## 0. Vad som redan fanns — och vad som är nytt i detta pass

**Läst före första sökningen.** Fyra ytor visade sig överlappa frågan, och två
av dem bär beslut som redan avgjort delar av den.

| Yta | Vad den redan täcker | Vad som saknades |
|---|---|---|
| `ADR-050` § Alternativ övervägt, väg C | Branching avvisat som PRIMÄR staging 2026-06-13, med den öppna raden *"Kan adderas senare för PR-previews"* | Ingen prövning av om skälet håller i dag, och ingen kostnadssiffra |
| `ADR-132` (landad på grenen `docs/demolaget-adr-prd`, ej i `main`), beslut 3 + 8 + § Mätningar | Fyndet att förhandsbyggen pekar mot prod; visningsytans form uttryckligen lämnad öppen; demoappen som "eget projekt eller egen miljö — skiva 1 avgör mot Vercels förstapartsdokumentation" | Just den förstapartsdokumentationen |
| `docs/research/demolage-i-skarp-app-branschmonster-2026-09-06.md` § 6 (samma gren, ej i `main`) | Nämner preview-deploy med egen databasgren och Neon-parningen, i två meningar, som en av två former för "demot som utvecklingsyta" | Hela CORS-frågan, Vercels egen miljömodell, kostnaden, och prövningen mot vår apparat |
| `docs/decisions/ADR-061-lokal-miljo-isolation.md` + `scripts/check-staging-bundle.sh` | Miljö-koherensgrinden och bundel-grinden som hindrar att ett icke-prod-bygge pekar på prod | Att grinden är **enkelriktad** — se § 1.3 |

**Nytt i detta pass:** sex mätningar i vår egen apparat (§ 1), Vercels
förstapartsmodell för miljöer och skydd (§ 3), CORS-mönstret för adresser som
byts varje bygge (§ 4), sju branschledares faktiska form (§ 2), en prövning av
kortets tre vägar plus två vägar kortet inte tog upp (§ 6), och en
kostnadsjämförelse (§ 7).

**Åldersbedömning.** `ADR-050`:s branching-avvisning är knappt tre månader
gammal. Den vilar på en egenskapsbedömning ("vi vill ha en långlivad, konstant
prod-spegel"), inte på en prisuppgift eller en produktbegränsning — och den
sortens skäl åldras långsamt. Prövad i § 6.4: den håller, men av ett delvis
annat skäl än det som står skrivet.

`ADR-132` är från i dag och behöver ingen omprövning; detta pass svarar på den
fråga dess beslut 8 lämnade öppen.

---

## 1. Vad jag mätte i vår egen apparat (2026-09-06)

Sex mätningar. Var och en gjord mot den version vi faktiskt kör, inte citerad.

### 1.1 En miljövariabel från Vercel VINNER över den incheckade `.env.production`

Detta är den avgörande mekaniska frågan för väg (a): räcker det att Marcus
sätter tre variabler i Vercel, eller krävs kod?

Först i källan. Vite 8.2.2 (installerad version, avläst med
`require('vite/package.json').version`) bygger sin miljövariabel-karta i
`loadEnv`, och de tre sista raderna i funktionen kör i denna ordning:

```js
for (const [key, value] of Object.entries(parsed)) if (…) env[key] = value;   // .env-filerna
for (const prefix of prefixes) Object.assign(env, getEnvs({ prefix }));
for (const key in process.env) if (…) env[key] = process.env[key];            // processens env — SIST
```

Processens miljö appliceras alltså sist och skriver över `.env`-filernas
värden.

Sedan en skarp mätning, inte bara källkodsläsning. Ett fullt bygge kördes med
stagings adress injicerad som processvariabel, mot en egen utkatalog så att
`dist/` inte rördes:

```bash
VITE_SUPABASE_URL="https://pqtshyierkdgwdnxuirz.supabase.co" npx vite build --outDir <scratch> --emptyOutDir
```

Bygget gick igenom (exit 0), och den färdiga bundeln innehåller **exakt en**
Supabase-adress — stagings. Prod-adressen ur den incheckade `.env.production`
finns inte kvar någonstans i `assets/`.

**Följd:** väg (a) kräver **ingen** kodändring för att byta datakälla. Tre
variabler i Vercels Preview-target räcker, och de är Marcus händer.

### 1.2 Förhandsvisningarna är REDAN skyddade — de är inte publika

Kortet och `ADR-132` § Mätningar formulerar risken som *"var och en som klickar
i ett förhandsbygge rör Lottas riktiga data"*. Det är sant om datan, men
räckvidden är snävare än formuleringen antyder.

Mätt mot den preview-adress kortet namnger, 2026-09-06 kl. 10:54 UTC:

```text
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2F…&nonce=…
set-cookie: _vercel_sso_nonce=…
x-robots-tag: noindex
```

En anonym besökare skickas till Vercels inloggning. **Deployment Protection
(Vercel Authentication) är påslagen** för projektets förhandsvisningar, och
sidan är dessutom märkt `noindex`. Det matchar Vercels egen ändringslogg —
skyddet är numera på som standard för nya projekt.

**Följd:** exponeringen är inte publik. Den är *"alla vi bjuder in"* — och det
är precis den kategori Lotta hamnar i när Marcus skickar en delningslänk med
orden "titta på det här". Risken är verklig, men den är en förväxlingsrisk, inte
ett internet-läckage. Det påverkar inte domen; det påverkar hur brådskande den
är.

### 1.3 Koherensgrinden är enkelriktad — och det är TUR för väg (a)

`src/lib/env-coherence.ts` fäller uppstarten om ett **icke-prod-läge** pekar på
prod-projektet. Den fäller **inte** i motsatt riktning — ett bygge i
produktionsläge som pekar på staging passerar.

Ett Vercel-förhandsbygge kör `npm run build` utan lägesflagga, alltså Vites
`production`-läge. Väg (a) ger därför ett produktionsläges-bygge mot
stagings adress — vilket grinden släpper igenom, med avsikt.

Samma asymmetri finns i `scripts/check-staging-bundle.sh`: den bevisar att ett
staging-bygge ÄR ett staging-bygge, men ingenting bevisar att ett
**förhandsbygge** inte bär prod-adressen. Det är den spegelbild `ADR-132`:s
invariantlista redan efterlyser, och den saknas fortfarande.

### 1.4 Nästan all data går via Edge Functions — så CORS ligger i kritisk väg

Räknat i `src/`: **40 distinkta Edge-Function-namn** anropas från klienten
(`callEdgeFunction` / `postEdgeFunction`), mot **ett enda** direktanrop mot
databasen (`.from(`) i hela `src/data/`.

Varje sådant anrop passerar `supabase/functions/_shared/cors.ts`, som matchar
Origin-huvudet **exakt** mot en kommaseparerad lista och nekar som standard.
En preflight utan godkänd origin svarar 403.

**Följd:** en förhandsvisning som pekas mot staging utan CORS-ändring är inte
"delvis begränsad" — den är en app där i princip varje skärm är tom och varje
knapp fallerar. CORS-frågan är inte en detalj i väg (a); den är väg (a).

### 1.5 Anropen bär inte kakor — vilket ändrar säkerhetsargumentet

`src/data/config/supabase-client.ts` skickar `Authorization: Bearer <token>`
som ett vanligt huvud och sätter aldrig `credentials: 'include'`.

Det betyder att anropen inte är *credentialed* i CORS-mening. Webbläsarens
förbud mot `Access-Control-Allow-Origin: *` tillsammans med inloggningsuppgifter
— MDN: *"the server must not specify the `*` wildcard for the
`Access-Control-Allow-Origin` response-header value, but must instead specify
an explicit origin"* — gäller alltså tekniskt inte oss.

**Följd:** argumentet mot en bred allowlist hos oss är **inte** att webbläsaren
skulle blockera den. Argumentet är djupförsvar: en angripares sida kan inte
läsa vår token ur en annan origins lagring, så en bred lista är inte akut
farlig — men den tar bort ett lager utan att ge något tillbaka. Skriv aldrig om
detta stycke till att påstå att `*` är mekaniskt omöjligt hos oss; det är det
inte.

### 1.6 Stagings CORS-lista är redan lastbärande — och portlåst

Stagings `CORS_ALLOWED_ORIGINS` bär i dag `admin.miranon.dev` plus
`http://localhost:5173`, och den lokala porten är **låst** just därför:
`playwright.config.ts` skriver ut att *"E2E-portlåset till 5173 är
CORS-bundet"*.

**Följd:** hemligheten är inte en fritt redigerbar lista. Ändras den fel
slutar hela E2E-sviten mot staging att fungera. Det är ett argument för att
lägga preview-mönstret i en **egen** variabel i stället för att bygga ut den
befintliga strängen.

---

## 2. Branschmönstret — tre former, och vem som använder vilken

Sju leverantörers förstapartsdokumentation lästes. Formerna är tre, inte sju.

| Mönster | Vem | Isolering | CORS-konsekvens | Skydd | Kostnad för oss |
|---|---|---|---|---|---|
| **Egen efemär backend per PR** | Heroku Review Apps (ursprunget) · Render Preview Environments · Railway PR Environments · Neon-branch per gren · Supabase Branching | Total — egen databas, egna tillägg, raderas när PR:en stängs | Löses av leverantören: adress och nycklar injiceras per deploy | Plattformens eget | Supabase-branch från **0,01344 USD/h**, plus en helt ny seed-apparat och en väg för Airtable-, Resend- och DocRaptor-hemligheterna |
| **Delad förproduktions-backend** | Vercels egen staging-vägledning · Netlifys deploy-kontexter · Vercel Custom Environments | Miljönivå — en övningsvärld, delad av alla förhandsvisningar | **Vår enda öppna fråga** — origin byts per bygge, backend allowlistar exakt sträng | Deployment Protection (redan på, § 1.2) | **0 kr** — miljön finns, datan finns, en kodändring i `cors.ts` |
| **Förhandsvisning mot produktion** | Ingen leverantör dokumenterar det som avsett läge; Heroku förbjuder motsvarande uttryckligen | Ingen | Ingen — origin ligger redan i prod-listan? Nej: den fungerar i dag bara för att prods lista råkar vara öppnare, se not | Deployment Protection | 0 kr, och en tyst sidoeffekt per klick |

> **Not till tredje raden.** Att våra förhandsvisningar fungerar mot prod i dag
> betyder att prod-projektets `CORS_ALLOWED_ORIGINS` redan släpper igenom dem,
> eller att de skärmar som prövats inte når en Edge Function. Vilket av de två
> är **inte mätt** i detta pass — se § Vad jag inte kunde belägga. Det är i sig
> värt en kontroll: är prods lista bredare än stagings, är det en avvikelse som
> ingen bokfört.

**Domen om vilket mönster som är "etablerat":** båda de två första är etablerade
— de svarar bara på olika problem.

- Den efemära formen finns för **schemaändringar**. Heroku, Render, Railway och
  Neon beskriver alla samma nytta: att en migrering ska kunna provas utan att
  röra något annat lag. Neon säger det rakt ut: *"This isolation allows you to
  test data and schema changes safely in each pull request."*
- Den delade formen finns för **granskning**. Vercels egen
  staging-vägledning pekar mot Custom Environments med egna miljövariabler, och
  Netlifys deploy-kontexter finns för exakt samma sak: *"This can be helpful if
  you want to set a different CMS environment to use for production versus
  Deploy Previews."*

Heroku, som uppfann hela kategorin 2015, bär den skarpaste meningen om vad man
inte gör:

> *"Copying full database contents to a Review apps is not currently supported.
> Copying production data to test apps means risk of data leaks or other
> programming mistakes operating on recent customer data. Instead, we recommend
> seeding databases comprehensively with non-production data using seed
> scripts."*

Det är den meningen vår situation bryter mot — vi delar inte bara data med
produktionen, vi delar **produktionen**.

---

## 3. Vad Vercel förstapart faktiskt erbjuder

Fem saker, alla lästa i deras dokumentation, och alla relevanta för beslutet.

1. **Tre miljöer med egna variabler.** *"Every environment can define its own
   unique environment variables, like database connection information or API
   keys."* Preview-variabler gäller varje gren som inte är produktionsgrenen.
2. **Grenspecifika variabler ovanpå det.** *"Any branch-specific variables will
   override other preview environment variables with the same name. This means
   you don't need to replicate all your existing preview environment variables
   for each branch."* Det ger en väg att låta EN gren peka någon annanstans
   utan att röra resten.
3. **Custom Environments — 1 per projekt på Pro, utan extra kostnad.**
   *"Custom environments are useful for longer-running pre-production
   environments like `staging`, `QA`."* De bär branch-tracking, egen påhängd
   domän och import av variabler från en annan miljö. Detta är svaret på
   `ADR-132` beslut 3:s öppna fråga *"eget projekt eller egen miljö"* — en egen
   miljö finns, är gratis på vår plan, och ger demoappen en fast adress.
4. **Två adressformer per förhandsvisning.** Commit-adressen
   `<projekt>-<niotecken-hash>-<scope>.vercel.app` och gren-adressen
   `<projekt>-git-<gren>-<scope>.vercel.app`, där grenadressen *"will always
   show you the most recent changes for the branch"*. **Mätt avvikelse:** vår
   faktiska adress är `miranon-media-admin-dot85l7sz.vercel.app` — projektnamn
   plus nio tecken, **utan** scope-del. Det spelar roll i § 4.
5. **Preview Deployment Suffix** — ett tillägg som byter ut `vercel.app` mot en
   egen domän. *"Preview Deployment Suffixes allow you to customize the URL of a
   preview deployment by replacing the default `vercel.app` suffix with a custom
   domain of your choice."* Kräver att domänen ligger på Vercels namnservrar,
   och är ett betalt tillägg på Pro.

Och en sak till, som är en dold kostnad i väg (b): *"Pushing a commit to a Git
repository that is connected with multiple Vercel projects will result in
multiple deployments being created and built in parallel for each."* Ett andra
projekt mot samma repo bygger alltså på **varje** push, inte bara när man vill
se demot — om det inte stryps med `ignoreCommand` eller
`git.deploymentEnabled: false`.

---

## 4. CORS-frågan — den enda som kräver kod

### Vad problemet är, exakt

`cors.ts` gör `allowlist.includes(origin)`. En förhandsvisning får en ny
origin per bygge. De två kan aldrig mötas utan en regeländring.

### Vad branschen gör — och det finns ett förstaparts-facit i vår egen stack

**Supabase löser exakt detta problem, för exakt Vercel, i sin egen produkt.**
Deras auth-tjänst har samma slags allowlista för `redirect`-adresser, och deras
dokumentation rekommenderar ett **mönster**, inte en exakt sträng:

- `http://localhost:3000/**`
- `https://*-<team-or-account-slug>.vercel.app/**`

Där `*` *"matches any sequence of non-separator characters"* och `**`
*"matches any sequence of characters"*, med `.` och `/` som avgränsare.

Det är precis den form vår `cors.ts` saknar. Och den är inte ett vidöppet
wildcard — den är **ankrad i något vi äger**: leverantörens slug.

**Kaviaten är mätt och viktig:** Supabases föreslagna ankare är team-slugen i
slutet av värdnamnet, och våra adresser bär ingen slug (§ 3 punkt 4). Vårt
ankare måste därför vara **projektnamnet i början**, alltså formen
`https://miranon-media-admin-<något>.vercel.app`. Det är ett svagare ankare:
`vercel.app`-namnrymden är global, så ett främmande team kan i princip skapa
ett projekt vars adress också börjar med vårt projektnamn.

### Varför det ändå är försvarbart här

Tre skäl, i fallande styrka:

1. **Mönstret läggs bara i STAGING.** Prods `CORS_ALLOWED_ORIGINS` förblir
   exakt-matchning. Det som kan nås via mönstret är en fixturvärld.
2. **En främmande sida kan ändå inte agera.** Våra Edge Functions kräver
   `Authorization: Bearer <token>` som appen sätter själv, och ingen kaka rids
   med automatiskt (§ 1.5). En angriparsida på en liknande adress kan inte läsa
   vår token ur en annan origins lagring.
3. **`requireUser` står kvar bakom.** CORS är webbläsarsäkerhet, inte
   server-auth — det står redan utskrivet i `cors.ts` egen huvudkommentar.

### Formen jag skulle rekommendera om vägen väljs

En **egen** variabel vid sidan av den befintliga, aldrig en utbyggnad av
strängen (§ 1.6):

- `CORS_ALLOWED_ORIGINS` — orörd, exakt matchning, i båda miljöerna.
- `CORS_PREVIEW_ORIGIN_PATTERN` — sätts **endast** i staging, tom i prod, och
  tom betyder av. Matchningen görs på den *parsade* adressen: schemat måste
  vara `https:`, och värdnamnet måste matcha mönstret i sin helhet
  (`^…$`) — aldrig en delsträngskontroll.
- `Vary: Origin` läggs på svaret. MDN: *"the server should also include
  `Origin` in the `Vary` response header to indicate to clients that server
  responses will differ based on the value of the `Origin` request header."*
  Det gäller redan i dag för den exakta listan och saknas — ett litet
  sidofynd, se § Oväntade fynd.

### Två alternativ jag prövade och valde bort

- **Preview Deployment Suffix** ger previews en adress under en domän vi äger
  (`*.förhandsvisning.miranon.dev`), vilket tar bort hela namnrymdsrisken. Det
  är den tekniskt renaste vägen. Den är ett **betalt** Pro-tillägg och kräver
  att domänen flyttas till Vercels namnservrar. Rätt uppgradering senare, fel
  förstasteg.
- **Proxy via Vercel-omskrivning.** Vercel stöder omskrivning till en extern
  adress — *"A request to `/api/users` will be forwarded to
  `https://api.example.com/users` without changing the URL in the browser"* —
  vilket skulle göra alla anrop till samma origin och avskaffa CORS helt. Men
  vår `vercel.json` har redan en catch-all-omskrivning för
  ensidesapplikationen, `VITE_SUPABASE_URL` valideras som en fullständig URL i
  `src/env.ts`, och `supabase-js` egen auth-trafik går utanför våra två
  hjälpfunktioner. Det blir en ny, egen apparat för att slippa en
  fyrraders-regel. Avvisad som över-arbete — men den är den rätta formen om vi
  någon gång vill att appen ska tala med en backend utan CORS alls.

---

## 5. Skydd — den delen är redan gjord

Vercels skyddsformer och vad de kostar:

| Metod | Plan | Vår status |
|---|---|---|
| Vercel Authentication | alla planer | **PÅ** (mätt, § 1.2) |
| Password Protection | Enterprise, eller Pro-tillägg 150 USD/mån | av |
| Trusted IPs / Passport | Enterprise | av |
| Standard Protection (allt utom produktionsdomänen) | alla planer | motsvarar det mätta beteendet |

Vercel skriver själva att en genererad adress *"is publicly accessible by
default, but you can configure it to be private using deployment protection"* —
och för oss är den alltså redan privat. **Ingen åtgärd behövs på skyddssidan,
oavsett vilken väg som väljs.** Det är värt att skriva ut, eftersom
skyddsfrågan annars lätt blandas ihop med datafrågan; de är oberoende.

Vad som inte finns och inte heller bör byggas: ett "skrivskyddat
förhandsvisningsläge". Ingen av de sju leverantörerna erbjuder det, och ingen
av dem rekommenderar det. Branschsvaret på "previewen får inte skriva i skarp
data" är genomgående *byt datakälla*, aldrig *stäng av skrivningar*.

---

## 6. Prövning av vägarna

### 6.1 Väg (a) — Preview-target pekar mot staging

**Håller.** Mekaniken är mätt och kräver ingen kod för datakällan (§ 1.1).
Koherensgrinden släpper igenom formen med avsikt (§ 1.3). Miljön finns, är
fylld, och har mailspärr.

Vad den kostar i arbete: kodändringen i `cors.ts` med tvåsidig testsvit
(tillåten preview-origin → 200, snarlik-men-otillåten → 403), en ny
staging-hemlighet, och en verifiering av att en ny förhandsvisnings bundel bär
stagings adress — kortets eget AC #2, med `grep` mot bundeln.

Vad den kostar i egenskap: **granskning mot Lottas riktiga data flyttar till
`admin.miranon.dev`.** Det är inte en förlust — det är samma disciplin
`CONTRIBUTING.md` redan har för granskning ("verifiera mot dev-server eller
staging, aldrig mot en väntad landning"). Men det ska sägas rakt ut, eftersom
det ändrar en vana.

Två småfällor som följer med, båda kända innan bygget:

- **Inloggning.** Staging har egna användarkonton. En förhandsvisning kräver
  ett staging-konto; Lotta har inte nödvändigtvis ett.
- **`glomt-losenord.tsx` hårdkodar produktionsadressen** som återkomstlänk. I
  en staging-pekad förhandsvisning skickar "glömt lösenord" alltså användaren
  till produktionen. Litet, men verkligt.

### 6.2 Väg (b) — demoappens Vercel-yta bygger PR-grenar, previews i prod-projektet stängs av

**Håller delvis, men löser inte det den ser ut att lösa.**

Om demoappens yta ska bygga **PR-grenar** får varje sådant bygge en ny
`*.vercel.app`-adress — exakt samma CORS-problem, bara flyttat till ett annat
projekt. Väg (b) undviker alltså inte kodändringen; den flyttar den.

Väg (b) blir billig först i sin *smala* form: demoappen bygger bara `main`, till
**en** fast adress, och per-PR-förhandsvisningar stängs av helt
(`git.deploymentEnabled: false` eller `ignoreCommand`). Då behövs bara den enda
adressen i stagings lista — men då har vi också avskaffat förhandsvisningarna
som granskningsyta, vilket är en verklig förlust.

Dessutom: ett andra projekt mot samma repo bygger på varje push (§ 3), vilket
dubblar byggen om det inte stryps.

**Men en del av (b) är rätt, och bör plockas ut ur den:** demoappen behöver en
fast adress. Vercels **Custom Environment** ger den utan ett andra projekt — 1
per projekt på Pro, utan extra kostnad, med påhängd domän och egna variabler.
Det är svaret på `ADR-132` beslut 3:s öppna fråga, och det svarar ja på
uppdragets fråga *"kan ett projekt lösa två behov"*: ja — Production mot prod,
Preview mot staging, en Custom Environment `demo` mot staging med fast adress.

### 6.3 Väg (c) — behåll och bokför

**Faller.** Inte på risknivån — den är lägre än kortet antyder (§ 1.2) — utan
på att den gör ett *tyst* tillstånd till ett *bokfört* tillstånd utan att göra
det säkrare, och kostnaden att laga är noll kronor och en halv dag. Heroku
förbjuder motsvarande uttryckligen; ingen av de sju leverantörerna beskriver
"preview mot produktion" som ett läge man väljer.

### 6.4 Det branschen gör som kortet inte täckte, väg (d) — databasgren per PR

Detta är det **dominerande** mönstret hos leverantörerna, och det finns
färdigbyggt för exakt vår stack. Supabases Vercel-integration gör jobbet
själv:

> *"Supabase automatically updates your Vercel project with the correct
> environment variables for the corresponding preview branches."*

Synken sker *"at the time of Pull Request being opened"*, och Supabase kör
automatiskt om senaste deployen för att undvika kapplöpning. Neon gör samma
sak: *"The integration receives a webhook from Vercel and creates a new Neon
branch named `preview/<git-branch>` using the Neon API. Vercel receives the new
connection string and injects it as environment variables for that specific
deployment only."*

Kostnaden är låg i pengar: *"A branch running on the default Micro Compute size
starts at $0.01344 per hour."* En gren som lever ett dygn kostar ungefär 0,32
USD; en permanent gren ungefär 9,7 USD i månaden.

**Ändå: avvisad för oss nu, och `ADR-050`:s avvisning håller — men av ett
annat skäl än det som står skrivet.** `ADR-050` avvisade branching för att vi
ville ha en långlivad prod-spegel. Det skälet gäller fortfarande, men det är
inte det som fäller vägen i dag. Det som fäller den är att **en databasgren inte
är hela vår backend**:

- `AIRTABLE_BASE_ID` är en hemlighet per Supabase-projekt
  (`supabase/functions/_shared/airtable-client.ts`). En gren skulle behöva sin
  egen Airtable-bas, eller skriva i stagings.
- Mailspärren, kvittoserien, DocRaptor-nyckeln och `RESEND_TEST_ADDRESSES` är
  också projekthemligheter.
- Varje ny gren startar tom — *"By default, new branches do not start with any
  data or storage objects from your main project"* — så hela `seed:review`- och
  fixturapparaten skulle behöva köras per gren.

Det är en betydande ny apparat för att lösa ett problem vi inte har: vi har
inga samtidiga, konfliktande schemaändringar som stör varandra. **Kortets
rekommendation att inte gå den vägen nu är alltså rätt — men skälet bör bokföras
som "vår backend är bredare än databasen", inte som "branching är avvisat".**

Vägen bör hållas öppen som naturlig uppgradering när Fas E:s hyresgäst-modell
landar och Airtable-beroendet är borta.

### 6.5 Sammanfattande prövning

| Väg | Löser dataproblemet | Kräver kod | Kostar pengar | Behåller per-PR-granskning | Dom |
|---|---|---|---|---|---|
| (a) Preview → staging | ja | ja, en regel i `cors.ts` | nej | ja | **förstahandsval** |
| (b) demoappens yta bygger PR-grenar | ja | ja, samma regel | nej, men dubblar byggen | ja | löser inget (a) inte löser |
| (b-smal) demoapp på `main`, previews av | ja | nej | nej | **nej** | reservväg om (a) faller |
| (c) behåll | nej | nej | nej | ja | avvisas |
| (d) databasgren per PR | ja, mest av alla | ja, mycket | ~0,3 USD/dygn per gren | ja | rätt senare, fel nu |
| Custom Environment för demoappen | — | nej | nej | — | **ta med oavsett väg** |

---

## 7. Kostnad och underhåll för oss, väg för väg

| Post | (a) | (b-smal) | (d) |
|---|---|---|---|
| Löpande pengar | 0 | 0 | ~0,32 USD per grendygn |
| Ändring i `supabase/functions/_shared/cors.ts` | ja — mönstermatchning + `Vary: Origin` | nej | ja, samma |
| Ny staging-hemlighet | ja, `CORS_PREVIEW_ORIGIN_PATTERN` | nej (en fast origin i befintlig lista) | ja |
| Vercel-inställningar (Marcus händer) | tre variabler på Preview-target | avstängning + en Custom Environment | integration + variabler |
| Ny testsvit | ja, tvåsidig i `cors.ts`-familjen | nej | ja |
| Ny grind som saknas i dag | spegelbilden av `check-staging-bundle.sh` — bevisa att ett förhandsbygge INTE bär prod-adressen | samma | samma |
| Samspel med `ADR-132`:s demoapp | **samma inställningar bär båda** | demoappen ÄR ytan | orelaterat |
| Underhåll över tid | nära noll | nära noll | en seed-väg per gren |

**Samspelet med `ADR-132` är det starkaste ekonomiska argumentet för (a).**
Demoappen behöver enligt beslut 3 en yta som bygger samma kod mot staging med
stagings publika värden och demoappens origin i `CORS_ALLOWED_ORIGINS`. Väg (a)
kräver exakt samma tre saker för Preview-target. Väljs (a) är demoappens
driftsättning (`TASK-414.3`) i praktiken redan halvbyggd, och mönstret i
`cors.ts` täcker demoappens fasta adress lika väl som förhandsvisningarnas
växlande.

---

## Dom

**Det etablerade mönstret för ett team i vår storlek och stack är: en delad
förproduktions-backend som alla förhandsvisningar pekar mot, med
adressmatchning på mönster i stället för exakt sträng, och plattformens eget
inloggningsskydd framför förhandsvisningarna.** Vi har redan backenden, datan
och skyddet. Det som saknas är två inställningar och en regel.

Den efemära formen — en egen databas per förslag — är den mönsterform
leverantörerna säljer hårdast och den som löser mest, men den löser
schemakonflikter mellan parallella utvecklare. Det problemet har vi inte, och
priset i vår apparat betalas inte i dollar utan i en ny seed- och
hemlighetsväg per gren.

Att låta en förhandsvisning tala med produktionen är inget mönster. Ingen av de
sju leverantörerna beskriver det som ett val; den som uppfann formen förbjuder
det närmaste motsvarande i klartext.

---

## Vad jag inte kunde belägga

1. **Varför förhandsvisningarna fungerar mot prod i dag.** Antingen är prods
   `CORS_ALLOWED_ORIGINS` bredare än stagings, eller så har ingen klickat sig
   till en skärm som når en Edge Function. Jag kunde inte läsa prod-projektets
   hemligheter (prod-låset, och rätt så). **Det bör mätas innan väg (a)
   verkställs** — visar det sig att prods lista är bred är det ett eget fynd.
2. **Om en Custom Environment kan spåra produktionsgrenen.** Demoappen ska
   bygga `main`, som redan är Production-grenen. Vercels dokumentation säger att
   custom environments har branch-tracking, men inte om en gren kan spåras av
   två miljöer samtidigt. Detta måste prövas i `ADR-132` skiva 1.
3. **Ordningen mellan omskrivningsregler i `vercel.json`.** Proxy-alternativet
   (§ 4) förutsätter att en regel före catch-all vinner. Jag hittade ingen
   förstapartsmening som slår fast ordningen. Eftersom alternativet ändå
   avvisas påverkar det inte domen.
4. **Priset på Preview Deployment Suffix.** Dokumentationen hänvisar till
   pris-sidans avsnitt för Pro-tillägg; jag hämtade inte den sidan.
5. **Om Supabase-grenar pausar när de är inaktiva.** Kostnadssidan säger
   ingenting om det, och siffran ovan antar därför att en gren kostar så länge
   den finns.
6. **Vår gren-adressform.** Jag mätte commit-adressen
   (`miranon-media-admin-dot85l7sz.vercel.app`, utan scope-del) men inte
   gren-adressen `…-git-<gren>-…`. Mönstret i § 4 måste därför prövas mot
   **båda** formerna innan det låses.
7. **Om Deployment Protection står på "Standard" eller "All Deployments".**
   Jag mätte att förhandsvisningen kräver inloggning; jag mätte inte
   produktionsdomänen och kan därför inte skilja de två inställningarna åt.
8. **Netlifys egen sida om deploy-previews** gav 404 på den adress jag prövade;
   uppgifterna om Netlify kommer från deras dokumentationssök och citaten är
   kortare än för övriga leverantörer.

---

## Rekommendation

> Detta är en **rekommendation**, inte ett beslut. Beslutet är Marcus.

**Förstahandsval: väg (a) — koppla Vercels Preview-target till staging, och ge
`cors.ts` ett mönster för förhandsvisningarnas adresser.**

I den ordningen:

1. **Mät först** vad prods `CORS_ALLOWED_ORIGINS` faktiskt innehåller (öppen
   punkt 1 ovan). Det tar minuter och kan avslöja ett eget fynd.
2. **Bygg regeln före omkopplingen.** `CORS_PREVIEW_ORIGIN_PATTERN` som egen
   variabel, endast i staging, tom betyder av, matchning på hela värdnamnet mot
   både commit- och grenadressens form, plus `Vary: Origin`. Tvåsidig testsvit.
3. **Marcus sätter tre variabler** på Preview-target: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_FEATURE_BETALNINGAR` — stagings värden.
4. **Verifiera med kortets egen metod:** `grep` mot en ny förhandsvisnings
   bundel; stagings adress ska finnas, prods inte.
5. **Bokför vaneändringen** i `CONTRIBUTING.md`: granskning mot Lottas riktiga
   data sker på `admin.miranon.dev`, aldrig i en förhandsvisning.

**Ta med oavsett väg:** låt `ADR-132`:s demoapp bli en **Custom Environment** i
det befintliga Vercel-projektet, inte ett andra projekt. Det är gratis på vår
plan, ger demoappen en fast egen adress, och undviker att varje push bygger två
gånger.

**Reservväg om (a) faller** (om mönstermatchningen visar sig ogenomförbar eller
prods CORS-lista avslöjar något oväntat): väg (b) i sin smala form — demoappen
på en fast adress mot staging, och per-PR-förhandsvisningar avstängda i
prod-projektet. Sämre, men aldrig fel.

**Håll väg (d) öppen som uppgradering.** När Fas E:s hyresgäst-modell landar
och Airtable-beroendet är borta blir Supabases Vercel-integration den naturliga
formen, och då är den nästan gratis att slå på.

---

## Oväntade fynd — triage enligt `ADR-053`

| Fynd | Klass | Åtgärd |
|---|---|---|
| **Deployment Protection är PÅ** — förhandsvisningarna är inte publika (§ 1.2). `TASK-415`:s och `ADR-132` § Mätningar a):s formulering är sann om datan men överdriver räckvidden | blockerar ej + värdefullt | **rättelse att föra in i kortet och i `ADR-132`** när grenen `docs/demolaget-adr-prd` landar |
| **Ingen grind bevisar att ett FÖRHANDSBYGGE inte bär prod-adressen.** `check-staging-bundle.sh` vaktar bara staging-bygget; `assertModeCoherent` fäller bara i den ena riktningen (§ 1.3) | blockerar ej + värdefullt | tråd-/kort-kandidat; `ADR-132`:s invariantlista efterlyser redan spegelbilden |
| **`cors.ts` sätter inte `Vary: Origin`** trots att svaret varierar med Origin. MDN säger att servern *should* göra det. Cachningsrisk, liten men verklig | blockerar ej + värdefullt | ta med i samma kodändring som mönstret, annars eget litet kort |
| **`glomt-losenord.tsx` hårdkodar produktionsadressen** som återkomstlänk — i en staging-pekad förhandsvisning skickas användaren till produktionen (§ 6.1) | blockerar ej + lågvärde | **förkastas explicit** som eget arbete nu; noteras här och tas om det gör ont i praktiken |
| **Ett andra Vercel-projekt mot samma repo bygger på VARJE push** (§ 3) — dold kostnad i väg (b) som kortet inte nämner | blockerar ej + värdefullt | bokfört i § 7; påverkar `TASK-414.3`:s form |
| **`ADR-050`:s branching-avvisning håller, men av fel nedskrivet skäl** (§ 6.4) — det verkliga hindret är att vår backend är bredare än databasen | blockerar ej + värdefullt | en `Updates`-rad i `ADR-050` när någon ändå rör den; inte värt en egen landning |

---

## Källförteckning

### Förstapart — Vercel

- Miljöer, förhandsvisningar, Custom Environments: <https://vercel.com/docs/deployments/environments>
- Miljövariabler per target och per gren: <https://vercel.com/docs/environment-variables>
- Genererade adresser, adressformer, Preview Deployment Suffix: <https://vercel.com/docs/deployments/generated-urls>
- Preview Deployment Suffix i detalj: <https://vercel.com/docs/deployments/preview-deployment-suffix>
- Deployment Protection, metoder och planer: <https://vercel.com/docs/deployment-protection>
- Omskrivningar till externa adresser: <https://vercel.com/docs/routing/rewrites>
- Projektkonfiguration (`vercel.json`-nycklar): <https://vercel.com/docs/project-configuration>
- Kunskapsbas, staging-miljö: <https://vercel.com/kb/guide/set-up-a-staging-environment-on-vercel>
- Kunskapsbas, Ignored Build Step: <https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel>
- Monorepo, flera projekt mot ett repo: <https://vercel.com/docs/monorepos>

### Förstapart — Supabase

- Branching, preview- och persistenta grenar, data: <https://supabase.com/docs/guides/deployment/branching>
- Branching-integrationer, Vercel-synken per PR: <https://supabase.com/docs/guides/deployment/branching/integrations>
- Branching-kostnad per timme: <https://supabase.com/docs/guides/platform/manage-your-usage/branching>
- Redirect-adresser, wildcard-syntax, Vercel-mönstret: <https://supabase.com/docs/guides/auth/redirect-urls>
- CORS för Edge Functions: <https://supabase.com/docs/guides/functions/cors>

### Förstapart — övriga plattformar

- Heroku Review Apps (ursprunget till mönstret, och förbudet mot produktionsdata): <https://devcenter.heroku.com/articles/github-integration-review-apps>
- Neon, Vercel-previews-integrationen: <https://neon.com/docs/guides/vercel-previews-integration>
- Render Preview Environments: <https://render.com/docs/preview-environments>
- Railway PR Environments: <https://docs.railway.com/guides/preview-deployments-with-pr-environments>
- Netlify, deploy-previews och deploy-kontexter: <https://docs.netlify.com/deploy/deploy-types/deploy-previews/> och <https://docs.netlify.com/build/environment-variables/overview/>

### Förstapart — webbstandarder

- MDN, CORS: wildcard mot inloggningsuppgifter, och `Vary: Origin`: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>

### Mätt i vår egen apparat 2026-09-06 (inga URL:er — läs filerna)

- `node_modules/vite/dist/node/chunks/node.js` § `loadEnv` (Vite 8.2.2)
- Byggmätning mot egen utkatalog, se § 1.1
- HTTP-mätning mot preview-adressen, se § 1.2
- [`src/lib/env-coherence.ts`](../../src/lib/env-coherence.ts)
- [`scripts/check-staging-bundle.sh`](../../scripts/check-staging-bundle.sh)
- [`supabase/functions/_shared/cors.ts`](../../supabase/functions/_shared/cors.ts)
- [`src/data/config/supabase-client.ts`](../../src/data/config/supabase-client.ts)
- [`vercel.json`](../../vercel.json)
- [`docs/decisions/ADR-050-isolerad-staging-miljo.md`](../decisions/ADR-050-isolerad-staging-miljo.md)
- [`docs/decisions/ADR-061-lokal-miljo-isolation.md`](../decisions/ADR-061-lokal-miljo-isolation.md)
- `docs/decisions/ADR-132-demolaget-staging-som-maskinrum-bakom-dorr-i-prod-appen.md` och
  `docs/research/demolage-i-skarp-app-branschmonster-2026-09-06.md` — **båda
  ligger på grenen `docs/demolaget-adr-prd` och är ännu inte i `main`**, därför
  utan länk härifrån (en relativ länk hade fällt länkgrinden)
