#!/usr/bin/env node
/* =========================================================
   Zrzuty do „Co budujemy”:
     miniatury kafli  → assets/kafle/<id>.webp    (ok. 800 px)
     kadry galerii    → assets/galeria/<id>.webp  (ok. 1600 px)
   ---------------------------------------------------------
   Uruchomienie (z katalogu repozytorium):
     node narzedzia/zrzuty.mjs                 # wszystko
     node narzedzia/zrzuty.mjs --kafle         # tylko miniatury
     node narzedzia/zrzuty.mjs --galerie       # tylko kadry galerii
     node narzedzia/zrzuty.mjs mapa-zieleni    # wybrane, po id kafla albo kadru
     node narzedzia/zrzuty.mjs --podglad       # dodatkowo surowe PNG w narzedzia/podglad/

   Potrzebny jest Playwright z Chromium (lokalnie: npm i -D playwright,
   albo globalna instalacja — skrypt znajdzie ją sam). Klatki z filmów
   (np. intro Święta Bydgoskiego) wycina ffmpeg — bez niego te pozycje
   są pomijane z komunikatem.

   Opisy (alt i podpis) każdego kadru wpisuje się ręcznie w kafle.json,
   po obejrzeniu pliku: alt mówi, co naprawdę widać na obrazie.

   ADRESY DEM „NA ŻYCZENIE” NIE SĄ W REPOZYTORIUM. Skrypt czyta je
   z pliku narzedzia/zrodla-prywatne.json (wpisany do .gitignore):
     { "wyprawy-torun": "https://…", "mapa-zieleni": "https://…", … }
   Ten sam plik może też nadpisać adres otwartego dema.

   Zasada bezpieczeństwa: o tym, co staje się publiczne, decyduje kadr.
   Przed zrzutem skrypt wstrzykuje CSS ukrywający wszystko z listy „Bez”,
   a potem sprawdza, czy w kadrze nie został żaden widoczny zakazany
   tekst ani element. Jeśli kontrola nie przejdzie, pliku nie zapisuje.
   Gradient i linie skanu na stronie to tylko estetyka.
   ========================================================= */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- Przepisy kadrów ---------- */

// Elementy, które nigdy nie powinny trafić do kadru: liczniki, nakładki, wyskakujące okna
const ZAWSZE_UKRYJ = [];

// Strony Świąt: intro pomijamy tak, jak strona robi to sama po pierwszej wizycie
const CHELMINSKIE = "https://lucidacademy.pl/projekty/swietochp/";
const BYDGOSKIE = "https://lucidacademy.pl/projekty/swietobp/";
const BEZ_INTRA_CH = { "intro:chelminskie": "tak" };
const BEZ_INTRA_BP = { "intro:bydgoskie": "tak" };

// Intro Chełmińskiego: magnesy z kolejnych edycji. Start bez dźwięku; kadr robimy, gdy na
// ekranie stoi ostatni magnes z podpisem (data i miejsce), a nie po zgadywanym czasie.
const introMagnesow = (podpis) => async (strona) => {
  await strona.click("#mg-start-cicho");
  await strona.waitForFunction((wzor) => [...document.querySelectorAll("body *")].some((e) =>
    !e.childElementCount && new RegExp(wzor).test(e.textContent) && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })), podpis, { timeout: 60000 });
  await strona.waitForTimeout(1500);
  await strona.evaluate(() => {
    for (const b of document.querySelectorAll("button")) if (/pomiń intro/i.test(b.textContent)) b.style.visibility = "hidden";
  });
};

// Panel z dolnego paska strony Święta (Program, Pamięć, Przyjaciele…)
const panel = (id) => async (strona) => {
  await strona.click(`#${id}`);
  await strona.waitForTimeout(1200);
};

// Strona BO ma też ciemny wariant (prefers-color-scheme) i to on trafia na zrzuty
const BO = "https://lucid-academy.github.io/ai-lab/bo-torun-2027.html";
const PURDA = "https://lucid-academy.github.io/olsztyn/";
const ZAGLE = "https://lucid-academy.github.io/ai-lab/zagle-2026-karta-morska.html";

// Długie strony: nagłówek sekcji tuż pod górną krawędzią okna (odstęp na przyklejony pasek)
const doNaglowka = (tekst, odstep = 24) => async (strona) => {
  await strona.evaluate(([t, o]) => {
    const h = [...document.querySelectorAll("h1, h2, h3")].find((e) => e.textContent.includes(t));
    if (!h) throw new Error(`brak nagłówka „${t}”`);
    window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - o, behavior: "instant" });
  }, [tekst, odstep]);
  await strona.waitForTimeout(900);
};

// Intro wideo Purdy: przycisk „Pomiń” kończy je tak samo jak koniec filmu
async function pominIntroPurdy(strona) {
  await strona.evaluate(() => document.getElementById("intro-skip")?.click());
  await strona.waitForTimeout(1800);
}

// Kilka kroków przygotowania po kolei
const kroki = (...lista) => async (strona) => { for (const krok of lista) await krok(strona); };
const klik = (selektor, ms = 1200) => async (strona) => { await strona.click(selektor); await strona.waitForTimeout(ms); };

// Ukrywa elementy-liście, których tekst pasuje do wzoru (np. podpis ze źródłem danych).
// Kontrola kadru i tak sprawdza potem, czy nic z listy „zakazane” nie zostało widoczne.
const ukryjTekst = (wzor) => async (strona) => {
  await strona.evaluate((zrodlo) => {
    const re = new RegExp(zrodlo, "i");
    for (const e of document.querySelectorAll("body *")) {
      if (!e.childElementCount && re.test(e.textContent)) e.style.setProperty("visibility", "hidden", "important");
    }
  }, wzor.source);
};

// Wyprawy: od intro do portalu, potem zakładka Profil
const portalWypraw = kroki(klik("#btn-skip", 500), klik("#btn-doc", 1200), klik("#tab-profil", 900));
// Odznaka „Tajemniczy hub” zdradzałaby miejsce gry: podpis znika, ikona zostaje
const ukryjHub = ukryjTekst(/\bhub\b/);
// Styl portalu z przełącznika na karcie profilu (Historyczny, Fantasy, Cyberpunk)
const stylWypraw = (nazwa) => klik(`#pan-profil :is(button, [role=button], label):has-text("${nazwa}")`);

