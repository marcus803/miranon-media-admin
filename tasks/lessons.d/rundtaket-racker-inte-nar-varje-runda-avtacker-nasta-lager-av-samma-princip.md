# Rundtaket räcker inte när varje runda avtäcker nästa lager av samma princip — principen hör i uppdraget, inte i granskningen

**En granskningsloop med rundtak 2 (ADR-105 beslut 4) konvergerar bara
när fynden är oberoende av varandra. När fynden i stället är LAGER av
samma outtalade princip avtäcker varje fix nästa lager, och taket byter
automatik mot eskalering utan att något är fel med vare sig byggaren
eller granskaren — principen saknades i uppdraget.** Mätt 2026-09-06
(S123, PR `#2401`, skiva `TASK-416.1` Check-in): fem rundor, där r1 gav
`aria-busy`-placering, r2 gav disabled-stil + sessionstoggel som bytte
val tyst + shimmer vid fel, r3 gav eventnamnsrad som skimrade vid fel +
sr-only-besked, r4 gav retry-backoff-timeout på assertions, r5
konvergerade. Samma mönster i mindre skala på `#2395` (416.8, tre
rundor) och `#2415` (416.2, fynd som födde `TASK-416.19`). Alla fynd var
instanser av tre regler som fastslogs FÖRST under loopen: skeleton och
shimmer enbart i pending, aldrig i fel; sidkromet renderat i alla
tillstånd; ett returträd med fasta barnpositioner så header och filter
inte monteras om. Femton PR:er genom loopen: fem konvergerade i runda 1,
sju behövde runda 2, tre gick förbi taket på Marcus mandat. Regel: när
en PRD spänner över flera vyer med samma tillståndslogik skrivs
principerna som en checklista i PRD:n och citeras i varje skivas
uppdrag, så byggaren bygger mot dem och granskaren prövar mot dem i
runda 1. Ett fynd som återkommer i två skivor är signalen att lyfta det
till PRD-nivå omedelbart, inte att fortsätta per skiva. Kandidat till
`DESIGN-SYSTEM-SPEC` §15 (skiva mintad i S123 stängningsbatch 1).
