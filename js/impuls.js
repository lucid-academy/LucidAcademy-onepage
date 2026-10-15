/* =========================================================
   Lucid Academy — akson: impuls przechodzi przez sekcje strony
   Linia w lewym marginesie zaczyna się u podstawy pnia książki
   w hero (na wąskich ekranach przy etykiecie 00) i kończy na
   znaku > w stopce. Węzłami są etykiety sekcji (węzły Ranviera),
   a czoło impulsu idzie za przewijaniem i odpala mijane węzły.
   Bez JavaScriptu linii nie ma. Przy prefers-reduced-motion
   linia jest narysowana w całości i stoi.
   Geometrię liczymy tylko na starcie i po zmianie rozmiaru treści;
   pętla przewijania czyta wyłącznie gotową tablicę próbek.
   Ilustracje żyją: nad laserowymi grafikami leży warstwa światła,
   którą wystrzał węzła przechodzi falą, a w spoczynku wolno oddycha.
   ========================================================= */
(() => {
  "use strict";

  const main = document.getElementById("tresc");
  if (!main || !("ResizeObserver" in window)) return;

  const korzen = document.documentElement;
  const ograniczonyRuch = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bezRuchu = () => ograniczonyRuch.matches;
  const SVG = "http://www.w3.org/2000/svg";

  const LINIA_CZYTANIA = 0.55;   // czoło stoi na tej części wysokości okna
  const PRZERWA_WEZLA = 12;      // przerwa w osłonce mielinowej przy węźle (px)
  const OGON = [0.55, 0.38, 0.24, 0.13, 0.06]; // krycie kolejnych odcinków ogona
  const ODCINEK_OGONA = 20;      // 5 × 20 px ≈ 100 px gasnącego ogona
  const SKOK = 120;              // czas skoku impulsu między węzłami (ms)

  function el(tag, atrybuty, rodzic) {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(atrybuty || {})) e.setAttribute(k, v);
    if (rodzic) rodzic.append(e);
    return e;
  }

  /* ---------- Rysunek: jedna warstwa SVG nad treścią <main> ---------- */

  const svg = el("svg", { class: "akson", "aria-hidden": "true", focusable: "false" });
  const defs = el("defs", null, svg);
  const poswiata = el("radialGradient", { id: "akson-poswiata" }, defs);
  el("stop", { offset: "0", class: "akson__poswiata-srodek" }, poswiata);
  el("stop", { offset: "1", class: "akson__poswiata-brzeg" }, poswiata);

  const baza = el("path", { class: "akson__baza" }, svg);
  const przewod = el("path", { class: "akson__przewod" }, svg);
  // Ogon czoła: kilka krótkich odcinków o malejącym kryciu (animujemy tylko ich dashoffset)
  const ogon = OGON.map((krycie) => el("path", { class: "akson__ogon", "stroke-opacity": krycie }, svg));
  const warstwaWezlow = el("g", { class: "akson__wezly" }, svg);
  const start = el("circle", { class: "akson__start", r: "2.6" }, svg);
  const czolo = el("g", { class: "akson__czolo" }, svg);
  el("circle", { r: "12", fill: "url(#akson-poswiata)" }, czolo);
  el("circle", { class: "akson__rdzen", r: "2.4" }, czolo);
  const iskra = el("circle", { class: "akson__iskra", r: "2.2" }, svg);

  main.append(svg);

  // Węzły: etykiety sekcji 01–07 (etykieta 00 w hero to start albo nic)
  const wezly = [...main.querySelectorAll("section[id]")]
    .filter((s) => s.id !== "hero" && s.querySelector(".etykieta"))
    .map((s) => {
      const g = el("g", { class: "akson__wezel" }, warstwaWezlow);
      return {
        sekcja: s.id,
        etykieta: s.querySelector(".etykieta"),
        g,
        pierscien: el("circle", { class: "akson__pierscien", r: "4" }, g),
        punkt: el("circle", { class: "akson__punkt", r: "2.6" }, g),
        L: 0,
        ostatniWystrzal: -Infinity,
      };
    });

  /* ---------- Geometria ---------- */

  let geo = null;
  let wysokoscOkna = window.innerHeight;

  // Linie tekstu (a nie pudełka akapitów) w danym obszarze, we współrzędnych <main>
  function linieTekstu(obszar, m) {
    const prostokaty = [];
    const spacer = document.createTreeWalker(obszar, NodeFilter.SHOW_TEXT);
    const zakres = document.createRange();
    for (let w = spacer.nextNode(); w; w = spacer.nextNode()) {
      if (!w.textContent.trim()) continue;
      zakres.selectNodeContents(w);
      for (const r of zakres.getClientRects()) if (r.width && r.height) prostokaty.push([r.left - m.left, r.top - m.top, r.right - m.left, r.bottom - m.top]);
    }
    for (const b of obszar.querySelectorAll(".przycisk")) {
      const r = b.getBoundingClientRect();
      prostokaty.push([r.left - m.left, r.top - m.top, r.right - m.left, r.bottom - m.top]);
    }
    return prostokaty;
  }

  // Punkt z data-impuls="x% y%" (procenty obrazu) jako ułamki pudełka przy object-fit: cover
  function punktWPudelku(obraz, szer, wys) {
    const [px, py] = obraz.dataset.impuls.split(/\s+/).map((v) => parseFloat(v) / 100);
    if (!obraz.naturalWidth || !szer || !wys) return [px, py];
    const skala = Math.max(szer / obraz.naturalWidth, wys / obraz.naturalHeight);
    const w = obraz.naturalWidth * skala, h = obraz.naturalHeight * skala;
    const [ox, oy] = getComputedStyle(obraz).objectPosition.split(/\s+/).map((v) => parseFloat(v) / 100);
    return [((szer - w) * ox + px * w) / szer, ((wys - h) * oy + py * h) / wys];
  }

  // Punkt wejścia w ramce .hero__ilustracja, liczony z ramki (bez transformu paralaksy);
  // skalę paralaksy dodajemy osobno. Paralaksa siedzi na opakowaniu .swiatlo, jeśli jest.
  function punktPnia(obraz, m) {
    const nosnik = obraz.closest(".swiatlo") || obraz;
    const ramka = nosnik.parentElement.getBoundingClientRect();
    if (!ramka.width || !obraz.naturalWidth) return null;
    const [fx, fy] = punktWPudelku(obraz, ramka.width, ramka.height);
    let x = ramka.left + fx * ramka.width;
    let y = ramka.top + fy * ramka.height;
    // Paralaksa w strona.js powiększa obraz o 8% względem środka ramki
    if (nosnik.dataset.parallax && !bezRuchu()) {
      const sx = ramka.left + ramka.width / 2, sy = ramka.top + ramka.height / 2;
      x = sx + (x - sx) * 1.08;
      y = sy + (y - sy) * 1.08;
    }
    return { x: x - m.left, y: y - m.top };
  }

  // Położenie w dokumencie z offsetTop/offsetLeft: bez transformów, więc animacja
  // wejścia (12 px) ani paralaksa nie przesuwają węzłów względem etykiet
  function wDokumencie(e) {
    let x = 0, y = 0;
    for (let a = e; a; a = a.offsetParent) { x += a.offsetLeft; y += a.offsetTop; }
    return { x, y, w: e.offsetWidth, h: e.offsetHeight };
  }

  function zmierz() {
    ustawZrodlaFal();
    const m = main.getBoundingClientRect();
    const kontener = main.querySelector(".kontener");
    const stopka = document.querySelector(".stopka .etykieta__znak");
    if (!kontener || !stopka || !wezly.length) return;
    const lewy = kontener.getBoundingClientRect().left - m.left;
    const x = Math.round(lewy / 2) + 0.5; // środek lewego marginesu, ostra linia 1 px
    const gora = wDokumencie(main);
    const wysokoscEtykiety = (e) => { const d = wDokumencie(e); return d.y - gora.y + d.h / 2; };
    for (const w of wezly) w.y = wysokoscEtykiety(w.etykieta);
    const z = wDokumencie(stopka);
    const koniec = { x: z.x - gora.x - 7, y: z.y - gora.y + z.h / 2 };

    // Start: od pnia książki łagodną krzywą do marginesu pod tekstem hero,
    // a jeśli krzywa weszłaby na tekst, od razu w marginesie przy etykiecie 00
    const hero = document.getElementById("hero");
    const obraz = hero?.querySelector("img[data-impuls]");
    const tresc = hero?.querySelector(".hero__tresc");
    let d = null, wPniu = false, poczatek, krzywa = null;
    const pien = obraz && tresc ? punktPnia(obraz, m) : null;
    if (pien) {
      const tekst = linieTekstu(tresc, m);
      const dolTekstu = Math.max(pien.y, ...tekst.map((r) => r[3]));
      const yb = dolTekstu + 28;
      const k = [[pien.x, pien.y], [pien.x, yb], [x, yb], [x, yb + 90]];
      const luk = lukKrzywej(k);
      const naTekscie = (i) => tekst.some((r) => luk.X[i] > r[0] - 8 && luk.X[i] < r[2] + 8 && luk.Y[i] > r[1] - 8 && luk.Y[i] < r[3] + 8);
      if (!luk.X.some((_, i) => naTekscie(i)) && k[3][1] < wezly[0].y - 24) {
        d = `M${pien.x.toFixed(1)} ${pien.y.toFixed(1)} C${pien.x.toFixed(1)} ${yb.toFixed(1)} ${x} ${yb.toFixed(1)} ${x} ${(yb + 90).toFixed(1)}`;
        wPniu = true;
        poczatek = pien;
        krzywa = { luk, koniecY: yb + 90 };
      }
    }
    if (!d) {
      const zero = hero?.querySelector(".etykieta");
      poczatek = { x, y: zero ? wysokoscEtykiety(zero) : wezly[0].y - 200 };
      d = `M${x} ${poczatek.y.toFixed(1)}`;
    }
    d += ` L${x} ${koniec.y.toFixed(1)} L${Math.max(x, koniec.x).toFixed(1)} ${koniec.y.toFixed(1)}`;

    svg.style.height = `${Math.ceil(koniec.y + 16)}px`;
    for (const p of [baza, przewod, ...ogon]) p.setAttribute("d", d);
    const dlugosc = baza.getTotalLength();

    // Próbki co 4 px długości: wysokość → długość (wyszukiwanie binarne w pętli przewijania).
    // Wszystko liczymy sami: pion i hak dokładnie, krzywą z tablicy długości łuku,
    // dopasowanej do długości z przeglądarki, żeby kreski i czoło się zgadzały.
    const luk = krzywa?.luk;
    const yPionu = krzywa ? krzywa.koniecY : poczatek.y;
    const dlPionu = Math.max(0, koniec.y - yPionu);
    const dlHaka = Math.max(0, koniec.x - x);
    const dlKrzywej = luk ? Math.max(0, dlugosc - dlPionu - dlHaka) : 0;
    if (luk) for (let i = 0; i < luk.L.length; i++) luk.L[i] *= dlKrzywej / luk.calosc;
    const ile = Math.ceil(dlugosc / 4) + 1;
    const probkiL = new Float32Array(ile), probkiX = new Float32Array(ile), probkiY = new Float32Array(ile);
    for (let i = 0; i < ile; i++) {
      const L = Math.min(dlugosc, i * 4);
      let px, py;
      if (luk && L <= dlKrzywej) [px, py] = punktLuku(luk, L);
      else if (L <= dlKrzywej + dlPionu) { px = x; py = yPionu + (L - dlKrzywej); }
      else { px = x + (L - dlKrzywej - dlPionu); py = koniec.y; }
      probkiL[i] = L; probkiX[i] = px; probkiY[i] = Math.max(py, i ? probkiY[i - 1] : py);
    }
    geo = { dlugosc, probkiL, probkiX, probkiY, mainGora: m.top + window.scrollY, maksPrzewiniecie: Math.max(1, korzen.scrollHeight - wysokoscOkna) };
    for (const w of wezly) {
      w.L = dlugoscDla(w.y);
      w.g.setAttribute("transform", `translate(${x} ${w.y.toFixed(1)})`);
    }
    start.setAttribute("cx", poczatek.x.toFixed(1));
    start.setAttribute("cy", poczatek.y.toFixed(1));
    start.classList.toggle("akson__start--ukryty", wPniu);

    // Osłonka mielinowa: długie odcinki z przerwami w miejscach węzłów
    const kreski = [];
    let poprzedni = 0;
    for (const w of wezly) {
      kreski.push(Math.max(0, w.L - PRZERWA_WEZLA / 2 - poprzedni), PRZERWA_WEZLA);
      poprzedni = w.L + PRZERWA_WEZLA / 2;
    }
    kreski.push(Math.max(0, dlugosc - poprzedni), dlugosc);
    baza.style.strokeDasharray = kreski.map((v) => v.toFixed(1)).join(" ");
    przewod.style.strokeDasharray = `${dlugosc} ${dlugosc}`;
    for (const o of ogon) o.style.strokeDasharray = `${ODCINEK_OGONA} ${dlugosc + 100}`;

    odswiezStan();
  }

  // Krzywa Béziera z hero: 160 odcinków, skumulowana długość łuku
  function lukKrzywej(k) {
    const n = 160, X = new Float32Array(n + 1), Y = new Float32Array(n + 1), L = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
      X[i] = a * k[0][0] + b * k[1][0] + c * k[2][0] + e * k[3][0];
      Y[i] = a * k[0][1] + b * k[1][1] + c * k[2][1] + e * k[3][1];
      L[i] = i ? L[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]) : 0;
    }
    return { X, Y, L, calosc: L[n] || 1 };
  }

  function punktLuku(luk, dl) {
    const { X, Y, L } = luk;
    let i = 1;
    while (i < L.length - 1 && L[i] < dl) i++;
    const t = (dl - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    return [X[i - 1] + (X[i] - X[i - 1]) * t, Y[i - 1] + (Y[i] - Y[i - 1]) * t];
  }

  function dlugoscDla(y) {
    const { probkiY, probkiL } = geo;
    if (y <= probkiY[0]) return 0;
    let lo = 0, hi = probkiY.length - 1;
    if (y >= probkiY[hi]) return geo.dlugosc;
    while (hi - lo > 1) {
      const sr = (lo + hi) >> 1;
      if (probkiY[sr] < y) lo = sr; else hi = sr;
    }
    const zakres = probkiY[hi] - probkiY[lo];
    return probkiL[lo] + (zakres ? (y - probkiY[lo]) / zakres : 0) * (probkiL[hi] - probkiL[lo]);
  }

  function punktNa(L) {
    const { probkiL, probkiX, probkiY } = geo;
    const i = Math.min(probkiL.length - 2, Math.max(0, Math.floor(L / 4)));
    const t = Math.min(1, Math.max(0, (L - probkiL[i]) / ((probkiL[i + 1] - probkiL[i]) || 1)));
    return [probkiX[i] + (probkiX[i + 1] - probkiX[i]) * t, probkiY[i] + (probkiY[i + 1] - probkiY[i]) * t];
  }

  /* ---------- Czoło impulsu i wystrzały węzłów ---------- */

  let biezaceL = 0, pierwszaKlatka = true;

  // Linia czytania na 55% okna; na ostatnim ekranie zjeżdża w dół, żeby czoło doszło do stopki
  function celWysokosc() {
    const y = window.scrollY;
    const doKonca = geo.maksPrzewiniecie - y;
    const czesc = doKonca < wysokoscOkna ? LINIA_CZYTANIA + (1 - LINIA_CZYTANIA) * 0.96 * (1 - doKonca / wysokoscOkna) : LINIA_CZYTANIA;
    return y + wysokoscOkna * czesc - geo.mainGora;
  }

  function ustawCzolo(L) {
    przewod.style.strokeDashoffset = geo.dlugosc - L;
    ogon.forEach((o, i) => { o.style.strokeDashoffset = -(L - ODCINEK_OGONA * (i + 1)); });
    const [px, py] = punktNa(L);
    czolo.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
  }

  function wystrzel(w) {
    const teraz = performance.now();
    w.g.classList.add("akson__wezel--przebyty");
    if (teraz - w.ostatniWystrzal < 1500) return; // bez serii przy drganiu wokół węzła
    w.ostatniWystrzal = teraz;
    w.pierscien.animate(
      [{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(7)", opacity: 0 }],
      { duration: 700, easing: "cubic-bezier(.2, .7, .2, 1)" },
    );
    w.etykieta.classList.add("etykieta--impuls");
    clearTimeout(w.zgaszenie);
    w.zgaszenie = setTimeout(() => w.etykieta.classList.remove("etykieta--impuls"), 900);
    // Etap 2 (fala w ilustracji sekcji) słucha tego zdarzenia
    document.dispatchEvent(new CustomEvent("impuls:wezel", { detail: { sekcja: w.sekcja } }));
  }

  let zaplanowane = false;
  function klatka() {
    zaplanowane = false;
    if (!geo || bezRuchu()) return;
    const L = dlugoscDla(celWysokosc());
    ustawCzolo(L);
    if (pierwszaKlatka) {
      // Po wczytaniu (np. z kotwicy) węzły nad czołem są przebyte, ale nie strzelają naraz
      for (const w of wezly) if (w.L <= L) w.g.classList.add("akson__wezel--przebyty");
      pierwszaKlatka = false;
    } else if (L > biezaceL) {
      for (const w of wezly) if (w.L > biezaceL && w.L <= L) wystrzel(w);
    }
    biezaceL = L;
  }
  function zaplanuj() {
    if (zaplanowane) return;
    zaplanowane = true;
    requestAnimationFrame(klatka);
  }

  /* ---------- Spoczynek: przewodzenie skokowe od startu do czoła ---------- */

  let zegarSkoku = 0, skokTrwa = false;

  function wstrzymane() {
    return document.hidden || bezRuchu() || ["siec-otwarta", "galeria-otwarta", "animacje-wstrzymane"].some((k) => korzen.classList.contains(k));
  }

  function zaplanujSkok() {
    clearTimeout(zegarSkoku);
    zegarSkoku = setTimeout(skacz, 5000 + Math.random() * 3000);
  }

  function skacz() {
    if (!geo || skokTrwa || wstrzymane() || biezaceL < 40) { zaplanujSkok(); return; }
    const przystanki = [0, ...wezly.filter((w) => w.L < biezaceL - 4).map((w) => w.L), biezaceL];
    const wezlyPrzystankow = [null, ...wezly.filter((w) => w.L < biezaceL - 4), null];
    skokTrwa = true;
    iskra.classList.add("akson__iskra--widoczna");
    const t0 = performance.now();
    function krok(teraz) {
      const i = Math.floor((teraz - t0) / SKOK);
      if (i >= przystanki.length - 1 || wstrzymane()) {
        iskra.classList.remove("akson__iskra--widoczna");
        skokTrwa = false;
        zaplanujSkok();
        return;
      }
      const t = ((teraz - t0) % SKOK) / SKOK;
      const [px, py] = punktNa(przystanki[i] + (przystanki[i + 1] - przystanki[i]) * t);
      iskra.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      const w = wezlyPrzystankow[i];
      if (w && !w.blysk) {
        w.blysk = true;
        w.punkt.animate([{ opacity: 1, transform: "scale(1.8)" }, { opacity: 0.85, transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
      }
      requestAnimationFrame(krok);
    }
    for (const w of wezly) w.blysk = false;
    requestAnimationFrame(krok);
  }

  // Pierwszy impuls po „włączeniu się” książki: od startu do pierwszego węzła albo do czoła
  function impulsZPnia() {
    if (!geo || skokTrwa || wstrzymane()) return;
    const cel = Math.min(geo.dlugosc, Math.max(biezaceL, wezly[0].L));
    skokTrwa = true;
    iskra.classList.add("akson__iskra--widoczna");
    const t0 = performance.now(), czas = Math.min(1800, Math.max(900, cel * 0.9));
    function krok(teraz) {
      const t = Math.min(1, (teraz - t0) / czas);
      const e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
      const [px, py] = punktNa(cel * e);
      iskra.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      if (t < 1 && !wstrzymane()) { requestAnimationFrame(krok); return; }
      iskra.classList.remove("akson__iskra--widoczna");
      skokTrwa = false;
      zaplanujSkok();
    }
    requestAnimationFrame(krok);
  }

  /* ---------- Ilustracje żyją: warstwa światła nad laserowymi grafikami ---------- */
  // Kopia ilustracji z tym samym src/srcset/sizes (bez drugiego pobrania) leży nad oryginałem
  // w osobnej warstwie: czarne tło, na nim białe kształty światła (plama oddechu, pierścienie
  // fal), a na wierzchu kopia w trybie multiply. Filtr kopii najpierw kontrastem zgniata
  // granatowe tło do czerni, potem rozjaśnia linie, więc warstwa zawiera tylko „linie × światło”,
  // a plus-lighter dodaje ją do oryginału bez rozjaśniania tła. Kształty animujemy wyłącznie
  // przez transform i opacity: to liczy kompozytor, bez przerysowywania obrazu w każdej klatce
  // (maska animowana zmiennymi CSS zmuszała do pełnej rasteryzacji ilustracji co klatkę).
  const FALA = 1400;
  const obslugaSwiatla = !!window.CSS?.supports?.("mix-blend-mode", "multiply");

  let swiatla = [];

  // Warstwy powstają po wczytaniu strony, w wolnej chwili: pierwszy render ich nie czeka
  function utworzSwiatla() {
    if (swiatla.length || !obslugaSwiatla) return;
    swiatla = [...main.querySelectorAll("img[data-impuls]")].map(owin);
    if (!swiatla.length) return;
    ustawZrodlaFal();
    document.dispatchEvent(new CustomEvent("paralaksa:odswiez"));
    // Oddychają najwyżej dwie ilustracje, te najbardziej widoczne; reszta stoi
    const obserwator = new IntersectionObserver((wpisy) => {
      for (const w of wpisy) {
        const s = swiatla.find((x) => x.nosnik.parentElement === w.target);
        s.widoczny = w.isIntersecting ? w.intersectionRatio : 0;
        if (s.czeka && s.widoczny > 0.2) falaSekcji(s);
      }
      const zywe = swiatla.filter((s) => s.widoczny > 0.05).sort((a, b) => b.widoczny - a.widoczny).slice(0, 2);
      for (const s of swiatla) s.nosnik.classList.toggle("swiatlo--zywe", zywe.includes(s));
    }, { threshold: [0, 0.05, 0.2, 0.4, 0.6, 0.8, 1] });
    for (const s of swiatla) obserwator.observe(s.nosnik.parentElement);
  }

  function owin(obraz, i) {
    const nosnik = document.createElement("div");
    nosnik.className = "swiatlo";
    // Paralaksa ma przesuwać oryginał i warstwę światła razem, więc przenosimy ją na opakowanie,
    // razem z bieżącym przesunięciem, żeby obraz nie drgnął przed następną klatką paralaksy
    if (obraz.dataset.parallax) {
      nosnik.dataset.parallax = obraz.dataset.parallax;
      nosnik.style.transform = obraz.style.transform;
      delete obraz.dataset.parallax;
      obraz.style.transform = "";
    }
    obraz.replaceWith(nosnik);
    const warstwa = document.createElement("div");
    warstwa.className = "swiatlo__warstwa";
    warstwa.setAttribute("aria-hidden", "true");
    const plama = document.createElement("span");
    plama.className = "swiatlo__plama";
    const kopia = obraz.cloneNode(false);
    kopia.className = "swiatlo__kopia";
    kopia.alt = "";
    kopia.setAttribute("aria-hidden", "true");
    // Kopia jest ozdobna: nigdy nie konkuruje z oryginałem o pierwsze wczytanie
    kopia.removeAttribute("fetchpriority");
    kopia.loading = "lazy";
    kopia.removeAttribute("data-impuls");
    warstwa.append(plama, kopia);
    nosnik.append(obraz, warstwa);
    // Leniwie wczytany obraz zna proporcje dopiero po load; od nich zależy kadr object-fit
    if (!obraz.complete) obraz.addEventListener("load", ustawZrodlaFal, { once: true });
    // Oddech 16–22 s na cykl, każda ilustracja w innej fazie, żeby nie pulsowały razem
    nosnik.style.setProperty("--oddech-czas", `${(16 + (i * 2.7) % 6).toFixed(1)}s`);
    nosnik.style.setProperty("--oddech-start", `${(-(i * 5.3) % 16).toFixed(1)}s`);
    return { nosnik, obraz, warstwa, kopia, sekcja: nosnik.closest("section")?.id, widoczny: 0, czeka: false };
  }

  const poWczytaniu = () => (window.requestIdleCallback ? requestIdleCallback(utworzSwiatla, { timeout: 1500 }) : setTimeout(utworzSwiatla, 200));
  if (document.readyState === "complete") poWczytaniu();
  else window.addEventListener("load", poWczytaniu, { once: true });

  // Środek fal w punkcie wejścia; zasięg pierścienia to 1,24 × odległość do najdalszego rogu,
  // więc grzbiet fali (96% promienia) kończy przy ok. 120% tej odległości
  function ustawZrodlaFal() {
    for (const s of swiatla) {
      const w = s.nosnik.offsetWidth, h = s.nosnik.offsetHeight;
      const [fx, fy] = punktWPudelku(s.obraz, w, h);
      const zasieg = 1.24 * Math.hypot(Math.max(fx, 1 - fx) * w, Math.max(fy, 1 - fy) * h);
      s.warstwa.style.setProperty("--zrodlo-x", `${(fx * 100).toFixed(2)}%`);
      s.warstwa.style.setProperty("--zrodlo-y", `${(fy * 100).toFixed(2)}%`);
      s.warstwa.style.setProperty("--zasieg", `${Math.ceil(zasieg)}px`);
    }
  }

  // Pierścień (nie koło) od punktu wejścia do ok. 120%, z wygaszeniem; jeden przebieg i znika
  function fala(s, opoznienie = 0) {
    if (bezRuchu() || korzen.classList.contains("animacje-wstrzymane")) return;
    const pierscien = document.createElement("span");
    pierscien.className = "swiatlo__fala";
    s.warstwa.insertBefore(pierscien, s.kopia);
    const animacja = pierscien.animate(
      [
        { transform: "scale(.02)", opacity: 0 },
        { transform: "scale(.12)", opacity: 1, offset: 0.12 },
        { transform: "scale(.74)", opacity: 0.7, offset: 0.72 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { duration: FALA, delay: opoznienie, easing: "cubic-bezier(.3, .55, .45, 1)", fill: "backwards" },
    );
    animacja.onfinish = animacja.oncancel = () => pierscien.remove();
  }

  function falaSekcji(s, opoznienie = 0) {
    s.czeka = false;
    // Wieża w kontakcie nadaje: trzy koncentryczne fale, jak sygnał nad miastem
    if (s.sekcja === "kontakt") [0, 420, 840].forEach((o) => fala(s, o));
    else fala(s, opoznienie);
  }

  // Wystrzał węzła: fala w ilustracjach tej sekcji; niewidoczna ilustracja dostaje ją przy wejściu w kadr
  document.addEventListener("impuls:wezel", (z) => {
    swiatla.filter((s) => s.sekcja === z.detail.sekcja).forEach((s, i) => {
      if (s.widoczny > 0.2) falaSekcji(s, i * 180);
      else s.czeka = true;
    });
  });

  // Hero na starcie: po scramble książka „się włącza”, a zaraz potem z pnia wychodzi impuls
  document.addEventListener("scramble:koniec", () => {
    utworzSwiatla();
    const hero = swiatla.find((s) => s.sekcja === "hero");
    if (hero) fala(hero);
    setTimeout(impulsZPnia, hero ? 900 : 0);
  });

  /* ---------- Pauza: ruch, który startuje sam (oddech, impuls skokowy), da się zatrzymać ---------- */

  const KLUCZ_PAUZY = "lucid:animacje-wstrzymane";
  const czytaj = () => { try { return localStorage.getItem(KLUCZ_PAUZY) === "1"; } catch { return false; } };
  const zapisz = (v) => { try { if (v) localStorage.setItem(KLUCZ_PAUZY, "1"); else localStorage.removeItem(KLUCZ_PAUZY); } catch { /* bez pamięci też działa */ } };
  const pauza = document.createElement("button");
  pauza.type = "button";
  pauza.className = "link-cichy pauza-animacji";
  pauza.append(Object.assign(document.createElement("span"), { className: "pauza-animacji__ikona" }), "Wstrzymaj animacje");
  pauza.firstChild.setAttribute("aria-hidden", "true");
  function ustawPauze(v) {
    korzen.classList.toggle("animacje-wstrzymane", v);
    pauza.setAttribute("aria-pressed", String(v));
    if (!v) zaplanujSkok();
  }
  pauza.addEventListener("click", () => { const v = pauza.getAttribute("aria-pressed") !== "true"; ustawPauze(v); zapisz(v); });
  document.querySelector(".stopka__wnetrze .link-cichy")?.before(pauza);
  ustawPauze(czytaj());

  /* ---------- Stan zależny od ustawień ruchu ---------- */

  function odswiezStan() {
    if (!geo) return;
    korzen.classList.toggle("akson-bez-ruchu", bezRuchu());
    if (bezRuchu()) {
      // Linia w całości i bez ruchu: wszystkie węzły słabo zapalone, bez czoła i impulsów
      przewod.style.strokeDashoffset = 0;
      for (const w of wezly) w.g.classList.add("akson__wezel--przebyty");
      clearTimeout(zegarSkoku);
    } else {
      zaplanuj();
      zaplanujSkok();
    }
  }

  /* ---------- Zdarzenia ---------- */

  let pomiarZaplanowany = false;
  function zaplanujPomiar() {
    if (pomiarZaplanowany) return;
    pomiarZaplanowany = true;
    requestAnimationFrame(() => { pomiarZaplanowany = false; zmierz(); });
  }

  window.addEventListener("scroll", zaplanuj, { passive: true });
  window.addEventListener("resize", () => { wysokoscOkna = window.innerHeight; zaplanujPomiar(); }, { passive: true });
  // Kafle z kafle.json doczytują się później i zmieniają wysokość sekcji 05
  new ResizeObserver(zaplanujPomiar).observe(main);
  document.fonts?.ready.then(zaplanujPomiar);
  window.addEventListener("load", zaplanujPomiar);
  // Skala paralaksy (a więc i punkt pnia) zależy od ustawienia ruchu: liczymy od nowa
  ograniczonyRuch.addEventListener("change", zaplanujPomiar);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) zaplanujSkok(); });
})();
