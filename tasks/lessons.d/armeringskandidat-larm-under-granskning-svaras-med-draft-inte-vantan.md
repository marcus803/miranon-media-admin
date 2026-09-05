# Svepets ARMERINGS-KANDIDAT-larm under pågående granskning besvaras med `gh pr ready --undo`, inte med väntan

**CLEAN+oarmerad är aldrig ett vilande tillstånd (L485) — svepet kan inte
skilja en medvetet parkerad PR som väntar på sitt granskningsutlåtande
från en glömd PR, så larmet är alltid en order att agera i samma svep, inte
information att sitta på.** Under en pågående review-loop är rätt agerande
INTE att lämna PR:en CLEAN och vänta tills utlåtandet är inne — det är att
sätta den i draft med `gh pr ready --undo` tills granskningen är klar,
sedan ta bort draft-läget. Mätt S120 Del 4 (`#2319`) och tillämpat i
resume 2 (`#2312`),
`tasks/sessions/2026-09-04-session-120.md` rad ~440–441. Regel: en PR under
aktiv granskning ska stå i draft, inte CLEAN-och-väntande — annars läser
svepet den som en glömd armerings-kandidat och larmar i onödan, eller värre,
någon armerar den innan granskningen är klar.
