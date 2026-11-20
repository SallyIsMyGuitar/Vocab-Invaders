// Vocab Invaders – Grafik
// Zeichnet die ganze Szene per Code auf das Canvas (Pixelgrafik, keine Bilddateien).
//
// Diese Datei kennt keine Spielregeln und verändert keinen Spielzustand.
// Der Spielcode (js/spiel.js) übergibt bei jedem Bild eine „Ansicht“ mit den
// aktuellen Werten. So lässt sich die Grafik später ersetzen, ohne die Logik anzufassen.

const Grafik = (() => {
  "use strict";

  // ---------- Maße ----------
  // Spielfeld in logischen Pixeln. Der Spielcode nutzt dieselben Werte für die
  // Tipp-Erkennung, damit Anzeige und Tippflächen immer übereinstimmen.
  const BREITE = 900;
  const HOEHE = 600;
  const SCHILD_BREITE = 200;   // breite Kachel als Zielscheibe
  const SCHILD_HOEHE = 56;

  // Bedienflächen auf dem iPad (Rechtecke: x, y, b = Breite, h = Höhe; Kreise: x, y, r)
  const BEDIENUNG = {
    links:  { x: 30,  y: 450, b: 100, h: 120 }, // Steuerkreuz: Pfeil links
    rechts: { x: 150, y: 450, b: 100, h: 120 }, // Steuerkreuz: Pfeil rechts
    feuer:  { x: 790, y: 510, r: 65 },          // Feuer-Taste rechts unten
    pause:  { x: 420, y: 14,  b: 60, h: 44 },   // Pause-Taste oben in der Mitte
    ton:    { x: 740, y: 28,  r: 26 },          // Lautsprecher-Symbol oben rechts
  };

  // Tempo-Schaltflächen auf dem Titelbild, nebeneinander zentriert (i = Index 0, 1, 2).
  function tempoRechteck(i) {
    const b = 190, h = 56, abstand = 20;
    return { x: BREITE / 2 - (b * 3 + abstand * 2) / 2 + i * (b + abstand), y: 470, b, h };
  }

  // ---------- Schrift ----------
  const SCHRIFT = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  let ctx = null; // wird bei jedem Bild aus zeichne() übernommen

  // Setzt Schriftgröße und optional „bold“.
  function schrift(groesse, stil) {
    ctx.font = (stil ? stil + " " : "") + groesse + "px " + SCHRIFT;
  }

  // Verkleinert die Schrift, bis der Text in maxBreite passt (Untergrenze 12 px).
  function schriftPassend(text, maxBreite, groesse, stil) {
    let g = groesse;
    schrift(g, stil);
    const messung = ctx.measureText(text);
    const breite = messung && typeof messung.width === "number" ? messung.width : 0;
    if (breite > maxBreite) {
      g = Math.max(12, Math.floor(g * maxBreite / breite));
      schrift(g, stil);
    }
  }

  // Bricht einen Text auf höchstens zwei Zeilen, damit er auf ein Schild passt.
  // Reicht auch das nicht, wird die Schrift Schritt für Schritt kleiner (nie unter 14 px).
  // Ergebnis: { zeilen: [...], groesse } – die Schrift ist danach bereits gesetzt.
  function textUmbrechen(text, maxBreite, groesse) {
    for (let g = groesse; g >= 14; g--) {
      schrift(g);
      if (ctx.measureText(text).width <= maxBreite) return { zeilen: [text], groesse: g };
      // Zweizeilig: den Umbruch wählen, bei dem die längere Zeile am kürzesten ist
      const woerter = text.split(" ");
      let beste = null;
      for (let k = 1; k < woerter.length; k++) {
        const a = woerter.slice(0, k).join(" ");
        const b = woerter.slice(k).join(" ");
        const wa = ctx.measureText(a).width;
        const wb = ctx.measureText(b).width;
        if (wa <= maxBreite && wb <= maxBreite) {
          const laengste = Math.max(wa, wb);
          if (!beste || laengste < beste.laengste) beste = { zeilen: [a, b], laengste };
        }
      }
      if (beste) return { zeilen: beste.zeilen, groesse: g };
    }
    schrift(14);
    return { zeilen: [text], groesse: 14 };
  }

  // ---------- Bildteile ----------
  function zeichneHintergrund(a) {
    ctx.fillStyle = "#101024";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    // Sternenfeld: feste Punkte, damit nichts flackert
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5) % BREITE;
      const y = (i * 89.3) % (a.schildY - 40);
      ctx.fillStyle = i % 3 === 0 ? "#8888aa" : "#555577";
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Blockartiges Pixel-Wesen in der Mitte, darüber das englische Wort
  function zeichneWesen(a) {
    if (!a.aufgabe) return;
    const x = BREITE / 2;
    const y = a.wesenY;
    ctx.fillStyle = "#7bd844";
    ctx.fillRect(x - 20, y - 14, 40, 28);
    ctx.fillRect(x - 28, y - 4, 56, 8);
    ctx.fillStyle = "#101024";
    ctx.fillRect(x - 12, y + 14, 8, 6);
    ctx.fillRect(x + 4, y + 14, 8, 6);

    ctx.fillStyle = "#ffffff";
    schriftPassend(a.aufgabe.wort.en, 500, 30, "bold");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.aufgabe.wort.en, x, y - 34);
  }

  // Antwort-Schilder: Text umbrechen statt stark verkleinern; Haken/Kreuz über dem getroffenen Schild
  function zeichneSchilder(a) {
    if (!a.aufgabe) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    a.aufgabe.antworten.forEach((antwort, i) => {
      const links = antwort.x - SCHILD_BREITE / 2;
      const oben = a.schildY - SCHILD_HOEHE / 2;
      ctx.fillStyle = "#32325e";
      ctx.fillRect(links, oben, SCHILD_BREITE, SCHILD_HOEHE);
      ctx.strokeStyle = "#6666aa";
      ctx.strokeRect(links, oben, SCHILD_BREITE, SCHILD_HOEHE);

      ctx.fillStyle = "#ffffff";
      const { zeilen, groesse } = textUmbrechen(antwort.de, SCHILD_BREITE - 20, 21);
      schrift(groesse);
      const zeilenHoehe = groesse * 1.15;
      zeilen.forEach((zeile, j) => {
        ctx.fillText(zeile, antwort.x, a.schildY + (j - (zeilen.length - 1) / 2) * zeilenHoehe);
      });

      // Haken oder Kreuz direkt über dem Schild – nicht nur Farbe
      if (a.trefferZeigen && a.trefferZeigen.index === i) {
        schrift(34, "bold");
        ctx.fillStyle = a.trefferZeigen.richtig ? "#7bd844" : "#ff6b6b";
        ctx.fillText(a.trefferZeigen.richtig ? "✔" : "✘", antwort.x, a.schildY - 36);
      }
    });
  }

  // Hinweis nach einem Fehler: die richtige Übersetzung, unter der Schildreihe.
  // Mit dem Wort „Merke“ als Text, nicht nur durch Farbe gekennzeichnet.
  function zeichneHinweis(a) {
    if (!a.hinweis) return;
    const y = a.schildY + SCHILD_HOEHE / 2 + 26;
    const text = "Merke: " + a.hinweis.en + " = " + a.hinweis.de;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    schriftPassend(text, 560, 24, "bold");
    const breite = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(16, 16, 36, 0.85)";
    ctx.fillRect(BREITE / 2 - breite / 2 - 12, y - 18, breite + 24, 36);
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText(text, BREITE / 2, y);
  }

  function zeichneSchiff(a) {
    const x = a.schiff.x;
    const y = a.schiff.y;
    ctx.fillStyle = "#ffcc4d";
    ctx.fillRect(x - a.schiff.breite / 2, y, 20, 8);
    ctx.fillRect(x + a.schiff.breite / 2 - 20, y, 20, 8);
    ctx.fillRect(x - 22, y + 8, 44, 16);
    ctx.fillStyle = "#ff9d2e";
    ctx.fillRect(x - 10, y + 24, 20, 6);
  }

  function zeichneSchuss(a) {
    if (!a.schuss) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(a.schuss.x - 2, a.schuss.y - 12, 4, 12);
  }

  function zeichneExplosion(a) {
    if (!a.explosion) return;
    // sternförmig auseinanderfliegende Pixel
    for (let i = 0; i < 8; i++) {
      const winkel = (Math.PI / 4) * i;
      const r = (0.6 - a.explosion.zeit) * 120;
      ctx.fillStyle = a.explosion.zeit > 0.3 ? "#7bd844" : "#ff6b6b";
      ctx.fillRect(
        a.explosion.x + Math.cos(winkel) * r,
        a.explosion.y + Math.sin(winkel) * r,
        6, 6
      );
    }
  }

  // Halbtransparente Tasten mit dickem Umriss (Touch, iPad)
  function zeichneTouchTasten(a) {
    if (!a.touchModus) return;
    ctx.globalAlpha = 0.4;

    // Steuerkreuz links unten: Pfeil links
    const l = BEDIENUNG.links;
    ctx.fillStyle = a.touchAktiv("links") ? "#8888aa" : "#ffffff";
    ctx.fillRect(l.x, l.y, l.b, l.h);
    ctx.fillStyle = "#101024";
    ctx.beginPath();
    ctx.moveTo(70, 480);
    ctx.lineTo(45, 510);
    ctx.lineTo(70, 540);
    ctx.closePath();
    ctx.fill();

    // Pfeil rechts
    const r = BEDIENUNG.rechts;
    ctx.fillStyle = a.touchAktiv("rechts") ? "#8888aa" : "#ffffff";
    ctx.fillRect(r.x, r.y, r.b, r.h);
    ctx.fillStyle = "#101024";
    ctx.beginPath();
    ctx.moveTo(210, 480);
    ctx.lineTo(235, 510);
    ctx.lineTo(210, 540);
    ctx.closePath();
    ctx.fill();

    // Feuer-Taste rechts unten: großer Kreis
    const f = BEDIENUNG.feuer;
    ctx.fillStyle = a.touchAktiv("feuer") ? "#8888aa" : "#ffffff";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101024";
    schrift(26, "bold");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FEUER", f.x, f.y);

    // Pause-Taste oben in der Mitte (zwei Balken)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(BREITE / 2 - 18, 22, 10, 28);
    ctx.fillRect(BREITE / 2 + 8, 22, 10, 28);

    ctx.globalAlpha = 1;
  }

  function zeichneTitel(a) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Pixel-Wesen über dem Titel
    ctx.fillStyle = "#7bd844";
    ctx.fillRect(BREITE / 2 - 30, 130, 60, 40);
    ctx.fillRect(BREITE / 2 - 42, 144, 84, 12);
    ctx.fillStyle = "#101024";
    ctx.fillRect(BREITE / 2 - 16, 162, 12, 10);
    ctx.fillRect(BREITE / 2 + 6, 162, 12, 10);

    ctx.fillStyle = "#ffcc4d";
    schrift(64, "bold");
    ctx.fillText("VOCAB INVADERS", BREITE / 2, 260);
    ctx.fillStyle = "#ffffff";
    schrift(26);
    ctx.fillText("Vokabeln aus Klasse 6 – richtig übersetzt abgeschossen", BREITE / 2, 320);

    ctx.fillStyle = "#8888aa";
    schrift(24);
    ctx.fillText("Tippen oder Leertaste zum Starten", BREITE / 2, 400);
    ctx.fillText("Pfeiltasten bewegen · Leertaste schießt · Esc pausiert · M schaltet Ton", BREITE / 2, 438);

    // Tempo-Einstellung: drei Schaltflächen, die gewählte ist hervorgehoben
    schrift(24, "bold");
    a.tempoNamen.forEach((name, i) => {
      const r = tempoRechteck(i);
      const gewaehlt = name === a.tempoName;
      ctx.fillStyle = gewaehlt ? "#ffcc4d" : "#2a2a52";
      ctx.fillRect(r.x, r.y, r.b, r.h);
      ctx.strokeStyle = "#6666aa";
      ctx.strokeRect(r.x, r.y, r.b, r.h);
      ctx.fillStyle = gewaehlt ? "#101024" : "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((gewaehlt ? "✔ " : "") + name, r.x + r.b / 2, r.y + r.h / 2);
    });

    // Pixelschiff als Deko unten
    ctx.fillStyle = "#ffcc4d";
    ctx.fillRect(BREITE / 2 - 35, 500, 20, 8);
    ctx.fillRect(BREITE / 2 + 15, 500, 20, 8);
    ctx.fillRect(BREITE / 2 - 22, 508, 44, 16);
    ctx.fillStyle = "#ff9d2e";
    ctx.fillRect(BREITE / 2 - 10, 524, 20, 6);
  }

  function zeichnePause() {
    ctx.fillStyle = "rgba(16, 16, 36, 0.8)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    schrift(44, "bold");
    ctx.fillText("Pause", BREITE / 2, HOEHE / 2 - 20);
    ctx.fillStyle = "#8888aa";
    schrift(24);
    ctx.fillText("Esc oder Pause-Taste zum Weiterspielen", BREITE / 2, HOEHE / 2 + 30);
  }

  // Oben links: Welle, Punkte und Zähler. Oben rechts: Ton und Leben.
  function zeichneKopfzeile(a) {
    schrift(24, "bold");
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText("Welle " + a.welle, 20, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Punkte: " + a.punkte, 20, 48);

    // Zähler richtige und falsche Treffer – mit Symbol, nicht nur Farbe
    schrift(28, "bold");
    ctx.fillStyle = "#7bd844";
    ctx.fillText("✔ " + a.richtig, 20, 84);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText("✘ " + a.falsch, 140, 84);

    // Ton-Symbol: Lautsprecher mit Zustand
    ctx.textAlign = "center";
    ctx.fillStyle = a.tonAn ? "#7bd844" : "#8888aa";
    schrift(22, "bold");
    ctx.fillText(a.tonAn ? "🔊" : "🔇", BREITE - 160, 16);

    // Herzen: volle Herzen rot (♥), verlorene als Umriss (♡) – nicht nur Farbe.
    // Das gerade verlorene Herz blinkt kurz weiß.
    ctx.textAlign = "right";
    for (let i = 0; i < a.lebenMax; i++) {
      const x = BREITE - 40 - i * 36;
      if (i === a.leben && a.lebenWegZeigen > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText("♥", x, 16);
      } else if (i < a.leben) {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("♥", x, 16);
      } else {
        ctx.fillStyle = "#8888aa";
        ctx.fillText("♡", x, 16);
      }
    }
  }

  function zeichneWellenAnsage(a) {
    ctx.fillStyle = "rgba(16, 16, 36, 0.6)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffcc4d";
    schrift(44, "bold");
    if (a.welle === 0) {
      ctx.fillText("Vocab Invaders", BREITE / 2, HOEHE / 2 - 40);
      ctx.fillStyle = "#ffffff";
      schrift(24);
      ctx.fillText("Welle 1 beginnt ...", BREITE / 2, HOEHE / 2 + 20);
    } else {
      ctx.fillText("Welle " + a.welle + " geschafft!", BREITE / 2, HOEHE / 2 - 40);
      ctx.fillStyle = "#ffffff";
      schrift(24);
      ctx.fillText("Welle " + (a.welle + 1) + " kommt ...", BREITE / 2, HOEHE / 2 + 20);
    }
  }

  function zeichneGameover(a) {
    ctx.fillStyle = "rgba(16, 16, 36, 0.92)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    schrift(44, "bold");
    ctx.fillText("Game over", BREITE / 2, 110);
    schrift(30, "bold");
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText("Punkte: " + a.punkte, BREITE / 2, 165);
    ctx.fillText("Bis Welle " + a.welle, BREITE / 2, 205);

    if (a.verfehlt.length) {
      ctx.fillStyle = "#ffffff";
      schrift(25);
      ctx.fillText("Diese Wörter üben:", BREITE / 2, 265);
      // Bis 16 Wörter: ab 9 Wörtern in zwei Spalten, damit alles auf den Bildschirm passt
      const anzeigen = a.verfehlt.slice(0, 16);
      const spalten = anzeigen.length > 8 ? 2 : 1;
      const zeilen = Math.ceil(anzeigen.length / spalten);
      anzeigen.forEach((w, i) => {
        const spalte = Math.floor(i / zeilen);
        const zeile = i % zeilen;
        const x = spalten === 1 ? BREITE / 2 : BREITE / 2 + (spalte === 0 ? -230 : 230);
        const text = w.en + " – " + w.de;
        schriftPassend(text, 420, 22);
        ctx.fillText(text, x, 300 + zeile * 28);
      });
      if (a.verfehlt.length > 16) {
        ctx.fillStyle = "#8888aa";
        schrift(20);
        ctx.fillText("… und " + (a.verfehlt.length - 16) + " weitere", BREITE / 2, 300 + 8 * 28);
      }
    } else {
      ctx.fillStyle = "#7bd844";
      schrift(26);
      ctx.fillText("Keine Fehler – super!", BREITE / 2, 300);
    }

    // Hinweis erst nach der Sperre, damit niemand die Liste versehentlich überspringt
    if (a.gameoverSperre <= 0) {
      ctx.fillStyle = "#8888aa";
      schrift(22);
      ctx.fillText("Leertaste oder Tippen für eine neue Runde", BREITE / 2, HOEHE - 50);
    }
  }

  // ---------- Hauptfunktion ----------
  // c: Canvas-Kontext, a: Ansicht (Momentaufnahme des Spielzustands, wird nicht verändert)
  function zeichne(c, a) {
    ctx = c;
    ctx.setTransform(
      a.skala, 0, 0, a.skala,
      (a.geraetBreite - BREITE * a.skala) / 2,
      (a.geraetHoehe - HOEHE * a.skala) / 2
    );
    zeichneHintergrund(a);
    if (a.status === "titel") {
      zeichneTitel(a);
      return;
    }
    if (a.status === "wellenwechsel") {
      // Zwischen den Wellen bleibt der Hintergrund mit Sternen sichtbar.
      zeichneWellenAnsage(a);
      return;
    }
    zeichneKopfzeile(a);
    if (a.status === "spielt") {
      zeichneWesen(a);
      zeichneSchilder(a);
      zeichneHinweis(a);
      zeichneSchiff(a);
      zeichneSchuss(a);
      zeichneTouchTasten(a);
      if (a.pausiert) zeichnePause();
    }
    zeichneExplosion(a);
    if (a.status === "gameover") zeichneGameover(a);
  }

  return { zeichne, BREITE, HOEHE, BEDIENUNG, SCHILD_HOEHE, tempoRechteck };
})();
