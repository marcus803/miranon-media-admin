# `curl -w "%{http_code}" || echo 000` ger "000000" när curl skriver sin kod OCH faller

**[UNIVERSAL] `-w "%{http_code}"` skriver ut curls kod på stdout INNAN
curl avgör sitt exit-status. Faller curl efteråt (timeout, connection
reset) körs `|| echo 000` också, och de två utdatorna slås ihop till en
sträng som "000000" — varken en giltig HTTP-kod eller ett tomt svar.**
Mätt S120 Del 2 (endpoint-vakt under CI-incidenten med npm:s
advisory-endpoint,
`tasks/sessions/2026-09-04-session-120.md` rad ~231–233): vakten gav ett
falskt larm eftersom den sammanslagna strängen inte matchade något av de
förväntade fallen. Regel: fånga utdatan i en variabel
(`kod=$(curl -w '%{http_code}' -o /dev/null -s ...); status=$?`) och
matcha explicit mot ett mönster som `^[0-9]{3}$` innan den tolkas — blanda
aldrig curls egen stdout-kod med en fallback-`echo` i samma pipeline.
