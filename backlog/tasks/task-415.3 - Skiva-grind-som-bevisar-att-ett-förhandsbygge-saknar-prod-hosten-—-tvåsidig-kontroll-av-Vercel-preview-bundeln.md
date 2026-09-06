---
id: TASK-415.3
title: >-
  Skiva: grind som bevisar att ett förhandsbygge saknar prod-hosten — tvåsidig
  kontroll av Vercel-preview-bundeln
status: To Do
assignee: []
created_date: '2026-09-06 11:17'
labels:
  - ready-for-agent
dependencies:
  - TASK-415.2
parent_task_id: TASK-415
ordinal: 725000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research sidofynd 2: ingen grind bevisar i dag att ett förhandsbygge är fritt från prod-hosten; scripts/check-staging-bundle.sh vaktar bara åt ett håll. Bygg en grind (config-driven per CLAUDE.md § custom CI-grindvakt: värden i en .conf, logik universell) som hämtar en given deployments bundel (Vercel MCP/REST eller deploy-URL:en med Deployment Protection-bypass-token för automation — research först på Vercels 'Protection Bypass for Automation') och fäller om prod-hosten förekommer eller stagings saknas. Wira den där den kan köras: GitHub-workflow på deployment_status (success) för preview-miljön, eller som steg i verify-ci-parity — välj med motiv. Tvåsidigt bevis: grön på en staging-pekad preview, röd på en artificiellt prod-pekad bundel (fixtur).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Grinden fäller på prod-host och på saknad staging-host, båda sidorna bevisade
- [ ] #2 Config-driven: hostarna läses ur en policyfil, inte hårdkodade
- [ ] #3 Wirad i CI eller i verify-ci-parity med motiv bokfört; körning på en verklig preview grön
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
