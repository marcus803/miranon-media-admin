# En toggel vars valda segment byter typsnittsvikt flyttar hela raden

**[UNIVERSAL] `font-semibold` på det valda segmentet gör texten bredare;
med `auto-cols-fr` följer alla segment det bredaste, så hela raden växte
142,11 → 144,36 px vid varje klick och "knapparna rörde sig".** Mätt
2026-09-06 (`TASK-402.8` varv 6, `tasks/sessions/2026-09-04-session-121.md`
Del 7); Marcus: *"när man klickar runt på knapparna så ser de ut att röra
sig, eller det gör dem, inte okej."* Fällan i fixen: att ta bort klassen
räckte inte, primitivens egen `data-[selected]:font-semibold` slog igenom —
vikten måste sättas explicit i båda lägena. Regel: ett val ändrar bara
färg; vikt, kantbredd och padding är identiska i valt och ovalt läge, en
tjockare markering ritas som inset `box-shadow` utanför boxmodellen, och
beviset är `boundingBox()` för varje segment före och efter klick.
