# Staging-sviten körs bara post-merge, och en omkörning använder workflow-filen vid ursprungs-commiten

**`ci.yml` skickar `run_staging: false` villkorslöst på PR- och kö-ytan; en
skivas staging-e2e körs alltså först post-merge, och en omkörning
(`re-run`) av en post-merge-körning använder workflow-filen som den såg ut
vid DEN commiten — ett höjt tak i en senare commit når aldrig omkörningen.**
Mätt 2026-09-05/06 (S121 Del 6 § 6.4 och § 6.10,
`tasks/sessions/2026-09-04-session-121.md`): fyra post-merge-körningar
avbröts på 12-minuterstaket efter att `402.3` lagt till fall, omkörningarna
avbröts på samma tak, och först landningen av `TASK-404` (`#2370`,
`43579199`) bar det nya taket (13m32s under 20). Regel: agentens lokala
staging-e2e är den enda grinden före landning — den körs alltid i
slutvarvet; och ett CI-tak ändras genom en NY landning, aldrig genom
omkörning.
