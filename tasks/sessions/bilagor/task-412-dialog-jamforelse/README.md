# TASK-412 — importdialogens tredje granskningsvarv

Skärmdumpar tagna LIVE mot en riktig `npm run dev`-rendering (port 5173, mockad
Supabase-data via `page.route`, ingen skarp data rörd), inte ögonmätta.

- `task412-dialog-steg1-val.png` — steg 1 (filväljaren), 900×1100.
- `task412-dialog-steg2-mappning.png` — steg 2 (kolumnmappningen, okänt
  filformat), 900×1100.
- `task412-dialog-angra-jamforelse.png` — Ångra-dialogen
  (`RegistreratNuBlock.tsx`), samma skala (900×1100), för jämförelse av
  anatomi (rubrik/kropp/actions-rad).
- `task412-narrow-320.png` — steg 1 vid 320 px bredd: actions-raden
  (Avbryt / Ladda upp fil) radbryter, mätt bevis för kravet "actions-raden
  får radbryta".
- `task412-narrow-820.png` — steg 1 vid 820 px bredd (iPad-referens):
  dialogen (`size="lg"`, 576 px) håller sig långt innanför viewporten.
- `task412-ikon-fore-strokewidth2.png` / `task412-ikon-efter-strokewidth4.png`
  — ⋯-knappen mot tratten, 3× zoom (`deviceScaleFactor`), samma knapp,
  före/efter `strokeWidth`-höjningen (varv 3, granskningsserverns fynd om
  ikonstorleken).
