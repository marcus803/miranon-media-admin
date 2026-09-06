import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDataSource } from '@/data/useDataSource';
import type { Attachment } from '@/domain/models/Attachment';
import { queryKeys } from '@/queries/keys';

/**
 * Eventets bilagor (`get-event-attachments`, TASK-147.5) — EN hemvist för
 * frågan, delad av `DokumentYta.tsx` (listan) och `GenereringsVy.tsx`
 * (knappetiketten "Skapa om …").
 *
 * VARFÖR HOOKEN FÖDDES HÄR (TASK-340.2, PRD `TASK-340` § E): genereringsvyn
 * måste veta OM en Event-mallad rad redan finns för (event × mall), annars
 * kan knappen inte säga "Skapa om <dokumentnamnet>" när Lotta är på väg att
 * skriva över den befintliga bilagan. Frågan var redan ställd — inline i
 * `DokumentYta.tsx` — och genereringsvyn nås ALLTID därifrån, så svaret
 * ligger redan i React Query-cachen under SAMMA nyckel
 * (`queryKeys.attachments.byEvent`). Att skriva en andra inline-`useQuery`
 * med samma nyckel hade fungerat men gett två ställen att hålla i synk;
 * att hämta via en ny nyckel hade betalat ett extra nätverksanrop för data
 * appen redan har.
 *
 * NYCKELN ÄR DELAD MED INVALIDERINGEN, och det är hela poängen:
 * `useGenereraEventBilaga`/`useSkapaOmEventBilaga`/`useUploadAttachment`
 * invaliderar `attachments.byEvent(eventId)` när de lyckas, så BÅDA ytorna
 * uppdateras av samma skrivning utan att någon av dem känner till den
 * andra.
 *
 * `eventId: null` (räckviddsläget i `DokumentYta`, ADR-118 beslut 5) håller
 * frågan avstängd — `enabled: false` — i stället för att skicka en tom
 * sträng till EF:en. `queryKey` bär ändå `''` i det läget: nyckeln måste
 * vara serialiserbar och stabil, och en avstängd query hämtar aldrig något
 * att förväxla.
 */
export function useEventAttachments(eventId: string | null) {
  const dataSource = useDataSource();

  return useQuery<Attachment[]>({
    queryKey: queryKeys.attachments.byEvent(eventId ?? ''),
    queryFn: () => dataSource.fetchEventAttachments(eventId ?? ''),
    enabled: eventId != null,
  });
}

/**
 * PREFETCH PÅ AVSIKT (ADR-078 beslut 3) för eventets bilagor — husets form,
 * identisk med `useForberedEventDetalj` (`EventCard.tsx`) och
 * `varmPersonregister` (`TabBar.tsx`): en stabil callback via `useCallback`
 * (konsumeras som `onMouseEnter`/`onFocus`/`onHoverStart`-handler), samma
 * nyckel som `useEventAttachments` OVAN och `AtgardsSida.tsx`s egen
 * `attachments`-`useQuery` — React Query dedupar, så en redan varm eller
 * pågående hämtning kostar inget extra anrop.
 *
 * `staleTime: 30_000` är den LOKALA prefetch-avvägningen (samma tal som
 * `EventCard.tsx`): den globala 5-minuters-defaulten (`router.ts`) styr
 * fortfarande hur färsk datan räknas för `ArbetsYta`s/`DokumentYta`s egna
 * `useQuery`-anrop när de väl monterar och läser cachen — detta värde
 * påverkar ENDAST om just DENNA prefetch-anrops bedömer cachen så pass
 * färsk att den kan hoppa över nätverksanropet. Utan överskuggning hade
 * upprepad hover över flera minuter aldrig triggat en ny bakgrundshämtning
 * ens när Lotta genuint kommer tillbaka efter en paus.
 *
 * TASK-416.11 (rapport E, S123): bilagorna hämtades annars först när
 * `ArbetsYta` monterade (åtgärdsraden fälldes ut) — ingen förvärmning på
 * avsikt fanns för de två ingångarna till Åtgärds-sidan
 * (`AtgarderKort`/`Atgarder.tsx`, `MarkeringsBatchBar`/`Deltagare.tsx`).
 */
export function useForberedAtgardsBilagor(): (eventId: string) => void {
  const dataSource = useDataSource();
  const queryClient = useQueryClient();
  return useCallback(
    (eventId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.attachments.byEvent(eventId),
        queryFn: () => dataSource.fetchEventAttachments(eventId),
        staleTime: 30_000,
      });
    },
    [dataSource, queryClient],
  );
}
