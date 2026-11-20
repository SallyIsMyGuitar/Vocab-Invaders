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

- **Zielgruppe:** Klassenstufe 7. Das Spiel dient der Wiederholung von Vokabeln aus JGST 5 und 6.
- **Wortlisten:** Vokabeln aus `js/wortlisten.js` (Quelle: PDF "Let's go English 2 – alle Vokabeln, 6. Klasse", Units 1–8). Eine Liste für JGST 5 liegt noch nicht vor (offen).

## Projektstand

- Stand: Meilensteine 1–4 sind umgesetzt und spielbar (Schiff, Bewegung, Schuss, Wellen mit steigendem Tempo, Leben, Punkte, Titelbild, Pause, Touch-Steuerung fürs iPad, Ton, Lesbarkeit, Tempo-Einstellung).
- Dateien: `index.html`, `css/style.css`, `js/spiel.js` (Spiellogik), `js/grafik.js` (Darstellung), `js/wortlisten.js` (Vokabeln).
- Überarbeitung nach Analyse (Stufen A–C) umgesetzt: Fehler behoben, Richtig/Falsch-Zähler, Tempo sanfter, Hinweis „Merke“ nach Fehlern, Grafik getrennt.

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
- Antwortform: Auswahl aus vier festen Übersetzungen, eine davon richtig
- Tempo: moderat und langsam steigend (siehe Abschnitt „Tempo und Fehlerstatistik“)

## Tempo und Fehlerstatistik (Entscheidung)

- **Tempo/Zeitdruck:** moderat. Die Wörter sinken langsam, pro Welle wird das Tempo nur leicht erhöht. Kein harter Countdown,
  damit im Unterricht genug Zeit zum Nachdenken bleibt.
- **Fehlerstatistik:** keine dauerhafte Speicherung. Während des Spiels zählt der Bildschirm richtige und falsche Treffer (✔/✘ in großer Schrift),
  am Ende der Runde erscheint eine Liste der verfehlten Wörter für die Nachbesprechung im Unterricht.
- Kein Local Storage, kein Spielstand-Code (zugunsten der Einfachheit entfallen).

## Meilensteine

Gebaut wird immer nur der Meilenstein, den der Nutzer freigibt, mit Test nach jedem Schritt.

1. Grundgerüst: Schiff, Bewegung, Schuss, eine Testwelle mit Wörtern aus der Wortliste. – **fertig**
2. Wellen, Leben, Punkte: Welle 1 startet mit 5 Wörtern, jede weitere mit einem Wort mehr und etwas schnellerem Tempo; 3 Leben (falscher Treffer oder Wort erreicht den Boden kostet ein Leben); 10 Punkte pro Treffer plus Tempo-Bonus. – **fertig**
3. Steuerung auf dem iPad, Pause, Titelbild: halbtransparentes Steuerkreuz links unten und Feuertaste rechts unten (erscheinen beim ersten Tipp), Pause-Taste oben sowie Esc, Titelbild mit Start per Tipp oder Leertaste. – **fertig**
4. Feinschliff: Ton (Web Audio, Standard aus, Umschalten per M oder Tippen aufs Lautsprecher-Symbol), Lesbarkeit (Text passt sich Schildbreite an, hellere Schilder), Tempo-Einstellung (Langsam/Normal/Schnell auf dem Titelbild). – **fertig**

## Offene Fragen (vor der Umsetzung mit dem Nutzer klären)

- Klassenstufe und Vokabelumfang
- Wortliste für JGST 5 (die vorliegende PDF deckt nur Klasse 6 ab)
- Antwortform (Auswahl oder Eingabe)
