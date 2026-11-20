// Vocab Invaders – Spielcode (Spiellogik, Eingabe, Ton, Wellen)
// Die Darstellung steht in js/grafik.js. Dieser Code übergibt ihr bei jedem Bild
// eine Ansicht mit den aktuellen Werten.
// Meilenstein 1: Grundgerüst (Schiff, Bewegung, Schuss).
// Meilenstein 2: Wellen mit steigendem Tempo, Leben, Punkte.
// Meilenstein 3: Titelbild, Pause, Touch-Steuerung fürs iPad.
// Meilenstein 4 (Feinschliff): Ton per Web Audio (Standard aus), Lesbarkeit, Tempo-Einstellung.
// Stufe A/B (Analyse): Fehler behoben, Richtig/Falsch-Zähler, Grafik in eigene Datei.

(() => {
  "use strict";

  const canvas = document.getElementById("spielfeld");
  const ctx = canvas.getContext("2d");

  // ---------- Spielfeld-Größe ----------
  // Logische Größe, skaliert auf das Fenster (Querformat).
  const BREITE = Grafik.BREITE;
  const HOEHE = Grafik.HOEHE;
  let skala = 1;

  // Bildschirm in CSS-Pixeln samt Safe Area (Notch, Home-Leiste).
  // Die Touch-Tasten werden in diesen Koordinaten gezeichnet, nicht im Spielfeld.
  const bildschirm = { breite: 0, hoehe: 0, dpr: 1, safe: { oben: 0, rechts: 0, unten: 0, links: 0 } };
  const safeMesser = document.getElementById("safearea");

  function groesseAnpassen() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    skala = Math.min(canvas.width / BREITE, canvas.height / HOEHE);

    bildschirm.breite = window.innerWidth;
    bildschirm.hoehe = window.innerHeight;
    bildschirm.dpr = dpr;
    if (safeMesser) {
      const st = getComputedStyle(safeMesser);
      bildschirm.safe.oben = parseFloat(st.paddingTop) || 0;
      bildschirm.safe.rechts = parseFloat(st.paddingRight) || 0;
      bildschirm.safe.unten = parseFloat(st.paddingBottom) || 0;
      bildschirm.safe.links = parseFloat(st.paddingLeft) || 0;
    }
  }
  window.addEventListener("resize", groesseAnpassen);
  // Safari meldet die neue Größe nach dem Drehen teils verzögert: kurz danach nochmals messen.
  window.addEventListener("orientationchange", () => setTimeout(groesseAnpassen, 300));
  groesseAnpassen();

  // Touch-Gerät (iPad/iPhone)? Dann gilt nur das Querformat.
  const istTouchGeraet = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const hochformat = () => istTouchGeraet && window.innerHeight > window.innerWidth;

  // Safari: Zwei-Finger-Zoom und Doppeltipp-Zoom abschalten (user-scalable wird teils ignoriert).
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());

  // ---------- Einstellungen der Wellen ----------
  const ANTWORTEN_ANZAHL = 4;     // Auswahlmöglichkeiten pro Wort
  const WOERTER_IN_WELLE = (welle) => 4 + welle; // Welle 1: 5 Wörter, dann je eins mehr
  // Tempo steigt pro Welle nur leicht (+2 px/s): Welle 1 = 18, Welle 10 = 36
  const WESP_GESCHWINDIGKEIT = (welle) => 18 + (welle - 1) * 2;
  const PUNKTE_RICHTIG = 10;
  const PUNKTE_BONUS_TEMPO = 5;   // Bonus, wenn das Wort noch weit oben getroffen wird
  const LEBEN_BILDSCHIRM = 3;
  const WELLE_PAUSZEIT = 2.5;     // Sekunden Ansage zwischen den Wellen
  // Tempo-Einstellung auf dem Titelbild; Faktor wirkt auf die Sinkgeschwindigkeit.
  const TEMPO_FAKTOREN = { "Langsam": 0.7, "Normal": 1, "Schnell": 1.4 };
  let tempoName = "Normal";
  const tempoFaktor = () => TEMPO_FAKTOREN[tempoName];

  // Schwierigkeit auf dem Titelbild eine Stufe weiter (dir = -1 links, +1 rechts).
  // Bleibt innerhalb der Grenzen Langsam … Schnell.
  function tempoWechseln(dir) {
    const namen = Object.keys(TEMPO_FAKTOREN);
    const i = namen.indexOf(tempoName);
    tempoName = namen[Math.max(0, Math.min(namen.length - 1, i + dir))];
  }

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

  const SCHILD_Y = schiff.y - 110;                // Mitte der Antwort-Schilder
  const SCHILD_HALB = Grafik.SCHILD_HOEHE / 2;    // halbe Schildhöhe (Trefferbereich)

  // ---------- Spielzustand ----------
  // "titel" | "wellenwechsel" | "spielt" | "gameover"
  let status = "titel";
  let pausiert = false;      // Pause während des Spiels (Esc oder iPad-Taste)
  let touchModus = false;    // Touch-Tasten zeigen, sobald erstmals getippt wurde
  let welle = 0;
  let leben = 0;
  let punkte = 0;
  let richtigZaehl = 0;      // richtige Treffer in dieser Runde (Anzeige ✔)
  let falschZaehl = 0;       // falsche Treffer in dieser Runde (Anzeige ✘)
  let welleUebrig = 0;        // Wörter, die in der aktuellen Welle noch kommen
  let wellenWechselRest = 0;  // verbleibende Sekunden der Wellen-Ansage

  let aufgabe = null;        // aktuelles Wort samt Antwortmöglichkeiten
  let wesenY = 60;           // Sinkhöhe des Wesens mit dem englischen Wort
  let schuss = null;         // höchstens ein Schuss gleichzeitig

  const verfehlteWoerter = []; // für die Zusammenfassung am Ende (ohne Dubletten)

  let trefferZeigen = null;  // { index, richtig, zeit } – Haken/Kreuz über dem Schild
  let lebenWegZeigen = 0;    // Sekunden, in denen das gerade verlorene Herz weiß blinkt
  let explosion = null;      // { x, y, zeit }
  let gameoverSperre = 0;    // Sekunden, in denen das Game-over-Bild nicht wegklickbar ist
  let hinweis = null;        // { en, de, zeit } – richtige Übersetzung nach einem Fehler

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
    richtigZaehl = 0;
    falschZaehl = 0;
    verfehlteWoerter.length = 0;
    schuss = null;
    explosion = null;
    trefferZeigen = null;
    hinweis = null;
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
    // Titelbild: Pfeiltasten bzw. A/D wählen die Schwierigkeit, Leertaste startet.
    if (status === "titel" && ["ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(e.code)) {
      tempoWechseln(["ArrowLeft", "KeyA"].includes(e.code) ? -1 : 1);
      return;
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

  // ---------- Eingabe (Touch: iPad und iPhone) ----------
  // Linke Bildschirmhälfte: Finger ziehen, das Schiff folgt der Bewegung.
  // Rechte Bildschirmhälfte: Feuer (gehalten = Dauerfeuer, sobald der Schuss frei ist).
  // Jeder Finger (pointerId) merkt sich seine Aufgabe: { art: "ziehen" | "feuer", letztesX }
  const zeigerAuf = new Map();
  // Verstärkung beim Ziehen: 1 cm Fingerweg bewegt das Schiff um 1,6 cm auf dem Bildschirm.
  // So reicht auch auf dem iPhone ein kurzer Daumenweg über das ganze Spielfeld.
  const ZIEH_FAKTOR = 1.6;

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

  // Liegt der Punkt in einem Rechteck (x, y, b, h)?
  function inRechteck(p, r) {
    return p.x >= r.x && p.x <= r.x + r.b && p.y >= r.y && p.y <= r.y + r.h;
  }

  // Prüft, ob ein Punkt auf dem Titelbild eine der Tempo-Schaltflächen trifft.
  function tempoNameTreffen(p) {
    const namen = Object.keys(TEMPO_FAKTOREN);
    for (let i = 0; i < namen.length; i++) {
      if (inRechteck(p, Grafik.tempoRechteck(i))) return namen[i];
    }
    return null;
  }

  function schiessen() {
    if (schuss === null) schuss = { x: schiff.x, y: schiff.y - schiff.hoehe };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      touchModus = true;
      e.preventDefault();
    }
    const p = zeigerPosition(e);

    // Ton-Symbol oben rechts umschalten (sichtbar außer auf dem Titelbild).
    // Die Tippfläche ist etwas größer als das Symbol, damit sie auch auf dem iPhone gut trifft.
    const t = Grafik.BEDIENUNG.ton;
    const dxTon = p.x - t.x;
    const dyTon = p.y - t.y;
    const rTon = t.r + 14;
    if (status !== "titel" && dxTon * dxTon + dyTon * dyTon <= rTon * rTon) {
      tonUmschalten();
      return;
    }

    // Auf dem Titelbild wählt ein Tipp das Tempo; jeder andere Tipp startet.
    if (status === "titel") {
      if (hochformat()) return; // erst drehen, dann starten
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
    if (status !== "spielt") return;

    // Pause-Taste oben in der Mitte
    if (inRechteck(p, Grafik.BEDIENUNG.pause)) {
      if (!hochformat()) pausiert = !pausiert;
      return;
    }
    if (pausiert) return;

    // Linke oder rechte Bildschirmhälfte (CSS-Pixel, unabhängig vom Spielfeld)
    if (e.clientX < window.innerWidth / 2) {
      zeigerAuf.set(e.pointerId, { art: "ziehen", letztesX: e.clientX });
    } else {
      zeigerAuf.set(e.pointerId, { art: "feuer" });
      schiessen();
    }
    // Finger bleibt dem Canvas zugeordnet, auch wenn er kurz darüber hinausrutscht.
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (fehler) { /* ohne Capture weiter */ }
    }
  });

  // Ziehen: Das Schiff folgt dem Fingerweg (relativ, nicht zur Fingerposition springend).
  canvas.addEventListener("pointermove", (e) => {
    const z = zeigerAuf.get(e.pointerId);
    if (!z || z.art !== "ziehen") return;
    const dxGeraet = (e.clientX - z.letztesX) * (canvas.width / window.innerWidth);
    z.letztesX = e.clientX;
    if (status !== "spielt" || pausiert) return;
    schiff.x += dxGeraet / skala * ZIEH_FAKTOR;
    schiff.x = Math.max(schiff.breite / 2, Math.min(BREITE - schiff.breite / 2, schiff.x));
    e.preventDefault();
  });

  const zeigerLoeschen = (e) => zeigerAuf.delete(e.pointerId);
  canvas.addEventListener("pointerup", zeigerLoeschen);
  canvas.addEventListener("pointercancel", zeigerLoeschen);

  // Ist gerade ein Finger mit dieser Aufgabe ("ziehen" oder "feuer") auf dem Bildschirm?
  function touchAktiv(art) {
    for (const z of zeigerAuf.values()) {
      if (z.art === art) return true;
    }
    return false;
  }

  // ---------- Spielablauf ----------
  function lebenVerlieren(wort) {
    leben--;
    // Jedes Wort höchstens einmal in der Übungsliste (kein Doppeleintrag).
    if (!verfehlteWoerter.some((w) => w.en === wort.en)) verfehlteWoerter.push(wort);
    // Nach einem Fehler die richtige Übersetzung zeigen (Feedback zum Lernen).
    hinweis = { en: wort.en, de: wort.de, zeit: 2.5 };
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
      richtigZaehl++;
      explosion = { x: BREITE / 2, y: wesenY, zeit: 0.6 };
      effektRichtig();
      wortErledigt(true);
    } else {
      // Falscher Treffer kostet ein Leben (Konzept „Vokabel-Abschuss“).
      falschZaehl++;
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
    if (hinweis) {
      hinweis.zeit -= dt;
      if (hinweis.zeit <= 0) hinweis = null;
    }

    // Wellen-Ansage herunterzählen, dann nächste Welle starten.
    if (status === "wellenwechsel") {
      wellenWechselRest -= dt;
      if (wellenWechselRest <= 0) welleStarten(welle + 1);
      return;
    }
    // Hochformat auf iPad/iPhone: Spiel anhalten, bis das Gerät gedreht ist.
    if (status === "spielt" && hochformat() && !pausiert) {
      pausiert = true;
      zeigerAuf.clear();
    }
    if (status !== "spielt" || pausiert) return;

    // Bewegung des Schiffs per Tastatur (Touch-Ziehen wirkt direkt in pointermove)
    const links = tasten["ArrowLeft"] || tasten["KeyA"];
    const rechts = tasten["ArrowRight"] || tasten["KeyD"];
    if (links) schiff.x -= schiff.geschwindigkeit * dt;
    if (rechts) schiff.x += schiff.geschwindigkeit * dt;

    // Feuertaste gedrückt halten schießt, sobald der Schuss frei ist.
    if (touchAktiv("feuer")) schiessen();
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
      if (schuss.y <= SCHILD_Y + SCHILD_HALB) {
        const abstand = BREITE / ANTWORTEN_ANZAHL;
        const index = Math.min(ANTWORTEN_ANZAHL - 1, Math.floor(schuss.x / abstand));
        schussAuswerten(index);
      }
    }
  }

  // Momentaufnahme des Spielzustands für die Grafik (wird dort nur gelesen).
  function ansichtBauen() {
    return {
      status, pausiert, touchModus, tonAn, tempoName,
      tempoNamen: Object.keys(TEMPO_FAKTOREN),
      welle, leben, lebenMax: LEBEN_BILDSCHIRM, punkte,
      richtig: richtigZaehl, falsch: falschZaehl,
      aufgabe, wesenY, schuss, schiff, schildY: SCHILD_Y,
      trefferZeigen, hinweis, explosion, lebenWegZeigen, gameoverSperre,
      verfehlt: verfehlteWoerter, touchAktiv,
      skala, geraetBreite: canvas.width, geraetHoehe: canvas.height,
      bildschirm, hochformat: hochformat(),
    };
  }

  // ---------- Spielschleife ----------
  let letzteZeit = performance.now();
  function schleife(jetzt) {
    const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000);
    letzteZeit = jetzt;
    update(dt);
    Grafik.zeichne(ctx, ansichtBauen());
    requestAnimationFrame(schleife);
  }

  // Start: Titelbild. Die erste Welle beginnt nach Tastendruck oder Tipp.
  status = "titel";
  leben = LEBEN_BILDSCHIRM;
  requestAnimationFrame(schleife);
})();
