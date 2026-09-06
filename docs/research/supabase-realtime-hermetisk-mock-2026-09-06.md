---
owner: marcus803
updated: 2026-09-06
review_by: 2027-03-06
status: draft
---

# Supabase Realtime hermetiskt i fixturvärlden — options-rymden, och ett mätt fel i vår egen WS-vakt (2026-09-06)

> **Proveniens:** avgränsat research- och mätpass för `TASK-409` (hermetisk
> fixturvärld för betalningsfamiljen), kört i egen worktree
> (`.claude/worktrees/agent-a84950dadcba3321b`) ovanpå `origin/main` vid
> `94efd9ed`. Passet svarar på frågan kortet ställer verbatim: *"hur mockas
> Supabase Realtime-kanaler hermetiskt … branschledarnas mönster, inte egen
> uppfinning"*. Det tillför ingen mekanism och rör ingen produktionskod.
>
> **Passet är TVÅDELAT och delarna har olika bevisstyrka.** § 1–5 är
> källkodsläsning och dokumentation (delegerat research-pass). § 6–8 är
> **skarpa mätningar i webbläsare** — nio Playwright-prober körda mot den
> faktiska fixturvärlden. Där de två delarna säger olika saker vinner
> mätningen, och det anges i klartext.

## Svaret, kort

**Vägen är MSW:s `ws.link()` i den befintliga fixturvärlden** — inte
`page.routeWebSocket`, inte transport-injektion i `createClient`, inte
`mock-socket`. Det är den väg repot redan valt, dokumenterat och motiverat i
`tests/support/fixturvarld/websocket-vakt.ts`, och vaktens egen feltext
instruerar den redan.

**Men vägen är i dag STÄNGD av vår egen WS-vakt, och det är mätt.** Så länge
`hermetic.ts` registrerar vakten SIST bland WebSocket-handlers kan ingen
WebSocket-mock i fixturvärlden ta emot ett enda meddelande. Uppkopplingen ser
öppen ut, ingenting fälls, och mocken är stum. Felet är strukturellt, inte en
konfigurationsdetalj — och det är osynligt i dag bara därför att ingen ännu
mockat en WebSocket.

**Fixen är en ordningsändring på en rad**, och den är prövad i båda
riktningar (§ 7).

| Fråga | Svar | Bevis |
|---|---|---|
| Vilken mock-nivå? | MSW `ws.link()` | § 5, § 9 |
| Fungerar den i dag? | **Nej** — vakten gör den stum | § 6, probe A/B |
| Varför? | `WebSocketRoute.onMessage()` är en setter | § 6, källa + probe E |
| Går det att laga? | Ja, ordningen i handler-listan | § 7, probe E3 + F |
| Talar mocken Phoenix? | Ja, hela vägen till `SUBSCRIBED` + event | § 8, probe F |
| Wire-format? | Phoenix **vsn 2.0.0**, JSON-**array** | § 8, mätt |

---

## 1. Vad appen faktiskt öppnar — en korrigering av kortets premiss

`TASK-409`s uppdragstext angav WS-URL:en som `…?apikey=…&vsn=1.0.0`.
**Det stämmer inte.** Mätt i probe B (§ 6), verbatim ur körningen:

```text
wss://visual-fixture.supabase.co/realtime/v1/websocket?apikey=visual-fixture-anon-key&vsn=2.0.0
```

Härledningen bakom mätningen, i installerad kod
(`node_modules/@supabase/realtime-js/dist/main/lib/constants.js`, verbatim):

```js
exports.VSN_1_0_0 = '1.0.0';
exports.VSN_2_0_0 = '2.0.0';
exports.DEFAULT_VSN = exports.VSN_2_0_0;
```

`RealtimeClient._initializeOptions` sätter `result.vsn = options?.vsn ??
DEFAULT_VSN`, och `@supabase/phoenix`s `socket.js` rad 221–223 hänger på
`{vsn: this.vsn}` i URL:en. Repot sätter aldrig `vsn`.

**Skillnaden är inte kosmetisk — den bestämmer mockens form.** vsn 2.0.0
serialiserar varje ram som en JSON-**array**, inte ett objekt
(`realtime-js/dist/main/lib/serializer.js`, verbatim):

