# Podmiana: nowa strona na lucidacademy.pl (GitHub Pages + DNS w OVH)

**Stan (27.10.2026).** Domena lucidacademy.pl jest zarejestrowana w OVH, ale jej DNS nadal
obsługuje Netlify DNS z konta Piotra Humina (serwery nazw dns1–dns4.p07.nsone.net). Rekordy A
domeny i www wskazują Netlify, który publikuje starą stronę z HuminPiotr/lucidacademy-onepage.
Poza tym w strefie nic nie ma: brak poczty (MX), rekordów TXT i CAA, brak IPv6 i DNSSEC.
Przy przenosinach nic więc nie zginie.

Nowa strona to gałąź `produkcja` w lucid-academy/LucidAcademy-onepage, gotowa pod GitHub
Pages: plik `CNAME` z lucidacademy.pl, `.nojekyll`, strona `404.html` i foldery projektów
małymi literami. GitHub Pages tego repozytorium publikuje dziś gałąź `nowa-strona`
(podgląd na lucid-academy.github.io/LucidAcademy-onepage/).

**Nie trzeba niczego w Netlify ani u Piotra.** Właściciel domeny sam przełącza jej DNS w OVH,
a właściciel organizacji sam włącza GitHub Pages. Klikania jest około 15 minut. Potem czeka
się na propagację, zwykle godzinę lub dwie, w skrajnym przypadku do 48 godzin. Strona
w tym czasie nie znika: część osób widzi jeszcze starą, część już nową.

Podgląd przed podmianą: https://raw.githack.com/lucid-academy/LucidAcademy-onepage/produkcja/index.html

Kolejność ma znaczenie: najpierw domena w GitHub Pages, potem DNS. GitHub ostrzega, że
odwrotna kolejność pozwala komuś innemu podpiąć domenę pod własną stronę.

## Krok 1: GitHub Pages publikuje gałąź `produkcja` (2 minuty)

Repozytorium lucid-academy/LucidAcademy-onepage → Settings → Pages.

1. Build and deployment → Source: **Deploy from a branch** → Branch: **`produkcja`**, folder
   **`/ (root)`** → Save.
2. Custom domain: powinno pokazać `lucidacademy.pl` (z pliku `CNAME`). Jeśli pole jest
   puste, wpisać `lucidacademy.pl` i kliknąć Save. Komunikat o nieudanym sprawdzeniu DNS jest
   do kroku 3 normalny.

Od tej chwili podgląd na github.io przekierowuje na lucidacademy.pl, gdzie do zmiany DNS
dalej jest stara strona. Podglądy gałęzi zostają na raw.githack.com.

## Krok 2: strefa DNS w OVH (10 minut)

Panel klienta OVH → Web Cloud → Domeny → lucidacademy.pl → zakładka **„Strefa DNS”**.

Jeśli strefy jeszcze nie ma: Web Cloud → **„Strefy DNS”** → **„Zamów”** (bezpłatne) →
lucidacademy.pl → „Włącz minimalne wpisy?” **Tak** → dalej według panelu.

W strefie:

1. Usunąć rekordy **A, AAAA i CNAME** dla samej domeny (pusta subdomena) i dla **www**, jeśli
   OVH dodało tam własne adresy. Rekordy NS i SOA zostają. MX i TXT od OVH mogą zostać, bo
   poczty na tej domenie i tak nie ma.
2. Dodać przyciskiem **„Dodaj wpis”** (TTL domyślny):

| Typ   | Subdomena | Cel                         |
| ----- | --------- | --------------------------- |
| A     | (puste)   | `185.199.108.153`           |
| A     | (puste)   | `185.199.109.153`           |
| A     | (puste)   | `185.199.110.153`           |
| A     | (puste)   | `185.199.111.153`           |
| AAAA  | (puste)   | `2606:50c0:8000::153`       |
| AAAA  | (puste)   | `2606:50c0:8001::153`       |
| AAAA  | (puste)   | `2606:50c0:8002::153`       |
| AAAA  | (puste)   | `2606:50c0:8003::153`       |
| CNAME | `www`     | `lucid-academy.github.io.`  |

- **Kropka na końcu celu CNAME jest konieczna.** Bez niej OVH dopisze nazwę domeny
  i powstanie lucid-academy.github.io.lucidacademy.pl.
- Rekordy AAAA (IPv6) są opcjonalne, ale warto je dodać.
- Bez rekordu z gwiazdką (`*`): GitHub odradza je, bo ułatwiają przejęcie subdomen.

Ta strefa zaczyna działać dopiero w kroku 3, więc można ją spokojnie przygotować wcześniej.

## Krok 3: przełączenie serwerów DNS na OVH (2 minuty i czekanie)

Domeny → lucidacademy.pl → zakładka **„Serwery DNS”** → **„Zmień serwery DNS”** →
**„Zastosuj konfigurację”**. OVH pokaże dwa swoje serwery (`nsXX.ovh.net` i `dnsXX.ovh.net`)
→ **„Zastosuj”**.

