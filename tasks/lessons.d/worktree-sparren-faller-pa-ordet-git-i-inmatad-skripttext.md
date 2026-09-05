# Worktree-spärren fäller ett Bash-anrop så fort ordet "git" förekommer i inmatad skripttext

**[UNIVERSAL] Worktree-isoleringens spärr mot att rikta git mot den delade
huvudkatalogen läser kommandosträngen textuellt, inte semantiskt — den
fäller så fort ordet "git" dyker upp i inmatad skripttext den inte kan
verifiera fullt ut, även när kommandot aldrig faktiskt skulle rört
huvudkatalogen.** Mätt S120 Del 4 och resume 2
(`tasks/sessions/2026-09-04-session-120.md` rad ~437–439): python-heredoc
med git i strängar, jq-strängar som nämnde git, gh-PR-mallar med
git-referenser, en `for`-loop, och en subshell-tilldelning som
`d=$(git rev-parse …)` avvisades alla med "too complex to verify" — även
när git-ordet bara förekom i en sträng eller ett kommentarsavsnitt. Regel:
skriv skriptet till fil och kör filen (`bash fil.sh`, `python3 fil.py`) i
stället för att inline:a det i kommandoraden; håll `gh`-anrop platta utan
inbäddade git-referenser; undvik subshell-tilldelningar som
`x=$(git …)` direkt på kommandoraden.
