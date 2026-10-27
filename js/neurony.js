/* =========================================================
   Lucid Academy — sieć neuronowa w hero i jej małe fragmenty w wolnych
   miejscach strony (w stylu oferty dla szkół). Każde płótno
   z data-neurony: punkty, gdy płótno wjedzie w kadr, w kilka sekund
   łagodnie układają się w sieć i zostają w spoczynku. Mysz: połączenia do kursora, lekkie przyciąganie
   węzłów i impulsy biegnące po krawędziach; dotknięcie wysyła impuls.
   Pętla rysowania działa tylko wtedy, gdy coś się rusza, więc
   w spoczynku strona nic nie liczy, a ruch, który startuje sam,
   trwa krócej niż 5 s (WCAG 2.2.2). Przy prefers-reduced-motion sieć
   jest od razu ułożona i nie reaguje. Bez bibliotek; kolory z tokenów.
   Osobny plik: da się wycofać jednym ruchem.
   ========================================================= */
(() => {
  "use strict";

  const plotna = document.querySelectorAll("canvas[data-neurony]");
  if (!plotna.length || typeof HTMLCanvasElement.prototype.getContext !== "function") return;

  const ograniczonyRuch = matchMedia("(prefers-reduced-motion: reduce)");
  const bezRuchu = () => ograniczonyRuch.matches;

  const styl = getComputedStyle(document.documentElement);
  const rgb = (nazwa, zapas) => {
    const h = (styl.getPropertyValue(nazwa).trim() || zapas).replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const KOLOR = {
    fiolet: rgb("--violet", "#A855F7"),
    jasny: rgb("--violet-jasny", "#C9A6FF"),
    cyjan: rgb("--cyan", "#3DE3F0"),
  };
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  const UKLADANIE = 3600;     // ms ruchu jednego węzła; z opóźnieniem najwyżej 4,3 s
  const OPOZNIENIE = 700;     // największe opóźnienie startu węzła
  const ZASIEG = 160;         // px: kursor przyciąga i łączy węzły w tym promieniu
  const PRZYCIAGANIE = 18;    // px: największe przesunięcie węzła w stronę kursora
  const ZAPLON = 48;          // px: kursor tak blisko węzła wysyła impuls
  const PRZERWA_ZAPLONU = 1400;
  const PREDKOSC_IMPULSU = 0.32; // px/ms
  const MAKS_IMPULSOW = 28;

  // Stałe ziarno: ten sam układ przy każdym wczytaniu (powtarzalne zrzuty i testy)
  function losowanie(ziarno) {
    let a = ziarno >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lagodnie = (k) => 1 - Math.pow(1 - k, 3);

  plotna.forEach(uruchom);

  function uruchom(plotno, numer) {
    const ctx = plotno.getContext("2d");
    if (!ctx) return;
    const obszar = plotno.parentElement;
    // Tekst, przy którym sieć ma być rzadsza (selektor w data-neurony-tekst)
    const tekst = plotno.dataset.neuronyTekst ? obszar.querySelectorAll(plotno.dataset.neuronyTekst) : [];
    // Mała sieć (fragment w wolnym miejscu strony): mniej węzłów i krótsze układanie
    const [ILE_MIN, ILE_MAX] = (plotno.dataset.neuronyIle || "28,90").split(",").map(Number);
    const CZAS = Number(plotno.dataset.neuronyCzas) || UKLADANIE;

    let W = 0, H = 0, dpr = 1;
    let wezly = [], krawedzie = [], sasiedzi = [];
    let impulsy = [];
    let kursor = null;
    let start = 0;            // chwila startu układania (0 = jeszcze nie wystartowało)
    let ulozona = bezRuchu();
    // Układanie startuje dopiero, gdy płótno jest co najmniej w 30% w kadrze
    const zObserwatorem = "IntersectionObserver" in window;
    let widoczna = !zObserwatorem, doStartu = !zObserwatorem, ramka = 0;

    function rozmiesc() {
      const r = plotno.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      plotno.width = Math.round(W * dpr);
      plotno.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const strefy = [...tekst].map((e) => {
        const b = e.getBoundingClientRect();
        return { x0: b.left - r.left - 24, x1: b.right - r.left + 24, y0: b.top - r.top - 24, y1: b.bottom - r.top + 24 };
      });
      const wTekscie = (x, y) => strefy.some((s) => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);

      // Każde płótno ma własne ziarno, żeby fragmenty o tym samym rozmiarze się nie powtarzały
      const los = losowanie(20261027 + numer * 7919);
      const n = Math.round(Math.min(ILE_MAX, Math.max(ILE_MIN, (W * H) / 14000)));
      const odstep = Math.sqrt((W * H) / n) * 0.7;
      // Losowanie z minimalnym odstępem; siatka komórek (bok odstęp/√2, w każdej najwyżej
      // jeden punkt) sprawdza tylko sąsiednie komórki zamiast wszystkich punktów
      const punkty = [];
      const bok = odstep / Math.SQRT2, kol = Math.ceil(W / bok), wier = Math.ceil(H / bok);
      const siatka = new Int32Array(kol * wier).fill(-1);
      const wolne = (x, y, gx, gy) => {
        for (let yy = Math.max(0, gy - 2); yy <= Math.min(wier - 1, gy + 2); yy++) {
          for (let xx = Math.max(0, gx - 2); xx <= Math.min(kol - 1, gx + 2); xx++) {
            const j = siatka[yy * kol + xx];
            if (j >= 0 && (punkty[j].x - x) ** 2 + (punkty[j].y - y) ** 2 < odstep * odstep) return false;
          }
        }
        return true;
      };
      for (let proba = 0; punkty.length < n && proba < n * 60; proba++) {
        const x = 8 + los() * (W - 16), y = 8 + los() * (H - 16);
        // Przy tekście sieć rzadsza, żeby nagłówek i akapit zostały czytelne
        if (wTekscie(x, y) && los() > 0.5) continue;
        const gx = Math.floor(x / bok), gy = Math.floor(y / bok);
        if (!wolne(x, y, gx, gy)) continue;
        siatka[gy * kol + gx] = punkty.length;
        punkty.push({ x, y });
      }

      wezly = punkty.map((p) => {
        const kat = los() * Math.PI * 2, d = odstep * (0.8 + los() * 0.9);
        return {
          x: p.x, y: p.y,                                     // miejsce w sieci
          sx: p.x + Math.cos(kat) * d, sy: p.y + Math.sin(kat) * d, // skąd przypływa
          opoznienie: los() * OPOZNIENIE * (CZAS / UKLADANIE),
          r: 0.8 + los() * 1.4,
          cyjan: los() < 0.32,
          ox: 0, oy: 0, vx: 0, vy: 0,                          // przesunięcie od kursora
          blysk: -1e9, zaplon: -1e9,
        };
      });

      // Krawędzie: każdy węzeł z trzema najbliższymi sąsiadami w zasięgu, jak dendryty
      const klucze = new Set();
      krawedzie = [];
      sasiedzi = wezly.map(() => []);
      const maks = (odstep * 2.3) ** 2;
      wezly.forEach((a, i) => {
        wezly
          .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
          .filter((o) => o.j !== i && o.d < maks)
          .sort((p, q) => p.d - q.d)
          .slice(0, 3)
          .forEach(({ j, d }) => {
            const k = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (klucze.has(k)) return;
            klucze.add(k);
            krawedzie.push({ a: i, b: j, dl: Math.sqrt(d) });
            sasiedzi[i].push(j);
            sasiedzi[j].push(i);
          });
      });
      return true;
    }

    // Postęp układania węzła 0…1
    function postep(w, teraz) {
      if (ulozona) return 1;
      if (!start) return 0;
      return lagodnie(Math.min(1, Math.max(0, (teraz - start - w.opoznienie) / CZAS)));
    }

    function polozenie(w, k) {
      return {
        x: w.sx + (w.x - w.sx) * k + w.ox,
        y: w.sy + (w.y - w.sy) * k + w.oy,
      };
    }

    function wyslijImpuls(i, teraz, glebokosc = 0, skad = -1) {
      for (const j of sasiedzi[i]) {
        if (j === skad || impulsy.length >= MAKS_IMPULSOW) continue;
        const a = wezly[i], b = wezly[j];
        const dl = Math.hypot(a.x - b.x, a.y - b.y);
        impulsy.push({ a: i, b: j, t0: teraz, czas: Math.min(900, Math.max(260, dl / PREDKOSC_IMPULSU)), glebokosc });
      }
      wezly[i].blysk = teraz;
    }

    function krok(teraz) {
      ramka = 0;
      if (!wezly.length) return;
      if (!start && !ulozona) {
        if (!doStartu) return; // czeka, aż płótno wjedzie w kadr
        start = teraz;
      }
      if (!ulozona && wezly.every((w) => postep(w, teraz) >= 1)) ulozona = true;

      // Przyciąganie do kursora: sprężyna z tłumieniem
      let ruch = false;
      const pozycje = wezly.map((w, i) => {
        const k = postep(w, teraz);
        let cx = 0, cy = 0;
        if (kursor && k >= 1) {
          const dx = kursor.x - w.x, dy = kursor.y - w.y, d = Math.hypot(dx, dy);
          if (d < ZASIEG && d > 0.1) {
            const sila = (1 - d / ZASIEG) ** 2 * PRZYCIAGANIE;
            cx = (dx / d) * sila; cy = (dy / d) * sila;
          }
          if (d < ZAPLON && teraz - w.zaplon > PRZERWA_ZAPLONU) {
            w.zaplon = teraz;
            wyslijImpuls(i, teraz);
          }
        }
        w.vx = (w.vx + (cx - w.ox) * 0.12) * 0.78;
        w.vy = (w.vy + (cy - w.oy) * 0.12) * 0.78;
        w.ox += w.vx; w.oy += w.vy;
        if (Math.abs(w.vx) + Math.abs(w.vy) > 0.02 || Math.abs(w.ox - cx) + Math.abs(w.oy - cy) > 0.05) ruch = true;
        return { ...polozenie(w, k), k };
      });

      // Impulsy: dochodząc do węzła zapalają go i czasem biegną dalej (najwyżej dwa skoki)
      impulsy = impulsy.filter((p) => {
        if (teraz - p.t0 < p.czas) return true;
        const b = wezly[p.b];
        b.blysk = teraz;
        if (p.glebokosc < 2 && Math.random() < 0.5) wyslijImpuls(p.b, teraz, p.glebokosc + 1, p.a);
        return false;
      });

      rysuj(pozycje, teraz);

      // Nieruchomy kursor nie trzyma pętli: następny ruch myszy ją wznowi
      const blyski = wezly.some((w) => teraz - w.blysk < 700);
      if (widoczna && (!ulozona || ruch || impulsy.length || blyski)) zaplanuj();
    }

    function rysuj(poz, teraz) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (const e of krawedzie) {
        const p = poz[e.a], q = poz[e.b];
        const k = Math.min(p.k, q.k);
        if (k <= 0) continue;
        const a = (k * k) * (0.16 + 0.14 * Math.max(0, 1 - e.dl / 220));
        ctx.strokeStyle = rgba(KOLOR.fiolet, a.toFixed(3));
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      // Kursor łączy się z pobliskimi węzłami cyjanowymi liniami
      if (kursor) {
        for (const p of poz) {
          if (p.k < 1) continue;
          const d = Math.hypot(p.x - kursor.x, p.y - kursor.y);
          if (d >= ZASIEG) continue;
          ctx.strokeStyle = rgba(KOLOR.cyjan, (0.62 * (1 - d / ZASIEG)).toFixed(3));
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(kursor.x, kursor.y); ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
      // Impulsy z krótkim ogonem
      for (const i of impulsy) {
        const p = poz[i.a], q = poz[i.b];
        const t = Math.min(1, (teraz - i.t0) / i.czas), t2 = Math.max(0, t - 0.18);
        const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        const g = ctx.createLinearGradient(p.x + (q.x - p.x) * t2, p.y + (q.y - p.y) * t2, x, y);
        g.addColorStop(0, rgba(KOLOR.cyjan, 0));
        g.addColorStop(1, rgba(KOLOR.cyjan, 0.85));
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x + (q.x - p.x) * t2, p.y + (q.y - p.y) * t2); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = rgba(KOLOR.cyjan, 0.95);
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1;
      }
      // Węzły: cyjanowe z poświatą, reszta jasnofioletowa; błysk po dojściu impulsu
      for (let n = 0; n < wezly.length; n++) {
        const w = wezly[n], p = poz[n];
        if (p.k <= 0) continue;
        const blysk = Math.max(0, 1 - (teraz - w.blysk) / 700);
        const blisko = kursor ? Math.max(0, 1 - Math.hypot(p.x - kursor.x, p.y - kursor.y) / (ZASIEG * 0.6)) : 0;
        const swiatlo = Math.max(blysk, blisko);
        if (w.cyjan || swiatlo > 0) {
          ctx.fillStyle = rgba(KOLOR.cyjan, ((w.cyjan ? 0.12 : 0) + swiatlo * 0.3) * p.k);
          ctx.beginPath(); ctx.arc(p.x, p.y, w.r * (4 + swiatlo * 2), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = w.cyjan || swiatlo > 0.4 ? rgba(KOLOR.cyjan, 0.9 * p.k) : rgba(KOLOR.jasny, 0.8 * p.k);
        ctx.beginPath(); ctx.arc(p.x, p.y, w.r + swiatlo * 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    function zaplanuj() {
      if (!ramka) ramka = requestAnimationFrame(krok);
    }

    function wspolrzedne(e) {
      const r = plotno.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    obszar.addEventListener("pointermove", (e) => {
      if (bezRuchu() || e.pointerType === "touch") return;
      kursor = wspolrzedne(e);
      zaplanuj();
    }, { passive: true });
    obszar.addEventListener("pointerleave", () => {
      if (!kursor) return;
      kursor = null;
      zaplanuj();
    });
    // Dotyk: impuls z najbliższego węzła
    obszar.addEventListener("pointerdown", (e) => {
      if (bezRuchu() || e.pointerType !== "touch" || !ulozona) return;
      const c = wspolrzedne(e);
      let najblizszy = -1, min = 90 * 90;
      wezly.forEach((w, i) => { const d = (w.x - c.x) ** 2 + (w.y - c.y) ** 2; if (d < min) { min = d; najblizszy = i; } });
      if (najblizszy >= 0) { wyslijImpuls(najblizszy, performance.now()); zaplanuj(); }
    }, { passive: true });

    ograniczonyRuch.addEventListener("change", () => {
      if (bezRuchu()) { ulozona = true; impulsy = []; kursor = null; wezly.forEach((w) => { w.ox = w.oy = w.vx = w.vy = 0; }); }
      zaplanuj();
    });

    // Poza kadrem i w ukrytej karcie nic się nie liczy; układanie czeka na powrót
    if (zObserwatorem) {
      new IntersectionObserver((wpisy) => {
        const w = wpisy[wpisy.length - 1];
        widoczna = w.isIntersecting;
        if (w.intersectionRatio >= 0.3) doStartu = true;
        if (widoczna) zaplanuj();
      }, { threshold: [0, 0.3] }).observe(plotno);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(ramka); ramka = 0; } else zaplanuj();
    });

    // Zmiana rozmiaru: nowy układ od razu na miejscu, bez ponownego układania.
    // Rozmieszczanie idzie w osobnym zadaniu, w wolnej chwili, a nie razem z pierwszym
    // układem strony (inaczej oba składały się czasem na zadanie dłuższe niż 50 ms).
    const wWolnejChwili = window.requestIdleCallback
      ? (f) => requestIdleCallback(f, { timeout: 400 })
      : (f) => setTimeout(f, 60);
    let poprzedni = "", czeka = false, pierwszy = true;
    new ResizeObserver(() => {
      if (czeka) return;
      czeka = true;
      wWolnejChwili(() => {
        czeka = false;
        const r = plotno.getBoundingClientRect();
        const wymiar = `${Math.round(r.width)}×${Math.round(r.height)}`;
        if (wymiar === poprzedni || !rozmiesc()) return;
        poprzedni = wymiar;
        if (!pierwszy) ulozona = true;
        pierwszy = false;
        if (widoczna) zaplanuj();
      });
    }).observe(plotno);

  }
})();