// Purda: karta z bestiariusza (tryb mapy „Bestiariusz”, potem pinezka miejsca)
const kartaBestiariusza = (miejsce) => kroki(pominIntroPurdy, klik("#tryb-bestiariusz"), klik(`button.pin:has-text("${miejsce}")`, 1800));

// Mapa zieleni: karta miejsca w zakładce Atlas, wybrana z listy po wartości
const kartaAtlasu = (wartosc) => kroki(klik("#tab-atlas", 1200), async (strona) => {
  await strona.selectOption("#atlasSelect", wartosc);
  await strona.waitForTimeout(1800);
});

// Mapa zieleni: kadr od góry okna do dolnej krawędzi karty miejsca (stopka i tak jest ukryta)
function kadrAtlasu() {
  const karta = document.getElementById("atlasKarta");
  const dol = Math.min(window.innerHeight, Math.round(karta.getBoundingClientRect().bottom + 32));
  return { x: 0, y: 0, width: window.innerWidth, height: dol };
}

// ISKRA: blok „Stara zajezdnia tramwajowa” z sekcji Wizualizacje potencjału. Kadr obejmuje
// nagłówek i parę zdjęć przed/po; kolumna z cytatami zostaje poza nim. „miniatura”: same zdjęcia, 16:10.
const wizualizacjeIskry = kroki(
  klik('button.nav-tab:has-text("Wizualizacje potencjału")', 1500),
  async (strona) => {
    await strona.evaluate(() => {
      const blok = [...document.querySelectorAll(".potential-block")].find((b) => /zajezdni/i.test(b.textContent));
      window.scrollTo({ top: blok.getBoundingClientRect().top + window.scrollY - 64, behavior: "instant" });
    });
    await strona.waitForTimeout(900);
  },
);
function kadrPrzedPo(miniatura) {
  const blok = [...document.querySelectorAll(".potential-block")].find((b) => /zajezdni/i.test(b.textContent));
  const b = blok.getBoundingClientRect();
  if (miniatura) {
    const siatka = blok.querySelector(".before-after-grid").getBoundingClientRect();
    return { x: siatka.left, y: siatka.top, width: siatka.width, height: Math.round(siatka.width / 1.6) };
  }
  const media = blok.querySelector(".visual-media").getBoundingClientRect();
  return { x: b.left, y: b.top, width: media.right - b.left, height: b.bottom - b.top };
}

// Ciepło: widok z górnych zakładek aplikacji (Mapa osiedli, Scenariusz 2040…)
const widokCiepla = (nazwa) => klik(`button:has-text("${nazwa}")`, 2200);

// Wyprawy: kadr między górnym paskiem a dolnymi zakładkami (oba ukryte)
function srodekAplikacji() {
  const gora = document.querySelector(".hdr").getBoundingClientRect().bottom;
  const dol = document.querySelector(".tabbar").getBoundingClientRect().top;
  return { x: 0, y: Math.round(gora), width: window.innerWidth, height: Math.round(dol - gora) };
}

// ISKRA: bez nagłówka sekcji — sam blok tytułowy; z nagłówkiem — cała sekcja (.sec), przycięta do okna
function kadrIskry(naglowek) {
  const el = naglowek
    ? [...document.querySelectorAll("h2")].find((h) => h.textContent.includes(naglowek)).closest(".sec")
    : document.querySelector(".hero");
  const r = el.getBoundingClientRect();
  const gora = Math.max(0, r.top - 8);
  return { x: 0, y: gora, width: window.innerWidth, height: Math.min(window.innerHeight, r.bottom + 16) - gora };
}

// Ciepło: ciasny kadr wokół obrysów okręgów (bez pustego tła mapy)
function obrysyCiepla() {
  const mapa = document.getElementById("leafletMap").getBoundingClientRect();
  const sciezki = [...document.querySelectorAll("#leafletMap .leaflet-overlay-pane path")].map((p) => p.getBoundingClientRect()).filter((r) => r.width && r.height);
  const lewo = Math.max(mapa.left, Math.min(...sciezki.map((r) => r.left)) - 40);
  const gora = Math.max(mapa.top, Math.min(...sciezki.map((r) => r.top)) - 40);
  const prawo = Math.min(mapa.right, Math.max(...sciezki.map((r) => r.right)) + 40);
  const dol = Math.min(mapa.bottom, Math.max(...sciezki.map((r) => r.bottom)) + 40);
  return { x: lewo, y: gora, width: prawo - lewo, height: dol - gora };
}

// Ciepło Bydgoszczy: mapa bez kafelków podkładu (znikają numery dróg z OSM)
const bezKafelkow = async (strona) => {
  await strona.evaluate(() => {
    const przelacznik = document.getElementById("basemapToggle");
    if (przelacznik && przelacznik.getAttribute("aria-pressed") === "false") przelacznik.click();
  });
  await strona.waitForTimeout(2600);
};

// Kadr na pełną wysokość okna, w poziomie dopasowany do wskazanego elementu (z marginesem).
// Żagle to wąska kolumna na pergaminie, a flota ma inną szerokość niż reszta strony.
function szerokoscElementu(selektor) {
  const r = document.querySelector(selektor).getBoundingClientRect();
  const x = Math.max(0, Math.round(r.left - 32));
  return { x, y: 0, width: Math.min(window.innerWidth - x, Math.round(r.right + 32) - x), height: window.innerHeight };
}

