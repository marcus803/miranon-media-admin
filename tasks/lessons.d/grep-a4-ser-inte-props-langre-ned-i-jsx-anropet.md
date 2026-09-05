# `grep -A4` på ett JSX-anrop ser inte props längre ned

**Ett fast antal efterföljande rader (`-A N`) är fel verktyg för att
inventera props på ett JSX-komponentanrop — anropet kan sträcka sig längre
än N rader, och en prop som ligger efter gränsen missas tyst utan
felmeddelande.** Mätt S120 (orkestrerarens forensik på eventväljaren,
`TASK-394`,
`tasks/sessions/2026-09-04-session-120.md` rad ~228–230): `grep -A4
"<EventValjare"` missade `form=`-propen på tre av tolv anropsplatser
eftersom propen låg efter den fjärde raden i det formaterade anropet.
Forensiken byggde alltså på ofullständig data utan att det syntes. Regel:
läs hela anropet — från öppnande tagg till avslutande `/>` eller `>` — inte
ett fast antal rader efter träffen; en fullständig prop-inventering över
många anropsplatser görs bäst med en parser (AST) eller genom att läsa
hela filen, aldrig med en gissad radgräns på grep.
