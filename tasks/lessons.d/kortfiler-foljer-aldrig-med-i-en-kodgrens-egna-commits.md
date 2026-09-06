# Kort-filer följer aldrig med i en kodgrens egna commits utöver CLI-ändringar på det egna kortet

**En kodgren som återskapade sitt kort efter en `reset --hard` fick en
add/add-konflikt mot `main` när kortet landade den vanliga vägen via en
docs-PR — PR:en blev DIRTY, armeringen konsumerades, och lösningen krävde
`--ours` plus att en not som bara fanns på `main` lades tillbaka via
CLI:t.** Mätt 2026-09-06 (PR `#2383` när `#2380` landade, S121 Del 7,
`tasks/sessions/2026-09-04-session-121.md`). Regel: kortet mintas och landar
via docs-vägen; en kodgren rör bara det egna kortet, bara via
`backlog task edit`, och aldrig genom att lägga till kort-filen som ny fil
— behöver grenen kortet innan docs-PR:n landat, mergas docs-grenen in
(delad historik), aldrig kopieras.
