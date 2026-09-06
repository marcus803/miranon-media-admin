# Amendering 2026-09-06 — ariaSnapshot-paret deklareras, och fyra avvikelser bokförs (TASK-402.3)

> **RÄTTAD 2026-09-06 (runda 2, review-agentens fynd 2):** föregående version
> av detta stycke påstod att `facit.json` var AGENT-FRUSET och att
> `referenser`-fältet inte fick skrivas av en agent — en felaktig premiss.
> `ADR-104`-hooken (`scripts/deny-facit-godkand-skrivning.sh`) fryser bara ett
> manifest vars `godkand` REDAN är satt (icke-null); vår yta bär
> `"godkand": null`, och hooken släpper varje skrivning som lämnar fältet
> null (verifierat mot `scripts/lib/facit-godkand-skrivning.mjs`, som prövar
> exakt `objekt.godkand !== null`). Per `ADR-102` § Updates 2026-08-22 § A5 är
> DETTA den enda tidpunkt ett mekaniskt hash-lås (`referenser: [{ fil, sha256
> }]`, `check-facit.sh`s invariant (d)) kan etableras — låset går inte att
> lägga på retroaktivt sedan hooken fryst manifestet. `referenser` är därför
> skrivet DIREKT i `facit.json` (10 poster, ett per ariaSnapshot-fil), inte i
> denna sidofil. `godkand` är orört (`null` kvar).
>
> Denna sidofil finns kvar som NARRATIV — klassningen av de fyra avvikelserna,
> deras Marcus-grund och vad som INTE är amenderat. Det formatet (prosa utan
> hashar) är kanoniserat i `ADR-102` § Updates 2026-08-22 § A3 för just den
> delen av bokföringen; det är bara `referenser`-nyckeln som A5 flyttar in i
> manifestet självt.

**Yta:** `bekraftelsesteget` (manifestets enda `ytor`-post, `"godkand": null`,
låst 2026-09-05 med Marcus `"Lås som facit."`; källorna listade i manifestets
`kallor`).

---

## 1. `referenser` — ariaSnapshot-paret som manifestet deklarerade som frånvarande

Manifestet säger under § REFERENSER: *"INGA ännu — `"referenser": []` är en
DEKLARERAD frånvaro … promoverings-grindens ariaSnapshot-par (ADR-103 B4) föds
i variant-läget FÖRE flippen, i promoveringsskivan, inte i låsningen."*

Paret är nu fött. Tio referenser, fem lägen × två bredder, alla i katalogen
`tests/e2e/__aria__/bekraftelsesteget-promoverings-grind.staging.test.ts/`:

| Läge | desktop 1440 | iPad 820 |
|---|---|---|
| utgångsläget | `bekraftelsesteget-utgangslage-desktop-chromium-authenticated.aria.yml` | `bekraftelsesteget-utgangslage-ipad-chromium-authenticated.aria.yml` |
| körningen pågår | `bekraftelsesteget-korning-pagar-desktop-…` | `bekraftelsesteget-korning-pagar-ipad-…` |
| efter Registrera | `bekraftelsesteget-efter-registrera-desktop-…` | `bekraftelsesteget-efter-registrera-ipad-…` |
| Ångra-dialogen | `bekraftelsesteget-angra-dialog-desktop-…` | `bekraftelsesteget-angra-dialog-ipad-…` |
| efter Registrera och skicka | `bekraftelsesteget-efter-skicka-desktop-…` | `bekraftelsesteget-efter-skicka-ipad-…` |

**Hash-låst i `facit.json`s `referenser`-fält (runda 2, se rättelsen ovan):**
samtliga tio, med varje fils faktiska `sha256` vid SHA `081a2e95` (denna
skivas HEAD). `bash scripts/check-facit.sh` (invariant (d)) verifierar dem vid
varje körning — grön i denna landning.