const PRZEPISY = [
  /* ===== Otwarte dema: ostry zrzut górnej części strony, 1440 × 900 ===== */
  {
    // Ostatni kadr intro: magnes IX edycji z datą i miejscem
    id: "swieto-chelminskie",
    rodzaj: "otwarte",
    adres: CHELMINSKIE,
    ruch: true,
    przygotuj: introMagnesow("13 września 2026"),
    kadr: () => ({ x: 160, y: 130, width: 1120, height: 700 }),
  },
  {
    // Kadr z filmu intro: ulica w złotym świetle i księga na pulpicie
    id: "swieto-bydgoskie",
    rodzaj: "otwarte",
    film: { adres: `${BYDGOSKIE}img/intro/intro.mp4`, sekunda: 12, proporcje: 16 / 10 },
  },
  {
    // Nagłówek z liczbami i wyborem okręgu, ciaśniej niż całe okno; wariant ciemny
    id: "bo-torun-2027",
    rodzaj: "otwarte",
    adres: BO,
    ciemny: true,
    kadr: () => ({ x: 60, y: 30, width: 1280, height: 800 }),
  },
  {
    id: "wedrowki-purda",
    rodzaj: "otwarte",
    adres: "https://lucid-academy.github.io/olsztyn/",
    // Intro wideo: przycisk „Pomiń” kończy je tak samo jak koniec filmu
    przygotuj: async (strona) => {
      await strona.evaluate(() => document.getElementById("intro-skip")?.click());
      await strona.waitForTimeout(1800);
    },
  },
  {
    // Całe okno, jak przy Purdzie: nagłówek, menu, przełącznik dni i góra rysowanej mapy
    id: "zagle-2026",
    rodzaj: "otwarte",
    adres: ZAGLE,
  },

  /* ===== Dema na życzenie: wycinek, bez adresu w repozytorium ===== */
  {
    // Bez: mapy, nazw lokalizacji i tytułu z intro
    id: "wyprawy-torun",
    rodzaj: "na-zyczenie",
    okno: { width: 390, height: 844 },
    przygotuj: async (strona) => {
      await strona.click("#btn-skip");          // „Pomiń intro” → kartka końcowa
      await strona.waitForTimeout(500);
      await strona.click("#btn-doc");           // wejście do portalu
      await strona.waitForTimeout(1200);
      await strona.click("#tab-profil");        // zakładka Profil
      await strona.waitForTimeout(900);
      await stylWypraw("Fantasy")(strona);     // zielony styl fantasy
      // Przewiń panel tak, żeby siatka osiągnięć nie chowała się pod paskiem zakładek
      await strona.evaluate(() => {
        const siatka = document.getElementById("ach-grid");
        let el = siatka.parentElement;
        while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        if (el) el.scrollTop += siatka.getBoundingClientRect().bottom - (window.innerHeight - 96);
      });
      await strona.waitForTimeout(400);
      await ukryjHub(strona);
    },
    ukryj: [".hdr", "#scr-intro", "#pan-mapa", "#pan-projekt", ".tabbar", "#ach-detail", "#pan-profil .styles", "#pan-profil .note"],
    kadr: () => {
      const etykiety = [...document.querySelectorAll("#pan-profil .sec-label")];
      const karta = etykiety.find((e) => /karta postaci/i.test(e.textContent));
      const siatka = document.getElementById("ach-grid");
      const gora = karta.getBoundingClientRect().top - 14;
      const dol = siatka.getBoundingClientRect().bottom + 16;
      return { x: 0, y: gora, width: window.innerWidth, height: dol - gora };
    },
    zakazane: [/toru[nń]/i, /interaktywne wyprawy/i, /\bhub\b/i, /zamek dyb/i, /park miejski/i],
    szerokosc: 600,
  },
  {
    // Bez: stopki
    id: "mapa-zieleni",
    rodzaj: "na-zyczenie",
    ukryj: ["footer"],
    kadr: () => {
      const teraz = document.getElementById("teraz-h").closest("section").getBoundingClientRect();
      return { x: 56, y: teraz.top - 4, width: 840, height: 525 };
    },
    zakazane: [/mapę przygotowało/i, /dane: urząd/i],
  },
  {
    // Bez: Interaktywnej Piaskownicy Danych (wynik modelowy) i sekcji Metodologia
    id: "krosno-konsultacje",
    rodzaj: "na-zyczenie",
    ukryj: [
      "section:has(.simulator-intro-grid)", ".simulator-intro-grid", "[class*=simulator]",
      "[id*=metod]", "section:has([id*=metod])",
      "header.topbar", "#backTop", "#modalOverlay", ".skip-link",
    ],
    kadr: () => {
      // Większy wycinek: pasek wyników zbiorczych i sekcja „trzy perspektywy” pod nim
      const kpi = document.querySelector("[class*=kpi]").getBoundingClientRect();
      const szer = kpi.width + 48;
      return { x: kpi.left - 24, y: kpi.top - 24, width: szer, height: Math.round(szer / 1.6) };
    },
    zakazane: [/piaskownic/i, /symulac/i, /metodologi/i, /przeliczone g[łl]osy/i],
  },
  {
    // Bez: cytatów, zdjęć, biblioteki raportów i trybu spaceru z przewodnikiem
    id: "iskra-atlas-glosow",
    rodzaj: "na-zyczenie",
    ukryj: [
      "#torunCompass", "#copernicusGuide", ".walk-fab", "#walkOverlay", "#lightbox", "#rmodal",
      ".cursor-spotlight", ".lucid-credit", "#scrollProg", "nav",
      "blockquote", "q", "[class*=quote]", "figure", "img",
    ],
    kadr: () => {
      // Wykres zbiorczy „Najczęściej wskazywane miejsca”: tytuł i pierwsze słupki (~150% w kaflu)
      const tytul = [...document.querySelectorAll(".chart-title")].find((e) => /miejsca wskazywane/i.test(e.textContent));
      const karta = tytul.parentElement.getBoundingClientRect();
      return { x: karta.left, y: karta.top, width: 440, height: 275 };
    },
    zakazaneElementy: ["img", "picture", "video", "blockquote", "q", "[class*=quote]", "#rmodal", "#walkOverlay", "#torunCompass", "#copernicusGuide"],
    zakazane: [/„/, /spacer/i, /raport #/i],
  },
  // Ciepło Bydgoszczy 2040: miniatura powstaje z pierwszego kadru galerii (pętla pod GALERIE).
  // Szczeciński Dziennik Sezonu: miniatura i galeria to zrzuty dostarczone przez zespół
  // (wartości bezwzględne lekko rozmyte). Ten skrypt ich nie robi i nie nadpisuje.
];

/* ---------- Kadry galerii: kilka widoków na kafel ---------- */
// Pole „kafel” mówi, z którego adresu (albo wpisu w zrodla-prywatne.json) korzysta kadr.
// Bez pola „kadr” zrzut obejmuje całe okno. Dla dem na życzenie obowiązują
// te same zasady co przy miniaturach: lista „Bez” w „ukryj” i kontrola „zakazane”.

const GALERIE = [
  /* ----- IX Święto Chełmińskiego Przedmieścia ----- */
  { id: "swieto-chelminskie-1", kafel: "swieto-chelminskie", rodzaj: "otwarte", adres: CHELMINSKIE, ruch: true, przygotuj: introMagnesow("13 września 2026") },
  { id: "swieto-chelminskie-2", kafel: "swieto-chelminskie", rodzaj: "otwarte", adres: CHELMINSKIE, localStorage: BEZ_INTRA_CH },
  { id: "swieto-chelminskie-3", kafel: "swieto-chelminskie", rodzaj: "otwarte", adres: CHELMINSKIE, localStorage: BEZ_INTRA_CH, przygotuj: panel("sekcja-program") },
  { id: "swieto-chelminskie-4", kafel: "swieto-chelminskie", rodzaj: "otwarte", adres: CHELMINSKIE, localStorage: BEZ_INTRA_CH, przygotuj: panel("sekcja-pamiec") },

  /* ----- XVII Święto Bydgoskiego Przedmieścia ----- */
  { id: "swieto-bydgoskie-1", kafel: "swieto-bydgoskie", rodzaj: "otwarte", film: { adres: `${BYDGOSKIE}img/intro/intro.mp4`, sekunda: 12 } },
  { id: "swieto-bydgoskie-2", kafel: "swieto-bydgoskie", rodzaj: "otwarte", adres: BYDGOSKIE, localStorage: BEZ_INTRA_BP },
  { id: "swieto-bydgoskie-3", kafel: "swieto-bydgoskie", rodzaj: "otwarte", adres: BYDGOSKIE, localStorage: BEZ_INTRA_BP, przygotuj: panel("sekcja-program") },
  { id: "swieto-bydgoskie-4", kafel: "swieto-bydgoskie", rodzaj: "otwarte", adres: BYDGOSKIE, localStorage: BEZ_INTRA_BP, przygotuj: panel("sekcja-przyjaciele") },

  /* ----- Budżet Obywatelski Torunia 2027 ----- */
  { id: "bo-torun-2027-1", kafel: "bo-torun-2027", rodzaj: "otwarte", adres: BO, ciemny: true },
  { id: "bo-torun-2027-2", kafel: "bo-torun-2027", rodzaj: "otwarte", adres: BO, ciemny: true, przygotuj: doNaglowka("Chętnych jest więcej", 96) },
  { id: "bo-torun-2027-3", kafel: "bo-torun-2027", rodzaj: "otwarte", adres: BO, ciemny: true, przygotuj: doNaglowka("Mapa projektów", 96) },
  { id: "bo-torun-2027-4", kafel: "bo-torun-2027", rodzaj: "otwarte", adres: BO, ciemny: true, przygotuj: doNaglowka("Wszystkie 130", 96) },

  /* ----- Wędrówki po gminie Purda (Glosariusz Olsztyna) ----- */
  { id: "wedrowki-purda-1", kafel: "wedrowki-purda", rodzaj: "otwarte", adres: PURDA },
  { id: "wedrowki-purda-2", kafel: "wedrowki-purda", rodzaj: "otwarte", adres: PURDA, przygotuj: async (strona) => { await pominIntroPurdy(strona); } },
  {
    // Karta z bestiariusza: ilustracja i opis Południcy ze Smutnej Góry (samo okno karty)
    id: "wedrowki-purda-3", kafel: "wedrowki-purda", rodzaj: "otwarte", adres: PURDA,
    przygotuj: kartaBestiariusza("Smutna Góra"),
    kadr: () => {
      const r = document.querySelector(".modal__panel").getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    },
  },

  /* ----- Żagle 2026, Szczecin: strona to wąska kolumna, kadr obejmuje kolumnę ----- */
  { id: "zagle-2026-1", kafel: "zagle-2026", rodzaj: "otwarte", adres: ZAGLE, kadr: szerokoscElementu, kadrArg: ".wrap", szerokosc: 1000 },
  {
    id: "zagle-2026-2", kafel: "zagle-2026", rodzaj: "otwarte", adres: ZAGLE, kadr: szerokoscElementu, kadrArg: ".wrap", szerokosc: 1000,
    przygotuj: async (strona) => {
      await strona.click("#build");             // „Ułóż plan” z domyślnymi odpowiedziami
      await strona.waitForTimeout(1200);
      await doNaglowka("Twój plan", 40)(strona);
    },
  },
  { id: "zagle-2026-3", kafel: "zagle-2026", rodzaj: "otwarte", adres: ZAGLE, kadr: szerokoscElementu, kadrArg: "#flota", szerokosc: 1400, przygotuj: doNaglowka("Flota Żagli", 40) },

  /* ===== Dema na życzenie: te same listy „Bez” i ta sama kontrola co przy miniaturach ===== */

  /* ----- Interaktywne wyprawy miejskie — Bez: mapy, nazw lokalizacji i tytułu z intro ----- */
  ...[
    // Ten sam portal w trzech stylach: jeden silnik, różne narracje
    { id: "wyprawy-torun-1", przygotuj: kroki(portalWypraw, stylWypraw("Fantasy")) },
    { id: "wyprawy-torun-3", przygotuj: portalWypraw },
    { id: "wyprawy-torun-4", przygotuj: kroki(portalWypraw, stylWypraw("Cyberpunk")) },
  ].map((k) => ({
    ...k,
    przygotuj: kroki(k.przygotuj, ukryjHub),
    kafel: "wyprawy-torun",
    rodzaj: "na-zyczenie",
    okno: { width: 390, height: 844 },
    ukryj: [".hdr", "#scr-intro", "#pan-mapa", "#pan-projekt", ".tabbar", "#ach-detail"],
    kadr: srodekAplikacji,
    zakazane: [/toru[nń]/i, /interaktywne wyprawy/i, /\bhub\b/i, /zamek dyb/i, /park miejski/i],
    szerokosc: 780,
  })),
  {
    // Plakat filmu, który otwiera pierwszą wyprawę: pięć postaci na nocnej ulicy.
    // Adres pliku jest w zrodla-prywatne.json (klucz „wyprawy-torun-plakat”), nie tutaj.
    // Bez: szyldu z nazwą miejsca w lewym górnym rogu. Wycinek zaczyna się na prawo od niego;
    // skrypt sprawdza wymiary obrazu i to, że wycinek omija obszar szyldu.
    id: "wyprawy-torun-2",
    kafel: "wyprawy-torun",
    rodzaj: "na-zyczenie",
    film: { zrodlo: "wyprawy-torun-plakat", sekunda: 0 },
    wymiary: { width: 1264, height: 720 },
    wycinek: { x: 200, y: 0, width: 1064, height: 720 },
    zakazanyObszar: { x: 96, y: 136, width: 100, height: 112 },
  },

  /* ----- Mapa zieleni Torunia — Bez: stopki; ukrywamy też podpis ze źródłem danych ----- */
  // Karty Atlasu tylko z miejscami, których zdjęcia są nasze (zdjęcie Angielskiego Ogrodu nie jest)
  ...[
    { id: "mapa-zieleni-1" },
    { id: "mapa-zieleni-2", krok: kartaAtlasu("dziki-brzeg-wisly"), kadr: kadrAtlasu },
    { id: "mapa-zieleni-3", krok: kartaAtlasu("bydgoskie-bzy"), kadr: kadrAtlasu },
    { id: "mapa-zieleni-4", krok: klik("#tab-planer") },
    { id: "mapa-zieleni-5", krok: klik("#tab-paszport") },
  ].map(({ id, krok, kadr }) => ({
    id,
    kafel: "mapa-zieleni",
    rodzaj: "na-zyczenie",
    przygotuj: kroki(...(krok ? [krok] : []), ukryjTekst(/dane: (um|urz)|urz[ąa]d miasta|mapę przygotowało/)),
    ukryj: ["footer"],
    kadr: kadr || (() => ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight })),
    zakazaneElementy: ['img[src*="angielski-ogrod"]'],
    zakazane: [/mapę przygotowało/i, /dane: urząd/i, /dane: um/i, /urz[ąa]d miasta/i],
  })),

  /* ----- Konsultacje w Krośnie — Bez: Interaktywnej Piaskownicy Danych i sekcji Metodologia ----- */
  ...[
    { id: "krosno-konsultacje-1", naglowek: null },
    { id: "krosno-konsultacje-2", naglowek: "Ten sam problem" },
    { id: "krosno-konsultacje-3", naglowek: "Wiek i płeć" },
    { id: "krosno-konsultacje-4", naglowek: "Twarde liczby" },
  ].map(({ id, naglowek }) => ({
    id,
    kafel: "krosno-konsultacje",
    rodzaj: "na-zyczenie",
    przygotuj: naglowek ? doNaglowka(naglowek, 24) : async (strona) => { await strona.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); },
    ukryj: [
      "section:has(.simulator-intro-grid)", ".simulator-intro-grid", "[class*=simulator]",
      "[id*=metod]", "section:has([id*=metod])",
      "header.topbar", "#backTop", "#modalOverlay", ".skip-link",
    ],
    kadr: () => ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }),
    zakazane: [/piaskownic/i, /symulac/i, /metodologi/i, /przeliczone g[łl]osy/i],
  })),

  /* ----- ISKRA — Bez: cytatów, zdjęć, biblioteki raportów i trybu spaceru z przewodnikiem ----- */
  {
    // Wyjątek od „Bez zdjęć”, o który poprosił zespół: para przed/po ze starej zajezdni
    // (stan obecny i wizualizacja AI). Cytaty z raportów zostają poza kadrem i są ukryte.
    id: "iskra-atlas-glosow-1",
    kafel: "iskra-atlas-glosow",
    rodzaj: "na-zyczenie",
    przygotuj: kroki(wizualizacjeIskry, ukryjTekst(/„|spacer|raport #/)),
    ukryj: [
      "#torunCompass", "#copernicusGuide", ".walk-fab", "#walkOverlay", "#lightbox", "#rmodal",
      ".cursor-spotlight", ".lucid-credit", "#scrollProg", "nav",
      "blockquote", "q", "[class*=quote]", ".hero-bg-photo", ".note-draft",
    ],
    kadr: kadrPrzedPo,
    kadrArg: false,
    zakazaneElementy: [
      "img:not(.before-after-grid img)", "picture:not(.before-after-grid picture)", "video", "blockquote", "q", "[class*=quote]",
      "#rmodal", "#walkOverlay", "#torunCompass", "#copernicusGuide", ".hero-bg-photo",
    ],
    zakazane: [/„/, /spacer/i, /raport #/i],
  },
  ...[
    { id: "iskra-atlas-glosow-2", naglowek: "Charakterystyka uczestników" },
    { id: "iskra-atlas-glosow-3", naglowek: "Najczęściej wskazywane miejsca" },
  ].map(({ id, naglowek }) => ({
    id,
    kafel: "iskra-atlas-glosow",
    rodzaj: "na-zyczenie",
    przygotuj: kroki(
      naglowek ? doNaglowka(naglowek, 24) : async (strona) => { await strona.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); },
      ukryjTekst(/„|spacer|raport #/),
    ),
    ukryj: [
      "#torunCompass", "#copernicusGuide", ".walk-fab", "#walkOverlay", "#lightbox", "#rmodal",
      ".cursor-spotlight", ".lucid-credit", "#scrollProg", "nav",
      "blockquote", "q", "[class*=quote]", "figure", "img", ".hero-bg-photo", ".note-draft",
    ],
    kadr: kadrIskry,
    kadrArg: naglowek,
    zakazaneElementy: ["img", "picture", "video", "blockquote", "q", "[class*=quote]", "#rmodal", "#walkOverlay", "#torunCompass", "#copernicusGuide", ".hero-bg-photo"],
    zakazane: [/„/, /spacer/i, /raport #/i],
  })),

  /* ----- Ciepło Bydgoszczy 2040 — dane publiczne: wartości, legenda i scenariusz mogą być widoczne ----- */
  ...[
    { id: "cieplo-bydgoszczy-2040-1", przygotuj: async (strona) => { await strona.waitForTimeout(1500); } },
    { id: "cieplo-bydgoszczy-2040-2", przygotuj: kroki(widokCiepla("Scenariusz 2040"), doNaglowka("Założenia scenariusza", 96)) },
    { id: "cieplo-bydgoszczy-2040-3", przygotuj: widokCiepla("Scenariusz 2040") },
  ].map((k) => ({
    ...k,
    kafel: "cieplo-bydgoszczy-2040",
    rodzaj: "na-zyczenie",
    ukryj: ["#toast", ".leaflet-popup-pane"],
  })),
];

// Część miniatur dem na życzenie powstaje z kadrów galerii: te same listy „Bez” i ta sama kontrola
for (const [kafel, zKadru, zmiany] of [
  ["mapa-zieleni", "mapa-zieleni-1", {}],
  ["krosno-konsultacje", "krosno-konsultacje-1", {}],
  // Sama para zdjęć przed/po w proporcjach kafla
  ["iskra-atlas-glosow", "iskra-atlas-glosow-1", { kadrArg: true }],
  ["cieplo-bydgoszczy-2040", "cieplo-bydgoszczy-2040-1", {}],
]) {
  const przepis = { ...GALERIE.find((g) => g.id === zKadru), id: kafel, kafel, szerokosc: 800, ...zmiany };
  const nr = PRZEPISY.findIndex((p) => p.id === kafel);
  if (nr === -1) PRZEPISY.push(przepis);
  else PRZEPISY.splice(nr, 1, przepis);
}

/* ---------- Pomocnicze ---------- */

async function wczytajPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const { execSync } = await import("node:child_process");
    const globalny = execSync("npm root -g").toString().trim();
    return await import(pathToFileURL(path.join(globalny, "playwright", "index.mjs")).href);
  }
}

function argumenty(argv) {
  const wynik = {
    idy: [],
    zrodla: path.join(KORZEN, "narzedzia", "zrodla-prywatne.json"),
    wyjscie: path.join(KORZEN, "assets", "kafle"),
    wyjscieGalerii: path.join(KORZEN, "assets", "galeria"),
    kafle: true,
    galerie: true,
    podglad: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--zrodla") wynik.zrodla = path.resolve(argv[++i]);
    else if (argv[i] === "--wyjscie") wynik.wyjscie = path.resolve(argv[++i]);
    else if (argv[i] === "--wyjscie-galerii") wynik.wyjscieGalerii = path.resolve(argv[++i]);
    else if (argv[i] === "--kafle") wynik.galerie = false;
    else if (argv[i] === "--galerie") wynik.kafle = false;
    else if (argv[i] === "--podglad") wynik.podglad = true;
    else wynik.idy.push(argv[i]);
  }
  return wynik;
}

// Klatka z filmu (PNG). Film pobiera przeglądarka — tą samą drogą co strony
// (działa też za proxy) — a ffmpeg wycina klatkę z pliku tymczasowego.
async function klatkaFilmu(przegladarka, { adres, sekunda }) {
  const kontekst = await przegladarka.newContext();
  await kontekst.route(/goatcounter\.com|gc\.zgo\.at/, (trasa) => trasa.abort());
  const strona = await kontekst.newPage();
  // Dowolny adres z tej samej domeny, żeby pobranie filmu nie było żądaniem z innego źródła
  await strona.goto(new URL(".", adres).href, { waitUntil: "domcontentloaded" });
  const b64 = await strona.evaluate(async (u) => {
    const odpowiedz = await fetch(u);
    if (!odpowiedz.ok) throw new Error(`HTTP ${odpowiedz.status}`);
    const bajty = new Uint8Array(await odpowiedz.arrayBuffer());
    let s = "";
    for (let i = 0; i < bajty.length; i += 0x8000) s += String.fromCharCode(...bajty.subarray(i, i + 0x8000));
    return btoa(s);
  }, adres);
  await kontekst.close();
  const plik = path.join(os.tmpdir(), `klatka-${process.pid}-${Date.now()}.mp4`);
  writeFileSync(plik, Buffer.from(b64, "base64"));
  try {
    return execFileSync("ffmpeg", ["-v", "error", "-ss", String(sekunda), "-i", plik, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 256 * 1024 * 1024 });
  } finally {
    rmSync(plik, { force: true });
  }
}

// Kontrola kadru w przeglądarce: widoczne teksty i elementy w prostokącie
function kontrolaKadru({ kadr, zakazaneElementy }) {
  const przecina = (a, b) => a.left < b.x + b.width && a.right > b.x && a.top < b.y + b.height && a.bottom > b.y;
  const widoczny = (el) => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const st = getComputedStyle(el);
    if (st.visibility !== "visible") return false;
    const przezroczysty = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);
    if (el instanceof SVGElement) return !(przezroczysty(st.fill) && przezroczysty(st.stroke));
    return !(przezroczysty(st.color) && przezroczysty(st.webkitTextFillColor));
  };
  const teksty = [];
  const spacer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let wezel = spacer.nextNode(); wezel; wezel = spacer.nextNode()) {
    const tekst = wezel.textContent.replace(/\s+/g, " ").trim();
    const el = wezel.parentElement;
    if (!tekst || !el || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"].includes(el.tagName)) continue;
    const zakres = document.createRange();
    zakres.selectNodeContents(wezel);
    const wKadrze = [...zakres.getClientRects()].some((r) => r.width > 0 && r.height > 0 && przecina(r, kadr));
    if (wKadrze && widoczny(el)) teksty.push(tekst);
  }
  const elementy = [];
  for (const sel of zakazaneElementy || []) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && przecina(r, kadr) && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
        elementy.push(`${sel} → ${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}`);
      }
    }
  }
  return { teksty, elementy };
}

