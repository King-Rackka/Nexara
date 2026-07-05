// ─── index.js — Homepage Scripts ──────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Typed.js Hero Text ──────────────────────
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

  // ── 2. Particles ───────────────────────────────
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

  // ── 3. Counter Animation ───────────────────────
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

  // ── 4. GSAP Animations (opsional, tidak block render) ──
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

  // ── 5. Swiper Testimonials ─────────────────────
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

  // ── 6. Navbar active link on scroll ───────────────
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

});