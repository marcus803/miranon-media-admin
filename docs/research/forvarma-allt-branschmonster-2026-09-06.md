---
owner: marcus803
updated: 2026-09-06
review_by: 2026-12-06
status: draft
---

# "Kan vi inte förvärma ALLT?" — branschmönster mot vår Airtable-vägg

> **Proveniens:** avgränsat research-pass, 2026-09-06, kört OISOLERAT i en
> tilldelad worktree (`.claude/worktrees/s123-lotta-prodlage`, `29a3c16d`,
> färsk checkout av `origin/main` — huvudkatalogen ägs av en annan levande
> session och rördes inte). Frågan är Marcus verbatim samma dag: *"Skeleton
> ska fixas men helst aldrig visas, kan vi inte förvärma ALLT, alla sidor och
> allting? Gör inte branschledare så?"* Ingen kod ändrad, ingen ADR skriven —
> enda leveransen är denna fil.

## Vad jag redan hade — inventering FÖRE sökning

Frågan är INTE obesvarad terräng. Fyra ADR:er + tre research-pass bar redan
merparten av underlaget, samtliga lästa i sin helhet innan någon ny
web-sökning gjordes:

- **[ADR-078](../decisions/ADR-078-instant-regeln.md) (INSTANT-regeln,
  2026-07-24)** har REDAN prövat och FÖRKASTAT "prefetcha allt vid
  listöppning" — då för registreringsdetaljer (11 event × 2 anrop mot 5
  req/s-taket). Beslutet lämnade frågan öppen i tråd **T90**, inte som en
  stående regel. Marcus fråga i dag är alltså en omprövning av en redan en
  gång förkastad väg, inte en ny fråga — och den ska behandlas som det.
- **[ADR-112](../decisions/ADR-112-forberedelseskarmen-blockerande-startvarmning.md)
  (Förberedelseskärmen, 2026-08-15)** byggde REDAN en blockerande
  startvärmning — men **medvetet begränsad till sju globala listor**, med
  router-loaders och per-event-data uttryckligen UNDANTAGNA (beslut 6:
  *"Djuplänks-gapet ... är ett separat spår"*). Detta är exakt gränsen
  Marcus fråga trycker på.
- **[ADR-113](../decisions/ADR-113-laddtrappan-yttrappa-for-laddindikatorer.md)**
  reglerar VILKEN indikator som visas NÄR laddning syns — inte om laddning
  ska förekomma. Skilt tydligt från denna frågas scope.