// PNG → WebP o zadanej szerokości, w samej przeglądarce (bez dodatkowych bibliotek).
// „wycinek” ({ x, y, width, height }) bierze tylko ten prostokąt obrazu;
// „proporcje” (np. 16 / 10) wycinają z niego środek o takich proporcjach.
async function doWebp(przegladarka, png, szerokosc, jakosc = 0.84, proporcje = null, wycinek = null) {
  const strona = await przegladarka.newPage();
  const b64 = await strona.evaluate(async ({ dane, szerokosc, jakosc, proporcje, wycinek }) => {
    const blob = await (await fetch(`data:image/png;base64,${dane}`)).blob();
    const pelny = await createImageBitmap(blob);
    let [sx, sy, sw, sh] = wycinek ? [wycinek.x, wycinek.y, wycinek.width, wycinek.height] : [0, 0, pelny.width, pelny.height];
    if (proporcje) {
      if (sw / sh > proporcje) { const n = Math.round(sh * proporcje); sx += Math.round((sw - n) / 2); sw = n; }
      else { const n = Math.round(sw / proporcje); sy += Math.round((sh - n) / 2); sh = n; }
    }
    const szer = Math.min(szerokosc, sw);
    const wys = Math.round((sh * szer) / sw);
    const maly = await createImageBitmap(blob, sx, sy, sw, sh, { resizeWidth: szer, resizeHeight: wys, resizeQuality: "high" });
    const plotno = new OffscreenCanvas(szer, wys);
    plotno.getContext("2d").drawImage(maly, 0, 0);
    const wynik = new Uint8Array(await (await plotno.convertToBlob({ type: "image/webp", quality: jakosc })).arrayBuffer());
    let s = "";
    for (let i = 0; i < wynik.length; i += 0x8000) s += String.fromCharCode(...wynik.subarray(i, i + 0x8000));
    return btoa(s);
  }, { dane: png.toString("base64"), szerokosc, jakosc, proporcje, wycinek });
  await strona.close();
  return Buffer.from(b64, "base64");
}

