# Städskriptets torrkörning och utförande divergerar på git-låsta worktrees

**`stada-worktrees.sh` pekade ut en worktree i torrkörning och tog bort noll
i `--utfor`, två gånger i rad — worktreet bar gitens egen `locked`-flagga,
som skriptets lås-grind aldrig läser.** Mätt 2026-09-05 (S121 paus 3,
`tasks/sessions/2026-09-04-session-121.md` § Paus 3 § "Worktree-städningen"):
grinden ser harness-lås (agent-klassen) och process-cwd (sessions-klassen),
men `git worktree remove` vägrar utan `--force` på ett `locked`-träd, så
utförandet tystnar där torrkörningen lovade. Hub-fynd (skriptet bor i
`marcus-system`): torrkörningen bör läsa `git worktree list --porcelain`
efter `locked` och rapportera "låst, rörs inte" i stället för att lista
trädet som borttagbart. Regel tills dess: en torrkörning som listar ett
träd är en HYPOTES om vad `--utfor` gör; läs `git worktree list` själv.
