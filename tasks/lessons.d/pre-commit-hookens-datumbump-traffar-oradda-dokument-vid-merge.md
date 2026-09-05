# Pre-commit-hookens `updated:`-bump träffar orörda dokument vid `git merge origin/main`

**ADR-030s pre-commit-hook som bumpar `updated:`-datumet i frontmatter kan
träffa styrande dokument som en `git merge origin/main` i agentens worktree
rör vid — utan att agenten själv ändrat innehållet — och lämna dem kvar i
PR-diffen med bara datumbumpen.** Mätt S120 Del 4 (granskaren på `#2319`,
`tasks/sessions/2026-09-04-session-120.md` rad ~431–434): fyra orelaterade
styrande dokument (`CONTRIBUTING.md`, `ORDLISTA.md`, `docs/byggplan.md`,
`docs/specs/DESIGN-SYSTEM-SPEC.md`) hamnade i PR-diffen med enbart
datumbumpen — ett bokstavligt avsteg från Definition of Done-punkt 3
(diffen ska vara det avsedda arbetet, inget annat). Regel: kör
`git diff origin/main --stat` efter varje merge och återställ filer som
bara bär datumbumpen med `git checkout origin/main -- <fil>` innan push —
annars smyger sig oavsiktligt brus in i en PR som annars är ren.