// Kadr z pliku (plakat, klatka filmu) nie ma DOM-u do sprawdzenia. Przy demie na życzenie
// wycinek ustala się ręcznie po obejrzeniu obrazu, a skrypt pilnuje dwóch rzeczy: że obraz
// ma te same wymiary co wtedy i że wycinek nie zahacza o obszar z listy „Bez”.
function kontrolaWycinka(png, { rodzaj, wymiary, wycinek, zakazanyObszar }) {
  const bledy = [];
  if (rodzaj === "na-zyczenie" && (!wycinek || !wymiary)) {
    return ["kadr z pliku przy demie na życzenie wymaga pól „wymiary” i „wycinek”"];
  }
  if (!wycinek) return bledy;
  const szer = png.readUInt32BE(16), wys = png.readUInt32BE(20); // nagłówek IHDR pliku PNG
  if (wymiary && (szer !== wymiary.width || wys !== wymiary.height)) {
    bledy.push(`obraz ma ${szer}×${wys} zamiast ${wymiary.width}×${wymiary.height}: wycinek trzeba ustalić na nowo`);
  }
  if (wycinek.x < 0 || wycinek.y < 0 || wycinek.x + wycinek.width > szer || wycinek.y + wycinek.height > wys) {
    bledy.push("wycinek wychodzi poza obraz");
  }
  const z = zakazanyObszar;
  if (z && wycinek.x < z.x + z.width && wycinek.x + wycinek.width > z.x && wycinek.y < z.y + z.height && wycinek.y + wycinek.height > z.y) {
    bledy.push("wycinek obejmuje obszar z listy „Bez”");
  }
  return bledy;
}

