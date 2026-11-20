// Vocab Invaders – Spielcode (Meilenstein 1: Grundgerüst)
// Schiff bewegen, schießen und eine Testwelle mit echten Vokabeln absolvieren.
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

  // ---------- Wortliste ----------
  // Alle Units zu einer flachen Liste vereinigen (Daten aus wortlisten.js).
  const ALLE_WOERTER = Object.values(GLOBAL_WORTLISTE).flat();
  const TESTWELLE_GROESSE = 5;   // Anzahl Wörter in der Testwelle
  const ANTWORTEN_ANZAHL = 4;    // Auswahlmöglichkeiten pro Wort

  function zufall(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  // Wählt ein Wort und mischt die richtige Übersetzung mit drei falschen.
  function neueAufgabe(bereitsBenutzt) {
    let wort;
    do {
      wort = zufall(ALLE_WOERTER);
    } while (bereitsBenutzt.has(wort.en));
    bereitsBenutzt.add(wort.en);

    const falsch = [];
    while (falsch.length < ANTWORTEN_ANZAHL - 1) {
      const kandidat = zufall(ALLE_WOERTER).de;
      if (kandidat !== wort.de && !falsch.includes(kandidat)) {
        falsch.push(kandidat);
      }
    }
    const antworten = [wort, ...falsch.map((de) => ({ de, falsch: true }))]
      .sort(() => Math.random() - 0.5);
    return { wort, antworten };
  }

  // ---------- Spiel-Objekte ----------
  const schiff = {
    x: BREITE / 2,
    y: HOEHE - 70,
    breite: 70,
    hoehe: 30,
    geschwindigkeit: 400, // Pixel pro Sekunde
  };

  const SCHILD_Y = schiff.y - 110; // Höhe der Antwort-Schilder
  const WESP_GESCHWINDIGKEIT = 22; // Pixel pro Sekunde – bewusst langsam, kein harter Zeitdruck

  let aufgabe = null;        // aktuelles Wort samt Antwortmöglichkeiten
  let wesenY = 60;           // Sinkhöhe des Wesens mit dem englischen Wort
  let schuss = null;         // höchstens ein Schuss gleichzeitig (Meilenstein 1)

  const trefferStatistik = { richtig: 0, falsch: 0 };
  const verfehlteWoerter = []; // für die Zusammenfassung am Ende
  const benutzteWoerter = new Set();
  let nochUebrig = TESTWELLE_GROESSE;

  let trefferZeigen = null;  // { index, richtig, zeit } – Haken/Kreuz über dem Schild
  let explosion = null;      // { x, y, zeit }

  // ---------- Eingabe (PC-Tastatur) ----------
  const tasten = {};
  window.addEventListener("keydown", (e) => {
    tasten[e.code] = true;
    if (["Space", "Enter", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if ((e.code === "Space" || e.code === "Enter") && schuss === null && aufgabe) {
      schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
    }
  });
  window.addEventListener("keyup", (e) => {
    tasten[e.code] = false;
  });

  // ---------- Spielablauf ----------
  function naechstesWort() {
    aufgabe = neueAufgabe(benutzteWoerter);
    // Schilder gleichmäßig über die Breite verteilen
    aufgabe.antworten.forEach((a, i) => {
      a.x = (BREITE / ANTWORTEN_ANZAHL) * (i + 0.5);
    });
    wesenY = 60;
  }

  function schussAuswerten(schildIndex) {
    schuss = null;
    const schild = aufgabe.antworten[schildIndex];
    const richtig = !schild.falsch;
    trefferZeigen = { index: schildIndex, richtig, zeit: 0.8 };
    if (richtig) {
      trefferStatistik.richtig++;
      explosion = { x: BREITE / 2, y: wesenY, zeit: 0.6 };
      nochUebrig--;
      if (nochUebrig > 0) {
        naechstesWort();
      } else {
        aufgabe = null; // Testwelle vorbei, Zusammenfassung erscheint
      }
    } else {
      trefferStatistik.falsch++;
      verfehlteWoerter.push(aufgabe.wort);
    }
  }

  function update(dt) {
    if (!aufgabe) return;

    // Bewegung des Schiffs
    if (tasten["ArrowLeft"] || tasten["KeyA"]) schiff.x -= schiff.geschwindigkeit * dt;
    if (tasten["ArrowRight"] || tasten["KeyD"]) schiff.x += schiff.geschwindigkeit * dt;
    schiff.x = Math.max(schiff.breite / 2, Math.min(BREITE - schiff.breite / 2, schiff.x));

    // Wesen mit englischem Wort sinkt langsam herab
    wesenY += WESP_GESCHWINDIGKEIT * dt;

    // Schuss fliegt nach oben und prüft Kollision mit einem Schild
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
      ctx.fillStyle = "#7bd844";
      ctx.fillRect(
        explosion.x + Math.cos(winkel) * r,
        explosion.y + Math.sin(winkel) * r,
        6, 6
      );
    }
  }

  function zeichneKopfzeile() {
    // Zähler in großer Schrift mit Symbolen (✔/✘), nicht nur Farbe
    ctx.font = "bold 24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#7bd844";
    ctx.fillText("✔ " + trefferStatistik.richtig, 20, 16);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText("✘ " + trefferStatistik.falsch, 120, 16);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("Wörter übrig: " + nochUebrig, BREITE - 20, 16);
  }

  function zeichneZusammenfassung() {
    // Ende der Testwelle: kurze Übersicht für die Nachbesprechung
    ctx.fillStyle = "rgba(16, 16, 36, 0.9)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Testwelle geschafft!", BREITE / 2, 120);
    ctx.font = "26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillStyle = "#7bd844";
    ctx.fillText("✔ " + trefferStatistik.richtig + " richtig", BREITE / 2, 180);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText("✘ " + trefferStatistik.falsch + " falsch", BREITE / 2, 220);

    if (verfehlteWoerter.length) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Diese Wörter üben:", BREITE / 2, 280);
      ctx.font = "23px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      verfehlteWoerter.forEach((w, i) => {
        ctx.fillText(w.en + " – " + w.de, BREITE / 2, 320 + i * 34);
      });
    } else {
      ctx.fillStyle = "#7bd844";
      ctx.font = "26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Alle Wörter richtig – super!", BREITE / 2, 300);
    }

    ctx.fillStyle = "#8888aa";
    ctx.font = "22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Seite neu laden für eine neue Runde", BREITE / 2, HOEHE - 60);
  }

  function zeichnen() {
    ctx.setTransform(
      skala, 0, 0, skala,
      (canvas.width - BREITE * skala) / 2,
      (canvas.height - HOEHE * skala) / 2
    );
    zeichneHintergrund();
    zeichneKopfzeile();
    if (aufgabe) {
      zeichneWesen();
      zeichneSchilder();
      zeichneSchiff();
      zeichneSchuss();
      zeichneExplosion();
    } else {
      zeichneZusammenfassung();
    }
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

  naechstesWort();
  requestAnimationFrame(schleife);
})();
