# En prototypgren bär kod och bilagor, aldrig docs

**Docs-commits i iterationsriggen som cherry-pickas till `main` gör
prototyp-PR:n DIRTY vid nästa landning och kostar en rebase med skipp.**
Mätt 2026-09-05 (S121 Del 4 § "Fynd och lesson-kandidater ur varv 14–19",
`tasks/sessions/2026-09-04-session-121.md`): sessionsdok-uppdateringar committade på `proto/s121-bekraftelsesteget`
landade via docs-worktreen, varpå `#2325` blev konfliktad på samma filer.
Regel: docs landar ur docs-worktreen direkt; en prototyp- eller kodgren
committar bara kod, tester och facit-bilagor. Samma klass som
add/add-konflikten på ett kort som återskapats på en kodgren (se
fragmentet om kort-filer på kodgrenar).
