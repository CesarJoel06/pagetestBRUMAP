(() => {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================
   * Navegación (mobile)
   * ========================= */
  const toggle = document.getElementById('nav-toggle');
  const toggleLabel = document.querySelector('label[for="nav-toggle"]');
  const backdrop = document.querySelector('.nav__backdrop');
  const nav = document.getElementById('primary-nav');

  const openMenu = () => {
    document.body.classList.add('nav-open');
    toggleLabel && toggleLabel.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = () => {
    if (toggle && toggle.checked) toggle.checked = false;
    document.body.classList.remove('nav-open');
    toggleLabel && toggleLabel.setAttribute('aria-expanded', 'false');
  };

  toggle && toggle.addEventListener('change', () => (toggle.checked ? openMenu() : closeMenu()));
  backdrop && backdrop.addEventListener('click', closeMenu);
  window.addEventListener('hashchange', closeMenu);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) closeMenu();
  });

  if (nav) {
    nav.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* =========================
   * Scroll suave con offset (header sticky)
   * ========================= */
  const header = document.querySelector('.header');
  const headerOffset = () => (header ? header.getBoundingClientRect().height : 0);

  // Forzar scroll instantáneo aunque exista "scroll-behavior: smooth" en CSS.
  const withInstantScroll = (fn) => {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    try { fn(); } finally { root.style.scrollBehavior = prev; }
  };

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    a.addEventListener('click', (e) => {
      // No interceptar enlaces externos
      if (a.origin && a.origin !== window.location.origin) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 10;
      const isTop = href === '#inicio' || href === '#top';
      const yFinal = isTop ? 0 : y;

      // Inicio/logo: ir al tope inmediatamente (sin scroll lento)
      if (prefersReducedMotion || isTop) {
        withInstantScroll(() => window.scrollTo(0, yFinal));
      } else {
        window.scrollTo({ top: yFinal, behavior: 'smooth' });
      }
      history.pushState(null, '', href);
    });
  });

  /* =========================
   * Animaciones de entrada (reveal) y scroll-spy
   * ========================= */
  const revealTargets = [
    ...document.querySelectorAll('.card, .product-card, .steps__item, .features__item, .nosotros__foto-equipo, .nosotros__foto-trofeo, .contact__card, .faq__item')
  ];

  // Hero: animación por elementos
  const heroCopyItems = Array.from(document.querySelectorAll('.hero__copy > *'));
  const heroMedia = document.querySelector('.hero__media');

  const allReveal = [...revealTargets, ...heroCopyItems, ...(heroMedia ? [heroMedia] : [])].filter(Boolean);
  allReveal.forEach((el) => el.classList.add('reveal'));

  // Delays solo para hero (sensación más "premium")
  heroCopyItems.forEach((el, idx) => {
    el.style.transitionDelay = `${Math.min(420, 80 + idx * 70)}ms`;
  });
  if (heroMedia) heroMedia.style.transitionDelay = '220ms';

  const markInView = (el) => el.classList.add('is-inview');

  if (prefersReducedMotion) {
    allReveal.forEach(markInView);
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          markInView(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.18 }
    );

    allReveal.forEach((el) => io.observe(el));
  }

  // Scroll spy (resalta el ítem activo del menú)
  const navLinks = Array.from(document.querySelectorAll('#primary-nav a[href^="#"]'));
  const linkById = new Map(
    navLinks
      .map((a) => [a.getAttribute('href').replace('#', ''), a])
      .filter(([id]) => Boolean(id))
  );

  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.remove('is-active'));
    const active = linkById.get(id);
    if (active) active.classList.add('is-active');
  };

  // Inicio (top) como caso especial
  const onScrollTop = () => {
    if (window.scrollY < 80) setActive('inicio');
  };
  window.addEventListener('scroll', onScrollTop, { passive: true });
  onScrollTop();

  if (!prefersReducedMotion && linkById.size) {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    const spy = new IntersectionObserver(
      (entries) => {
        // elegir el más visible/intersecting
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0].target.id;
        if (id) setActive(id);
      },
      {
        rootMargin: '-45% 0px -50% 0px',
        threshold: [0.1, 0.2, 0.35]
      }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* =========================
   * Lightbox (galerías)
   * ========================= */
  const lightbox = document.getElementById('lightbox');
  const dialog = lightbox ? lightbox.querySelector('.lightbox__dialog') : null;
  const lightboxImg = lightbox ? lightbox.querySelector('.lightbox__image') : null;
  const lightboxCaption = lightbox ? lightbox.querySelector('.lightbox__caption') : null;

  const btnClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;
  const btnPrev = lightbox ? lightbox.querySelector('.lightbox__prev') : null;
  const btnNext = lightbox ? lightbox.querySelector('.lightbox__next') : null;
  const backdropLb = lightbox ? lightbox.querySelector('.lightbox__backdrop') : null;

  const supportsWebP = (() => {
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext) return false;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (_) {
      return false;
    }
  })();

  const galleryConfig = {
    folder: {
      caption: 'Folders en PVC – sellado HF, opciones de bolsillos y broches',
      images: ['public/img/folder_1.jpg','public/img/folder_2.jpg','public/img/folder_3.jpg','public/img/folder_4.jpg']
    },
    mica: {
      caption: 'Micas / fundas en PVC – protección y presentación de documentos',
      images: ['public/img/mica_1.jpg','public/img/mica_2.jpg','public/img/mica_3.jpg','public/img/mica_4.jpg']
    },
    portapapel: {
      caption: 'Portapapeles – uso institucional, personalizable por proyecto',
      images: ['public/img/portapapel_1.jpg','public/img/portapapel_2.jpg','public/img/portapapel_3.jpg','public/img/portapapel_4.jpg']
    },
    forrolisto: {
      caption: 'Forros listos – producción por serie con consistencia',
      images: ['public/img/forrolisto_1.jpg','public/img/forrolisto_2.jpg','public/img/forrolisto_3.jpg','public/img/forrolisto_4.jpg']
    },
    portadocumentos: {
      caption: 'Porta documentos – acabados profesionales y alta durabilidad',
      images: ['public/img/portadocumentos_1.jpg','public/img/portadocumentos_2.jpg','public/img/portadocumentos_3.jpg','public/img/portadocumentos_4.jpg']
    },
    portacredenciales: {
      caption: 'Porta credenciales – perforaciones, broches y personalización por evento',
      images: ['public/img/portacredenciales_1.jpg','public/img/portacredenciales_2.jpg','public/img/portacredenciales_3.jpg','public/img/portacredenciales_4.jpg']
    },
    nosotros: {
      caption: 'Equipo BRUMAP y reconocimiento AOTS – Premio Nacional 5S Perú',
      images: ['public/img/premiacion.jpg','public/img/trofeo.jpg']
    }
  };

  let currentGallery = null;
  let currentIndex = 0;
  let lastFocused = null;

  const pageRegions = [
    document.querySelector('header.header'),
    document.querySelector('main'),
    document.querySelector('footer.footer'),
    document.querySelector('.wa-float')
  ].filter(Boolean);

  function setModalState(open) {
    if (!lightbox) return;
    lightbox.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('lightbox-open', open);

    // Ocultar fondo para lectores de pantalla (mejora incremental)
    pageRegions.forEach((el) => {
      if (open) {
        el.setAttribute('aria-hidden', 'true');
        // "inert" si está disponible
        try { el.inert = true; } catch (_) {}
      } else {
        el.removeAttribute('aria-hidden');
        try { el.inert = false; } catch (_) {}
      }
    });
  }

  function resolveImage(src) {
    if (!supportsWebP) return src;
    if (src.endsWith('.jpg')) return src.replace(/\.jpg$/i, '.webp');
    return src;
  }

  function renderLightbox() {
    if (!currentGallery || !lightbox || !lightboxImg) return;
    const total = currentGallery.images.length;
    if (!total) return;

    const src = resolveImage(currentGallery.images[currentIndex]);
    lightboxImg.src = src;
    lightboxImg.alt = currentGallery.caption || 'Imagen de producto';
    if (lightboxCaption) lightboxCaption.textContent = currentGallery.caption || '';
  }

  function focusTrap(e) {
    if (!dialog) return;
    if (e.key !== 'Tab') return;

    const focusables = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openLightbox(group, startIndex = 0) {
    const cfg = galleryConfig[group];
    if (!cfg || !lightbox) return;

    currentGallery = cfg;
    currentIndex = Number.isFinite(startIndex) ? Math.max(0, startIndex) : 0;
    lastFocused = document.activeElement;

    setModalState(true);
    renderLightbox();
    lightbox.classList.add('is-open');

    // Enfocar botón cerrar
    btnClose && btnClose.focus();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', focusTrap, true);
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    setModalState(false);

    if (lightboxImg) lightboxImg.src = '';
    currentGallery = null;
    currentIndex = 0;

    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keydown', focusTrap, true);

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function prevImage() {
    if (!currentGallery) return;
    currentIndex = (currentIndex - 1 + currentGallery.images.length) % currentGallery.images.length;
    renderLightbox();
  }

  function nextImage() {
    if (!currentGallery) return;
    currentIndex = (currentIndex + 1) % currentGallery.images.length;
    renderLightbox();
  }

  function onKeyDown(e) {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  }

  // Abrir lightbox desde cards/botones
  document.querySelectorAll('[data-open-gallery]').forEach((el) => {
    el.addEventListener('click', () => {
      const group = el.getAttribute('data-open-gallery');
      const idxAttr = el.getAttribute('data-open-gallery-index');
      const startIndex = idxAttr !== null ? parseInt(idxAttr, 10) : 0;
      if (group) openLightbox(group, startIndex);
    });
  });

  btnClose && btnClose.addEventListener('click', closeLightbox);
  backdropLb && backdropLb.addEventListener('click', closeLightbox);
  btnPrev && btnPrev.addEventListener('click', prevImage);
  btnNext && btnNext.addEventListener('click', nextImage);

  /* =========================
   * Formulario → WhatsApp (sin backend)
   * ========================= */
  const quoteForm = document.getElementById('quote-form');
  quoteForm && quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fd = new FormData(quoteForm);
    const nombre = String(fd.get('nombre') || '').trim();
    const empresa = String(fd.get('empresa') || '').trim();
    const producto = String(fd.get('producto') || '').trim();
    const cantidad = String(fd.get('cantidad') || '').trim();
    const detalles = String(fd.get('detalles') || '').trim();

    const lines = [
      'Hola BRUMAP, quisiera cotizar:',
      `Producto: ${producto}`,
      `Cantidad: ${cantidad}`,
      `Detalles/medidas: ${detalles}`,
      `Nombre: ${nombre}`
    ];
    if (empresa) lines.push(`Empresa: ${empresa}`);

    const message = lines.join('\n');
    const url = 'https://wa.me/51967647745?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
  });
})();