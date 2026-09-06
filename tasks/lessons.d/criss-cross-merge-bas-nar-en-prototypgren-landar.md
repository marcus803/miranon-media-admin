# Criss-cross-basen: en gren byggd på en prototypgren som mergar `main` får två merge-baser

**[UNIVERSAL] En gren baserad på en prototypgren som sedan själv mergar
`main` bär två merge-baser mot `main` när prototypgrenen landar; lokal
`git merge-tree` är ren, men GitHub väljer den andra basen och sätter PR:en
DIRTY med främmande filer i diffen.** Mätt 2026-09-05 (S121 Del 6 § 6.3,
`tasks/sessions/2026-09-04-session-121.md` rad ~964): `#2360` bar baserna
`720bb1f6` (egen main-merge) och `6eaf32b6` (prototypgrenen); `compare`
gav `diverged`, 28 filer som inte var agentens, svepet larmade DIRTY två
gånger. Åtgärden var att merga den nya `main`-toppen in i grenen. Regel: en
gren som baseras på en annan gren mergar `main` FÖRST när basgrenen landat,
eller aldrig — inte båda. Staplade PR:er landar därför utan `main`-merge
(se fragmentet om staplade PR:er).
