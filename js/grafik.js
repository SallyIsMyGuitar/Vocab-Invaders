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

  // Bedienflächen im Spielfeld (Rechtecke: x, y, b = Breite, h = Höhe; Kreise: x, y, r).
  // Ziehfeld und Feuertaste liegen dagegen am Bildschirmrand (siehe touchLayout).
  const BEDIENUNG = {
    pause:  { x: 640, y: 0,   b: 60,  h: 64 },  // Tippfläche der Pause-Taste links neben dem Lautsprecher
    ton:    { x: 740, y: 28,  r: 26 },          // Lautsprecher-Symbol oben rechts
  };

  // Lage der Touch-Tasten in CSS-Pixeln des Bildschirms, mit Abstand zur Safe Area.
  // Die Größe hängt vom Bildschirm ab, nicht von der Spielfeld-Skalierung:
  // auf dem iPhone bleiben die Tasten so groß genug für den Daumen.
  function touchLayout(bs) {
    const r = Math.max(44, Math.min(72, Math.min(bs.breite, bs.hoehe) * 0.12)); // Radius Feuertaste
    const rand = 16;
    const y = bs.hoehe - bs.safe.unten - rand - r;
    return {
      feuer: { x: bs.breite - bs.safe.rechts - rand - r, y, r },
      // Ziehfeld-Anzeige links unten: abgerundeter Balken mit Pfeilen
      ziehen: { x: bs.safe.links + rand, y: y - r * 0.55, b: r * 3.4, h: r * 1.1 },
    };
  }

  // Tempo-Schaltflächen auf dem Titelbild, nebeneinander zentriert (i = Index 0, 1, 2).
  function tempoRechteck(i) {
    const b = 190, h = 56, abstand = 20;
    return { x: BREITE / 2 - (b * 3 + abstand * 2) / 2 + i * (b + abstand), y: 496, b, h };
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

  // Pause-Taste oben rechts neben dem Lautsprecher (im Spielfeld, nur auf Touch-Geräten).
  // Nicht in der Mitte, damit sie das herabschwebende Wort nicht verdeckt.
  function zeichnePauseTaste(a) {
    if (!a.touchModus) return;
    const p = BEDIENUNG.pause;
    const mx = p.x + p.b / 2;  // Mitte der Tippfläche
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mx - 12, 17, 8, 24);
    ctx.fillRect(mx + 4, 17, 8, 24);
    ctx.globalAlpha = 1;
  }

  // Abgerundetes Rechteck als Pfad (ohne roundRect, das ältere Safari-Versionen nicht kennen)
  function rundRechteckPfad(x, y, b, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + b - r, y);
    ctx.arc(x + b - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + b, y + h - r);
    ctx.arc(x + b - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  // Touch-Tasten am Bildschirmrand (iPad/iPhone). Gezeichnet in CSS-Pixeln des Bildschirms.
  // Die Tasten zeigen nur an, wo man tippt: Die ganze linke Hälfte ist Ziehfeld,
  // die ganze rechte Hälfte löst Feuer aus.
  function zeichneTouchTasten(a) {
    const bs = a.bildschirm;
    const l = touchLayout(bs);
    ctx.setTransform(bs.dpr, 0, 0, bs.dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Ziehfeld links unten: Balken mit Pfeilen und „ziehen“
    const z = l.ziehen;
    ctx.globalAlpha = a.touchAktiv("ziehen") ? 0.6 : 0.3;
    ctx.fillStyle = "#ffffff";
    rundRechteckPfad(z.x, z.y, z.b, z.h, z.h / 2);
    ctx.fill();
    ctx.fillStyle = "#101024";
    const pf = z.h * 0.28; // Pfeilgröße
    const my = z.y + z.h / 2;
    ctx.beginPath();
    ctx.moveTo(z.x + z.h * 0.35, my);
    ctx.lineTo(z.x + z.h * 0.35 + pf * 1.2, my - pf);
    ctx.lineTo(z.x + z.h * 0.35 + pf * 1.2, my + pf);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(z.x + z.b - z.h * 0.35, my);
    ctx.lineTo(z.x + z.b - z.h * 0.35 - pf * 1.2, my - pf);
    ctx.lineTo(z.x + z.b - z.h * 0.35 - pf * 1.2, my + pf);
    ctx.closePath();
    ctx.fill();
    schrift(Math.round(z.h * 0.36), "bold");
    ctx.fillText("ziehen", z.x + z.b / 2, my);

    // Feuertaste rechts unten: großer Kreis
    const f = l.feuer;
    ctx.globalAlpha = a.touchAktiv("feuer") ? 0.6 : 0.3;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#101024";
    schrift(Math.round(f.r * 0.36), "bold");
    ctx.fillText("FEUER", f.x, f.y);

    ctx.globalAlpha = 1;
  }

  // Hinweis im Hochformat (iPad/iPhone): Gerät drehen. Deckt den ganzen Bildschirm ab.
  function zeichneDrehHinweis(a) {
    const bs = a.bildschirm;
    ctx.setTransform(bs.dpr, 0, 0, bs.dpr, 0, 0);
    ctx.fillStyle = "#101024";
    ctx.fillRect(0, 0, bs.breite, bs.hoehe);
    const mx = bs.breite / 2;
    const my = bs.hoehe / 2;
    // Pixel-Gerät, quer gelegt
    ctx.strokeStyle = "#ffcc4d";
    ctx.lineWidth = 6;
    ctx.strokeRect(mx - 60, my - 110, 120, 76);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffcc4d";
    schrift(40, "bold");
    ctx.fillText("↻", mx, my - 72);
    ctx.fillStyle = "#ffffff";
    schrift(26, "bold");
    ctx.fillText("Bitte das Gerät", mx, my + 10);
    ctx.fillText("quer halten", mx, my + 44);
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
    ctx.fillText("Pfeiltasten bewegen · Leertaste schießt · Esc pausiert · M schaltet Ton", BREITE / 2, 436);
    // Beschriftung der Schwierigkeit (Tasten auf dem Titelbild)
    schrift(20);
    ctx.fillText("Schwierigkeit – mit ← → bzw. A/D wählen, Leertaste startet", BREITE / 2, 472);

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

    // Pixelschiff als Deko unten (unterhalb der Schwierigkeit-Schaltflächen)
    ctx.fillStyle = "#ffcc4d";
    ctx.fillRect(BREITE / 2 - 35, 566, 20, 8);
    ctx.fillRect(BREITE / 2 + 15, 566, 20, 8);
    ctx.fillRect(BREITE / 2 - 22, 574, 44, 16);
    ctx.fillStyle = "#ff9d2e";
    ctx.fillRect(BREITE / 2 - 10, 590, 20, 6);
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
    ctx.fillText("Esc oder Pause-Taste (oben rechts) zum Weiterspielen", BREITE / 2, HOEHE / 2 + 30);
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
    // Ganzen Bildschirm löschen – auch die Ränder neben dem Spielfeld,
    // sonst legen sich die halbtransparenten Touch-Tasten Bild für Bild übereinander.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#101024";
    ctx.fillRect(0, 0, a.geraetBreite, a.geraetHoehe);
    ctx.setTransform(
      a.skala, 0, 0, a.skala,
      (a.geraetBreite - BREITE * a.skala) / 2,
      (a.geraetHoehe - HOEHE * a.skala) / 2
    );
    zeichneHintergrund(a);
    if (a.status === "titel") {
      zeichneTitel(a);
      zeichneBildschirmEbene(a);
      return;
    }
    if (a.status === "wellenwechsel") {
      // Zwischen den Wellen bleibt der Hintergrund mit Sternen sichtbar.
      zeichneWellenAnsage(a);
      zeichneBildschirmEbene(a);
      return;
    }
    zeichneKopfzeile(a);
    if (a.status === "spielt") {
      zeichneWesen(a);
      zeichneSchilder(a);
      zeichneHinweis(a);
      zeichneSchiff(a);
      zeichneSchuss(a);
      zeichnePauseTaste(a);
      if (a.pausiert) zeichnePause();
    }
    zeichneExplosion(a);
    if (a.status === "gameover") zeichneGameover(a);
    zeichneBildschirmEbene(a);
  }

  // Ebene über dem Spielfeld in Bildschirm-Koordinaten: Touch-Tasten und Dreh-Hinweis.
  function zeichneBildschirmEbene(a) {
    if (a.status === "spielt" && a.touchModus && !a.pausiert && !a.hochformat) zeichneTouchTasten(a);
    if (a.hochformat) zeichneDrehHinweis(a);
  }

  return { zeichne, BREITE, HOEHE, BEDIENUNG, SCHILD_HOEHE, tempoRechteck };
})();
