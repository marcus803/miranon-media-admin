# Amendering 2026-09-06 — formen före stämpeln: pillsen bort, namnet klipps, sätt-alla-knapparna under listan (TASK-402.8)

**Yta:** `bekraftelsesteget` (manifestets enda `ytor`-post, `"godkand": null`,
låst 2026-09-05 med Marcus `"Lås som facit."`).

**Status: SLUTFÖRD BOKFÖRING.** Formen itererades i tio varv på
granskningsservern 2026-09-06 och stängdes av Marcus kvittens samma dag:
*"Nu är vi klara med bulkregistrerings-sidan också, vi kör på detta. Nu
behöver det här komma till prod också."* §§ 1–3 beskriver ändringarna A–C,
**§ 3.1 bär hela varvhistoriken 2–10 och slutformen**, och §§ 4–5 är
uppdaterade mot varv 10 (grenens head efter slutvarvet). Dokumentet bar mellan
varv 2 och varv 10 en statusruta som sa att §§ 3–5 beskrev varv 1 — den är
borta eftersom den inte längre är sann, vilket är hela skälet den fanns
(`ADR-083`-disciplinen: ett dokument som tyst beskriver en gammal form är
värre än inget dokument alls).

**Varför en amendering och inte en tyst ändring** (`ADR-102` B5/R3): formen är
FACIT-LÅST men INTE STÄMPLAD. `godkand` är `null`, alltså är ändringar
tillåtna — men en ändring i en låst form som ingen bokför är oskiljbar från en
drift för den som läser katalogen efteråt. `ADR-104`-hooken
(`scripts/deny-facit-godkand-skrivning.sh`) släpper varje skrivning som lämnar
`godkand` null, och `check-facit.sh`s invariant (d) hoppar över
hash-jämförelsen för ett ostämplat manifest — hasharna i `referenser` är
därför uppdaterade direkt i `facit.json`, precis som
`AMENDERING-2026-09-06-ariasnapshot-paret.md` § rättelsen redan slog fast.

**Grund:** Marcus prod-granskning 2026-09-06 (S121 resume 4), under
`TASK-402.3` AC #10. Tre ändringar, alla i variant C:s form.

---

## 1. Ändring A — pillsen Förfallen och Obekräftad är borta ur kortets huvud

**Klassning: (a) — en synlig ändring, med avsikt.**

Marcus, verbatim: *"Pillsen bort, det blir bra."*

`RadMarken` (`prototype/radfalt.tsx`) renderade `Förfallen` (warning, klocka)
och `Obekräftad` (neutral) inline efter namnet, i **båda** lägena (ihopfällt
och öppet) och i **båda** högarna (listan och "Behöver din hand", eftersom
`HandKort` delar `KortHuvud`). De är borta ur steget.

Skälet är domänens, inte estetikens: en obekräftad anmälan registreras som
vanligt och bekräftelsen sköts på Åtgärds-sidan (grillningens beslut 5), och en
passerad deadline ändrar ingenting i handlingen "registrera det som kommit in".
Signalerna hör hemma där Lotta PRIORITERAR, alltså i inkorgen.

**Inkorgen är orörd.** `BetalningsInkorg.tsx` § `RadInnehall` har sin egen
markup för samma två pills, och den ligger inte i skivans diff.

**`RadMarken` är kvar i `radfalt.tsx`** utan konsument i C. Den är
prototyp-substrat och rivs med `VariantA`/`VariantB` i `TASK-402.6`
(`ADR-102` B3: ingenting rivs före Marcus stämpel).

**Berör bilderna:** samtliga fem låsta (Cecilia Malm bar `Förfallen`, Erik Holm
bar `Obekräftad`). De låsta bilderna är **orörda**; motbilden är
`amendering-402.8-utgangslage-desktop.png` nedan.

**Berör referenserna:** `utgangslage` och `korning-pagar`, båda bredderna —
kortets tillgängliga namn gick från
`"Cecilia Malm Förfallen Markerad"` till `"Cecilia Malm Markerad"` och från
`"Erik Holm Obekräftad Markerad"` till `"Erik Holm Markerad"`.

---

## 2. Ändring B — namnet klipps med ellips på en rad

**Klassning: (b) — formen är oförändrad för varje namn som ryms; ändringen
syns bara när det inte gör det.**

Marcus: *"Då måste namnet 'klippas' för INGET får hända med kortet."*

