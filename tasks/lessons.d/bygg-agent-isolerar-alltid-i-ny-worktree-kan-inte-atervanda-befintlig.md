# `bygg-agent`-typen isolerar sig ALLTID i en ny worktree — ett uppdrag mot en befintlig kan den inte utföra

**[UNIVERSAL] En `bygg-agent`-spawn skapar alltid sin EGEN nya worktree vid
start, oavsett vad uppdragstexten ber om — ett uppdrag som pekar på en
redan existerande worktree kan agenten därför inte utföra i den worktreen,
och `EnterWorktree` mot ett syskon-worktree låser dess Bash-verktyg helt.**
Mätt 2026-09-05 (S120 resume 2, `TASK-390` iteration 4): agenten fick
uppdraget att arbeta i `.claude/worktrees/agent-af78…` men startades i en
egen ny worktree; `cd <mål> && git status` avvisades av worktree-spärren
("a worktree-isolated agent's git operations must target its own
worktree"); `EnterWorktree` mot målet rapporterade framgång men varje
Bash-anrop DÄREFTER avvisades — även `pwd` och `cd` tillbaka till den egna
worktreen ("working directory resolved to the shared checkout … Re-run the
command from …") — och `ExitWorktree` vägrades från en subagent med
cwd-override. Agenten stoppade korrekt utan att ändra något. Regel: vill
man fortsätta i ett befintligt träd, spawna INTE `bygg-agent` — återuppta
i stället den agent som redan äger trädet (`SendMessage` till dess ID/namn)
eller spawna en OISOLERAD `general-purpose`-agent; `EnterWorktree` i en
subagent är en enkelriktad dörr som inte går att backa ur.
