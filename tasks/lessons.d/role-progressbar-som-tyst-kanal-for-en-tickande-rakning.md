# `role="progressbar"` som tyst kanal för en räkning som tickar

**[UNIVERSAL] En räkning som uppdateras var 350 ms ("k av N registrerade")
annonseras ALDRIG per steg — den bärs av en `role="progressbar"` med
`aria-valuenow`/`aria-valuemax`/`aria-valuetext` som skärmläsaren kan
fråga, medan start och slut går i statusraden.** Mätt 2026-09-05 (S121 Del
4 varv 15, `tasks/sessions/2026-09-04-session-121.md`) och låst i
`TASK-402.3` AC #2/#8. Samma två-kanals-form som Förberedelseskärmen
(ADR-112): frågbar för den som vill, tyst för den som inte frågar. Regel:
allt som tickar oftare än en annonsering hinner läsas ut går i en frågbar
roll, aldrig i `aria-live`.