- **[ADR-123](../decisions/ADR-123-forladdat-personregister-sok-och-bokstavsindex-i-klienten.md)**
  (2026-08-24) beslutade nyligen att förvärma HELA personregistret (559
  poster) klientsidan — men höll det ändå UTANFÖR den blockerande
  startvärmningen, uttryckligen **av kostnadsskäl** (§ rad 140–141: *"den
  nya frågan HAR en kärnfråga, den hålls utanför av kostnadsskäl, inte av
  principskäl"*). Registret värms i stället PÅ AVSIKT (TabBar-hover) eller
  lat vid första besök. Detta är den senaste, mest direkt jämförbara
  precedenten i repot för exakt den avvägning Marcus fråga ställer.
- **[`app-startup-warmup-splash-2026-08-15.md`](app-startup-warmup-splash-2026-08-15.md)**
  besvarade redan TanStack Router/Query-primitiven (loader+`ensureQueryData`,
  `defaultPreload: 'intent'`, `Promise.allSettled`) och Linear/Figma/Notions
  arkitektur — DUPLICERAS INTE här. Detta pass återanvänder de fynden och
  tillför NYA källor (Next.js `<Link>`, React Router `prefetch`-propen,
  Vercel-kostnadsanalys) som svarar på delfråga 3 specifikt.
- **[`forladdat-personregister-klientsok-branschmonster-2026-08-21.md`](forladdat-personregister-klientsok-branschmonster-2026-08-21.md)**
  gav skalgränsen för KLIENTSÖK i EN redan-laddad datamängd (Linear,
  Superhuman, MiniSearch) — en annan fråga än "ska vi ladda datamängden
  ALLS, för ALLA event, i förväg". Återanvänds för Linears
  lazy-hydrate-nyans (§ 3 nedan), inte för slutsatsen.
- **Rapport D (skeleton-audit) och Rapport E (bilagor-latens)**, körda
  samma dag av en parallell diagnos-agent (scratchpad, ej i repot): D visar
  att sju datamängder redan är varma och att skeleton-risken är
  KONCENTRERAD till vyer UTANFÖR startvärmningen (närvaro, bilagor,
  betalningar, aktivitetshistorik, personer/personDetalj,
  anmälan-detalj) — samt att `defaultPreload` är osatt i `router.ts`
  (chunk-nivå, inte data-nivå). E mäter attachments-latensen konkret
  (1,0–1,6 s varmt, upp till 10,3 s kallt) och pekar ut rotorsaken: ingen
  prefetch finns för bilagor, varken på avsikt eller vid sidmontering.

**Åldersbedömning:** allt ovanstående är från 2026-07-24 till i dag
(2026-09-06) — max sex veckor gammalt, inget bedöms förlegat i den mening
att premisserna hunnit ändras. Det som DÄREMOT har ändrats mätbart under
samma period är själva skalan frågan gäller: eventantalet har vuxit **11 →
57** (se § 4) sedan ADR-078 gjorde sin ursprungliga kostnadsberäkning. Det är
skälet till att räkna om, inte till att förkasta det tidigare svaret.

**Vad detta pass tillför NYTT:** (1) en färsk, LIVE mätning av
eventantalet i prod (57, inte 11) och dess statusfördelning, (2) en
konkret Airtable-anropsräkning för "värm närvaro+bilagor för alla event"
härledd direkt ur `get-attendance`/`get-event-attachments`s källkod, (3) tre
nya förstapartskällor (Next.js `<Link>`, React Router `prefetch`-propen,
TanStack Router `preload`-doktrinen) som specifikt besvarar "gör
branschledare det Marcus föreslår", och (4) en explicit dom om ADR-status.

## Kort svar

**Nej — och samtliga tre undersökta router-/ramverksledare (TanStack Router,
Next.js, React Router) bygger uttryckligen INTE en "förvärm allt"-funktion,
utan graderade, opt-in-mekanismer (intent/viewport/render) som en
utvecklare måste välja PER länk eller PER rutt.** Ingen av dem exponerar en
global "preload alla rutter direkt vid appstart"-flagga. Det är inte en
lucka i deras API — det är ett medvetet designval, källbelagt i § 1–3 nedan.

**Hos oss är svaret ännu skarpare, av ett skäl som är specifikt för vår
datakälla:** Airtables 5 req/s-tak är DELAT mellan alla samtidiga
användare av basen (`airtable-constraints.md` P4). En "förvärm allt"-modul
konkurrerar alltså inte bara med sig själv — den stjäl kapacitet från VARJE
annan pågående begäran i appen, för alla användare, samtidigt. Det är en
systemeffekt, inte bara "min egen sessions väntetid".

**Den konkreta räkningen (§ 4):** att förvärma bara TVÅ av de per-event-
datamängder Marcus nämner (närvaro + bilagor) för samtliga 57 event i prod
kräver **≈342 sekventiella Airtable-anrop** — mot det delade 5 req/s-taket
blir det **≈68 sekunder**, cirka 7,6× över Förberedelseskärmens redan
beslutade 9-sekunders hårda tak (ADR-112 beslut 3) — och det är EXKLUSIVE de
sju datamängder som redan värms där. Att begränsa till bara de 14 kommande
("Planerat") eventen ger fortfarande **≈17 sekunder**, nästan dubbelt
befintlig budget, för bara två av flera möjliga per-entitet-datamängder.

**Rätt svar är gradering, inte allt-eller-inget** — exakt det ADR-078 och
ADR-112 redan valde, och exakt det de tre externa ramverken valde. Vad som
SKA byggas är inte "förvärm allt" utan två redan identifierade, billiga
luckor: `defaultPreload: 'intent'` på routernivå (chunk-förvärmning, näst
intill gratis) och prefetch-på-avsikt/mount för de per-event-datamängder
som i dag saknar det helt (bilagor, närvaro) — samma mönster som redan
finns för event-listan, personregistret och TabBar. Se § 5–6.

## 1. TanStack Router — vad förstapartsdokumentationen faktiskt erbjuder

Källa: [TanStack Router — Preloading](https://tanstack.com/router/latest/docs/framework/react/guide/preloading)
(officiell dokumentation, hämtad 2026-09-06).

- **Fyra lägen, samtliga OPT-IN per länk eller router-brett, ingen
  "allt"-flagga:** `'intent'` (hover/touchstart), `'viewport'`
  (IntersectionObserver — länken måste synas på skärmen), `'render'`
  (så fort länken monteras i DOM:en), `false` (av). Dokumentationens egen
  rekommendation, verbatim: *"The simplest way to preload routes for your
  application is to set the `defaultPreload` option to `intent` for your
  entire router."* — INTE `'render'` eller `'viewport'` som default-råd,
  och definitivt ingen mekanism som preload:ar samtliga rutter oavsett
  synlighet eller avsikt.
- **Färskhets- och städningsfönster, inte "hämta en gång för alltid":**
  `defaultPreloadStaleTime` defaultar till 30 sekunder; `defaultPreloadDelay`
  till 50 ms (rör-vid-länken-fördröjning, så ett hastigt musrörelseförbi
  inte triggar en hämtning); `defaultPreloadGcTime` städar oanvänd
  preload-data efter 5 minuter. Tre separata, medvetna ratter — inte en
  brytare.
- **Explicit hänvisning UTÅT för större kontroll:** *"If you need more
  control over preloading, caching and/or garbage collection of preloaded
  data, you should use an external caching library like TanStack Query."*
  Router-lagret tar sig själv medvetet inte an "hela appens data varm" —
  det är, källbelagt, en annan lagers ansvar.
- **Ingen dokumenterad "preload alla rutter samtidigt"-inställning finns.**
  Sökningen (denna gång riktad specifikt mot just den frågan, till skillnad
  från 2026-08-15-passets bredare genomgång) bekräftar samma nollresultat:
  mekanismen existerar inte, varken som flagga eller som dokumenterat
  mönster.

**Hos oss, mätt (Rapport D, samma dag):** `src/router.ts` sätter INTE
`defaultPreload` alls — default är `false`. Det är den enda av de tre
externa ramverkens defaultläge vi FAKTISKT ligger under (React Router delar
det defaultläget, se § 3), inte över. Att sätta `defaultPreload: 'intent'`
är alltså inte "förvärma allt" — det är att nå det ramverket självt kallar
den enklaste rekommenderade baslinjen, och en ren chunk-nivå-vinst
(kodsplittat route-JS, inte data) med i praktiken ingen kostnad, eftersom
den bara aktiveras på en redan avsedd navigering.

## 2. TanStack Query — prefetching-doktrinen

Källa: [TanStack Query — Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
(officiell dokumentation, hämtad 2026-09-06). Kompletterar, dupliserar inte,
2026-08-15-passets redan etablerade `ensureQueryData`/`placeholderData`-genomgång.

- **`staleTime` är den mekanism som gör "förvärm en gång" billigt** — en
  redan-varm och icke-`stale` query returnerar direkt utan nätverksanrop.
  Detta är exakt varför ADR-112:s sju-datamängders-warmup är billigt vid
  varm start (`ensureQueryData` löser ut på mikrosekunder) och varför en
  NY, obegränsad per-event-uppsättning INTE skulle vara det: varje nytt
  event är per definition en NY query-nyckel utan tidigare cache-post —
  `staleTime` skyddar bara UPPREPADE hämtningar, inte den FÖRSTA.
- **Inbyggd kostnadsspärr mot oanvänd prefetch, citerad verbatim:** *"If no
  instances of `useQuery` appear for a prefetched query, it will be
  deleted and garbage collected after the time specified in `gcTime`."*
  Biblioteket självt antar alltså att en del prefetchad data ALDRIG
  konsumeras och bygger bort den — ett indirekt men tydligt erkännande av
  att blint förvärma är en förlustaffär för den andel som aldrig öppnas.
- **Rekommenderat mönster för icke-kritisk prefetch:** *"discard the
  promise with `void` and use `.catch(noop)`"* — fire-and-forget, eftersom
  *"the query will usually try to fetch again in a `useQuery`"* om
  prefetchen missar. Detta är samma "golvet deklareras, det döljs inte"-
  princip som ADR-078 beslut 5 redan valde för oss.
- **Router-integrationens motivering är att UNDVIKA VATTENFALL, inte att
  maximera täckning:** guiden framhåller mönstret för att en rutt kan
  *"explicitly declare for each route what data is going to be needed for
  that component tree, ahead of time"* — en KÄND, avgränsad datamängd per
  rutt Lotta faktiskt navigerar till. Det är strukturellt en annan sak än
  "hämta alla rutters data för alla möjliga event, oavsett om Lotta
  navigerar dit".

**Slutsats för delfråga 1–2:** ingendera primitiv (Router eller Query)
uppmuntrar eller ens underlättar "förvärm allt". Båda är byggda kring
avgränsad, avsiktsstyrd eller navigationsstyrd hämtning, med explicita
mekanismer (gcTime, staleTime, `defaultPreloadGcTime`) för att kassera det
som visar sig onödigt — kostnadsmedvetenhet är inbyggd i själva
primitiven, inte ett tillägg vi skulle behöva uppfinna.

## 3. Branschledarnas router-/länk-mönster — tre nya förstapartskällor

**Next.js `<Link>`** ([officiell komponentreferens](https://nextjs.org/docs/app/api-reference/components/link),
hämtad 2026-09-06, version 16.3.4): default-beteendet är **viewport-baserat**,
citerat verbatim: *"Prefetching happens when a `<Link />` component enters
the user's viewport (initially or through scroll)."* och *"Prefetching is
only enabled in production."* Även defaultläget (`"auto"`) skiljer på
rutt-typ: statiska rutter förvärms helt, dynamiska rutter bara ner till
närmaste `loading.js`-gräns — en INBYGGD partiell-förvärmnings-avvägning,
inte allt-eller-inget. `prefetch={true}` (förvärma HELA rutten oavsett typ)
är ett EXPLICIT, medvetet opt-in bortom defaulten — inte startpunkten.
Poängen för vår fråga: branschens mest använda meta-ramverk förvärmer bara
det som är SYNLIGT på skärmen just nu, inte varje länk som existerar i
appen, och gör det bara i produktion (inte under utveckling, där kostnaden
för utvecklaren annars vore konstant).

**React Router `<Link prefetch>`** ([officiell API-referens](https://reactrouter.com/api/components/Link),
hämtad 2026-09-06): fyra explicita lägen — `none` (**default, INGEN
prefetch**), `intent` (hover/fokus), `render` (vid montering), `viewport`
(IntersectionObserver, "very useful for mobile"). **Default är av.** Detta
är den skarpaste enskilda datapunkten i hela passet: ett av de tre stora
React-routrarna väljer NOLL prefetch som sitt grundläge och kräver att
utvecklaren AKTIVT slår på en av tre graderade nivåer per länk — raka
motsatsen till "förvärm allt som standard".

**Linear** (redan belagt 2026-08-15-passet, återanvänt här utan
omprövning): lokal-first synk-motor som förvärmer arbetsytans STRUKTUR
direkt men **lazy-hydrerar uttryckligen de TYNGSTA tabellerna** (Issue,
Comment) — citerat i det tidigare passet: *"the two heaviest tables, Issue
and Comment, lazy-hydrate on demand."* Värt att notera EXTRA starkt här:
Linear har i praktiken **ingen nätverkslatens-kostnad** för sin egen
klient (IndexedDB är redan lokal) och väljer ÄND�Å att inte hydrera allt
direkt — kostnadsavvägningen där är minne/CPU, inte nätverk, men slutsatsen
("gradera efter vikt, hydrera inte blint allt") är densamma branschriktning
som Next.js/React Router visar av ett HELT annat skäl (nätverk/server-
kostnad). Två olika kostnadsklasser, samma arkitektoniska svar.

**Sekundärkälla, kostnadsresonemang (Wisp CMS, ["How Vercel's Prefetching
Works: A Deep Dive into Benefits and Gotchas"](https://www.wisp.blog/blog/how-vercels-prefetching-works-a-deep-dive-into-benefits-and-gotchas),
hämtad 2026-09-06 — bloggartikel, inte förstapart, bedömd trovärdig genom
att den citerar dokumenterade community-rapporterade kostnadsproblem):
konkreta gotchas mot aggressiv prefetch: *"Unexpected spikes in billing
during high-traffic periods"*, *"Excessive function invocations from
prefetch requests"*, *"Higher bandwidth costs from preloading unused
resources"*, och en prestandaparadox: *"Multiple JSON files downloading
simultaneously can overwhelm the browser"* / *"Excessive prefetching can
impact Google Lighthouse scores negatively"*. Artikelns egen sammanfattning,
verbatim, är den mest direkta motiveringen mot Marcus fråga hittad i hela
passet: **"The goal isn't to prefetch everything, but to prefetch the right
things at the right time for your users."**

**Vad ingen branschledare visade sig göra:** en global "vid appstart, hämta
samtliga sidors samtliga entiteters data" -mekanism. Ingen av de fem
undersökta (Linear, Next.js, React Router, TanStack Router/Query) bygger
eller dokumenterar en sådan funktion. "Förvärm allt" är alltså inte en
branschstandard som vi avviker ifrån genom att INTE göra det — det är
motsatsen: att bygga det skulle vara avviket.

## 4. Kostnadssidan hos oss — räknat öppet mot vår faktiska bas

**Airtables tak (verifierat, `docs/reference/airtable-constraints.md` §
P4):** 5 anrop/sekund PER BAS, delat mellan ALLA samtidiga klienter — inte
per användare, inte köat. Överskridning ⇒ HTTP 429 ⇒ minst 30 sekunders
lockout (exponentiellt 30→60 s, `airtable-retry.ts`).

**Eventantalet — MÄTT LIVE i dag (2026-09-06), inte antaget:** Airtable
MCP, prod-bas `app8uGPrVCVOm6LfD`, tabell `Eventplanering`
(`tblVE3UKWl1CKrphV`), samtliga poster lästa (`Status`-fält):

| Status | Antal |
|---|---|
| Genomfört | 40 |
| **Planerat** (kommande/aktiva) | **14** |
| Inställt | 3 |
| **Totalt** | **57** |

**Detta är en 5×-tillväxt på sex veckor** — ADR-078:s ursprungliga
kostnadsberäkning (2026-07-24) räknade med **11** event. En "förvärm
allt"-arkitektur som var (marginellt) diskuterbar vid 11 event är
strukturellt värre vid 57, och blir automatiskt värre igen vid nästa
mätning — antalet event växer med tiden, precis tvärtemot personregistrets
platå-liknande tillväxt ("tiotals per år" mot en bas på 559,
`forladdat-personregister-klientsok-branschmonster-2026-08-21.md` §
Fokusfråga 4). En regel byggd mot dagens 57 är redan fel imorgon.

**Per-event-kostnad, härledd direkt ur källkoden (inte gissad):**

- **`get-attendance`** (`supabase/functions/get-attendance/index.ts`,
  rad 150–159): minst **3 sekventiella Airtable-anrop per event** —
  (1) `fetchAirtableRecord` för eventraden, (2) chunkad
  `fetchByRecordIds`-batch för Deltaganden-posterna, (3) en andra
  record-ID-batch för att berika med Personer.Namn. Fler chunkar om
  ett event har många deltaganden (batchstorleken är konfigurerbar,
  `attendanceBatchSize()`).
- **`get-event-attachments`** (`supabase/functions/get-event-attachments/index.ts`,
  Rapport E § 3): minst **2–3 sekventiella/parallella Airtable-anrop per
  event** — eventraden, den chunkade bilage-batchen (2 chunkar mätt vid 57
  länkar), plus en **ovillkorlig, event-OBEROENDE** hämtning av samtliga
  "gemensamma" bilagor som körs om vid VARJE anrop (Rapport E § 3, punkt
  c) — en existerande ineffektivitet oberoende av denna fråga, men den gör
  "förvärm för alla event" dyrare än den behöver vara redan i dag.

**Scenario A — förvärm närvaro + bilagor för SAMTLIGA 57 event:**

```text
57 event × 3 anrop (närvaro)   = 171 Airtable-anrop
57 event × 3 anrop (bilagor)   = 171 Airtable-anrop
                                  ─────────────────
                                  342 Airtable-anrop

342 anrop ÷ 5 req/s (delat tak)  ≈ 68,4 sekunder
```

Det är **≈7,6×** över Förberedelseskärmens redan Marcus-kvitterade 9-
sekunders hårda timeout (ADR-112 beslut 3) — och det är för BARA TVÅ av de
per-entitet-datamängder Rapport D pekar ut som ovärmda (även anmälan-detalj
och betalningar skulle lägga till mer). Siffran räknar dessutom i ett
vakuum: i verkligheten delar detta enda tak med VARJE annan samtidig
användares livehämtningar (P4) — så en "förvärm allt"-warmup för en Lotta
skulle mätbart försämra svarstiden för en samtidigt inloggad Roger, och
tvärtom.

**Scenario B — begränsa till de 14 "Planerat"-eventen (kommande, mest
relevanta):**

```text
14 event × 3 anrop (närvaro) = 42 anrop
14 event × 3 anrop (bilagor) = 42 anrop
                                ────────
                                84 anrop

84 anrop ÷ 5 req/s ≈ 16,8 sekunder
```

Fortfarande **≈1,9×** över den befintliga 9-sekundersbudgeten — och detta
är exklusive de sju datamängder som REDAN konsumerar en del av den
budgeten. Att lägga till även dessa två skulle tvinga antingen en
förlängning av timeout-fönstret (direkt konflikt med NN/g:s 10-sekunders
tålamodsgräns, redan citerad i `app-startup-warmup-splash-2026-08-15.md` §
4) eller en nedprioritering av något av de sju redan beslutade
datamängderna.

**Jämförelse — vad de sju BEFINTLIGA datamängderna kostar:** sju globala
LIST-anrop (en query per datamängd, oavsett hur många rader den innehåller
— events.list hämtar EN lista med 57 rader i ETT svar, inte 57 anrop).
Det är den strukturella skillnaden mellan att förvärma en LISTA (kostnad
oberoende av N) och att förvärma N st PER-ENTITET-detaljvyer (kostnad
linjär i N, och N växer). Startvärmningens kod (`startvarmningen.ts`
rad 234–240) har redan denna princip inbyggd i sin egen kommentar för
personregistret: registret uteslöts av just detta skäl ("registret är en
egen fullwalk ... hör inte hemma framför första bildrutan"), och
resonemanget generaliserar rakt av till varje annan per-event-datamängd.

## 5. Marcus fråga besvarad i tre lager

### (a) Vad som redan ÄR förvärmt (ADR-112)

Sju globala listor, bakom Förberedelseskärmen, blockerande, batchat 2 åt
gången mot 5 req/s-taket, hård timeout 9 s, tyst vid varm cache:
`events.list`, `registrations.all` (delad till `dashboard.*`),
`waitlist.all`, `intresserade.all`, `maillog.all`, `segment.saved`,
`activityLog.latest(4)`. Rapport D bekräftar att detta redan gör Hem,
Event, Eventdetalj (delvis), Anmälningar, Väntelista, Intresserade,
Maillogg och Segment i praktiken skeleton-fria vid normal (varm) drift.

Personregistret (559 poster, ADR-123) förvärms separat, PÅ AVSIKT
(TabBar-hover) — ett medvetet UNDANTAG från den blockerande mängden, av
kostnadsskäl, dokumenterat i koden.

### (b) Vad som kan förvärmas BILLIGT, och NÄR

Graderat efter effekt/kostnad, inte allt på en gång:

1. **`defaultPreload: 'intent'` router-brett** (`src/router.ts`) — chunk-
   nivå, inte data-nivå, näst intill gratis (kostar bara en JS-hämtning på
   HOVER, aldrig okonditionerat). Detta är TanStacks egen förstahandsråd
   (§ 1) och en lucka Rapport D redan hittade och flaggade samma dag utan
   koppling till denna fråga — två oberoende observationer som konvergerar.
2. **Prefetch/mount-hämtning av bilagor och närvaro NÄR EVENT-SIDAN
   monteras** — inte vid varje event i förväg, utan för DET event Lotta
   just öppnat. `AtgardsSida`/`EventCheckin` monteras redan innan Lotta
   fäller ut en åtgärdsrad eller scrollar till närvarolistan (Rapport E,
   förslag F1); en `useEventAttachments(eventId)`-hämtning där, samma
   mönster som redan finns för `events.list`/`registrations.byEvent` i
   samma komponenter, gör den EFTERFÖLJANDE interaktionen en cache-träff
   utan att kosta något för de event Lotta ALDRIG öppnar.
3. **Hover/fokus-prefetch vid INGÅNGARNA** till dessa vyer — "Gå till
   åtgärder"-länken, batchbarens "Åtgärder"-knapp, Check-in-navigering —
   samma etablerade mönster som redan finns för `EventCard`
   (`useForberedEventDetalj`), `TabBar` och `PersonsList`-radhover
   (ADR-078 beslut 3, mätt effekt i PR #163: 1315 ms → 278 ms). Detta är
   INTE en ny regel — det är en tillämpning av en redan befintlig regel på
   två vyer som råkar sakna den.
4. **Route-loader + `prefetchQuery` (aldrig `ensureQueryData`)** som ett
   mer TanStack-idiomatiskt alternativ/komplement till (3) — måste
   uttryckligen INTE blockera navigeringen (Rapport E:s varning: en
   `ensureQueryData`-loader hade återinfört exakt den väntan ADR-078 finns
   för att ta bort).

Gemensamt för samtliga fyra: kostnaden är proportionerlig mot vad Lotta
FAKTISKT gör (öppnar EN sida, hovrar EN länk) — aldrig mot hela
datamängdens storlek eller hela eventregistrets bredd.

### (c) Vad som INTE bör förvärmas, och varför

- **Närvaro/bilagor/anmälan-detalj för SAMTLIGA event i förväg** — § 4
  visar 68+ sekunder för bara två datamängder över 57 event, mot en
  redan beslutad 9-sekundersbudget. Kostnaden är dessutom STRUKTURELLT
  linjär i eventantalet, och eventantalet VÄXER (11→57 på sex veckor) —
  en regel som "fungerar" i dag blir garanterat sämre i morgon, till
  skillnad från personregistrets platå-tillväxt.
- **Obegränsad per-entitet-data generellt** — samma resonemang generaliserar
  till varje framtida per-event eller per-person detaljvy. Reglen
  `startvarmningen.ts` redan kodifierat för personregistret ("en egen
  fullwalk hör inte hemma framför första bildrutan") gäller lika mycket
  här.
- **Airtables DELADE tak gör detta till en systemfråga, inte bara "min
  väntetid".** En användares aggressiva warmup konsumerar kapacitet som
  annars gått till en ANNAN samtidigt inloggad användares LIVE-begäran
  (P4). Detta skiljer vår situation från exempelvis Linears (ingen delad
  server-kvot att konkurrera om) och gör "förvärm allt" dyrare hos oss än
  hos en app med obegränsad egen backend-kapacitet.
- **Färskhet** — ett bulk-förvärmt närvaroregister för ett event tre veckor
  bort skulle vara `stale` (5 min global `staleTime`) långt innan Lotta
  faktiskt öppnar det, så förvärmningen köper ingenting: datan hämtas ändå
  om vid faktiskt besök. Samma poäng som redan gjordes för personregistret
  (`forladdat-personregister...` § Fokusfråga 3) generaliserar hit.
- **Notion-precedenten passar INTE här** — dess "visa aldrig partiell
  data"-princip (citerad i 2026-08-15-passet) gäller uttryckligen OFFLINE-
  sidvisning, inte online-appens bredd av förladdad data. Att åberopa den
  för "förvärm allt online" vore att tillämpa en precedent utanför sitt
  eget scope — flaggat redan förra passet, upprepat här eftersom frågan nu
  ställs direkt.
- **Batteri/mobil** — inte mätt i detta pass (ingen mobil-specifik profil
  fanns att mäta mot), men den generella branschriktningen (§ 3, samtliga
  tre ramverk) väger in nätverks-/batterikostnad som skäl för
  viewport-/intent-gradering snarare än blind eager-hämtning; bokförs som
  ytterligare, overifierat-i-detalj skäl i samma riktning, inte som en
  egen mätt siffra.

## Dom

**Nej, branschledarna "gör inte så" — och hos oss finns dessutom ett
extra, plattformsspecifikt skäl att inte göra det: ett delat, okö:at
Airtable-tak som straffar alla samtidiga användare, inte bara den som
startade förvärmningen.** Samtliga tre undersökta ramverk (TanStack Router,
Next.js, React Router) exponerar grad­erade, opt-in-prefetch-mekanismer
(intent/viewport/render) och explicit INGEN "förvärm allt vid start"-
funktion. Linear, som har den STARKASTE tekniska förutsättningen att kunna
göra det (ingen nätverkslatens alls för sin egen sync-motor), väljer ändå
att lazy-hydrera sina tyngsta tabeller. Den konkreta räkningen mot vår
egen bas (§ 4) visar att "förvärm allt" redan vid dagens 57 event skulle
kräva 7–8× den redan Marcus-kvitterade väntebudgeten för bara två av flera
möjliga per-event-datamängder, och blir strukturellt sämre för varje nytt
event som skapas.

Det Marcus faktiskt vill ha — att skeleton "helst aldrig visas" — nås inte
genom att förvärma mer data, utan genom att göra EXAKT den distinktion
frågan själv antyder utan att säga det rakt ut: **förvärm det Lotta med
hög sannolikhet är på väg till (nästa klick, det event hon redan står på)
tidigt och billigt; låt sidkromet alltid stå stilla; låt bara den smala
datakroppen bära skeleton, och bara för det Lotta INTE redan visat avsikt
för.** Det är samma distinktion Rapport D:s egen slutrad redan formulerar
(*"Sidkromet ... renderas i alla query-tillstånd. Bara datakroppen
växlar"*) och som ADR-113 (Laddtrappan) redan reglerar för HUR den
kvarvarande skeleton-ytan ska se ut när den ändå visas.

## Vad jag inte kunde belägga

- **En exakt siffra för hur mycket dyrare `fetchGemensammaKandidater()`s
  ovillkorliga refetch gör "förvärm alla events bilagor"** — Rapport E
  mätte kostnaden per ANROP (630–680 ms), men detta pass räknade INTE om
  totalkostnaden med en tänkt dedupe-fix applicerad (skulle sänka
  Scenario A/B något, men ändrar inte slutsatsens storleksordning).
- **Batteri-/dataförbrukningskostnad på mobil** för en hypotetisk "förvärm
  allt"-implementation hos oss — ingen egen mätning gjord, bara den
  allmänna branschriktningens resonemang (§ 5c) återges.
- **Om Next.js "auto"-defaultens partiella prefetch (dynamiska rutter ner
  till `loading.js`-gränsen) har en direkt motsvarighet vi kan bygga i
  TanStack Router** — ingen sådan mekanism hittades dokumenterad för
  TanStack Router specifikt; skillnaden mellan ramverken i just den
  detaljen förblir obelagd bortom vad § 1 redan citerar.
- **Exakt hur många Airtable-anrop en `get-attendance`-batch gör för event
  med FLER deltaganden än en chunk** — `attendanceBatchSize()`s faktiska
  värde lästes inte i detta pass; § 4:s "3 anrop" är ett golv (en chunk),
  inte ett tak.
- **Prod-basens fördelning av bilage-antal per event** utöver det enda
  fixtur-mätta talet (59 bilagor / 57 länkar) som Rapport E redan
  citerade — ingen ny mätning av spridningen över samtliga 57 event
  gjordes i detta pass.

## Rekommendation (Code, ej beslut)

1. **Bygg INTE en "förvärm allt"-mekanism.** § 4:s räkning avgör frågan
   numeriskt; § 1–3 visar att ingen undersökt branschledare gör det;
   ADR-078 har redan förkastat den specifika, snävare formen (registrerings-
   detaljer för 11 event) en gång tidigare av samma skäl som nu gäller
   starkare för 57.
2. **Sätt `defaultPreload: 'intent'` i `src/router.ts`.** Lågrisk,
   näst intill kostnadsfri, redan flaggad oberoende av denna fråga
   (Rapport D). Ren konfigurationsändring — under ADR-baren, hanteras som
   en vanlig skiva.
3. **Bygg mount-tids-prefetch för bilagor i `AtgardsSida`** (Rapport E:s
   F1) och överväg samma för närvaro i `EventCheckin` — tillämpning av
   en redan befintlig regel (ADR-078 beslut 3), inte en ny regel. Under
   ADR-baren.
4. **Bygg hover/fokus-prefetch vid ingångspunkterna** ("Gå till
   åtgärder", batchbarens Åtgärder-knapp, Check-in-navigering) — samma
   status som punkt 3.
5. **Om Marcus vill formalisera "sidmontering räknas som avsikt för
   per-event-data" som en stående, namngiven regel** (snarare än
   ad hoc per vy) är rätt form en KORT AMENDERING av ADR-078 (som redan
   äger "prefetch på avsikt"-principen), inte en ny ADR — det är en
   precisering av en existerande regel, inte en ny avvägning. Se § Dom.

## Källförteckning

**Internt (repo, disk-verifierat 2026-09-06, gren
`s123-lotta-prodlage`-worktreen, HEAD `29a3c16d`):**

- [ADR-078 — INSTANT-regeln](../decisions/ADR-078-instant-regeln.md)
- [ADR-112 — Förberedelseskärmen](../decisions/ADR-112-forberedelseskarmen-blockerande-startvarmning.md)
- [ADR-113 — Laddtrappan](../decisions/ADR-113-laddtrappan-yttrappa-for-laddindikatorer.md)
- [ADR-123 — Förladdat personregister](../decisions/ADR-123-forladdat-personregister-sok-och-bokstavsindex-i-klienten.md)
- [ADR-072 — Klient-persist av query-cachen](../decisions/ADR-072-klient-persist-av-query-cachen.md)
- [`app-startup-warmup-splash-2026-08-15.md`](app-startup-warmup-splash-2026-08-15.md)
- [`forladdat-personregister-klientsok-branschmonster-2026-08-21.md`](forladdat-personregister-klientsok-branschmonster-2026-08-21.md)
- [`docs/reference/airtable-constraints.md`](../reference/airtable-constraints.md) § P4
- `src/router.ts`, `src/data/warmup/startvarmningen.ts`
- `supabase/functions/get-attendance/index.ts` (rad 82–159)
- `supabase/functions/get-event-attachments/index.ts` (via Rapport E § 3)
- Rapport D (skeleton-audit, Claude Opus 5, 2026-09-06, scratchpad
  — ej i repot) och Rapport E (bilagor-latens, samma modell/datum)
- Airtable MCP, prod-bas `app8uGPrVCVOm6LfD`, tabell `Eventplanering`
  (`tblVE3UKWl1CKrphV`), samtliga poster lästa 2026-09-06 (57 totalt: 40
  Genomfört, 14 Planerat, 3 Inställt)

**Externt (hämtat 2026-09-06):**

- [TanStack Router — Preloading](https://tanstack.com/router/latest/docs/framework/react/guide/preloading) — förstapart, verbatim
- [TanStack Query — Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) — förstapart, verbatim
- [Next.js — `<Link>` API-referens](https://nextjs.org/docs/app/api-reference/components/link) — förstapart, verbatim (version 16.3.4)
- [React Router — `<Link>` API-referens](https://reactrouter.com/api/components/Link) — förstapart, verbatim
- [Wisp CMS — How Vercel's Prefetching Works: A Deep Dive into Benefits and Gotchas](https://www.wisp.blog/blog/how-vercels-prefetching-works-a-deep-dive-into-benefits-and-gotchas) — sekundärkälla, bloggartikel, citerad för kostnadsresonemang
- performance.dev, [How's Linear so fast? A technical breakdown](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown) — redan citerad 2026-08-15-passet, återanvänd utan omprövning
