# En cwd-pinnad subagent når inte en syster-worktree, inte ens via EnterWorktree

**[UNIVERSAL] En subagent spawnad ur en worktree-isolerad session ärver
pinningen: `cd <syster-worktree> && git …` nekas, `EnterWorktree` mot
syster-worktreen rapporterar framgång men nästa git-anrop nekas ändå, och
`ExitWorktree` är spärrat för subagenter.** Mätt 2026-09-06 (S121 Del 7,
agenten "Merga inkorg-grenen in i granskningsworktreen",
`tasks/sessions/2026-09-04-session-121.md`): tre försök, noll git-anrop
nådde syster-worktreen, agenten rapporterade i stället för att kringgå. Det
fyller cellen CLAUDE.md § Worktree-isoleringens gräns lämnade "OPRÖVAT"
(EnterWorktree mot annat träd) — för subagenter är svaret nej; det befintliga
fragmentet om en isolerad SESSION som byter med EnterWorktree gäller bara
sessionen själv. Följd samma dag: granskningsservern för Marcus flyttades
till orkestrerarens egen worktree, som är det enda trädet där orkestreraren
kan merga agenternas grenar. Regel: en yta som ska ta emot merges från flera
agenter bor i orkestrerarens egen worktree, aldrig i ett sidoträd.
