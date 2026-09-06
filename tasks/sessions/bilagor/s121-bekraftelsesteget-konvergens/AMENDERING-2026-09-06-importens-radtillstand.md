# Amendering 2026-09-06 — importens fyra radtillstånd designas inom C:s form (TASK-402.4)

**Yta:** `bekraftelsesteget` (manifestets enda `ytor`-post, `"godkand": null`,
låst 2026-09-05 med Marcus *"Lås som facit."*). Skarpa källor i dag:
`src/components/betalningar/prototype/VariantC.tsx` (formen),
`src/components/betalningar/Bekraftelsesteget.tsx`,
`src/components/betalningar/useBekraftelsesteg.ts`,
`src/components/betalningar/importminne.ts` (ny i denna skiva).

**Klass:** *ny form med förhandsmandat*. Manifestets egen § ÖPPET TILL PRD:N
säger ordagrant: *"importens radtillstånd (säker · osäker med kandidater ·
omatchad · dubblett, grillningens beslut 2b) fanns inte i fixturen och är inte
prövade i C — de designas i importskivan inom C:s form."* Detta är den
skivan, och detta är bokföringen av vad som faktiskt designades.

---

## FÖRST: vad som INTE är en avvikelse — mätt, inte påstått

Kortets AC #1 kräver att steget med importrader är **identiskt med facit i
läge "utgångsläget" för säkra rader**. Två oberoende mätningar säger att det
håller.

**1. Färgpaletten är facits egen, utan ett enda nytt värde.** De elva
vanligaste färgerna i importvyns utgångsläge finns alla i
`facit-bekraftelsesteget.png`. Mätt med `sharp` (rå RGB-histogram över hela
bilden, båda 2880 px breda):

| RGB | Vad det är | importvyn | facit |
|---|---|---|---|
| `255,255,255` | kortyta, sidbakgrund | 90,42 % | 77,45 % |
| `240,253,244` | **markerat kort** (`--mm-success-bg`) | 3,03 % | 14,30 % |
| `245,245,243` | listbehållare (`bg-bg-muted`) | 2,41 % | 3,58 % |
| `40,41,40` | primärknapp | 1,15 % | 1,10 % |
| `237,238,233` | räknarchip (`bg-bg-emphasized`) | 0,55 % | 0,71 % |
| `36,36,36` | brödtext | 0,30 % | 0,44 % |
| `225,227,225` | avatarplatta | 0,22 % | 0,17 % |
| `82,81,81` | sekundär text | 0,20 % | 0,14 % |
| `253,244,238` | **warning-pill** (`bg-warning-bg`) | 0,17 % | 0,08 % |
| `25,28,36` | rubriktext | 0,16 % | 0,16 % |
| `96,107,87` | markerat korts kant (`--mm-success`) | 0,11 % | 0,54 % |

Andelarna skiljer sig (importvyn har två markerade kort mot facits tio), men
**identiteterna är desamma**. Särskilt värt att notera: `253,244,238` är
warning-pillens ton, och den finns i facit redan — det är "Förfallen"-märkets
platta. Import-märkena Osäker och Omatchad återanvänder alltså exakt den
pillen, och "Redan registrerad" återanvänder `bg-bg-muted`. **Noll nya färger
infördes.**

**2. Ett säkert importkorts geometri är facits, på pixeln.** Vertikalt snitt
genom kolumnen `x = 1400` (@2x), band av kortets gröna fyllning:

| | facit | importvyn |
|---|---|---|
| kortets fyllningshöjd | 120 px | **120 px** |
| avstånd mellan två kort | 20 px | **20 px** |

Facit har tio band (tio kort), importvyn två. Höjden och gapet är identiska på
pixeln, vilket de ska vara: det är SAMMA `MarkerbartKort`-komponent, med
bankens belopp i stället för appens förslag.

**3. Den manuella matarens DOM är oförändrad.** Promoverings-grinden
(`tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts`, tio
ariaSnapshot-referenser hash-låsta i `facit.json`) är **grön i denna
landning**, alla tio lägen. De nya fälten i modellen läses med `?? []`
respektive `?? null`, så en yta utan import renderar byte för byte samma träd
som före skivan.

