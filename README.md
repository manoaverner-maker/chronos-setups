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
- **Was noch fehlt:** siehe [BENOETIGTE_DATEN.md](BENOETIGTE_DATEN.md).

## Status

- ✅ Backend (Parser, Druck-Engine, Slider-Engine, API) — getestet
- ✅ Frontend (3 Features, Design, responsiv, Animationen)
- ✅ Setups: Ferrari 296 GT3 — Imola, Kyalami, Spa, Valencia
- ⏳ Offen: Ferrari NBR 24h + NBR GP, Mercedes-AMG, Aston Martin, Referenzzeiten

## Designprinzipien (aus dem Prompt)

- Deterministische, physikalisch hergeleitete Berechnungen — **keine** erfundenen Werte.
- Fehlende Daten werden ehrlich als „—" / „in Transkription" ausgewiesen.
- Reifendruck als Anzeige-psi gespeichert (transkribiert), nicht als rohes ACC-Klick-Encoding;
  bei echten `.json`-Dateien kann eine Decode-Schicht ergänzt werden.
- Keine Hersteller-Pressefotos (Urheberrecht) — eigene Silhouetten/Platzhalter.
