import { useNavigate } from '@tanstack/react-router';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, MessageBox, Select, SelectItem } from '@/components/primitives';
import {
  analyseraFil,
  beraknaSignatur,
  type Filanalys,
  type Kolumnmappning,
  mappningsFel,
  parsaTransaktioner,
  TRANSAKTIONSFALT,
  type Transaktionsfalt,
} from './bankimport-parser';
import { byggImportrader } from './bankimport-rader';
import { importloggKarta, lasMappningar, sparaMappning } from './bankmappning-minne';
import { sparaImport, tillImportminne } from './importminne';
import type { InkorgsRad } from './inkorg-harledningar';

/**
 * [TASK-346.10 AC #1, TASK-402.4 AC #3, PRD TASK-402 § Kontoutdraget]
 * KONTOUTDRAGS-IMPORTEN: filen, kolumnerna, matchningen — och sedan
 * bekräftelsesteget.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SOM RÖRDES I TASK-402.4, OCH VAD SOM INTE GJORDE DET
 * ═══════════════════════════════════════════════════════════════════════════
 * PRD § Kontoutdraget: "Filläsning och kolumnmappning står kvar i inkorgen
 * under 'Importera kontoutdrag'; importens sista steg (bekräftelselistan)
 * flyttar in i steget."
 *
 * ORÖRT: filväljaren, mappningsdialogen, signaturen, det sparade
 * bankminnet, matchningen (`byggImportrader` över `bankimport-matchning.ts`)
 * och parsern (`bankimport-parser.ts`, kortets AC #3 uttryckligen: "parsern
 * rörs inte").
 *
 * RIVET: bekräftelselistan. Raderna, kryssrutorna, kandidat-rullgardinen,
 * sökfältet för omatchade, den hopfällda "Redan registrerade"-högen,
 * summeringsraden, `bekrafta()`-körningen och dess utfallstexter. Allt det
 * bor nu i bekräftelsesteget, inom variant C:s form, med de fyra
 * radtillstånden som märke på kortet.
 *
 * FÖLJDEN FÖR REGISTRERINGEN: komponenten skriver inga inbetalningar längre.
 * `useRegistreraInbetalning` är borta härifrån, och därmed också
 * `onRegistrerade`-propen — importerade rader hamnar i STEGETS "Registrerat
 * nu"-block, inte i inkorgens. Det är en yta mindre som kan säga något annat
 * än den andra.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖVERLÄMNINGEN — MINNET FÖRST, NAVIGERINGEN SEDAN
 * ═══════════════════════════════════════════════════════════════════════════
 * `visaRader` skriver importminnet (`importminne.ts`) och navigerar först när
 * skrivningen lyckats. Ordningen är hela poängen: `sessionStorage` kan vara
 * blockerad (privat läge, en policy, en full kvot), och en navigering till
 * ett steg utan minne hade lämnat Lotta på en sida som säger "importen kunde
 * inte läsas" utan att hon förstår varför. Misslyckas skrivningen stannar hon
 * kvar här med ett felmeddelande som säger vad som hände och vad hon kan göra.
 *
 * MATCHNINGEN SKER HÄR, INTE I STEGET. Kortet säger "när matchningen är gjord
 * öppnas bekräftelsesteget", och sökrymden är inkorgens egna rader (`oppna`)
 * som redan är hämtade och härledda. Att flytta matchningen till steget hade
 * tvingat fram en andra härledning av samma mängd, för ingen vinst.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INGEN NY YTA, OCH INGEN NY EDGE FUNCTION (oförändrat)
 * ═══════════════════════════════════════════════════════════════════════════
 * Komponenten renderas INUTI `BetalningsInkorg`, så inkorgens route-flagga
 * (`betalningarPa()` i `routes/_authenticated/mer/betalningar.tsx`) gäller
 * utan ny kod. Bekräftelsesteget bär SAMMA flagga i sin egen `beforeLoad`, så
 * hoppet dit kan inte leda till en yta som skulle varit avstängd.
 *
 * `registrera-inbetalning` tar emot `bankreferens` sedan TASK-346.4 och
 * svarar 409 `dubblett_bankreferens` på ett brott mot det partiella unika
 * indexet. Ingen EF ändrades i TASK-346.10 och ingen ändras här — steget
 * skickar samma fält på samma väg (`useBekraftelsesteg.ts` § DUBBLETTNYCKELN).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DUBBLETTERNA - TVÅ VÄGAR, EN SANNING (oförändrat, men de bor i steget nu)
 * ═══════════════════════════════════════════════════════════════════════════
 *   FÖRE bekräftelsen: den lokala importloggen (`bankmappning-minne.ts`)
 *   märker rader denna webbläsare redan tagit. Märkningen görs HÄR, i
 *   `byggImportrader`, och följer med i minnet som `tidigareImporterad` —
 *   steget klassar raden som DUBBLETT och visar den låst, utan kryss.
 *
 *   UNDER bekräftelsen: servern avvisar med 409 om referensen finns i
 *   databasen. Det är den enda källa som vet sanningen om alla enheter och
 *   alla användare, och den gäller även när loggen är tom eller rensad.
 *
 * Loggen avgör ingenting. Den räknar och märker.
 */

