# `test.fail()` som rött-först-markör överlever hermetik-självtestet och bevisar därför inget

**Playwrights `test.fail(title, body)` är den dokumenterade formen för "känt
trasigt tills fixat", men i ett repo vars CI kör ett hermetik-självtest som
kräver att VARJE test faller med `OmockadRequestError` när fixturens svar
tas bort, klassas ett `test.fail()`-test som "överlever utan fixturens svar
och bevisar därför inget om appens databeteende". En känd defekt bokförs
som kort plus assertion i fix-PR:en, aldrig som `test.fail()` i huvudsviten.**
Mätt 2026-09-06 (S123, PR `#2412`, kö-körning `34043212879`): två
`test.fail()`-test för en mätt skeletonavvikelse (568×72 px mot 545×66 px)
gav "8 tester · 6 fällda · 8 med OmockadRequestError som orsak" och
`status 'expected', väntat 'unexpected'` för de två, exit 1 i jobbet
"Acceptance — tvåsidigt bevis (hermetik-självtest)". Runda 1-granskaren
hade bedömt formen som korrekt Playwright-praxis, vilket den är i
allmänhet; det var repots egen mekanism (`scripts/hermetik-sjalvtest.mjs`,
`npm run test:acceptance:sjalvtest`) som avgjorde, och den fångades av CI,
inte av granskningen. Fixen (`ae70a976`): markörerna borttagna,
defekten registrerad som `TASK-416.18` med mätningen som assertion i
fix-skivan, filhuvudet pekar dit. Regel: kör
`npm run test:acceptance:sjalvtest -- <fil>` lokalt innan en acceptance-fil
pushas, och läs självtestets rapportrad, inte bara "N passed".
