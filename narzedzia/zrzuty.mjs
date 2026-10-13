#!/usr/bin/env node
/* =========================================================
   Zrzuty do kafli „Co budujemy” → assets/kafle/<id>.webp
   ---------------------------------------------------------
   Uruchomienie (z katalogu repozytorium):
     node narzedzia/zrzuty.mjs                 # wszystkie kafle
     node narzedzia/zrzuty.mjs mapa-zieleni    # wybrane, po id
     node narzedzia/zrzuty.mjs --podglad       # dodatkowo surowe PNG w narzedzia/podglad/

   Potrzebny jest Playwright z Chromium (lokalnie: npm i -D playwright,
   albo globalna instalacja — skrypt znajdzie ją sam).

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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- Przepisy kadrów ---------- */

// Elementy, które nigdy nie powinny trafić do kadru: liczniki, nakładki, wyskakujące okna
const ZAWSZE_UKRYJ = [];

const PRZEPISY = [
  /* ===== Otwarte dema: ostry zrzut górnej części strony, 1440 × 900 ===== */
  {
    id: "swieta-dzielnic",
    rodzaj: "otwarte",
    adres: "https://lucidacademy.pl/projekty/swietochp/",
    // Intro z magnesami pomijamy tak, jak strona robi to sama po pierwszej wizycie
    localStorage: { "intro:chelminskie": "tak" },
  },
  {
    id: "bo-torun-2027",
    rodzaj: "otwarte",
    adres: "https://lucid-academy.github.io/ai-lab/bo-torun-2027.html",
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
    id: "zagle-2026",
    rodzaj: "otwarte",
    adres: "https://lucid-academy.github.io/ai-lab/zagle-2026-karta-morska.html",
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
      // Przewiń panel tak, żeby siatka osiągnięć nie chowała się pod paskiem zakładek
      await strona.evaluate(() => {
        const siatka = document.getElementById("ach-grid");
        let el = siatka.parentElement;
        while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        if (el) el.scrollTop += siatka.getBoundingClientRect().bottom - (window.innerHeight - 96);
      });
      await strona.waitForTimeout(400);
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
    zakazane: [/toru[nń]/i, /interaktywne wyprawy/i, /kulturalny hub/i, /zamek dyb/i, /park miejski/i],
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
  {
    // Bez: osi, wartości, nagłówka z procentami, logo i nazwy klienta
    id: "szczecinski-dziennik-sezonu",
    rodzaj: "na-zyczenie",
    ukryj: [
      "img", "#tip", "body > :first-child",
      "section:has(svg[viewBox]) h2", "section:has(svg[viewBox]) p", ".controls", ".plate .controls",
      "svg .bl", "svg .gl", "svg .ax", "svg .anno", "svg .anno-l", "svg .vlab", "svg .vlab-2", "svg .xh", "svg .hi",
      "svg text",
    ],
    kadr: () => {
      // Prawa część sezonu: wzrost aż do szczytu w sierpniu (~150% w kaflu)
      const wykres = [...document.querySelectorAll("svg[viewBox]")].find((s) => s.querySelector(".l26"));
      const r = wykres.getBoundingClientRect();
      const szer = 440, wys = 275;
      return { x: r.right - szer - 20, y: r.top + r.height / 2 - wys / 2 + 4, width: szer, height: wys };
    },
    brakTekstu: true,
    zakazane: [/[żz]egl/i, /\d/, /%/],
  },
  {
    // Bez: legendy z liczbami i wartości
    id: "cieplo-bydgoszczy-2040",
    rodzaj: "na-zyczenie",
    // Widok „Mapa bez kafelków” — przełącznik samej strony. Zostają granice osiedli,
    // znikają numery dróg z podkładu OSM, które dałoby się wziąć za liczby.
    przygotuj: async (strona) => {
      await strona.evaluate(() => {
        const przelacznik = document.getElementById("basemapToggle");
        if (przelacznik && przelacznik.getAttribute("aria-pressed") === "false") przelacznik.click();
      });
      await strona.waitForTimeout(2600);
    },
    ukryj: [
      "#mapNote", "#toast", ".leaflet-control-container", ".leaflet-tooltip-pane", ".leaflet-popup-pane",
      ".leaflet-tile-pane", "[class*=legend]", "#leafletMap ~ *", "aside",
    ],
    kadr: () => {
      // Środek miasta: najciemniejsze osiedla (~150% w kaflu)
      const mapa = document.getElementById("leafletMap").getBoundingClientRect();
      const szer = 440, wys = 275;
      return { x: mapa.left + mapa.width / 2 - szer / 2 + 4, y: mapa.top + mapa.height / 2 - wys / 2 + 8, width: szer, height: wys };
    },
    brakTekstu: true,
    zakazane: [/\d/, /urządze/i],
  },
];

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
  const wynik = { idy: [], zrodla: path.join(KORZEN, "narzedzia", "zrodla-prywatne.json"), wyjscie: path.join(KORZEN, "assets", "kafle"), podglad: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--zrodla") wynik.zrodla = path.resolve(argv[++i]);
    else if (argv[i] === "--wyjscie") wynik.wyjscie = path.resolve(argv[++i]);
    else if (argv[i] === "--podglad") wynik.podglad = true;
    else wynik.idy.push(argv[i]);
  }
  return wynik;
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

// PNG → WebP o zadanej szerokości, w samej przeglądarce (bez dodatkowych bibliotek)
async function doWebp(przegladarka, png, szerokosc, jakosc = 0.84) {
  const strona = await przegladarka.newPage();
  const b64 = await strona.evaluate(async ({ dane, szerokosc, jakosc }) => {
    const blob = await (await fetch(`data:image/png;base64,${dane}`)).blob();
    const pelny = await createImageBitmap(blob);
    const szer = Math.min(szerokosc, pelny.width);
    const wys = Math.round((pelny.height * szer) / pelny.width);
    const maly = await createImageBitmap(blob, { resizeWidth: szer, resizeHeight: wys, resizeQuality: "high" });
    const plotno = new OffscreenCanvas(szer, wys);
    plotno.getContext("2d").drawImage(maly, 0, 0);
    const wynik = new Uint8Array(await (await plotno.convertToBlob({ type: "image/webp", quality: jakosc })).arrayBuffer());
    let s = "";
    for (let i = 0; i < wynik.length; i += 0x8000) s += String.fromCharCode(...wynik.subarray(i, i + 0x8000));
    return btoa(s);
  }, { dane: png.toString("base64"), szerokosc, jakosc });
  await strona.close();
  return Buffer.from(b64, "base64");
}

/* ---------- Zrzut jednego kafla ---------- */

async function zrzut(przegladarka, przepis, adres, opcje) {
  const okno = przepis.okno || { width: 1440, height: 900 };
  const otwarte = przepis.rodzaj === "otwarte";

  // Najpierw rozpoznanie kadru przy skali 1, potem zrzut w skali dobranej do ~800 px
  const kontekst = await przegladarka.newContext({ viewport: okno, deviceScaleFactor: opcje.skala || 1, reducedMotion: "reduce" });
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
      (ukryj.length ? ukryj.map((s) => `${s}, ${s} *`).join(",\n") + " { visibility: hidden !important; }" : ""),
  });

  const zmierz = async () => {
    const k = otwarte ? { x: 0, y: 0, width: okno.width, height: okno.height } : await strona.evaluate(przepis.kadr);
    return { x: Math.round(k.x), y: Math.round(k.y), width: Math.round(k.width), height: Math.round(k.height) };
  };
  const ustabilizuj = () => strona.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  if (otwarte) {
    await strona.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  } else {
    // Przewiń tak, żeby cały kadr był w oknie
    const wstepny = await zmierz();
    await strona.evaluate((y) => window.scrollBy({ top: y, behavior: "instant" }), wstepny.y - 120);
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
  const zrodla = existsSync(opcje.zrodla) ? JSON.parse(readFileSync(opcje.zrodla, "utf8")) : {};
  const wybrane = PRZEPISY.filter((p) => !opcje.idy?.length || opcje.idy.includes(p.id));
  mkdirSync(opcje.wyjscie, { recursive: true });

  const przegladarka = await chromium.launch();
  const raport = [];
  for (const przepis of wybrane) {
    const adres = zrodla[przepis.id] || przepis.adres;
    if (!adres) {
      raport.push({ id: przepis.id, wynik: "POMINIĘTY — brak adresu w zrodla-prywatne.json" });
      continue;
    }
    try {
      const szerokosc = przepis.szerokosc || 800;
      // Skala tak, żeby kadr miał co najmniej docelową szerokość (ostrość po zmniejszeniu)
      const rozpoznanie = await zrzut(przegladarka, przepis, adres, { ...opcje, skala: 1 });
      if (rozpoznanie.bledy.length) {
        raport.push({ id: przepis.id, wynik: "BŁĄD KONTROLI — plik nie zapisany", bledy: rozpoznanie.bledy });
        continue;
      }
      const skala = Math.max(1, Math.ceil((szerokosc / rozpoznanie.kadr.width) * 10) / 10);
      const wlasciwy = skala === 1 ? rozpoznanie : await zrzut(przegladarka, przepis, adres, { ...opcje, skala });
      if (wlasciwy.bledy.length) {
        raport.push({ id: przepis.id, wynik: "BŁĄD KONTROLI — plik nie zapisany", bledy: wlasciwy.bledy });
        continue;
      }
      const webp = await doWebp(przegladarka, wlasciwy.png, szerokosc);
      const plik = path.join(opcje.wyjscie, `${przepis.id}.webp`);
      writeFileSync(plik, webp);
      if (opcje.podglad) {
        mkdirSync(path.join(KORZEN, "narzedzia", "podglad"), { recursive: true });
        writeFileSync(path.join(KORZEN, "narzedzia", "podglad", `${przepis.id}.png`), wlasciwy.png);
      }
      raport.push({ id: przepis.id, wynik: "OK", kadr: wlasciwy.kadr, skala, kb: Math.round(webp.length / 1024), tekstyWKadrze: wlasciwy.teksty.length });
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
    console.log(`${r.wynik === "OK" ? "✓" : "✗"} ${r.id}: ${r.wynik}${r.kb ? ` (${r.kb} KB, kadr ${r.kadr.width}×${r.kadr.height}, skala ${r.skala})` : ""}`);
    for (const b of r.bledy || []) console.log(`    ${b}`);
  }
  if (raport.some((r) => r.wynik !== "OK")) process.exitCode = 1;
}
