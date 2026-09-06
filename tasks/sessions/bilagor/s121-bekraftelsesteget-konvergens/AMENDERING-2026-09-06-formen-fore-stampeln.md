# Amendering 2026-09-06 — formen före stämpeln: pillsen bort, namnet klipps, sätt-alla-knapparna under listan (TASK-402.8)

> **STATUS 2026-09-06: FORMEN ITERERAS — §§ 3–5 BESKRIVER VARV 1, INTE DET SOM
> LIGGER PÅ GRENEN NU.** Bilderna i § 5, referens-tabellen i § 4 och
> beskrivningen av etiketten i § 3 gäller **varv 1**. Sedan dess:
>
> * **Varv 2** (Marcus: *"Jag tror 'sätt alla belopp' måste få ett eget
>   block/ruta och passa snyggare in i sidans design. Det ser inte snyggt ut
>   nu."*) — den nakna raden byttes mot ett block i husets panelform
>   (`rounded-2xl bg-bg-muted p-4`, rubrik + hjälptext över knapparna).
> * **Varv 3** (Marcus, tre punkter: *"Skapa påtagligt mer luft mellan sätt
>   alla belopp-rutan och summeringsraderna nedanför."* · *"Ändra texten till
>   'Skriver över föreslaget belopp på alla markerade rader. Rader som behöver
>   din hand rörs inte.'"* · *"Sedan borde väl det finnas en 'Ångra knapp'
>   också här eller? Om hon vill ändra tillbaka till föreslaget belopp?"*) —
>   luften under blocket gick 12 → 24 px, hjälptexten fick Marcus ordalydelse,
>   och en tredje knapp **"Återställ förslagen"** (ghost, sist, avstängd när
>   ingen markerad rad avviker från sitt förslag) tillkom.
>
> Bokföringen tas igen EN gång när formen är klar — Marcus, samma dag:
> *"Angående min iteration på 'Sätt alla belopp' så måste vi ju inte ta nya
> bilder och krångla, det gör vi när iterationerna är klara."* Fram till dess
> är de åtta berörda `ariaSnapshot`-lägena markerade `test.fixme` i
> `tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts` (skälet och
> återställningen står i den filens huvud), och `facit.json` är orörd sedan
> varv 1. Denna ruta finns för att ett dokument som tyst beskriver en gammal
> form är värre än inget dokument alls (`ADR-083`-disciplinen).

**Yta:** `bekraftelsesteget` (manifestets enda `ytor`-post, `"godkand": null`,
låst 2026-09-05 med Marcus `"Lås som facit."`).

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

**Formen som landar:**

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

**PLACERINGEN ÄR ETT ANTAGANDE SOM VÄNTAR PÅ MARCUS.** Marcus sa "under
listan". Att knapparna står EFTER hand-högen och dubblett-sektionen och DIREKT
FÖRE avstämningens `<dl>` är orkestrerarens precisering, inte hans ord — den
ska dömas i facit-iterationen mot bilderna nedan.

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

## 4. Referenserna — åtta av tio omtagna, hasharna uppdaterade i manifestet

Alla tio genererades om i denna landning
(`playwright test --project=chromium-authenticated
tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts
--update-snapshots=all`). Playwright bevarade de handskrivna
regex-platshållarna (`/1 \d+ kr/` m.fl.) — de matchar fortfarande.

| Läge | desktop | iPad | Vad som ändrades |
|---|---|---|---|
| utgångsläget | ändrad | ändrad | pillsen ur två korts namn · tre nya noder (text + två knappar) · tom `status` |
| körningen pågår | ändrad | ändrad | samma, plus `[disabled]` på båda knapparna |
| efter Registrera | ändrad | ändrad | tre nya noder + tom `status` |
| efter Registrera och skicka | ändrad | ändrad | tre nya noder + tom `status` |
| Ångra-dialogen | **oförändrad** | **oförändrad** | dialogen renderas i en portal, utanför formens scope |

`facit.json`s `referenser[].sha256` är uppdaterade för de åtta;
Ångra-dialogens två står kvar på `dfa90663…`. `"godkand"` är orört (`null`).

**En kant värd att känna till för nästa omtagning:** `--update-snapshots`
(utan värde) skriver bara om de referenser som FÄLLDE, och en aria-snapshot
matchar som DELMÄNGD — de fyra lägen som bara FICK noder passerade därför
oförändrade i första körningen. `=all` krävdes för att referenserna skulle
beskriva hela den nya DOM:en i stället för att tyst underbeskriva den.

---

## 5. Bilderna

**De fem låsta `facit-*.png` är ORÖRDA.** Nya motbilder, tagna med samma metod
som facit (fristående Playwright med e2e-svitens `storageState`, `?data=fixtur`,
DPR 2, sv-SE, Europe/Stockholm, `fullPage`) men ur denna worktree mot
dev-servern på port 5273:

| Fil | Läge | Bredd |
|---|---|---|
| `amendering-402.8-utgangslage-desktop.png` | utgångsläget, 10 av 10 markerade | 1440 |
| `amendering-402.8-utgangslage-ipad.png` | utgångsläget | 820 |
| `amendering-402.8-hela-beloppet-desktop.png` | efter ett tryck på "Hela beloppet" | 1440 |
| `amendering-402.8-anmalningsavgift-desktop.png` | efter ett tryck på "Anmälningsavgift" | 1440 |

Namnprefixet är `amendering-` och inte `facit-` med avsikt: `FACIT_BILD_GLOB`
i `.facit-policy.conf` är `facit-*`, och en bild som matchar det MÅSTE vara
deklarerad i manifestets `bilder` (invariant a). Samma val som
`TASK-402.4` gjorde för sina tre importbilder.

**KÄND BILDARTEFAKT, oförändrad sedan facit:** `PrototypeSwitcher`-railen
(a/b/c) och TanStack Router-devtools syns i bilderna. De hör inte till formen
och rivs med substratet.

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

## 7. Vad som väntar på Marcus

`TASK-402.8` AC #6: granskningen av den nya formen mot bilderna ovan på desktop
1440 och iPad 820. Den ERSÄTTER `TASK-402.3` AC #10, som granskade den gamla
formen. Granskningsvyn är oförändrad (`TASK-402.3` Implementation Notes):
`?data=fixtur` för facit-datan bakom DEV, `?ids=…` för den skarpa ytan mot
staging.
