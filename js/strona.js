/* =========================================================
   Lucid Academy — nowa strona: zachowania
   Bez bibliotek i bez zewnętrznych skryptów.
   Przy prefers-reduced-motion: bez scramble, bez parallaxu,
   bez animacji wejścia i bez migania kursora.
   ========================================================= */
(() => {
  "use strict";

  const korzen = document.documentElement;
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

  /* ---------- Sekcja w widoku: aktywny link i migający kursor ---------- */

  const linkiMenu = new Map();
  menu?.querySelectorAll('a[href^="#"]').forEach((a) => {
    linkiMenu.set(a.getAttribute("href").slice(1), a);
  });

  if (maObserwatora) {
    // Pas na środku ekranu: sekcja, która go przecina, jest „w widoku”.
    const obserwatorSekcji = new IntersectionObserver((wpisy) => {
      for (const wpis of wpisy) {
        wpis.target.querySelector(".etykieta")?.classList.toggle("aktywna", wpis.isIntersecting);
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
    const czas = 1150;
    const krok = 48;
    const start = performance.now();
    let ostatniaKlatka = 0;

    // Stała szerokość, żeby losowe litery nie przestawiały wierszy nagłówka
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;

    function klatka(teraz) {
      const postep = Math.min(1, (teraz - start) / czas);
      if (teraz - ostatniaKlatka >= krok) {
        ostatniaKlatka = teraz;
        let tekst = "";
        for (let i = 0; i < docelowe.length; i++) {
          const prog = 0.18 + 0.82 * (i / docelowe.length);
          tekst += postep >= prog ? docelowe[i] : znaki[Math.floor(Math.random() * znaki.length)];
        }
        el.textContent = tekst;
      }
      if (postep < 1) {
        requestAnimationFrame(klatka);
      } else {
        el.textContent = docelowe;
        el.style.minWidth = "";
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

  /* ---------- 05 · Co budujemy: kafle z kafle.json i filtr ---------- */

  const STATUSY = {
    "otwarte": { klasa: "kafel--otwarte", etykieta: "Otwarte demo" },
    "na-zyczenie": { klasa: "kafel--fragment", etykieta: "Demo na życzenie" },
  };
  const WYGASZENIA = ["prawo", "lewo", "dol", "prawo-dol", "boki"];

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
    if (kafel.wygaszenie && !WYGASZENIA.includes(kafel.wygaszenie)) bledy.push(`nieznane wygaszenie „${kafel.wygaszenie}”`);
    if (bledy.length) console.error(`[kafle.json] kafel nr ${nr + 1} (${kafel.nazwa || "bez nazwy"}) pominięty: ${bledy.join("; ")}`);
    return bledy.length === 0;
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

    // Podgląd: ostry zrzut albo zajawka (wycinek przechodzący w tło)
    const podglad = utworz("div", "kafel__podglad");
    if (naZyczenie) podglad.dataset.wygaszenie = kafel.wygaszenie || "prawo";
    if (kafel.fokus) podglad.style.setProperty("--fokus", kafel.fokus);

    const obraz = utworz("img");
    obraz.src = kafel.obraz;
    obraz.alt = kafel.alt;
    obraz.loading = "lazy";
    obraz.decoding = "async";
    obraz.addEventListener("error", () => podglad.classList.add("kafel__podglad--brak"), { once: true });
    podglad.append(obraz);

    if (naZyczenie) {
      const znacznik = utworz("span", "kafel__fragment");
      znacznik.setAttribute("aria-hidden", "true");
      znacznik.append(znakZachety(), "fragment", utworz("span", "kursor"));
      podglad.append(znacznik);
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
      return;
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
  }

  wczytajKafle();

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
