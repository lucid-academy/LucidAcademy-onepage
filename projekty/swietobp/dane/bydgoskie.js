/* XVII Święto Bydgoskiego Przedmieścia — dane wydarzenia.
   Świadomie .js zamiast .json, żeby strona działała otwarta z dysku (file://).

   Źródło treści: zrodla/program/MAPA ŚBP.odt
   Współrzędne: rozwinięte linki maps.app.goo.gl (para !3d!4d z docelowego URL-a),
   zweryfikowane reverse geocodingiem OpenStreetMap. Pole `zrodloGps` mówi,
   skąd wzięła się każda współrzędna — nic tu nie jest zgadnięte.

   Pole `mapa` w lokalizacjach czeka na ETAP 2 (kalibracja na grafice).
   Pole `dodatki` w wydarzeniach to zarezerwowane miejsce na punkt 5 z promptu. */

window.DANE = {

  swieto: {
    id: 'bydgoskie',                 // klucz zapisu planu w localStorage
    nazwa: 'XVII Święto Bydgoskiego Przedmieścia',
    skrot: 'Święto Bydgoskiego',
    miasto: 'Toruń',
    dzielnica: 'Bydgoskie Przedmieście',
    /* Kanoniczny adres opublikowanej mapy — stąd bierze go tools/qr.js.
       Małe litery, bo taki wychodzi po przekierowaniu na serwerze. */
    url: 'https://lucidacademy.pl/projekty/swietobp/',
    stopka: 'Zrealizowano dzięki wsparciu Gminy Miasta Toruń',
    dni: [
      { id: 'sobota',    nazwa: 'Sobota',    data: '2026-08-29' },
      { id: 'niedziela', nazwa: 'Niedziela', data: '2026-08-30' }
    ],
    // ETAP 2 — grafika mapy i jej proporcje.
    mapa: { plik: null, szerokosc: null, wysokosc: null },

    /* Intro przed mapą. Usuń całe pole `intro`, a strona otworzy się
       wprost na mapie — drugie święto nie musi mieć własnego wstępu.
       Filmy są nieme (nie mają nawet ścieżki audio). */
    intro: {
      film: 'img/intro/intro.mp4',
      okladka: 'img/intro/cover.jpg',
      tlo: {
        daleko:   'img/intro/street-far.jpg',
        srodek:   'img/intro/street.jpg',
        blisko:   'img/intro/street-near.jpg',
        animacja: 'img/intro/street-loop.mp4'
      },
      zapros: 'Rozpocznij',
      autor: null            // podpis autora intra — pokaże się, gdy uzupełnisz
    },

    /* Zliczanie odsłon. Dopóki `kod` jest pusty, nie ładuje się nic —
       strona nie odpytuje wtedy żadnego obcego serwera.

       GoatCounter nie stawia ciasteczek i nie przechowuje adresów IP.
       Licznik działa TYLKO na wymienionych domenach: z dysku i z localhosta
       milczy, więc wymóg „działa otwarta z dysku" zostaje nietknięty.

       `domeny` to lista, nie pojedynczy wpis, bo gdy nazwa hosta się nie
       zgadza, licznik milczy bez śladu w konsoli — to awaria, której nie
       widać. Lista obejmuje wariant z `www` i przetrwa przeprowadzkę na
       inną domenę bez zgadywania.

       Jak uruchomić: załóż witrynę na goatcounter.com i wklej w `kod` adres
       postaci https://twojkod.goatcounter.com/count. */
    licznik: {
      kod: 'https://lucidacademy.goatcounter.com/count',
      domeny: ['lucidacademy.pl', 'www.lucidacademy.pl'],
      nota: 'Zliczamy anonimowe odsłony — bez ciasteczek i bez danych osobowych.'
    }
  },

  /* NURTY — na mapie są dwa święta tego samego weekendu, robione przez tych
     samych ludzi. Wydarzenie bez pola `nurt` należy do pierwszego z listy,
     więc dwadzieścia siedem pozycji Święta nie wymaga niczego dopisywać. */
  nurty: [
    { id: 'swieto', nazwa: 'Święto Bydgoskiego', domyslny: true, opis: null },
    {
      id: 'superfestyn',
      nazwa: 'SUPERfestyn!',
      opis: 'Dwudniowe, rodzinne wydarzenie integracyjne w Parku Miejskim, dla mieszkańców Bydgoskiego Przedmieścia i Bielan. Koncerty, spektakl familijny, animacje, warsztaty i konkursy. Oba dni 10:00–14:00.'
    }
  ],

  /* Kolor kategorii steruje kolorem pinu, `ikona` wybiera rysunek z biblioteki
     w index.html. Nowe święto może użyć tych samych nazw ikon. */
  kategorie: [
    { id: 'muzyka',     nazwa: 'Muzyka',           kolor: '#A8382C', ikona: 'nuta' },
    { id: 'jedzenie',   nazwa: 'Jedzenie',         kolor: '#A95B1B', ikona: 'talerz' },
    { id: 'warsztaty',  nazwa: 'Warsztaty',        kolor: '#896C17', ikona: 'nozyce' },
    { id: 'dzieci',     nazwa: 'Dzieci i rodziny', kolor: '#397E48', ikona: 'latawiec' },
    { id: 'sasiedzkie', nazwa: 'Sąsiedzkie',       kolor: '#2F6B92', ikona: 'dom' },
    { id: 'sztuka',     nazwa: 'Sztuka',           kolor: '#6B4489', ikona: 'paleta' }
  ],

  /* Tagi sterują filtrami. Każdy jest oparty na tym, co realnie stoi w programie —
     żaden nie jest domysłem z typu miejsca. Brak tagu znaczy „nie wiemy”,
     nie „nie dotyczy”. */
  tagi: [
    { id: 'na-dworze',     nazwa: 'Na dworze',      opis: 'Odbywa się pod gołym niebem — w parku, w ogrodzie, na podwórku albo przed budynkiem.' },
    { id: 'wez-udzial',    nazwa: 'Weź udział',     opis: 'Coś się robi, nie tylko ogląda: warsztat, lekcja, wspólne granie, własne stoisko.' },
    { id: 'kawa-jedzenie', nazwa: 'Kawa i jedzenie',opis: 'Będzie co zjeść albo wypić.' },
    { id: 'dla-dzieci',    nazwa: 'Dla dzieci',     opis: 'Program wprost wymienia dzieci albo rodziny.' }
  ],

  /* LOKALIZACJE — jeden punkt na mapie = jeden pin.
     Kilka wydarzeń pod tym samym adresem dzieli pin; nazwę konkretnego
     miejsca niesie wtedy pole `miejsce` w wydarzeniu. */
  lokalizacje: [
    {
      id: 'mickiewicza-112',
      nazwa: 'Nasz Butik – sklep charytatywny',
      adres: 'ul. Mickiewicza 112',
      gps: { lat: 53.012155, lng: 18.577289 },
      zrodloGps: 'pinezka maps.app.goo.gl/DkjhiV7sNy4bGYWXA; reverse geocoding OSM: Adama Mickiewicza 112',
      mapa: null
    },
    {
      id: 'kotlownia',
      nazwa: 'Ośrodek Aktywności Studenckiej Kotłownia',
      adres: 'ul. Słowackiego 5/7',
      gps: { lat: 53.012808, lng: 18.595045 },
      zrodloGps: 'pinezka maps.app.goo.gl/uSCqnNLy49JSJWnHA; reverse geocoding OSM: Juliusza Słowackiego 5-7',
      mapa: null
    },
    {
      id: 'bydgoska-50',
      nazwa: 'Bydgoska 50 – Biblioteka i Kulturalny Hub',
      adres: 'ul. Bydgoska 50',
      gps: { lat: 53.0099895, lng: 18.5838485 },
      zrodloGps: 'pinezka maps.app.goo.gl/RyPHfFLyHqaWwvUf9; reverse geocoding OSM: Bydgoska 50',
      mapa: null
    },
    {
      id: 'trafo-cafe',
      nazwa: 'Trafo Cafe',
      adres: 'ul. Konopnickiej 9a',
      gps: { lat: 53.0096558, lng: 18.5851306 },
      zrodloGps: 'pinezka maps.app.goo.gl/vgH8BXU16GU5kQfi7; reverse geocoding OSM: Trafo Cafe, ul. Konopnickiej',
      mapa: null
    },
    {
      id: 'sienkiewicza-11',
      nazwa: 'Sienkiewicza 11 – Domkultury i Biblioteka Rewolucyjna',
      adres: 'ul. Sienkiewicza 11',
      gps: { lat: 53.0111477, lng: 18.5796614 },
      zrodloGps: 'pinezki maps.app.goo.gl/KNX9WooXCgFf8RNM6 i /8iWHoUViRMCvwhWh7 — obie wskazują ten sam punkt; reverse geocoding OSM: Zygmunta Krasińskiego 76 (budynek narożny, wejście do Biblioteki Rewolucyjnej od Krasińskiego)',
      mapa: null
    },
    {
      id: 'mickiewicza-117',
      nazwa: 'Mickiewicza 117',
      adres: 'ul. Mickiewicza 117 (róg ulic Mickiewicza i Reja)',
      gps: { lat: 53.011719, lng: 18.572008 },
      zrodloGps: 'pinezka maps.app.goo.gl/49Rb55q6t8zgNLDVA; reverse geocoding OSM: Adama Mickiewicza 117',
      mapa: null
    },
    {
      id: 'teatr-pokojowy',
      nazwa: 'Teatr Pokojowy',
      adres: 'ul. Sienkiewicza 13',
      gps: { lat: 53.01132, lng: 18.5799125 },
      zrodloGps: 'pinezka maps.app.goo.gl/cBATQdRAEirUuGJd6; reverse geocoding OSM: Henryka Sienkiewicza 13',
      mapa: null
    },
    {
      id: 'schwartz-cafe',
      nazwa: 'Schwartz Cafe – Centrum Aktywności Zawodowej',
      adres: 'ul. Bydgoska 52',
      gps: { lat: 53.0101714, lng: 18.5834726 },
      zrodloGps: 'pinezka maps.app.goo.gl/ZgxGVErcG5s5TKsw5; reverse geocoding OSM: Bydgoska 52',
      mapa: null
    },
    {
      id: 'amfiteatr',
      nazwa: 'Amfiteatr w Parku Miejskim',
      adres: 'Park Miejski na Bydgoskim Przedmieściu',
      gps: { lat: 53.0078294, lng: 18.5771618 },
      zrodloGps: 'pinezka maps.app.goo.gl/bESrZMccYbbc69pr7 (miejsce „Amfiteatr w Parku”); reverse geocoding OSM: Aleja Bogusława Magiery',
      mapa: null
    },
    {
      id: 'cafe-za-kantem',
      nazwa: 'cafe za KANTem – podwórko',
      adres: 'ul. Mickiewicza 34/36',
      gps: { lat: 53.0121871, lng: 18.5895938 },
      zrodloGps: 'pinezka maps.app.goo.gl/sbokL7mEHSuxzcwj8; reverse geocoding OSM wskazuje Jana Matejki 39 — podwórko za kamienicą, patrz `luki`',
      mapa: null
    },
    {
      id: 'schronisko',
      nazwa: 'Schronisko dla Bezdomnych Zwierząt w Toruniu',
      adres: 'ul. Przybyszewskiego 3',
      gps: { lat: 53.0081742, lng: 18.5689304 },
      zrodloGps: 'pinezka maps.app.goo.gl/AQCzR8cJRE4MSjmg6; reverse geocoding OSM: Stanisława Przybyszewskiego 3',
      mapa: null
    },
    {
      id: 'dziedziniec-wsp',
      nazwa: 'Dziedziniec Wydziału Sztuk Pięknych UMK',
      adres: 'ul. Sienkiewicza 30/32',
      gps: { lat: 53.0142628, lng: 18.581118 },
      zrodloGps: 'pinezka maps.app.goo.gl/RCFMtJNFPDnp1TVR7; reverse geocoding OSM: Henryka Sienkiewicza 30/32',
      mapa: null
    },
    {
      id: 'fontanna',
      nazwa: 'Park Miejski – fontanna',
      adres: 'Park Miejski na Bydgoskim Przedmieściu, przy fontannie',
      gps: { lat: 53.009567, lng: 18.578696 },
      zrodloGps: 'fontanna z OpenStreetMap (node/4834316823), potwierdzona jako leżąca w granicach Parku Miejskiego — 219 m od amfiteatru. Pinezka organizatorów maps.app.goo.gl/mh9Ai2JeRGod9NBJ9 wskazywała ogólne miejsce „Park Miejski”, 125 m dalej.',
      mapa: null
    },
    {
      id: 'pomnik-balonowy',
      nazwa: 'Pomnik Żołnierzy Wojsk Balonowych',
      adres: 'Park Miejski, Aleja Bogusława Magiery',
      gps: { lat: 53.007831, lng: 18.578448 },
      zrodloGps: 'OpenStreetMap (node/7937432429), znaleziony po dokładnej nazwie; reverse geocoding potwierdza Aleja Bogusława Magiery, Bydgoskie Przedmieście',
      mapa: null
    },
    {
      id: 'aleja-parkowa',
      nazwa: 'Aleja parkowa',
      adres: 'Park Miejski, odcinek między fontanną a pomnikiem',
      gps: { lat: 53.008134, lng: 18.578505 },
      zrodloGps: '„Aleja Parkowa” to nazwa potoczna — takiej ulicy nie ma w Toruniu (jedyna Parkowa jest na Podgórzu). Organizator wskazał odcinek Alei Bogusława Magiery między fontanną a pomnikiem, ze stoiskami bliżej pomnika. Punkt leży na geometrii alei z OSM: 160 m od fontanny, 34 m od pomnika.',
      mapa: null
    },
    {
      id: 'boisko',
      nazwa: 'Boisko do piłki nożnej',
      adres: 'Park Miejski, południowa część',
      gps: { lat: 53.005441, lng: 18.575796 },
      zrodloGps: 'OpenStreetMap (way/776214596), sport=soccer, nawierzchnia trawiasta. Organizator wskazał „boisko na dole do piłki nożnej” — w parku są trzy: koszykówka od północy, siatkówka plażowa pośrodku, piłka nożna najdalej na południe.',
      mapa: null
    },
    {
      id: 'park-przy-trafo',
      nazwa: 'Park Miejski – okolice Trafo Cafe',
      adres: 'Park Miejski, okolice Trafo Cafe',
      gps: { lat: 53.0096558, lng: 18.5851306 },
      przyblizone: true,
      zrodloGps: 'PRZYBLIŻONE — w programie nie ma pinezki dla tego punktu. Użyte współrzędne samej Trafo Cafe, która leży w granicach Parku Miejskiego. Dokładne miejsce warsztatów w parku do potwierdzenia u organizatorów.',
      mapa: null
    }
  ],

  wydarzenia: [

    /* ————————————————————— SOBOTA ————————————————————— */

    {
      id: 'butik-sobota',
      dzien: 'sobota',
      od: '10:00', do: '19:00',
      tytul: 'XVII Święto Bydgoskiego Przedmieścia z „Naszym Butikiem”',
      lokalizacja: 'mickiewicza-112',
      miejsce: 'Nasz Butik – sklep charytatywny',
      opis: 'Z okazji Święta Bydgoskiego Przedmieścia przygotowaliśmy dla Was dwa dni pełne dobrej atmosfery. Wpadnijcie na chwilę lub zostańcie z nami na dłużej! ☕🎶\n\nCzeka na Was:\n🌿 darmowa kawa, herbata i lemoniada,\n🎵 dobra muzyka,\n💬 ciekawe rozmowy,\n👗 wyjątkowe ubrania, dodatki, biżuteria, porcelana i wiele innych perełek w świetnych cenach.\n🕙 Podczas Święta Bydgoskiego Przedmieścia butik będzie otwarty w godzinach 10:00–19:00.\n\nKażdy zakup ma znaczenie – cały zysk przekazujemy na działania Stowarzyszenia Serce Torunia, wspierając osoby w kryzysie bezdomności. To zakupy, które naprawdę zmieniają życie. ❤️\n\n📍 Nasz Butik – sklep charytatywny\nul. Mickiewicza 112, 87-100 Toruń\n\nZaproście rodzinę i znajomych – do zobaczenia podczas XVII Święta Bydgoskiego Przedmieścia!',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/67ub5YQTd' }
      ],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: ['kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'gramy-i-odkrywamy',
      dzien: 'sobota',
      od: '10:00', do: '14:00',
      tytul: 'GraMY i OdkrywaMy (planszówki, strefa Uniwersytetu Dziecięcego)',
      lokalizacja: 'kotlownia',
      miejsce: 'Ośrodek Aktywności Studenckiej Kotłownia',
      opis: 'W ramach naszego udziału otwieramy Kotłownię na planszówkowe granie! 🎲♟️ Udostępniamy nasze planszówki i zachęcamy, żeby wpaść, wybrać grę i spędzić z nami trochę czasu. Nie trzeba być studentem ani mistrzem strategii - liczy się dobra zabawa i wspólne spędzanie czasu! 😊\n\nA to nie wszystko! Tego dnia będzie z nami również Fundacja Amicus Universitatis Nicolai Copernici, która przygotuje strefę Uniwersytetu Dziecięcego z ciekawym stoiskiem naukowym 🔬🧪\n\n📍 Ośrodek Aktywności Studenckiej Kotłownia\n📅 29.08.2026 (sobota)\n⏰ 10:00 - 14:00\n🌳 teren przed Kotłownią\n☔ w razie niepogody przenosimy się do budynku\n\nŚwięto Bydgoskiego Przedmieścia to kilkadziesiąt wydarzeń w całej dzielnicy - warsztaty, koncerty, spacery, akcje społeczne, pchli targ i mnóstwo okazji do wspólnego świętowania.\n\nWpadajcie do Kotłowni - będziemy na Was czekać!',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://www.facebook.com/events/1393988926175384/' },
        { etykieta: 'Czym jest Uniwersytet Dziecięcy', url: 'https://ud.umk.pl/about/' },
        { etykieta: 'Kotłownia na Facebooku', url: 'https://www.facebook.com/OASKotlownia' }
      ],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'wez-udzial', 'dla-dzieci'],
      dodatki: {}
    },

    {
      id: 'biblioteka-dzien-otwarty',
      dzien: 'sobota',
      od: '10:00', do: '14:00',
      tytul: 'Dzień otwarty w Bibliotece',
      lokalizacja: 'bydgoska-50',
      miejsce: 'Biblioteka, ul. Bydgoska 50',
      opis: '',
      linki: [],
      zdjecia: ['biblio1', 'biblio2', 'biblio3'],
      kategoria: 'sasiedzkie',
      tagi: [],
      dodatki: {}
    },

    {
      id: 'kofeina-sobota',
      dzien: 'sobota',
      od: '10:00', do: '18:00',
      tytul: 'Kofeina dla starszaków z Trafo Cafe',
      lokalizacja: 'trafo-cafe',
      miejsce: 'Trafo Cafe',
      opis: '',
      linki: [
        { etykieta: 'Trafo Cafe na Instagramie', url: 'https://www.instagram.com/trafo.cafe/' }
      ],
      zdjecia: [],
      kategoria: 'jedzenie',
      tagi: ['kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'fantastyczny-hub',
      ikona: 'kostka',          // gry, warsztaty i koncert naraz
      dzien: 'sobota',
      od: '13:00', do: '19:00',
      tytul: 'Fantastyczny Hub (w programie: gry, warsztaty, koncert)',
      lokalizacja: 'bydgoska-50',
      miejsce: 'Kulturalny Hub Bydgoskiego Przedmieścia, ul. Bydgoska 50',
      opis: '',
      linki: [],
      zdjecia: ['hub1', 'hub2'],
      kategoria: 'warsztaty',
      tagi: ['wez-udzial'],
      dodatki: {}
    },

    {
      id: 'biblioteka-rewolucyjna-dzien-otwarty',
      dzien: 'sobota',
      od: '15:00', do: '19:00',
      tytul: 'Dzień Otwarty — Biblioteka Rewolucyjna',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'Biblioteka Rewolucyjna, ul. Sienkiewicza 11 (wejście od ul. Krasińskiego)',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: [],
      dodatki: {}
    },

    {
      id: 'warsztaty-ziny',
      dzien: 'sobota',
      od: '16:00', do: null,
      tytul: 'Warsztaty z robienia zinów',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'Biblioteka Rewolucyjna, ul. Sienkiewicza 11 (wejście od ul. Krasińskiego)',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['wez-udzial'],
      dodatki: {}
    },

    {
      id: 'mariani-band',
      dzien: 'sobota',
      od: '16:00', do: '20:30',
      tytul: 'Mariani Band — koncert',
      lokalizacja: 'mickiewicza-117',
      miejsce: 'ul. Mickiewicza 117 (róg ulic Mickiewicza i Reja)',
      opis: '',
      linki: [],
      zdjecia: ['mariani1', 'mariani2', 'mariani3'],
      kategoria: 'muzyka',
      tagi: [],
      dodatki: {}
    },

    {
      id: 'dotkniete-sloncem',
      dzien: 'sobota',
      od: '17:00', do: '18:00',
      tytul: 'DOTKNIĘTE SŁOŃCEM / Piotr Frąckiewicz / cyjanotypia tonowana — wernisaż i spotkanie z autorem zdjęć',
      lokalizacja: 'teatr-pokojowy',
      miejsce: 'Teatr Pokojowy, ul. Sienkiewicza 13',
      opis: 'Teatr Pokojowy | Agnieszka Niezgoda\n\nPiotr Frąckiewicz\nDOTKNIĘTE SŁOŃCEM\ncyjanotypia tonowana\n\nPiotr Frąckiewicz urodzony na Przedzamczu w Toruniu w szpitalu z widokiem na pozostałość po zamku Krzyżaków, którzy zbudowali tu miasto. Większość życia spędził na Starym Mieście. Mieszkał na Jęczmiennej, a także na Żeglarskiej - niedaleko murów obronnych miasta, tuż obok katedry Świętych Janów, gdzie bije serce Torunia czyli dzwon Tuba Dei. Pracował zawsze blisko toruńskich scen, tych teatralnych i estradowych - na Szpitalnej, na Piernikarskiej, Placu Teatralnym, na Żeglarskiej i na Kopernika. Nazywa siebie „świetlikiem”, bo oświetlał artystów sceny i estrady – aktorów i muzyków, współtworząc i realizując obrazy świetlne w spektaklach teatralnych i na koncertach estradowych. Inspiruje go światło naturalne. Mówi, że obserwacja światła jest jego wielką przyjemnością i pasją. Stąd jego miłość do fotografii. Tworząc kadry swoich małych fotograficznych dzieł, cały czas patrzy na świat przez obiektyw, jak na okno sceniczne. „Obserwacja światła powoduje refleksję, że ono coś buduje, sugeruje… w ten sposób powstają historie jakby malowane światłem”. Od fotografii teatralnej przechodzi płynnie do fotografowania natury, architektury i do portretów. Obecnie od kilkunastu lat rozwija swoje doświadczenie w starodawnej technice fotograficznej zwanej cyjanotypią. Pierwotne naświetlania klisz odbywały się z wykorzystaniem światła słonecznego… Obecnie wykorzystuje się lampy ze światłem ultrafioletowym. Jednak światło słoneczne jako siła, energia i walor estetyczny cały czas jest najważniejszym źródłem inspiracji w twórczości fotograficznej autora, ponadto „kadr jako scena” i „światło, które opowiada historię” i jest historią.\n\n„DOTKNIĘTE SŁOŃCEM” to pierwsza indywidualna wystawa Piotra Frąckiewicza urodzonego i mieszkającego całe życie w Toruniu artysty światła – toruńskiego „świetlika”.',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/7gtZMdY79' }
      ],
      zdjecia: [],
      kategoria: 'sztuka',
      tagi: [],
      dodatki: {}
    },

    {
      id: 'recital-kinga-michalak',
      dzien: 'sobota',
      od: '18:00', do: null,
      tytul: 'Recital Kingi Michalak — Piosenki, które łączą pokolenia',
      lokalizacja: 'schwartz-cafe',
      miejsce: 'Kawiarnia Schwartz Cafe, ul. Bydgoska 52',
      opis: '29 sierpnia 2026 o godzinie 18:00 zapraszamy Cię na wyjątkowy, kameralny recital pełen emocji, wspomnień i muzycznych historii. Spotkamy się w Centrum Aktywności Zawodowej | Schwartz Cafe przy ul. Bydgoskiej 52, w sercu Bydgoskiego Przedmieścia.\n\nTo będzie wieczór, w którym muzyka stanie się mostem między pokoleniami – od klasycznych melodii, które wszyscy znamy, po współczesne brzmienia 🎙️.\n\nRecital odbywa się jako wydarzenie towarzyszące Świętu Bydgoskiego Przedmieścia.\n\nJeśli chcesz być na bieżąco – znajdziesz mnie na Instagramie: @psyche.voice.\n\nDo zobaczenia na miejscu – stwórzmy razem muzyczny wieczór pełen refleksji i emocji 💕',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/aCrYb4K5F' },
        { etykieta: 'Kawiarnia na Facebooku', url: 'https://www.facebook.com/p/Zak%C5%82ad-Aktywno%C5%9Bci-Zawodowej-w-Toruniu-61585616147658/' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: [],
      dodatki: {}
    },

    {
      id: 'ribaldi-music',
      dzien: 'sobota',
      od: '19:00', do: null,
      tytul: 'Ribaldi Music — koncert',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: 'Zespół Ribaldi to cztery artystki zakochane w muzyce dawnych epok. Wykonują repertuar od średniowiecza do baroku. Piszą o sobie tak:\n\n„Cztery energiczne dziewczyny, które spotkały się po to, aby zbudować nowe, jasne, żeńskie brzmienie oparte na muzyce z wieków renesansu i baroku. Nazwa zespołu wywodzi się od włoskiego słowa Ribaldo (po polsku – rybałt), które oznacza śpiewaka wędrownego, zarabiającego na życie koncertując w karczmach i podróżując z miasta do miasta.\n\nUwielbiamy, każda na swój sposób, ekspresję muzyki dawnej. Pasjonuje nas wzbudzanie nowego życia z «martwych» manuskryptów, czyli nierzadko ręcznie zapisanych nut, w starych kluczach lub w kompletnie innym systemie dźwiękowym. Dzieła te opisują historie, które z powodu licznych metafor, odczytujemy dopiero po wielu burzliwych analizach. Bardzo często ukazuje nam się obraz człowieczeństwa, który przez stulecia pozostał taki sam.\n\nJesteśmy specjalistkami w zakresie muzyki dawnej, a także absolwentkami wokalistyki oraz instrumentalistyki takich uczelni jak Uniwersytet Muzyczny F. Chopina, Akademia Muzyczna w Krakowie, Akademia Muzyczna w Bydgoszczy czy Akademia Muzyczna w Katowicach. Indywidualnie miałyśmy przyjemność współpracować m.in. z Warszawską Operą Kameralną, Polską Operą Królewską, Capellą Cracoviensis, Ensemble Mare Nostrum / Stradella Young Project, JSB Ensemble Stuttgart, Oh!Orkiestrą Historyczną, Operą Podlaską, Il Giardino D\'amore itd.”',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://www.facebook.com/events/1570900604513593/' },
        { etykieta: 'Posłuchaj: „Señora de hermosura” (Juan del Encina)', url: 'https://www.youtube.com/watch?v=-NGY3PSKyaA' }
      ],
      zdjecia: ['ribaldi-music-1', 'ribaldi-music-2'],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      /* Wydarzenie promowane — pasek z odliczaniem na górze strony.
         Pasek znika sam po zakończeniu; jeśli promowanych jest kilka,
         pokazuje najbliższe nadchodzące. `ikona` może wskazać plik z logo,
         brak = ikona kategorii. */
      promocja: {
        haslo: 'Pierwszy koncert wieczoru',
        etykietaLinku: 'Posłuchaj',
        url: 'https://www.youtube.com/watch?v=-NGY3PSKyaA',
        ikona: null
      },
      dodatki: {}
    },

    {
      id: 'pani-jeziora',
      dzien: 'sobota',
      od: '20:00', do: null,
      tytul: 'Pani Jeziora feat. Albert Piotrowski-Pawlikowski — koncert',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: 'Pani Jeziora to projekt na gitarę i wokal, który narodził się w Warszawie, a ewoluował po przeprowadzce do Torunia. Woda stała się ważnym elementem scenicznego alterego Pani Jeziora. Jej cykl autorskich piosenek, który powstał w latach 2020-2026 to utwory z pogranicza folku i awangardowego popu. Został zainspirowany miejskimi i dzikimi krajobrazami, które składają się na wyobrażony krajobraz idealny. Piosenki są z jednej strony zanurzeniem się w dzikości, porach dnia, odą do chwili. Z drugiej strony przesiąknięte są nostalgią i tęsknotą za krajobrazem, który znika.\n\nPani Jeziora zazwyczaj koncertuje w plenerze. Czasem gra w duecie z perkusistą Maciejem Karmińskim (Jesień, Drogi Krajowe, Edyta Gepart). Tym razem po raz pierwszy wystąpi z Albertem Piotrowskim-Pawlikowskim (Zawód), który zagra na zestawie perkusyjnym.',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/5kzzgI33B' },
        { etykieta: 'Bandcamp — „Jezioro”', url: 'https://panijeziora.bandcamp.com/track/jezioro' },
        { etykieta: 'YouTube — „Na dzikiej plaży”', url: 'https://www.youtube.com/watch?v=_BBAtgekLMc' },
        { etykieta: 'Pani Jeziora na Facebooku', url: 'https://www.facebook.com/JezioraPani/' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      dodatki: {}
    },

    {
      id: 'wstyd-koncert',
      dzien: 'sobota',
      od: '21:00', do: null,
      tytul: 'WSTYD feat. Wanda Waiss — koncert',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: 'Wstyd to duet z Torunia, który zaczynał jako eksperyment z pogranicza muzyki konkretnej i spoken word. Ich debiut – „Polskie obozy życia” – był osobliwym słuchowiskiem: surowym, intymnym, poetycko-gorączkowym i dość hermetycznym w formie i treści. Fakt, że na swojej drugiej płycie „Lechian paradise” postawili na piosenki można odczytywać jako złożenie broni przez szermierzy awangardy, albo jako konceptualną prowokację. Efektem jest muzyka osadzona w rytmie, gitarowa i cielesna. Cielesna w sensie, że trochę z trzewi, a trochę pod nóżkę.\n\nLech Nienartowicz i Rafał Derda nie grają piosenek. Oni je egzorcyzmują. W ich utworach słychać resztki snów o wspólnocie i echa krzyków z ulicznych pochodów. Polska – taka, jaką znamy z marszów, blokowisk, wiadomości – powraca tu jako duch, który nas otacza i nie chce odejść. Bity, gitara, słowo – wszystko tu pracuje jak narzędzia obrzędu, który jest jednocześnie krytyką i rytuałem.\n\nBohaterowie utworów Wstydu poruszają się po mapie późnego kapitalizmu, gdzie towarem może być wszystko, a rytuały zastępują myślenie.\n\nWanda WAISS// porusza się na styku industrialu, elektroniki i eksperymentalnego popu, tworząc muzykę o silnym ładunku emocjonalnym i filmowej wyobraźni. Jej brzmienie łączy mechaniczne struktury z intymnym wokalem, hipnotycznymi melodiami. Wanda buduje język oparty na kontraście: surowości i zmysłowości, minimalizmu i niepokoju. Gęste, sensualne i niejednoznaczne atmosfery, w których granica między bliskością a dystansem, kontrolą a utratą kontroli, stale się zaciera. Album Wandy Waiss powstał we współpracy z producentem Szymonem Szwarcem (Rozwód, Ski, Jesień), który w swoich kompozycjach łączy surową elektronikę i emocjonalny minimalizm.',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/7mVqjrBHC' },
        { etykieta: 'Bandcamp — „Lechian paradise”', url: 'https://wstyd.bandcamp.com/album/lechian-paradise' },
        { etykieta: 'WSTYD na Facebooku', url: 'https://www.facebook.com/wstydduo' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      dodatki: {}
    },

    /* ———————————————————— NIEDZIELA ———————————————————— */

    {
      id: 'kawka-za-kantem',
      dzien: 'niedziela',
      od: '10:00', do: '11:00',
      tytul: 'cafe za KANTem — kawka dla mieszkańców na podwórku',
      lokalizacja: 'cafe-za-kantem',
      miejsce: 'Podwórko, ul. Mickiewicza 34/36',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: ['na-dworze', 'kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'butik-niedziela',
      dzien: 'niedziela',
      od: '10:00', do: '19:00',
      tytul: 'XVII Święto Bydgoskiego Przedmieścia z „Naszym Butikiem”',
      lokalizacja: 'mickiewicza-112',
      miejsce: 'Nasz Butik – sklep charytatywny',
      opis: 'Z okazji Święta Bydgoskiego Przedmieścia przygotowaliśmy dla Was dwa dni pełne dobrej atmosfery. Wpadnijcie na chwilę lub zostańcie z nami na dłużej! ☕🎶\n\nCzeka na Was:\n🌿 darmowa kawa, herbata i lemoniada,\n🎵 dobra muzyka,\n💬 ciekawe rozmowy,\n👗 wyjątkowe ubrania, dodatki, biżuteria, porcelana i wiele innych perełek w świetnych cenach.\n🕙 Podczas Święta Bydgoskiego Przedmieścia butik będzie otwarty w godzinach 10:00–19:00.\n\nKażdy zakup ma znaczenie – cały zysk przekazujemy na działania Stowarzyszenia Serce Torunia, wspierając osoby w kryzysie bezdomności. To zakupy, które naprawdę zmieniają życie. ❤️\n\n📍 Nasz Butik – sklep charytatywny\nul. Mickiewicza 112, 87-100 Toruń\n\nZaproście rodzinę i znajomych – do zobaczenia podczas XVII Święta Bydgoskiego Przedmieścia!',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/67ub5YQTd' }
      ],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: ['kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'pchli-targ',
      dzien: 'niedziela',
      od: '10:00', do: '14:00',
      tytul: 'Pchli Targ na Bydgoskim',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'Domkultury Bydgoskie Przedmieście, ul. Sienkiewicza 11',
      opis: 'Zapraszamy na kolejne wydarzenie społeczne w ramach Święta Bydgoskiego Przedmieścia.\n\nZrób letnie porządki i wystaw niepotrzebne elementy, atrybuty, artefakty, ciuszki, książki i inne skarby na naszym corocznym pchlim targu. Targ odbywa się w ogrodzie i na chodniku przed Domkultury (ul. Sienkiewicza 11).',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/gaela87dZ' }
      ],
      zdjecia: ['pchli1', 'pchli2', 'pchli3'],
      kategoria: 'sasiedzkie',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'kofeina-niedziela',
      dzien: 'niedziela',
      od: '10:00', do: '18:00',
      tytul: 'Kofeina dla starszaków z Trafo Cafe',
      lokalizacja: 'trafo-cafe',
      miejsce: 'Trafo Cafe',
      opis: '',
      linki: [
        { etykieta: 'Trafo Cafe na Instagramie', url: 'https://www.instagram.com/trafo.cafe/' }
      ],
      zdjecia: [],
      kategoria: 'jedzenie',
      tagi: ['kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'wyprowadz-psa',
      dzien: 'niedziela',
      od: '12:00', do: '15:00',
      tytul: 'Bydgoskie Świętuje — Akcja Wyprowadź psa',
      lokalizacja: 'schronisko',
      miejsce: 'Schronisko dla Bezdomnych Zwierząt w Toruniu, ul. Przybyszewskiego 3',
      opis: '',
      linki: [
        { etykieta: 'Schronisko na Facebooku', url: 'https://www.facebook.com/schronisko.torun' }
      ],
      zdjecia: ['pies1', 'pies2', 'pies3'],
      kategoria: 'sasiedzkie',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'festyn-garazowka',
      dzien: 'niedziela',
      /* Dokument organizatorów podaje 12:00-19:00, ale organizator potwierdził,
         że festyn kończy się o 17:00. Zapisujemy stan faktyczny, nie zapis
         z pliku — to jedyne miejsce, gdzie dane rozjeżdżają się ze źródłem. */
      od: '12:00', do: '17:00',
      tytul: 'Festyn Rodzinny — Garażówka z Hubem',
      lokalizacja: 'bydgoska-50',
      miejsce: 'Kulturalny Hub Bydgoskiego Przedmieścia, ul. Bydgoska 50',
      opis: '',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/7jU7JuMD2' }
      ],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['dla-dzieci'],
      dodatki: {}
    },

    {
      id: 'moja-okolica-w-sztuce',
      ikona: 'pedzel',
      dzien: 'niedziela',
      od: '13:30', do: '16:00',
      tytul: 'Moja okolica w sztuce — warsztaty w ramach projektu Sztuka w kieszeni',
      lokalizacja: 'dziedziniec-wsp',
      miejsce: 'Dziedziniec Wydziału Sztuk Pięknych, ul. Sienkiewicza 30/32',
      opis: '„Moja okolica w sztuce” to warsztaty prowadzone przez koło Nadruk z Katedry Projektowania Graficznego UMK. W ramach zajęć zachęcamy do kreatywnego spędzania czasu. Razem stworzymy prace, na których zostanie uwieczniona okolica Przedmieść Bydgoskich.',
      linki: [],
      zdjecia: ['sztuki1', 'sztuki2', 'sztuki3'],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'ale-cyrk',
      ikona: 'kula',            // cyrk to nie nożyczki
      dzien: 'niedziela',
      od: '14:00', do: '16:00',
      tytul: 'Ale cyrk! — warsztaty cyrkowe',
      lokalizacja: 'park-przy-trafo',
      miejsce: 'Park Miejski, okolice Trafo Cafe',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'gastrorakieta',
      dzien: 'niedziela',
      od: '15:00', do: null,
      tytul: 'Gastrorakieta, czyli UCZTA na Bydgoskim!',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'Teren przed Domkultury, ul. Sienkiewicza 11',
      opis: 'GASTRORAKIETA!, czyli UCZTA na Bydgoskim to swobodne nawiązanie do restauracyjnych tradycji Bydgoskiego Przedmieścia.\n\n30 sierpnia zapraszamy sąsiadów, mieszkańców oraz sympatyków Bydgoskiego Przedmieścia na nieczwartkowy obiad proszony.\n\nTego dnia teren przed Domkultury_BYDGOSKIE Przedmieście przeobrazi się w eksperymentalny, zewnętrzny obiekt restauracyjny. Lokalnych smakoszy, gości oraz osobników żądnych przygód zapraszamy już od godz. 15:00.\n\nMożna przyprowadzić rodzinę, pieska, przyjaciela lub przyjaciółkę. Można przyjść z własnym wypiekiem, talerzem, siedziskiem, stołem lub widelcem. Rozmaite kombinacje i uśmiechy mile widziane.\n\nObiad jest wegański, częściowo bez glutenu 😉\n\nGASTRORAKIETA! to eksperymentalny projekt kulinarny, rodzaj kuchni społecznej, otwartej na interakcje, propozycje, fuzje smakowe i kulturowe.\n\nSpotkajmy się, posilmy się. Świętujmy.',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/88IQEkF5s' }
      ],
      zdjecia: ['obiad1', 'obiad2', 'obiad3'],
      kategoria: 'jedzenie',
      tagi: ['na-dworze', 'wez-udzial', 'kawa-jedzenie'],
      dodatki: {}
    },

    {
      id: 'lekcja-tanga',
      ikona: 'taniec',
      dzien: 'niedziela',
      od: '16:00', do: null,
      tytul: 'Otwarta lekcja tanga argentyńskiego',
      lokalizacja: 'fontanna',
      miejsce: 'Park Miejski na Bydgoskim Przedmieściu (fontanna)',
      opis: 'Milonga jest spotkaniem towarzyskim połączonym ze wspólnym tańcem. To rodzaj potańcówki albo dancingu, jednak:\n- do tańca proponowane są wyłącznie tanga argentyńskie\n- uczestnicy tańczą ze sobą kilka utworów, a potem zmieniają się w parach\n- ważna jest sfera nietaneczna poza parkietem - rozmowy i opowieści, czasem wspólne posiłki, dobre i nieśpieszne spędzanie czasu',
      linki: [
        { etykieta: 'Tango, milongi i toruńska społeczność', url: 'https://www.tangomilonga.pl/' }
      ],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'spacer-modernistyczny',
      dzien: 'niedziela',
      od: '16:30', do: null,
      tytul: 'Nie wszystko złoto, co ma gzyms — modernistyczny spacer po Bydgoskim Przedmieściu z Anną Lamers',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'Start: Domkultury Bydgoskie Przedmieście, ul. Sienkiewicza 11/2',
      opis: 'Nie wszystko złoto, co ma gzyms - modernistyczny spacer po Bydgoskim Przedmieściu\n\nstart: Domkultury! Bydgoskie Przedmieście ul. Sienkiewicza 11/2\n\nDrodzy/Drogie!\n\nNo dobrze… napatrzyliśmy się już na cegły, drewno, detale i ozdoby. Czas na architekturę, która z pozoru wygląda tak, jakby projektantowi skończyły się pomysły. Proste bryły, płaskie dachy i zero dekoracji. A jednak to właśnie takie budynki zmieniły sposób myślenia o mieście.\n\nProwadzenie:\nAnna Lamers - aktywistka, znana miłośniczka architektury i alternatywna przewodniczka',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/7YaYuy5oe' },
        { etykieta: 'Kanał Ani na YouTube', url: 'https://www.youtube.com/@anialamers5023' }
      ],
      zdjecia: ['spacer1', 'spacer2', 'spacer3'],
      kategoria: 'sztuka',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'milonga',
      dzien: 'niedziela',
      od: '17:00', do: null,
      tytul: 'Milonga Mercurio Aires — tańczymy tango',
      lokalizacja: 'fontanna',
      miejsce: 'Park Miejski na Bydgoskim Przedmieściu (fontanna)',
      opis: 'Aires oznacza powietrze. Milonga Mercurio Aires, to spotkania odbywające się drugi rok podczas lata, w niedziele w magicznym Amfiteatrze w Parku na Bydgoskim Przedmieściu w Toruniu. Ten przepiękny plenerowy teren otoczony zielenią, pełen historii i klimatu, tworzy wyjątkową atmosferę dla naszych tanecznych spotkań. Otwarte niebo, świeże powietrze i nieodłączne tango będą nam towarzyszyć przez cały wieczór.',
      linki: [
        { etykieta: 'Tango, milongi i toruńska społeczność', url: 'https://www.tangomilonga.pl/' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },

    {
      id: 'connected-by-midi',
      dzien: 'niedziela',
      od: '18:00', do: '22:00',
      tytul: 'CONNECTED by MIDI — showcase toruńskiej muzyki elektronicznej',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: 'Wydarzenie w ramach Święta Bydgoskiego Przedmieścia.\nWstęp wolny.\n\nCONNECTED by MIDI to otwarte wydarzenie poświęcone niezależnej muzyce elektronicznej w Toruniu.\n\nJego celem jest wyszukiwanie, prezentowanie i łączenie artystów, którzy tworzą przede wszystkim z potrzeby ekspresji, poza komercyjnymi schematami i trendami.\n\nWydarzenie łączy osoby, które szukają własnego języka, eksperymentują z dźwiękiem i konsekwentnie rozwijają swoje pomysły. Zarówno tych, którzy mają już doświadczenie sceniczne, jak i twórców działających dotąd głównie w swoich domowych studiach.\n\nTo przestrzeń dla różnych odmian i form autorskiej muzyki elektronicznej.\n\nArtyści:\nKORBA (IDM)\nŁUKASZ HURRIC (ambient/noise/impro)\nKIEDYŚTERAZ (dark ambient + poezja)\nTOMASZ CEBO (audio performance)\nOBSOLE+E (ambient beats)\nDEAFHEARING (dub/tech)',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/7WVkcLxOE' },
        { etykieta: 'connectedbymidi.com', url: 'https://www.connectedbymidi.com/' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      dodatki: {}
    },

    {
      id: 'premiera-teledysku-wstyd',
      dzien: 'niedziela',
      od: '19:00', do: null,
      tytul: 'Premiera teledysku zespołu WSTYD + koncert — Muzyka zrobiona w pokoju',
      lokalizacja: 'sienkiewicza-11',
      miejsce: 'ul. Sienkiewicza 11',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: [],
      dodatki: {}
    },

    /* ── SUPERfestyn! ── */

    {
      id: 'sf-familijny-spektakl-teatru-pomaranczowy',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Familijny spektakl Teatru Pomarańczowy Cylinder “Leśne opowieści”',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'sztuka',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-rodzinna-joga-w-parku',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Rodzinna joga w parku',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-kolorowe-warkoczyki-splatanie-dopinane',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Kolorowe warkoczyki - splatanie, dopinane, kolorowanie',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-skrecanie-balonow-w-jamniki',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Skręcanie balonów w jamniki, żyrafy, węże, miecze, kwiaty - według potrzeb',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-otwarte-warsztaty-mulinowych-bransoletek',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Otwarte warsztaty mulinowych bransoletek',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-franczesko-watolini-czestuje-wata',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Franczesko Watolini częstuje watą cukrową',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'jedzenie',
      tagi: ['na-dworze', 'kawa-jedzenie'],
      dodatki: {}
    },
    {
      id: 'sf-dmuchance',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '10:00', do: null,
      tytul: 'Dmuchańce',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-zabawy-ze-zwierzetami-animacje',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '11:00', do: null,
      tytul: 'Zabawy ze zwierzętami - animacje i szalone konkursy z Pomarańczowym Cylindrem',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-malowanie-twarzy-dla-dzieci',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '11:00', do: null,
      tytul: 'Malowanie twarzy dla dzieci',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-strefa-gracza-analogowego',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '11:00', do: null,
      tytul: 'Strefa gracza analogowego',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-strefa-tkania-warsztaty',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '11:00', do: null,
      tytul: 'Strefa Tkania - warsztaty',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-szarrrpaki-warsztaty-tworzenia-zabawek',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '11:00', do: null,
      tytul: 'SZARRRPAKI - warsztaty tworzenia zabawek dla psów',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-torunska-orkiestra-improwizowana-gra',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '12:00', do: null,
      tytul: 'Toruńska Orkiestra Improwizowana gra do kultowych polskich animacji',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/8Ocr1hzsn' }
      ],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      dodatki: {}
    },
    {
      id: 'sf-olena-gaidychuk-solo-chorek',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '12:30', do: null,
      tytul: 'Olena Gaidychuk solo, Chórek Dziecięcy "Światełka", zespół żeński "Głos serca" - występ',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'muzyka',
      tagi: ['na-dworze'],
      dodatki: {}
    },
    {
      id: 'sf-kultura-gry-w-pilke',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '12:30', do: null,
      tytul: 'Kultura gry w piłkę - piłka nożna - mecz familijny',
      lokalizacja: 'boisko',
      miejsce: 'Boisko do piłki nożnej w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-bike-cafe-kofeina-dla',
      nurt: 'superfestyn',
      dzien: 'sobota',
      od: '12:30', do: null,
      tytul: 'Bike Cafe - kofeina dla starszaków // Chwastbistro ! - kulinarne co nieco na dziko',
      lokalizacja: 'amfiteatr',
      miejsce: 'Amfiteatr w Parku Miejskim',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'jedzenie',
      tagi: ['na-dworze', 'kawa-jedzenie'],
      dodatki: {}
    },
    {
      id: 'sf-ekologiczny-kolaz-miejski-warsztaty',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'Ekologiczny Kolaż Miejski - warsztaty tworzenia unikalnych vlepek w duchu “ekointerwencji"',
      lokalizacja: 'trafo-cafe',
      miejsce: 'Trafo Cafe',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-david-olesh-pokaz-iluzji',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'David Olesh - pokaz iluzji',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/6pgT9qr7p' }
      ],
      zdjecia: [],
      kategoria: 'sztuka',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-kolorowe-warkoczyki-splatanie-dopinane-2',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'Kolorowe warkoczyki - splatanie, dopinane, kolorowanie',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-skrecanie-balonow-w-jamniki-2',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'Skręcanie balonów w jamniki, żyrafy, węże, miecze, kwiaty - według potrzeb',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-let-s-skate-deskorolkowe',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'Let’s skate! - deskorolkowe parabole',
      lokalizacja: 'fontanna',
      miejsce: 'Park Miejski – fontanna',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-kredowisko-w-parku-spontaniczne',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '10:00', do: null,
      tytul: 'Kredowisko w parku - spontaniczne akcje rysownicze',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/4gMR9j1ww' }
      ],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-wspolna-akcja-malarska-malowanie',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '11:00', do: null,
      tytul: 'Wspólna akcja malarska - malowanie gigantycznego obrazu w otwartej przestrzeni',
      lokalizacja: 'trafo-cafe',
      miejsce: 'Trafo Cafe',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-plasy-na-densflorze-potancowka',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '11:00', do: null,
      tytul: 'Pląsy na densflorze - potańcówka dla najmłodszych dzieci i ich rodziców',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-banki-banieczki-warsztaty-i',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '11:00', do: null,
      tytul: 'Bańki, banieczki - warsztaty i pokaz',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'warsztaty',
      tagi: ['na-dworze', 'wez-udzial'],
      dodatki: {}
    },
    {
      id: 'sf-airshow-papierowych-samolotow',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '12:00', do: null,
      tytul: 'AirShow papierowych samolotów',
      lokalizacja: 'pomnik-balonowy',
      miejsce: 'Okolice Pomnika Żołnierzy Wojsk Balonowych',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'dzieci',
      tagi: ['na-dworze', 'dla-dzieci'],
      dodatki: {}
    },
    {
      id: 'sf-spacer-dendrologiczny-z-fundacja',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '12:30', do: null,
      tytul: 'Spacer dendrologiczny z Fundacją Zielone Kujawy',
      lokalizacja: 'trafo-cafe',
      miejsce: 'Trafo Cafe',
      opis: '',
      linki: [
        { etykieta: 'Wydarzenie na Facebooku', url: 'https://fb.me/e/79aS8rrlf' }
      ],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: ['na-dworze'],
      dodatki: {}
    },
    {
      id: 'sf-spacery-szczudlarzy-po-parku',
      nurt: 'superfestyn',
      dzien: 'niedziela',
      od: '12:30', do: null,
      tytul: 'Spacery szczudlarzy po parku',
      lokalizacja: 'aleja-parkowa',
      miejsce: 'Aleja parkowa między fontanną a pomnikiem',
      opis: '',
      linki: [],
      zdjecia: [],
      kategoria: 'sasiedzkie',
      tagi: ['na-dworze'],
      dodatki: {}
    }

  ],

  /* O NAS — tekst fundacji, jej własnymi słowami. Usunięcie tego pola
     zdejmuje sekcję z dolnego paska. */
  onas: {
    naglowek: 'Lucid Academy',
    /* Tło logo (#EED5B3) jest dobrane pod papier mapy (#EBD9B7), więc wtapia
       się bez obwódki. `logoMale` pokazuje się także w nagłówku strony. */
    logo: 'img/logo.jpg',
    logoMale: 'img/logo-mini.jpg',
    tresc: 'Lucid Academy — toruńska fundacja łącząca edukację AI z kulturą i lokalną wspólnotą. Uczymy rozumieć sztuczną inteligencję i zamieniamy te umiejętności w narzędzia i wydarzenia dla wspólnoty — tę mapę też zrobiliśmy my :)\n\nKoncert Ribaldi Music w amfiteatrze w Parku Miejskim (sobota, 19:00) to również inicjatywa fundacji — wspieramy artystki, a dodatkowe honoraria zbieramy wśród przedsiębiorców z Bydgoskiego i regionu.',
    kontakt: {
      wstep: 'Chcesz z nami współpracować albo wesprzeć to, co robimy? A może coś na mapie nie działa, czegoś brakuje lub da się zrobić lepiej? Napisz — czytamy wszystko.',
      etykieta: 'Napisz do nas',
      email: 'piotr.jarczyk.ai@gmail.com',
      temat: 'Mapa Święta Bydgoskiego Przedmieścia — uwagi'
    },
    formularz: null      // link do formularza, gdyby powstał — pokaże się obok e-maila
  },

  /* PRZYJACIELE ŚWIĘTA — instytucje z dzielnicy, które wsparły fundację.
     To NIE są wydarzenia: mają własną sekcję i własne, dyskretne znaczniki
     na mapie, żeby nikt nie wziął ich za punkty programu i nie poszedł
     pod zamknięte drzwi.

     `pomoc` i `otwarte` zostają puste, dopóki nie wiemy — brak informacji
     jest lepszy niż zmyślona. */
  przyjaciele: {
    wstep: 'Miejsca i instytucje z Bydgoskiego Przedmieścia, dzięki którym w sobotni wieczór zabrzmi w amfiteatrze Ribaldi Music. Na co dzień trzymają stronę artystów i dzielnicowej tradycji.',
    lista: [
      {
        nazwa: 'Trafo Cafe',
        adres: 'ul. Konopnickiej 9a',
        gps: { lat: 53.0096558, lng: 18.5851306 },
        zrodloGps: 'ta sama pinezka co lokalizacja wydarzeń; OSM potwierdza miejsce „Trafo Cafe” przy ul. Konopnickiej',
        pomoc: null,
        otwarte: 'W oba dni święta gości „Kofeinę dla starszaków”.',
        url: 'https://www.instagram.com/trafo.cafe/'
      },
      {
        nazwa: 'Rada Okręgu nr 13 Bydgoskie Przedmieście',
        adres: 'ul. Krasińskiego 45/47',
        gps: { lat: 53.010807, lng: 18.586444 },
        zrodloGps: 'OpenStreetMap, wyszukane po nazwie; reverse geocoding: Zygmunta Krasińskiego 45/47, Bydgoskie Przedmieście',
        pomoc: null,
        otwarte: null,
        url: null
      },
      {
        // Piszą się z kropką — MIKS.TURA — sprawdzone na ich stronie.
        nazwa: 'MIKS.TURA Architekci',
        adres: 'ul. Mickiewicza 112/1U',
        gps: { lat: 53.012051, lng: 18.577295 },
        zrodloGps: 'zgeokodowany adres podany przez organizatora; reverse geocoding OSM: Adama Mickiewicza 112, Bydgoskie Przedmieście. Ta sama kamienica co Nasz Butik.',
        pomoc: null,
        otwarte: null,
        url: 'https://www.mikstura-architekci.pl/'
      },
      {
        nazwa: 'Kulturalny Hub Bydgoskiego Przedmieścia',
        adres: 'ul. Bydgoska 50',
        gps: { lat: 53.0099895, lng: 18.5838485 },
        zrodloGps: 'ta sama pinezka co lokalizacja wydarzeń bydgoska-50; reverse geocoding OSM: Bydgoska 50',
        pomoc: null,
        otwarte: 'W oba dni święta gospodarz wydarzeń przy Bydgoskiej 50.',
        url: null
      },
      {
        nazwa: 'Kwiaciarnia Kwiatostany',
        adres: 'ul. Sienkiewicza 2',
        gps: { lat: 53.010177, lng: 18.580274 },
        zrodloGps: 'adres potwierdzony w kilku niezależnych spisach firm; reverse geocoding OSM: Henryka Sienkiewicza 2, Bydgoskie Przedmieście',
        pomoc: null,
        otwarte: null,   // spisy firm podają sob. 10–14, ale nie potwierdziłem tego u źródła
        url: 'https://www.instagram.com/kwiatostany.warsztat/'
      },
      {
        nazwa: 'Centrum Stomatologii Familydent',
        adres: 'ul. Bydgoska 35',
        gps: { lat: 53.009605, lng: 18.58733 },
        zrodloGps: 'zgeokodowany adres podany przez organizatora; reverse geocoding OSM: Bydgoska 35, Rybaki',
        pomoc: null,
        otwarte: 'W dni święta nieczynne — gabinet pracuje od poniedziałku do piątku.',
        url: 'https://familydent.eu/'
      }
    ]
  },

  /* Spis luk w programie. Sekcja „czego jeszcze nie wiemy” została zdjęta
     z interfejsu przy publikacji — dane zostają, bo opisują stan faktyczny
     i wystarczy jedna linijka, żeby ją przywrócić. */
  luki: [
    {
      id: 'brak-opisow',
      tytul: 'Trzynaście wydarzeń nie ma jeszcze opisu',
      tresc: 'Organizatorzy podali dla nich tylko tytuł, godzinę i miejsce. Dotyczy m.in. dnia otwartego w Bibliotece, Fantastycznego Hubu, koncertu Mariani Band, Kofeiny dla starszaków, warsztatów cyrkowych i premiery teledysku WSTYD. Część z nich opisu po prostu nie dostanie.'
    },
    {
      id: 'godziny-zakonczenia',
      tytul: 'Dziesięć wydarzeń nie ma godziny zakończenia',
      tresc: 'Program podaje dla nich tylko godzinę rozpoczęcia. Planer liczy w takim wypadku czas przejścia od godziny startu.'
    },
    {
      id: 'cyrk-lokalizacja',
      tytul: 'Pin warsztatów „Ale cyrk!” jest przybliżony',
      tresc: 'Program podaje „Park Miejski, okolice Trafo Cafe”, ale bez pinezki. Pin stoi na Trafo Cafe — warsztaty odbędą się gdzieś w pobliżu, w parku.'
    },
    {
      id: 'sienkiewicza-11-teledysk',
      tytul: 'Premiera teledysku WSTYD — nie wiadomo, w którym miejscu przy Sienkiewicza 11',
      tresc: 'Pod tym adresem działają zarówno Domkultury, jak i Biblioteka Rewolucyjna z wejściem od ul. Krasińskiego. Program podaje sam adres.'
    }
  ]
};
