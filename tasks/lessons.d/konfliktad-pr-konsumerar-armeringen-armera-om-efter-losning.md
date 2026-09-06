# En konfliktad PR konsumerar armeringen — armera om efter lösningen

**[UNIVERSAL] När en armerad PR blir DIRTY (konflikt mot `main`) släpper
GitHub `autoMergeRequest` tyst; efter att konflikten lösts och pushats står
PR:en oarmerad utan någon signal om att den någonsin var armerad.** Mätt
tre gånger i S121: `#2356` (paus 3), `#2387` (2026-09-06, kort-filen
`task-415` rörd av två PR:er) och `#2383` (2026-09-06, add/add på PR:ens
eget kort när `#2380` landade) — se `tasks/sessions/2026-09-04-session-121.md`
Del 7. Samma klass som `failed_checks`-utsparkningen i CLAUDE.md § Landning
(fjärde läget). Regel: varje konfliktlösning avslutas med ett nytt `gh pr
merge --auto` och en GraphQL-läsning av `autoMergeRequest`/`isInMergeQueue`
— aldrig antagandet att den gamla armeringen står kvar.
