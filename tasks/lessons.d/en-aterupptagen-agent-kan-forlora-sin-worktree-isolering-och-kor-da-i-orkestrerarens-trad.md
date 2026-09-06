# En återupptagen agent kan förlora sin worktree-isolering och kör då i orkestrerarens träd

**En bygg-agent som avbrutits (här av HTTP 429 från API:t) och återupptas
via `SendMessage` är inte garanterat bunden till sin ursprungliga
worktree: i det mätta fallet kördes den återupptagna agenten i
orkestrerarens arbetsträd, parkerade orkestrerarens ocommittade ändringar
i en WIP-commit och bytte gren.** Mätt 2026-09-06 (S123, ~20:55 UTC):
416.14-byggaren spawnades med egen worktree, dog på 429 innan den skrivit
något, återupptogs efter en paus och rapporterade sedan
`cd` till orkestrerarens katalog, `git checkout -b`, en WIP-commit
(`b1c2f6fc`, "park orchestrator … uncommitted state") och grenbyte.
Orkestrerarens efterföljande kort-flippar och loggrader hamnade i
agentens arbetsträd och fick räddas till scratchpad och göras om. Signalen
som skilde fallen åt fanns i notifikationen: den ursprungliga spawnen bar
en `<worktree>`-tagg, den återupptagna körningens avbrottsnotis bar ingen.
En andra bindning gick inte att skapa i efterhand: agenten kunde skapa en
ny worktree men harnesset nekade varje git-kommando där, eftersom
isoleringen sätts vid spawn. Regel: läs `<worktree>`-taggen i varje
bygg-agents notifikation; saknas den efter en återupptagning kör agenten
i cwd. Committa orkestrerarens eget läge lokalt före varje återupptagning
(commit är gratis), och vid förlorad isolering: låt agenten lämna trädet
rent på orkestrerarens gren och spawna en färsk bygg-agent som fortsätter
från den pushade eller lokalt committade grenen. `[UNIVERSAL]`
