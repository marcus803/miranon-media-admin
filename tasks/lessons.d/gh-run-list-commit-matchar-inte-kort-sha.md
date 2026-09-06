# `gh run list --commit` matchar inte en kort SHA — vakter på run-ID

**`gh run list --workflow ci.yml --commit <sha>` ger tomt resultat för en
förkortad SHA; bara full 40-teckens SHA matchar, och en vakt byggd på den
korta formen väntar för evigt.** Mätt 2026-09-06 (S121 Del 6 § 6.8,
`tasks/sessions/2026-09-04-session-121.md` rad ~1344) under AFK-nattens
landningar. Regel: vakter och svep identifierar en körning via run-ID
(`databaseId` ur `gh run list --json`) eller full SHA, aldrig via kort SHA;
CLAUDE.md § Landning bär samma varning för `isInMergeQueue` — läs
verktygets faktiska matchning innan en vakt byggs på den.