`VariantC.tsx` saknade `truncate` på namnet. Ett långt namn radbröt, kortet
växte, och listans rytm bröts mitt i en avstämning mot kontoutdraget.
Namn-noden bär nu `min-w-0 truncate` plus `title` med hela namnet.

**Vid ALLA bredder, till skillnad från inkorgens `sm:truncate`**
(`BetalningsInkorg.tsx`): regeln "kortet byter aldrig höjd" har ingen
brytpunkt. Avvikelsen mot inkorgen är alltså medveten.

**Hela namnet finns kvar** i DOM:en — klippet är rent visuellt, så en
skärmläsare läser namnet oavkortat; `title` ger den seende samma text vid
hovring.

**Ingen facit-bild visar detta läge.** Facit-fixturens tio namn ryms alla på en
rad, så klippet syns inte i någon låst bild och inte heller i
amenderings-bilderna nedan. Beviset är i stället mätt i
`tests/e2e/bekraftelsesteget-formen-fore-stampeln.staging.test.ts`: ett
60-teckens namn på desktop 1440 och iPad 820, där testet läser `scrollWidth >
clientWidth` på namn-noden och jämför kortets höjd mot ett kort med kort namn.

---

## 3. Ändring C — "Sätt alla belopp:" med två knappar, under listan

**Klassning: (c) — ny form; motbild finns i de låsta bilderna (där ytan är
tom), och den nya formen avbildas nedan.**

Marcus, om beloppen: *"i 8 av 10 fall … betalar dem 1000 kr (anmälningsavgift)
först och sedan resterande belopp (1500). Men ibland betalar ju folk allt
direkt … Appen ska fortfarande föreslå 'rätt' belopp som den gör nu, men Lotta
kan liksom skriva över beloppen med denna knapp."*

Om placeringen: *"Håller med om knapparna där, men jag vill ha dem under
listan, inte över. Tror det blir snyggare. Listan ska vara i fokus direkt när
hon kommer till bulkregistreringen liksom."*

**HISTORIKEN, eftersom den ser ut som en motsägelse:** konvergensvarv 12 REV
"Ändra för alla"-blocket (Marcus: *"Vad ska hon med det till egentligen?"*).
Denna smalare form är hans **omprövning** 2026-09-06, inte en återinförd
rivning: två knappar i stället för fyra kontroller, under listan i stället för
över, och utan batch-betalsätt/datum.

**Formen som VARV 1 landade** — varv 2–10 byggde om den; slutformen står i
§ 3.1 och det är den som ligger på grenen:

* Etiketten `Sätt alla belopp:` som synlig text, och två knappar
  (`size="sm"`, sekundär outline) med de synliga orden `Anmälningsavgift` och
  `Hela beloppet`.
* **Inga tal i etiketterna.** Priset är per event OCH per person, så samma
  tryck ger en rad 500 kr och en annan 2 500 kr. Talet står kvar per rad, där
  det är sant.
* Varje knapps tillgängliga namn är hela meningen
  (`Sätt alla belopp till anmälningsavgiften` / `… till hela beloppet`), med
  den synliga texten inuti sig (WCAG 2.5.3 Label in Name). Ingen
  `role="group"` — se `VariantC.tsx` § SÄTT ALLA BELOPP för hela resonemanget.
* En knapp utan rader att röra är **avstängd**.

**Regeln:** ett tryck sätter varje MARKERAD rads EGEN kandidat ur inkorgens
`harledBeloppsknappar` (`avgiftKvar` respektive `kvar`). Rader utan kandidat,
raderna i "Behöver din hand", avmarkerade rader och redan registrerade rader
rörs inte alls. En FALLERAD rad rörs (den ska kunna köras om med ett nytt
belopp). Regeln bor rent i `bekraftelsesteg-harledningar.ts` och prövas
kant för kant i `tests/api/bekraftelsesteg-harledningar.test.ts`.

**PLACERINGEN VAR ETT ANTAGANDE — NU AVGJORD.** Marcus sa bara "under listan";
att blocket står EFTER hand-högen och dubblett-sektionen och DIREKT FÖRE
avstämningens `<dl>` var orkestrerarens precisering, inte hans ord. Den
preciseringen gick igenom tio granskningsvarv utan invändning och står kvar i
slutformen — Marcus tio invändningar rörde blockets utseende, aldrig dess
plats.

