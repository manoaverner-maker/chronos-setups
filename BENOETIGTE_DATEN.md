# Benötigte Daten — ASPL Racing Setup-App

Damit die Website über alle Autos vollständig wird, brauche ich von dir Folgendes.
**Format pro Setup — am besten so (in dieser Reihenfolge der Präferenz):**

1. **Die echte ACC-`.json`-Setup-Datei** (aus `Documents/Assetto Corsa Competizione/Setups/<auto>/<strecke>/…`). → perfekt & vollständig.
2. **Saubere Screenshots** der 6 Setup-Seiten — **wichtig:** die **TEMPERATUR-Leiste oben muss sichtbar sein** (Luft + Strecke), und das **Live-Dashboard darf den hinteren Mechanik-Block nicht verdecken** (kurz aus der Fahransicht ins Setup-Menü, ohne Telemetrie-Overlay).

> Warum: Die Referenztemperatur ist Pflicht für die Reifendruck-Berechnung. Genau daran sind NBR GP + NBR 24h gescheitert (Temperatur nicht im Bild, hintere Box verdeckt).

---

## Setup-Matrix (Stand heute)

| Auto | Imola | Kyalami | NBR 24h | NBR GP | Spa | Valencia |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **Ferrari 296 GT3** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Mercedes-AMG GT3 Evo** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Aston Martin V8 Vantage AMR GT3** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

✅ = fertig & live · ❌ = wird benötigt

### Konkret benötigt
- [ ] **Ferrari 296 GT3 – NBR 24h** (Teildaten vorhanden, siehe `_NBR_pending.md`)
- [ ] **Ferrari 296 GT3 – NBR GP** (Teildaten vorhanden)
- [ ] **Mercedes-AMG GT3 Evo** – alle 6 Strecken
- [ ] **Aston Martin V8 Vantage AMR GT3** – alle 6 Strecken

→ insgesamt **14 Setups** (2 Ferrari + 6 Mercedes + 6 Aston)

---

## Referenzzeiten (separat)
Aktuell stehen **alle Referenzzeiten auf „—"** (ich erfinde keine). Pro Auto × Strecke je 4 Tiers:

- [ ] **Alien**, **Pro**, **Pro-Am**, **Am** — Rundenzeit im Format `1:39.812`

Reicht auch unvollständig (z. B. nur „Pro" pro Strecke) — fehlende bleiben „—".

---

## Optional (verbessert die Optik, nicht zwingend)
- [ ] **Echte Streckenlayouts** als SVG (aktuell stilisierte Platzhalter)
- [ ] **Auto-/Team-Bilder & Logos** (Chronos Motorsport / Omega / Academy, Sponsoren) — aktuell eigene Silhouetten/Text. **Keine** Hersteller-Pressefotos (Urheberrecht).

---

## Offene Frage
- Der Ordner **„BMW M4 GT3"** war leer und das Auto steht **nicht** im Prompt (dort: Ferrari, Mercedes, Aston). → Soll BMW M4 GT3 als **viertes Auto** rein? Wenn ja, brauche ich auch dafür Setups.
