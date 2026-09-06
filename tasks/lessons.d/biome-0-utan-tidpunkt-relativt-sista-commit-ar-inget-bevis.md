# `biome exit 0` utan tidpunkt relativt sista commit är inget bevis

**[UNIVERSAL] En byggrapport som säger `biome exit 0` bevisar ingenting om
grinden kördes före den sista redigeringen; CI fällde `Lint + TypeCheck`
med två formatfel på en PR vars rapport bar grönt.** Mätt 2026-09-06 (S121
Del 6 § 6.7, `tasks/sessions/2026-09-04-session-121.md` rad ~1267): felen
låg i den nya e2e-filen, ett av dem dolt bakom Biomes diagnostik-tak (83
dolda), och byggaren hade mätt före sista commiten. Regel: en grind-rad i
en rapport bär kommandot, dess slutrad OCH tidpunkten relativt sista
commit (eller körs efter `git status` visar rent träd); orkestreraren läser
grinden som HYPOTES tills CI på PR-ytan bekräftar (ADR-086).
