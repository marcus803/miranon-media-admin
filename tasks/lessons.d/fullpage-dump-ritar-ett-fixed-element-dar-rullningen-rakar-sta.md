# En fullPage-dump ritar ett `position: fixed`-element där rullningen råkar stå

**En helsides-skärmdump av en app med fast bottennav lägger navet tvärs över
sidans MITT om rullningen står på noll — och det som hamnar under navet är
osynligt för den som ska granska bilden.** [UNIVERSAL]

Mätt 2026-09-06 (`TASK-402.8` slutvarvet, granskningsbilderna till
`AMENDERING-2026-09-06-formen-fore-stampeln.md`). Playwrights `fullPage`
stitchar sidan men ritar ett `position: fixed`-element EN gång, på dess plats
relativt rullningen vid dumpens början. iPad-dumpen av sätt-alla-blocket fick
appens bottennav rakt över de tre toggle-segmenten — alltså över exakt den
kontroll Marcus skulle döma i granskningen. Desktop-dumpen av samma läge var
ren, men bara av en slump: den bilden togs efter ett klick, och Playwrights
auto-rullning hade råkat flytta sidan till botten.

Det förrädiska är att bilden ser HEL ut. Inget felmeddelande, ingen tom yta —
bara ett nav som ser ut att höra hemma där det ligger, ovanpå det som skulle
granskas. Två bilder ur samma rigg kan därför skilja sig utan att någon
förstår varför.

Regeln: rulla till ett KÄNT läge före varje `fullPage`-dump av en yta med
fasta element — `window.scrollTo(0, document.documentElement.scrollHeight)`
sätter navet där det hör hemma och gör hela serien jämförbar. Bygg in det i
skärmdumps-riggen i stället för att komma ihåg det per bild.
