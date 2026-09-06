import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { Bekraftelsesteget } from '@/components/betalningar/Bekraftelsesteget';
import { BekraftelsestegPrototype } from '@/components/betalningar/prototype/BekraftelsestegPrototype';
import { betalningarPa } from '@/lib/funktionsflaggor';

/**
 * BEKRÄFTELSESTEGET för inbetalningar — "Bulkregistrering".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FLIPPEN ÄR GJORD (TASK-402.3, ADR-103 B2 steg 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * Routen renderar variant C:s form OVILLKORLIGT. `variant` har förlorat sin
 * default `'a'`, och `data` sin default `'fixtur'` — utan parametrar är detta
 * den SKARPA ytan: urvalet ur `ids`, raderna ur `useOppnaBetalningar`,
 * registreringen via inkorgens `registrera-inbetalning` en post per rad.
 *
 * STALE-URL-REGELN (`TASK-374.2` AC #4-mönstret): en gammal `?variant=a` i
 * någons historik eller bokmärke renderar IDENTISKT med ingen parameter alls
 * i produktion, eftersom hela prototyp-grenen står bakom
 * `import.meta.env.DEV`. Ingen kan hamna på en riven variant genom en URL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VAD SOM LEVER KVAR BAKOM `DEV`, OCH VARFÖR DET INTE ÄR SLARV
 * ═══════════════════════════════════════════════════════════════════════════
 * `ADR-102` B3 är hård: INGENTING rivs före Marcus godkännande. Manifestet
 * (`tasks/sessions/bilagor/s121-bekraftelsesteget-konvergens/facit.json`) bär
 * fortfarande `"godkand": null`, och `TASK-402.3` AC #10 (granskningen mot
 * facit-bilderna på desktop och iPad 820) är ett Marcus-moment som ännu inte
 * skett. Varianterna A/B, växlaren och simuleringslagret står därför kvar —
 * nåbara ENBART i utvecklingsläge, och rivs i `TASK-402.6` tillsammans med de
 * fem markörerna i `.facit-policy.conf`.
 *
 * DEV-grenen är också granskningsytan: `?data=fixtur` ger Marcus "Lottas
 * morgon" (tio rader, tre event, Gunnar fallerar första gången) utan att röra
 * staging, vilket är precis vad facit-bilderna togs ur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN-NESTAD FRÅN INKORGEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Filnamnet bär trailing underscore (`betalningar_.registrera`) så routen
 * ligger på `/mer/betalningar/registrera` men INTE nästlas under
 * `betalningar.tsx` (som renderar inkorgen utan `<Outlet/>`). Steget är en
 * egen fokuserad yta (PRD berättelse 5), inte en panel i inkorgen.
 *
 * SAMMA MILJÖGRIND SOM INKORGEN: `betalningarPa()` gatar routen; av i prod
 * ⇒ redirect till `/mer`, exakt som `betalningar.tsx`.
 */
const searchSchema = z.object({
  /**
   * PROTOTYP-VÄXELN, DEV-ONLY. Ingen default längre — `undefined` betyder den
   * promoverade ytan. Enum-formen är oförändrad med avsikt: den är en av de
   * fem markörer `.facit-policy.conf` § `FACIT_PROTO_MARKORER` vaktar tills
   * substratet rivs i `TASK-402.6`.
   */
  variant: z.enum(['a', 'b', 'c']).optional().catch(undefined),
  /** DEV-ONLY datakälla för granskningen. `undefined` = skarpa vägar. */
  data: z.enum(['fixtur', 'staging']).optional().catch(undefined),
  /** Matarens urval: anmälnings-record-ID:n, kommaseparerade. */
  ids: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/mer/betalningar_/registrera')({
  staticData: { title: 'Bulkregistrering' },
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (!betalningarPa()) throw redirect({ to: '/mer' });
  },
  component: BekraftelsestegSida,
});

function BekraftelsestegSida() {
  const { variant, data, ids } = Route.useSearch();
  /* DEV-GRENEN, RIVS I TASK-402.6. Villkoret är AVSIKTLIGT snävt: bara en
     URL som uttryckligen ber om en divergens-variant ELLER om en prototyp-
     datakälla når prototypen. `?variant=c` ensamt går till den promoverade
     ytan — den ÄR variant C, och en granskare som skriver den nyckeln ska se
     det som landar, inte simuleringen. */
  if (import.meta.env.DEV && (variant === 'a' || variant === 'b' || data !== undefined)) {
    return <BekraftelsestegPrototype variant={variant ?? 'c'} data={data ?? 'fixtur'} ids={ids} />;
  }
  return <Bekraftelsesteget ids={ids} />;
}
