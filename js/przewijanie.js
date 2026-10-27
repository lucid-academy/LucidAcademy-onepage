/* =========================================================
   Lucid Academy — efekty przy przewijaniu (jak w ofercie dla szkół)
   Liczby z ankiet liczą się od zera razem ze swoimi wykresami, zdania-tytuły
   rozjaśniają się słowo po słowie, mapa odsłania się z zachodu na wschód.
   Resztę (znaczniki, dymki, znak > aktywnej sekcji) robi CSS.
   Bez bibliotek. Przy prefers-reduced-motion skrypt tylko dorysowuje wykresy
   i nie dodaje klasy .efekty-przewijania, więc cała treść stoi od razu.
   ========================================================= */
(() => {
  "use strict";

  const korzen = document.documentElement;
  const ograniczonyRuch = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Wykresy przy liczbach z ankiet (zawsze, także bez ruchu) ---------- */

  // Kropki i siatka: jedno pole na jednostkę (128 ankiet, 100 pól z 79 zapalonymi).
  // Stan końcowy od razu; liczenie niżej gasi je i zapala razem z cyframi.
  document.querySelectorAll(".liczba__wykres[data-ile]").forEach((wykres) => {
    const ile = Number(wykres.dataset.ile);
    const zapalone = Number(wykres.dataset.zapalone ?? ile);
    const pola = Array.from({ length: ile }, (_, i) => {
      const pole = document.createElement("i");
      if (i < zapalone) pole.className = "zapalone";
      return pole;
    });
    wykres.append(...pola);
  });

  if (ograniczonyRuch.matches || !("IntersectionObserver" in window)) return;

  const CZAS_LICZENIA = 1400;
  const ODSTEP_LICZB = 140;
  const lagodnie = (t) => 1 - Math.pow(1 - t, 3);
  const wysokoscOkna = () => window.innerHeight;

  function utworz(tag, klasa, tekst) {
    const el = document.createElement(tag);
    el.className = klasa;
    el.textContent = tekst;
    return el;
  }

  // Jednorazowo, gdy element spełni warunek widoczności
  function gdyWidac(el, progi, warunek, akcja) {
    const obserwator = new IntersectionObserver((wpisy) => {
      for (const wpis of wpisy) {
        if (!wpis.isIntersecting || !warunek(wpis)) continue;
        obserwator.disconnect();
        akcja();
      }
    }, { threshold: progi });
    obserwator.observe(el);
  }

  /* ---------- Liczby z ankiet: odliczanie od zera ---------- */

  // „128”, „5,16 ” przed „/ 6”, „79%”: liczba na początku tekstu, reszta zostaje
  function przygotujLiczbe(wartosc) {
    const tekst = wartosc.firstChild;
    const czesci = tekst?.nodeType === Node.TEXT_NODE && tekst.nodeValue.match(/^(\s*)(\d+)(?:,(\d+))?([\s\S]*)$/);
    if (!czesci) return null;
    const [, przed, calosc, ulamek = "", po] = czesci;
    const cel = Number(`${calosc}.${ulamek || 0}`);
    const zapis = (v) => v.toFixed(ulamek.length).replace(".", ",");
    // Czytnik ekranu dostaje od razu wynik; cyfry w ruchu są tylko dla oka
    const licznik = utworz("span", "liczba__licznik", zapis(cel));
    licznik.setAttribute("aria-hidden", "true");
    tekst.replaceWith(przed, licznik, utworz("span", "sr-only", zapis(cel)), po);
    return { licznik, cel, zapis, wykres: przygotujWykres(wartosc.closest(".liczba")?.querySelector(".liczba__wykres")) };
  }

  // Wykres obok liczby jako funkcja postępu 0…1: ile pól zapalonych albo jaki łuk pierścienia
  function przygotujWykres(wykres) {
    if (!wykres) return () => {};
    if (wykres.dataset.ile) {
      const pola = [...wykres.children];
      const cel = pola.filter((p) => p.classList.contains("zapalone")).length;
      let teraz = cel;
      return (k) => {
        const n = Math.round(cel * k);
        if (n === teraz) return;
        for (let i = Math.min(n, teraz); i < Math.max(n, teraz); i++) pola[i].classList.toggle("zapalone", i < n);
        teraz = n;
      };
    }
    // Pierścień: --udzial z atrybutu style w index.html to stan końcowy
    const udzial = parseFloat(wykres.style.getPropertyValue("--udzial")) || 0;
    return (k) => wykres.style.setProperty("--udzial", (udzial * k).toFixed(2));
  }

  // Zero na start. Na czas liczenia pole ma stałą szerokość wyniku: krótsza liczba zostawia
  // luz po prawej, a cyfra szersza o ułamek piksela (cyfry Archivo różnią się o 0,003 em)
  // wystaje bez przesuwania „/ 6” i opisu obok. Pomiar dopiero po wczytaniu fontów,
  // bo font zastępczy ma inne cyfry.
  function wyzeruj({ licznik, cel, zapis, wykres }) {
    licznik.textContent = zapis(cel);
    const em = licznik.getBoundingClientRect().width / parseFloat(getComputedStyle(licznik).fontSize);
    licznik.style.display = "inline-block";
    licznik.style.width = `${em.toFixed(4)}em`;
    licznik.textContent = zapis(0);
    wykres(0);
  }

  function policz(liczby) {
    const start = performance.now();
    function klatka(teraz) {
      let dalej = false;
      liczby.forEach(({ licznik, cel, zapis, wykres }, i) => {
        // Ograniczony ruch włączony w trakcie: od razu wynik
        const t = ograniczonyRuch.matches ? 1 : Math.min(1, Math.max(0, (teraz - start - i * ODSTEP_LICZB) / CZAS_LICZENIA));
        // Zapis tylko przy zmianie: pod koniec krzywej wiele klatek ma tę samą liczbę
        const tekst = zapis(cel * lagodnie(t));
        if (licznik.textContent !== tekst) licznik.textContent = tekst;
        wykres(lagodnie(t));
        if (t < 1) dalej = true;
      });
      if (dalej) requestAnimationFrame(klatka);
      else for (const { licznik } of liczby) licznik.removeAttribute("style");
    }
    requestAnimationFrame(klatka);
  }

  const liczniki = [];
  const fonty = document.fonts ? document.fonts.ready : Promise.resolve();
  document.querySelectorAll(".liczby__lista").forEach((pasek) => {
    // Pasek już na ekranie (odświeżenie w połowie strony): wyniki zostają, bez liczenia
    const naEkranie = () => pasek.getBoundingClientRect().top < wysokoscOkna() * 0.85;
    if (naEkranie()) return;
    const liczby = [...pasek.querySelectorAll(".liczba__wartosc")].map(przygotujLiczbe).filter(Boolean);
    fonty.then(() => {
      if (!liczby.length || naEkranie() || ograniczonyRuch.matches) return;
      liczby.forEach(wyzeruj);
      liczniki.push(...liczby);
      gdyWidac(pasek, [0.5], () => true, () => policz(liczby));
    });
  });

  /* ---------- Zdania-tytuły: rozjaśnianie słowo po słowie ---------- */

  // Każde słowo w <span class="slowo">. Dzielą tylko zwykłe spacje: „w&nbsp;pracy”
  // zostaje jednym słowem, a odstępy zostają tekstem, więc wiersze łamią się jak wcześniej.
  function rozbijNaSlowa(el) {
    const spacer = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const teksty = [];
    while (spacer.nextNode()) teksty.push(spacer.currentNode);
    for (const tekst of teksty) {
      const kawalki = tekst.nodeValue.split(/([ \t\n\r]+)/).filter(Boolean);
      tekst.replaceWith(...kawalki.map((k) => (/^[ \t\n\r]+$/.test(k) ? k : utworz("span", "slowo", k))));
    }
    return [...el.querySelectorAll(".slowo")];
  }

  const zdania = [...document.querySelectorAll("[data-rozjasniane]")].map((el) => ({ el, slowa: rozbijNaSlowa(el), jasne: -1 }));

  // Ten sam rachunek co w ofercie: zdanie jaśnieje od wejścia w dolne 10% ekranu
  // do chwili, gdy jego dół minie mniej więcej dwie trzecie wysokości okna
  function rozjasnij() {
    const wysokosc = wysokoscOkna();
    for (const zdanie of zdania) {
      const ramka = zdanie.el.getBoundingClientRect();
      const postep = Math.min(1, Math.max(0, (wysokosc * 0.9 - ramka.top) / (ramka.height + wysokosc * 0.25)));
      const jasne = Math.round(postep * zdanie.slowa.length);
      if (jasne === zdanie.jasne) continue;
      zdanie.jasne = jasne;
      zdanie.slowa.forEach((slowo, i) => slowo.classList.toggle("slowo--jasne", i < jasne));
    }
  }

  let zaplanowane = false;
  function zaplanuj() {
    if (zaplanowane) return;
    zaplanowane = true;
    requestAnimationFrame(() => {
      zaplanowane = false;
      rozjasnij();
    });
  }

  if (zdania.length) {
    rozjasnij();
    window.addEventListener("scroll", zaplanuj, { passive: true });
    window.addEventListener("resize", zaplanuj, { passive: true });
  }

  /* ---------- Mapa: odsłanianie z zachodu na wschód ---------- */

  // Start, gdy widać połowę mapy albo mapa zajmuje pół okna (niski ekran poziomo)
  document.querySelectorAll(".mapa").forEach((mapa) => {
    const odslon = () => mapa.classList.add("mapa--odslonieta");
    if (mapa.getBoundingClientRect().top < wysokoscOkna() * 0.6) {
      odslon();
      return;
    }
    gdyWidac(mapa, [0, 0.25, 0.5], (wpis) =>
      wpis.intersectionRatio >= 0.5 || wpis.intersectionRect.height >= (wpis.rootBounds?.height ?? wysokoscOkna()) * 0.5, odslon);
  });

  korzen.classList.add("efekty-przewijania");

  // Ograniczony ruch włączony w trakcie: wszystko od razu w stanie końcowym
  ograniczonyRuch.addEventListener("change", () => {
    if (!ograniczonyRuch.matches) return;
    korzen.classList.remove("efekty-przewijania");
    for (const { licznik, cel, zapis, wykres } of liczniki) {
      licznik.textContent = zapis(cel);
      licznik.removeAttribute("style");
      wykres(1);
    }
  });
})();
