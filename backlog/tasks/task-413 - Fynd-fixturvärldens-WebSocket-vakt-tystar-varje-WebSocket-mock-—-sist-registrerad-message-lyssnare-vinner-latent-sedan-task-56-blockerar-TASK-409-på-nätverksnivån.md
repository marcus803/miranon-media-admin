---
id: TASK-413
title: >-
  Fynd: fixturvärldens WebSocket-vakt tystar varje WebSocket-mock — sist
  registrerad message-lyssnare vinner, latent sedan task-56; blockerar TASK-409
  på nätverksnivån
status: To Do
assignee: []
created_date: '2026-09-06 10:11'
labels:
  - ready-for-human
dependencies: []
ordinal: 714000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fött ur TASK-409:s kontrollpunkt (S121 resume 4, 2026-09-06, Opus-agent, lokal gren task/409-hermetisk-betalningsvarld @ ed98a3d5, inte pushad). Fyndet: hermetik-vaktens WebSocket-led (tests/support/fixturvarld/websocket-vakt.ts, registrerad SIST i hermetic.ts som [...handlers, wsVakt]) gör varje WebSocket-mock i fixturvärlden stum. Kedjan, källmärkt av agenten: Playwrights WebSocketRoute.onMessage(handler) är en SETTER (playwright-core/lib/coreBundle.js:59534: onMessage(handler) { this._onPageMessage = handler; }); @msw/playwright mappar client.addEventListener('message', …) rakt på den; MSW:s WebSocketHandler[kConnect] registrerar alltid en egen message-lyssnare innan connection fyras; bryggan kör alla matchande handlers i tur och ordning — bara den SIST registrerade lyssnaren överlever, och vakten ligger sist. Vaktens löfte 'Vakten håller sig undan' (websocket-vakt.ts § tackt) är därmed inte uppfyllbart. Kunde inte upptäckas förrän någon faktiskt mockade en WebSocket. Mätt tvåsidigt: probe E1 mock ensam → pong; E2 mock-sedan-vakt → tystnad; E3 vakt-sedan-mock → pong; probe F2 visar att vakten FÖRST fortfarande vaktar (kastar OmockadWebSocketError). Prober: tests/visual/task409-realtime-probe*.spec.ts på agentens gren (A/B/E2 markerade test.fail(), blir röda den dag felet lagas — avsiktligt). VÄGVAL (Marcus): (a) ordningsfix — vakten registreras FÖRST; spröd, eftersom network.use() alltid lägger överskuggningar först och varje framtida WS-handler som registreras efter vakten återinför felet tyst; (b) ordningsoberoende — vakten registrerar ingen message-lyssnare alls, vilket kräver override av WebSocketHandler[kConnect] (symbolen finns men ligger utanför msw:s publika yta, versionsrisk). Sidofynd: Realtime-URL:en bär vsn=2.0.0 (Phoenix array-ramar), inte 1.0.0 som 409:s underlag antog; ws.link().broadcast() genom bryggan är overifierad. Research: docs/research/supabase-realtime-hermetisk-mock-2026-09-06.md (landar i egen docs-PR). Blockerar TASK-409 om nätverksnivån (MSW ws.link) väljs; port-nivån (T185-demoläget) berör inte denna vakt men täcker inte kanalen utan eget seam (useJobbstatus.ts importerar prenumereraPaJobbrader direkt, utanför adapter-seamen).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Marcus har valt väg (a) ordningsfix eller (b) kConnect-override, bokfört i kortet med skäl
- [ ] #2 Vald fix implementerad i tests/support/fixturvarld/ med tvåsidigt bevis: en WebSocket-mock i fixturvärlden får svar (E3-formen) OCH vakten fäller fortfarande en omockad WebSocket (F2-formen)
- [ ] #3 Proberna från TASK-409 ersatta av en permanent realtime-mock-hjälpare + enhetsspec, eller bokförda som permanenta med motiv; inga test.fail()-markerade tester kvar
- [ ] #4 websocket-vakt.ts § tackt och hermetic.ts kommenterar ordningskravet eller dess frånvaro med denna instans som belägg
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
