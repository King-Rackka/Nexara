// ─── support.js — Panduan, FAQ, Status, Kontak ────────

// ── FAQ Accordion ──────────────────────────────────────
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  // Tutup semua item lain di kategori yang sama (biar rapi, 1 kebuka per waktu)
  item.parentElement.querySelectorAll('.faq-item.open').forEach(other => {
    if (other !== item) other.classList.remove('open');
  });
  item.classList.toggle('open', !wasOpen);
}

// ── FAQ Search Filter ──────────────────────────────────
function filterFaq(query) {
  const q = query.trim().toLowerCase();
  const items = document.querySelectorAll('.faq-item');
  const categories = document.querySelectorAll('.faq-category');
  let totalVisible = 0;

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const match = q === '' || text.includes(q);
    item.style.display = match ? 'block' : 'none';
    if (match) totalVisible++;
  });

  categories.forEach(cat => {
    const visibleInCat = cat.querySelectorAll('.faq-item[style="display: block"], .faq-item:not([style])').length;
    const anyVisible = Array.from(cat.querySelectorAll('.faq-item')).some(i => i.style.display !== 'none');
    cat.style.display = anyVisible ? 'block' : 'none';
  });

  const emptyEl = document.getElementById('faqEmpty');
  if (emptyEl) emptyEl.classList.toggle('show', totalVisible === 0);
}

// ── Guide TOC active state on scroll ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  const tocLinks = document.querySelectorAll('.guide-toc a');
  const sections = document.querySelectorAll('.guide-section');
  if (tocLinks.length && sections.length) {
    window.addEventListener('scroll', () => {
      let current = sections[0]?.id;
      sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 140) current = sec.id;
      });
      tocLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    });
  }
});

// ── Contact form (demo, tanpa backend) ─────────────────
function handleContactSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const successEl = document.getElementById('contactSuccess');
  const originalText = btn.innerHTML;

  btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Mengirim...';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;
    if (successEl) successEl.classList.add('show');
    e.target.reset();
    setTimeout(() => successEl && successEl.classList.remove('show'), 5000);
  }, 1200);

  return false;
}

// ── Status page subscribe (demo) ───────────────────────
function handleSubscribe(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const original = btn.textContent;
  btn.textContent = 'Terdaftar ✓';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; e.target.reset(); }, 3000);
  return false;
}