Specen är `tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts`.
Den ligger i staging-e2e-klassen och INTE i `tests/visual/` — den hermetiska
fixturvärlden kan strukturellt inte rendera routen
(`playwright.config.ts` sätter `VITE_FEATURE_BETALNINGAR: 'av'` för hela den
delade världen, och routens `beforeLoad` redirectar då till `/mer`). PRD
`TASK-402` § Testbeslut punkt 2 pekar ut samma skarv.

**FÖRE-halvan låstes i commit `d95b8e1a`**, i variant-läget
(`?variant=c&data=fixtur`) innan en enda rad i formen ändrades. EFTER-halvan
kördes mot den promoverade ytan (`?ids=…`) i denna landning. Den ENDA raden
som skiljer specen mellan de två committen är sök-parametern i `oppna()` —
`git diff d95b8e1a -- tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts`
visar det.

**PARETS UTFALL, mätt:**

* **SEX av tio referenser är BYTE-IDENTISKA genom flippen** — utgångsläget,
  körningen pågår och Ångra-dialogen, båda bredderna. Det är där grinden
  faktiskt fäller, och den fällde inte.
* **FYRA skiljer sig**, alla på noder som per manifestets egen text är
  PROTOTYP-ARTEFAKTER, inte form. De fyra regenererades i flipp-committen med
  diffen uppräknad nedan — samma precedent som
  `segment-promoverings-grind.spec.ts` följde när `SkalprovsVaxel` revs (*"de
  två filerna omgenererades därför i rivnings-committen … och ENDAST de två"*).

---

## 2. Avvikelse A — Förhandsgranska är inte längre inert

**Klassning: (b) — formen är oförändrad, ändringen är ett källbyte.**

FÖRE-referensen bar, per rad i "Registrerat nu":

```yaml
- button "Förhandsgranska kvittot till Anna Lindqvist" [disabled]
- tooltip "Öppnar kvittot som PDF i den skarpa ytan. Inte byggt i prototypen."
```

EFTER-referensen bär:

```yaml
- button "Förhandsgranska kvittot till Anna Lindqvist": Förhandsgranska
```

Manifestet förutser detta i klartext under § ÖPPET TILL PRD:N: *"Förhandsgranska
är inert i prototypen (ingen PDF ur fixtur)."* Knappen är nu inkorgens riktiga
(`RegistreratNuBlock.tsx`, `TASK-402.2`) och öppnar en PDF. Den synliga
etiketten, dess plats i raden och dess tillgängliga namn är oförändrade;
`[disabled]`-flaggan och tooltip-noden var prototypens sätt att säga "inte
byggt", och det är inte längre sant.

Berör: `efter-registrera` (båda bredderna). Samma nod i `efter-skicka` är redan
borta i båda halvorna (ett skickat kvitto erbjuder ingen förhandsgranskning).

---

## 3. Avvikelse B — prototypens `sr-only`-hjälpvärde följer inte med

**Klassning: (b) — formen är oförändrad.**

FÖRE-referensen bar sist i blocket:

```yaml
- text: 9 kvitton hör till registreringen
```

Noden är en `sr-only`-span som `VariantC.tsx` märkte *"Prototypens hjälpvärde,
för tydlighet vid granskningen"*. Den hörde till granskningen av prototypen,
inte till formen, och finns inte i det delade blocket. Ingen synlig pixel
ändras; för en skärmläsare försvinner en mening som beskrev prototypen.

Berör: `efter-registrera` och `efter-skicka`, båda bredderna.

---

## 4. Avvikelse C — den fallerade radens feltext är serverns, inte prototypens

**Klassning: (a) — en synlig textändring, med avsikt.**

Facit-bilden `facit-bekraftelsesteget-efter.png` visar Gunnar Falks felrad:

> Beloppet kunde inte sparas. Försök igen.

Den texten var prototypens `FEL_TEXT` — ett PÅHITT, eftersom fixturen inte hade
någon server att citera. Den promoverade ytan visar i stället serverns eget
meddelande, exakt som inkorgens radformulär redan gör vid `registrera.isError`
(`RegistreraForm.tsx`: `{registrera.error.message}` i en `role="alert"`). I
grindens mockade fall lyder det:

> Edge Function "registrera-inbetalning" 422: Beloppet kunde inte sparas. Försök igen.

Att behålla den påhittade texten hade dolt serverns diagnos för Lotta — en
formregression förklädd till formtrohet. Radens PLATS, roll (`role="alert"`),
färg och den kvarstående, markerade kortformen är oförändrade; det är ordens
KÄLLA som bytt, vilket är precis vad `ADR-103` B2 steg 1 promoverar.

**Sidofynd, mätt under bygget och värt att bära vidare:** grindens första
EFTER-körning lät mocken svara `500`, och ALLA TIO raderna registrerades ändå.
`fetchWithRetry` (`src/data/utils.ts`) retryar 5xx tre gånger med exponentiell
backoff, så det enda fel-svaret konsumerades av retry-lagret. Det är korrekt
produktionsbeteende — ett övergående serverfel läks utan att Lotta ser något —
men det betyder att facit-bildens "en rad fallerade" i verkligheten kräver ett
ihållande fel (4xx, eller 5xx fyra gånger i rad). Prototypen kunde inte visa
den skillnaden.

Berör: `efter-registrera` och `efter-skicka`, båda bredderna.

---

## 5. Avvikelse D — två lägen facit inte avbildar

**Klassning: (c) — ny form, ingen motbild finns.**

### 5a. Tomläget

Steget kan nås utan urval (`ids` saknas) eller med ett urval som inte längre är
öppet (raderna hann registreras i en annan flik). Facit har ingen bild av det
läget — prototypens fixtur bar alltid tio rader. Formen är husets enklaste, en
mening i `text-body text-text-secondary`:

> Inga inbetalningar att bekräfta. Markera raderna i betalningsinkorgen och tryck Registrera.

EN text för båda vägarna in, med avsikt: de betyder samma sak för Lotta, och en
text som gissade vilken av dem det var hade kunnat ha fel.

### 5b. "Behöver din hand" bär nu Klar/Avbryt

Prototypens `RadFormular` kunde renderas UTAN knappar (den var en kopia och ägde
sin egen prop-yta). Det delade `RegistreraForm` i `redigera`-läget kräver båda
callbacks — rätt kontrakt för en komponent som ska kunna stängas. "Avbryt"
fäller ihop kortet till dess belopps-rad, som ett `MarkerbartKort` som aldrig
öppnats; en knapp "Fyll i beloppet för N" öppnar det igen.

**INGEN FACIT-BILD VISAR DETTA LÄGE:** facit-fixturens tio rader bär alla ett
belopp, så "Behöver din hand" är TOM i samtliga fem låsta bilder. Ändringen är
därför en amendering utan motbild — bokförd i stället för att göras tyst
(`ADR-102` B5/R3).

---

## 6. Vad som INTE ändrats

* Manifestet (`facit.json`) — orört, `"godkand": null` kvar.
* De fem låsta bilderna — orörda.
* De fem prototyp-markörerna i `.facit-policy.conf` — samtliga verifierade kvar
  (`bash scripts/check-facit.sh` exit 0). Routens `variant: z.enum(['a', 'b',
  'c'])` behöll sin enum-form och tappade bara sin `.default('a')`, just för att
  markören ska överleva till `TASK-402.6`.
* Varianterna A och B, växlaren och simuleringslagret — kvar bakom
  `import.meta.env.DEV`, rivs efter Marcus stämpel (`ADR-102` B3).

## 7. Vad som väntar på Marcus

`TASK-402.3` AC #10: granskningen av den promoverade ytan mot facit-bilderna på
desktop 1440 och iPad 820. Manifestet säger att *"iPad 820 är INTE granskad av
Marcus i konvergensen … promoveringsskivan tar iPad-formen som eget
granskningssteg"* — iPad-referenserna ovan är därför formens FÖRSTA lås vid den
bredden, inte en jämförelse mot en godkänd bild. Granskningsvyn (adresser,
kommandon, vad som ska jämföras) står i kortets Implementation Notes.
