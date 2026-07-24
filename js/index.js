document.addEventListener('DOMContentLoaded', () => {

  function splitText(el) {
    const mode = el.getAttribute('data-split') || 'chars';
    const text = el.textContent;
    el.textContent = '';
    if (mode === 'words') {
      text.split(' ').forEach((word, i, arr) => {
        const span = document.createElement('span');
        span.className = 'split-word';
        span.textContent = word + (i < arr.length - 1 ? '\u00A0' : '');
        el.appendChild(span);
      });
    } else {
      [...text].forEach(ch => {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        el.appendChild(span);
      });
    }
    return el.querySelectorAll(mode === 'words' ? '.split-word' : '.split-char');
  }

  document.querySelectorAll('.split-line').forEach(el => {
    const units = splitText(el);
    const baseDelay = parseInt(el.getAttribute('data-split-delay') || '0', 10) / 1000;
    if (typeof gsap !== 'undefined') {
      gsap.set(units, { opacity: 0, y: 18 });
      gsap.to(units, {
        opacity: 1, y: 0,
        duration: 0.6,
        delay: baseDelay,
        stagger: 0.035,
        ease: 'power3.out',
      });
    } else {
      units.forEach(u => { u.style.opacity = 1; });
    }
  });

  if (typeof Typed !== 'undefined') {
    new Typed('#heroTyped', {
      strings: ['cerdas', 'hijau', 'pintar', 'masa depan'],
      typeSpeed: 80,
      backSpeed: 50,
      backDelay: 2000,
      loop: true,
      showCursor: true,
      cursorChar: '|',
    });
  }

  const container = document.getElementById('heroParticles');
  if (container) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'hero__particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-duration: ${4 + Math.random() * 6}s;
        animation-delay: ${Math.random() * 5}s;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        opacity: ${0.1 + Math.random() * 0.3};
      `;
      container.appendChild(p);
    }
  }

  function animateCounter(el, target, duration = 2000) {
    if (!el) return;
    const start     = performance.now();
    const isDecimal = target % 1 !== 0;
    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      const current  = target * ease;
      el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const heroSection = document.getElementById('hero');
  let countersDone  = false;
  if (heroSection) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !countersDone) {
        countersDone = true;
        animateCounter(document.getElementById('counterKwh'), 2840);
        animateCounter(document.getElementById('counterEff'), 92);
        animateCounter(document.getElementById('counterCo2'), 1820);
      }
    }, { threshold: 0.3 });
    obs.observe(heroSection);
  }

  if (typeof gsap !== 'undefined') {
    gsap.from('.hero__dashboard-card', {
      y: 40, opacity: 0, duration: 1, delay: 0.5, ease: 'power3.out',
    });

    const chartLine = document.querySelector('.hdc__chart-line');
    if (chartLine) {
      const len = chartLine.getTotalLength ? chartLine.getTotalLength() : 400;
      gsap.set(chartLine, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(chartLine, { strokeDashoffset: 0, duration: 2, delay: 0.8, ease: 'power2.out' });
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      gsap.from('.stats-banner__val', {
        scrollTrigger: { trigger: '.stats-banner', start: 'top 85%' },
        scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)',
      });
    }
  }

  if (typeof Swiper !== 'undefined') {
    new Swiper('.testi-swiper', {
      slidesPerView: 1,
      spaceBetween: 24,
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      pagination: { el: '.testi-pagination', clickable: true },
      navigation: { prevEl: '.testi-prev', nextEl: '.testi-next' },
      breakpoints: {
        768:  { slidesPerView: 2 },
        1024: { slidesPerView: 2 },
      },
    });
  }

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar__link');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  });

  const glowCards = document.querySelectorAll('.hiw__step, .features__card');
  glowCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

});