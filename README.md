# ASPL Racing — ACC Setup & Referenz-Web-App

Web-App für das Chronos Motorsport Team / ASPL Racing (`asplracing.com`).
Kombiniert hinterlegte Baseline-Setups mit temperaturbasierter Reifendruck-Berechnung,
einem Safe/Aggressiv-Slider und Streckenreferenzen.

**Live:** https://manoaverner-maker.github.io/chronos-setups/

## Schnellstart (lokal)

Node ist lokal installiert (`~/.local/node`, im Terminal bereits im PATH).
Das Frontend läuft **ohne** Backend — die Daten werden beim Start aus `/data` eingebacken:

```bash
cd "aspl-racing-app/client" && npm install && npm run dev
```

Dann **http://localhost:5173** öffnen.

Das Express-Backend in `server/` wird nicht mehr benötigt (die Berechnungen liegen
zusätzlich in `client/src/lib/`), kann aber weiterhin separat gestartet werden.

## Deployment

Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`) baut den Client und
veröffentlicht ihn auf GitHub Pages. Neue Setups also einfach als JSON unter
`data/setups/…` committen — der Rest passiert automatisch.

```bash
git add -A && git commit -m "Neues Setup" && git push
```

Der Pages-Unterpfad (`/chronos-setups/`) kommt über die Env-Variable `APP_BASE` in den
Build; lokal bleibt der Base-Pfad `/`.

## Architektur

```
aspl-racing-app/
  server/         Node + Express. Liest /data, REST-API, chokidar-Hot-Reload.
    src/engine/   pressureEngine.js (Druck) · adjustmentEngine.js (Slider)
    src/lib/      dataStore.js (Laden/Beobachten) · setupUtils.js
    src/routes/   api.js  (/api/cars · /tracks · /setups/:car/:track …)
  client/         React + Vite + Tailwind + Framer Motion + React Query
    src/pages/    CarSelect · Calendar · SetupDetail
    src/components/  TrackHero · TempControls · PressurePanel · SafetySlider · …
  data/
    setups/<auto>/<strecke>/baseline_<temp>c.json   echte Setups (Anzeigewerte)
    config/       cars.json · tracks.json · reference_times.json
                  pressure_model.json · setup_adjustments.json
    images/       cars · tracks  (eigene/lizenzfreie Bilder)
```

## Daten ergänzen

- **Neues Setup:** JSON nach `data/setups/<auto>/<strecke>/baseline_<lufttemp>c.json` legen
  (Schema: siehe `imola/baseline_21c.json`). Erscheint dank Filewatcher **ohne Neustart**.
- **Referenzzeiten:** in `data/config/reference_times.json` eintragen (`null` = „—").
- **Meisterschaftstabellen:** Tabelle kopieren, in `data/standings_paste.txt` einfügen und
  `node scripts/import_standings_paste.mjs` laufen lassen. Abschnittszeilen steuern das Ziel:
  `Solo Series:` · `Team Series:` · `Teamwertung:` — steht **Endstand** im Titel, gilt die Tabelle
  als final und der Erste wird als Champion hinterlegt (die App blendet ihn dann animiert ein).
  Erkannt werden die Plattform-Ansicht mit Rundenspalten und schlichte `Platz⇥Name⇥Punkte`-Zeilen.
- **Team-Meisterschaft von der Website:** `node scripts/import_aspl_standings.mjs --tables=teams`
  liest sie aus dem Ergebnis-Abschnitt von `asplracing.com`. Ein bereits hinterlegter Endstand wird
  dabei nicht überschrieben (`--force`, wenn doch).
- **Andere Saison:** beide Importer nehmen `--season=3`; ohne Angabe schreiben sie in `currentSeason`.
- **Neue Saison:** Eintrag in `data/config/seasons.json` (Kalender) **und** in
  `data/config/standings.json` (Wertung) anlegen — beide führen eine Liste `seasons`.
  `status`: `final` · `live` · `geplant`. Beide Dateien haben ein eigenes `currentSeason` — der
  Kalender steht auf der laufenden Saison, die Wertung bleibt auf der letzten mit Ergebnissen,
  bis die neue Saison eigene Tabellen hat.
- Kader, Punktesystem und Teamleitung stehen in keiner Quelle und werden je Saison von Hand
  gepflegt; die Importer fassen sie nicht an.

## Status

- ✅ Backend (Parser, Druck-Engine, Slider-Engine, API) — getestet
- ✅ Frontend (3 Features, Design, responsiv, Animationen)
- ✅ Setups: Ferrari 296 GT3 — Imola, Kyalami, Spa, Valencia
- ✅ Saison 2 abgeschlossen: Solo-Champion E. Sprott, Teammeister Golden Dynasty
- ✅ Saison 3: Rennkalender für Team- und Solo-Series eingetragen (8 Rennen, ab 16.09.2026),
  alle acht Strecken haben für jedes Auto Setups
- ⏳ Saison 3: Wertung folgt nach dem ersten Rennen
- ⏳ Offen: Ferrari NBR 24h + NBR GP, Mercedes-AMG, Aston Martin, Referenzzeiten

## Designprinzipien (aus dem Prompt)

- Deterministische, physikalisch hergeleitete Berechnungen — **keine** erfundenen Werte.
- Fehlende Daten werden ehrlich als „—" / „in Transkription" ausgewiesen.
- Reifendruck als Anzeige-psi gespeichert (transkribiert), nicht als rohes ACC-Klick-Encoding;
  bei echten `.json`-Dateien kann eine Decode-Schicht ergänzt werden.
- Keine Hersteller-Pressefotos (Urheberrecht) — eigene Silhouetten/Platzhalter.
