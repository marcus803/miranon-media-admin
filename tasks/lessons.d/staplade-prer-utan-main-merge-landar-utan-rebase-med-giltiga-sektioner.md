# Staplade PR:er utan `main`-merge landar i ordning utan rebase, med giltiga granskningssektioner

**En stapel av PR:er där varje gren bygger på den föregående och INGEN
mergar `main` landar i ordning genom merge-kön utan rebase: GitHub
retargetar nästa PR till `main` när basgrenen raderas efter merge, headen
ändras inte, och Riskbedömnings-sektionens `granskadSha` förblir giltig.**
Mätt 2026-09-06 (S121 Del 6 § 6.9, `tasks/sessions/2026-09-04-session-121.md`):
`#2362` → `#2363` → `#2364` → `#2365` landade så, merge-baserna verifierade
med `compare` och `merge-tree` före varje armering. Motsatsen — en gren i
stapeln som mergar `main` — ger criss-cross-basen (eget fragment). Regel:
bygg stapeln utan `main`-merge, armera en i taget i ordning, och kör
backstopp-preflighten före varje armering (retargeting ändrar inte head,
men en fix i stapelns mitt gör det — då krävs merge uppåt och omgranskning).