/* ---------- Zrzut jednego kafla ---------- */

async function zrzut(przegladarka, przepis, adres, opcje) {
  const okno = przepis.okno || { width: 1440, height: 900 };
  const otwarte = przepis.rodzaj === "otwarte";

  // Najpierw rozpoznanie kadru przy skali 1, potem zrzut w skali dobranej do ~800 px
  // Domyślnie bez animacji strony źródłowej; „ruch: true” tam, gdzie kadr jest właśnie animacją (intro)
  // „ciemny: true”: strona dostaje prefers-color-scheme: dark (np. ciemny wariant BO)
  const kontekst = await przegladarka.newContext({
    viewport: okno,
    deviceScaleFactor: opcje.skala || 1,
    reducedMotion: przepis.ruch ? "no-preference" : "reduce",
    colorScheme: przepis.ciemny ? "dark" : "light",
  });
  if (opcje.kontekstHook) await opcje.kontekstHook(kontekst);
  // Zrzuty nie nabijają liczników odwiedzin
  await kontekst.route(/goatcounter\.com|gc\.zgo\.at/, (trasa) => trasa.abort());
  if (przepis.localStorage) {
    await kontekst.addInitScript((wpisy) => {
      for (const [k, v] of Object.entries(wpisy)) localStorage.setItem(k, v);
    }, przepis.localStorage);
  }

  const strona = await kontekst.newPage();
  await strona.goto(adres, { waitUntil: "networkidle", timeout: 120000 });
  await strona.evaluate(() => document.fonts?.ready);
  await strona.waitForTimeout(1200);
  if (przepis.przygotuj) await przepis.przygotuj(strona);

  // Płynne przewijanie strony źródłowej rozjechałoby kontrolę i zrzut — wyłączamy je
  const ukryj = [...ZAWSZE_UKRYJ, ...(przepis.ukryj || [])];
  await strona.addStyleTag({
    content: "html, body { scroll-behavior: auto !important; }\n" +
      (ukryj.length ? ukryj.map((s) => `${s}, ${s} *`).join(",\n") + " { visibility: hidden !important; }" : "") +
      (przepis.css ? `\n${przepis.css}` : ""),
  });

  const zmierz = async () => {
    // Bez przepisu „kadr” zrzut obejmuje całe okno
    const k = przepis.kadr ? await strona.evaluate(przepis.kadr, przepis.kadrArg) : { x: 0, y: 0, width: okno.width, height: okno.height };
    return { x: Math.round(k.x), y: Math.round(k.y), width: Math.round(k.width), height: Math.round(k.height) };
  };
  const ustabilizuj = () => strona.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  if (otwarte) {
    // Otwarte demo bez własnych kroków: góra strony. Kroki („przygotuj”) ustawiają widok same.
    if (!przepis.przygotuj) await strona.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  } else {
    // Przewiń tylko wtedy, gdy kadr nie mieści się w oknie (kroki „przygotuj” mogły już ustawić widok)
    const wstepny = await zmierz();
    if (wstepny.y < 0 || wstepny.y + wstepny.height > okno.height) {
      await strona.evaluate((y) => window.scrollBy({ top: y, behavior: "instant" }), wstepny.y - 120);
    }
  }
  await strona.waitForTimeout(400);
  await ustabilizuj();

  // Kontrola i zrzut muszą dotyczyć dokładnie tego samego prostokąta
  let kadr = null, teksty = [], elementy = [];
  for (let proba = 0; proba < 4; proba++) {
    const przed = await zmierz();
    ({ teksty, elementy } = await strona.evaluate(kontrolaKadru, { kadr: przed, zakazaneElementy: przepis.zakazaneElementy }));
    await ustabilizuj();
    const po = await zmierz();
    if (JSON.stringify(przed) === JSON.stringify(po)) { kadr = po; break; }
    await strona.waitForTimeout(300);
  }

  const bledy = [];
  if (!kadr) bledy.push("kadr nie jest stabilny (strona się przesuwa) — zrzut wstrzymany");
  if (kadr && (kadr.y < 0 || kadr.x < 0 || kadr.y + kadr.height > okno.height || kadr.x + kadr.width > okno.width)) {
    bledy.push(`kadr wychodzi poza okno: ${JSON.stringify(kadr)}`);
  }
  if (przepis.brakTekstu && teksty.length) bledy.push(`w kadrze widać tekst: ${teksty.slice(0, 6).join(" | ")}`);
  for (const wzor of przepis.zakazane || []) {
    const traf = teksty.find((t) => wzor.test(t));
    if (traf) bledy.push(`zakazany tekst ${wzor}: „${traf.slice(0, 60)}”`);
  }
  if (elementy.length) bledy.push(`zakazane elementy w kadrze: ${elementy.slice(0, 6).join(", ")}`);

  const png = bledy.length ? null : await strona.screenshot({ clip: kadr, type: "png" });
  // Po zrzucie jeszcze raz: czy strona nie przesunęła się w trakcie
  if (png && JSON.stringify(await zmierz()) !== JSON.stringify(kadr)) {
    bledy.push("strona przesunęła się w trakcie zrzutu — plik odrzucony");
  }
  await kontekst.close();
  return { kadr, teksty, bledy, png: bledy.length ? null : png };
}

