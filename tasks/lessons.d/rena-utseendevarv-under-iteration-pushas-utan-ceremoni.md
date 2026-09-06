# Rena utseendevarv under iteration pushas utan ceremoni — grindarna körs en gång i slutvarvet

**[UNIVERSAL] Varv 2–4 på bekräftelsestegets form tog ~20 minuter vardera
eftersom agenten körde typecheck, lint, bygge, api-tester och två
staging-e2e-sviter live per varv; varv 6–10, efter tempo-ordern, tog 1–4
minuter.** Mätt 2026-09-06 (S121 Del 7, `TASK-402.8` varv 2–10,
`tasks/sessions/2026-09-04-session-121.md`); Marcus: *"Fan vilken tid det
tar … det var ju skitlätta ändringar."* Regel, samma som Marcus redan satt
för bilder och referenser: under iteration pushas ett varv så fort
typecheck och lint är gröna, rapporten är max tio rader med head-SHA, och
bilder, referenser, tester, grindar och facit-bokföring tas EN gång i
slutvarvet när formen är låst. Ordern skrivs i agentens första uppdrag, inte
efter att Marcus tröttnat.
