'use strict';

(function () {
  // =============================================
  // NAWIGACJA
  // =============================================
  const nav        = document.getElementById('main-nav');
  const hamburger  = document.getElementById('nav-hamburger');
  const navLinks   = document.getElementById('nav-links');
  const navLinkEls = document.querySelectorAll('.nav-link');
  const logo       = document.querySelector('.nav-logo');

  hamburger.addEventListener('click', () => {
    const opening = !hamburger.classList.contains('is-open');
    hamburger.classList.toggle('is-open', opening);
    navLinks.classList.toggle('is-open', opening);
    hamburger.setAttribute('aria-expanded', String(opening));
    hamburger.setAttribute('aria-label', opening ? 'Zamknij menu nawigacji' : 'Otwórz menu nawigacji');
  });

  navLinkEls.forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('is-open');
      navLinks.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Otwórz menu nawigacji');
    });
  });

  logo.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Aktywny link w nav (Intersection Observer)
  const sections    = document.querySelectorAll('section[id]');
  const setActive   = (id) => navLinkEls.forEach((l) =>
    l.classList.toggle('active', l.getAttribute('href') === `#${id}`)
  );
  const sectionObs  = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
  sections.forEach((s) => sectionObs.observe(s));

  // Topbar glassmorphism po scrollu
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// =============================================
// HERO — scroll-driven sun brightening
// =============================================
(function () {
  const stage = document.querySelector('.hero-stage');
  if (!stage || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const sunBack  = stage.querySelector('.hero-sun--back');
  const sunFront = stage.querySelector('.hero-sun--front');
  const city     = stage.querySelector('.hero-city');

  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    const cityProxy = { b: 0.64, s: 0.90 };

    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });

    tl
      .to(sunBack,  { opacity: 0.88, top: '47%', duration: 1 }, 0)
      .to(sunFront, { opacity: 0.36,              duration: 1 }, 0)
      .to(cityProxy, {
        b: 0.92, s: 1.08, duration: 1,
        onUpdate() {
          city.style.setProperty('--city-b', cityProxy.b.toFixed(3));
          city.style.setProperty('--city-s', cityProxy.s.toFixed(3));
        },
      }, 0);

    return () => {
      gsap.set([sunBack, sunFront], { clearProps: 'all' });
      city.style.removeProperty('--city-b');
      city.style.removeProperty('--city-s');
    };
  });
}());

// =============================================
// TIMELINE — linia światła (draw-on-scroll + węzły)
// =============================================
(function () {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  // 1) Rysowanie linii ze scrollem — scrub ustawia --line-progress (0–1).
  //    Tylko gdy użytkownik nie prosi o ograniczenie ruchu; w przeciwnym
  //    razie CSS (reduced-motion) trzyma linię w pełni narysowaną.
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const proxy = { p: 0 };
      const uniwersytetSection = document.querySelector('#uniwersytet');
      const endTarget = uniwersytetSection ? '#uniwersytet top top' : 'bottom bottom';

      const tween = gsap.to(proxy, {
        p: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: timeline,
          start: 'top center',
          end: endTarget,
          scrub: 0.6,
        },
        onUpdate() {
          timeline.style.setProperty('--line-progress', proxy.p.toFixed(4));
        },
      });

      return () => {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        timeline.style.removeProperty('--line-progress');
      };
    });
  }

  // 2) Zapalanie węzłów + reveal kart, gdy linia do nich dochodzi.
  //    Jednorazowo — przebyty ślad zostaje zapalony (narracja drogi).
  const sections = timeline.querySelectorAll('section[id]');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const node = e.target.querySelector('.timeline-node');
      const card = e.target.querySelector('.section-card, .content-section');
      if (node) node.classList.add('is-lit');
      if (card) card.classList.add('is-revealed');
      revealObs.unobserve(e.target);
    });
  // Długie sekcje mobilne mogą być wyższe niż kilka viewportów, więc wysoki
  // próg procentowy nigdy nie zostanie osiągnięty i treść zostałaby niewidoczna.
  }, { rootMargin: '0px 0px -35% 0px', threshold: 0.01 });

  sections.forEach((s) => revealObs.observe(s));
}());