---

## Avvikelserna, en i taget

### 1. Källraden under statusraden (NY, endast importläget)

Under `h1`/statusraden står i importläget en rad i `text-caption
text-text-muted`:

```text
swishrapport-2026-09-06.csv, läst som Handelsbanken (Swish-rapport) · 5 rader
2 rader i filen var inte inbetalningar och togs inte med.
```

**Varför den finns:** inkorgens importpanel är STÄNGD när Lotta står i steget,
så utan raden finns ingenting på sidan som säger vilken fil raderna kom ur.
Den andra meningen bär parserns två räknade högar (bortfiltrerade rader,
radfel) — importens invariant är att varje bankrad syns någonstans
(`bankimport-rader.ts` § FYRA HÖGAR), och den överlever bara om de
bortsorterade räknas där Lotta ser dem. Den gamla bekräftelselistan bar samma
två tal på sin egen sammanfattningsrad; de flyttade hit när listan revs.

**Facit-motbild:** ingen. Facit-fixturen hade ingen import.

### 2. Radtillståndets märke (NY, endast osäkra, omatchade och dubbletter)

Osäkra och omatchade bankrader bär `StatusBadge ton="warning" storlek="sm"`
med orden **Osäker** respektive **Omatchad**; dubbletter bär `ton="neutral"`
med **Redan registrerad**. Samma komponent, samma två toner och samma
pill-skalsteg som facits egna `Förfallen`/`Obekräftad` (`prototype/radfalt.tsx`
§ `RadMarken`).

**SÄKRA RADER BÄR INGET MÄRKE**, och det är ett beslut mot AC #1, inte en
glömska. Kortet beskriver säker som *"förbockad, belopp och datum från
bankraden"* — tillståndet YTTRAR sig i att kortet är grönt och förbockat med
bankens siffra. Ett "Säker"-märke hade brutit identiteten mot facit för exakt
den yta AC #1 kräver identisk.

**Facit-motbild:** ingen för de tre märkta tillstånden.

### 3. Hand-högen bär en andra kortform (NY, endast importrader)

`Behöver din hand` innehöll i facit bara stegrader utan belopp (och var tom i
samtliga fem låsta bilder, eftersom fixturens tio rader alla bar ett belopp).
Importens osäkra och omatchade rader ligger i SAMMA sektion, i samma
`LISTA_KLASS`-behållare, med samma `kortKlass(false)` — men kortets innehåll
är bankradens:

- **huvud:** avatar · bankens namn · märke, och beloppet platt till höger
  (samma anatomi som `KortHuvud`, men utan kryssruta — raden har ingen anmälan
  att markera ännu)
- **kontextrad:** `datum · telefon · meddelande`, i `text-caption
  text-text-muted` (den rivna listans `radbeskrivning`, ord för ord)
- **skäl:** matchningens egen `grund` i `text-small text-text-secondary`
- **osäker:** kandidaterna som **förslagsknappar** med ledtexten "Förslag",
  `size="sm"`, sekundär, outline — samma knappform som stegets egna
  `ForslagsKnappar` för belopp
- **omatchad:** sökfält (`SearchField`, inkorgens fältklasser) och träffarna
  som samma förslagsknappar

**Varför knappar och inte den rivna listans `Select`:** hand-högen har redan en
förslagsrad där ett tryck sätter värdet direkt. En rullgardin bredvid den hade
gett två grammatiker för samma handling i samma kort. Kortet säger dessutom
uttryckligen "kandidaterna som förslagsknappar".

**Facit-motbild:** ingen — sektionen är tom i alla fem låsta bilder.

### 4. Sektionen "Redan registrerade" (NY)

Dubbletterna får en egen sektion efter hand-högen, med `SektionsRubrik` (samma
rubrik + räknarchip som "Behöver din hand") och kort **utan kryssruta och utan
knappar**. Under kortets kontextrad står `Importerad <datum>. Ingen ny
inbetalning skapas.`

**Varför egen sektion och inte hand-högen:** en dubblett väntar inte på Lotta,
den är färdig. Att räkna den i "Behöver din hand" hade räknat upp ett tal som
betyder "det här väntar på dig" med rader som inte gör det.

