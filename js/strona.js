/* =========================================================
   Lucid Academy — nowa strona: zachowania
   Bez bibliotek i bez zewnętrznych skryptów.
   Przy prefers-reduced-motion: bez scramble, bez parallaxu
   i bez animacji wejścia.
   ========================================================= */
(() => {
  "use strict";

  const korzen = document.documentElement;
  // Moduł trybu sieci leży obok tego pliku (js/siec.js); adres liczony od skryptu, nie od strony
  const adresModuluSieci = new URL("siec.js", document.currentScript?.src || new URL("js/", document.baseURI)).href;
  const ograniczonyRuch = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bezRuchu = () => ograniczonyRuch.matches;
  const maObserwatora = "IntersectionObserver" in window;

  function utworz(tag, klasa, tekst) {
    const el = document.createElement(tag);
    if (klasa) el.className = klasa;
    if (tekst != null) el.textContent = tekst;
    return el;
  }

  function znakZachety() {
    const znak = utworz("span", "etykieta__znak", ">");
    znak.setAttribute("aria-hidden", "true");
    return znak;
  }

  /* ---------- Wejścia przy scrollu (opacity + 12 px) ---------- */

  const obserwatorWejsc = maObserwatora
    ? new IntersectionObserver((wpisy) => {
        for (const wpis of wpisy) {
          if (!wpis.isIntersecting) continue;
          wpis.target.classList.add("widoczny");
          obserwatorWejsc.unobserve(wpis.target);
        }
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 })
    : null;

  function obserwujWejscie(el) {
    if (!obserwatorWejsc || bezRuchu()) {
      el.classList.add("widoczny");
      return;
    }
    obserwatorWejsc.observe(el);
  }

  document.querySelectorAll("[data-wejscie]").forEach(obserwujWejscie);

  /* ---------- Nawigacja: menu na telefonie ---------- */

  const naglowek = document.getElementById("naglowek");
  const przyciskMenu = document.querySelector(".menu-przycisk");
  const menu = document.getElementById("menu");

  function ustawMenu(otwarte) {
    przyciskMenu.setAttribute("aria-expanded", String(otwarte));
    przyciskMenu.querySelector(".sr-only").textContent = otwarte ? "Zamknij menu" : "Menu";
    korzen.classList.toggle("menu-otwarte", otwarte);
  }

  if (przyciskMenu && menu) {
    przyciskMenu.addEventListener("click", () => {
      ustawMenu(przyciskMenu.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", (zdarzenie) => {
      if (zdarzenie.target.closest("a")) ustawMenu(false);
    });
    document.addEventListener("keydown", (zdarzenie) => {
      if (zdarzenie.key === "Escape" && korzen.classList.contains("menu-otwarte")) {
        ustawMenu(false);
        przyciskMenu.focus();
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", (zapytanie) => {
      if (zapytanie.matches) ustawMenu(false);
    });
  }

  /* ---------- Nawigacja: tło po przewinięciu ---------- */

  let naglowekZTlem = false;
  function sprawdzNaglowek() {
    const potrzebne = window.scrollY > 8;
    if (potrzebne === naglowekZTlem) return;
    naglowekZTlem = potrzebne;
    naglowek.classList.toggle("naglowek--tlo", potrzebne);
  }
  if (naglowek) {
    sprawdzNaglowek();
    window.addEventListener("scroll", sprawdzNaglowek, { passive: true });
  }

  /* ---------- Sekcja w widoku: aktywny link w menu ---------- */

  const linkiMenu = new Map();
  menu?.querySelectorAll('a[href^="#"]').forEach((a) => {
    linkiMenu.set(a.getAttribute("href").slice(1), a);
  });

  if (maObserwatora) {
    // Pas na środku ekranu: sekcja, która go przecina, jest „w widoku”.
    const obserwatorSekcji = new IntersectionObserver((wpisy) => {
      for (const wpis of wpisy) {
        if (!wpis.isIntersecting) continue;
        linkiMenu.forEach((link) => {
          link.classList.remove("aktywny");
          link.removeAttribute("aria-current");
        });
        const link = linkiMenu.get(wpis.target.id);
        if (link) {
          link.classList.add("aktywny");
          link.setAttribute("aria-current", "true");
        }
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach((s) => obserwatorSekcji.observe(s));
  }

  /* ---------- Scramble słowa-klucza w hero (raz, przy wejściu) ---------- */

  function scramble(el) {
    const docelowe = el.textContent;
    const znaki = "aąbcćdeęfghijklłmnńoóprsśtuwyzźż#%&+=<>/*";
    const ZNAKI = znaki.toUpperCase();
    const czas = 1150;
    const krok = 48;
    const start = performance.now();
    let ostatniaKlatka = 0;

    // Stała szerokość (nie minimalna): szersze losowe litery nie mogą przesuwać
    // reszty wiersza, inaczej każda klatka liczy się jako przesunięcie układu (CLS)
    el.style.width = `${el.getBoundingClientRect().width}px`;

    function klatka(teraz) {
      const postep = Math.min(1, (teraz - start) / czas);
      if (teraz - ostatniaKlatka >= krok) {
        ostatniaKlatka = teraz;
        let tekst = "";
        for (let i = 0; i < docelowe.length; i++) {
          const prog = 0.18 + 0.82 * (i / docelowe.length);
          // Wielka litera losuje spośród wielkich, żeby słowo nie „skakało” wysokością
          const pula = docelowe[i] !== docelowe[i].toLowerCase() ? ZNAKI : znaki;
          tekst += postep >= prog ? docelowe[i] : pula[Math.floor(Math.random() * pula.length)];
        }
        el.textContent = tekst;
      }
      if (postep < 1) {
        requestAnimationFrame(klatka);
      } else {
        el.textContent = docelowe;
        el.style.width = "";
      }
    }
    requestAnimationFrame(klatka);
  }

  const slowoKlucz = document.querySelector(".slowo-klucz__tekst");
  if (slowoKlucz && !bezRuchu()) {
    const gotowe = document.fonts ? document.fonts.ready : Promise.resolve();
    gotowe.then(() => {
      // Tylko gdy hero jest na ekranie (np. nie po wejściu z kotwicą niżej)
      if (window.scrollY < window.innerHeight * 0.6) setTimeout(() => scramble(slowoKlucz), 320);
    });
  }

  /* ---------- Parallax ilustracji ---------- */

  const paralaksy = [...document.querySelectorAll("[data-parallax]")];
  let paralaksaZaplanowana = false;

  function przesunIlustracje() {
    paralaksaZaplanowana = false;
    if (bezRuchu()) return;
    const wysokoscOkna = window.innerHeight;
    for (const el of paralaksy) {
      const ramka = el.parentElement.getBoundingClientRect();
      if (ramka.bottom < -120 || ramka.top > wysokoscOkna + 120) continue;
      const odSrodka = ramka.top + ramka.height / 2 - wysokoscOkna / 2;
      const sila = parseFloat(el.dataset.parallax) || 0.1;
      el.style.transform = `translate3d(0, ${(-odSrodka * sila).toFixed(1)}px, 0) scale(1.08)`;
    }
  }

  if (paralaksy.length) {
    const zaplanuj = () => {
      if (paralaksaZaplanowana) return;
      paralaksaZaplanowana = true;
      requestAnimationFrame(przesunIlustracje);
    };
    window.addEventListener("scroll", zaplanuj, { passive: true });
    window.addEventListener("resize", zaplanuj, { passive: true });
    ograniczonyRuch.addEventListener("change", () => {
      if (bezRuchu()) paralaksy.forEach((el) => { el.style.transform = ""; });
      else zaplanuj();
    });
    zaplanuj();
  }

  /* ---------- 05 · Co budujemy: galeria zrzutów (jedno okno dla wszystkich kafli) ---------- */

  // 1 zrzut, 2–4 zrzuty, 5–21 zrzutów, 22–24 zrzuty…
  function odmiana(n, [jeden, kilka, wiele]) {
    if (n === 1) return jeden;
    const j = n % 10, d = n % 100;
    return j >= 2 && j <= 4 && (d < 12 || d > 14) ? kilka : wiele;
  }

  const galeria = (() => {
    let okno = null, el = null, zrzuty = [], biezacy = 0, wywolujacy = null;

    function przycisk(klasa, etykieta) {
      const p = utworz("button", `galeria__przycisk ${klasa}`);
      p.type = "button";
      p.append(utworz("span", "sr-only", etykieta));
      return p;
    }

    function zbuduj() {
      okno = utworz("dialog", "galeria");
      okno.setAttribute("aria-labelledby", "galeria-tytul");
      const ramka = utworz("div", "galeria__ramka");

      const naglowek = utworz("div", "galeria__naglowek");
      const licznik = utworz("p", "galeria__licznik");
      const tytul = utworz("h2", "galeria__tytul");
      tytul.id = "galeria-tytul";
      const zamknij = przycisk("galeria__zamknij", "Zamknij galerię");
      naglowek.append(licznik, tytul, zamknij);

      const kadr = utworz("figure", "galeria__kadr");
      const obraz = utworz("img", "galeria__obraz");
      obraz.decoding = "async";
      const podpis = utworz("figcaption", "galeria__podpis");
      kadr.append(obraz, podpis);

      const poprzedni = przycisk("galeria__poprzedni", "Poprzedni zrzut");
      const nastepny = przycisk("galeria__nastepny", "Następny zrzut");
      const komunikat = utworz("p", "sr-only");
      komunikat.setAttribute("aria-live", "polite");

      ramka.append(naglowek, kadr, poprzedni, nastepny, komunikat);
      okno.append(ramka);
      document.body.append(okno);
      el = { licznik, tytul, kadr, obraz, podpis, poprzedni, nastepny, komunikat };

      zamknij.addEventListener("click", () => okno.close());
      poprzedni.addEventListener("click", () => pokaz(biezacy - 1));
      nastepny.addEventListener("click", () => pokaz(biezacy + 1));
      // Klik w przyciemnione tło (poza ramką) zamyka okno
      okno.addEventListener("click", (zdarzenie) => { if (zdarzenie.target === okno) okno.close(); });
      okno.addEventListener("keydown", (zdarzenie) => {
        const kierunek = { ArrowRight: 1, ArrowLeft: -1 }[zdarzenie.key];
        if (kierunek) { zdarzenie.preventDefault(); pokaz(biezacy + kierunek); }
        else if (zdarzenie.key === "Home") { zdarzenie.preventDefault(); pokaz(0); }
        else if (zdarzenie.key === "End") { zdarzenie.preventDefault(); pokaz(zrzuty.length - 1); }
      });
      // Przesunięcie palcem w bok: następny albo poprzedni zrzut
      let start = null;
      kadr.addEventListener("pointerdown", (z) => { start = { x: z.clientX, y: z.clientY }; });
      kadr.addEventListener("pointerup", (z) => {
        if (!start) return;
        const dx = z.clientX - start.x, dy = z.clientY - start.y;
        start = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) pokaz(biezacy + (dx < 0 ? 1 : -1));
      });
      kadr.addEventListener("pointercancel", () => { start = null; });
      // Esc obsługuje sam <dialog>; po zamknięciu fokus wraca do miniatury
      okno.addEventListener("close", () => {
        korzen.classList.remove("galeria-otwarta");
        wywolujacy?.focus();
      });
    }

    function pokaz(nr) {
      const ile = zrzuty.length;
      biezacy = (nr + ile) % ile;
      const zrzut = zrzuty[biezacy];
      el.obraz.src = zrzut.obraz;
      el.obraz.alt = zrzut.alt;
      el.podpis.textContent = zrzut.podpis || "";
      el.podpis.hidden = !zrzut.podpis;
      el.licznik.replaceChildren(znakZachety(), ` ${biezacy + 1} / ${ile}`);
      el.komunikat.textContent = `Zrzut ${biezacy + 1} z ${ile}`;
      el.poprzedni.hidden = el.nastepny.hidden = ile < 2;
      // Sąsiednie zrzuty wczytują się zawczasu, żeby przewijanie nie czekało na sieć
      if (ile > 1) for (const d of [1, -1]) new Image().src = zrzuty[(biezacy + d + ile) % ile].obraz;
    }

    function otworz(kafel, przyciskMiniatury) {
      if (!okno) zbuduj();
      zrzuty = kafel.galeria;
      wywolujacy = przyciskMiniatury;
      el.tytul.textContent = kafel.nazwa;
      pokaz(0);
      korzen.classList.add("galeria-otwarta");
      okno.showModal();
      (zrzuty.length > 1 ? el.nastepny : okno.querySelector(".galeria__zamknij")).focus();
    }

    return { otworz };
  })();

  /* ---------- 05 · Co budujemy: kafle z kafle.json i filtr ---------- */

  const STATUSY = {
    "otwarte": { klasa: "kafel--otwarte", etykieta: "Otwarte demo" },
    "na-zyczenie": { klasa: "kafel--na-zyczenie", etykieta: "Demo na życzenie" },
  };

  function sprawdzKafel(kafel, nr, kategorie) {
    const bledy = [];
    for (const pole of ["nazwa", "typ", "status", "zdanie", "obraz", "alt"]) {
      if (!kafel[pole]) bledy.push(`brak pola „${pole}”`);
    }
    if (kafel.typ && !kategorie.includes(kafel.typ)) bledy.push(`typ „${kafel.typ}” spoza listy „kategorie”`);
    if (kafel.status && !STATUSY[kafel.status]) bledy.push(`nieznany status „${kafel.status}”`);
    if (kafel.status === "otwarte" && !(Array.isArray(kafel.przyciski) && kafel.przyciski.every((p) => p.adres))) {
      bledy.push("otwarte demo potrzebuje przycisków z adresami");
    }
    if (bledy.length) {
      console.error(`[kafle.json] kafel nr ${nr + 1} (${kafel.nazwa || "bez nazwy"}) pominięty: ${bledy.join("; ")}`);
      return false;
    }
    // Wadliwa galeria nie usuwa kafla — kafel zostaje, tylko bez galerii
    if (kafel.galeria && !(Array.isArray(kafel.galeria) && kafel.galeria.length && kafel.galeria.every((z) => z && z.obraz && z.alt))) {
      console.error(`[kafle.json] kafel „${kafel.nazwa}”: galeria musi być listą zrzutów z polami „obraz” i „alt” — pokazuję kafel bez galerii`);
      delete kafel.galeria;
    }
    return true;
  }

  function zbudujKafel(kafel, nr) {
    const status = STATUSY[kafel.status];
    const naZyczenie = kafel.status === "na-zyczenie";

    const li = utworz("li", `kafel ${status.klasa}${kafel.kadr === "pionowy" ? " kafel--pionowy" : ""}`);
    li.dataset.typ = kafel.typ;
    li.setAttribute("data-wejscie", "");
    li.style.setProperty("--opoznienie", `${(nr % 2) * 90}ms`);

    const karta = utworz("article", "kafel__karta");
    const idNazwy = `kafel-${nr + 1}`;
    karta.setAttribute("aria-labelledby", idNazwy);

    // Podgląd: miniatura; jeśli kafel ma galerię, klik otwiera kolejne zrzuty
    const podglad = utworz("div", "kafel__podglad");
    if (kafel.fokus) podglad.style.setProperty("--fokus", kafel.fokus);

    const obraz = utworz("img");
    obraz.src = kafel.obraz;
    obraz.alt = kafel.alt;
    obraz.loading = "lazy";
    obraz.decoding = "async";
    obraz.addEventListener("error", () => podglad.classList.add("kafel__podglad--brak"), { once: true });

    if (kafel.galeria) {
      const ile = kafel.galeria.length;
      const opisZrzutow = `${ile} ${odmiana(ile, ["zrzut", "zrzuty", "zrzutów"])}`;
      const przycisk = utworz("button", "kafel__galeria");
      przycisk.type = "button";
      przycisk.setAttribute("aria-haspopup", "dialog");
      przycisk.setAttribute("aria-label", `Zobacz zrzuty ekranu: ${kafel.nazwa} (${opisZrzutow})`);
      const znacznik = utworz("span", "kafel__zrzuty");
      znacznik.setAttribute("aria-hidden", "true");
      znacznik.append(znakZachety(), ` ${opisZrzutow}`);
      przycisk.append(obraz, znacznik);
      przycisk.addEventListener("click", () => galeria.otworz(kafel, przycisk));
      podglad.append(przycisk);
    } else {
      podglad.append(obraz);
    }

    // Opis
    const opis = utworz("div", "kafel__opis");
    const nazwa = utworz("h3", "kafel__nazwa", kafel.nazwa);
    nazwa.id = idNazwy;
    opis.append(utworz("p", "kafel__typ", kafel.typ), nazwa, utworz("p", "kafel__zdanie", kafel.zdanie));
    if (kafel.dopisek) opis.append(utworz("p", "kafel__dopisek", kafel.dopisek));
    if (kafel.atrybucja) opis.append(utworz("p", "kafel__atrybucja", kafel.atrybucja));

    // Stopka: status i przyciski
    const stopka = utworz("div", "kafel__stopka");
    stopka.append(utworz("p", `kafel__status kafel__status--${kafel.status}`, status.etykieta));

    const akcje = utworz("div", "kafel__akcje");
    if (naZyczenie) {
      // Bez adresu strony — tylko rozmowa
      const link = utworz("a", "przycisk przycisk--obrys", "Napisz do nas");
      link.href = "#kontakt";
      link.append(utworz("span", "sr-only", ` w sprawie: ${kafel.nazwa}`));
      akcje.append(link);
    } else {
      for (const przycisk of kafel.przyciski) {
        const link = utworz("a", "przycisk przycisk--obrys przycisk--zewn", przycisk.etykieta || "Otwórz");
        link.href = przycisk.adres;
        link.target = "_blank";
        link.rel = "noopener";
        link.append(utworz("span", "sr-only", ` — ${kafel.nazwa} (otwiera się w nowej karcie)`));
        akcje.append(link);
      }
    }
    stopka.append(akcje);
    opis.append(stopka);

    karta.append(podglad, opis);
    li.append(karta);
    return li;
  }

  async function wczytajKafle() {
    const sekcja = document.getElementById("co-robimy");
    if (!sekcja) return;
    const lista = sekcja.querySelector(".kafle");
    const filtr = sekcja.querySelector(".filtr");
    const licznik = sekcja.querySelector(".filtr__licznik");

    let dane;
    try {
      const odpowiedz = await fetch("kafle.json", { cache: "no-cache" });
      if (!odpowiedz.ok) throw new Error(`HTTP ${odpowiedz.status}`);
      dane = await odpowiedz.json();
    } catch (blad) {
      console.error("[kafle.json] Nie udało się wczytać listy projektów:", blad);
      const komunikat = utworz("p", "kafle__komunikat", "Nie udało się wczytać listy projektów. ");
      const link = utworz("a", null, "Napisz do nas");
      link.href = "#kontakt";
      komunikat.append(link, " — chętnie je pokażemy.");
      lista.replaceWith(komunikat);
      return null;
    }

    const kategorie = Array.isArray(dane.kategorie) ? dane.kategorie : [];
    const wpisy = (Array.isArray(dane.kafle) ? dane.kafle : []).filter((k, nr) => sprawdzKafel(k, nr, kategorie));
    const elementy = wpisy.map(zbudujKafel);
    lista.append(...elementy);
    elementy.forEach(obserwujWejscie);

    const przyciski = [["Wszystko", ""], ...kategorie.map((k) => [k, k])].map(([etykieta, wartosc]) => {
      const przycisk = utworz("button", "filtr__przycisk", etykieta);
      przycisk.type = "button";
      przycisk.dataset.kategoria = wartosc;
      przycisk.addEventListener("click", () => pokaz(wartosc));
      return przycisk;
    });
    filtr.append(...przyciski);
    filtr.hidden = false;
    obserwujWejscie(filtr);

    function pokaz(kategoria) {
      let ile = 0;
      for (const li of elementy) {
        const pasuje = !kategoria || li.dataset.typ === kategoria;
        li.hidden = !pasuje;
        if (pasuje) ile += 1;
      }
      for (const przycisk of przyciski) {
        przycisk.setAttribute("aria-pressed", String(przycisk.dataset.kategoria === kategoria));
      }
      licznik.replaceChildren(znakZachety(), ` pokazano ${ile} z ${elementy.length}`);
    }

    pokaz("");
    // Komunikat dla czytników ekranu dopiero przy zmianie filtra, nie przy wczytaniu
    licznik.setAttribute("aria-live", "polite");
    return { kategorie, kafle: wpisy };
  }

  // Tryb sieci korzysta z tej samej, już sprawdzonej listy projektów
  const daneKafli = wczytajKafle();

  /* ---------- Tryb sieci (pilot wersji 3): moduł wczytywany dopiero na żądanie ---------- */

  // Na razie schowany: przycisk zostaje ukryty, a tryb otwiera tylko bezpośredni link ?tryb=siec.
  // Przestawienie na true odsłania przycisk w nawigacji.
  const POKAZ_TRYB_SIECI = false;

  const przyciskSieci = document.querySelector(".tryb-sieci");
  let modulSieci = null;

  async function otworzSiec() {
    if (przyciskSieci.getAttribute("aria-busy") === "true") return;
    przyciskSieci.setAttribute("aria-busy", "true");
    try {
      modulSieci ||= await import(adresModuluSieci);
      const dane = await daneKafli;
      await modulSieci.otworz({ kafle: dane?.kafle || [], wywolujacy: przyciskSieci, galeria: galeria.otworz });
    } catch (blad) {
      console.error("[tryb sieci] Nie udało się otworzyć trybu sieci:", blad);
    } finally {
      przyciskSieci.removeAttribute("aria-busy");
    }
  }

  if (przyciskSieci && typeof HTMLDialogElement === "function") {
    if (POKAZ_TRYB_SIECI) przyciskSieci.hidden = false;
    przyciskSieci.addEventListener("click", otworzSiec);
    // Bezpośredni link do trybu: ?tryb=siec (działa także wtedy, gdy przycisk jest schowany)
    if (new URLSearchParams(location.search).get("tryb") === "siec") otworzSiec();
  }

  /* ---------- Licznik odwiedzin (GoatCounter) ---------- */
  // Jak na obecnej stronie: liczy tylko na lucidacademy.pl. Bez zewnętrznego skryptu —
  // jedno żądanie obrazkowe do tego samego licznika. Automaty (np. robiące zrzuty) się nie liczą.

  (function licznikOdwiedzin() {
    const DOMENY = ["lucidacademy.pl", "www.lucidacademy.pl"];
    if (location.protocol !== "https:" || !DOMENY.includes(location.hostname) || navigator.webdriver) return;
    const parametry = new URLSearchParams({
      p: location.pathname + location.search,
      t: document.title,
      r: document.referrer,
      s: [screen.width, screen.height, window.devicePixelRatio || 1].join(","),
      rnd: Math.random().toString(36).slice(2),
    });
    new Image().src = `https://lucidacademy.goatcounter.com/count?${parametry}`;
  })();
})();
