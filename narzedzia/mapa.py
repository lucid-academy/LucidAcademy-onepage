"""Fragment mapy do sekcji „Gdzie już byliśmy” (index.html, <svg class="mapa__tlo">).

Ląd z kropek (Polska mocniej, sąsiedzi słabiej), wybrzeże z zalewami, granica lądowa Polski,
Wisła i Odra. Dane: Natural Earth 1:10 mln (domena publiczna). Rzut: PUWG 1992 (EPSG:2180),
ten sam, w którym liczone są pozycje miast, więc kropki miast leżą dokładnie na mapie.

Użycie:
  1. pip install shapely pyproj numpy
  2. Pliki GeoJSON Natural Earth do narzedzia/mapa-dane/ (folder poza repozytorium):
     ne_10m_admin_0_countries, ne_10m_coastline, ne_10m_lakes,
     ne_10m_admin_0_boundary_lines_land, ne_10m_rivers_lake_centerlines, np.
     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson
  3. python3 narzedzia/mapa.py
  4. narzedzia/mapa-wynik/mapa.svg wkleić w miejsce <svg class="mapa__tlo">…</svg> (w oknie
     <div class="mapa__odslona">, które odsłania mapę przy przewijaniu),
     a --x, --y i --opoznienie miast przepisać z narzedzia/mapa-wynik/miasta.json. Stronę
     podpisu (miasto--w-prawo, --w-lewo, --nad-w-prawo, --pod-w-lewo) dobiera się ręcznie.

Nowe miasto: dopisać do MIASTA (współrzędne z OpenStreetMap, Nominatim). Jeśli leży poza
obecną ramką, poszerzyć ją w RAMKA i zmienić proporcje .mapa w css/strona.css.
"""
import json
import math
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, box, shape
from shapely.ops import unary_union
from shapely.prepared import prep

TU = Path(__file__).resolve().parent
DANE = TU / "mapa-dane"
WYNIK = TU / "mapa-wynik"

MIASTA = {
    "Toruń": (53.01027, 18.60481),
    "Bydgoszcz": (53.12196, 18.00025),
    "Olsztyn": (53.77668, 20.47651),
    "Szczecin": (53.43018, 14.55096),
    "Sopot": (54.44479, 18.56849),
    "Lipno": (52.84739, 19.17927),
    "Ciechocinek": (52.88255, 18.79069),
}
SZEROKOSC_SVG = 1000.0
# Odsłanianie mapy z zachodu na wschód: czas i krzywa przejścia okna z reguły
# .efekty-przewijania .mapa--odslonieta .mapa__odslona w css/strona.css. Zmiana tam = zmiana tu.
ODSLANIANIE_MS = 1600
ODSLANIANIE_KRZYWA = (.5, 0, .3, 1)
ODSTEPY_KROPEK = {"gesto": 12, "rzadko": 20}  # te same wartości co stroke-dasharray w wyniku

T = Transformer.from_crs("EPSG:4326", "EPSG:2180", always_xy=True)
xy = {n: T.transform(lon, lat) for n, (lat, lon) in MIASTA.items()}
rozewie = T.transform(18.333, 54.830)  # najdalej na północ wysunięty brzeg w kadrze

# Ramka w metrach PUWG: miasta z marginesami na podpisy i trochę morza nad wybrzeżem
RAMKA = {
    "x0": xy["Szczecin"][0] - 42_000,
    "x1": xy["Olsztyn"][0] + 44_000,
    "y0": min(xy["Lipno"][1], xy["Ciechocinek"][1]) - 50_000,
    "y1": rozewie[1] + 16_000,
}
x0, x1, y0, y1 = RAMKA["x0"], RAMKA["x1"], RAMKA["y0"], RAMKA["y1"]
W_M, H_M = x1 - x0, y1 - y0
skala = SZEROKOSC_SVG / W_M
WYSOKOSC_SVG = round(SZEROKOSC_SVG * H_M / W_M, 1)
ramka = box(x0, y0, x1, y1)
ramka_zapas = ramka.buffer(20_000)
# Wstępne cięcie w stopniach: rzut PUWG daleko od Polski daje nieskończoności
GEO = box(12.0, 51.6, 23.0, 56.0)