type Props = {
  /** Inkorgens öppna betalningar - matchningens sökrymd. */
  oppna: readonly InkorgsRad[];
  onStang: () => void;
};

type Steg = 'val' | 'mappning';

const FALTETIKETT: Record<Transaktionsfalt, string> = {
  datum: 'Betalningsdatum',
  belopp: 'Belopp',
  namn: 'Namn',
  telefon: 'Telefonnummer',
  meddelande: 'Meddelande',
  bankreferens: 'Bankens referens',
};

/** Ett tomt utkast, för en fil vi inte känner igen alls. Inget är förvalt. */
function tomMappning(analys: Filanalys): Kolumnmappning {
  return {
    bank: '',
    avgransare: analys.avgransare,
    harRubrikrad: analys.harRubrikrad,
    radfilter: [],
    kolumner: {
      datum: null,
      belopp: null,
      namn: null,
      telefon: null,
      meddelande: null,
      bankreferens: null,
    },
    signatur: null,
  };
}

/**
 * Dialogens startläge. `analys.bastaGissning` är ALDRIG tillämpad
 * automatiskt (se `Filanalys.bastaGissning`) - bara ett förslag Lotta ser,
 * kan rätta, och måste EXPLICIT bekräfta genom att trycka "Läs filen"
 * (`bekraftaMappning`). Signaturen nollställs: den beräknas på nytt mot
 * DENNA fil när hon bekräftar, aldrig återanvänds från gissningens källa.
 */
function utkastFor(analys: Filanalys): Kolumnmappning {
  const gissning = analys.bastaGissning;
  if (gissning === null) return tomMappning(analys);
  return {
    ...gissning,
    avgransare: analys.avgransare,
    harRubrikrad: analys.harRubrikrad,
    signatur: null,
  };
}