// =============================================
// MISJA — SVG fork draw-on-scroll + oświetlanie węzłów
// =============================================
(function () {
  const section = document.querySelector('#misja');
  if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const mergeNode   = section.querySelector('.misja-merge-node');
  const forkNodes   = section.querySelectorAll('.misja-fork-node');
  const pillarCards = section.querySelectorAll('.misja-pillar-card');

  // Reduced-motion: ujawnij wszystko od razu
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.style.setProperty('--misja-progress', '1');
    forkNodes.forEach((n) => n.classList.add('is-lit'));
    pillarCards.forEach((c) => c.classList.add('is-revealed'));
    mergeNode?.classList.add('is-lit');
    return;
  }

  let branchLit = false, mergeLit = false;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top center',
        end: 'bottom bottom',
        scrub: 0.5,
      },
      onUpdate() {
        const p = proxy.p;
        section.style.setProperty('--misja-progress', p.toFixed(4));

        // Pozioma belka dochodzi do węzłów bocznych (~32% postępu ścieżki).
        // Przy ~35% linia jest dość daleko — zapalamy węzły + karty.
        if (p > 0.35 && !branchLit) {
          branchLit = true;
          forkNodes.forEach((n) => n.classList.add('is-lit'));
          pillarCards.forEach((c) => c.classList.add('is-revealed'));
        }

        // Węzeł scalenia zapala się gdy gałęzie wracają do centrum (~85%)
        if (p > 0.85 && !mergeLit) {
          mergeLit = true;
          mergeNode?.classList.add('is-lit');
        }
      },
    });

    return () => {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      section.style.removeProperty('--misja-progress');
    };
  });
}());

