---
id: TASK-411
title: >-
  Fynd: inkorgens markerade kort ska bära hela gröna plattan som
  bekräftelsesteget och eventdetaljer — success-notisen i kortet får vit
  bakgrund, grön kontur och grön ikon
status: To Do
assignee: []
created_date: '2026-09-06 09:25'
labels:
  - ready-for-agent
dependencies: []
ordinal: 713000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Marcus prod-granskning 2026-09-06 (S121 resume 4, QA-vandringen TASK-402.7 påbörjad i prod): markeringen på inkorgens kort är inte samma gröna som på bekräftelsesteget; bekräftelsesteget har rätt grön, och rätt är samma som eventdetaljer. Mätt: inkorgen bär --mm-betalningskort-markerad-bg = color-mix(--mm-success-bg 50 %, --mm-surface) ≈ #f8fefa (src/styles/tokens/components.css:313) medan bekräftelsesteget (VariantC.tsx:180–186) och eventdetaljernas MarkerbartKort (src/components/events/detail/Deltagare.tsx:1053–1055) bär hela --mm-success-bg = #f0fdf4; kanten --mm-success = #606b57 är identisk i alla tre. Utspädningen är Marcus dom 2026-09-01 (kommentarblocket components.css:289–312): success-notisen i det öppna kortet (MessageBox intent success, --mm-messagebox-success-bg = --mm-success-bg, samma hex) blev osynlig mot ett markerat kort i samma gröna. Marcus beslut 2026-09-06 som löser spänningen: kortet får hela plattan, och success-notisen i kortet får VIT bakgrund (--mm-surface), behåller den gröna konturen (--mm-messagebox-success-border = --mm-success, plus konsumentens border-y border-r) och ikonen i samma gröna som konturen (--mm-messagebox-success-text = --mm-success, redan så — verifiera). SCOPE: ändra INTE MessageBox-primitiven eller de globala messagebox-tokens (~30 konsumenter, ADR-103 B2-låst form) — den vita bakgrunden sätts hos konsumenten i src/components/betalningar/RegistreraForm.tsx (rad ~759–787, samma ställe som border-y border-r), och bara för success-utfallet om inte Marcus säger annat. Kortets platta: sätt --mm-betalningskort-markerad-bg till var(--mm-success-bg) (eller riv tokenen till förmån för --mm-success-bg) och skriv om kommentarblocket i components.css så att 2026-09-01-beslutet och dess upphävande 2026-09-06 båda står kvar — aldrig tyst rivning. RegistreraForm är det delade formuläret, så notisens vita bakgrund följer med in i bekräftelsestegets öppna kort — bokför om någon facit-bild i s121-bekraftelsesteget-konvergens visar notisen (AMENDERING per ADR-102), annars notera att ingen gör det. Inkorgen har inget facit-lås. Kontrast räknas om (WCAG 1.4.11: #606b57 mot vitt och mot #f0fdf4, båda ≥ 3:1 — bokför talen) och contrast-more-läget kontrolleras.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inkorgens markerade kort bär samma bakgrund som bekräftelsestegets och eventdetaljernas markerade kort (mätt token/hex bokfört i kortet); kanten oförändrad
- [ ] #2 Success-notisen i det öppna kortet har vit bakgrund, grön kontur runt om och grön ikon; kontrasttalen mot vitt bokförda; övriga MessageBox-konsumenter oförändrade (primitiven och de globala tokens orörda)
- [ ] #3 Kommentarblocket för --mm-betalningskort-markerad-bg i components.css beskriver både 2026-09-01-beslutet och Marcus omprövning 2026-09-06 med skälet
- [ ] #4 Befintliga acceptans-/visual-tester gröna; ett test eller en bild täcker notisen i ett markerat kort; eventuell facit-bild för bekräftelsesteget som visar notisen amenderad, annars bokfört att ingen gör det
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Alla acceptanskriterier avbockade (task edit --check-ac)
- [ ] #2 Rörd fil-klass lokala grindar gröna (L147)
- [ ] #3 Inga orelaterade filer i diffen (path-scopad add)
<!-- DOD:END -->
