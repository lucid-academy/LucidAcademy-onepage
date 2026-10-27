# Podmiana: nowa strona na lucidacademy.pl

**Stan.** lucidacademy.pl serwuje Netlify z konta Piotra Humina. Projekt publikuje gałąź
`main` z repozytorium HuminPiotr/lucidacademy-onepage (pliki identyczne z `main` tutaj,
commit 89c5bc6), a domena działa na Netlify DNS w tym samym koncie (serwery nazw
dns1–dns4.p07.nsone.net). Nowa strona to gałąź `produkcja` w
lucid-academy/LucidAcademy-onepage, już bez `noindex`. Zawiera całą historię `main`, więc
podmiana jest przewinięciem gałęzi bez konfliktów, a stare pliki, np. `projekty/`, zostają.

Podgląd przed podmianą: https://raw.githack.com/lucid-academy/LucidAcademy-onepage/produkcja/index.html

## Krok 1: Netlify publikuje z repozytorium fundacji

Po tym kroku każda zmiana na gałęzi `produkcja` sama trafia na lucidacademy.pl.

Najpierw po stronie fundacji, w organizacji lucid-academy na GitHubie:

1. Zainstalować aplikację Netlify na organizacji: https://github.com/apps/netlify/installations/new
   → lucid-academy → Only select repositories → LucidAcademy-onepage.
2. Dodać konto HuminPiotr jako współpracownika repozytorium (Settings → Collaborators →
   Add people, wystarczy Read). Bez tego Netlify nie pokaże mu repozytorium organizacji.

Potem w Netlify, w projekcie lucidacademy.pl: Project configuration → Developer settings →
Continuous deployment → Repository → Manage repository → Link to a different repository →
GitHub → lucid-academy/LucidAcademy-onepage.

- Branch to deploy: `produkcja`
- Build command: puste
- Publish directory: puste (katalog główny)

## Krok 2: projekt i domena na koncie fundacji

Netlify przenosi projekt między zespołami tylko wtedy, gdy ta sama osoba jest Ownerem albo
Developerem w obu (Project configuration → General → Project information → Transfer project).
Na darmowym planie zwykle nie da się dodać drugiej osoby do zespołu, więc przeniesienie robi
wsparcie Netlify na prośbę obecnego właściciela: https://www.netlify.com/support/ z nazwą
projektu, domeną lucidacademy.pl razem ze strefą Netlify DNS i adresem e-mail konta fundacji
w Netlify (to konto trzeba wcześniej założyć). Po przeniesieniu fundacja sama zmienia
ustawienia, gałąź i rekordy DNS.

## Krok 3: domena u rejestratora

Ustalić, u którego rejestratora jest lucidacademy.pl i na kogo jest zarejestrowana. Dostęp do
tego konta jest potrzebny przy odnowieniu domeny i przy ewentualnej zmianie serwerów nazw.

## Szybciej, ale jednorazowo: przewinięcie `main` w repozytorium HuminPiotr

```
git fetch https://github.com/lucid-academy/LucidAcademy-onepage produkcja
git merge --ff-only FETCH_HEAD
git push origin main
```

Netlify opublikuje nową wersję po około minucie, bez zmian w ustawieniach. Każdą kolejną
zmianę trzeba jednak przenosić tak samo.

## Odradzane: GitHub Pages i zmiana DNS

Wymaga zmiany rekordów DNS i pliku `CNAME`, który można dodać dopiero razem ze zmianą DNS,
bo inaczej podgląd na github.io zacznie przekierowywać na obecną stronę. GitHub Pages
rozróżnia też wielkość liter w adresach: link `/projekty/swietochp/` (folder nazywa się
`swietoCHP`) dałby 404, a Netlify obsługuje obie wersje.

## Po podmianie sprawdzić

1. https://lucidacademy.pl/ pokazuje nową stronę, a https://www.lucidacademy.pl/
   przekierowuje na adres bez www.
2. W źródle strony nie ma `<meta name="robots" content="noindex">`.
3. Działają https://lucidacademy.pl/projekty/swietochp/ i https://lucidacademy.pl/projekty/swietobp/.
4. Podgląd linku: Facebook Sharing Debugger i LinkedIn Post Inspector trzymają stary
   obraz, trzeba go odświeżyć („Scrape again”).
5. GoatCounter liczy wejścia (lucidacademy.goatcounter.com).
6. W Google Search Console, jeśli jest podpięta, poprosić o ponowne zindeksowanie strony głównej.

## Wycofanie

Netlify → Deploys → poprzednie wdrożenie produkcyjne → Publish deploy. Działa od razu.

## Do wiedzy

- Podstawa to wersja 2 z podglądu GitHub Pages (gałąź `nowa-strona`), bez aksonu, warstwy
  światła i ruchu ilustracji z wersji 3 (gałęzie `impuls`, `eksperymenty`).
- Sieć neuronowa w hero to `js/neurony.js`; wycofuje się ją, usuwając ten plik, jego
  `<script>` i `<canvas class="neurony">` w `index.html`.
- Tryb sieci jest schowany: otwiera go tylko link `?tryb=siec`, a przycisk wraca po
  przestawieniu `POKAZ_TRYB_SIECI` na `true` w `js/strona.js`.
- Mapę w sekcji „Gdzie już byliśmy” i pozycje miast liczy `narzedzia/mapa.py`.
