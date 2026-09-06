# En fast millisekundmarginal mellan två CDP-anrop är ett lastberoende race

**Ett test som läser en tidpunkt ur sidan och sedan skickar tillbaka den
plus en fast marginal förutsätter tyst att tur-och-retur-tiden är MINDRE än
marginalen — och den förutsättningen är sann på en tom maskin och falsk på en
belastad.** [UNIVERSAL]

Mätt 2026-09-06 (`TASK-402.8` slutvarvet,
`tests/e2e/bekraftelsesteget-promoverings-grind.staging.test.ts`). Hjälparen
gjorde `const nu = await page.evaluate(() => Date.now())` och därefter
`page.clock.pauseAt(new Date(nu + 500))`. Playwrights `pauseAt` vägrar en
tidpunkt i det förflutna (*"Cannot fast-forward to the past"*), så när de två
CDP-anropen tillsammans tog mer än 500 ms föll testet — `ipad — körningen
pågår` fällde i en körning där desktop-varianten och trettio andra fall var
gröna. Marginalen höjdes till 2 s och sex omkörningar i rad blev gröna.

Två saker gör felklassen värd ett eget fragment:

1. **Felet ser ut som ett riktigt fel.** Meddelandet handlar om tid i det
   förflutna, inte om maskinens last, så den första hypotesen blir "klockan är
   fel" i stället för "marginalen är för snäv".
2. **Den var DORMANT.** De fyra lägen som använde hjälparen stod `test.fixme`
   medan formen itererades. Att ta bort ett `fixme` återaktiverar inte bara
   testet utan också varje race det bär — den som re-armerar ett test ärver
   dess flakighet, även om någon annan skrev det.

Regeln: när en marginal ska täcka en I/O-tur-och-retur, sätt den efter
den LÅNGSAMMA maskinen, inte den snabba — och skriv i koden vad som gör
marginalen säker (här: pausen sker före klicket som startar simuleringens
timers, så en framåtspolning på 2 s har ingenting att spola förbi).
