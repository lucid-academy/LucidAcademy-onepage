/* =========================================================
   Lucid Academy — tryb sieci (pilot wersji 3)
   Moduł ładuje się dopiero po kliknięciu „Tryb sieci” (import() w strona.js).
   Scena: płótno 2D z własnym rzutem perspektywicznym, bez bibliotek.
   Węzły to prawdziwe przyciski nad płótnem. Treść pochodzi z sekcji
   strony i z kafle.json, więc obie wersje mają jedno źródło treści.
   Wejście: linia staje się siecią. Mózg z laserowych ścieżek rozpada
   się na neurony tła, które rozlatują się na swoje miejsca, gdy kamera
   wlatuje do rdzenia; ze stopki akson strony wchodzi w pień mózgu.
   Przy prefers-reduced-motion: bez sekwencji wejścia, przelotów kamery,
   dryfu, impulsów i glitchu; scena rysuje się tylko po zmianie.
   ========================================================= */

const ograniczonyRuch = window.matchMedia("(prefers-reduced-motion: reduce)");
const bezRuchu = () => ograniczonyRuch.matches;

const KOLOR = {
  fiolet: [168, 85, 247],
  cyjan: [61, 227, 240],
  magenta: [240, 54, 159],
  biel: [244, 240, 255],
};

/* ---------- Węzły i połączenia ---------- */

// Węzły główne: sekcje strony. Położenie w jednostkach sceny (oś Y w górę).
const GLOWNE = [
  { id: "rdzen", sekcja: "hero", pos: [0, 0, 0], kolor: "fiolet", promien: 22 },
  { id: "misja", sekcja: "misja", pos: [-300, 150, -60], kolor: "cyjan", promien: 14 },
  { id: "uniwersytet", sekcja: "uniwersytet", pos: [-230, -150, 230], kolor: "fiolet", promien: 14 },
  { id: "oferta", sekcja: "oferta", pos: [250, 170, 150], kolor: "cyjan", promien: 14 },
  { id: "gdzie-bylismy", sekcja: "gdzie-bylismy", pos: [90, -230, 300], kolor: "fiolet", promien: 13 },
  { id: "co-robimy", sekcja: "co-robimy", pos: [380, -100, -170], kolor: "cyjan", promien: 15 },
  { id: "zespol", sekcja: "zespol", pos: [-360, -40, -340], kolor: "fiolet", promien: 14 },
  { id: "kontakt", sekcja: "kontakt", pos: [60, 260, -380], kolor: "cyjan", promien: 14 },
];

const POLACZENIA = [
  ["rdzen", "misja"], ["rdzen", "uniwersytet"], ["rdzen", "oferta"], ["rdzen", "gdzie-bylismy"],
  ["rdzen", "co-robimy"], ["rdzen", "zespol"], ["rdzen", "kontakt"],
  ["misja", "uniwersytet"], ["misja", "oferta"], ["misja", "zespol"], ["uniwersytet", "gdzie-bylismy"],
  ["uniwersytet", "zespol"], ["oferta", "co-robimy"], ["oferta", "kontakt"], ["gdzie-bylismy", "co-robimy"],
  ["zespol", "kontakt"],
];

// Ile projektów z kafle.json trafia do sieci: pierwsze otwarte dema i pierwsze demo na życzenie
const PROJEKTY_OTWARTE = 4;
const PROJEKTY_NA_ZYCZENIE = 1;

/* ---------- Drobne narzędzia ---------- */

const dodaj = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const odejmij = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const skaluj = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const iloczyn = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const wektorowy = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normuj = (a) => { const d = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / d, a[1] / d, a[2] / d]; };
const miesz = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ogranicz = (x, min, max) => Math.min(max, Math.max(min, x));
const wygladz = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rgba = (k, a) => `rgba(${k[0]}, ${k[1]}, ${k[2]}, ${a})`;

// Obrót wektora wokół osi (wzór Rodriguesa)
function obroc(v, os, kat) {
  const c = Math.cos(kat), s = Math.sin(kat);
  const kv = wektorowy(os, v), kd = iloczyn(os, v) * (1 - c);
  return [v[0] * c + kv[0] * s + os[0] * kd, v[1] * c + kv[1] * s + os[1] * kd, v[2] * c + kv[2] * s + os[2] * kd];
}

// Stałe ziarno: sieć wygląda tak samo przy każdym wejściu
function losowanie(ziarno) {
  return () => {
    ziarno = (ziarno + 0x6D2B79F5) | 0;
    let t = Math.imul(ziarno ^ (ziarno >>> 15), 1 | ziarno);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ZIARNO = 20260913;

const faza = (t, od, doo) => ogranicz((t - od) / (doo - od), 0, 1);
// Oddanie kolejki przeglądarce między dwiema dużymi porcjami pracy (dzieli długie zadanie)
const ustap = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((g) => setTimeout(g, 0)));

/* ---------- Mózg z linii: obraz sekwencji wejścia ---------- */

// Punkty obrazu assets/brain.webp w ułamkach boku: zbieg ścieżek nad pniem (tu stoi rdzeń sieci)
// i kółko na końcu pnia. Pień jest pionowy, więc ma ten sam x co zbieg.
const MOZG = { zbiegX: 0.557, zbiegY: 0.735, pienY: 0.942 };
const BOK_PROBKI = 256;

// Sekwencja wejścia w ms od otwarcia. Kamera startuje w trakcie rozpadu mózgu, a impuls z pnia
// (wejście ze stopki) dochodzi do rdzenia dokładnie wtedy, gdy rdzeń strzela do sąsiadów.
const WEJSCIE = { kamera: 500, przelot: 2200, rozlot: 700, lot: 1250, koniec: 2750 };
WEJSCIE.dotarcie = WEJSCIE.kamera + WEJSCIE.przelot * 0.85;

// Obraz ładuje się razem z modułem i jest próbkowany raz. decode() rozpakowuje go poza głównym
// wątkiem, więc ani próbkowanie, ani rysowanie obrysu nie dekoduje go w trakcie klatki.
const mozgGotowy = (async () => {
  try {
    const obraz = new Image();
    // Z CORS, bo bez tego obraz z innej domeny (np. podgląd gałęzi przez CDN) „skaża” płótno
    // i getImageData rzuca wyjątek; przy tej samej domenie nic to nie zmienia
    obraz.crossOrigin = "anonymous";
    obraz.src = new URL("../assets/brain.webp", import.meta.url).href;
    await obraz.decode();
    return probkujMozg(obraz);
  } catch {
    return null;
  }
})();

// Jasne piksele na małym płótnie. Cienkie linie po zmniejszeniu są półprzezroczyste,
// więc o jasności decyduje iloczyn krycia i jasności koloru, a nie samo krycie.
function probkujMozg(obraz) {
  const c = document.createElement("canvas");
  c.width = c.height = BOK_PROBKI;
  // Płótno w pamięci procesora: jeden odczyt pikseli bez kopiowania z karty graficznej
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(obraz, 0, 0, BOK_PROBKI, BOK_PROBKI);
  const dane = g.getImageData(0, 0, BOK_PROBKI, BOK_PROBKI).data;
  const jasne = [];
  for (let i = 0; i < dane.length; i += 4) {
    if ((dane[i + 3] / 255) * (Math.max(dane[i], dane[i + 1], dane[i + 2]) / 255) > 0.45) jasne.push(i / 4);
  }
  return { obraz, jasne };
}

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

// Tekst elementu bez części ukrytych dla czytników (np. „>”); twarde spacje zostają
function tekstWidoczny(el) {
  if (!el) return "";
  const kopia = el.cloneNode(true);
  kopia.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove());
  return kopia.textContent.replace(/[ \t\r\n]+/g, " ").trim();
}

function wczytajStyl() {
  const adres = new URL("../css/siec.css", import.meta.url).href;
  if ([...document.styleSheets].some((a) => a.href === adres)) return Promise.resolve();
  return new Promise((gotowe) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = adres;
    link.addEventListener("load", gotowe, { once: true });
    link.addEventListener("error", gotowe, { once: true });
    document.head.append(link);
  });
}

/* ---------- Treść węzłów: z sekcji strony ---------- */