**Varför inte dold:** importens invariant igen — en rad som tyst försvann är
det enda utfall Lotta inte kan upptäcka.

**Varför ingen avstängd kryssruta:** kortet är en UTSAGA, inte ett val. En
disabled kryssruta hade sagt "det här kan du göra, fast inte nu"; en dubblett
kan aldrig bockas i, i den här sessionen eller någon annan.

**Facit-motbild:** ingen.

### 5. Tipsradens tredje text (NY gren, samma rad och plats)

Raden ovanför knapparna bär i facit två texter (`N rader saknar belopp …` och
`Jämför med kontoutdraget innan du registrerar.`). En tredje tillkommer när
importrader väntar på ett val:

```text
2 bankrader väntar på att du väljer anmälan.
```

Ordningen är den mest konkreta först (belopp → val → tipsraden). Raden byter
aldrig plats eller höjd.

**Facit-motbild:** facits egen tipsrad står oförändrad när inga importrader
väntar.

---

## Vad som INTE är amenderat

Följande är **stegets vanliga**, oförändrat, och syns så i bilderna:

- **Körningen** (ögonblicksbild, dimning, `aria-busy`, spinnern, räkningen som
  `role="progressbar"`, statusraden som annonserar start och slut).
- **Efterläget** — det delade `RegistreratNuBlock` med guldton, per rad
  `namn · betalsätt · kvittoläge · belopp · åtgärder`, och `Skicka N kvitton`
  + `Förhandsgranska` under raderna.
- **Avstämningen per beloppsklass**, summaraden och de två helbreddsknapparna.
- **Ångra-dialogen**, kvittokön och Ctrl/⌘+Enter.
- **Radformuläret i kortet** (det delade `RegistreraForm` i `redigera`-läget).

En rad som fallerar bär, som förut, felet under kortets huvud. Serverns 409
för en dubblett-bankreferens renderas där med texten *"Redan registrerad.
Ingen ny inbetalning skapades."* — den rivna listans egen formulering — och
raden **avmarkeras**, så en omkörning inte kan producera fler 409:or.

---

## `referenser` utökas INTE av denna skiva — och det är ett val

`ADR-102` § Updates A5 tillåter att `referenser` växer med nya
EFTER-referenser medan manifestet är ogodkänt, och uppdraget öppnade för det.
Det görs ändå inte här, av två skäl:

1. **Kortets AC #1 pekar på bilder, inte på snapshots:** de tre icke-säkra
   tillstånden ska vara *"frysta som AMENDERING-bilder i facit-katalogen"*.
   Det är denna fil plus de tre PNG:erna nedan.
2. **Promoverings-grindens tio referenser är `TASK-402.3`:s FÖRE/EFTER-par**
   (variant-läget mot den promoverade ytan). Att lägga importlägen i samma
   spec hade blandat två olika kontrakt i en fil — importens lägen har ingen
   FÖRE-halva, eftersom de aldrig fanns i prototypen.

Beteendet är i stället låst av en egen svit:
`tests/e2e/betalningar-import-bekraftelsesteget.staging.test.ts` (nio fall,
alla gröna), plus `tests/api/importminne.test.ts` (29 fall) för
tillståndsklassningen som ren funktion.

---

## Bilderna

Desktop 1440 @2x, sv-SE, Europe/Stockholm, mockade EF-svar (ingen skarp
staging-skrivning), fristående Playwright med e2e-svitens `storageState` —
samma metod som `TASK-402.3`:s facit-jämförelse. Kopior ligger också i
`tasks/sessions/bilagor/task-402.4-facit-jamforelse/`.

| Läge | Bild | Mått |
|---|---|---|
| utgångsläget, alla fyra tillstånden | `amendering-402.4-import-utgangslage.png` | 2880×2820 |
| efter valen (hand-högen tom, dubbletten kvar) | `amendering-402.4-import-efter-valen.png` | 2880×2314 |
| efter registreringen (tre i blocket, 409-raden kvar) | `amendering-402.4-import-efter-registrera.png` | 2880×2288 |

**Känd bildartefakt, samma som facit bokför:** TanStack Router-devtools syns i
hörnet. Dev-only, hör inte till formen.