// =============================================
// LASER SPOTLIGHT — kafelek staje się głównym
// Każdy kafelek po kliknięciu wyłania się jako solowy panel
// na środku sceny, z laserową wiązką i scanline.
// Działa też klawiaturą (Enter/Spacja), strzałki = prev/next,
// Esc = zamknij. Bez ruszania istniejących animacji GSAP.
// =============================================
(function () {
  // Selektory kafelków, które mają stawać się "głównym" elementem.
  const TILE_SELECTORS = [
    '.offer-stack .offer-item',
    '.learning-modules .text-block',
    '.duo-grid .text-panel',
    '.program-list > article',
    '.activity-roadmap .roadmap-group'
  ];

  const tiles = [];
  TILE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!tiles.includes(el)) tiles.push(el);
    });
  });
  tiles.sort((a, b) => {
    if (a === b) return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });
  if (!tiles.length) return;

  // Uczyń kafelki dostępnymi i klikalnymi.
  tiles.forEach((tile, i) => {
    tile.classList.add('laser-tile');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('role', 'button');
    const title = tile.querySelector('h3, .status-label');
    const label = title ? title.textContent.trim() : `Kafelek ${i + 1}`;
    tile.setAttribute('aria-label', `${label} — pokaż jako główny`);
    tile.dataset.laserIndex = String(i);

    if (tile.dataset.laserArt) {
      tile.classList.add('has-laser-art');
      tile.style.setProperty(
        '--laser-thumb',
        `url("${tile.dataset.laserArt}")`
      );
    }
  });

  // Zbuduj overlay raz.
  const overlay = document.createElement('div');
  overlay.className = 'laser-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Wyróżniony kafelek');
  overlay.innerHTML =
    '<div class="laser-panel" role="document">' +
      '<button class="laser-close" type="button" aria-label="Zamknij">✕</button>' +
      '<div class="laser-panel__body"></div>' +
      '<div class="laser-nav">' +
        '<button class="laser-prev" type="button" aria-label="Poprzedni">‹ Poprzedni</button>' +
        '<span class="laser-nav__count" aria-live="polite"></span>' +
        '<button class="laser-next" type="button" aria-label="Następny">Następny ›</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const panel    = overlay.querySelector('.laser-panel');
  const body     = overlay.querySelector('.laser-panel__body');
  const closeBtn = overlay.querySelector('.laser-close');
  const prevBtn  = overlay.querySelector('.laser-prev');
  const nextBtn  = overlay.querySelector('.laser-next');
  const counter  = overlay.querySelector('.laser-nav__count');

  let current = -1;
  let lastFocused = null;

  const fillPanel = (index) => {
    const tile = tiles[index];
    if (!tile) return;
    const panelTitle = tile.querySelector('h3, .status-label');
    // Klonujemy treść kafelka (bez klas afordancji), aby panel był solowy.
    const clone = tile.cloneNode(true);
    clone.classList.remove('laser-tile', 'is-launching');
    clone.removeAttribute('tabindex');
    clone.removeAttribute('role');
    clone.removeAttribute('aria-label');
    clone.style.cssText = ''; // czysty layout w panelu
    body.innerHTML = '';

    if (tile.dataset.laserArt) {
      const visual = document.createElement('figure');
      visual.className = 'laser-art';

      const image = document.createElement('img');
      image.src = tile.dataset.laserArt;
      image.alt = panelTitle
        ? `Abstrakcyjna ilustracja dla tematu: ${panelTitle.textContent.trim()}`
        : 'Abstrakcyjna ilustracja związana ze sztuczną inteligencją';
      image.width = 1536;
      image.height = 1024;
      image.decoding = 'async';

      const caption = document.createElement('figcaption');
      caption.textContent = tile.dataset.laserTag || 'Lucid Academy / AI';

      visual.append(image, caption);
      body.appendChild(visual);
    }

    const copy = document.createElement('div');
    copy.className = 'laser-panel__copy';
    copy.appendChild(clone);
    body.appendChild(copy);

    counter.textContent = `${index + 1} / ${tiles.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === tiles.length - 1;
  };

  const open = (index) => {
    lastFocused = document.activeElement;
    current = index;
    // Ślad lasera na źródłowym kafelku.
    tiles.forEach((t) => t.classList.remove('is-launching'));
    tiles[index].classList.add('is-launching');

    fillPanel(index);
    overlay.classList.add('is-active');
    // wymuś reflow przed klasą is-shown, by transition wystartował
    void overlay.offsetWidth;
    overlay.classList.add('is-shown');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => {
    overlay.classList.remove('is-shown');
    document.body.style.overflow = '';
    tiles.forEach((t) => t.classList.remove('is-launching'));
    const done = () => {
      overlay.classList.remove('is-active');
      overlay.removeEventListener('transitionend', done);
    };
    overlay.addEventListener('transitionend', done);
    // fallback gdyby transitionend nie odpalił
    setTimeout(done, 500);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    current = -1;
  };

  const go = (delta) => {
    const next = current + delta;
    if (next < 0 || next >= tiles.length) return;
    // re-trigger animacji wjazdu panelu
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
    current = next;
    tiles.forEach((t) => t.classList.remove('is-launching'));
    tiles[current].classList.add('is-launching');
    fillPanel(current);
  };

  // Otwieranie z kafelków
  tiles.forEach((tile, i) => {
    tile.addEventListener('click', () => open(i));
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-shown')) return;
    if (e.key === 'Escape')      close();
    else if (e.key === 'ArrowLeft')  go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });

  // =============================================
  // LICZNIK ODSŁON (GoatCounter)
  // =============================================
  // Jedyny obcy skrypt na tej stronie i jedyny, bez którego wszystko
  // działa tak samo. Dopóki `kod` jest pusty, nie leci ani jedno
  // zapytanie na zewnątrz.
  //
  // Trzy zabezpieczenia: tylko https, tylko na produkcyjnej domenie
  // (więc testy z dysku i z localhosta nie zaśmiecają statystyk),
  // ładowanie asynchroniczne z obsługą błędu. GoatCounter nie stawia
  // ciasteczek i nie przechowuje adresów IP, więc nie ma tu czego
  // pokrywać zgodą.
  //
  // Ten sam mechanizm siedzi w projekty/swietobp/index.html. Powielony
  // świadomie: tamta strona jest samowystarczalna i ma działać otwarta
  // z dysku, więc wspólny plik zerwałby jej główną własność.
  // Rozbicie na podstrony robi sam GoatCounter — kluczuje odsłony po
  // ścieżce URL, więc jeden panel pokazuje osobno „/" i „/projekty/swietobp/".
  (function licznik() {
    const KOD    = 'https://lucidacademy.goatcounter.com/count';
    const DOMENY = ['lucidacademy.pl', 'www.lucidacademy.pl'];

    if (!KOD) return;
    if (location.protocol !== 'https:') return;
    if (!DOMENY.includes(location.hostname)) return;

    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-goatcounter', KOD);
    s.src = 'https://gc.zgo.at/count.js';
    s.onerror = () => { /* brak licznika nikomu nie szkodzi */ };
    document.body.appendChild(s);
  }());
}());
