# Podmiana: nowa strona na lucidacademy.pl

**Co podmieniamy.** Strona na lucidacademy.pl to Netlify, który publikuje gałąź `main`
z repozytorium HuminPiotr/lucidacademy-onepage. Jej pliki są identyczne z `main` tutaj
(commit 89c5bc6). Nowa strona to gałąź `produkcja` w lucid-academy/LucidAcademy-onepage,
już bez `noindex`. Zawiera całą historię `main`, więc podmiana jest przewinięciem gałęzi
(fast-forward): bez konfliktów, a stare pliki, np. `projekty/`, zostają na miejscu.

Podgląd przed podmianą: https://raw.githack.com/lucid-academy/LucidAcademy-onepage/produkcja/index.html

## Sposób A: jednorazowo, przez właściciela repozytorium HuminPiotr

```
git fetch https://github.com/lucid-academy/LucidAcademy-onepage produkcja
git merge --ff-only FETCH_HEAD
git push origin main
```

Netlify sam opublikuje nową wersję po około minucie. Ustawienia Netlify i DNS się nie
zmieniają. Każda kolejna zmiana wymaga jednak powtórzenia tych trzech poleceń.

## Sposób B: na stałe, Netlify publikuje prosto z tego repozytorium

W Netlify, w witrynie lucidacademy.pl: Site configuration → Build & deploy → Continuous
deployment → Manage repository → Link to a different repository → GitHub →
lucid-academy/LucidAcademy-onepage.

- Branch to deploy: `produkcja`
- Build command: puste
- Publish directory: puste (katalog główny)

Potrzebne: dostęp do konta Netlify z tą witryną i zgoda aplikacji Netlify na organizację
lucid-academy w GitHubie. Później każdy push na `produkcja` od razu trafia na lucidacademy.pl.

## Sposób C (odradzany): GitHub Pages i zmiana DNS

Wymaga zmiany rekordów DNS u rejestratora i pliku `CNAME`, który można dodać dopiero
razem ze zmianą DNS, bo inaczej podgląd na github.io zacznie przekierowywać na obecną
stronę. GitHub Pages rozróżnia też wielkość liter w adresach: link
`/projekty/swietochp/` (folder nazywa się `swietoCHP`) dałby 404, a Netlify obsługuje
obie wersje.

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

Netlify → Deploys → poprzednie wdrożenie produkcyjne → Publish deploy. Działa od razu
i przy sposobie A, i przy B.

## Do wiedzy

- Tryb sieci jest schowany: otwiera go tylko link `?tryb=siec`, a oba przyciski wracają
  po przestawieniu `POKAZ_TRYB_SIECI` na `true` w `js/strona.js`.
- Mapę w sekcji „Gdzie już byliśmy” i pozycje miast liczy `narzedzia/mapa.py`.
