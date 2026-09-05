# En JSONL-logg på `main` kan bära en korrupt rad som ingen grind ser

**En append-only JSONL-logg som saknar en egen giltighetsgrind kan
ackumulera en trasig rad utan att något upptäcker det förrän någon
faktiskt försöker parsa varje rad — vilket normalt inte sker förrän vid en
konflikt eller en analys.** Mätt S120 Del 2
(`tasks/sessions/2026-09-04-session-120.md` rad ~234–236): granskningsloggen
`docs/reference/review-instrumentering.jsonl` bar en rad med ledande `+`
kvar från en tidigare merge-konflikt (PR `#2280`, S115) — raden var ogiltig
JSON och låg oupptäckt på `main` tills den rättades i S120 Del 2:s egen
konfliktlösning. Regel: en append-only-logg som flera parallella agenter
skriver till behöver antingen en CI-grind som parsar varje rad som JSON,
eller åtminstone en valideringskontroll i det skript som appendar —
annars är en korrupt rad osynlig tills den råkar krocka med en
konfliktlösning eller ett analysskript.
