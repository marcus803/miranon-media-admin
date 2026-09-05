// Steg 3: klassificering av de 182 designordsmatchade meddelandena.
// Nyckel: fileId (fullständigt) + timestamp (exakt, från steg2-json) — INTE
// array-index, eftersom skriptet omkörts flera gånger under sonderingen och
// index skiftat varje gång filurvalet ändrats. fileId+timestamp är stabilt.
//
// Klasser (taxonomi, identisk med syskon-passets):
//   SKB = sidkrom-bredd · KG = kortgeometri · KN = knappar
//   TH  = typografi-hierarki · FT = farg-token · CH = copy-hjalptext
//   FP  = fixtur-prototyptext · KA = komponent-aterbruk
//   KS  = konsekvens-syskonvy · BI = beteende-interaktion
//   LK  = laddkansla · PR = process · AN = annat
//
// Fil -> session (disk-verifierat via "Återuppta S<N>"-mönster i respektive
// transkript, se rapportens § Metod för fullständig belägg-tabell).
export const FILE_SESSION = {
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17': 'S109',
  '112a333c-5e92-4b31-8e62-43324652e8e0': 'S111',
  '12afb923-23a0-4e61-b61a-ccdec801c2c2': 'S108',
  '1cda1aa7-0b4d-4ebf-8cc5-57f3ec883dee': 'S110',
  '21f84248-09f0-4f05-9e38-9f65d69b965e': 'S93',
  '288b57d5-254e-4d80-9fd4-da38b836bec2': 'S102',
  '30850a9b-492c-4b38-bfd9-8299721fe9b4': 'S113',
  '34a858c8-1fd4-4cf5-9e41-13475e90871e': 'S107',
  '6b33b472-6122-4842-ac77-97fe9f17fbc3': 'S107',
  '6f802e6c-89a5-4fc9-a082-e81618099e34': 'S102',
  '772121e1-5666-44e3-96ee-78c47e99bd5d': 'S113',
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3': 'S108',
  '804ba374-f064-443f-a02d-5230694657cd': 'S103',
  '832fbb83-bd10-4ed9-8f53-0bc7c58842f3': 'S103',
  '84b83d9d-75cc-438e-a215-9d6add586e00': 'S113',
  '87440216-fc19-4eb0-9383-6c325dbe10a9': 'S93',
  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353': 'S114',
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b': 'S102',
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8': 'S113',
  'c91a05a2-ea83-41d8-a38c-1e800b227992': 'S93',
  'd4cf458c-7581-4837-a7f2-d5775a00b4c0': 'S103',
  'e4203fd3-b7e2-4882-bcca-7936976c8b84': 'S104',
  'e9b60a0a-1aad-473f-9b39-be44acadd706': 'S104',
  'fd52329f-7c5a-4199-8f77-86ce453afdec': 'S111',
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793': 'S102',
};

