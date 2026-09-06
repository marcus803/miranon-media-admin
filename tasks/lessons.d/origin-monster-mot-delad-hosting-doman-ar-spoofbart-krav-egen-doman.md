# Ett origin-mönster mot en delad hosting-domän är spoofbart — kräv egen domän först

**[UNIVERSAL] `https://miranon-media-admin-*.vercel.app` som CORS-mönster
matchar vilken Vercel-deploy som helst vars projektnamn börjar så, och
Vercels projektnamn är unika per team, inte globalt — vem som helst kan
registrera prefixet.** Mätt 2026-09-06 (PR `#2388` granskning runda 1,
`TASK-415.1`, `TASK-413`-tråden): granskaren körde en byte-för-byte-kopia
av mönsterlogiken mot ett påhittat projektnamn och fick träff. Skadebilden
var begränsad (staging-only, sessioner i `localStorage`, Deployment
Protection på), men Marcus valde att vänta: *"Vänta tills preview domänen
finns."* Regel: ett mönster i en tillåtelselista får bara peka på en domän
vi själva äger (Vercel Preview Deployment Suffix, `*.preview.miranon.dev`);
tills domänen finns töms mönster-secreten i stället för att lämnas
"tills vidare".
