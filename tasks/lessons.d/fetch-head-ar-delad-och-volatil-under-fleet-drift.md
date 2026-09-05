# `FETCH_HEAD` är en delad, volatil ref i det gemensamma `.git` under fleet-drift

**[UNIVERSAL] `FETCH_HEAD` pekar på resultatet av den SENASTE `git fetch`
mot ett repos gemensamma `.git`-katalog — oavsett vilken agent som körde
den fetchen. I en fleet där flera agenter delar samma `.git` kan en annan
agents fetch skriva om `FETCH_HEAD` mitt i en pågående operation.** Mätt
S120 Del 2 (granskning av `#2313`,
`tasks/sessions/2026-09-04-session-120.md` rad ~225–227): granskaren
observerade att en annan agents `fetch` skrev om `FETCH_HEAD` mitt i
granskningen, vilket hade kunnat få granskningen att av misstag råka
referera fel commit. Regel: pinna mot en full SHA direkt efter `fetch`
(`git rev-parse FETCH_HEAD` sparad i en variabel, eller läs `origin/<gren>`
i stället) och läs aldrig `FETCH_HEAD` på nytt senare i samma operation —
den kan ha ändrats under tiden.
