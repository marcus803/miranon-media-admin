# Ihållande 429 på en modellklass: flytta granskningarna uppåt i tier, återuppta byggarna från transkript

**När API:t serverbegränsar en modellklass (HTTP 429, "not your usage
limit") under längre tid dör varje agent i den klassen mitt i sitt
arbete, och strategin skiljer sig mellan granskare och byggare: en
granskare är tillståndslös och spawnas om på nästa tier med avvikelsen
bokförd; en byggare bär worktree-tillstånd och återupptas från sitt
transkript efter en paus, aldrig spawnas om.** Mätt 2026-09-06 (S123,
~20:00–20:35 UTC): sju Sonnet-agenter dog på 429 inom 35 minuter, två av
dem två gånger. Byggarna (416.18, 416.16, 367, 416.14) återupptogs med
`SendMessage` efter en bakgrundspaus på 180 s och fortsatte där de var;
416.18:s push hade redan gått igenom, så bara slutrapporten saknades och
CI bar beviset. Granskarna (#2423 två gånger, #2419) spawnades om i färsk
kontext på Opus med avvikelsen från tier-policyn (review-agent: Sonnet)
skriven i uppdragstexten och i sessionsdoket; skälet var
serverbegränsning, inte kvalitet, och granskningarna löpte sedan utan
avbrott resten av kvällen. Ett avbrott är inget felmeddelande från
agenten: läs vad som hann pushas (`gh pr view --json headRefOid`) innan
något görs om. Regel: paus i bakgrunden (aldrig `sleep` i förgrunden),
återuppta byggare, spawna om granskare uppåt, bokför avvikelsen per
uppdrag. Se även fragmentet om förlorad worktree-isolering vid
återupptagning. `[UNIVERSAL]`