export function SwishImport({ oppna, onStang }: Props) {
  const [steg, setSteg] = useState<Steg>('val');
  const [filnamn, setFilnamn] = useState('');
  const [innehall, setInnehall] = useState('');
  const [analys, setAnalys] = useState<Filanalys | null>(null);
  const [utkast, setUtkast] = useState<Kolumnmappning | null>(null);
  const [lasfel, setLasfel] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const mappningPanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /**
   * FLYTTAR FOKUS DETERMINISTISKT vid stegbyte 'val' → 'mappning'.
   *
   * Knappen "Ladda upp fil" (steg 'val') AVMONTERAS när `laddaFil` byter
   * steg, och utan detta faller fokus till `document.body` - en
   * tangentbords- eller skärmläsaranvändare tappar sin plats mitt i ett
   * pengaflöde. Samma felklass, samma fix-mönster som
   * `BetalningsInkorg.tsx` § `stangImport` (`importKnappRef.current?.focus()`)
   * bär åt andra hållet.
   *
   * `useEffect`, inte ett anrop direkt efter `setSteg(...)`: React har inte
   * målat det NYA stegets DOM förrän efter renderingen, så en synkron
   * `.focus()`-anrop omedelbart efter `setSteg` hade träffat FÖREGÅENDE
   * stegs träd.
   *
   * [TASK-402.4] Det tredje steget ('lista') är rivet, och därmed också dess
   * fokusmål. Vägen dit är nu en NAVIGERING, och routern flyttar fokus på sitt
   * eget sätt när sidan byts.
   */
  useEffect(() => {
    if (steg === 'mappning') mappningPanelRef.current?.focus();
  }, [steg]);

  /**
   * `value = ''` FÖRE klicket är inte kosmetik här - det är AC #3:s bevis.
   * Utan nollställningen fyrar `change` inte när SAMMA fil väljs två gånger i
   * rad, och "omimport av samma fil skapar 0 nya" hade varit omöjligt att
   * visa i webbläsaren. Samma form `DokumentYta.tsx` § `oppnaFilvaljare` bär,
   * av ett besläktat skäl (Lotta väljer om en fil hon råkat välja fel).
   */
  function valjFil() {
    const input = inputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function laddaFil(fil: File) {
    setLasfel(null);
    setFilnamn(fil.name);

    let text: string;
    try {
      text = await fil.text();
    } catch {
      setLasfel('Filen gick inte att läsa. Prova att ladda ner rapporten på nytt.');
      return;
    }

    setInnehall(text);
    const nyAnalys = analyseraFil(text, lasMappningar());
    setAnalys(nyAnalys);

    if (nyAnalys.igenkand) {
      visaRader(text, nyAnalys.igenkand, fil.name);
      return;
    }
    // AC #1: okänt format (noll ELLER FLERA strukturellt matchande
    // kandidater) ger mappningsdialog, ALDRIG en tyst gissning - se
    // `Filanalys.igenkand`. `utkastFor` förifyller med bästa gissning, men
    // Lotta bekräftar alltid explicit innan något sparas eller läses.
    setUtkast(utkastFor(nyAnalys));
    setSteg('mappning');
  }

  /**
   * [TASK-402.4] ÖVERLÄMNINGEN till bekräftelsesteget.
   *
   * Fyra led i en fast ordning: parsa filen, matcha raderna mot de öppna
   * betalningarna, skriv minnet, navigera. Bara det sista ledet är nytt —
   * de tre första är exakt vad den rivna listan gjorde innan den ritade sig
   * själv.
   *
   * `filnamn` PASSERAS SOM ARGUMENT och läses inte ur state: `setFilnamn` i
   * `laddaFil` har inte hunnit committas när den igenkända filen går rakt
   * igenom hit, och minnet hade då bokfört föregående fils namn (eller en tom
   * sträng vid första importen). En mätt fälla, inte en teoretisk.
   */
  function visaRader(text: string, vald: Kolumnmappning, namn: string) {
    const parsat = parsaTransaktioner(text, vald);
    const rader = byggImportrader(parsat, oppna, importloggKarta());
    const minne = tillImportminne(parsat, rader, {
      filnamn: namn,
      bank: vald.bank,
      skapad: new Date().toISOString(),
    });
    if (!sparaImport(minne)) {
      setLasfel(
        'Kontoutdraget kunde inte lämnas över till bekräftelsesteget. Webbläsaren tillåter inte lagring i det här läget. Prova i ett vanligt fönster.',
      );
      return;
    }
    void navigate({ to: '/mer/betalningar/registrera', search: { kalla: 'import' } });
  }

  /**
   * Bekräftar mappningen. Signaturen beräknas HÄR, mot DEN HÄR FILEN
   * (`analys`) - aldrig mot en tidigare gissnings ursprungsfil - så att en
   * framtida import bara matchar automatiskt när formen faktiskt är
   * densamma (`Strukturensignatur`, fix-runda 2).
   */
  function bekraftaMappning() {
    if (!utkast || !analys || mappningsFel(utkast) !== null) return;
    const signatur = beraknaSignatur(
      analys.rader,
      analys.avgransare,
      analys.harRubrikrad,
      analys.kolumner,
    );
    const attSpara: Kolumnmappning = { ...utkast, signatur };
    sparaMappning(attSpara);
    visaRader(innehall, attSpara, filnamn);
  }

  const utkastfel = utkast ? mappningsFel(utkast) : null;

  return (
    <section
      /* TERMEN ÄR "KONTOUTDRAG", INTE "BANKRAPPORT" (Marcus dom 2026-09-01):
         *"'Importera kontoutdrag' är mer rätt namn på knappen … 'bankrapport'
         är typiskt dålig svensk översättning av 'bank statement'"*. Han har
         rätt i sak: "bank statement" heter kontoutdrag på svenska, och
         "bankrapport" är inget ord Lotta möter i sin internetbank
         (Gunilla-principen). `aria-label` räknas som UI-text och byts med
         resten — den ÄR ytans tillgängliga namn. Kodidentifierare och filnamn
         (`SwishImport`, `bankimport-*`) är orörda: de är inte text Lotta
         läser. */
      aria-label="Importera kontoutdrag"
      className="mx-4 flex flex-col gap-3 rounded border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">Importera kontoutdrag</h2>
        <Button intent="ghost" size="sm" onPress={onStang}>
          Stäng
        </Button>
      </div>

      {/* Dold input plus en knapp som klickar den. `hidden` ger display:none,
          alltså varken synlig, tabbstopp eller nåbar för skärmläsaren -
          precis den form react-arias FileTrigger själv renderar. */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        hidden
        onChange={(event) => {
          const fil = event.target.files?.[0];
          if (fil) void laddaFil(fil);
        }}
      />

      {steg === 'val' && (
        <div className="flex flex-col gap-2">
          {/* "PER BANK" ÄR STRUKET (Marcus: *"Ta bort 'per bank', de har bara
              en bank"*). Kvalificeringen beskrev en generalitet koden bär
              (`bankmappning-minne.ts` sparar faktiskt mappningen per banknamn)
              men som Lotta aldrig möter — hon har en bank, och "per bank" fick
              en engångsuppgift att låta som en återkommande.

              SWISH-HÄNVISNINGEN ÄR KVAR, omskriven till den nya termen: utan
              den vet Lotta inte VILKEN av bankens filer som avses. Vald
              formulering: "Ladda ner kontoutdraget för Swish från din bank och
              välj filen här." — kontoutdrag som huvudord, Swish som
              bestämning, alltså samma sak hon letar efter i banken. */}
          <p className="text-small text-text-muted">
            Ladda ner kontoutdraget för Swish från din bank och välj filen här. Kolumnerna behöver
            bara pekas ut en gång.
          </p>
          <div>
            <Button intent="primary" emphasis="outline" onPress={valjFil}>
              <Upload aria-hidden size={16} className="shrink-0" />
              {/* *"Byt ut 'Välj rapportfil' till 'Ladda upp fil'"* — och
                  "rapportfil" försvinner därmed ur UI:t helt, i samma andetag
                  som "bankrapport". Ikonen (`Upload`) är oförändrad. */}
              Ladda upp fil
            </Button>
          </div>
        </div>
      )}

      {lasfel !== null && (
        <MessageBox intent="error" title="Filen kunde inte läsas">
          {lasfel}
        </MessageBox>
      )}

      {steg === 'mappning' && analys && utkast && (
        // `tabIndex={-1}` + `ref`: fokusmål för `useEffect`-svepet ovan. Se
        // dess docblock för VARFÖR (a11y-golvet, tidigare oåtgärdat).
        <div ref={mappningPanelRef} tabIndex={-1} className="flex flex-col gap-3 outline-none">
          <MessageBox intent="info" title={`Kontrollera mappningen: ${filnamn}`}>
            {analys.bastaGissning === null
              ? 'Appen känner inte igen filen. Peka ut vilken kolumn som är vad, en gång, så sparas det till nästa import.'
              : 'Appen är inte säker på vilken sparad mappning som gäller. Kolumnerna nedan är en GISSNING, förifylld men aldrig tillämpad automatiskt. Kontrollera dem, rätta det som skiljer sig, och bekräfta.'}
          </MessageBox>

          <Input
            label="Vilken bank kommer rapporten från?"
            value={utkast.bank}
            onChange={(varde) => setUtkast({ ...utkast, bank: varde })}
            placeholder="Till exempel Nordea"
            // `mappningsFel` returnerar EN sträng, antingen om banknamnet
            // eller om en obligatorisk kolumn - aldrig båda. Fältet visar
            // felet bara när det FAKTISKT gäller banknamnet; ett fel om en
            // saknad kolumn visas i stället i kolumnlistans egen fotnot
            // nedan (samma utkastfel, olika plats beroende på VAD det gäller).
            isInvalid={utkastfel !== null && utkast.bank.trim() === ''}
            errorMessage={utkast.bank.trim() === '' ? (utkastfel ?? undefined) : undefined}
            className="max-w-80"
          />

          <ul className="flex flex-col gap-2">
            {TRANSAKTIONSFALT.map((falt) => (
              <li key={falt} className="flex flex-wrap items-center gap-2">
                <Select
                  label={FALTETIKETT[falt]}
                  selectedKey={
                    utkast.kolumner[falt] === null ? 'ingen' : String(utkast.kolumner[falt])
                  }
                  onSelectionChange={(nyckel) =>
                    setUtkast({
                      ...utkast,
                      kolumner: {
                        ...utkast.kolumner,
                        [falt]: nyckel === 'ingen' ? null : Number(nyckel),
                      },
                    })
                  }
                  className="min-w-64"
                >
                  <SelectItem id="ingen">Finns inte i filen</SelectItem>
                  {analys.kolumner.map((kolumn) => (
                    <SelectItem key={kolumn.index} id={String(kolumn.index)}>
                      {kolumnEtikett(kolumn.index, kolumn.rubrik, kolumn.exempel)}
                    </SelectItem>
                  ))}
                </Select>
              </li>
            ))}
          </ul>

          {/* Felmeddelandet visas nu av `Input`s egen `FieldError` (kopplad
              via `aria-describedby`/`aria-invalid`, ADR-046) - se fältet
              ovan. Ett fel som gäller ENDAST kolumnvalen (bankfältet är
              ifyllt men ingen kolumn pekar ut beloppet) syns bara här. */}
          {utkastfel !== null && utkast.bank.trim() !== '' && (
            <p role="status" className="text-(color:--mm-input-error-text) text-small">
              {utkastfel}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button isDisabled={utkastfel !== null} onPress={bekraftaMappning}>
              Läs filen
            </Button>
            <Button intent="ghost" onPress={onStang}>
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Kolumnens etikett i dialogen: plats, rubrik och vad den faktiskt bär. */
function kolumnEtikett(index: number, rubrik: string | null, exempel: string[]): string {
  const namn = rubrik !== null && rubrik !== '' ? rubrik : `Kolumn ${index + 1}`;
  const prov = exempel.slice(0, 2).join(', ');
  return prov === '' ? namn : `${namn} (${prov})`;
}