// key = `${fileId}__${timestamp}`
export const CLASSIFICATION = {
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T08:14:06.801Z': {
    classes: ['PR'],
    tolkning:
      'Ber om extremt tydliga, konkreta beslutsfrågor och nämner att klara backlog-kort ska stängas — processfråga, inte designpushback.',
  },
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T09:52:32.346Z': {
    classes: ['PR'],
    tolkning:
      'Facit-godkännande av notis-konvergensen via bang-kanalen; citatet självt bär ingen designsubstans.',
  },
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T09:58:58.075Z': {
    classes: ['PR'],
    tolkning: 'Andra stämplingsförsöket av samma konvergens (dubblett) — processartefakt.',
  },
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T09:59:48.480Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av meddelandefamiljens konvergens.',
  },
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T10:39:05.903Z': {
    classes: ['AN'],
    tolkning: 'Kort positiv designkvittens utan namngivet mål — passar ingen given klass exakt.',
  },
  '03bc2d12-5cc1-4aa3-b89c-a09150620d17__2026-08-22T16:59:23.942Z': {
    classes: ['PR'],
    tolkning:
      'Facit-godkännande av personlistan; citatet bär en positiv designverdikt men handlingen är stämplingsritualen.',
  },

  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T13:53:16.235Z': {
    classes: ['KS', 'KA'],
    tolkning:
      'Vill återanvända ikonmönster från dokumentsidans eventväljare — konsekvens plus komponentåterbruk i samma andetag.',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T14:52:56.878Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av anmälningssidans konvergens.',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T14:53:37.295Z': {
    classes: ['PR'],
    tolkning: 'Andra körningen av samma godkännande-kommando (kanalfel).',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T16:43:49.940Z': {
    classes: ['SKB', 'KS'],
    tolkning:
      'Upptäcker att anmälningssidan saknar bakåt-chevronen andra sidor har — sidkrom-konsekvens bruten.',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T17:08:07.700Z': {
    classes: ['SKB', 'PR'],
    tolkning: 'Uppföljningsfråga om chevron-fixets status.',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T17:52:19.710Z': {
    classes: ['SKB', 'KS'],
    tolkning:
      'Kärncitat: alla undersidors chevron ska sitta på EXAKT samma höjd — det är hela poängen med sidkromet som delad komponent.',
  },
  '112a333c-5e92-4b31-8e62-43324652e8e0__2026-08-23T18:45:56.839Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande, ersätter tidigare stämpel.',
  },

  '12afb923-23a0-4e61-b61a-ccdec801c2c2__2026-08-21T07:43:56.494Z': {
    classes: ['PR'],
    tolkning: 'Kickoff-order, inget designinnehåll.',
  },
  '12afb923-23a0-4e61-b61a-ccdec801c2c2__2026-08-21T08:07:13.264Z': {
    classes: ['PR'],
    tolkning:
      'Överordnad mönsterobservation: förstautkast av prototyper brukar bli dåliga och slarviga — ber Code självgranska innan Marcus ser den.',
  },
  '12afb923-23a0-4e61-b61a-ccdec801c2c2__2026-08-21T09:01:40.367Z': {
    classes: ['KG', 'TH', 'SKB'],
    tolkning:
      'Kärncitat: rader/kort får aldrig ha olika höjd eller växa/krympa med innehållet — layouten ska alltid vara konsekvent.',
  },
  '12afb923-23a0-4e61-b61a-ccdec801c2c2__2026-08-21T09:14:30.574Z': {
    classes: ['KA', 'CH'],
    tolkning:
      'Efterlyser återbruk av etablerat formspråk i appen snarare än ny uppfinning, plus en copy-versalfel-detalj.',
  },
  '12afb923-23a0-4e61-b61a-ccdec801c2c2__2026-08-21T09:42:41.648Z': {
    classes: ['CH', 'BI', 'KG'],
    tolkning:
      'Breddar scopet till ALLA dialoger i appen — storlek och hover ska vara konsekventa systemet över.',
  },

  '1cda1aa7-0b4d-4ebf-8cc5-57f3ec883dee__2026-08-22T10:45:19.613Z': {
    classes: ['SKB', 'KS', 'KG'],
    tolkning:
      "Kräver att en av misstag exponerad, ej konvergerad sida får identisk grund (rubrik, chevron) som färdiga sidor — 'exakt samma allting'.",
  },
  '1cda1aa7-0b4d-4ebf-8cc5-57f3ec883dee__2026-08-22T11:17:50.997Z': {
    classes: ['PR'],
    tolkning: 'Statusfråga om facit-stämplingsläget.',
  },
  '1cda1aa7-0b4d-4ebf-8cc5-57f3ec883dee__2026-08-22T11:24:48.681Z': {
    classes: ['AN'],
    tolkning: 'Bekräftar en medveten, dokumenterad avvikelse — godkännande, ingen ny kritik.',
  },
  '1cda1aa7-0b4d-4ebf-8cc5-57f3ec883dee__2026-08-22T12:39:22.587Z': {
    classes: ['PR'],
    tolkning: 'Sessionsavslut och scope-reservation för nästa session.',
  },

  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T16:27:53.989Z': {
    classes: ['KS', 'PR'],
    tolkning:
      'Konstaterar att skarpa bygget avviker från prototypen — kärnfrustrationen som senare blev ADR-102.',
  },
  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T16:41:50.947Z': {
    classes: ['KS'],
    tolkning: 'Positiv bekräftelse: skarpt = identiskt med prototyp, uttryckligen firat.',
  },
  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T17:25:01.214Z': {
    classes: ['AN'],
    tolkning: 'Beröm för orkestrering/process, inte visuell design.',
  },
  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T19:20:44.703Z': {
    classes: ['PR'],
    tolkning: 'Godkänner backlog-kortets AC — processgodkännande.',
  },
  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T19:26:23.157Z': {
    classes: ['PR'],
    tolkning:
      'Klagar på att komma ihåg facit-stämpelns kommandoform — verktygsergonomi, inte design.',
  },
  '21f84248-09f0-4f05-9e38-9f65d69b965e__2026-08-08T20:01:16.955Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av hållplats-prototypen.',
  },

  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T07:00:14.432Z': {
    classes: ['KN', 'CH', 'KG'],
    tolkning:
      "Detaljerad punktlista: ikoner bort från knappar, siffra i 'pill'-form, hover-tillägg, copy-byten — klassiskt konvergensvarv.",
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T07:12:21.391Z': {
    classes: ['BI', 'CH'],
    tolkning: 'Textklippning i demo-varianten löser inte det verkliga Lotta-scenariot.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T08:07:36.212Z': {
    classes: ['PR'],
    tolkning: 'Statusfråga efter frånvaro.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T08:34:02.204Z': {
    classes: ['PR'],
    tolkning:
      'Återkommande oro: förstautkast av prototyper blir ofta dåliga — vill ha WOW redan från start.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T08:47:50.897Z': {
    classes: ['SKB', 'FP', 'KN'],
    tolkning:
      "Kärncitat: saknad sidkrom-grund, kvarvarande 'prototyp-text', och olika breda knappar/toggles i samma svep.",
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T08:59:15.265Z': {
    classes: ['BI', 'LK', 'KS'],
    tolkning:
      'Laddningsupplevelsen ska spegla inloggningssidans centrering — visuellt + känslomässigt krav på laddskärmen.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T09:14:57.897Z': {
    classes: ['PR'],
    tolkning: 'Facit-lås och kommando för nästa steg.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T11:50:48.289Z': {
    classes: ['KN', 'CH'],
    tolkning: 'Ikoner bort, hover in på Visa-knappen.',
  },
  '288b57d5-254e-4d80-9fd4-da38b836bec2__2026-08-16T11:53:46.646Z': {
    classes: ['KN', 'BI'],
    tolkning: 'Knappstyling (bakgrund i stället för bara hover) och vertikal centrering i raden.',
  },

  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T18:02:14.142Z': {
    classes: ['KN', 'KS'],
    tolkning:
      'Högerställda knappar på dokumentytan är inkonsekventa — vill flytta dem till vänster under raden.',
  },
  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T18:11:04.727Z': {
    classes: ['KG'],
    tolkning:
      'Varnar uttryckligen för att INTE bryta befintligt korthöjdslås — minns tidigare smärta.',
  },
  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T20:24:12.964Z': {
    classes: ['KG', 'KA'],
    tolkning:
      'Föreslår att byta radlista mot etablerat kortformat redan i bruk i appen — komponentåterbruk.',
  },
  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T20:26:35.767Z': {
    classes: ['KG'],
    tolkning: 'GO på kortformen.',
  },
  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T20:30:11.513Z': {
    classes: ['PR'],
    tolkning: "Delegerar slutgranskning och promovering till Codes 'perfektionsöga'.",
  },
  '30850a9b-492c-4b38-bfd9-8299721fe9b4__2026-08-29T20:32:28.293Z': {
    classes: ['AN'],
    tolkning: 'Generell kvalitetsuppmaning utan specifikt mål.',
  },

  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T21:05:51.852Z': {
    classes: ['KN', 'CH', 'KA'],
    tolkning:
      'Ikoner ska bli knappar med samma bakgrund/hover som befintlig Visa-knapp — komponentkonsekvens plus hjälptext bort.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T21:39:32.534Z': {
    classes: ['KN', 'TH'],
    tolkning: 'Knappar till ikoner, färgtoning, egen rubrik/block för wizarden.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T22:09:29.223Z': {
    classes: ['KN', 'TH'],
    tolkning: "Etikett bör vara 'pill'-komponent snarare än fri text; missnöjd med ersätt-knappen.",
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T22:38:32.122Z': {
    classes: ['TH', 'KN'],
    tolkning: 'Kärncitat: alla fyra knappar måste se likadana ut och sitta i rad.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T22:50:43.581Z': {
    classes: ['TH'],
    tolkning: 'Rubriker in i sina block, kortare filnamn, rubrikomformulering.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T23:00:55.616Z': {
    classes: ['TH', 'CH'],
    tolkning: 'Vill ta bort en rubrik helt eller göra den till dropdown-knapp.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-17T23:05:39.353Z': {
    classes: ['AN'],
    tolkning: 'Positiv visuell kvittens.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-18T07:28:09.432Z': {
    classes: ['KN', 'SKB'],
    tolkning: 'Ifrågasätter en knapps placering direkt under eventväljaren.',
  },
  '34a858c8-1fd4-4cf5-9e41-13475e90871e__2026-08-18T07:38:00.014Z': {
    classes: ['KG'],
    tolkning:
      'Kärncitat: ALLA dokumentrader måste vara lika höga, alltid — föreslår ett fast antal rader (3) som regel.',
  },

  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T08:04:04.985Z': {
    classes: ['AN'],
    tolkning: 'Backlog-kort, inte UI-design.',
  },
  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T08:39:02.730Z': {
    classes: ['AN', 'PR'],
    tolkning:
      "Logo/favicon-pixeljustering och en 'appen behöver uppdateras'-banner som upplevs skitful; föreslår att versionsätta hela appen.",
  },
  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T08:49:09.017Z': {
    classes: ['KN', 'AN'],
    tolkning:
      'Centreringsproblem och en banner med långtextsträng plus centrerad knapp som upplevs oprofessionell.',
  },
  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T08:52:52.908Z': {
    classes: ['AN'],
    tolkning: 'Generell kritik mot appens felmeddelande-banners som klass.',
  },
  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T09:42:36.669Z': {
    classes: ['AN'],
    tolkning: 'Pixelnivå-justering av logotypens två M — utanför given taxonomi.',
  },
  '6b33b472-6122-4842-ac77-97fe9f17fbc3__2026-08-20T09:59:43.184Z': {
    classes: ['AN'],
    tolkning: 'Verktygskostnadsfråga (Sentry), inte design.',
  },

  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T14:27:18.890Z': {
    classes: ['PR'],
    tolkning: 'Statusfråga om granskningssvepets prototyp-scope.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T15:18:55.036Z': {
    classes: ['KN', 'BI'],
    tolkning: 'Frågar om knapp fungerar och varför Visa-knappen inte visar faktiska PDF:en.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T16:52:32.871Z': {
    classes: ['PR'],
    tolkning: 'Trasig länk, inget designinnehåll.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T16:57:32.689Z': {
    classes: ['PR'],
    tolkning:
      "Starkaste kvalitetsdomen i hela urvalet: 'jag finner inga ord... så dålig och så ful' — kräver Opus och att Code själv tittar innan en agent sätts på jobbet.",
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T17:04:07.758Z': {
    classes: ['FP'],
    tolkning:
      'Prototyp-växlaren själv trasig/borttagen av agenten — konkret fixtur-regression, inte bara kvalitetsomdöme.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T17:54:26.069Z': {
    classes: ['AN'],
    tolkning: 'Backlog-kort-hygien, inte design.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T20:03:45.321Z': {
    classes: ['PR'],
    tolkning: 'Frustration över sessionens tidsåtgång och grindarnas overhead.',
  },
  '6f802e6c-89a5-4fc9-a082-e81618099e34__2026-08-16T20:32:23.565Z': {
    classes: ['PR', 'KN'],
    tolkning:
      'Processförvirring kring facit-mekaniken (när stämplas?) plus återkommande knappbreddsinkonsekvens.',
  },

  '772121e1-5666-44e3-96ee-78c47e99bd5d__2026-08-30T06:16:27.086Z': {
    classes: ['KG', 'FT'],
    tolkning:
      'Hover bort på korten, scrollbarens färg och placering, skuggning bara på det vita kortet.',
  },
  '772121e1-5666-44e3-96ee-78c47e99bd5d__2026-08-30T08:41:15.865Z': {
    classes: ['KN', 'KG', 'KS'],
    tolkning:
      'Hover-formen på översta kortets åtgärdsknapp är fyrkantig medan alla andra kort har rund — samma komponent ska bete sig identiskt.',
  },
  '772121e1-5666-44e3-96ee-78c47e99bd5d__2026-08-30T10:00:08.961Z': {
    classes: ['KN', 'FT'],
    tolkning:
      'Samma hover-bugg kvarstår i prod efter påstådd fix; skarp order att kolla själv och fixa.',
  },

  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T10:24:44.764Z': {
    classes: ['KS'],
    tolkning: 'ALLA dialoger ska hålla samma kvalitetsnivå som resten av appen.',
  },
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T10:52:25.072Z': {
    classes: ['KG', 'KN', 'KA'],
    tolkning:
      'Alla rader i agenda-modalen måste ha samma höjd; återanvänd befintlig rosa radera-knapp från dokumentytan i stället för att uppfinna ny.',
  },
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T11:07:01.493Z': {
    classes: ['BI', 'FT'],
    tolkning:
      "Kärncitat: layouten får INTE hoppa/växa neråt vid interaktion — 'strängt förbjudet'.",
  },
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T11:19:58.630Z': {
    classes: ['CH', 'TH'],
    tolkning: "Modaler bort, rubrikomformulering (Agenda i stället för 'Innehållet dag för dag').",
  },
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T11:31:24.719Z': {
    classes: ['SKB', 'FT'],
    tolkning: 'Chevrons bort på inforutans rader; färgen ska sitta på skrivfältet, inte raden.',
  },
  '79f5603f-8fd0-41ac-9e7f-02ebf61433a3__2026-08-21T11:40:24.322Z': {
    classes: ['FT'],
    tolkning: 'Ångrar en färgändring (rosa bakgrund) och specificerar en annan kontur-lösning.',
  },

  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T17:21:43.497Z': {
    classes: ['KN', 'KS'],
    tolkning:
      'Två rader/block borde bli knappar med länk, som motsvarande element på andra ställen.',
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T18:07:40.196Z': {
    classes: ['BI', 'KS'],
    tolkning:
      "'Exakt som'-mönstret: hover ser skitfult ut, bygg exakt som på eventdetalj-sidans block.",
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T18:14:54.483Z': {
    classes: ['TH', 'FT'],
    tolkning: "Kursnamn bör sitta i en 'pill'; pillens kontur matchar inte pill-textens färg.",
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T18:24:19.718Z': {
    classes: ['KN', 'FT'],
    tolkning: 'Radens hover-beteende och pillens kontur specificeras vidare.',
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T18:31:20.476Z': {
    classes: ['TH'],
    tolkning: 'Beslutar att ta bort pillen helt för renare intryck.',
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T18:37:39.381Z': {
    classes: ['PR'],
    tolkning: 'Variant-beslut (D vinner över A/B/C).',
  },
  '804ba374-f064-443f-a02d-5230694657cd__2026-08-12T19:32:50.552Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av persondetaljsidan.',
  },

  '832fbb83-bd10-4ed9-8f53-0bc7c58842f3__2026-08-14T16:18:15.835Z': {
    classes: ['PR'],
    tolkning: 'Introducerar att reflektioner på variant-d kommer i nästa meddelande.',
  },
  '832fbb83-bd10-4ed9-8f53-0bc7c58842f3__2026-08-14T16:19:28.153Z': {
    classes: ['SKB', 'KG', 'TH', 'KS'],
    tolkning:
      "DET bärande citatet i hela banken: 'När prototyper byggs, varför etableras inte appens grund liksom på varje variant?' — chevron saknas, rubrikplacering ska vara EXAKT samma, och 'checka in-blocket får aldrig växa i höjd, detta är ju en generell regel typ i repot'.",
  },
  '832fbb83-bd10-4ed9-8f53-0bc7c58842f3__2026-08-14T16:59:23.573Z': {
    classes: ['FT', 'KG'],
    tolkning: 'Formmismatch: rektangulär grön ruta mot rad med rundade hörn.',
  },
  '832fbb83-bd10-4ed9-8f53-0bc7c58842f3__2026-08-14T17:04:39.419Z': {
    classes: ['PR'],
    tolkning: 'Stämpling, promovering och paus-planering.',
  },

  '84b83d9d-75cc-438e-a215-9d6add586e00__2026-09-02T08:24:39.311Z': {
    classes: ['AN'],
    tolkning:
      "'Ful' avser här DATAKVALITET (namn i fel skiftläge), inte visuell design — bör inte tolkas som ett UI-fynd.",
  },
  '84b83d9d-75cc-438e-a215-9d6add586e00__2026-09-02T08:28:54.591Z': {
    classes: ['AN'],
    tolkning: "Samma datakvalitetsklass som föregående — 'ful data', inte UI.",
  },
  '84b83d9d-75cc-438e-a215-9d6add586e00__2026-09-02T08:42:29.143Z': {
    classes: ['LK', 'KG', 'KN'],
    tolkning:
      "Toast/notisruta som växer i höjd under utskicket upplevs som 'inte rent eller elegant' — laddkänsla plus geometrisk instabilitet.",
  },
  '84b83d9d-75cc-438e-a215-9d6add586e00__2026-09-02T08:48:57.876Z': {
    classes: ['KN', 'LK'],
    tolkning:
      "Kärncitat: knappen växer i BREDD när den går till laddläge — 'det gillar jag INTE... så gör inte proffs'.",
  },
  '84b83d9d-75cc-438e-a215-9d6add586e00__2026-09-02T10:54:41.491Z': {
    classes: ['PR'],
    tolkning: 'Kontextfönster-varning, delegeringsorder.',
  },

  '87440216-fc19-4eb0-9383-6c325dbe10a9__2026-08-07T11:24:46.335Z': {
    classes: ['KS'],
    tolkning: 'Facit-bilderna är facit — allt ska vara med, inget får tas bort tyst.',
  },
  '87440216-fc19-4eb0-9383-6c325dbe10a9__2026-08-07T13:14:46.385Z': {
    classes: ['KS'],
    tolkning: 'Kräver EXAKT matchning mot den låsta prototypen.',
  },
  '87440216-fc19-4eb0-9383-6c325dbe10a9__2026-08-07T14:27:58.667Z': {
    classes: ['PR'],
    tolkning: 'Överlämningsinstruktion inför paus.',
  },
  '87440216-fc19-4eb0-9383-6c325dbe10a9__2026-08-07T15:21:52.100Z': {
    classes: ['PR'],
    tolkning: 'Jämför byggets hastighet ogynnsamt mot prototyp-fasens tempo.',
  },

  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353__2026-09-03T08:13:28.495Z': {
    classes: ['KA', 'TH'],
    tolkning:
      "Vill byta till husets etablerade meny-komponent i stället för en ny; kräver FAST bredd på 'pill' oavsett siffra.",
  },
  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353__2026-09-03T08:21:40.721Z': {
    classes: ['KG'],
    tolkning: 'Kärncitat: alla rader måste vara EXAKT lika höga, de får inte variera.',
  },
  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353__2026-09-03T09:04:33.614Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av intresserade-konvergensen.',
  },
  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353__2026-09-03T09:11:56.235Z': {
    classes: ['PR'],
    tolkning: 'Sessionsplanering (ny parallell session).',
  },
  '953b9a2c-a3fd-4de3-92b1-cd0bfc300353__2026-09-03T11:10:55.235Z': {
    classes: ['PR'],
    tolkning: 'Refererar till registrerade kort/trådar om arbetssättet självt.',
  },

  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T20:34:26.748Z': {
    classes: ['PR'],
    tolkning: 'Kan inte granska på grund av trasig data i staging.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T21:29:16.833Z': {
    classes: ['BI', 'KN', 'KS'],
    tolkning:
      'Sju punkter i en enda genomgång: layout får inte flytta sig vid scroll (kräver inline-scroll), knappen måste se ut EXAKT som skarpt för att kunna bedömas — matchar Marcus kontextcitat rakt av.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T21:37:35.428Z': {
    classes: ['PR'],
    tolkning: 'Prioriteringsfråga: grillning eller konvergensvarv först.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T22:07:19.691Z': {
    classes: ['PR'],
    tolkning: 'Processfråga om hur ett beslut ska byggas in i prototypen.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T22:54:59.294Z': {
    classes: ['KG'],
    tolkning:
      "Kärncitat: 'Korten ska ju dessutom ha LÅST höjd, vilket det nu även visar sig inte ha.'",
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T23:38:42.657Z': {
    classes: ['FP'],
    tolkning: 'Prototypväxlarens data-knapp fungerar inte — fixtur-regression.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T23:51:28.916Z': {
    classes: ['KG'],
    tolkning: 'Frågar om ett separat val kring låst korthöjd.',
  },
  '9b9d8dbf-8b22-40db-afec-9071c64cad0b__2026-08-15T23:52:17.809Z': {
    classes: ['AN'],
    tolkning: 'Backlog-kortsminting, inte design.',
  },

  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T06:15:45.102Z': {
    classes: ['KN', 'TH', 'KS'],
    tolkning:
      "Kärncitat: en knapp 'försöker vara likadan' som en annan men är 'både lägre och kortare' — falsk konsekvens genomskådad direkt.",
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T06:40:03.244Z': {
    classes: ['PR', 'CH'],
    tolkning:
      'Ett omdesignat block har blivit otydligare än originalet — vill återgå till tidigare tydlighet.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T07:04:45.056Z': {
    classes: ['PR'],
    tolkning:
      "Ifrågasätter kvalitetsbedömningen 'redo för Marcus ögon' som uppenbarligen inte höll.",
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T07:11:48.991Z': {
    classes: ['TH', 'CH'],
    tolkning: 'Överflödig rubrik bort, otydlig underrubrik-text ifrågasatt.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T07:46:46.693Z': {
    classes: ['TH', 'SKB', 'LK'],
    tolkning:
      'Typsnittsvikt ska inte växla (bara färg), listan ska vara lika bred som menybaren, respons ska ha en medveten fördröjning i stället för instant.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T07:50:32.432Z': {
    classes: ['AN'],
    tolkning: 'Godkännande med generellt kvalitetskrav.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:01:53.492Z': {
    classes: ['FT'],
    tolkning: 'Ful ikon, separatorlinje ifrågasatt.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:13:17.925Z': {
    classes: ['CH', 'KN'],
    tolkning: 'Copy-byten på knapp och rubrik; dålig direktöversättning identifierad.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:29:56.340Z': {
    classes: ['KG', 'FT'],
    tolkning:
      'Föreslår kortlista i stället för radlista; färgkrock mellan markering och notisruta.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:33:33.344Z': {
    classes: ['KN', 'FT'],
    tolkning: 'Bekräftar att knappfärgen redan är korrekt — inget att ändra.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:35:45.122Z': {
    classes: ['BI'],
    tolkning: 'Funktionell brist (kan inte ta bort en rad), inte renodlad designfråga.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:41:39.369Z': {
    classes: ['FT', 'BI'],
    tolkning: 'Bakgrundsfärg bort, inline-scroll efterlyst för växande lista.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T08:59:46.709Z': {
    classes: ['TH', 'FT'],
    tolkning: "Rubrik bort, färginkonsekvens mellan två 'pills' i samma yta.",
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T09:05:26.279Z': {
    classes: ['KN'],
    tolkning: 'Knappens sida (höger i stället för vänster).',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T09:20:24.968Z': {
    classes: ['KN'],
    tolkning: 'Knappens exakta position relativt rubrikrad och sökruta.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T09:41:42.943Z': {
    classes: ['KG', 'KN'],
    tolkning: 'Vertikal centrering av knapp på kort, luftfördelning runt kortet.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T09:44:49.270Z': {
    classes: ['KN'],
    tolkning: 'Saknad spara-knapp, en knapp bör bli avbryt-knapp, text bort.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:07:12.342Z': {
    classes: ['KN', 'KG'],
    tolkning: 'Kärncitat: pris och åtgärdsknapp borde sitta centrerade på raden, höjdmässigt.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:08:59.466Z': {
    classes: ['FT'],
    tolkning: 'Oönskad orange kontur bort.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:12:26.496Z': {
    classes: ['KN'],
    tolkning: 'Spara-knappens synlighet, text bort.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:17:19.996Z': {
    classes: ['FT', 'BI'],
    tolkning: 'Kontur bort, hover-färg på fel bakgrund.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:18:44.400Z': {
    classes: ['BI', 'KG'],
    tolkning: 'Timing-fördröjning när ett kort ska försvinna ur listan efter registrering.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:20:09.434Z': {
    classes: ['FT', 'BI'],
    tolkning: 'Samma vit-hover-på-fel-bakgrund-bugg på en annan knapp.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T10:26:05.936Z': {
    classes: ['TH', 'CH'],
    tolkning: 'Rubrikbyte för språklig konsekvens.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T11:03:41.238Z': {
    classes: ['FT'],
    tolkning: 'Fult ikonval på en genväg, önskar annan ikon.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T11:19:10.757Z': {
    classes: ['KN', 'KA'],
    tolkning: 'Ny knapp för förhandsgranskning ska återanvända befintlig bilagemetod.',
  },
  'aad9eb70-3032-4a9b-8bbb-ba95963cd0a8__2026-09-01T11:26:55.011Z': {
    classes: ['SKB'],
    tolkning: 'Frågar om angränsande komponenters bredd ingår i samma promovering.',
  },

  'c91a05a2-ea83-41d8-a38c-1e800b227992__2026-08-07T17:56:21.901Z': {
    classes: ['KN', 'PR'],
    tolkning:
      "GRUNDCITATET bakom ADR-102: 'INGEN prototyp raderas förens jag godkänt att det skarpa bygget är EXAKT som prototypen.'",
  },
  'c91a05a2-ea83-41d8-a38c-1e800b227992__2026-08-07T18:05:42.400Z': {
    classes: ['PR'],
    tolkning: 'Ifrågasätter en motsägelse i vad Code rapporterat om facit-bilden.',
  },
  'c91a05a2-ea83-41d8-a38c-1e800b227992__2026-08-07T18:12:03.729Z': {
    classes: ['PR', 'KS'],
    tolkning:
      "DET ANDRA grundcitatet: 'Prototypen ÄR facit... Prototypen och skarpa version ska vara IDENTISKA det är ju för tusan hela poängen med att bygga en prototyp.'",
  },
  'c91a05a2-ea83-41d8-a38c-1e800b227992__2026-08-07T19:07:36.269Z': {
    classes: ['TH'],
    tolkning: 'Detaljfråga om en pill-komponents datumfält.',
  },

  'd4cf458c-7581-4837-a7f2-d5775a00b4c0__2026-08-13T17:55:36.044Z': {
    classes: ['PR'],
    tolkning: 'Frågar om iterationsordningen (variant → facit → promovering).',
  },
  'd4cf458c-7581-4837-a7f2-d5775a00b4c0__2026-08-13T18:08:50.473Z': {
    classes: ['PR'],
    tolkning:
      "'Det är under all kritik alltså, SÅ DÅLIGA!!' — samma mönsterklagomål om förstautkast som återkommer genomgående.",
  },
  'd4cf458c-7581-4837-a7f2-d5775a00b4c0__2026-08-13T19:10:17.519Z': {
    classes: ['PR'],
    tolkning: 'Enkel platsfråga.',
  },
  'd4cf458c-7581-4837-a7f2-d5775a00b4c0__2026-08-13T19:19:53.329Z': {
    classes: ['PR'],
    tolkning: 'Kräver ytterligare en iterationsrunda innan godkänd kvalitet nås.',
  },

  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T17:01:33.619Z': {
    classes: ['PR'],
    tolkning: 'Statusfråga vid återupptagande.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T17:31:43.931Z': {
    classes: ['KN', 'CH', 'KS'],
    tolkning:
      "Hjälptext bort, och listan över publiken 'måste vara SNYGG och proffsig som andra listor på personer i appen är ju' — explicit syskonvy-konsekvens.",
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T17:56:06.120Z': {
    classes: ['AN'],
    tolkning: "Generell kvalitetsdom ('jätteful') utan konkret åtgärdspunkt ännu.",
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T19:59:25.306Z': {
    classes: ['CH'],
    tolkning: 'Otydlig/dåligt formulerad text i en ruta.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T20:46:43.876Z': {
    classes: ['TH', 'CH'],
    tolkning: 'Toggle för fet/hög, hjälptexter bort, rubriktext bort.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T20:57:27.383Z': {
    classes: ['AN'],
    tolkning: "Vill inte 'fucka upp' designen, ber om eftertanke.",
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T21:16:34.207Z': {
    classes: ['KA'],
    tolkning: 'Byt UI-mönster till checkboxar, samma som redan används i appen.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T21:29:09.801Z': {
    classes: ['TH', 'CH'],
    tolkning:
      'Förvirrande rubrik efter knapptryck; efterlyser eget researchpass för branschmönster.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T21:49:27.950Z': {
    classes: ['AN'],
    tolkning: 'Generell kvalitetsuppmaning.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:16:44.245Z': {
    classes: ['KN'],
    tolkning: 'Två knappar ska vara exakt likadana (bredd och höjd).',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:24:42.314Z': {
    classes: ['KN', 'CH'],
    tolkning: 'Knapparna fortfarande inte lika breda; text bort.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:30:29.187Z': {
    classes: ['KN', 'TH'],
    tolkning: 'Knapptexternas startposition inkonsekvent trots lika bredd.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:36:54.255Z': {
    classes: ['FT'],
    tolkning: 'Färg/mutning-inkonsekvens mellan rader i samma block.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:41:18.820Z': {
    classes: ['KA', 'CH'],
    tolkning: 'Lista exakt som en annan redan byggd sektion; text bort.',
  },
  'e4203fd3-b7e2-4882-bcca-7936976c8b84__2026-08-16T22:45:47.571Z': {
    classes: ['KN', 'TH', 'FT'],
    tolkning:
      'Knapp bort, rubrik behöver särskiljas från annat innehåll som just nu delar typsnitt och färg.',
  },

  'e9b60a0a-1aad-473f-9b39-be44acadd706__2026-08-17T06:47:57.232Z': {
    classes: ['AN'],
    tolkning:
      "Oro för att svagare agenter fuskar/'ful-löser' — kvalitetsprocess, inte visuell design.",
  },
  'e9b60a0a-1aad-473f-9b39-be44acadd706__2026-08-17T09:06:42.438Z': {
    classes: ['PR'],
    tolkning: 'Ber om guidning genom Q&A-vandringen.',
  },
  'e9b60a0a-1aad-473f-9b39-be44acadd706__2026-08-17T09:32:17.715Z': {
    classes: ['FP'],
    tolkning:
      "Kärncitat: 'Prototyp. Inget sparas, inget skickas'-texten kvar på FLERA sidor efter påstådd färdigbyggnad — 'TA BORT!!' upprepat.",
  },
  'e9b60a0a-1aad-473f-9b39-be44acadd706__2026-08-17T10:08:44.700Z': {
    classes: ['AN'],
    tolkning: 'Backlog-registrering, inte design.',
  },
  'e9b60a0a-1aad-473f-9b39-be44acadd706__2026-08-17T12:09:01.295Z': {
    classes: ['PR'],
    tolkning: 'Ifrågasätter vad som egentligen godkändes vid en tidigare stämpling.',
  },

  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T21:32:09.667Z': {
    classes: ['PR'],
    tolkning: 'Scope-beslut (full omfattning).',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T21:43:04.081Z': {
    classes: ['SKB', 'TH', 'KG'],
    tolkning:
      "Kärncitat: bevakningsrader 'får aldrig växa i höjd, aldrig radbrytas' — hela texten måste rymmas på en rad.",
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T21:58:43.019Z': {
    classes: ['PR'],
    tolkning: 'Ser ingen skillnad mellan varianter — feedback ej implementerad.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T22:08:05.953Z': {
    classes: ['PR'],
    tolkning: 'Upprepar att varianterna är oförändrade sedan förra rundan.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T22:15:29.319Z': {
    classes: ['PR'],
    tolkning: 'Bekräftar att en prototyp ska bli underlag för promovering.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T22:18:57.004Z': {
    classes: ['AN'],
    tolkning: 'Generellt kvalitetskrav, be om själviteration innan visning.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T22:27:13.020Z': {
    classes: ['SKB'],
    tolkning: 'Frågar om sidkromet ska gälla globalt.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-22T22:33:29.944Z': {
    classes: ['SKB'],
    tolkning: 'Beslutar globalt sidkrom med undantag om något inte funkar.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-23T09:04:53.919Z': {
    classes: ['SKB', 'KS', 'TH'],
    tolkning:
      'Chevron ska centreras, siffer-pill bort, och en annan sidas exakta layout (position/typsnitt) ska kopieras rakt av.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-23T09:15:28.469Z': {
    classes: ['KA', 'KS'],
    tolkning:
      'En komponent kan brytas ut och återanvändas UTAN ny facit-stämpling så länge den ser exakt likadan ut.',
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-23T09:43:12.658Z': {
    classes: ['TH'],
    tolkning: "Tid i en vit 'pill' för snyggare intryck.",
  },
  'fd52329f-7c5a-4199-8f77-86ce453afdec__2026-08-23T11:31:02.206Z': {
    classes: ['CH'],
    tolkning: 'Copy-byte och filtreringsmodell-ändring.',
  },

  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T06:17:25.253Z': {
    classes: ['PR'],
    tolkning: 'Repohygien, inte design.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T09:35:22.901Z': {
    classes: ['LK', 'KS'],
    tolkning:
      'Laddningsskärmen blinkar till trots tidigare fix; i övrigt matchar hem-vyn prototypen.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T09:37:36.097Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av hem-konvergensen.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T10:05:03.269Z': {
    classes: ['LK'],
    tolkning:
      'Kärncitat: logon och loadingbaren var inte centrerade — en regression mot ett tidigare uppnått tillstånd.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T10:12:39.681Z': {
    classes: ['KS'],
    tolkning: 'Granskningsytan matchar prototypen — redo för prod.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T10:17:56.602Z': {
    classes: ['LK', 'PR'],
    tolkning:
      'Vill att blink- och centreringsbuggarna faktiskt löses, inte bara registreras som kort.',
  },
  'ffca1ae7-b918-40ec-b1cc-c24d0736c793__2026-08-17T10:34:01.758Z': {
    classes: ['PR'],
    tolkning: 'Facit-godkännande av svep-konvergensen.',
  },
};
