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
        delay: baseDelay + 0.1,
        stagger: 0.035,
        ease: 'power3.out',
      });
    } else {
      units.forEach(u => { u.style.opacity = 1; });
    }
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spotlightEls = document.querySelectorAll(
    '.impact-card, .tips-card, .milestone-item__card, .netzero-card, .map-impact-card'
  );
  spotlightEls.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
    });
  });

  if (!reduceMotion) {
    const tiltEls = document.querySelectorAll('.impact-card, .tips-card');
    tiltEls.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 600, once: true, offset: 60, easing: 'ease-out-cubic' });
  }

  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
    });
  }

  const particleContainer = document.getElementById('heroParticles');
  if (particleContainer) {
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'ng-particle';
      const size = 2 + Math.random() * 4;
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${20 + Math.random() * 80}%;
        width: ${size}px;
        height: ${size}px;
        opacity: ${0.1 + Math.random() * 0.3};
        animation-duration: ${5 + Math.random() * 8}s;
        animation-delay: ${Math.random() * 6}s;
      `;
      particleContainer.appendChild(p);
    }
  }

  const earthContainer = document.getElementById('earthContainer');
  const earthTexture = document.getElementById('earthTexture');

  if (earthContainer && earthTexture) {
    let isDragging = false;
    let startX = 0;
    let currentX = 0; // Menyimpan posisi geser saat ini
    let targetX = 0;  // Target posisi interaksi
    let autoSpinX = 0; // Nilai putaran otomatis
    let velocity = 0;  // Kecepatan drag terakhir, buat efek momentum
    let lastMoveX = 0;
    let lastMoveTime = 0;

    function updateEarthLoop() {
      if (!isDragging) {
        if (Math.abs(velocity) > 0.05) {
          targetX += velocity;
          autoSpinX = targetX;
          velocity *= 0.95; 
        } else {
          autoSpinX -= 0.5;
          targetX = autoSpinX;
        }

        if (autoSpinX < -960) autoSpinX += 960;
        if (autoSpinX > 0) autoSpinX -= 960;
      }

      earthTexture.style.backgroundPositionX = targetX + 'px';

      requestAnimationFrame(updateEarthLoop);
    }

    requestAnimationFrame(updateEarthLoop);

    function dragStart(clientX) {
      isDragging = true;
      startX = clientX;
      currentX = targetX;
      velocity = 0;
      lastMoveX = clientX;
      lastMoveTime = performance.now();
    }

    function dragMove(clientX) {
      if (!isDragging) return;
      const deltaX = clientX - startX;
      targetX = currentX + deltaX;
      autoSpinX = targetX;

      const now = performance.now();
      const dt  = now - lastMoveTime;
      if (dt > 0) velocity = (clientX - lastMoveX) / dt * 16; 
      lastMoveX = clientX;
      lastMoveTime = now;
    }

    function dragEnd() {
      isDragging = false;
    }

    earthContainer.addEventListener('mousedown', (e) => dragStart(e.clientX));
    window.addEventListener('mousemove', (e) => dragMove(e.clientX));
    window.addEventListener('mouseup', dragEnd);

    earthContainer.addEventListener('touchstart', (e) => {
      dragStart(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      dragMove(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', dragEnd);

    earthContainer.addEventListener('dragstart', (e) => e.preventDefault());
  }

  try {
    if (typeof gsap !== 'undefined') {
      gsap.from('.ng-hero__content > *', {
        y: 30, opacity: 0, duration: 0.8,
        stagger: 0.15, ease: 'power3.out', delay: 0.2,
      });

      gsap.from('.globe-wrap', {
        scale: 0.8, opacity: 0, duration: 1,
        ease: 'back.out(1.4)', delay: 0.4,
      });

      gsap.from('.globe-badge', {
        scale: 0, opacity: 0, duration: 0.6,
        stagger: 0.2, ease: 'back.out(1.7)', delay: 0.8,
      });

      if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        ScrollTrigger.create({
          trigger: '.impact-section',
          start: 'top 75%',
          once: true,
          onEnter: () => startCounters(),
        });

        ScrollTrigger.create({
          trigger: '.netzero-section',
          start: 'top 70%',
          once: true,
          onEnter: () => animateProgressBars(),
        });

        ScrollTrigger.create({
          trigger: '.map-section',
          start: 'top 70%',
          once: true,
          onEnter: () => animateRegionBars(),
        });

        gsap.from('.impact-card', {
          scrollTrigger: { trigger: '.impact-grid', start: 'top 80%' },
          y: 40, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
        });

        gsap.from('.tips-card', {
          scrollTrigger: { trigger: '.tips-grid', start: 'top 80%' },
          y: 30, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out',
        });

        gsap.from('.milestone-item__card', {
          scrollTrigger: { trigger: '.milestone-timeline', start: 'top 75%' },
          x: (i) => i % 2 === 0 ? -30 : 30,
          opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
        });
      } else {
        startCounters();
        animateProgressBars();
        animateRegionBars();
      }
    } else {
      startCounters();
      animateProgressBars();
      animateRegionBars();
    }
  } catch (err) {
    console.log("GSAP Skip: ", err);
    startCounters();
    animateProgressBars();
    animateRegionBars();
  }
});

let countersDone = false;
function startCounters() {
  if (countersDone) return;
  countersDone = true;

  const counters = [
    { id: 'co2Counter',  target: 1847,   decimals: 0 },
    { id: 'treeCounter', target: 87952,  decimals: 0 },
    { id: 'carCounter',  target: 879,    decimals: 0 },
    { id: 'homeCounter', target: 7531,   decimals: 0 },
  ];

  counters.forEach((c, i) => {
    setTimeout(() => animateCounter(c.id, c.target, c.decimals), i * 150);
  });
}

function animateCounter(id, target, decimals = 0, duration = 2500) {
  const el = document.getElementById(id);
  if (!el) return;
  const start     = performance.now();
  const formatter = new Intl.NumberFormat('id-ID');

  function update(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current  = target * ease;

    el.textContent = decimals > 0
      ? current.toFixed(decimals)
      : formatter.format(Math.floor(current));

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = formatter.format(target);
  }
  requestAnimationFrame(update);
}

let progressDone = false;
function animateProgressBars() {
  if (progressDone) return;
  progressDone = true;

  const bars = [
    { barId: 'bar1', pctId: 'pct1', target: 62, delay: 0 },
    { barId: 'bar2', pctId: 'pct2', target: 38, delay: 200 },
    { barId: 'bar3', pctId: 'pct3', target: 29, delay: 400 },
  ];

  bars.forEach(b => {
    setTimeout(() => {
      const bar = document.getElementById(b.barId);
      const pct = document.getElementById(b.pctId);
      if (bar) bar.style.width = b.target + '%';
      if (pct) animateNumber(pct, b.target, '%');
    }, b.delay);
  });
}

function animateNumber(el, target, suffix = '', duration = 1500) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * ease) + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(update);
}

let regionDone = false;
function animateRegionBars() {
  if (regionDone) return;
  regionDone = true;

  document.querySelectorAll('.region-item__fill').forEach((fill, i) => {
    const target = fill.getAttribute('data-target');
    if (!target) return;
    setTimeout(() => { fill.style.width = target + '%'; }, i * 100);
  });
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
    }
  });
});