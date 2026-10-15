/* =========================================================
   Lucid Academy — eksperyment: ruch własny ilustracji
   Każda laserowa ilustracja dostaje ruch, który wynika z tego,
   co przedstawia: wiedza wznosi się w książce, impuls waży racje
   między kulami, wieża nadaje. Kształty światła leżą w warstwie
   z js/impuls.js (czarne tło, kopia w trybie multiply), więc
   świecą wyłącznie linie ilustracji. Ruszają się tylko przez
   transform i opacity: to liczy kompozytor, bez przerysowywania.
   Ruch biegnie tylko w widocznych ilustracjach (najwyżej dwóch)
   i staje razem z pauzą w stopce, galerią i trybem sieci.
   Przy prefers-reduced-motion nie ma go wcale.
   ========================================================= */
(() => {
  "use strict";

  const korzen = document.documentElement;
  const ograniczonyRuch = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bezRuchu = () => ograniczonyRuch.matches;
  if (!("animate" in Element.prototype)) return;

  /* ---------- Choreografie ----------
     Współrzędne w % ilustracji, czasy w ms od początku okresu.
     iskra: punkt światła wędrujący po klatkach [t, x, y, krycie]
     blysk: światło w miejscu, klatki [t, krycie]
     krag:  pierścień z punktu, klatki [t, skala, krycie] (skala 1 = ok. 80% drogi do najdalszego rogu)
     rozmiar: promień w % szerokości ilustracji (albo [poziomo, pionowo] dla elipsy, oba w % szerokości) */
  const CHOREOGRAFIE = {
    // Książka: wiedza wznosi się z pnia przez korzenie w strony; bańki co chwilę łapią światło
    ksiazka: [
      { ksztalt: "iskra", rozmiar: [34, 8], okres: 7000, opoznienie: 3200,
        klatki: [[0, 50, 100, 0], [450, 50, 86, 0.95], [2500, 50, 12, 0.8], [3000, 50, 2, 0]] },
      { ksztalt: "blysk", punkt: [21, 21], rozmiar: 4, okres: 7300, opoznienie: 1200, klatki: [[0, 0], [500, 0.9], [1400, 0]] },
      { ksztalt: "blysk", punkt: [85, 38], rozmiar: 4, okres: 8100, opoznienie: 4300, klatki: [[0, 0], [500, 0.9], [1400, 0]] },
      { ksztalt: "blysk", punkt: [22, 61], rozmiar: 3.5, okres: 6700, opoznienie: 5900, klatki: [[0, 0], [500, 0.9], [1400, 0]] },
    ],
    // Etyka: impuls biegnie wiązką od kuli do kuli; pryzmat rozbłyska, gdy impuls mija środek
    waga: [
      { ksztalt: "iskra", rozmiar: [11, 8], okres: 7800,
        klatki: [[0, 8, 44, 0], [250, 10, 44, 0.95], [2400, 90, 44, 0.95], [2650, 92, 44, 0], [3900, 92, 44, 0],
          [4150, 90, 44, 0.95], [6300, 10, 44, 0.95], [6550, 8, 44, 0], [7800, 8, 44, 0]] },
      { ksztalt: "blysk", punkt: [50, 45], rozmiar: 6, okres: 7800,
        klatki: [[0, 0], [1100, 0], [1325, 0.95], [1800, 0], [5000, 0], [5225, 0.95], [5700, 0], [7800, 0]] },
      { ksztalt: "blysk", punkt: [80, 42], rozmiar: 13, okres: 7800, klatki: [[0, 0], [2300, 0], [2750, 0.6], [3900, 0], [7800, 0]] },
      { ksztalt: "blysk", punkt: [17, 42], rozmiar: 13, okres: 7800, klatki: [[0, 0], [6200, 0], [6650, 0.6], [7700, 0], [7800, 0]] },
    ],
    // Pytanie: światło wodzi po łuku znaku zapytania i kończy pierścieniem na kropce
    pytanie: [
      { ksztalt: "iskra", rozmiar: 7.5, okres: 8000,
        klatki: [[0, 33, 31, 0], [300, 34, 24, 0.95], [800, 40, 10, 0.95], [1300, 50, 5, 0.95], [1800, 61, 10, 0.95],
          [2300, 65, 24, 0.95], [2800, 58, 37, 0.95], [3300, 52, 47, 0.95], [3800, 48, 58, 0.9], [4100, 48, 64, 0]] },
      { ksztalt: "blysk", punkt: [48, 75], rozmiar: 5, okres: 8000, klatki: [[0, 0], [4000, 0], [4200, 0.95], [5100, 0], [8000, 0]] },
      { ksztalt: "krag", punkt: [48, 75], okres: 8000, klatki: [[0, 0.05, 0], [4000, 0.05, 0], [4150, 0.08, 0.9], [5700, 0.55, 0], [8000, 0.55, 0]] },
    ],
    // Pryzmaty: impuls leci laserem przez kolejne pryzmaty i rozbłyska w sieci po prawej
    wiazka: [
      { ksztalt: "iskra", rozmiar: 6.5, okres: 7000,
        klatki: [[0, 0, 79, 0], [200, 4, 77, 0.95], [900, 21, 67, 0.95], [1300, 33, 63, 0.95], [1800, 47, 53, 0.95],
          [2200, 58, 44, 0.95], [2600, 66, 38, 0.95], [3000, 73, 32, 0.95], [3200, 76, 30, 0]] },
      { ksztalt: "krag", punkt: [78, 30], okres: 7000, klatki: [[0, 0.05, 0], [3100, 0.05, 0], [3250, 0.08, 0.9], [4900, 0.7, 0], [7000, 0.7, 0]] },
    ],
    // Vibe coding: z dymka światło spływa strumieniem do klocków, które się zapalają
    przeplyw: [
      { ksztalt: "blysk", punkt: [30, 32], rozmiar: 9, okres: 7000, klatki: [[0, 0], [300, 0.8], [900, 0], [7000, 0]] },
      { ksztalt: "iskra", rozmiar: 6.5, okres: 7000,
        klatki: [[0, 30, 34, 0], [400, 29, 42, 0.95], [900, 27, 50, 0.95], [1400, 36, 56, 0.95], [1900, 47, 54, 0.95],
          [2400, 57, 50, 0.95], [2900, 66, 45, 0.95], [3300, 72, 41, 0.9], [3500, 74, 40, 0]] },
      { ksztalt: "blysk", punkt: [72, 40], rozmiar: 15, okres: 7000, klatki: [[0, 0], [3200, 0], [3650, 0.75], [4900, 0], [7000, 0]] },
    ],
    // Facylitacja: pierścienie zbiegają się do diamentu w środku kręgu, który błyska przy każdym dotarciu
    zbieganie: [
      { ksztalt: "krag", punkt: [50, 53], okres: 4000, klatki: [[0, 1.05, 0], [300, 1, 0.8], [2000, 0.06, 0.9], [2150, 0.04, 0], [4000, 0.04, 0]] },
      { ksztalt: "krag", punkt: [50, 53], okres: 4000, opoznienie: 2000, klatki: [[0, 1.05, 0], [300, 1, 0.8], [2000, 0.06, 0.9], [2150, 0.04, 0], [4000, 0.04, 0]] },
      { ksztalt: "blysk", punkt: [50, 50], rozmiar: 7, okres: 2000, opoznienie: 2000, klatki: [[0, 0.95], [600, 0], [1900, 0], [2000, 0.95]] },
    ],
    // Wieża: z kuli na szczycie stale wychodzą fale, jak sygnał nad miastem
    nadawanie: [
      { ksztalt: "krag", punkt: [50, 40], okres: 3200, klatki: [[0, 0.04, 0], [150, 0.06, 0.9], [2700, 1, 0], [3200, 1, 0]] },
      { ksztalt: "krag", punkt: [50, 40], okres: 3200, opoznienie: 1600, klatki: [[0, 0.04, 0], [150, 0.06, 0.9], [2700, 1, 0], [3200, 1, 0]] },
      { ksztalt: "blysk", punkt: [50, 40], rozmiar: 5, okres: 1600, klatki: [[0, 0.85], [700, 0.2], [1600, 0.85]] },
    ],
  };

  /* ---------- Budowa kształtów i animacji ---------- */

  const ilustracje = [];

  function utworzKsztalt(warstwa, kopia, opis) {
    const el = document.createElement("span");
    el.className = `ruch__${opis.ksztalt}`;
    const [rx, ry] = Array.isArray(opis.rozmiar) ? opis.rozmiar : [opis.rozmiar, null];
    if (rx) el.style.setProperty("--rx", rx);
    if (ry) el.style.setProperty("--ry", ry);
    if (opis.punkt) {
      el.style.setProperty("--x", opis.punkt[0]);
      el.style.setProperty("--y", opis.punkt[1]);
    }
    warstwa.insertBefore(el, kopia);
    const klatki = opis.klatki.map((k) => {
      const offset = k[0] / opis.okres;
      if (opis.ksztalt === "iskra") return { offset, transform: `translate(${k[1]}cqw, ${k[2]}cqh)`, opacity: k[3] };
      if (opis.ksztalt === "krag") return { offset, transform: `scale(${k[1]})`, opacity: k[2] };
      return { offset, opacity: k[1] };
    });
    // Ostatnia klatka na końcu okresu, żeby pętla nie przeskakiwała
    if (klatki[klatki.length - 1].offset < 1) klatki.push({ ...klatki[klatki.length - 1], offset: 1 });
    return el.animate(klatki, { duration: opis.okres, delay: opis.opoznienie || 0, iterations: Infinity, fill: "backwards" });
  }

  // Światło za kursorem: tylko mysz albo pióro, wyłącznie nad samą ilustracją
  function swiatloZaKursorem(s) {
    const el = document.createElement("span");
    el.className = "ruch__kursor";
    s.warstwa.insertBefore(el, s.kopia);
    const sekcja = s.nosnik.closest("section") || s.nosnik.parentElement;
    let cel = null, zaplanowane = false;
    const ustaw = () => {
      zaplanowane = false;
      if (!cel) return;
      el.style.transform = `translate(${cel.x.toFixed(1)}px, ${cel.y.toFixed(1)}px)`;
    };
    sekcja.addEventListener("pointermove", (z) => {
      if (z.pointerType === "touch" || !s.gra) return;
      const r = s.warstwa.getBoundingClientRect();
      const wewnatrz = z.clientX >= r.left && z.clientX <= r.right && z.clientY >= r.top && z.clientY <= r.bottom;
      el.classList.toggle("ruch__kursor--widoczny", wewnatrz);
      if (!wewnatrz) return;
      // Pozycja w układzie warstwy bez transformu paralaksy (skala 1,08)
      cel = { x: ((z.clientX - r.left) / r.width) * s.warstwa.offsetWidth, y: ((z.clientY - r.top) / r.height) * s.warstwa.offsetHeight };
      if (!zaplanowane) { zaplanowane = true; requestAnimationFrame(ustaw); }
    }, { passive: true });
    sekcja.addEventListener("pointerleave", () => el.classList.remove("ruch__kursor--widoczny"));
    return el;
  }

  function aktywna(s) {
    return !bezRuchu() && s.nosnik.classList.contains("swiatlo--zywe")
      && !["siec-otwarta", "galeria-otwarta", "animacje-wstrzymane"].some((k) => korzen.classList.contains(k));
  }

  function odswiez(s) {
    const gra = aktywna(s);
    if (gra === s.gra) return;
    s.gra = gra;
    for (const a of s.animacje) { if (gra) a.play(); else a.pause(); }
    if (!gra) s.kursor.classList.remove("ruch__kursor--widoczny");
  }

  function przygotuj() {
    for (const nosnik of document.querySelectorAll(".swiatlo")) {
      if (ilustracje.some((s) => s.nosnik === nosnik)) continue;
      const warstwa = nosnik.querySelector(".swiatlo__warstwa");
      const kopia = warstwa?.querySelector(".swiatlo__kopia");
      const nazwa = nosnik.querySelector("img[data-ruch]")?.dataset.ruch;
      if (!kopia || !CHOREOGRAFIE[nazwa]) continue;
      const s = { nosnik, warstwa, kopia, gra: null, animacje: [] };
      s.animacje = CHOREOGRAFIE[nazwa].map((opis) => utworzKsztalt(warstwa, kopia, opis));
      s.kursor = swiatloZaKursorem(s);
      ilustracje.push(s);
      odswiez(s);
      // impuls.js przełącza swiatlo--zywe (najwyżej dwie widoczne ilustracje)
      new MutationObserver(() => odswiez(s)).observe(nosnik, { attributes: true, attributeFilter: ["class"] });
    }
  }

  // Pauza w stopce, galeria i tryb sieci to klasy na <html>
  new MutationObserver(() => ilustracje.forEach(odswiez)).observe(korzen, { attributes: true, attributeFilter: ["class"] });
  ograniczonyRuch.addEventListener("change", () => ilustracje.forEach(odswiez));

  document.addEventListener("swiatla:gotowe", przygotuj);
  if (document.querySelector(".swiatlo__warstwa")) przygotuj();
})();