function trescSekcji(id) {
  const s = document.getElementById(id);
  if (!s) return null;
  const etykieta = tekstWidoczny(s.querySelector(".etykieta"));
  const tytul = tekstWidoczny(s.querySelector(id === "hero" ? "h1" : "h2"));
  const lead = tekstWidoczny(s.querySelector(".sekcja__lead, .hero__lead"));
  const dodatki = [];

  if (id === "misja") {
    const lista = utworz("ul", "siec__lista");
    lista.setAttribute("role", "list");
    for (const filar of s.querySelectorAll(".filar")) {
      const li = utworz("li");
      li.append(utworz("strong", null, tekstWidoczny(filar.querySelector("h3"))), " ", tekstWidoczny(filar.querySelector("p:not(.filar__numer)")));
      lista.append(li);
    }
    dodatki.push(lista);
  }

  if (id === "uniwersytet") {
    const watki = utworz("dl", "siec__watki");
    for (const li of s.querySelectorAll(".zajecia__lista li")) {
      const d = utworz("div");
      d.append(utworz("dt", null, tekstWidoczny(li.querySelector(".zajecia__nazwa"))), utworz("dd", null, tekstWidoczny(li.querySelector(".zajecia__opis"))));
      watki.append(d);
    }
    if (watki.childElementCount) dodatki.push(utworz("p", "siec__mala", tekstWidoczny(s.querySelector(".zajecia__naglowek"))), watki);
    const liczby = [...s.querySelectorAll(".liczba")];
    if (liczby.length) {
      const pasek = utworz("ul", "siec__odczyt");
      pasek.setAttribute("role", "list");
      for (const l of liczby) {
        const li = utworz("li");
        li.append(utworz("span", "siec__odczyt-wartosc", tekstWidoczny(l.querySelector(".liczba__wartosc"))), utworz("span", "siec__odczyt-opis", tekstWidoczny(l.querySelector(".liczba__opis"))));
        pasek.append(li);
      }
      dodatki.push(pasek, utworz("p", "siec__przypis", tekstWidoczny(s.querySelector(".liczby__podpis"))));
    }
  }

  if (id === "oferta") {
    const lista = utworz("ul", "siec__lista siec__lista--numery");
    lista.setAttribute("role", "list");
    for (const o of s.querySelectorAll(".obszar")) {
      const li = utworz("li");
      li.append(utworz("span", "siec__numer", tekstWidoczny(o.querySelector(".obszar__numer"))), utworz("strong", null, tekstWidoczny(o.querySelector("h3"))));
      lista.append(li);
    }
    dodatki.push(lista);
  }

  if (id === "gdzie-bylismy") {
    const miasta = [...s.querySelectorAll(".miasto")].map(tekstWidoczny).filter(Boolean);
    if (miasta.length) dodatki.push(utworz("p", "siec__mala", "miasta"), utworz("p", "siec__miasta", miasta.join(" · ")));
    const grupy = utworz("dl", "siec__watki siec__watki--grupy");
    for (const g of s.querySelectorAll(".instytucje__grupa")) {
      const d = utworz("div");
      d.append(utworz("dt", null, tekstWidoczny(g.querySelector(".instytucje__nazwa"))), utworz("dd", null, [...g.querySelectorAll("li")].map(tekstWidoczny).join(", ")));
      grupy.append(d);
    }
    if (grupy.childElementCount) dodatki.push(utworz("p", "siec__mala", tekstWidoczny(s.querySelector(".gdzie__instytucje h3")) || "z kim pracowaliśmy"), grupy);
  }

  if (id === "zespol") {
    const osoba = s.querySelector(".osoba");
    if (osoba) {
      const karta = utworz("div", "siec__osoba");
      karta.append(utworz("p", "siec__imie", tekstWidoczny(osoba.querySelector(".osoba__imie"))), utworz("p", "siec__rola", tekstWidoczny(osoba.querySelector(".osoba__rola"))));
      const bio = osoba.querySelector(".osoba__opis > p:not([class])");
      if (bio) karta.append(utworz("p", null, tekstWidoczny(bio)));
      dodatki.push(karta);
    }
  }

  if (id === "kontakt") {
    const mail = s.querySelector(".kontakt__mail");
    if (mail) {
      const akcje = utworz("div", "siec__akcje");
      const link = utworz("a", "przycisk przycisk--glowny", tekstWidoczny(mail));
      link.href = mail.getAttribute("href");
      akcje.append(link);
      dodatki.push(akcje);
    }
    const telefon = tekstWidoczny(s.querySelector(".kontakt__telefon"));
    if (telefon) dodatki.push(utworz("p", "siec__telefon", telefon));
    const uwaga = tekstWidoczny(s.querySelector(".sekcja__uwaga"));
    if (uwaga) dodatki.push(utworz("p", "siec__przypis", uwaga));
  }

  return { etykieta, tytul, lead, dodatki };
}

/* ---------- Scena ---------- */

