# Granskningsloopen startar först när iterationen är klar — och helst en PR per godkänd yta

**[UNIVERSAL] Tre staplade inkorg-PR:er granskades medan formen fortfarande
kunde ändras; ett fynd i mitten av stapeln (`#2380` runda 2) tvingade fram
en fix, en ny head på PR:en ovanpå och omgranskning i tre rundor
(`#2383` runda 2–4), varav två var rena skillnadsgranskningar av
merge-commits.** Mätt 2026-09-06 (S121 Del 7, `tasks/sessions/2026-09-04-session-121.md`);
Marcus: *"Alla dessa jävla kontroller alltså. Vi kan ju inte göra dem
efter varje liten iteration/ändring."* Granskningen gjorde sitt jobb (den
fångade en tyst spridning till tre andra sidor), men ordningen var fel.
Regel: Marcus godkänner på granskningsservern → agenten kör slutvarvet en
gång → EN granskning per PR → landa; en granskning startas aldrig på en
gren som fortfarande itereras, och en godkänd yta landar som egen PR
mot `main`, inte i en stapel där en fix i botten gör alla huvuden ovanpå
stale.