/* ---------- Główna funkcja ---------- */

export async function zrobZrzuty(opcje = {}) {
  const { chromium } = await wczytajPlaywright();
  const zrodla = opcje.zrodla && existsSync(opcje.zrodla) ? JSON.parse(readFileSync(opcje.zrodla, "utf8")) : {};
  const wyjscieKafli = opcje.wyjscie || path.join(KORZEN, "assets", "kafle");
  const wyjscieGalerii = opcje.wyjscieGalerii || path.join(KORZEN, "assets", "galeria");
  const pasuje = (p) => !opcje.idy?.length || opcje.idy.includes(p.id) || opcje.idy.includes(p.kafel);
  const wybrane = [
    ...(opcje.kafle !== false ? PRZEPISY.filter(pasuje).map((p) => ({ ...p, katalog: wyjscieKafli, szerokosc: p.szerokosc || 800 })) : []),
    ...(opcje.galerie !== false ? GALERIE.filter(pasuje).map((p) => ({ ...p, katalog: wyjscieGalerii, szerokosc: p.szerokosc || 1600 })) : []),
  ];

  const przegladarka = await chromium.launch();
  const raport = [];
  for (const przepis of wybrane) {
    mkdirSync(przepis.katalog, { recursive: true });
    const plik = path.join(przepis.katalog, `${przepis.id}.webp`);
    try {
      let png, opisKadru, skala = 1, tekstyWKadrze = 0;
      if (przepis.film) {
        // Klatka z filmu albo obraz (np. plakat). Otwarte demo: plik jest publiczny w całości.
        // Demo na życzenie: adres z zrodla-prywatne.json i obowiązkowy wycinek (kontrolaWycinka).
        const adresPliku = przepis.film.zrodlo ? zrodla[przepis.film.zrodlo] : przepis.film.adres;
        if (!adresPliku) {
          raport.push({ id: przepis.id, wynik: "POMINIĘTY — brak adresu w zrodla-prywatne.json" });
          continue;
        }
        try {
          png = await klatkaFilmu(przegladarka, { adres: adresPliku, sekunda: przepis.film.sekunda });
        } catch (blad) {
          raport.push({ id: przepis.id, wynik: "POMINIĘTY — brak ffmpeg albo filmu pod adresem", bledy: [String(blad.message || blad).split("\n")[0].slice(0, 200)] });
          continue;
        }
        const bledyWycinka = kontrolaWycinka(png, przepis);
        if (bledyWycinka.length) {
          raport.push({ id: przepis.id, wynik: "BŁĄD KONTROLI — plik nie zapisany", bledy: bledyWycinka });
          continue;
        }
        opisKadru = przepis.wycinek ? `wycinek ${przepis.wycinek.width}×${przepis.wycinek.height} z pliku` : `klatka ${przepis.film.sekunda} s`;
      } else {
        const adres = zrodla[przepis.kafel || przepis.id] || przepis.adres;
        if (!adres) {
          raport.push({ id: przepis.id, wynik: "POMINIĘTY — brak adresu w zrodla-prywatne.json" });
          continue;
        }
        // Skala tak, żeby kadr miał co najmniej docelową szerokość (ostrość po zmniejszeniu)
        const rozpoznanie = await zrzut(przegladarka, przepis, adres, { ...opcje, skala: 1 });
        if (rozpoznanie.bledy.length) {
          raport.push({ id: przepis.id, wynik: "BŁĄD KONTROLI — plik nie zapisany", bledy: rozpoznanie.bledy });
          continue;
        }
        skala = Math.max(1, Math.ceil((przepis.szerokosc / rozpoznanie.kadr.width) * 10) / 10);
        const wlasciwy = skala === 1 ? rozpoznanie : await zrzut(przegladarka, przepis, adres, { ...opcje, skala });
        if (wlasciwy.bledy.length) {
          raport.push({ id: przepis.id, wynik: "BŁĄD KONTROLI — plik nie zapisany", bledy: wlasciwy.bledy });
          continue;
        }
        png = wlasciwy.png;
        opisKadru = `kadr ${wlasciwy.kadr.width}×${wlasciwy.kadr.height}, skala ${skala}`;
        tekstyWKadrze = wlasciwy.teksty.length;
      }
      const webp = await doWebp(przegladarka, png, przepis.szerokosc, 0.84, przepis.film?.proporcje || null, przepis.wycinek || null);
      writeFileSync(plik, webp);
      if (opcje.podglad) {
        mkdirSync(path.join(KORZEN, "narzedzia", "podglad"), { recursive: true });
        writeFileSync(path.join(KORZEN, "narzedzia", "podglad", `${przepis.id}.png`), png);
      }
      raport.push({ id: przepis.id, wynik: "OK", plik: path.relative(KORZEN, plik), opisKadru, kb: Math.round(webp.length / 1024), tekstyWKadrze });
    } catch (blad) {
      raport.push({ id: przepis.id, wynik: "BŁĄD", bledy: [String(blad.message || blad).slice(0, 300)] });
    }
  }
  await przegladarka.close();
  return raport;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const raport = await zrobZrzuty(argumenty(process.argv.slice(2)));
  for (const r of raport) {
    console.log(`${r.wynik === "OK" ? "✓" : "✗"} ${r.id}: ${r.wynik}${r.kb ? ` → ${r.plik} (${r.kb} KB, ${r.opisKadru})` : ""}`);
    for (const b of r.bledy || []) console.log(`    ${b}`);
  }
  if (raport.some((r) => r.wynik !== "OK")) process.exitCode = 1;
}