### Avvikelse mot kortets AC #4-ordalydelse: beskedet står i en EGEN statusregion

AC #4 säger att trycket ska annonseras "i statusraden". Huvudets statusrad
(`role="status"`, polite) bär räkningen `"N av N inbetalningar markerade"` —
facit-låst form (`facit.json` § FORMEN) som ett sätt-alla-tryck INTE ändrar.
Hade beskedet skrivits dit hade räkningen försvunnit.

Beskedet ligger därför i en egen, alltid närvarande `role="status"`-region
(`sr-only`) intill knapparna, tom tills något trycks:
`"6 belopp satta till anmälningsavgiften."`. Regionen finns i DOM:en FÖRE sitt
innehåll, eftersom en live-region som monteras samtidigt som texten inte
annonseras tillförlitligt (WAI-ARIA APG § Live Regions).

Följden i referenserna: en tom `- status`-nod tillkommer i alla åtta
snapshot-lägen utanför Ångra-dialogen. Det är den enda nya noden som inte har
en synlig motsvarighet.

---

## 3.1 Varv 2–10 — nio granskningsvarv på blockets utseende, och slutformen

Varv 1 landade regeln och platsen. De nio varv som följde rörde INGENTING i
regeln och ingenting i platsen — samtliga gällde hur blocket och dess
kontroller SER UT. Marcus granskade varje varv på granskningsservern (4173,
`?data=fixtur`) och svarade i klartext; hans ord per varv står nedan, eftersom
det är de och inte en sammanfattning som avgjorde formen.

| Varv | Marcus, verbatim | Vad som ändrades |
|---|---|---|
| 2 | *"Jag tror 'sätt alla belopp' måste få ett eget block/ruta och passa snyggare in i sidans design. Det ser inte snyggt ut nu."* | Den nakna raden byttes mot husets panelform — `rounded-2xl bg-bg-muted p-4`, kant i kant med gruppernas `-mx-4`-omslag, med rubrik och hjälptext över knapparna. |
| 3 | *"Skapa påtagligt mer luft mellan sätt alla belopp-rutan och summeringsraderna nedanför."* · *"Ändra texten till 'Skriver över föreslaget belopp på alla markerade rader. Rader som behöver din hand rörs inte.'"* · *"Sedan borde väl det finnas en 'Ångra knapp' också här eller? Om hon vill ändra tillbaka till föreslaget belopp?"* | Luften under blocket 12 → 24 px, hjälptexten fick hans ordalydelse ordagrant, och en tredje knapp **"Återställ förslagen"** (ghost, sist) tillkom. |
| 4 | *"när man trycker på 'Anmälningsavgift' eller 'Hela beloppet' behöver vi inte visa att knappen är aktiv? Hur gör vi detta i appen idag?"* | De två knapparna blev husets `ToggleButtonGroup` (`role="radiogroup"`), där valet står intryckt. Husets svar på frågan "hur gör vi detta i appen idag" är periodtoggeln, vy-växlaren i `EventsList`/`PersonsList` och Förberedelseskärmen. |
| 5 | *"Togglen behöver ju sitta i något. När ingen knapp är vald så ser ju knapparna inte ut som knappar utan bara en textsträng på grå bakgrund."* · *"Men samtidigt ska det liksom se ut som 'sekundär' knappar ju."* · *"anmälningsavgift och Hela beloppet knapparna måste vara exakt lika breda, annars blir det ingen snygg toggle."* | Tre lägen i stället för två — `Förslag \| Anmälningsavgift \| Hela beloppet`, med **Förslag förvalt**, så det tomma tillståndet upphör att finnas. Varv 3:s separata ångra-knapp REVS: att välja `Förslag` ÄR återställningen. Läget blev en LEVANDE regel (en rad som markeras efteråt kommer in med lägets belopp), med den handredigerade raden som undantag. Kapselns utseende blev husets sekundärknapp (outline, `--mm-button-secondary-*`), valt segment på `bg-bg-emphasized`. Segmenten likbreda via `inline-grid auto-cols-fr w-fit`. |
| 6 | *"när man klickar runt på knapparna så ser de ut att röra sig, eller det gör dem, inte okej."* | Och de gjorde det: varv 5 gav det valda segmentet `font-semibold`, alltså bredare text, och `auto-cols-fr` + `w-fit` sätter kolumnbredden efter det bredaste segmentets max-content. Regeln som ersatte den: valet får ENDAST ändra färg — samma vikt, samma kantBREDD, samma padding, och den dubblerade kanten som en INSET `box-shadow` (ritas innanför kanten, ingår inte i boxmodellen till skillnad från `border-2`). |
| 7 | *"lite för mörk grå färg på konturen i aktivt läge, nu har den ju samma färg som registrera knappen"* | Konturen `--mm-text` → `--mm-text-muted`. |
| 8 | *"Den nya färgen blev nog sämre än innan … Kanske gul/guld?"* | Guld prövat: `--mm-primary-hover` som kontur på `--mm-primary-tint` som fond. |
| 9 | *"Blev sämre. Ta tillbaka den vi hade innan men testa att dämpa den lite mer"* | Guldet rivet, kontur och fond. Tillbaka till grått, en dämpning ljusare: `--mm-text-secondary`. |
| 10 | *"om vi går tillbaka till mörkgrå då, samma som registrera knappen, de går färgerna ihop i alla fall."* | Konturen tillbaka till `--mm-text` — varv 6:s värde, valt medvetet EFTER att tre dämpningar prövats. Invändningen i varv 7 var att konturen såg ut som Registrera-knappen; tre varv senare är domen den motsatta. En kontur är inte en fyllning: den mörka kanten läser som "vald", inte som "primär handling", eftersom segmentet fortfarande är en outline-knapp med ljus fyllning. **Slutform.** |

