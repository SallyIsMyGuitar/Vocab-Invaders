// Vocab Invaders – Spielcode
// Meilenstein 1: Grundgerüst (Schiff, Bewegung, Schuss).
// Meilenstein 2: Wellen mit steigendem Tempo, Leben, Punkte.
// Meilenstein 3: Titelbild, Pause, Touch-Steuerung fürs iPad.
// Grafik wird komplett per Code auf das Canvas gezeichnet, keine Bilddateien.

(() => {
  "use strict";

  const canvas = document.getElementById("spielfeld");
  const ctx = canvas.getContext("2d");

  // ---------- Spielfeld-Größe ----------
  // Logische Größe, skaliert auf das Fenster (Querformat).
  const BREITE = 900;
  const HOEHE = 600;
  let skala = 1;

  function groesseAnpassen() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    skala = Math.min(canvas.width / BREITE, canvas.height / HOEHE);
  }
  window.addEventListener("resize", groesseAnpassen);
  groesseAnpassen();

  // ---------- Einstellungen der Wellen ----------
  const ANTWORTEN_ANZAHL = 4;     // Auswahlmöglichkeiten pro Wort
  const WOERTER_IN_WELLE = (welle) => 4 + welle; // Welle 1: 5 Wörter, dann je eins mehr
  const WESP_GESCHWINDIGKEIT = (welle) => 18 + (welle - 1) * 5; // pro Welle etwas schneller
  const PUNKTE_RICHTIG = 10;
  const PUNKTE_BONUS_TEMPO = 5;   // Bonus, wenn das Wort noch weit oben getroffen wird
  const LEBEN_BILDSCHIRM = 3;
  const WELLE_PAUSZEIT = 2.5;     // Sekunden Ansage zwischen den Wellen

  // ---------- Spiel-Objekte ----------
  const schiff = {
    x: BREITE / 2,
    y: HOEHE - 70,
    breite: 70,
    hoehe: 30,
    geschwindigkeit: 400, // Pixel pro Sekunde
  };

  const SCHILD_Y = schiff.y - 110; // Höhe der Antwort-Schilder

  // ---------- Spielzustand ----------
  // "titel" | "wellenwechsel" | "spielt" | "gameover"
  let status = "titel";
  let pausiert = false;      // Pause während des Spiels (Esc oder iPad-Taste)
  let touchModus = false;    // Touch-Tasten zeigen, sobald erstmals getippt wurde
  let welle = 0;
  let leben = 0;
  let punkte = 0;
  let welleUebrig = 0;        // Wörter, die in der aktuellen Welle noch kommen
  let wellenWechselRest = 0;  // verbleibende Sekunden der Wellen-Ansage

  let aufgabe = null;        // aktuelles Wort samt Antwortmöglichkeiten
  let wesenY = 60;           // Sinkhöhe des Wesens mit dem englischen Wort
  let schuss = null;         // höchstens ein Schuss gleichzeitig

  const verfehlteWoerter = []; // für die Zusammenfassung am Ende

  let trefferZeigen = null;  // { index, richtig, zeit } – Haken/Kreuz über dem Schild
  let lebenWegZeigen = 0;    // Sekunden, in denen der✔/✘- nach dem Leben zeigt
  let explosion = null;      // { x, y, zeit }

  // ---------- Wortliste ----------
  // Alle Units zu einer flachen Liste vereinigen (Daten aus wortlisten.js).
  const ALLE_WOERTER = Object.values(GLOBAL_WORTLISTE).flat();

  // Kartenstapel: komplette Liste mischen und der Reihe nach abziehen.
  // Läuft der Stapel leer, wird er neu gemischt. So kommt jedes Wort dran,
  // und doppelte Einträge in der Liste machen keine Probleme.
  function mischen(a) {
    const kopie = a.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
  }
  let kartenstapel = mischen(ALLE_WOERTER);

  function zufall(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  // Wählt ein Wort und mischt die richtige Übersetzung mit drei falschen.
  function neueAufgabe() {
    if (kartenstapel.length === 0) kartenstapel = mischen(ALLE_WOERTER);
    const wort = kartenstapel.pop();

    const falsch = [];
    while (falsch.length < ANTWORTEN_ANZAHL - 1) {
      const kandidat = zufall(ALLE_WOERTER).de;
      if (kandidat !== wort.de && !falsch.includes(kandidat)) {
        falsch.push(kandidat);
      }
    }
    const antworten = [wort, ...falsch.map((de) => ({ de, falsch: true }))]
      .sort(() => Math.random() - 0.5);
    // Schilder gleichmäßig über die Breite verteilen
    antworten.forEach((a, i) => {
      a.x = (BREITE / ANTWORTEN_ANZAHL) * (i + 0.5);
    });
    return { wort, antworten };
  }

  // Wellen: mehr Wörter und etwas mehr Tempo je Runde, kein harter Zeitdruck.
  function welleStarten(nummer) {
    welle = nummer;
    welleUebrig = WOERTER_IN_WELLE(welle);
    aufgabe = neueAufgabe();
    wesenY = 60;
    schuss = null;
    status = "spielt";
  }

  // Neue Runde: Werte zurücksetzen, kurze Ansage, dann startet Welle 1.
  function rundeStarten() {
    leben = LEBEN_BILDSCHIRM;
    punkte = 0;
    verfehlteWoerter.length = 0;
    schuss = null;
    explosion = null;
    trefferZeigen = null;
    pausiert = false;
    welle = 0;
    status = "wellenwechsel";
    wellenWechselRest = WELLE_PAUSZEIT;
  }

  // ---------- Eingabe (PC-Tastatur) ----------
  const tasten = {};
  window.addEventListener("keydown", (e) => {
    // Esc pausiert das Spiel (PC), unabhängig von anderen Tasten.
    if (e.code === "Escape" && status === "spielt") {
      e.preventDefault();
      pausiert = !pausiert;
      return;
    }
    tasten[e.code] = true;
    if (["Space", "Enter", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "Space" || e.code === "Enter") {
      // Titel/Ende: neue Runde. Im Spiel: schießen.
      if (status === "titel" || status === "gameover") {
        rundeStarten();
      } else if (status === "spielt" && !pausiert && schuss === null) {
        schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    tasten[e.code] = false;
  });

  // ---------- Eingabe (Touch: iPad-Steuerkreuz und Feuertaste) ----------
  // Der Finger bleibt so lange auf einer Taste, wie der Zeiger existiert.
  const zeigerAuf = new Map();   // pointerId -> "links" | "rechts" | "feuer" | "pause"

  // Bildschirm-Koordinate in Spielfeld-Koordinate umrechnen.
  function zeigerPosition(e) {
    const dpr = canvas.width / window.innerWidth;
    const offX = (canvas.width - BREITE * skala) / 2;
    const offY = (canvas.height - HOEHE * skala) / 2;
    return {
      x: (e.clientX * dpr - offX) / skala,
      y: (e.clientY * dpr - offY) / skala,
    };
  }

  // Prüft, welchen Bereich eines Touch-Bildschirms ein Punkt trifft.
  function flaecheTreffen(p) {
    if (status === "spielt") {
      // Steuerkreuz links unten: zwei breite Pfeil-Tasten
      if (p.x >= 30 && p.x <= 130 && p.y >= HOEHE - 150 && p.y <= HOEHE - 30) return "links";
      if (p.x >= 150 && p.x <= 250 && p.y >= HOEHE - 150 && p.y <= HOEHE - 30) return "rechts";
      // Feuertaste rechts unten: großer Kreis
      const dx = p.x - (BREITE - 110);
      const dy = p.y - (HOEHE - 90);
      if (dx * dx + dy * dy <= 65 * 65) return "feuer";
      // Pause-Taste oben in der Mitte
      if (p.x >= BREITE / 2 - 30 && p.x <= BREITE / 2 + 30 && p.y >= 14 && p.y <= 58) return "pause";
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") touchModus = true;
    const p = zeigerPosition(e);

    // Auf dem Titel oder nach dem Ende startet ein Tipp die nächste Runde.
    if (status === "titel" || status === "gameover") {
      rundeStarten();
      return;
    }
    // Pause-Taste gilt nur im laufenden Spiel.
    const flaeche = flaecheTreffen(p);
    if (flaeche === "pause") {
      pausiert = !pausiert;
      return;
    }
    if (status === "spielt" && !pausiert && flaeche) {
      zeigerAuf.set(e.pointerId, flaeche);
      if (flaeche === "feuer" && schuss === null) {
        schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
      }
    }
    if (e.pointerType === "touch") e.preventDefault();
  });
  const zeigerLoeschen = (e) => zeigerAuf.delete(e.pointerId);
  canvas.addEventListener("pointerup", zeigerLoeschen);
  canvas.addEventListener("pointercancel", zeigerLoeschen);

  // Touch-Enden abfragen: Taste gehalten, solange ein Zeiger darauf liegt.
  function touchAktiv(name) {
    for (const flaeche of zeigerAuf.values()) {
      if (flaeche === name) return true;
    }
    return false;
  }

  // ---------- Spielablauf ----------
  function lebenVerlieren(wort) {
    leben--;
    verfehlteWoerter.push(wort);
    trefferZeigen = null;
    lebenWegZeigen = 0.8;
    if (leben <= 0) {
      status = "gameover";
      aufgabe = null;
      schuss = null;
    }
  }

  function wortErledigt(richtig) {
    welleUebrig--;
    if (richtig) {
      punkte += PUNKTE_RICHTIG
        + Math.max(0, Math.round((SCHILD_Y - wesenY) / SCHILD_Y * PUNKTE_BONUS_TEMPO));
    }
    if (welleUebrig > 0) {
      aufgabe = neueAufgabe();
      wesenY = 60;
      schuss = null;
    } else if (status !== "gameover") {
      // Welle geschafft: kurze Ansage, dann die nächste Welle.
      aufgabe = null;
      status = "wellenwechsel";
      wellenWechselRest = WELLE_PAUSZEIT;
    }
  }

  function schussAuswerten(schildIndex) {
    schuss = null;
    const schild = aufgabe.antworten[schildIndex];
    const richtig = !schild.falsch;
    trefferZeigen = { index: schildIndex, richtig, zeit: 0.8 };
    if (richtig) {
      explosion = { x: BREITE / 2, y: wesenY, zeit: 0.6 };
      wortErledigt(true);
    } else {
      // Falscher Treffer kostet ein Leben (Konzept „Vokabel-Abschuss“).
      lebenVerlieren(aufgabe.wort);
    }
  }

  function update(dt) {
    if (status === "titel") return;

    // Wellen-Ansage herunterzählen, dann nächste Welle starten.
    if (status === "wellenwechsel") {
      wellenWechselRest -= dt;
      if (wellenWechselRest <= 0) welleStarten(welle + 1);
      return;
    }
    if (status !== "spielt" || pausiert) return;

    // Bewegung des Schiffs: Tastatur oder Steuerkreuz
    const links = tasten["ArrowLeft"] || tasten["KeyA"] || touchAktiv("links");
    const rechts = tasten["ArrowRight"] || tasten["KeyD"] || touchAktiv("rechts");
    if (links) schiff.x -= schiff.geschwindigkeit * dt;
    if (rechts) schiff.x += schiff.geschwindigkeit * dt;

    // Feuertaste gedrückt halten schießt, sobald der Schuss frei ist.
    if (touchAktiv("feuer") && schuss === null) {
      schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
    }
    schiff.x = Math.max(schiff.breite / 2, Math.min(BREITE - schiff.breite / 2, schiff.x));

    if (!aufgabe) return;

    // Wesen mit englischem Wort sinkt langsam herab.
    wesenY += WESP_GESCHWINDIGKEIT(welle) * dt;

    // Erreicht das Wort die Schild-Reihe („Boden“), kostet es ein Leben.
    if (wesenY >= SCHILD_Y - 30) {
      trefferZeigen = null;
      explosion = { x: BREITE / 2, y: wesenY, zeit: 0.6 };
      lebenVerlieren(aufgabe.wort);
      if (status === "spielt") wortErledigt(false);
      return;
    }

    // Schuss fliegt nach oben und prüft Kollision mit einem Schild.
    if (schuss) {
      schuss.y -= 600 * dt;
      if (schuss.y <= SCHILD_Y + 22) {
        const abstand = BREITE / ANTWORTEN_ANZAHL;
        const index = Math.min(ANTWORTEN_ANZAHL - 1, Math.floor(schuss.x / abstand));
        schussAuswerten(index);
      }
    }

    if (trefferZeigen) {
      trefferZeigen.zeit -= dt;
      if (trefferZeigen.zeit <= 0) trefferZeigen = null;
    }
    if (lebenWegZeigen > 0) lebenWegZeigen -= dt;
    if (explosion) {
      explosion.zeit -= dt;
      if (explosion.zeit <= 0) explosion = null;
    }
  }

  // ---------- Zeichnen (Pixelgrafik per Code) ----------
  function zeichneHintergrund() {
    ctx.fillStyle = "#101024";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    // Sternenfeld: feste Punkte, damit nichts flackert
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5) % BREITE;
      const y = (i * 89.3) % (SCHILD_Y - 40);
      ctx.fillStyle = i % 3 === 0 ? "#8888aa" : "#555577";
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function zeichneWesen() {
    if (!aufgabe) return;
    // Blockartiges Pixel-Wesen in der Mitte, darüber das englische Wort
    const x = BREITE / 2;
    ctx.fillStyle = "#7bd844";
    ctx.fillRect(x - 20, wesenY - 14, 40, 28);
    ctx.fillRect(x - 28, wesenY - 4, 56, 8);
    ctx.fillStyle = "#101024";
    ctx.fillRect(x - 12, wesenY + 14, 8, 6);
    ctx.fillRect(x + 4, wesenY + 14, 8, 6);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(aufgabe.wort.en, x, wesenY - 34);
  }

  function zeichneSchilder() {
    if (!aufgabe) return;
    ctx.font = "21px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    aufgabe.antworten.forEach((a, i) => {
      // breite Kachel als Zielscheibe
      ctx.fillStyle = "#2a2a52";
      ctx.fillRect(a.x - 100, SCHILD_Y - 22, 200, 44);
      ctx.strokeStyle = "#4a4a8a";
      ctx.strokeRect(a.x - 100, SCHILD_Y - 22, 200, 44);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(a.de, a.x, SCHILD_Y);

      // Haken oder Kreuz direkt über dem Schild – nicht nur Farbe
      if (trefferZeigen && trefferZeigen.index === i) {
        ctx.font = "bold 34px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
        ctx.fillStyle = trefferZeigen.richtig ? "#7bd844" : "#ff6b6b";
        ctx.fillText(trefferZeigen.richtig ? "✔" : "✘", a.x, SCHILD_Y - 36);
      }
    });
  }

  function zeichneSchiff() {
    const x = schiff.x;
    const y = schiff.y;
    ctx.fillStyle = "#ffcc4d";
    ctx.fillRect(x - schiff.breite / 2, y, 20, 8);
    ctx.fillRect(x + schiff.breite / 2 - 20, y, 20, 8);
    ctx.fillRect(x - 22, y + 8, 44, 16);
    ctx.fillStyle = "#ff9d2e";
    ctx.fillRect(x - 10, y + 24, 20, 6);
  }

  function zeichneSchuss() {
    if (!schuss) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(schuss.x - 2, schuss.y - 12, 4, 12);
  }

  function zeichneExplosion() {
    if (!explosion) return;
    // sternförmig auseinanderfliegende Pixel
    for (let i = 0; i < 8; i++) {
      const winkel = (Math.PI / 4) * i;
      const r = (0.6 - explosion.zeit) * 120;
      ctx.fillStyle = explosion.zeit > 0.3 ? "#7bd844" : "#ff6b6b";
      ctx.fillRect(
        explosion.x + Math.cos(winkel) * r,
        explosion.y + Math.sin(winkel) * r,
        6, 6
      );
    }
  }

  // Zeichnet eine halbtransparente Taste mit dickem Umriss (Touch, iPad).
  function zeichneTouchTasten() {
    if (!touchModus) return;
    ctx.globalAlpha = 0.4;

    // Steuerkreuz links unten: Pfeil links
    ctx.fillStyle = touchAktiv("links") ? "#8888aa" : "#ffffff";
    ctx.fillRect(30, HOEHE - 150, 100, 120);
    ctx.fillStyle = "#101024";
    ctx.beginPath();
    ctx.moveTo(70, HOEHE - 120);
    ctx.lineTo(45, HOEHE - 90);
    ctx.lineTo(70, HOEHE - 60);
    ctx.closePath();
    ctx.fill();

    // Pfeil rechts
    ctx.fillStyle = touchAktiv("rechts") ? "#8888aa" : "#ffffff";
    ctx.fillRect(150, HOEHE - 150, 100, 120);
    ctx.fillStyle = "#101024";
    ctx.beginPath();
    ctx.moveTo(210, HOEHE - 120);
    ctx.lineTo(235, HOEHE - 90);
    ctx.lineTo(210, HOEHE - 60);
    ctx.closePath();
    ctx.fill();

    // Feuer-Taste rechts unten: großer Kreis
    ctx.fillStyle = touchAktiv("feuer") ? "#8888aa" : "#ffffff";
    ctx.beginPath();
    ctx.arc(BREITE - 110, HOEHE - 90, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101024";
    ctx.font = "bold 26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FEUER", BREITE - 110, HOEHE - 90);

    // Pause-Taste oben in der Mitte (zwei Balken)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(BREITE / 2 - 18, 22, 10, 28);
    ctx.fillRect(BREITE / 2 + 8, 22, 10, 28);

    ctx.globalAlpha = 1;
  }

  function zeichneTitel() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Pixel-Wesen über dem Titel, dazu Schiff und Sternenfeld (Hintergrund ist schon da)
    ctx.fillStyle = "#7bd844";
    ctx.fillRect(BREITE / 2 - 30, 130, 60, 40);
    ctx.fillRect(BREITE / 2 - 42, 144, 84, 12);
    ctx.fillStyle = "#101024";
    ctx.fillRect(BREITE / 2 - 16, 162, 12, 10);
    ctx.fillRect(BREITE / 2 + 6, 162, 12, 10);

    ctx.fillStyle = "#ffcc4d";
    ctx.font = "bold 64px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("VOCAB INVADERS", BREITE / 2, 260);
    ctx.fillStyle = "#ffffff";
    ctx.font = "26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Vokabeln aus Klasse 5 und 6 – richtig übersetzt abgeschossen", BREITE / 2, 320);

    ctx.fillStyle = "#8888aa";
    ctx.font = "24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Tippen oder Leertaste zum Starten", BREITE / 2, 400);
    ctx.fillText("Pfeiltasten bewegen · Leertaste schießt · Esc pausiert", BREITE / 2, 440);

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
    ctx.font = "bold 44px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Pause", BREITE / 2, HOEHE / 2 - 20);
    ctx.fillStyle = "#8888aa";
    ctx.font = "24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Esc oder Pause-Taste zum Weiterspielen", BREITE / 2, HOEHE / 2 + 30);
  }

  function zeichneKopfzeile() {
    // Welle, Punkte und Leben in großer Schrift, Symbole statt reiner Farbe
    ctx.font = "bold 24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText("Welle " + welle, 20, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Punkte: " + punkte, 20, 48);
    // Herzen: volle Herzen rot, verlorene nur als Umriss
    ctx.textAlign = "right";
    for (let i = 0; i < LEBEN_BILDSCHIRM; i++) {
      ctx.fillStyle = i < leben ? (lebenWegZeigen > 0 && i === leben ? "#ffffff" : "#ff6b6b") : "#3a3a5a";
      ctx.fillText("♥", BREITE - 40 - i * 36, 16);
    }
  }

  function zeichneWellenAnsage() {
    ctx.fillStyle = "rgba(16, 16, 36, 0.6)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffcc4d";
    ctx.font = "bold 44px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    if (welle === 0) {
      ctx.fillText("Vocab Invaders", BREITE / 2, HOEHE / 2 - 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Welle 1 beginnt ...", BREITE / 2, HOEHE / 2 + 20);
    } else {
      ctx.fillText("Welle " + welle + " geschafft!", BREITE / 2, HOEHE / 2 - 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Welle " + (welle + 1) + " kommt ...", BREITE / 2, HOEHE / 2 + 20);
    }
  }

  function zeichneGameover() {
    ctx.fillStyle = "rgba(16, 16, 36, 0.92)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Game over", BREITE / 2, 110);
    ctx.font = "bold 30px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText("Punkte: " + punkte, BREITE / 2, 165);
    ctx.fillStyle = "#ffcc4d";
    ctx.fillText("Bis Welle " + welle, BREITE / 2, 205);

    if (verfehlteWoerter.length) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "25px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Diese Wörter üben:", BREITE / 2, 265);
      // bei vielen Fehlern die Liste begrenzen
      const anzeigen = verfehlteWoerter.slice(-8);
      ctx.font = "22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      anzeigen.forEach((w, i) => {
        ctx.fillText(w.en + " – " + w.de, BREITE / 2, 305 + i * 32);
      });
    } else {
      ctx.fillStyle = "#7bd844";
      ctx.font = "26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Keine Fehler – super!", BREITE / 2, 300);
    }

    ctx.fillStyle = "#8888aa";
    ctx.font = "22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Leertaste oder Enter für eine neue Runde", BREITE / 2, HOEHE - 50);
  }

  function zeichnen() {
    ctx.setTransform(
      skala, 0, 0, skala,
      (canvas.width - BREITE * skala) / 2,
      (canvas.height - HOEHE * skala) / 2
    );
    zeichneHintergrund();
    if (status === "titel") {
      zeichneTitel();
      return;
    }
    if (status === "wellenwechsel") {
      // Zwischen den Wellen bleibt der Hintergrund mit Sternen sichtbar.
      zeichneWellenAnsage();
      return;
    }
    zeichneKopfzeile();
    if (status === "spielt") {
      zeichneWesen();
      zeichneSchilder();
      zeichneSchiff();
      zeichneSchuss();
      zeichneTouchTasten();
      if (pausiert) zeichnePause();
    }
    zeichneExplosion();
    if (status === "gameover") zeichneGameover();
  }

  // ---------- Spielschleife ----------
  let letzteZeit = performance.now();
  function schleife(jetzt) {
    const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000);
    letzteZeit = jetzt;
    update(dt);
    zeichnen();
    requestAnimationFrame(schleife);
  }

  // Start: Titelbild. Die erste Welle beginnt nach Tastendruck oder Tipp.
  status = "titel";
  leben = LEBEN_BILDSCHIRM;
  requestAnimationFrame(schleife);
})();
