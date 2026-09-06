# En fix som avgränsar ett beteende i en delad komponent räknar upp ALLA konsumenter först

**[UNIVERSAL] "Begränsa den vita notisen till inkorgen" missade att
`RegistreraForm` hade en fjärde konsument (bekräftelsestegets gröna kort)
som behövde samma vita notis — granskningen fångade det i runda 2, efter
att runda 1 fångat de tre konsumenter som INTE skulle ha den.** Mätt
2026-09-06 (PR `#2380` runda 1–3, S121 Del 7,
`tasks/sessions/2026-09-04-session-121.md`): `git grep "<RegistreraForm"`
gav fem anropsställen; beslutet togs mot tre. Regel: innan ett beteende i
en delad komponent villkoras skrivs konsumentlistan ut (grep, inte minne)
och varje konsument klassas explicit — ska ha, ska inte ha — i kortet;
en opt-in-prop med default på det gamla beteendet är rätt form, men
listan avgör vilka som sätter den.