### Slutformens mått och tokens — MÄTTA 2026-09-06, inte avskrivna

Talen nedan kommer ur en körning mot dev-servern i denna worktree, klickad
genom alla tre lägena på båda bredderna (`getByRole('radio').boundingBox()`):

| Vad | Värde | Var det bor |
|---|---|---|
| Panelen | `rounded-2xl bg-bg-muted p-4`, **568 × 145 px** i appens 600 px-kolumn | `VariantC.tsx` § SÄTT ALLA BELOPP, `data-testid="satt-alla-block"` |
| Luften | **16 px** ovanför, **24 px** nedåt | prövas exakt i `bekraftelsesteget-formen-fore-stampeln.staging.test.ts` (`{ over: 16, under: 24 }`) |
| Segmenten | **142,11 × 35,00 px** — alla tre, i alla tre lägena, på BÅDA bredderna | `KAPSEL_KLASS` + `SEGMENT_KLASS` i `VariantC.tsx` |
| Ovalt segment | `--mm-button-secondary-border` / `-bg` / `-text` | husets sekundärknapps EGNA komponent-tokens, inte en avskrift av dess klasser |
| Valt segment | kant + inset-ring `--mm-text`, fond `bg-bg-emphasized`, `font-medium` (oförändrad vikt) | kontrast **14,22:1** mot panelen och **13,31:1** mot fyllningen — WCAG 1.4.11 kräver 3:1 mot båda |

Att kanterna faktiskt står still är sedan slutvarvet en GRIND och inte en
mätning i ett dokument: `desktop|ipad — segmentens kanter står exakt still
genom alla tre valen` läser `x/y/width/height` på alla tre segmenten i varje
läge och fäller på minsta avvikelse. Tvåsidigt bevisad — med varv 5:s
`font-semibold` återinförd fäller den i BÅDA vyporterna med
*"kanterna flyttade sig i läget Anmälningsavgift"*, och grön med varv 10:s
form.

**Vad som INTE ändrades under nio varv:** regeln (varje markerad rads EGEN
kandidat), placeringen, hjälptextens ordalydelse efter varv 3, rubriken som
`<p>` och inte `<h2>`, den egna `role="status"`-regionen, och att en rad utan
kandidat lämnas ifred. Kapselns SEMANTIK är primitivens hela vägen —
`ToggleButtonGroup`/`ToggleButton` är ORÖRDA, varje utseende-ändring gick via
`className` (tailwind-merge), så primitivens fyra andra konsumenter kan inte
ha påverkats.

---

## 4. Referenserna — åtta av tio omtagna, hasharna uppdaterade i manifestet

Alla tio genererades om i denna landning
(`playwright test --project=chromium-authenticated
tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts
--update-snapshots=all`). Playwright bevarade de handskrivna
regex-platshållarna (`/1 \d+ kr/` m.fl.) — de matchar fortfarande.