def rzut(g):
    g = g.intersection(GEO)
    return shapely.transform(g, lambda p: np.column_stack(T.transform(p[:, 0], p[:, 1])))


def warstwa(nazwa, warunek=lambda p: True):
    for f in json.load(open(DANE / f"{nazwa}.geojson", encoding="utf-8"))["features"]:
        g = shape(f["geometry"])
        if warunek(f["properties"]) and g.intersects(GEO):
            yield f["properties"], rzut(g)


def liczba(v):
    """Jedno miejsce po przecinku, bez zbędnego zera: 12.0 → 12, 0.5 → .5, -0.5 → -.5."""
    s = f"{round(v, 1):.1f}".rstrip("0").rstrip(".")
    s = s.replace("-0.", "-.") if s.startswith("-0.") else s
    s = s[1:] if s.startswith("0.") else s
    return "0" if s in ("", "-0", "-") else s


def opoznienie_ms(x_procent):
    """Chwila, w której krawędź odsłaniania dochodzi do x (cubic-bezier odwrócony bisekcją),
    zaokrąglona do 10 ms: miasto pojawia się razem z mapą pod nim."""
    p1x, p1y, p2x, p2y = ODSLANIANIE_KRZYWA
    krzywa = lambda t, a, b: 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
    lo, hi = 0.0, 1.0
    for _ in range(60):
        t = (lo + hi) / 2
        lo, hi = (t, hi) if krzywa(t, p1y, p2y) < x_procent / 100 else (lo, t)
    return int(krzywa(lo, p1x, p2x) * ODSLANIANIE_MS / 10 + 0.5) * 10


def do_svg(x, y):
    return (x - x0) * skala, (y1 - y) * skala


# Ląd: państwa w ramce, z zalewami (Wiślany, Kaliningradzki) odjętymi jako woda
zalewy = unary_union([g for p, g in warstwa("ne_10m_lakes", lambda p: (p.get("scalerank") or 99) <= 3) if g.intersects(ramka_zapas)])
panstwa = {p["ADM0_A3"]: g.intersection(ramka_zapas).difference(zalewy)
           for p, g in warstwa("ne_10m_admin_0_countries", lambda p: p["ADM0_A3"] in ("POL", "DEU", "RUS", "LTU", "DNK"))}
polska = panstwa.pop("POL")
sasiedzi = unary_union(list(panstwa.values()))


