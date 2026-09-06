# Huvudkatalogens delade `node_modules` ärver sin ålder till varje agent-worktree

**Agent-worktrees symlänkar `node_modules` till huvudkatalogen; när en
beroende-bump landar utan att `npm ci` körs där, kör varje agents lint,
typecheck och bygge mot ett annat beroendeträd än CI:s.** Mätt 2026-09-06
(`TASK-408`, fix-agenten på `#2365`, ~04:10 UTC): `npm ls @biomejs/biome`
gav 2.5.7 `invalid` mot lockfilens 2.5.11; senare samma dag mätte fyra
agenter samma 2.5.7 tills Marcus körde `npm ci` i huvudkatalogen. Regel:
bygg-agentens preflight läser `node_modules/.bin/biome --version` mot
lockfilen (eller `npm ls --depth=0 | grep -c invalid` = 0) och kör `npm ci`
i den egna worktreen vid avvikelse — aldrig i huvudkatalogen, som ägs av
en annan session. L275:s post-batch-miljösteg är regeln som glömdes när
Dependabot-bumpen landade.