| Läge | desktop | iPad | Vad som ändrades mot den låsta formen |
|---|---|---|---|
| utgångsläget | ändrad | ändrad | pillsen ur två korts namn · `paragraph` "Sätt alla belopp" + `paragraph` med hjälptexten + `radiogroup "Belopp för markerade rader"` med tre `radio` (`Förslag` `[checked]`) · tom `status` |
| körningen pågår | ändrad | ändrad | samma, plus `[disabled]` på alla TRE radioknapparna |
| efter Registrera | ändrad | ändrad | samma nodmängd + tom `status` |
| efter Registrera och skicka | ändrad | ändrad | samma nodmängd + tom `status` |
| Ångra-dialogen | **oförändrad** | **oförändrad** | dialogen renderas i en portal, utanför formens scope |

**Omtagningen skedde i SLUTVARVET, inte i varv 1.** Mellan varv 2 och varv 10
stod de åtta lägena `test.fixme` — Marcus: *"Angående min iteration på 'Sätt
alla belopp' så måste vi ju inte ta nya bilder och krångla, det gör vi när
iterationerna är klara."* Varje varv hade skrivit om samma åtta referenser, så
en omtagning per varv hade kostat en full körning i taget och producerat en
bokföring som var obsolet innan den lästes. Skälet, historiken och de två
Ångra-dialogerna som ALDRIG stängdes av står i den testfilens eget huvud. De
fyra `test.fixme()`-raderna är borta i samma landning som denna bokföring.

`facit.json`s `referenser[].sha256` är uppdaterade för de åtta (utgångsläget
`fbdb29b3…`, körningen pågår `f7b6d934…`, efter Registrera `8a57dfc3…`, efter
Registrera och skicka `2ad0c826…` — desktop och iPad delar hash per läge,
eftersom en aria-snapshot är vyport-oberoende). Ångra-dialogens två står kvar
på `dfa90663…`, byte-identiska efter omtagningen. `"godkand"` är orört
(`null`), och `bash scripts/check-facit.sh` är grön (exit 0).

**En kant värd att känna till för nästa omtagning:** `--update-snapshots`
(utan värde) skriver bara om de referenser som FÄLLDE, och en aria-snapshot
matchar som DELMÄNGD — de fyra lägen som bara FICK noder passerade därför
oförändrade i första körningen. `=all` krävdes för att referenserna skulle
beskriva hela den nya DOM:en i stället för att tyst underbeskriva den.

---

## 5. Bilderna

**De fem låsta `facit-*.png` är ORÖRDA.** Motbilderna nedan är OMTAGNA i
slutvarvet och visar varv 10 — varv 1-bilderna med samma filnamn är
överskrivna, eftersom en bild som visar en riven form är precis den drift
amenderingen finns för att förhindra. Metoden är facits (fristående Playwright
med e2e-svitens `storageState`, `?data=fixtur` bakom DEV, DPR 2, sv-SE,
Europe/Stockholm, `fullPage`), men ur DENNA worktree mot dev-servern på port
5173:

| Fil | Läge | Bredd |
|---|---|---|
| `amendering-402.8-utgangslage-desktop.png` | utgångsläget, 10 av 10 markerade, `Förslag` valt · 12 000 kr | 1440 |
| `amendering-402.8-utgangslage-ipad.png` | samma läge — segmenten ryms på EN rad också vid 820 | 820 |
| `amendering-402.8-anmalningsavgift-desktop.png` | efter ett tryck på "Anmälningsavgift" · 12 000 kr | 1440 |
| `amendering-402.8-hela-beloppet-desktop.png` | efter ett tryck på "Hela beloppet" · 27 000 kr | 1440 |
| `amendering-402.8-forslag-handredigerad-desktop.png` | `Förslag` valt EFTER en handredigering (Anna Lindqvist satt till 750 kr för hand) · avstämningen får en tredje rad "1 eget belopp 750 kr" · 11 250 kr | 1440 |

**Avgifts-bilden ser nästan ut som utgångsläget, och det är själva poängen.**
Fixturens sex nya anmälningar bär redan sin avgift som förslag, och de fyra
som betalat avgiften har ingen avgifts-kandidat — deras 1 500 kr står KVAR i
stället för att tömmas. Bilden avbildar alltså AC #3:s kant: en rad utan
kandidat rörs inte.