function zbudujScene({ kafle, galeria }) {
  const los = losowanie(ZIARNO);
  const etykietyMenu = new Map([...document.querySelectorAll("#menu a[href^='#']")].map((a) => [a.getAttribute("href").slice(1), tekstWidoczny(a)]));

  // Węzły główne z treścią z sekcji (sekcja, której nie ma na stronie, po prostu nie trafia do sieci)
  const wezly = [];
  for (const g of GLOWNE) {
    const tresc = trescSekcji(g.sekcja);
    if (!tresc) continue;
    const numer = (tresc.etykieta.match(/^\d+/) || ["00"])[0];
    const nazwa = g.id === "rdzen" ? "Lucid Academy" : etykietyMenu.get(g.sekcja) || tresc.tytul;
    wezly.push({ ...g, numer, nazwa, tresc, glowny: true });
  }
  const mapa = new Map(wezly.map((w) => [w.id, w]));
  const krawedzie = POLACZENIA.filter(([a, b]) => mapa.has(a) && mapa.has(b)).map(([a, b]) => ({ a: mapa.get(a), b: mapa.get(b) }));

  // Projekty: gromada wokół węzła „Co budujemy”
  const coRobimy = mapa.get("co-robimy");
  if (coRobimy && kafle?.length) {
    const wybrane = [
      ...kafle.filter((k) => k.status === "otwarte").slice(0, PROJEKTY_OTWARTE),
      ...kafle.filter((k) => k.status === "na-zyczenie").slice(0, PROJEKTY_NA_ZYCZENIE),
    ];
    let poprzedni = null;
    wybrane.forEach((kafel, i) => {
      const kat = (i / wybrane.length) * Math.PI * 2 + 0.35;
      const w = {
        id: `projekt-${i + 1}`,
        numer: `${coRobimy.numer}.${i + 1}`,
        nazwa: kafel.nazwa,
        pos: dodaj(coRobimy.pos, [Math.cos(kat) * 165, Math.sin(kat) * 120, Math.sin(kat + 1.1) * 165]),
        kolor: kafel.status === "otwarte" ? "cyjan" : "fiolet",
        promien: 9,
        projekt: true,
        rodzic: coRobimy,
        kafel,
      };
      wezly.push(w);
      mapa.set(w.id, w);
      krawedzie.push({ a: coRobimy, b: w });
      if (poprzedni) krawedzie.push({ a: poprzedni, b: w });
      poprzedni = w;
    });
  }

  // Kolejność przy strzałkach: sekcje po kolei, projekty zaraz po „Co budujemy”
  const kolejnosc = [];
  for (const w of wezly) if (w.glowny) {
    kolejnosc.push(w);
    if (w.id === "co-robimy") kolejnosc.push(...wezly.filter((p) => p.projekt));
  }
  kolejnosc.forEach((w, i) => { w.indeks = i; });

  // Sąsiedzi, dendryty i krzywe połączeń (punkt kontrolny odsunięty w bok)
  for (const w of wezly) {
    w.sasiedzi = [];
    const ile = w.projekt ? 4 : 7;
    w.dendryty = Array.from({ length: ile }, () => {
      const kier = normuj([los() * 2 - 1, los() * 2 - 1, los() * 2 - 1]);
      return dodaj(w.pos, skaluj(kier, w.promien * (2.2 + los() * 3.2)));
    });
  }
  for (const k of krawedzie) {
    k.a.sasiedzi.push(k.b);
    k.b.sasiedzi.push(k.a);
    const os = odejmij(k.b.pos, k.a.pos);
    const bok = normuj(wektorowy(os, [0, 1, 0]));
    const wygiecie = (los() * 2 - 1) * 70 + Math.sign(los() - 0.5) * 30;
    k.c = dodaj(dodaj(miesz(k.a.pos, k.b.pos, 0.5), skaluj(bok, wygiecie)), [0, (los() * 2 - 1) * 50, 0]);
    k.probki = Array.from({ length: 19 }, (_, i) => punktKrzywej(k, i / 18));
  }

  /* ----- Neurony tła i synapsy (tylko ozdoba) ----- */
  const male = window.matchMedia("(max-width: 719.98px)").matches;
  const ileTla = male ? 220 : 460;
  const tlo = [];
  while (tlo.length < ileTla) {
    const p = [(los() * 2 - 1) * 1300, (los() * 2 - 1) * 800, (los() * 2 - 1) * 1300];
    if ((p[0] / 1300) ** 2 + (p[1] / 800) ** 2 + (p[2] / 1300) ** 2 > 1) continue;
    if (wezly.some((w) => Math.hypot(p[0] - w.pos[0], p[1] - w.pos[1], p[2] - w.pos[2]) < 70)) continue;
    tlo.push({ pos: p, kolor: los() < 0.72 ? KOLOR.fiolet : KOLOR.cyjan, faza: los() * Math.PI * 2, poprzedni: null });
  }
  // Każdy neuron łączy się z dwoma najbliższymi dalszymi na liście (do 210 jednostek).
  // Szukamy ich jednym przebiegiem po kwadratach odległości, bez tablicy i sortowania
  // dla każdego neuronu: wynik ten sam, a otwarcie trybu nie stoi na budowie sceny.
  const synapsy = [];
  tlo.forEach((n, i) => {
    let j1 = -1, d1 = 210 * 210, j2 = -1, d2 = 210 * 210;
    for (let j = i + 1; j < tlo.length; j++) {
      const m = tlo[j].pos;
      const dx = n.pos[0] - m[0], dy = n.pos[1] - m[1], dz = n.pos[2] - m[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < d1) { j2 = j1; d2 = d1; j1 = j; d1 = d; } else if (d < d2) { j2 = j; d2 = d; }
    }
    if (j1 >= 0) synapsy.push([n, tlo[j1]]);
    if (j2 >= 0) synapsy.push([n, tlo[j2]]);
  });

  // Każdy neuron tła dostaje jeden jasny piksel mózgu, bez powtórzeń, tym samym ziarnem co scena.
  // Zwłoka startu rośnie z odległością od zbiegu: mózg rozpada się od pnia ku krawędziom.
  function przypiszMozg(mozg) {
    if (tlo[0]?.mozg) return true;
    if (!mozg || mozg.jasne.length < tlo.length) return false;
    const losMozgu = losowanie(ZIARNO);
    const pula = mozg.jasne.slice();
    for (const n of tlo) {
      const i = Math.floor(losMozgu() * pula.length);
      const piksel = pula[i];
      pula[i] = pula[pula.length - 1];
      pula.pop();
      const u = ((piksel % BOK_PROBKI) + 0.5) / BOK_PROBKI, v = (Math.floor(piksel / BOK_PROBKI) + 0.5) / BOK_PROBKI;
      n.mozg = [u, v];
      n.zwloka = Math.hypot(u - MOZG.zbiegX, v - MOZG.zbiegY) * 700 + losMozgu() * 160;
    }
    return true;
  }

  /* ----- DOM: okno, płótno, HUD, przyciski węzłów, panel ----- */
  const okno = utworz("dialog", "siec");
  okno.setAttribute("aria-label", "Tryb sieci: nawigacja po węzłach strony");
  const plotno = utworz("canvas", "siec__plotno");
  plotno.setAttribute("aria-hidden", "true");
  const warstwaWezlow = utworz("div", "siec__wezly");

  const hud = utworz("div", "siec__hud");
  const znak = utworz("p", "siec__znak");
  const marka = utworz("span", "siec__marka");
  marka.append(" lucid academy ", utworz("span", "siec__ukosnik", "//"));
  znak.append(znakZachety(), marka, " sieć ", utworz("span", "siec__pilot", "pilot v3"));
  const licznik = utworz("p", "siec__licznik");
  licznik.setAttribute("aria-hidden", "true");
  // Ruch, który startuje sam (dryf kamery, impulsy), da się wstrzymać; przeloty po kliknięciu zostają
  const pauza = utworz("button", "siec__pauza");
  pauza.type = "button";
  pauza.setAttribute("aria-pressed", "false");
  const ikonaPauzy = utworz("span", "siec__pauza-ikona");
  ikonaPauzy.setAttribute("aria-hidden", "true");
  pauza.append(ikonaPauzy, utworz("span", "siec__pauza-tekst", "Wstrzymaj ruch"));
  const wyjscie = utworz("button", "siec__wyjscie");
  wyjscie.type = "button";
  wyjscie.append("Widok klasyczny ", utworz("kbd", null, "Esc"));
  hud.append(znak, licznik, pauza, wyjscie);

  const panel = utworz("section", "siec__panel");
  panel.setAttribute("aria-labelledby", "siec-tytul");
  const odczyt = utworz("p", "siec__wspolrzedne");
  odczyt.setAttribute("aria-hidden", "true");
  const podpowiedz = utworz("p", "siec__podpowiedz", "Strzałki: kolejny węzeł · przeciągnij: obrót · Esc: widok klasyczny");
  podpowiedz.setAttribute("aria-hidden", "true");
  const komunikat = utworz("p", "sr-only");
  komunikat.setAttribute("aria-live", "polite");
  const skan = utworz("div", "siec__skan");
  skan.setAttribute("aria-hidden", "true");

  okno.append(plotno, warstwaWezlow, skan, hud, panel, odczyt, podpowiedz, komunikat);
  document.body.append(okno);

  for (const w of kolejnosc) {
    const b = utworz("button", `siec__wezel${w.projekt ? " siec__wezel--projekt" : ""}`);
    b.type = "button";
    b.dataset.id = w.id;
    const punkt = utworz("span", "siec__wezel-punkt");
    punkt.setAttribute("aria-hidden", "true");
    const etykieta = utworz("span", "siec__wezel-etykieta");
    etykieta.append(utworz("span", "sr-only", "Węzeł "), utworz("span", "siec__wezel-nr", w.numer), utworz("span", "siec__wezel-nazwa", ` ${w.nazwa}`));
    b.append(punkt, etykieta);
    b.addEventListener("click", () => idzDo(w, { fokus: false }));
    warstwaWezlow.append(b);
    w.przycisk = b;
  }

  /* ----- Panel z treścią węzła ----- */
  function zbudujPanel(w) {
    const czesci = [];
    const etykieta = utworz("p", "siec__etykieta");
    const tytul = utworz("h2", "siec__tytul");
    tytul.id = "siec-tytul";
    tytul.tabIndex = -1;

    if (w.projekt) {
      const k = w.kafel;
      const figura = utworz("figure", `siec__miniatura${k.kadr === "pionowy" ? " siec__miniatura--pionowa" : ""}`);
      const img = utworz("img");
      img.src = k.obraz;
      img.alt = k.alt;
      img.decoding = "async";
      if (k.fokus) img.style.objectPosition = k.fokus;
      figura.append(img);
      if (k.atrybucja) figura.append(utworz("figcaption", null, k.atrybucja));
      etykieta.append(znakZachety(), ` ${w.numer} · ${k.typ}`);
      tytul.textContent = k.nazwa;
      czesci.push(figura, etykieta, tytul, utworz("p", "siec__lead", k.zdanie));
      const otwarte = k.status === "otwarte";
      czesci.push(utworz("p", `siec__status siec__status--${k.status}`, otwarte ? "Otwarte demo" : "Demo na życzenie"));
      const akcje = utworz("div", "siec__akcje");
      if (otwarte) {
        for (const p of k.przyciski || []) {
          const a = utworz("a", "przycisk przycisk--glowny przycisk--zewn", p.etykieta === "Otwórz" ? "Otwórz demo" : p.etykieta);
          a.href = p.adres;
          a.target = "_blank";
          a.rel = "noopener";
          a.append(utworz("span", "sr-only", ` — ${k.nazwa} (otwiera się w nowej karcie)`));
          akcje.append(a);
        }
      } else {
        const doKontaktu = utworz("button", "przycisk przycisk--glowny", "Napisz do nas");
        doKontaktu.type = "button";
        doKontaktu.addEventListener("click", () => idzDo(mapa.get("kontakt"), { fokus: true }));
        akcje.append(doKontaktu);
      }
      if (k.galeria?.length && galeria) {
        const ile = k.galeria.length;
        const zrzuty = utworz("button", "przycisk przycisk--obrys", `Zrzuty ekranu (${ile})`);
        zrzuty.type = "button";
        zrzuty.setAttribute("aria-haspopup", "dialog");
        zrzuty.addEventListener("click", () => galeria(k, zrzuty));
        akcje.append(zrzuty);
      }
      czesci.push(akcje);
    } else {
      etykieta.append(znakZachety(), ` ${w.tresc.etykieta}`);
      tytul.textContent = w.tresc.tytul;
      czesci.push(etykieta, tytul);
      if (w.tresc.lead) czesci.push(utworz("p", "siec__lead", w.tresc.lead));
      czesci.push(...w.tresc.dodatki.map((d) => d.cloneNode(true)));
    }

    // Połączenia: te same przejścia co w przestrzeni, tylko jako lista
    const polaczenia = utworz("nav", "siec__polaczenia");
    polaczenia.setAttribute("aria-label", "Połączenia tego węzła");
    polaczenia.append(utworz("p", "siec__mala", "połączenia"));
    const lista = utworz("ul");
    lista.setAttribute("role", "list");
    for (const s of [...w.sasiedzi].sort((x, y) => x.indeks - y.indeks)) {
      const li = utworz("li");
      const b = utworz("button", "siec__polaczenie");
      b.type = "button";
      b.append(utworz("span", "siec__wezel-nr", s.numer), ` ${s.nazwa}`);
      b.addEventListener("click", () => idzDo(s, { fokus: true }));
      li.append(b);
      lista.append(li);
    }
    polaczenia.append(lista);
    czesci.push(polaczenia);

    // Przejście do tej samej treści w widoku klasycznym
    const sekcja = w.projekt ? "co-robimy" : w.sekcja;
    const klasyczny = utworz("a", "link-cichy siec__klasyczny", w.projekt ? "Wszystkie projekty w widoku klasycznym" : "Ta sekcja w widoku klasycznym");
    klasyczny.href = sekcja === "hero" ? "#" : `#${sekcja}`;
    klasyczny.addEventListener("click", (z) => {
      z.preventDefault();
      zamknij(sekcja);
    });
    czesci.push(klasyczny);

    panel.replaceChildren(...czesci);
    panel.scrollTop = 0;
    if (!bezRuchu()) {
      panel.classList.remove("siec__panel--wejscie");
      void panel.offsetWidth;
      panel.classList.add("siec__panel--wejscie");
    }
    return tytul;
  }

  /* ----- Kamera ----- */
  const kamera = { poz: [0, 220, 1900], cel: [0, 0, 0], fov: 58, przelot: null };
  const uzytkownik = { yaw: 0, pitch: 0, celYaw: 0, celPitch: 0 };
  const wskaznik = { x: 0, y: 0, cx: 0, cy: 0 };
  let biezacy = null;
  let wystrzal = null;
  const impulsy = [];
  let nastepnyImpuls = 0;
  let wejscie = null;

  function ujecie(w) {
    if (w.id === "rdzen") return [[40, 70, 600], [0, 0, 0]];
    let kier;
    if (w.projekt) {
      const zGromady = normuj(odejmij(w.pos, w.rodzic.pos));
      kier = normuj(dodaj(skaluj(normuj([zGromady[0], 0, zGromady[2]]), 0.8), skaluj(normuj([w.rodzic.pos[0], 0, w.rodzic.pos[2]]), 0.9)));
    } else {
      kier = normuj(dodaj(normuj([w.pos[0], 0, w.pos[2]]), [0.18, 0, 0.32]));
    }
    const odl = w.projekt ? 270 : 430;
    return [dodaj(w.pos, dodaj(skaluj(kier, odl), [0, w.projekt ? 50 : 90, 0])), w.pos];
  }

  function krawedzMiedzy(a, b) {
    return krawedzie.find((k) => (k.a === a && k.b === b) || (k.a === b && k.b === a));
  }

  function dodajImpuls(k, odA, kolor = KOLOR.cyjan, predkosc = 0.0011, przejscie = false) {
    if (impulsy.length > 40) impulsy.shift();
    impulsy.push({ k, odA, t: 0, predkosc, kolor, przejscie });
  }

  function idzDo(w, { fokus = false, natychmiast = false, czas = null, opoznienie = 0 } = {}) {
    if (!w) return;
    // Wybór węzła w trakcie wejścia kończy sekwencję: dalej prowadzi użytkownik
    if (biezacy) zakonczWejscie();
    if (w === biezacy && !natychmiast) {
      if (fokus) panel.querySelector("h2")?.focus({ preventScroll: true });
      return;
    }
    const poprzedni = biezacy;
    biezacy = w;
    const [poz1, cel1] = ujecie(w);
    uzytkownik.celYaw = uzytkownik.celPitch = 0;
    if (natychmiast || bezRuchu()) {
      kamera.poz = poz1;
      kamera.cel = cel1;
      kamera.przelot = null;
    } else {
      const dystans = Math.hypot(...odejmij(poz1, kamera.poz));
      kamera.przelot = {
        poz0: kamera.poz, cel0: kamera.cel, poz1, cel1,
        start: performance.now() + opoznienie,
        czas: czas || ogranicz(700 + dystans * 0.9, 900, 1600),
        bok: normuj(wektorowy(normuj(odejmij(poz1, kamera.poz)), [0, 1, 0])),
      };
      // Impuls po połączeniu, którym „przechodzimy” do nowego węzła
      if (poprzedni && poprzedni !== w) {
        const k = krawedzMiedzy(poprzedni, w);
        if (k) dodajImpuls(k, k.a === poprzedni, KOLOR.biel, 1 / kamera.przelot.czas, true);
      }
    }

    for (const b of warstwaWezlow.children) {
      if (b.dataset.id === w.id) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    }
    // Projekty widać tylko w gromadzie „Co budujemy”
    const wGromadzie = w.id === "co-robimy" || w.projekt;
    for (const p of wezly) if (p.projekt) p.przycisk.hidden = !wGromadzie;

    const tytul = zbudujPanel(w);
    licznik.textContent = `węzeł ${String(w.indeks + 1).padStart(2, "0")} / ${String(kolejnosc.length).padStart(2, "0")}`;
    const liczba = (v) => String(Math.round(v)).replace("-", "−");
    odczyt.textContent = `x ${liczba(w.pos[0])} · y ${liczba(w.pos[1])} · z ${liczba(w.pos[2])} · połączenia: ${w.sasiedzi.length}`;
    komunikat.textContent = `Węzeł ${w.indeks + 1} z ${kolejnosc.length}: ${w.projekt ? w.nazwa : w.tresc.tytul}`;
    if (fokus) tytul.focus({ preventScroll: true });
    zmierzUklad();
    if (!bezRuchu()) wystrzal = { w, start: kamera.przelot ? kamera.przelot.start + kamera.przelot.czas * 0.85 : performance.now(), sasiedziGotowi: false };
    rysujNaZadanie();
  }

  /* ----- Układ: wolny obszar sceny obok panelu ----- */
  const uklad = { W: 0, H: 0, dpr: 1, wolny: { x0: 0, y0: 0, x1: 0, y1: 0 }, cx: 0, cy: 0, celCx: 0, celCy: 0, ogniskowa: 1 };

  function zmierzUklad() {
    const W = okno.clientWidth, H = okno.clientHeight;
    // Na wąskich ekranach płótno w mniejszej gęstości: poświaty i tak są miękkie, a telefon oszczędza GPU
    const dpr = Math.min(W < 720 ? 1.5 : 2, window.devicePixelRatio || 1);
    if (W !== uklad.W || H !== uklad.H || dpr !== uklad.dpr) {
      uklad.W = W; uklad.H = H; uklad.dpr = dpr;
      plotno.width = Math.round(W * dpr);
      plotno.height = Math.round(H * dpr);
      tloGradient = null;
    }
    const p = panel.getBoundingClientRect();
    const h = hud.getBoundingClientRect();
    const boczny = p.top < H * 0.5 && p.left > W * 0.3;
    const pasDolny = odczyt.offsetParent ? odczyt.getBoundingClientRect().top - 10 : H;
    uklad.wolny = boczny
      ? { x0: 0, y0: h.bottom, x1: p.left - 16, y1: pasDolny }
      : { x0: 0, y0: h.bottom, x1: W, y1: Math.min(p.top, pasDolny) };
    uklad.celCx = (uklad.wolny.x0 + uklad.wolny.x1) / 2;
    uklad.celCy = (uklad.wolny.y0 + uklad.wolny.y1) / 2 + (boczny ? 10 : 0);
    if (!uklad.cx) { uklad.cx = uklad.celCx; uklad.cy = uklad.celCy; }
  }

  /* ----- Rzut perspektywiczny ----- */
  let P = [0, 0, 0], F = [0, 0, 1], R = [1, 0, 0], U = [0, 1, 0];

  function ustawKamere(poz, cel, fov) {
    P = poz;
    F = normuj(odejmij(cel, poz));
    R = normuj(wektorowy(F, [0, 1, 0]));
    U = wektorowy(R, F);
    uklad.ogniskowa = (uklad.H / 2) / Math.tan((fov * Math.PI) / 360);
  }

  function rzut(p, wynik = {}) {
    const dx = p[0] - P[0], dy = p[1] - P[1], dz = p[2] - P[2];
    const z = dx * F[0] + dy * F[1] + dz * F[2];
    wynik.z = z;
    wynik.kx = dx * R[0] + dy * R[1] + dz * R[2];
    wynik.ky = dx * U[0] + dy * U[1] + dz * U[2];
    if (z <= 8) { wynik.przed = false; return wynik; }
    const s = uklad.ogniskowa / z;
    wynik.x = uklad.cx + wynik.kx * s;
    wynik.y = uklad.cy - wynik.ky * s;
    wynik.s = s;
    wynik.przed = true;
    return wynik;
  }

  const mgla = (z) => ogranicz(1.3 - z / 2100, 0.05, 1);

  function punktKrzywej(k, t) {
    const u = 1 - t;
    return [
      u * u * k.a.pos[0] + 2 * u * t * k.c[0] + t * t * k.b.pos[0],
      u * u * k.a.pos[1] + 2 * u * t * k.c[1] + t * t * k.b.pos[1],
      u * u * k.a.pos[2] + 2 * u * t * k.c[2] + t * t * k.b.pos[2],
    ];
  }

  /* ----- Rysowanie ----- */
  const ctx = plotno.getContext("2d");
  const duszki = new Map();
  function duszek(kolor) {
    const klucz = kolor.join(",");
    if (duszki.has(klucz)) return duszki.get(klucz);
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255, 255, 255, 1)");
    gr.addColorStop(0.18, rgba(kolor, 0.95));
    gr.addColorStop(0.45, rgba(kolor, 0.32));
    gr.addColorStop(1, rgba(kolor, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    duszki.set(klucz, c);
    return c;
  }

  let tloGradient = null;
  function tloSceny() {
    if (tloGradient) return tloGradient;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(uklad.W / 2));
    c.height = Math.max(1, Math.round(uklad.H / 2));
    const g = c.getContext("2d");
    const w = c.width, h = c.height;
    g.fillStyle = "#0A0618";
    g.fillRect(0, 0, w, h);
    for (const [x, y, r, kolor, a] of [[0, 0, 0.75, KOLOR.fiolet, 0.34], [w, h, 0.65, KOLOR.cyjan, 0.16], [w * 0.88, 0, 0.45, KOLOR.magenta, 0.10]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * r);
      gr.addColorStop(0, rgba(kolor, a));
      gr.addColorStop(1, rgba(kolor, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
    tloGradient = c;
    return c;
  }

  const tmp = {};
  let wstrzymany = false, wskazanyWezel = false, fokusNaWezle = false;
  let czasTla = 0, czasDryfu = 0, ostatniaKlatka = 0;

  function klatka(teraz) {
    const { W, H, dpr } = uklad;
    if (wejscie && teraz - wejscie.start >= WEJSCIE.koniec) zakonczWejscie();
    const wej = wejscie ? teraz - wejscie.start : 0;
    // Węzły i połączenia wyłaniają się, gdy neurony tła są już w drodze
    const mSieci = wejscie ? wygladz(faza(wej, 1300, 2500)) : 1;
    // Kamera: przelot, dryf i obrót użytkownika
    let poz = kamera.poz, cel = kamera.cel, fov = kamera.fov, wPrzelocie = 0;
    if (kamera.przelot) {
      const z = kamera.przelot;
      const t = ogranicz((teraz - z.start) / z.czas, 0, 1);
      const e = wygladz(t);
      wPrzelocie = Math.sin(Math.PI * e);
      poz = dodaj(miesz(z.poz0, z.poz1, e), skaluj(z.bok, wPrzelocie * 120));
      cel = miesz(z.cel0, z.cel1, wygladz(Math.min(1, t * 1.25)));
      fov = kamera.fov + wPrzelocie * 16;
      if (t >= 1) { kamera.poz = z.poz1; kamera.cel = z.cel1; kamera.przelot = null; }
    }
    const ruch = !bezRuchu();
    const tloZywe = ruch && !wstrzymany;
    const celStoi = wskazanyWezel || fokusNaWezle;
    const dt = ostatniaKlatka ? Math.min(64, teraz - ostatniaKlatka) : 16;
    ostatniaKlatka = teraz;
    if (tloZywe) czasTla += dt;
    if (tloZywe && !celStoi) {
      czasDryfu += dt;
      wskaznik.cx += (wskaznik.x - wskaznik.cx) * 0.05;
      wskaznik.cy += (wskaznik.y - wskaznik.cy) * 0.05;
    }
    uzytkownik.yaw += (uzytkownik.celYaw - uzytkownik.yaw) * (ruch ? 0.12 : 1);
    uzytkownik.pitch += (uzytkownik.celPitch - uzytkownik.pitch) * (ruch ? 0.12 : 1);
    const dryf = ruch && !wstrzymany;
    const yaw = uzytkownik.yaw + (dryf ? 0.07 * Math.sin(czasDryfu / 7000) + wskaznik.cx * 0.025 : 0);
    const pitch = uzytkownik.pitch + (dryf ? 0.035 * Math.sin(czasDryfu / 9100) + wskaznik.cy * 0.015 : 0);
    if (yaw || pitch) {
      let wzgl = odejmij(poz, cel);
      wzgl = obroc(wzgl, [0, 1, 0], yaw);
      const bok = normuj(wektorowy(wzgl, [0, 1, 0]));
      wzgl = obroc(wzgl, bok, pitch);
      poz = dodaj(cel, wzgl);
    }
    uklad.cx += (uklad.celCx - uklad.cx) * (ruch ? 0.08 : 1);
    uklad.cy += (uklad.celCy - uklad.cy) * (ruch ? 0.08 : 1);
    ustawKamere(poz, cel, fov);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(tloSceny(), 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // Wejście: najpierw słaby obrys mózgu, który gaśnie, gdy jego jasne piksele stają się neuronami
    const ramka = wejscie ? ramkaMozgu() : null;
    if (ramka) {
      const obrys = 0.3 * faza(wej, 0, 450) * (1 - faza(wej, 650, 1050));
      if (obrys > 0) {
        ctx.globalAlpha = obrys;
        ctx.drawImage(wejscie.mozg.obraz, ramka.x, ramka.y, ramka.bok, ramka.bok);
        ctx.globalAlpha = 1;
      }
    }

    // Rzut neuronów tła raz na klatkę. W sekwencji wejścia pozycja rysowana leci
    // z piksela mózgu na rzut pozycji 3D, który zmienia się razem z wlatującą kamerą.
    for (const n of tlo) {
      const p = (n.ekran = rzut(n.pos, n.ekran || {}));
      const d = n.rys || (n.rys = {});
      d.x = p.x; d.y = p.y; d.widac = p.przed; d.e = 1;
      if (ramka && n.mozg) {
        const e = wygladz(faza(wej, WEJSCIE.rozlot + n.zwloka, WEJSCIE.rozlot + n.zwloka + WEJSCIE.lot));
        const mx = ramka.x + n.mozg[0] * ramka.bok, my = ramka.y + n.mozg[1] * ramka.bok;
        let tx = p.x, ty = p.y;
        if (!p.przed) {
          // Neuron, który kończy za kamerą, wylatuje poza kadr w stronę, w którą uciekł
          const kat = p.kx || p.ky ? Math.atan2(-p.ky, p.kx) : n.faza;
          tx = uklad.cx + Math.cos(kat) * Math.max(W, H);
          ty = uklad.cy + Math.sin(kat) * Math.max(W, H);
        }
        d.x = mx + (tx - mx) * e; d.y = my + (ty - my) * e; d.widac = true; d.e = e;
      }
    }

    // Synapsy tła: cztery przedziały jasności, jedna ścieżka na przedział.
    // W sekwencji pojawiają się dopiero między neuronami, które prawie doleciały.
    const przedzialy = [[], [], [], []];
    for (const [a, b] of synapsy) {
      const pa = a.ekran, pb = b.ekran;
      if (!pa.przed || !pb.przed) continue;
      const dolecialy = Math.min(a.rys.e, b.rys.e);
      if (dolecialy < 0.5) continue;
      const m = mgla((pa.z + pb.z) / 2) * (dolecialy - 0.5) * 2;
      przedzialy[Math.min(3, Math.floor(m * 4))].push(a.rys.x, a.rys.y, b.rys.x, b.rys.y);
    }
    ctx.lineWidth = 0.8;
    przedzialy.forEach((linie, i) => {
      if (!linie.length) return;
      ctx.strokeStyle = rgba(KOLOR.fiolet, 0.05 + i * 0.045);
      ctx.beginPath();
      for (let j = 0; j < linie.length; j += 4) { ctx.moveTo(linie[j], linie[j + 1]); ctx.lineTo(linie[j + 2], linie[j + 3]); }
      ctx.stroke();
    });

    // Neurony tła; w przelocie zostawiają smugi
    for (const n of tlo) {
      const p = n.ekran, d = n.rys;
      if (!d.widac || d.x < -40 || d.x > W + 40 || d.y < -40 || d.y > H + 40) { n.poprzedni = null; continue; }
      const migotanie = tloZywe ? 0.62 + 0.38 * Math.sin(czasTla / 900 + n.faza) : 0.85;
      let a = p.przed ? mgla(p.z) * migotanie : 0;
      let r = p.przed ? ogranicz(2.6 * p.s, 0.7, 7) : 1.4;
      if (d.e < 1) {
        // Piksel mózgu: mały, równy punkt; w locie przechodzi w zwykły neuron tła
        a = 0.85 * faza(wej, 250, 700) * (1 - d.e) + a * d.e;
        r = 1.4 + (r - 1.4) * d.e;
      }
      if ((wPrzelocie > 0.05 || d.e < 1) && n.poprzedni && Math.hypot(d.x - n.poprzedni[0], d.y - n.poprzedni[1]) > 2) {
        ctx.strokeStyle = rgba(n.kolor, a * 0.55);
        ctx.lineWidth = Math.max(0.8, r * 0.7);
        ctx.beginPath();
        ctx.moveTo(n.poprzedni[0], n.poprzedni[1]);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }
      ctx.globalAlpha = a;
      ctx.drawImage(duszek(n.kolor), d.x - r * 2, d.y - r * 2, r * 4, r * 4);
      ctx.globalAlpha = 1;
      n.poprzedni = n.poprzedni || [0, 0];
      n.poprzedni[0] = d.x; n.poprzedni[1] = d.y;
    }

    // Połączenia między węzłami (krzywe z próbek)
    const aktywne = new Set(biezacy ? biezacy.sasiedzi : []);
    for (const k of krawedzie) {
      if (!widocznyWezel(k.a) || !widocznyWezel(k.b)) continue;
      const aktywna = k.a === biezacy || k.b === biezacy;
      let start = true, sumaZ = 0, n = 0;
      ctx.beginPath();
      for (const pr of k.probki) {
        const p = rzut(pr, tmp);
        if (!p.przed) { start = true; continue; }
        if (start) { ctx.moveTo(p.x, p.y); start = false; } else ctx.lineTo(p.x, p.y);
        sumaZ += p.z; n += 1;
      }
      if (!n) continue;
      const m = mgla(sumaZ / n) * mSieci;
      ctx.strokeStyle = aktywna ? rgba(KOLOR.cyjan, 0.62 * m) : rgba(KOLOR.fiolet, 0.3 * m);
      ctx.lineWidth = aktywna ? 1.8 : 1.1;
      ctx.stroke();
    }

    // Impulsy (potencjały czynnościowe) biegnące po połączeniach
    if (!tloZywe) {
      // Bez ruchu tła zostaje tylko impuls przejścia, o które poprosił użytkownik
      for (let i = impulsy.length - 1; i >= 0; i--) if (!impulsy[i].przejscie) impulsy.splice(i, 1);
    } else if (czasTla > nastepnyImpuls) {
      nastepnyImpuls = czasTla + 160 + Math.random() * 280;
      const kandydaci = krawedzie.filter((k) => widocznyWezel(k.a) && widocznyWezel(k.b));
      const zBiezacego = kandydaci.filter((k) => k.a === biezacy || k.b === biezacy);
      const pula = zBiezacego.length && Math.random() < 0.55 ? zBiezacego : kandydaci;
      if (pula.length) {
        const k = pula[Math.floor(Math.random() * pula.length)];
        dodajImpuls(k, k.a === biezacy ? true : k.b === biezacy ? false : Math.random() < 0.5, Math.random() < 0.12 ? KOLOR.magenta : KOLOR.cyjan, 0.00045 + Math.random() * 0.0005);
      }
    }
    for (let i = impulsy.length - 1; i >= 0; i--) {
      const im = impulsy[i];
      im.t += im.predkosc * dt;
      if (im.t >= 1) { impulsy.splice(i, 1); continue; }
      for (let s = 5; s >= 0; s--) {
        const t = im.t - s * 0.022;
        if (t < 0) continue;
        const p = rzut(punktKrzywej(im.k, im.odA ? t : 1 - t), tmp);
        if (!p.przed) continue;
        const r = ogranicz(5.5 * p.s, 2, 11) * (1 - s * 0.13);
        ctx.globalAlpha = mgla(p.z) * (1 - s * 0.16) * mSieci;
        ctx.drawImage(duszek(im.kolor), p.x - r * 2, p.y - r * 2, r * 4, r * 4);
      }
      ctx.globalAlpha = 1;
    }

    // Węzły: od najdalszego
    const doRysowania = [];
    for (const w of wezly) {
      if (!widocznyWezel(w)) { w.ekran = null; continue; }
      const p = rzut(w.pos, {});
      w.ekran = p;
      if (p.przed) doRysowania.push(w);
    }
    doRysowania.sort((x, y) => y.ekran.z - x.ekran.z);
    for (const w of doRysowania) {
      const p = w.ekran;
      const m = mgla(p.z) * mSieci;
      const kolor = KOLOR[w.kolor];
      const r = ogranicz(w.promien * p.s, 3, 70);
      const jasny = w === biezacy || aktywne.has(w);
      // dendryty
      ctx.strokeStyle = rgba(kolor, (jasny ? 0.5 : 0.28) * m);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of w.dendryty) {
        const q = rzut(d, tmp);
        if (!q.przed) continue;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      // poświata i jądro
      const puls = tloZywe ? 1 + 0.08 * Math.sin(czasTla / 420 + w.pos[0]) : 1;
      ctx.globalAlpha = m * (jasny ? 1 : 0.75);
      ctx.drawImage(duszek(kolor), p.x - r * 3.4 * puls, p.y - r * 3.4 * puls, r * 6.8 * puls, r * 6.8 * puls);
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(KOLOR.biel, 0.9 * m);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, r * 0.32), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(kolor, 0.85 * m);
      ctx.lineWidth = w === biezacy ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (ramka && wejscie.zeStopki) rysujPien(wej);

    // Celownik na bieżącym węźle
    ctx.globalCompositeOperation = "source-over";
    if (biezacy?.ekran?.przed && mSieci > 0) {
      const p = biezacy.ekran;
      const r = ogranicz(biezacy.promien * p.s, 8, 70);
      const d = Math.max(30, r * 2.1);
      const kat = tloZywe ? czasTla / 2600 : 0.4;
      ctx.strokeStyle = rgba(KOLOR.cyjan, 0.9 * mSieci);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const a = kat + (i * Math.PI) / 2;
        const ax = p.x + Math.cos(a) * d, ay = p.y + Math.sin(a) * d;
        const t1 = a + Math.PI * 0.75, t2 = a - Math.PI * 0.75;
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(t1) * 10, ay + Math.sin(t1) * 10);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax + Math.cos(t2) * 10, ay + Math.sin(t2) * 10);
        ctx.stroke();
      }
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = tloZywe ? -czasTla / 60 : 0;
      ctx.strokeStyle = rgba(KOLOR.fiolet, 0.75 * mSieci);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.55 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Wystrzał neuronu po dotarciu: pierścień i impulsy do wszystkich sąsiadów
    if (wystrzal && teraz >= wystrzal.start) {
      const t = (teraz - wystrzal.start) / 750;
      if (!wystrzal.sasiedziGotowi) {
        wystrzal.sasiedziGotowi = true;
        for (const s of wystrzal.w.sasiedzi) {
          const k = krawedzMiedzy(wystrzal.w, s);
          if (k && widocznyWezel(s)) dodajImpuls(k, k.a === wystrzal.w, KOLOR.cyjan, 0.0012, true);
        }
      }
      const p = wystrzal.w.ekran;
      if (t >= 1) wystrzal = null;
      else if (p?.przed) {
        const r0 = ogranicz(wystrzal.w.promien * p.s, 8, 70);
        ctx.strokeStyle = rgba(miesz(KOLOR.magenta, KOLOR.cyjan, t), 0.85 * (1 - t));
        ctx.lineWidth = 2 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r0 + t * 130, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Przyciski węzłów nad płótnem: w miejscu węzła albo przy krawędzi obszaru, gdy węzeł jest poza nim
    const miejsca = [];
    for (const w of kolejnosc) {
      const b = w.przycisk;
      if (b.hidden) continue;
      const p = w.ekran || rzut(w.pos, tmp);
      const marg = 30;
      const { x0, y0, x1, y1 } = uklad.wolny;
      let x = p.x, y = p.y, krawedz = !p.przed || x < x0 + marg || x > x1 - marg || y < y0 + marg || y > y1 - marg;
      let kat = 0;
      if (krawedz) {
        // Kierunek od środka obszaru (za kamerą: z rzutu na płaszczyznę ekranu)
        let dx = p.przed ? x - uklad.cx : p.kx, dy = p.przed ? y - uklad.cy : -p.ky;
        if (!dx && !dy) dx = 1;
        kat = Math.atan2(dy, dx);
        const sx = dx > 0 ? (x1 - marg - uklad.cx) / dx : dx < 0 ? (x0 + marg - uklad.cx) / dx : Infinity;
        const sy = dy > 0 ? (y1 - marg - uklad.cy) / dy : dy < 0 ? (y0 + marg - uklad.cy) / dy : Infinity;
        const sk = Math.min(sx, sy);
        x = uklad.cx + dx * sk;
        y = uklad.cy + dy * sk;
      }
      miejsca.push({ w, x, y, krawedz, kat, blisko: p.przed ? p.s : 0 });
    }
    ulozEtykiety(miejsca);
    for (const m of miejsca) {
      const b = m.w.przycisk;
      przelacz(b, "siec__wezel--krawedz", m.krawedz);
      przelacz(b, "siec__wezel--lewo", m.lewo);
      przelacz(b, "siec__wezel--krotka", m.tryb === "krotka");
      przelacz(b, "siec__wezel--cicho", m.tryb === "cicho");
      if (m.krawedz) b.style.setProperty("--kat", `${m.kat.toFixed(3)}rad`);
      b.style.transform = `translate3d(${(m.x - 22).toFixed(1)}px, ${(m.y - 22).toFixed(1)}px, 0)`;
    }
  }

  // Obraz mózgu w wolnym obszarze: zbieg ścieżek dokładnie na rdzeniu, cały obraz w kadrze
  function ramkaMozgu() {
    const { x0, y0, x1, y1 } = uklad.wolny;
    const { cx, cy } = uklad;
    const bok = 0.9 * Math.min((cy - y0) / MOZG.zbiegY, (y1 - cy) / (1 - MOZG.zbiegY), (cx - x0) / MOZG.zbiegX, (x1 - cx) / (1 - MOZG.zbiegX));
    return { bok, x: cx - MOZG.zbiegX * bok, y: cy - MOZG.zbiegY * bok };
  }

  // Wejście ze stopki: akson strony wchodzi od dołu kadru w pień mózgu, a impuls biegnie nim
  // do rdzenia (barwy jak akson na stronie: słaba linia, przewodzony fiolet, cyjanowe czoło)
  function rysujPien(wej) {
    const x = uklad.cx, yRdzen = uklad.cy, yDol = uklad.wolny.y1;
    const widac = faza(wej, 0, 400) * (1 - faza(wej, WEJSCIE.dotarcie, WEJSCIE.koniec));
    if (widac <= 0 || yDol <= yRdzen) return;
    const t = faza(wej, WEJSCIE.kamera, WEJSCIE.dotarcie);
    const yCzolo = yDol + (yRdzen - yDol) * Math.pow(t, 1.4);
    ctx.lineCap = "round";
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(KOLOR.fiolet, 0.26 * widac);
    ctx.beginPath();
    ctx.moveTo(x, yDol);
    ctx.lineTo(x, yRdzen);
    ctx.stroke();
    if (t <= 0) return;
    ctx.strokeStyle = rgba(KOLOR.fiolet, 0.62 * widac);
    ctx.beginPath();
    ctx.moveTo(x, yDol);
    ctx.lineTo(x, yCzolo);
    ctx.stroke();
    if (t >= 1) return;
    const ogon = ctx.createLinearGradient(x, yCzolo + 100, x, yCzolo);
    ogon.addColorStop(0, rgba(KOLOR.cyjan, 0));
    ogon.addColorStop(1, rgba(KOLOR.cyjan, 0.6 * widac));
    ctx.strokeStyle = ogon;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, Math.min(yDol, yCzolo + 100));
    ctx.lineTo(x, yCzolo);
    ctx.stroke();
    ctx.globalAlpha = widac;
    ctx.drawImage(duszek(KOLOR.cyjan), x - 14, yCzolo - 14, 28, 28);
    ctx.globalAlpha = 1;
  }

  function zakonczWejscie() {
    if (!wejscie) return;
    wejscie = null;
    okno.classList.remove("siec--wejscie");
    for (const n of tlo) n.poprzedni = null;
  }

  function przelacz(el, klasa, stan) {
    if (el.classList.contains(klasa) !== stan) el.classList.toggle(klasa, stan);
  }

  // Etykiety bez nakładania: pełna nazwa tam, gdzie jest miejsce, w ciasnych miejscach sam numer,
  // a gdy i on się nie mieści, tylko punkt. Pierwszeństwo: bieżący węzeł, jego sąsiedzi, potem bliższe.
  function ulozEtykiety(miejsca) {
    const { x0, y0, x1, y1 } = uklad.wolny;
    const waga = (m) => (m.w === biezacy ? 3 : biezacy?.sasiedzi.includes(m.w) ? 2 : 1) + (m.krawedz ? 0 : 0.5) + Math.min(0.4, m.blisko * 0.1);
    miejsca.sort((a, b) => waga(b) - waga(a));
    const zajete = [];
    const koliduje = (r) => r[0] < x0 + 4 || r[2] > x1 - 4 || r[1] < y0 + 2 || r[3] > y1 - 2
      || zajete.some((z) => r[0] < z[2] && r[2] > z[0] && r[1] < z[3] && r[3] > z[1]);
    for (const m of miejsca) {
      const rozmiar = m.w.etykieta;
      const punkt = [m.x - 18, m.y - 18, m.x + 18, m.y + 18];
      m.tryb = "cicho";
      m.lewo = false;
      if (rozmiar) {
        for (const tryb of m.w === biezacy ? ["pelna"] : ["pelna", "krotka"]) {
          const [szer, wys] = rozmiar[tryb];
          const prawa = [m.x + 28, m.y - wys / 2, m.x + 28 + szer, m.y + wys / 2];
          const lewa = [m.x - 28 - szer, m.y - wys / 2, m.x - 28, m.y + wys / 2];
          const wybor = !koliduje(prawa) ? [prawa, false] : !koliduje(lewa) ? [lewa, true] : null;
          if (wybor || m.w === biezacy) {
            const [r, lewo] = wybor || [prawa[2] > x1 ? lewa : prawa, prawa[2] > x1];
            m.tryb = tryb;
            m.lewo = lewo;
            zajete.push(r);
            break;
          }
        }
      }
      zajete.push(punkt);
    }
  }

  // Rozmiary etykiet w obu wersjach (pełna i sam numer); po otwarciu i po zmianie rozmiaru okna
  function zmierzEtykiety() {
    const przyciski = kolejnosc.map((w) => w.przycisk);
    const ukryte = przyciski.filter((b) => b.hidden);
    ukryte.forEach((b) => { b.hidden = false; });
    for (const b of przyciski) b.classList.remove("siec__wezel--krotka", "siec__wezel--cicho");
    const pelne = przyciski.map((b) => { const e = b.lastElementChild; return [e.offsetWidth, e.offsetHeight]; });
    for (const b of przyciski) b.classList.add("siec__wezel--krotka", "siec__wezel--pomiar");
    const krotkie = przyciski.map((b) => { const e = b.lastElementChild; return [e.offsetWidth, e.offsetHeight]; });
    for (const b of przyciski) b.classList.remove("siec__wezel--krotka", "siec__wezel--pomiar");
    kolejnosc.forEach((w, i) => { w.etykieta = { pelna: pelne[i], krotka: krotkie[i] }; });
    ukryte.forEach((b) => { b.hidden = true; });
  }

  function widocznyWezel(w) {
    return !w.projekt || !w.przycisk.hidden;
  }

  /* ----- Pętla ----- */
  let petla = 0, otwarte = false, zaplanowana = false;
  function trwaAnimacja() {
    return !!(wejscie || kamera.przelot || wystrzal || impulsy.length || ciagniecie
      || Math.abs(uzytkownik.yaw - uzytkownik.celYaw) > 1e-4 || Math.abs(uzytkownik.pitch - uzytkownik.celPitch) > 1e-4
      || Math.abs(uklad.cx - uklad.celCx) > 0.5 || Math.abs(uklad.cy - uklad.celCy) > 0.5);
  }
  function animuj(teraz) {
    petla = 0;
    if (!otwarte) return;
    klatka(teraz);
    if (!bezRuchu() && (!wstrzymany || trwaAnimacja())) petla = requestAnimationFrame(animuj);
    else ostatniaKlatka = 0;
  }
  function rysujNaZadanie() {
    if (!otwarte) return;
    if (!bezRuchu()) { if (!petla) petla = requestAnimationFrame(animuj); return; }
    if (zaplanowana) return;
    zaplanowana = true;
    requestAnimationFrame((t) => { zaplanowana = false; klatka(t); });
  }

  /* ----- Zdarzenia ----- */
  wyjscie.addEventListener("click", () => zamknij());
  pauza.addEventListener("click", () => {
    wstrzymany = !wstrzymany;
    pauza.setAttribute("aria-pressed", String(wstrzymany));
    // Wstrzymanie obejmuje też sekwencję wejścia: scena od razu staje gotowa
    if (wstrzymany) zakonczWejscie();
    rysujNaZadanie();
  });
  // Wskazany albo wybrany z klawiatury węzeł nie ucieka spod kursora
  warstwaWezlow.addEventListener("pointerover", (z) => { if (z.target.closest(".siec__wezel")) wskazanyWezel = true; });
  warstwaWezlow.addEventListener("pointerout", (z) => {
    if (z.target.closest(".siec__wezel") && !z.relatedTarget?.closest?.(".siec__wezel")) wskazanyWezel = false;
  });
  warstwaWezlow.addEventListener("focusin", (z) => { fokusNaWezle = z.target.matches(":focus-visible"); });
  warstwaWezlow.addEventListener("focusout", () => { fokusNaWezle = false; });
  okno.addEventListener("close", () => {
    otwarte = false;
    zakonczWejscie();
    cancelAnimationFrame(petla);
    petla = 0;
    document.documentElement.classList.remove("siec-otwarta");
    const adres = new URL(location.href);
    if (adres.searchParams.get("tryb") === "siec") {
      adres.searchParams.delete("tryb");
      history.replaceState(history.state, "", adres);
    }
    // Wyjście do sekcji: przewinięcie do niej i fokus na jej nagłówku; zwykłe wyjście: fokus wraca na przycisk
    const cel = sekcjaPoZamknieciu && document.getElementById(sekcjaPoZamknieciu);
    sekcjaPoZamknieciu = null;
    if (cel && cel.id !== "hero") {
      history.replaceState(history.state, "", `#${cel.id}`);
      const naglowek = cel.querySelector("h2");
      if (naglowek) { naglowek.tabIndex = -1; naglowek.focus({ preventScroll: true }); }
      cel.scrollIntoView();
    } else {
      if (cel) window.scrollTo({ top: 0 });
      wywolujacy?.focus({ preventScroll: true });
    }
  });
  okno.addEventListener("keydown", (z) => {
    if (z.altKey || z.ctrlKey || z.metaKey) return;
    const krok = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[z.key];
    if (krok && biezacy) {
      z.preventDefault();
      const nastepny = kolejnosc[(biezacy.indeks + krok + kolejnosc.length) % kolejnosc.length];
      idzDo(nastepny, { fokus: false });
      nastepny.przycisk.hidden = false;
      nastepny.przycisk.focus({ preventScroll: true });
    } else if (z.key === "Home") {
      z.preventDefault();
      idzDo(kolejnosc[0], { fokus: false });
      kolejnosc[0].przycisk.focus({ preventScroll: true });
    }
  });

  // Ruch wskaźnika: lekka paralaksa; przeciąganie po płótnie obraca widok
  okno.addEventListener("pointermove", (z) => {
    if (z.pointerType !== "mouse") return;
    wskaznik.x = (z.clientX / Math.max(1, uklad.W)) * 2 - 1;
    wskaznik.y = (z.clientY / Math.max(1, uklad.H)) * 2 - 1;
  });
  let ciagniecie = null;
  plotno.addEventListener("pointerdown", (z) => {
    ciagniecie = { x: z.clientX, y: z.clientY, yaw: uzytkownik.celYaw, pitch: uzytkownik.celPitch };
    plotno.setPointerCapture(z.pointerId);
  });
  plotno.addEventListener("pointermove", (z) => {
    if (!ciagniecie) return;
    uzytkownik.celYaw = ogranicz(ciagniecie.yaw - (z.clientX - ciagniecie.x) * 0.004, -0.9, 0.9);
    uzytkownik.celPitch = ogranicz(ciagniecie.pitch + (z.clientY - ciagniecie.y) * 0.003, -0.45, 0.45);
    rysujNaZadanie();
  });
  const koniecCiagniecia = () => { ciagniecie = null; };
  plotno.addEventListener("pointerup", koniecCiagniecia);
  plotno.addEventListener("pointercancel", koniecCiagniecia);

  window.addEventListener("resize", () => { if (otwarte) { zmierzUklad(); zmierzEtykiety(); rysujNaZadanie(); } }, { passive: true });
  ograniczonyRuch.addEventListener("change", () => { if (otwarte) { kamera.przelot = null; zakonczWejscie(); idzDo(biezacy, { natychmiast: true }); } });

  /* ----- Otwieranie i zamykanie ----- */
  let wywolujacy = null;

  function otworz(przycisk, { zeStopki = false, mozg = null } = {}) {
    wywolujacy = przycisk || null;
    otwarte = true;
    // Ruch wstrzymany na stronie (przycisk w stopce) zostaje wstrzymany także w sieci
    wstrzymany = document.documentElement.classList.contains("animacje-wstrzymane");
    pauza.setAttribute("aria-pressed", String(wstrzymany));
    document.documentElement.classList.add("siec-otwarta");
    okno.showModal();
    const adres = new URL(location.href);
    if (adres.searchParams.get("tryb") !== "siec") {
      adres.searchParams.set("tryb", "siec");
      history.replaceState(history.state, "", adres);
    }
    zmierzUklad();
    zmierzEtykiety();
    // Wejście: mózg z linii rozpada się na neurony tła, a kamera wlatuje z daleka do rdzenia.
    // Bez ruchu od razu gotowa scena; przy wstrzymanym ruchu albo bez obrazu sam przelot.
    kamera.poz = [0, 220, 1900];
    kamera.cel = [0, 0, 0];
    kamera.przelot = null;
    impulsy.length = 0;
    biezacy = null;
    zakonczWejscie();
    const sekwencja = !bezRuchu() && !wstrzymany && przypiszMozg(mozg);
    if (sekwencja) {
      wejscie = { start: performance.now(), zeStopki, mozg };
      okno.classList.add("siec--wejscie");
    }
    idzDo(kolejnosc[0], sekwencja ? { czas: WEJSCIE.przelot, opoznienie: WEJSCIE.kamera } : { czas: 2200 });
    // Środek sceny dopiero po zbudowaniu panelu (na telefonie panel wyznacza dół wolnego obszaru),
    // inaczej rdzeń, a z nim obraz mózgu, podjeżdżałby w pierwszych klatkach
    uklad.cx = uklad.celCx;
    uklad.cy = uklad.celCy;
    kolejnosc[0].przycisk.focus({ preventScroll: true });
    if (bezRuchu()) rysujNaZadanie();
  }

  let sekcjaPoZamknieciu = null;
  function zamknij(sekcja = null) {
    sekcjaPoZamknieciu = sekcja;
    if (okno.open) okno.close();
  }

  return { otworz };
}

/* ---------- Wejście do trybu sieci ---------- */

let scena = null;

export async function otworz({ kafle = [], wywolujacy = null, galeria = null, zeStopki = false } = {}) {
  // Obraz mózgu czeka najwyżej chwilę: bez niego wejście to sam przelot kamery, jak w pilocie
  const [, mozg] = await Promise.all([wczytajStyl(), Promise.race([mozgGotowy, new Promise((g) => setTimeout(() => g(null), 700))])]);
  // Budowa sceny w osobnym zadaniu, nie doklejona do dekodowania i próbkowania obrazu
  if (!scena) await ustap();
  if (!scena) scena = zbudujScene({ kafle, galeria });
  scena.otworz(wywolujacy, { zeStopki, mozg });
}
