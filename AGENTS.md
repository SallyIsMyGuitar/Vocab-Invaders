# Projektanweisung: Vocab Invaders

Diese Anweisung gilt dauerhaft für alle Arbeiten in diesem Projekt. Lies sie vor jedem Schritt. Die Projektbeschreibung für Nutzer steht in `README.md`. Beide Dateien bleiben synchron: Ändert sich der Umfang oder die Steuerung, wird das README mit angepasst.

## Arbeitsregeln

- **Nichts ohne Go:** Baue nur, was der Nutzer ausdrücklich für den aktuellen Meilenstein freigegeben hat. Entscheide nichts auf Verdacht.
- Bei Unklarheiten fragst du nach, statt Annahmen zu treffen. Vor größeren Änderungen legst du zuerst ein kurzes Konzept mit konkreten Fragen vor.
- Arbeite in kleinen Schritten. Nach jedem Schritt erklärst du kurz, was geändert wurde und wie der Nutzer es testet. Weiter geht es erst nach seiner Rückmeldung.
- Ändere nur, was für den aktuellen Schritt nötig ist. Bestehende, getestete Teile bleiben unberührt.
- Schreibe klaren, gut kommentierten Code (Kommentare auf Deutsch) ohne unnötige Komplexität.
- **Keine externen Bibliotheken, keine externen Schriften, keine Build-Werkzeuge, kein Server.**
- Kommuniziere auf Deutsch, knapp und direkt.
- **Datenschutz:** Das Spiel sammelt und sendet keine Daten. Es werden keine echten Namen gespeichert oder angezeigt. Figuren tragen Rollenbezeichnungen, keine echten Namen.
- **Git:** Gearbeitet wird direkt auf `main` (keine Arbeitszweige). Nach jedem freigegebenen Schritt wird auf `main` gepusht. GitHub Pages veröffentlicht von `main` automatisch.
- Halte diese Datei und `README.md` aktuell: Wenn der Nutzer neue Regeln, Wortlisten oder Entscheidungen freigibt, schlage eine passende Ergänzung vor.

## Ziel und Rahmen

Ein Vokabel-Spiel für den Englischunterricht im Stil des Klassikers Space Invaders. Das Spiel dient zum Üben und Wiederholen, nicht zum Einführen. Die Lehrkraft führt die Vokabeln im Unterricht ein.

- **Zielgruppe:** offen (Klassenstufe und Umfang der Vokabeln)
- **Wortlisten:** offen (Lehrwerk, Lektionen, Format Englisch–Deutsch)

## Projektstand

- Stand: Konzeptphase. Es gibt noch keinen spielbaren Code.
- Geplante Dateien für den Prototyp: `index.html`, `css/style.css`, `js/spiel.js` (Spielschleife), `js/wortlisten.js` (Vokabeln), `js/speichern.js` (Local Storage).

## Spielidee (Konzept „Vokabel-Abschuss“)

- Von oben schweben Wesen herab, die jeweils ein englisches Wort tragen.
- Darunter stehen die deutschen Übersetzungen als Zielscheiben.
- Das Schiff unten bewegt sich links und rechts und schießt die richtige Übersetzung ab.
- Pro Welle erscheinen mehrere Wörter, nur eine Übersetzung pro Wort ist richtig.
- Richtiger Treffer: Punkt, das Wort verschwindet.
- Falscher Treffer oder ein Wort erreicht den Boden: ein Leben weniger.
- Nach jeder Welle folgt die nächste, schneller und mit mehr Wörtern.

## Plattform und Technik

- **Zielgerät:** Schul-iPads mit Safari, Touch-Steuerung, Querformat. Zusätzlich Tastatursteuerung am PC.
- **Hosting:** GitHub Pages. Als Verknüpfung auf dem Home-Bildschirm nutzbar (Vollbild).
- **Aufbau:** HTML, CSS und getrennte JavaScript-Dateien per Script-Tags. Kein Build-Schritt, kein Bundler.
- **Grafik:** komplett per Code gezeichnete Pixelgrafik (Canvas). Die Grafik bleibt getrennt vom Spielcode, damit sie später ersetzt werden kann.
- **Ton:** kurze Soundeffekte per Web Audio für richtig, falsch und Welle geschafft. Ton ist standardmäßig aus.
- **Lesbarkeit:** große, klare Schrift. Richtig und falsch nie nur über Farbe, sondern zusätzlich mit Haken und Kreuz.

## Steuerung

- **Bewegen:** Pfeiltasten oder A/D (PC). Auf dem iPad halbtransparentes Steuerkreuz links unten.
- **Feuer:** Leertaste oder Enter (PC). Auf dem iPad eine große runde Taste rechts unten.
- **Pause:** Esc (PC). Auf dem iPad eigene Taste.
- Touch-Tasten großzügig gestaltet, Safe-Area beachten.

## Eingabe und Wortlisten

- Die Wörter stehen in eigenen Dateien (`js/wortlisten.js`), getrennt vom Spielcode.
- Pro Welle ein Wort-Set. Richtige und falsche Übersetzungen werden zufällig gemischt.
- Antwortform: offen (Auswahl aus festen Übersetzungen oder Eingabe)
- Zahlen, Zeitdruck und Tempo: offen

## Speichern

- Automatisch im Local Storage (Schlüssel `vocab-invaders-v1`): Highscore, Fehlerstatistik je Wort, zuletzt gespielte Welle.
- Zusätzlich ein Spielstand-Code als kompakter Text zum Kopieren, damit die Lehrkraft den Stand einsehen kann. Keine Übertragung von Daten.
- Offen: Ob die Fehlerstatistik je Wort angezeigt wird.

## Meilensteine

Gebaut wird immer nur der Meilenstein, den der Nutzer freigibt, mit Test nach jedem Schritt.

1. Grundgerüst: Schiff, Bewegung, Schuss, eine Testwelle mit Beispielwörtern. – **offen**
2. Wellen, Leben, Punkte, Wortlisten-Datei. – **offen**
3. Steuerung auf dem iPad, Pause, Titelbild. – **offen**
4. Speichern, Highscore, Spielstand-Code. – **offen**
5. Feinschliff: Ton, Lesbarkeit, Tempo-Einstellungen. – **offen**

## Offene Fragen (vor der Umsetzung mit dem Nutzer klären)

- Klassenstufe und Vokabelumfang
- Herkunft der Wortlisten
- Antwortform (Auswahl oder Eingabe)
- Zeitdruck und Tempo
- Gerät und Spielstand-Code