```js
let payload = [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload];
return callback(JSON.stringify(payload));
```

En mock skriven mot vsn 1.0.0:s objektform (`{topic, event, payload, ref}`)
hade aldrig matchat.

### Övriga protokollfakta, ur installerad kod

| Fakta | Värde | Källa |
|---|---|---|
| Join-timeout | `DEFAULT_TIMEOUT = 10000` ms | `realtime-js/lib/constants.js` |
| Heartbeat-intervall | 25 000 ms (`CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL`) | `RealtimeClient.js` |
| Binärramar | Endast `broadcast` med `ArrayBuffer` — `postgres_changes` är **alltid** text-JSON | `serializer.js` `_binaryEncodeUserBroadcastPush` |
| Kanalnamn | `betalningar-jobb-rad`, topic `realtime:betalningar-jobb-rad` | `src/data/betalningar/jobbRealtime.ts` |
| Tabell | `jobb_rad`, `event: '*'`, `schema: 'public'` | samma fil |

### Bindnings-id:t — en fälla som ser ut som ett val

`RealtimeChannel.subscribe()` har **två** vägar till `SUBSCRIBED`
(`RealtimeChannel.js` rad 164–173, verbatim):

```js
.receive('ok', async ({ postgres_changes }) => {
    if (!this.socket._isManualToken()) { this.socket.setAuth(); }
    if (postgres_changes === undefined) {
        callback?.(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
        return;
    }
    this._updatePostgresBindings(postgres_changes, callback);
})
```

Svarar mocken `response: {}` når klienten `SUBSCRIBED` — men bindningen får
aldrig något `id`. Svarar mocken med en `postgres_changes`-lista jämförs varje
fält (`event`, `schema`, `table`, `filter`) och en avvikelse ger
`CHANNEL_ERROR: mismatch between server and client bindings for postgres
changes`.

Vad detta betyder för inkommande events står i `_updateFilterMessage()`
(rad ~761 ff.): bär bindningen ett `id` krävs `payload.ids.includes(bindId)`;
saknar den `id` faller matchningen tillbaka på enbart `event`-jämförelsen.
**Båda vägarna fungerar** — men bara den första speglar en riktig server, och
det är den probe F prövar (§ 8). Det delegerade research-passet flaggade denna
punkt som overifierad (dess § 10 punkt 4); den är nu verifierad i källan och
mätt i webbläsare.

---

## 2. Options-rymden

Fem vägar kartlagda. Två av dem (2 och 3) är seriösa kandidater; tre är
uteslutna med motiv.

### Väg 1 — Playwright `page.routeWebSocket()`

Finns sedan **Playwright 1.48** (release notes, verbatim): *"New methods
[page.routeWebSocket()] and [browserContext.routeWebSocket()] allow to
intercept, modify and mock WebSocket connections initiated in the page."*
Installerad version: **1.62.1** (mätt: `npx playwright --version`).

API, verbatim ur installerad `playwright-core/types/types.d.ts`:

```ts
export interface WebSocketRoute {
  onMessage(handler: (message: string | Buffer) => any): void;
  onClose(handler: (code: number | undefined, reason: string | undefined) => any): void;
  close(options?: { code?: number; reason?: string; }): Promise<void>;
  connectToServer(): WebSocketRoute;
  protocols(): Array<string>;
  send(message: string|Buffer): void;
  url(): string;
}
```

**Fungerar i vår rigg** — mätt i probe C (§ 6), exit 0.

**Kostnaden är hermetikens.** Registreringen sker med `unshift`, uppslaget
med `find`, och det finns **ingen fallback-kedja** (verifierat i
`playwright-core/lib/coreBundle.js` rad 61047/61979/61341/62092): page-routes
prövas före context-routes, och den senast registrerade vinner ensam. En
`page.routeWebSocket` på realtime-adressen tar därför över den adressen från
`@msw/playwright`s match-all context-route, och hermetik-vakten körs **aldrig**
för den. Det är exakt den kollision `websocket-vakt.ts` § "ÅTGÄRDENS FORM ÄR
VALD EFTER MEKANISMEN" redan beskriver — och beskrivningen är korrekt mot
1.62.1.

