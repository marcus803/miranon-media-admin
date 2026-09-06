# Prod-basen läst av två agenter samma dag — ett prosa-förbud utan mekanism håller inte under fleet-drift

**Doktrinen att agenter aldrig rör prod-Airtable-basen bars enbart av
prosa (agentkontrakten, `CLAUDE.md`), och `mcp__airtable__*`-verktygen
saknar en spärr av den klass `scripts/deny-prod-ref.sh` ger prod-
Supabase-refen i Bash. Under fleet-drift med tolv parallella agenter
räcker prosan inte: två agenter läste prod-basen samma dag, oberoende
av varandra, båda read-only, ingen skada — men samma öppning hade burit
en skrivning.** Mätt 2026-09-06 (S123): research-passet om förvärmning
och review-agenten på PR `#2400` anropade `mcp__airtable__`-verktyg mot
prod-bas-ID:t för att verifiera fältdata, trots att staging bar samma
svar. Upptäckt av orkestreraren i agenternas rapporter, inte av någon
grind. Tillfällig åtgärd: ett explicit, källmärkt förbud i varje
efterföljande uppdragstext. Varaktig åtgärd är mekanisk och bokförd som
fynd-kort (PreToolUse-hook som nekar `mcp__airtable__*`-anrop vars input
bär prod-bas-ID:t, samma form som `deny-prod-ref.sh`). Regel, samma som
ADR-083 fast för verktygsytor: en spärr som bara finns i prosa ska
bokföras som "prosa, ingen mekanism" i den fil som påstår den, och varje
verktygsyta som når prod ska ha sin egen mekaniska spärr innan fleet-
drift startas mot den. `[UNIVERSAL]`