Postęp widać w „Operacje w toku”. Rejestr .pl przyjmuje zmianę zwykle w kilka minut.
Potem resolwery przechodzą na nowe serwery, gdy wygasną stare wpisy: rekordy NS Netlify
mają TTL 1 godziny, a OVH podaje górną granicę 48 godzin. Sprawdzić można np. na
https://dnschecker.org/#A/lucidacademy.pl (adresy 185.199.x.153 oznaczają nową stronę).

## Krok 4: HTTPS

Settings → Pages: gdy sprawdzenie DNS przejdzie, GitHub sam wystawi certyfikat (Let's
Encrypt) dla lucidacademy.pl i www. Zwykle trwa to kilkanaście minut, według GitHuba
maksymalnie do 24 godzin. Potem zaznaczyć **„Enforce HTTPS”**.

Zanim certyfikat powstanie, https://lucidacademy.pl może u części osób pokazywać ostrzeżenie
o certyfikacie. Dlatego kroki 3 i 4 najlepiej robić wieczorem.

Przekierowanie z www na adres bez www GitHub zakłada sam, gdy oba rekordy z kroku 2 są
poprawne.

## Krok 5 (zalecany): weryfikacja domeny w organizacji

Chroni przed podpięciem lucidacademy.pl pod cudzą stronę na GitHub Pages, np. po usunięciu
repozytorium. Weryfikacja obejmuje też subdomeny pierwszego poziomu.

1. Organizacja lucid-academy → Settings → „Code, planning, and automation” → **Pages** →
   **„Add a domain”** → `lucidacademy.pl`.
2. GitHub poda rekord TXT. W strefie OVH dodać: typ **TXT**, subdomena
   **`_github-pages-challenge-lucid-academy`**, cel: wartość z GitHuba.
3. Po kroku 3 (i chwili na propagację) kliknąć **„Verify”**.

## Po podmianie sprawdzić

1. https://lucidacademy.pl/ pokazuje nową stronę, a https://www.lucidacademy.pl/
   przekierowuje na adres bez www.
2. W źródle strony nie ma `<meta name="robots" content="noindex">`.
3. Działają https://lucidacademy.pl/projekty/swietochp/ i https://lucidacademy.pl/projekty/swietobp/,
   a stare linki z wielkimi literami (`/projekty/swietoCHP/`) przekierowują na nowe.
4. Podgląd linku: Facebook Sharing Debugger i LinkedIn Post Inspector trzymają stary
   obraz, trzeba go odświeżyć („Scrape again”).
5. GoatCounter liczy wejścia (lucidacademy.goatcounter.com).
6. W Google Search Console, jeśli jest podpięta, poprosić o ponowne zindeksowanie strony głównej.

## Kolejne zmiany

Każdy push na `produkcja` po około minucie trafia na lucidacademy.pl (zakładka Actions,
„pages build and deployment”). Jeśli w kroku 1 GitHub dodał własny commit z plikiem
`CNAME`, przed następnym pushem trzeba zrobić `git pull`.

## Wycofanie

- Treść: `git revert` problematycznego commita na `produkcja` i push.
- Awaryjnie cała stara strona: OVH → „Serwery DNS” → „Zmień serwery DNS” → własne serwery
  `dns1.p07.nsone.net` … `dns4.p07.nsone.net`. Wraca stara konfiguracja Netlify, dopóki
  projekt i strefa DNS istnieją w Netlify. Dlatego porządki poniżej dopiero po kilku dniach
  spokojnego działania.

## Porządki po kilku dniach (bez pośpiechu)

Piotr może usunąć w Netlify projekt lucidacademy.pl i strefę DNS domeny, a repozytorium
HuminPiotr/lucidacademy-onepage zarchiwizować.

## Do wiedzy

- Podstawa to wersja 2 z podglądu GitHub Pages (gałąź `nowa-strona`), bez aksonu, warstwy
  światła i ruchu ilustracji z wersji 3 (gałęzie `impuls`, `eksperymenty`).
- Sieć neuronowa w hero i jej fragmenty to `js/neurony.js`. Wycofuje się ją, usuwając ten
  plik, jego `<script>` i elementy `<canvas class="neurony">` w `index.html`.
- Efekty przy przewijaniu (liczby, rozjaśniane zdania, znaczniki, mapa, dymki) to
  `js/przewijanie.js` i blok „Efekty przy przewijaniu” w `css/strona.css`. Bez tego pliku
  strona działa jak wcześniej, bo efekty włącza dopiero klasa, którą dodaje skrypt.
- Tryb sieci jest schowany: otwiera go tylko link `?tryb=siec`, a przycisk wraca po
  przestawieniu `POKAZ_TRYB_SIECI` na `true` w `js/strona.js`.
- Mapę w sekcji „Gdzie już byliśmy”, pozycje miast i ich opóźnienia przy odsłanianiu liczy
  `narzedzia/mapa.py`.
- GitHub Pages rozróżnia wielkość liter w adresach. Nowe foldery i pliki najlepiej nazywać
  małymi literami.
