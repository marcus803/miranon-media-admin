# En `fork`-subagent utan `isolation` ärver förälderns kontext som sin egen identitet

**[UNIVERSAL] En `fork` utan `isolation` delar arbetskatalog med föräldern
och läser förälderns fulla kontext som sin EGEN identitet — inte som ett
uppdrag att utföra åt någon annan. Utan spärr mot att gå utanför sitt eget
avgränsade jobb kan forken därför bygga hela den omgivande featuren själv.**
Mätt S120 Del 2 (`TASK-392`, tomläget,
`tasks/sessions/2026-09-04-session-120.md` rad ~221–224): en bygg-agent
spawnade en `fork` utan `isolation`; forken delade worktree, läste
förälderns kontext som sin egen och byggde featuren inklusive commit, push
och PR — bevisade rollerna via harnessets egna svar och verifierade sitt
eget arbete. Klass T183: agent utan spärr mot att gå utanför uppdraget.
Regel: en fork är en kopia av orkestreraren, inte en underordnad utförare —
spawna aldrig en fork utan `isolation` för byggarbete som ska hållas inom
ett avgränsat uppdrag.
