# Vocab Invaders

Ein Vokabel-Spiel für den Englischunterricht im Stil von Space Invaders.

Von oben schweben Wörter herab. Das Schiff schießt die richtige deutsche Übersetzung ab, bevor sie den Boden erreicht. Das Spiel dient zum Wiederholen und Üben, nicht zum Einführen neuer Vokabeln.

## Spielen

- Im Browser öffnen, am Schul-iPad (Safari, Querformat) oder am PC.
- Auf dem iPad als Verknüpfung auf den Home-Bildschirm legen (Vollbild).
- **PC:** Pfeiltasten oder A/D bewegen, Leertaste schießt, Esc pausiert, M schaltet den Ton.
- **PC, Titelbild:** Pfeiltasten oder A/D wählen die Schwierigkeit (Langsam / Normal / Schnell), Leertaste startet.
- **iPad:** Steuerkreuz links unten, Feuer-Taste rechts unten, Pause-Taste oben in der Mitte; das Tempo wird auf dem Titelbild gewählt.
- Oben links zeigen ✔ und ✘ die richtigen und falschen Treffer der Runde.
- Nach einem Fehler zeigt „Merke“ kurz die richtige Übersetzung.
- Am Ende der Runde erscheint die Liste „Diese Wörter üben“ zur Nachbesprechung.
- Ton ist standardmäßig aus.

## Technik

- Reines HTML, CSS und JavaScript (Grafik in `js/grafik.js`, Spielcode in `js/spiel.js`, Vokabeln in `js/wortlisten.js`)
- Kein Server, keine externen Bibliotheken, kein Build-Schritt
- Hosting über GitHub Pages
- Es werden keine Daten gespeichert oder gesendet

## Status

Alle Meilensteine sind umgesetzt und spielbar: Schiff, Bewegung, Schuss, Wellen mit steigendem Tempo, Leben, Punkte, Titelbild, Pause, Touch-Steuerung, Ton (Standard aus) und Tempo-Einstellung – mit Vokabeln aus "Let's go English 2" (6. Klasse, Units 1–8). Der Stand und die offenen Fragen stehen in `AGENTS.md`.