def kropki(odstep):
    """Siatka heksagonalna w jednostkach SVG. Ciągły odcinek kropek w rzędzie to jedna linia
    z przerywaniem „0 odstęp” i okrągłym zakończeniem: kropka w każdym punkcie siatki."""
    pl, sa = prep(polska), prep(sasiedzi)
    wiersz = odstep * math.sqrt(3) / 2
    d = {"p": [], "s": []}
    y, j = wiersz / 2, 0
    while y < WYSOKOSC_SVG:
        start = odstep / 2 + (odstep / 2 if j % 2 else 0)
        n = int((SZEROKOSC_SVG - start) // odstep) + 1
        stan = []
        for i in range(n):
            pt = Point(x0 + (start + i * odstep) / skala, y1 - y / skala)
            stan.append("p" if pl.contains(pt) else "s" if sa.contains(pt) else "")
        i = 0
        while i < n:
            if not stan[i]:
                i += 1
                continue
            k = i
            while k + 1 < n and stan[k + 1] == stan[i]:
                k += 1
            dlugosc = (k - i) * odstep
            d[stan[i]].append(f"M{liczba(start + i * odstep)} {liczba(y)}h{liczba(dlugosc) if dlugosc else '.01'}")
            i = k + 1
        y += wiersz
        j += 1
    return "".join(d["p"]), "".join(d["s"])


def sciezka(geom, tolerancja_m):
    """Linie (albo brzegi wielokątów) przycięte do ramki i uproszczone, we względnych odcinkach."""
    g = geom.intersection(ramka.buffer(2_000)).simplify(tolerancja_m)
    linie = []

    def zbierz(x):
        if x.is_empty:
            return
        if isinstance(x, Polygon):
            linie.append(list(x.exterior.coords))
            linie.extend(list(r.coords) for r in x.interiors)
        elif isinstance(x, LineString):
            linie.append(list(x.coords))
        elif hasattr(x, "geoms"):
            for y in x.geoms:
                zbierz(y)

    zbierz(g)
    wynik = []
    for linia in linie:
        pts = []
        for x, y in linia:
            p = tuple(round(v, 1) for v in do_svg(x, y))
            if not pts or p != pts[-1]:
                pts.append(p)
        if len(pts) < 2:
            continue
        odcinki = " ".join(f"{liczba(b[0] - a[0])} {liczba(b[1] - a[1])}" for a, b in zip(pts, pts[1:]))
        wynik.append(f"M{liczba(pts[0][0])} {liczba(pts[0][1])}l{odcinki}")
    return "".join(wynik)


brzeg = unary_union([g for _, g in warstwa("ne_10m_coastline")]).intersection(ramka_zapas)
brzeg = unary_union([brzeg, zalewy.boundary])
granica = unary_union([g for p, g in warstwa("ne_10m_admin_0_boundary_lines_land",
                                              lambda p: "POL" in {p.get("ADM0_A3_L"), p.get("ADM0_A3_R")})])
rzeki = unary_union([g for _, g in warstwa("ne_10m_rivers_lake_centerlines", lambda p: p.get("name") in ("Vistula", "Oder"))])

grupy = []
for nazwa, odstep in ODSTEPY_KROPEK.items():
    pl, sa = kropki(odstep)
    szer_kropki = liczba(odstep / 5)
    grupy.append(f'''                <g class="mapa__kropki mapa__kropki--{nazwa}" stroke-dasharray="0 {odstep}" stroke-width="{szer_kropki}" stroke-linecap="round" fill="none">
                  <path class="mapa__sasiedzi" d="{sa}" />
                  <path class="mapa__polska" d="{pl}" />
                </g>''')

svg = f'''<svg class="mapa__tlo" viewBox="0 0 {liczba(SZEROKOSC_SVG)} {liczba(WYSOKOSC_SVG)}" aria-hidden="true" focusable="false">
{chr(10).join(grupy)}
                <g fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path class="mapa__rzeka" d="{sciezka(rzeki, 300)}" vector-effect="non-scaling-stroke" />
                  <path class="mapa__granica" d="{sciezka(granica, 300)}" vector-effect="non-scaling-stroke" />
                  <path class="mapa__brzeg" d="{sciezka(brzeg, 200)}" vector-effect="non-scaling-stroke" />
                </g>
              </svg>'''

WYNIK.mkdir(exist_ok=True)
(WYNIK / "mapa.svg").write_text(svg, encoding="utf-8")
miasta = {n: {"x": round((x - x0) / W_M * 100, 2), "y": round((y1 - y) / H_M * 100, 2), "lat": MIASTA[n][0], "lon": MIASTA[n][1]}
          for n, (x, y) in xy.items()}
for m in miasta.values():
    m["opoznienie_ms"] = opoznienie_ms(m["x"])
(WYNIK / "miasta.json").write_text(json.dumps({"viewBox": [SZEROKOSC_SVG, WYSOKOSC_SVG], "km": [round(W_M / 1000), round(H_M / 1000)], "miasta": miasta},
                                              ensure_ascii=False, indent=1), encoding="utf-8")
print(f"ramka {W_M / 1000:.0f} × {H_M / 1000:.0f} km, viewBox 0 0 {liczba(SZEROKOSC_SVG)} {liczba(WYSOKOSC_SVG)}, SVG {len(svg)} znaków")
for n, m in miasta.items():
    print(f"  {n:12} --x: {m['x']:.2f}%; --y: {m['y']:.2f}%; --opoznienie: {m['opoznienie_ms']}ms")
