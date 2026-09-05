# Claude Code-transkriptens `type:"user"`-poster är en blandad population, inte Marcus prosa

**[UNIVERSAL] En post med `type:"user"` i ett Claude Code-transkript
(`~/.claude/projects/<repo>/*.jsonl`) är inte per automatik ett
människoskrivet meddelande — populationen är blandad, och minst sju
maskingenererade underklasser måste filtreras bort innan texten får räknas
som Marcus egna ord.** Mätt i S122:s transkript-pass över 73 filer
(`docs/research/marcus-designpushbacks-bank-transkript-2026-09-05.md`
§ Metod): verktygssvar som `content`-array med `tool_result` (18 843
poster), skill-injicerad text med `isMeta: true` (325), bakgrundsnotiser
med `origin.kind` `task-notification`/`peer` (4 245), harnessets egen
auto-compact-sammanfattning med `isCompactSummary: true` (4 poster, en på
17 363 tecken som gav 27 falska designordsträffar och lyfte fel fil till
förstaplats innan den upptäcktes), Codes egen pre-compact-instruktion som
text inledd med `/compact` (7), terminalutdata ur `!`-kanalen inledd med
`<bash-stdout>` (88, varav en deploy-logg på 10 674 tecken), och
`<system-reminder>`-/`<command-*>`-block inbäddade i annars äkta
meddelanden. Fältet `origin.kind: "human"` är ett säkert positivt tecken
men finns bara i transkript från ungefär 2.1.230 och framåt; äldre filer
saknar det helt, så ett filter måste kombinera fältet där det finns med
en innehållsheuristik där det saknas. Regel: sondera schemat på minst 20
`user`-poster i flera filer, gamla och nya, INNAN filtret skrivs; strömma
rad för rad (filerna är upp till 16 MB); och räkna aldrig ord i en post
förrän alla sju klasserna är bortfiltrerade. Skriptet som gör detta bor i
`tasks/sessions/bilagor/s122-pushback-bank/extrahera-pushbacks.mjs` och
återanvänds i stället för att skrivas om. Sidofynd att bära med: antalet
transkript i katalogen rörde sig från 79 till 73 under en och samma
session utan att orsaken utreddes — mät antalet vid passets start och
slut, det är inte en konstant.
