// Vocab Invaders – Spielcode
// Meilenstein 1: Grundgerüst (Schiff, Bewegung, Schuss).
// Meilenstein 2: Wellen mit steigendem Tempo, Leben, Punkte.
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
  // "spielt" | "wellenwechsel" | "gameover"
  let status = "wellenwechsel";
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

  function spielStarten() {
    leben = LEBEN_BILDSCHIRM;
    punkte = 0;
    verfehlteWoerter.length = 0;
    welleStarten(1);
  }

  // ---------- Eingabe (PC-Tastatur) ----------
  const tasten = {};
  window.addEventListener("keydown", (e) => {
    tasten[e.code] = true;
    if (["Space", "Enter", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "Space" || e.code === "Enter") {
      // Im Spiel schießen, nach dem Ende eine neue Runde starten.
      if (status === "spielt" && schuss === null) {
        schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
      } else if (status === "gameover") {
        spielStarten();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    tasten[e.code] = false;
  });

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
    // Wellen-Ansage herunterzählen, dann nächste Welle starten.
    if (status === "wellenwechsel") {
      wellenWechselRest -= dt;
      if (wellenWechselRest <= 0) welleStarten(welle + 1);
      return;
    }
    if (status !== "spielt") return;

    // Bewegung des Schiffs
    if (tasten["ArrowLeft"] || tasten["KeyA"]) schiff.x -= schiff.geschwindigkeit * dt;
    if (tasten["ArrowRight"] || tasten["KeyD"]) schiff.x += schiff.geschwindigkeit * dt;
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

  // Start: kurze Ansage, dann beginnt Welle 1 automatisch.
  status = "wellenwechsel";
  welle = 0;
  wellenWechselRest = WELLE_PAUSZEIT;
  leben = LEBEN_BILDSCHIRM;
  requestAnimationFrame(schleife);
})();