### Väg 2 — MSW `ws.link()` (VALD)

Finns sedan **msw 2.6.0** (2024-10-29, release notes verbatim: *"support
mocking WebSocket APIs (#2011)"*). Installerat: **msw 2.15.0**,
**`@msw/playwright` 0.6.7**.

**Viktig mekanik-korrigering mot den vanliga bilden:** i en `setupWorker`-
uppställning mockar MSW WebSocket genom att patcha den globala
`WebSocket`-klassen (`msw/lib/browser/index.mjs`, verbatim: *"patching global
WebSocket..."*) — service workers kan inte fånga WS. **Men vi kör inte
`setupWorker`.** `@msw/playwright` är en tredje mekanism som mappar MSW:s
WS-handlers på Playwrights `context.routeWebSocket` (`build/index.mjs` rad
64–85):

```js
await context.routeWebSocket(INTERNAL_MATCH_ALL_REG_EXP, async (route) => {
  const allWebSocketHandlers = this.handlersController.currentHandlers()
      .filter(h => h instanceof WebSocketHandler);
  if (allWebSocketHandlers.length === 0) { route.connectToServer(); return; }
  const client = new PlaywrightWebSocketClientConnection(route);
  const server = new PlaywrightWebSocketServerConnection(route);
  for (const handler of allWebSocketHandlers)
    await handler.run({ client, server, info: { protocols: [] } }, { baseUrl });
});
```

**Vi får alltså MSW:s API men Playwrights motor.** Ingen global patch i sidan.
Det är också ursprunget till felet i § 6.

Bryggans kända begränsningar, lästa i dess kod:

| Begränsning | Bevis |
|---|---|
| `info.protocols` hårdkodad tom array | rad 79 |
| `removeEventListener` är en no-op med varning | `console.warn("@msw/playwright: WebSocketRoute does not support removing event listeners")` |
| Endast `"message"`/`"close"` mappas — inget `"error"`, inget `"open"` | `switch (type)` i båda connection-klasserna |
| `disable()` rör privat Playwright-API (`_webSocketRoutes`) | `unrouteWebSocket()` rad 249–256 |

Ingen av dem blockerar vårt fall (realtime-js skickar inga subprotokoll).

### Väg 3 — transport-injektion i `createClient` (UTESLUTEN)

**Finns och är förstapartsdokumenterad.** `RealtimeClient.d.ts`, verbatim:

```ts
export type RealtimeClientOptions = {
    transport?: WebSocketLikeConstructor;
    …
    vsn?: string;
    encode?: Encode<void>;
    decode?: Decode<void>;
};
```

och `supabase-js` exponerar den som `realtime?: RealtimeClientOptions`.
Konsumtionen: `result.transport = options?.transport ??
WebSocketFactory.getWebSocketConstructor()`. Supabase-maintainern
`filipecabaco` bekräftar mönstret i
[Supabase-diskussion 37869](https://github.com/orgs/supabase/discussions/37869).

**Utesluten** därför att `src/data/config/supabase-client.ts` skapar `supabase`
som en modulnivå-konstant i produktionsbundeln. Injektion kräver antingen en
test-gren i appkoden — vilket `websocket-vakt.ts` självt varnar för
(*"Ett realtime-beroende som bara syns under test är nästan alltid ett fel i
appkoden"*) — eller ett Vite-alias per testläge, vilket betyder att
acceptanstesterna inte längre testar den bundle som byggs.

### Väg 4 — stubba på app-lagret (UTESLUTEN som E2E-lösning)

Seamen finns och är ren: `prenumereraPaJobbrader(vidAndring): () => void`
(`src/data/betalningar/jobbRealtime.ts`), konsumerad i en `useEffect` i
`useJobbstatus.ts`. Ingen komponent rör `supabase.channel()` direkt.

**Utesluten** av två skäl: samma alias/gren-problem som väg 3, och — viktigare
— den testar att en callback anropas, inte att appen talar Phoenix korrekt.
Det är enhetstest-värde, och den klassen har repot redan
(`tests/api/nedstangningsvakt.test.ts`). **Behåll seamen för Node-tester.**

Se dock § 10: orkestreraren har flaggat ett kommande beslut (T185, demoläget)
som kan göra port-nivån relevant av ett *annat* skäl än testbarhet.

### Väg 5 — `mock-socket` (UTESLUTEN)

**Supabase använder det själva** — `realtime-js/package.json` devDependencies:
`"mock-socket": "^9.3.1"`, och deras `RealtimeClient.lifecycle.test.ts` passar
`{ transport: MockWebSocket }` explicit. Deras testhjälpare svarar på
`phx_join` och `heartbeat` precis som vår mock gör.

**Utesluten**: `mock-socket` patchar `globalObj.WebSocket` i **samma process**
som klienten (`src/server.js`, verbatim: `globalObj.WebSocket = WebSocket;`).
Det är ett Node/jsdom-verktyg. Att få in det i en riktig webbläsare kräver
`addInitScript`-bundling och duplicerar exakt vad MSW:s interceptor redan gör.

---

## 3. Hur andra löser det

**(a) Microsoft Playwright själva** — `tests/library/route-web-socket.spec.ts`,
705 rader förstaparts-referensimplementation. Täcker mock-läge,
`connectToServer`-läge, binärt, `protocols()`, och precedensen page↔context.
Mer uttömmande än dokumentationen; använd som facit.

**(b) `Rockerran21/tablepulse`** — den enda kod jag hittade som mockar
**Supabase Realtime hermetiskt i Playwright**. Löser det med
`page.routeWebSocket("**/realtime/v1/websocket**", …)`, parsar vsn 2.0.0-arrayen,
och — nyckeldetaljen — **ekar tillbaka `postgres_changes` med tilldelade `id`**:

```ts
const postgresChanges = (config?.postgres_changes ?? []).map((filter, index) => ({ ...filter, id: index + 1 }));
socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply",
  { status: "ok", response: { postgres_changes: postgresChanges } }]));
```

De tvingas hålla `realtime`/`realtimeTopic`/`realtimeJoinRef` i en closure och
polla 80×25 ms för att veta när sidan joinat. Litet repo — **mönstret är värt
att kopiera, auktoriteten är det inte.**

**(c) `evcc-io/evcc`** (7 195 stjärnor) — visar hur billig felläges-testning
blir med routeWebSocket: full genomströmning, ansluten-men-tyst, och
omedelbart stängd, i tre rader var. Direkt relevant för vår
`lasRealtidsfel()`-yta.

**(d) `workadventure/workadventure`** (5 747 stjärnor) — dokumenterat **avslag**
av routeWebSocket, verbatim ur `tests/tests/utils/livekitOutage.ts`:

> "Playwright's `routeWebSocket()` cannot be used here: its mocked sockets
> always fire "open" before "close", while a real outage fails before "open"
> … So a tiny WebSocket wrapper is injected in the page instead"

Namnger den enda scenario-klass ingen route-baserad väg kan uttrycka:
**fel före `open`**. Deras alternativ är `addInitScript` + `new
Proxy(NativeWebSocket, …)` — samma teknik som MSW:s interceptor.

---

## 4. Riggen för mätningarna

Nio Playwright-prober, `--project=visual-desktop --workers=1`, mot den
faktiska fixtur-dev-servern. Filerna:

- `tests/visual/task409-realtime-probe.spec.ts` — A, B (riktiga `hermetic.ts`)
- `tests/visual/task409-realtime-probe-c.spec.ts` — C (Playwright rakt)
- `tests/visual/task409-realtime-probe-d.spec.ts` — D (naken msw-fixtur)
- `tests/visual/task409-realtime-probe-e.spec.ts` — E1/E2/E3 (ordningen)
- `tests/visual/task409-realtime-probe-f.spec.ts` — F, F2 (hela kedjan)

Appens klient hämtas i sidan via Vite dev-serverns ESM-väg,
`import('/src/data/config/supabase-client.ts')` — **inte** en rekonstruerad
`createClient()`. Proberna mäter därför appens faktiska klient, dess options
och dess fixtur-URL.

**Slutrad, verbatim:** `9 passed (40.6s)`, exit 0.

---

## 5. Vad som ALREDAN är rätt i repot

`tests/support/fixturvarld/websocket-vakt.ts` bygger redan på MSW:s
`ws.link()`, och `hermetic.ts` på `defineNetworkFixture`. Vaktens tre utfall
(`bedomWebSocket`): `tackt` (annan handler äger), `lokal` (Vite HMR →
`server.connect()`), `omockad` (→ kast). Vaktens egen feltext instruerar redan
rätt åtgärd, verbatim:

> *"Ska uppkopplingen ske i test: mocka den med ws.link() ur msw och registrera
> handlern — delat i tests/support/fixturvarld/handlers.ts, eller bara för
> detta test via network.use()"*

Och `playwright.config.ts:384` bokför varför det inte gjorts än. **Den
arkitektoniska frågan var alltså redan avgjord.** Det som återstod var att
skriva handlern — och att upptäcka att den inte kan fungera som fixturen ser ut
i dag.

---

## 6. FYNDET: vakten gör varje WS-mock i fixturvärlden stum

### Mätningen som avtäckte det

Probe A och B kördes i den **riktiga** `hermetic.ts`-fixturen. Utfall verbatim:

```text
PROBE A url    : wss://visual-fixture.supabase.co/realtime/v1/websocket
PROBE A sedda  : []
PROBE A utfall : {"oppnad":true,"svar":null,"fel":"timeout"}

PROBE B url    : wss://visual-fixture.supabase.co/realtime/v1/websocket?apikey=visual-fixture-anon-key&vsn=2.0.0
PROBE B sedda  : []
PROBE B utfall : {"status":"TIMED_OUT","traffar":[],"fel":null}
```

Uppkopplingen **fångades** (URL:en fylldes ⇒ `connection`-handlern kördes) och
sidan såg socketen som **öppen**. Men mockens `message`-lyssnare fick
ingenting, och `client.send()` nådde aldrig sidan.

Probe C (Playwright rakt) och D (naken msw-fixtur, en enda handler) var båda
**gröna** med samma ping/pong. Felet låg alltså varken i Playwright eller i
MSW som sådant, utan i **vår uppställning**.

### Orsaken, läst i tre källor

**1. `WebSocketRoute.onMessage()` är en SETTER, inte en lista.**
`playwright-core/lib/coreBundle.js` rad 59534, verbatim:

```js
onMessage(handler) {
  this._onPageMessage = handler;
}
```

**2. `@msw/playwright` mappar rakt på den.** `build/index.mjs` rad 155–168:
`client.addEventListener('message', listener)` → `this.ws.onMessage(...)`.

**3. MSW:s `WebSocketHandler[kConnect]` registrerar ALLTID en egen
`message`-lyssnare** innan den fyrar `connection`
(`msw/lib/core/handlers/WebSocketHandler.js`):

```js
[kConnect](connection) {
  connection.client.addEventListener("message", createStopPropagationListener(this));
  …
  return this[kEmitter].emit("connection", connection);
}
```

**4. Bryggan kör ALLA matchande handlers i tur och ordning.**

Sammansatt: varje handler orsakar minst ett `route.onMessage(...)`-anrop, och
varje anrop skriver över det förra. **Bara den sist registrerade lyssnaren
överlever.** I `hermetic.ts` är den sista alltid vaktens egen
`kConnect`-no-op, eftersom vakten läggs sist:

```js
handlers: [...(SJALVTEST ? [] : handlers), wsVakt],
```

och `network.use()` lägger överskuggningar **först**
(`handlers-controller.js` rad 82) — så även en per-test-mock hamnar före
vakten och förlorar.

### Räckvidd, uttryckt exakt

Detta är **inte** en bugg i vakten som fällmekanism. Vakten fäller korrekt (§ 7,
probe F2). Det är en bugg i vakten som **samexistent** med en mock: `tackt`-
grenens löfte — *"En annan handler äger uppkopplingen … Vakten håller sig
undan"* — är inte uppfyllbart, eftersom vakten redan har tagit över
meddelandevägen innan dess `connection`-callback ens körs.

Felet är latent sedan `task-56`. Det kunde inte upptäckas då: vakten byggdes
för att **fälla** omockade uppkopplingar, och det gör den. Först den dag någon
mockar en WebSocket blir löftet prövat — och det är i dag.

---

## 7. Tvåsidigt bevis för orsak och fix

Probe E, tre tester i en naken fixtur med en simulerad "tyst handler" som gör
exakt vad vakten gör vid `tackt`. Utfall verbatim:

```text
PROBE E1 sedda : ["ping"] utfall: {"oppnad":true,"svar":"pong","fel":null}
PROBE E2 sedda : []       utfall: {"oppnad":true,"svar":null,"fel":"timeout"}
PROBE E3 sedda : ["ping"] utfall: {"oppnad":true,"svar":"pong","fel":null}
```

| Probe | Uppställning | Utfall | Vad det visar |
|---|---|---|---|
| **E1** | mocken ensam | pong | POSITIV kontroll — mocken är korrekt skriven |
| **E2** | mock, sedan tyst handler | tystnad | NEGATIV — **reproducerar felet** |
| **E3** | tyst handler, sedan mock | pong | **FIXEN** — ordningen är hela skillnaden |

E2 och E3 kör **identisk kod** med enda skillnad att argumenten till
`network.use()` byter plats. Det utesluter varje annan förklaring.

### Fixen fungerar också med den RIKTIGA vakten

Probe F bygger en fixtur som importerar `skapaWebSocketVakt` ur
`websocket-vakt.ts` — den riktiga vakten, oförändrad — och lägger den **först**:

```ts
const handlers: AnyHandler[] = [wsVakt, realtimeMock(sedda)];
```

**Probe F: grön.** **Probe F2 (negativ kontroll, `test.fail()`): vakten kastar
fortfarande `OmockadWebSocketError` på en omockad adress**, med stacken
verbatim ur körningen:

```text
at WebSocketHandler.[kConnect] (…/msw/src/core/handlers/WebSocketHandler.ts:189:27)
at WebSocketHandler.run (…/msw/src/core/handlers/WebSocketHandler.ts:122:24)
at …/@msw/playwright/build/index.mjs:77:62
```

Alltså: **vakten kan ligga först utan att sluta vakta.**

### Varning: ordningen ensam är en SPRÖD fix

`network.use()` lägger alltid överskuggningar först. En ordningsfix i
`hermetic.ts`s `handlers`-array skyddar därför **delade** WS-mockar men **inte**
en per-test-mock registrerad via `network.use()` — den hamnar före vakten och
fungerar, men vilken framtida andra WS-handler som helst som råkar registreras
efter den återinför felet tyst.

En ordningsoberoende lösning kräver att vakten inte registrerar någon
`message`-lyssnare alls, vilket i sin tur kräver att man kringgår eller
överrider `WebSocketHandler[kConnect]` (symbolen exporteras ur
`msw/lib/core/handlers/WebSocketHandler.js`, men är inte del av `msw`s publika
yta). **Det är ett designval som inte fattas i detta pass** — se § 10.

---

## 8. Phoenix-handskakningen, mätt

Probe F, hela kedjan mot appens egen `supabase`-klient. Den enda ram klienten
skickade innan `SUBSCRIBED` uppnåddes, verbatim ur körningen:

```json
["6","6","realtime:betalningar-jobb-rad","phx_join",{"config":{"broadcast":{"ack":false,"self":false},"presence":{"key":"","enabled":false},"postgres_changes":[{"event":"*","schema":"public","table":"jobb_rad"}],"private":false}}]
```

Detta **observerar** vad det delegerade passet bara kunde härleda (dess § 10
punkt 2): **vsn 2.0.0, array-ramar.**

Mockens svar (join-reply med `id`, följt av ett `postgres_changes`-event) gav:

```json
{
  "status": "SUBSCRIBED+EVENT",
  "traffar": [{
      "schema": "public", "table": "jobb_rad",
      "commit_timestamp": "2026-09-06T08:00:00.000Z",
      "eventType": "UPDATE",
      "new": { "id": "c0ffee00-0001-4001-8001-000000000001", "status": "skickat" },
      "old": { "id": "c0ffee00-0001-4001-8001-000000000001", "status": "pagar" },
      "errors": null
  }]
}
```

Tre saker är därmed mätta, inte antagna:

1. **Ingen heartbeat behövdes.** Endast en ram sågs — join-svaret räckte inom
   testets livstid. En mock måste ändå besvara `heartbeat` för tester som
   lever längre än 25 s.
2. **`_getPayloadRecords`-transformen körde korrekt** — `columns` + `record`
   blev `new`/`old` med rätt typer.
3. **Bindnings-id-vägen fungerar** — `postgres_changes: [{id: 42, …}]` i
   join-svaret matchades mot `ids: [42]` i eventet utan `mismatch`-fel.

### Minsta fungerande mock, som kontrakt

```text
phx_join   → ["<joinRef>","<ref>","<topic>","phx_reply",
              {status:"ok", response:{postgres_changes:[{id, event, schema, table, filter}]}}]
heartbeat  → ["<joinRef>","<ref>","phoenix","phx_reply", {status:"ok", response:{}}]
push       → [null, null, "<topic>", "postgres_changes",
              {ids:[<id>], data:{schema, table, commit_timestamp, type, columns, record, old_record, errors}}]
```

---

## 9. Rekommendation

**Bygg WS-mocken som en MSW `ws.link()`-handler i den befintliga
fixturvärlden**, och **laga ordningsfelet i `hermetic.ts` i samma andetag.**

Motiv, i fallande vikt:

1. **Det är den väg repot redan valt, dokumenterat och motiverat.** Att välja
   en annan river ett medvetet designval (pre-K-forensikregeln).
2. **Bara den vägen är vaktad.** `page.routeWebSocket` kringgår
   hermetik-vakten för sin adress — samma klass av tyst läcka som `task-56`
   stängde.
3. **En enda sanning om nätverket.** Betalnings-EF-mockarna (HTTP) och
   WS-mocken hamnar i samma `handlers.ts`, med samma `network.use()`-form och
   samma överskuggnings-vakt.
4. **Noll nya beroenden.** Allt är redan installerat och wirat.
5. **Motorn är Playwrights ändå** — vi får routeWebSocket:s garantier med
   MSW:s ergonomi.

**Kostnader att bokföra öppet, inte dölja:**

- **Ordningsfixen är spröd** (§ 7). Den löser dagens fall men bär en
  återfallsrisk som bara en `kConnect`-lösning tar bort.
- **"Fel före `open`" går inte att simulera** (WorkAdventure-fyndet). Vår
  `lasRealtidsfel()`-yta täcker `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`, som alla
  nås via `phx_reply {status:"error"}`, uteblivet svar (10 s) resp. `close()`.
  Skriv aldrig att alla felfall kan testas.
- **`ws.link().broadcast()` genom bryggan är OVERIFIERAD.** Proberna använder
  closure-mönstret (som tablepulse). Pröva `broadcast()` med ett minimalt test
  innan en push-mekanism byggs på den.
- **Bryggans `disable()` rör privat Playwright-API** (`_webSocketRoutes`).
  Finns i 1.62.1; kan brytas av en uppgradering.

**Näst bäst: `page.routeWebSocket()` direkt.** Fullt kapabel, bättre
dokumenterad, har Playwrights egen svit som facit och ett direkt tillämpligt
Supabase-exempel. Förlorar på **precis en sak** — den lägger sig utanför
hermetik-vakten. Byt till den om MSW-bryggan visar sig oförmögen att bära
push-mekanismen; då är hermetikens hål ett medvetet, bokfört pris, och vakten
bör utvidgas att känna igen page-nivå-routes.

---

## 10. Öppet — beslut som INTE fattas i detta pass

1. **Nivåvalet mot demoläget (tråd T185).** Orkestreraren har flaggat att
   Marcus prövar ett demoläge i appen (hela betalningsflödet utan att något
   sparas eller mejlas), sannolikt byggt som en in-memory-implementation av de
   nio portarna i `src/data/adapters/betalningsportar.ts` plus en fejkad
   jobb-kanal, injicerad via DI-switchen i `src/data/dataSource.ts`
   (ADR-055/057). Landar det beslutet ska fixturvärlden använda **samma**
   fejkvärld, inte en andra MSW-uppsättning. Passets analys av den axeln står
   i § 2 väg 4 — kort: den är arkitektoniskt attraktiv men **testar inte
   protokollet**, och `jobbRealtime.ts` ligger dessutom **utanför**
   adapter-seamen (`useJobbstatus.ts` importerar `prenumereraPaJobbrader`
   direkt, inte via `useDataSource()`), så en port-nivå-fejk skulle kräva ett
   *eget* seam för kanalen. **Marcus beslut i grillning.**
2. **`kConnect`-lösningen** kontra ordningsfixen (§ 7). Fyndet självt är sedan
   2026-09-06 bokfört som eget kort — `TASK-413`, `ready-for-human` — och
   vägvalet mellan de två är Marcus. Ordningsfixen är prövad och fungerar
   (§ 7), men är spröd: `network.use()` lägger alltid överskuggningar först, så
   den skyddar delade WS-mockar men inte mot att en framtida handler
   registreras efter mocken och tyst återinför felet.
3. **Om proberna ska bli permanenta tester** eller ersättas av en riktig
   `realtime-mock.ts` + enhetsspec. Proberna ligger tills vidare ENBART på
   arbetsgrenen `task/409-hermetisk-betalningsvarld`, opushade, i väntan på
   nivåbeslutet — det är bara detta dokument som landar för sig.
4. **`ws.link().broadcast()` genom `@msw/playwright`-bryggan är OVERIFIERAD.**
   Detta är den enda punkt i passet där en rekommenderad mekanism vilar på
   läsning i stället för mätning, och den upprepas här — inte bara i § 2 och
   § 9 — därför att en push-mekanism byggd på den skulle upptäcka bristen
   först när mocken ska skicka sin första ram. `link.clients` fylls av
   `WebSocketHandler.run()`, medan bryggan skapar ett NYTT
   `PlaywrightWebSocketClientConnection` per uppkoppling; om setet därför står
   tomt fungerar varken `broadcast()` eller `broadcastExcept()`. Samtliga nio
   prober använder i stället closure-mönstret (samma som tablepulse, § 3b),
   som ÄR mätt. **Pröva `broadcast()` med ett minimalt test innan något byggs
   på den** (CLAUDE.md § "Testa ALLTID nytt bibliotek/approach med minimalt
   test").
5. **Realtime-URL:en bär `vsn=2.0.0`, inte `1.0.0`** — och det är inte en
   öppen fråga utan en korrigerad premiss som varje efterföljande skiva måste
   bygga på. `TASK-409`s uppdragstext angav `1.0.0`. Mätt värde, verbatim ur
   probe B:
   `wss://visual-fixture.supabase.co/realtime/v1/websocket?apikey=…&vsn=2.0.0`.
   Följden är att varje ram är en JSON-**array**
   `[join_ref, ref, topic, event, payload]`, aldrig objektformen
   `{topic, event, payload, ref}`. En mock skriven mot uppdragets premiss hade
   inte matchat en enda ram. Full härledning i § 1, det observerade
   join-anropet i § 8.

## Källor

**Installerad kod (starkaste beviset, läst på disk):**
`node_modules/@supabase/realtime-js/dist/main/{RealtimeChannel,RealtimeClient}.js`,
`.../lib/{constants,serializer}.js`, `node_modules/@supabase/phoenix/assets/js/phoenix/{socket,channel}.js`,
`node_modules/msw/lib/core/handlers/WebSocketHandler.js`,
`node_modules/@msw/playwright/build/index.mjs`,
`node_modules/playwright-core/lib/coreBundle.js`,
`node_modules/playwright-core/types/types.d.ts`

**Egna mätningar:** de nio proberna i § 4, `9 passed (40.6s)`, exit 0.

**Dokumentation:** `playwright.dev` (`class-websocketroute`, `mock`, release
notes 1.48) · `mswjs.io` (`/docs/websocket/`, `/docs/api/ws/`,
`/blog/enter-websockets/`) · `github.com/mswjs/playwright` README ·
`github.com/orgs/supabase/discussions/37869`

**Repot:** `tests/support/fixturvarld/{websocket-vakt,hermetic,handlers,fixture-data}.ts`,
`playwright.config.ts:355–384`, `src/data/betalningar/{jobbRealtime,useJobbstatus}.ts`,
`src/data/config/supabase-client.ts`, `src/data/adapters/betalningsportar.ts`,
`src/data/dataSource.ts`