**Handredigerings-bilden avbildar varv 5:s regel** — en handredigerad rad är
Lottas undantag och släcker INTE läget. Sekvensen: öppna Annas belopp, skriv
750, Klar. `Förslag` står kvar valt hela tiden (det är förvalet), och hennes
750 kr står kvar bredvid nio rader på appens förslag.

Namnprefixet är `amendering-` och inte `facit-` med avsikt: `FACIT_BILD_GLOB`
i `.facit-policy.conf` är `facit-*`, och en bild som matchar det MÅSTE vara
deklarerad i manifestets `bilder` (invariant a). Samma val som
`TASK-402.4` gjorde för sina tre importbilder.

**KÄND BILDARTEFAKT, oförändrad sedan facit:** `PrototypeSwitcher`-railen
(a/b/c) och TanStack Router-devtools syns i bilderna. De hör inte till formen
och rivs med substratet.

**RIGGEN, och två ändringar i den som slutvarvet krävde** (`riggen-proto-shot.mjs`
i denna katalog, samma fil som tog facit-bilderna):

1. Trädet härleds nu ur skriptets EGEN plats i stället för ur en literal. Den
   pekade på worktreen `s121-registrera-betalning`, som var BORTTAGEN när
   slutvarvet skulle köra riggen — en hårdkodad syskonsökväg är en tidsinställd
   bomb i ett träd där worktrees skapas och rivs per uppdrag. `PROTO_WT` finns
   som utväg för den som vill köra mot ett annat träd.
2. Ett `--steg`-flöde (`klick` · `fyll` · `rulla` · `vänta`, i angiven ordning).
   `--klick` kan bara klicka, vilket inte räcker för handredigerings-bilden,
   och `rulla` finns för appens FASTA bottennav: i en `fullPage`-dump ritas ett
   `position: fixed`-element EN gång, på sin plats relativt rullningen vid
   dumpens början. Mätt i detta pass: iPad-dumpen av sätt-alla-blocket fick
   navet rakt över de tre segmenten — alltså över exakt det Marcus skulle döma.
   Alla fem bilderna är tagna med `rulla:botten` sist, så navet står där det
   hör hemma. De gamla flaggorna `--klick`/`--hovra`/`--vänta` är orörda.

---

## 6. Vad som INTE ändrats

* De fem låsta facit-bilderna.
* `facit.json` i övrigt: `godkand` är `null`, `lasning`, `bilder`, `kallor` och
  `not` är orörda.
* De fem prototyp-markörerna i `.facit-policy.conf` (`FACIT_PROTO_MARKORER`) —
  `bash scripts/check-facit.sh` grön i denna landning (invariant c).
* Inkorgens pills (`BetalningsInkorg.tsx`), MessageBox-primitiven och de
  globala tokens.
* Genvägarna `sattGenvag`/`aktivGenvag` och `BeloppsgenvagsKnappar` — de bär
  varianterna A/B och rivs i `TASK-402.6`. Deras semantik är en ANNAN än
  sätt-alla-knapparnas (alla rader, och en rad utan kandidat töms och flyttas
  till hand-högen), vilket är just varför formen inte återanvänder dem.

## 7. Marcus granskning — GENOMFÖRD, AC #6 bockad

`TASK-402.8` AC #6 (som ERSÄTTER `TASK-402.3` AC #10, vilket granskade den
gamla formen) är betald genom de tio formvarven ovan. Marcus granskade varje
varv levande på granskningsservern (port 4173, `?data=fixtur`) på desktop och
iPad, inte mot stillbilder i efterhand, och stängde iterationen i klartext
2026-09-06:

> *"Nu är vi klara med bulkregistrerings-sidan också, vi kör på detta. Nu
> behöver det här komma till prod också."*

AC #6 är bockad på de orden. Bilderna i § 5 är därför bokföring av den
granskade formen, inte underlaget granskningen skedde mot — den skillnaden
står här för att nästa läsare inte ska tro att bilderna bär beviset.

**Granskningsvyn är oförändrad** (`TASK-402.3` Implementation Notes):
`?data=fixtur` för facit-datan bakom DEV, `?ids=…` för den skarpa ytan mot
staging.

**Vad som fortfarande väntar:** stämpeln. `facit.json` bär `"godkand": null`,
så `ADR-102` B3 gäller oförändrat — ingenting i prototyp-substratet rivs före
den. Marcus andra mening ovan ("komma till prod") är promoveringens uppdrag,
`TASK-402.6`, inte denna skivas.
