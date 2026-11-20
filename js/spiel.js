// Vocab Invaders – Spielcode
// Meilenstein 1: Grundgerüst (Schiff, Bewegung, Schuss).
// Meilenstein 2: Wellen mit steigendem Tempo, Leben, Punkte.
// Meilenstein 3: Titelbild, Pause, Touch-Steuerung fürs iPad.
// Meilenstein 4 (Feinschliff): Ton per Web Audio (Standard aus), Lesbarkeit, Tempo-Einstellung.
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
  // Tempo-Einstellung auf dem Titelbild; Faktor wirkt auf die Sinkgeschwindigkeit.
  const TEMPO_FAKTOREN = { "Langsam": 0.7, "Normal": 1, "Schnell": 1.4 };
  let tempoName = "Normal";
  const tempoFaktor = () => TEMPO_FAKTOREN[tempoName];

  // ---------- Ton (Web Audio, Standard aus) ----------
  let tonAn = false;
  let audioCtx = null; // wird erst beim Einschalten erzeugt (Benutzergeste nötig)

  function tonUmschalten() {
    tonAn = !tonAn;
    if (tonAn && !audioCtx) {
      const AudioKontext = window.AudioContext || window.webkitAudioContext;
      if (AudioKontext) audioCtx = new AudioKontext();
    }
  }

  // Spielt einen kurzen Ton: Frequenz in Hertz, Länge in Sekunden, Form „sine“ oder „square“.
  function ton(frequenz, dauer, form, start) {
    if (!tonAn || !audioCtx) return;
    const t0 = audioCtx.currentTime + (start || 0);
    const osc = audioCtx.createOscillator();
    const verstaerker = audioCtx.createGain();
    osc.type = form || "sine";
    osc.frequency.value = frequenz;
    verstaerker.gain.setValueAtTime(0.15, t0);
    verstaerker.gain.exponentialRampToValueAtTime(0.001, t0 + dauer);
    osc.connect(verstaerker).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dauer);
  }

  const effektRichtig = () => { ton(660, 0.12); ton(880, 0.18, "sine", 0.1); };
  const effektFalsch = () => ton(150, 0.25, "square");
  const effektWelle = () => { ton(523, 0.12); ton(659, 0.12, "sine", 0.12); ton(784, 0.2, "sine", 0.24); };
  const effektGameover = () => { ton(392, 0.25, "square"); ton(262, 0.5, "square", 0.25); };

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
  let lebenWegZeigen = 0;    // Sekunden, in denen das gerade verlorene Herz weiß blinkt
  let explosion = null;      // { x, y, zeit }
  let gameoverSperre = 0;    // Sekunden, in denen das Game-over-Bild nicht wegklickbar ist

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

    // Falsche Antworten dürfen keine Übersetzung sein, die zum gleichen
    // englischen Wort passt (z. B. „letter“ = Brief und Buchstabe).
    const eigene = ALLE_WOERTER.filter((w) => w.en === wort.en).map((w) => w.de);
    const falsch = [];
    while (falsch.length < ANTWORTEN_ANZAHL - 1) {
      const kandidat = zufall(ALLE_WOERTER).de;
      if (kandidat !== wort.de && !eigene.includes(kandidat) && !falsch.includes(kandidat)) {
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
    // M schaltet den Ton immer um (Standard: aus).
    if (e.code === "KeyM") {
      tonUmschalten();
      return;
    }
    tasten[e.code] = true;
    if (["Space", "Enter", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "Space" || e.code === "Enter") {
      // Gehaltene Taste (Wiederholung) soll keine Aktion mehrfach auslösen.
      if (e.repeat) return;
      // Titel: neue Runde. Game over: neue Runde, aber erst nach der Sperre.
      // Im Spiel: schießen.
      if (status === "titel") {
        rundeStarten();
      } else if (status === "gameover") {
        if (gameoverSperre <= 0) rundeStarten();
      } else if (status === "spielt" && !pausiert && schuss === null) {
        schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    tasten[e.code] = false;
  });
  // Verliert das Fenster den Fokus, gelten alle Tasten als losgelassen.
  // Sonst würde das Schiff nach einem Fokuswechsel weiterfahren.
  window.addEventListener("blur", () => {
    for (const code in tasten) tasten[code] = false;
    zeigerAuf.clear();
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

  // Prüft, ob ein Punkt auf dem Titelbild eine der Tempo-Schaltflächen trifft.
  function tempoNameTreffen(p) {
    for (const name of Object.keys(TEMPO_FAKTOREN)) {
      const r = tempoRechteck(name);
      if (p.x >= r.x && p.x <= r.x + r.b && p.y >= r.y && p.y <= r.y + r.h) return name;
    }
    return null;
  }

  // Position der Tempo-Schaltflächen auf dem Titelbild (drei nebeneinander).
  function tempoRechteck(name) {
    const namen = Object.keys(TEMPO_FAKTOREN);
    const i = namen.indexOf(name);
    const b = 190, h = 56;
    return { x: BREITE / 2 - (b * 3 + 40) / 2 + i * (b + 20), y: 470, b, h };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") touchModus = true;
    const p = zeigerPosition(e);

    // Ton-Symbol oben rechts umschalten (sichtbar außer auf dem Titelbild).
    const dxTon = p.x - (BREITE - 160);
    const dyTon = p.y - 28;
    if (status !== "titel" && dxTon * dxTon + dyTon * dyTon <= 26 * 26) {
      tonUmschalten();
      return;
    }

    // Auf dem Titelbild wählt ein Tipp das Tempo; jeder andere Tipp startet.
    if (status === "titel") {
      const tempoGetroffen = tempoNameTreffen(p);
      if (tempoGetroffen) {
        tempoName = tempoGetroffen;
        return;
      }
      rundeStarten();
      return;
    }
    if (status === "gameover") {
      if (gameoverSperre <= 0) rundeStarten();
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
    // Jedes Wort höchstens einmal in der Übungsliste (kein Doppeleintrag).
    if (!verfehlteWoerter.some((w) => w.en === wort.en)) verfehlteWoerter.push(wort);
    trefferZeigen = null;
    lebenWegZeigen = 0.8;
    effektFalsch();
    if (leben <= 0) {
      status = "gameover";
      aufgabe = null;
      schuss = null;
      gameoverSperre = 1.5; // kurze Sperre, damit die Liste gelesen werden kann
      effektGameover();
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
      effektWelle();
    }
  }

  function schussAuswerten(schildIndex) {
    schuss = null;
    const schild = aufgabe.antworten[schildIndex];
    const richtig = !schild.falsch;
    trefferZeigen = { index: schildIndex, richtig, zeit: 0.8 };
    if (richtig) {
      explosion = { x: BREITE / 2, y: wesenY, zeit: 0.6 };
      effektRichtig();
      wortErledigt(true);
    } else {
      // Falscher Treffer kostet ein Leben (Konzept „Vokabel-Abschuss“).
      lebenVerlieren(aufgabe.wort);
    }
  }

  function update(dt) {
    if (status === "titel") return;

    // Anzeige-Timer laufen in jedem Zustand weiter (auch nach Game over),
    // damit z. B. eine Explosion nicht eingefroren stehen bleibt.
    if (gameoverSperre > 0) gameoverSperre -= dt;
    if (lebenWegZeigen > 0) lebenWegZeigen -= dt;
    if (trefferZeigen) {
      trefferZeigen.zeit -= dt;
      if (trefferZeigen.zeit <= 0) trefferZeigen = null;
    }
    if (explosion) {
      explosion.zeit -= dt;
      if (explosion.zeit <= 0) explosion = null;
    }

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

    // Wesen mit englischem Wort sinkt herab; das gewählte Tempo wirkt als Faktor.
    wesenY += WESP_GESCHWINDIGKEIT(welle) * tempoFaktor() * dt;

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

  }

  // ---------- Zeichnen (Pixelgrafik per Code) ----------
  // Setzt die Schrift so klein, dass der Text in maxBreite passt (Lesbarkeit).
  function schriftPassend(text, maxBreite, groesse) {
    let g = groesse;
    ctx.font = g + "px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    const messung = ctx.measureText(text);
    const breite = messung && typeof messung.width === "number" ? messung.width : 0;
    if (breite > maxBreite) {
      g = Math.max(12, Math.floor(g * maxBreite / breite));
      ctx.font = g + "px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    }
  }

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
    schriftPassend(aufgabe.wort.en, 500, 30);
    ctx.font = "bold " + ctx.font;
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
      // breite Kachel als Zielscheibe, hell genug für gute Lesbarkeit
      ctx.fillStyle = "#32325e";
      ctx.fillRect(a.x - 100, SCHILD_Y - 22, 200, 44);
      ctx.strokeStyle = "#6666aa";
      ctx.strokeRect(a.x - 100, SCHILD_Y - 22, 200, 44);
      ctx.fillStyle = "#ffffff";
      schriftPassend(a.de, 180, 21);
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
    ctx.fillText("Vokabeln aus Klasse 6 – richtig übersetzt abgeschossen", BREITE / 2, 320);

    ctx.fillStyle = "#8888aa";
    ctx.font = "24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText("Tippen oder Leertaste zum Starten", BREITE / 2, 400);
    ctx.fillText("Pfeiltasten bewegen · Leertaste schießt · Esc pausiert · M schaltet Ton", BREITE / 2, 438);

    // Tempo-Einstellung: drei Schaltflächen, die gewählte ist hervorgehoben
    ctx.font = "bold 24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    for (const name of Object.keys(TEMPO_FAKTOREN)) {
      const r = tempoRechteck(name);
      ctx.fillStyle = name === tempoName ? "#ffcc4d" : "#2a2a52";
      ctx.fillRect(r.x, r.y, r.b, r.h);
      ctx.strokeStyle = "#6666aa";
      ctx.strokeRect(r.x, r.y, r.b, r.h);
      ctx.fillStyle = name === tempoName ? "#101024" : "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((name === tempoName ? "✔ " : "") + name, r.x + r.b / 2, r.y + r.h / 2);
    }

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
    // Ton-Symbol: Lautsprecher mit Zustand, Tippen oder M schaltet um
    ctx.textAlign = "center";
    ctx.fillStyle = tonAn ? "#7bd844" : "#8888aa";
    ctx.font = "bold 22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText(tonAn ? "🔊" : "🔇", BREITE - 160, 16);
    ctx.textAlign = "left";
    // Herzen: volle Herzen rot (♥), verlorene als Umriss (♡) – nicht nur Farbe.
    // Das gerade verlorene Herz blinkt kurz weiß.
    ctx.textAlign = "right";
    for (let i = 0; i < LEBEN_BILDSCHIRM; i++) {
      const x = BREITE - 40 - i * 36;
      if (i === leben && lebenWegZeigen > 0) {
        // gerade verloren: kurz weißes, volles Herz
        ctx.fillStyle = "#ffffff";
        ctx.fillText("♥", x, 16);
      } else if (i < leben) {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("♥", x, 16);
      } else {
        ctx.fillStyle = "#8888aa";
        ctx.fillText("♡", x, 16);
      }
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
      // Bis 16 Wörter: ab 9 Wörtern in zwei Spalten, damit alles auf den Bildschirm passt
      const anzeigen = verfehlteWoerter.slice(0, 16);
      const spalten = anzeigen.length > 8 ? 2 : 1;
      const zeilen = Math.ceil(anzeigen.length / spalten);
      anzeigen.forEach((w, i) => {
        const spalte = Math.floor(i / zeilen);
        const zeile = i % zeilen;
        const x = spalten === 1 ? BREITE / 2 : BREITE / 2 + (spalte === 0 ? -230 : 230);
        schriftPassend(w.en + " – " + w.de, 420, 22);
        ctx.fillText(w.en + " – " + w.de, x, 300 + zeile * 28);
      });
      if (verfehlteWoerter.length > 16) {
        ctx.fillStyle = "#8888aa";
        ctx.font = "20px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
        ctx.fillText("… und " + (verfehlteWoerter.length - 16) + " weitere", BREITE / 2, 300 + 8 * 28);
      }
    } else {
      ctx.fillStyle = "#7bd844";
      ctx.font = "26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Keine Fehler – super!", BREITE / 2, 300);
    }

    // Hinweis erst nach der Sperre, damit niemand die Liste versehentlich überspringt
    if (gameoverSperre <= 0) {
      ctx.fillStyle = "#8888aa";
      ctx.font = "22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      ctx.fillText("Leertaste oder Tippen für eine neue Runde", BREITE / 2, HOEHE - 50);
    }
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
