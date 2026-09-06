# En flaggas källa mäts i den servade bundeln, aldrig i env-filerna

**[UNIVERSAL] Handoffen sade att betalningsflödet var dolt i prod eftersom
`VITE_FEATURE_BETALNINGAR` saknades i `.env.production`; flaggan var satt i
Vercels miljövariabler (S113 steg 14) och bundeln på `admin.miranon.dev` bar
den — Marcus såg funktionen i prod innan orkestreraren hunnit läsa.** Mätt
2026-09-06 (S121 Del 7 § 7.1, `tasks/sessions/2026-09-04-session-121.md`):
`curl` av `assets/index-*.js` plus chunkar, grep på flaggsträngen och
routen. En Vercel-variabel vinner över incheckad `.env.production` (Vite
`loadEnv` applicerar `process.env` sist — mätt i research-passet om
förhandsvisningar). Regel: ett påstående om vad prod visar mäts mot den
servade artefakten (bundel-grep eller Vercel `get_deployment`), aldrig
härlett ur env-filer i repot; samma klass som "en driftkarta härledd ur git
är en hypotes om prod" (CLAUDE.md § Prod-EF-deploy).
