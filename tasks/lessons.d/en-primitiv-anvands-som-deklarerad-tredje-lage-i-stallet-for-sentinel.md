# En primitiv används som deklarerad — ett tredje, förvalt läge i stället för en sentinel-nyckel

**[UNIVERSAL] `ToggleButtonGroup` är alltid-ett-val (`disallowEmptySelection`
hårdkodad); en kapsel med två lägen och ett "inget valt"-tillstånd byggdes
först med en sentinel-nyckel ingen pill bar, och Marcus såg "bara en
textsträng på grå bakgrund".** Mätt 2026-09-06 (`TASK-402.8` varv 4–5,
`tasks/sessions/2026-09-04-session-121.md` Del 7). Rätt form var ett tredje
läge, "Förslag", förvalt och lysande från start: kapseln ser alltid ut som
en kontroll, återställ-knappen blev onödig, och sentinel-hacket försvann.
Regel: när en primitiv saknar det läge ytan vill ha, är frågan först om
ytan har fel modell — ett tomt läge är ofta ett saknat förval — innan
primitiven tvingas till något dess docblock kallar en annan mönsterklass.
