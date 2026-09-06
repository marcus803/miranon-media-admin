---
id: TASK-419
title: >-
  Fynd: mcp__airtable__* saknar mekanisk spärr mot prod-basen — två agenter
  läste app8uGPrVCVOm6LfD i S123; PreToolUse-hook i deny-familjen
status: To Do
assignee: []
created_date: '2026-09-06 17:11'
labels:
  - ready-for-agent
dependencies: []
priority: high
ordinal: 747000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Källa: S123 (2026-09-06) sessionsdok Del 3 § Avvikelser + lessons-fragmentet prod-basen-last-av-tva-agenter-ett-prosa-forbud-utan-mekanism-haller-inte-under-fleet.md. Research-passet om förvärmning (agent a52fecab) och review-agenten på PR #2400 anropade mcp__airtable__-verktyg mot prod-bas-ID:t app8uGPrVCVOm6LfD, read-only, för fältdata som staging (apphjj8Q7lkXCMsL4) bar identiskt. Förbudet finns bara i prosa (CLAUDE.md, agentkontrakten); Bash-ytan har scripts/deny-prod-ref.sh för Supabase-refen men ingen spärr täcker MCP-verktygsanrop. Åtgärd (samma form som deny-prod-ref.sh, config-driven per CLAUDE.md § Custom CI-grindvakts-logik): PreToolUse-hook i .claude/settings.json som matchar mcp__airtable__* och mcp__claude_ai_Airtable__* och nekar när tool_input (baseId eller fri text) bär prod-bas-ID:t ur en ny .prod-airtable-policy.conf; staging-ID:t släpps igenom. Tvåsidig testsvit (nekar prod, släpper staging, nekar prod-ID i nästlad input) wirad i ci.yml:s gatekeeper-steg. Skarpbeviset genom harnesset kan INTE betalas av worktree-agenten som bygger hooken (CLAUDE.md § En ny hooks skarpbevis) — bokför som öppen skuld i kortet, betalas av huvudkatalog-sessionen efter ff. Uppdatera CLAUDE.md-raden så den säger mekanism, inte prosa (ADR-083). Marcus egen claude.ai-connector (mcp__claude_ai_Airtable__) används medvetet mot prod i HITL-läge (CLAUDE.md § Verktygsfakta) — hooken ska därför neka bara i agent-anrop om det går att skilja, annars bokförs avvägningen öppet i kortet innan bygge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hook nekar mcp__airtable__*- och mcp__claude_ai_Airtable__*-anrop vars input bär prod-bas-ID:t ur .prod-airtable-policy.conf; staging-ID:t släpps; nekandet bär ett svenskt skäl i samma form som deny-prod-ref.sh
- [ ] #2 Tvåsidig testsvit (minst: nekar prod-ID, släpper staging-ID, nekar prod-ID nästlat i input, släpper anrop utan bas-ID) CI-wirad i gatekeeper-steget
- [ ] #3 Skarpbeviset genom harnesset bokfört som öppen skuld med differentialmätningen gjord (manuell körning av skriptet mot verklig hook-JSON fäller)
- [ ] #4 CLAUDE.md-raden om Airtable-MCP:erna säger att spärren är mekanisk och pekar på hook + policy-conf; ingen prosa påstår mer än vad hooken gör
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
