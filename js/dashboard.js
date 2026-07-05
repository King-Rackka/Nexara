// ─── dashboard.js ─────────────────────────────────────

// ── State ─────────────────────────────────────────────
let allPanels    = [];
let alerts       = [];
let chartMode    = 'daily';
let activeFilter = 'all';
let chartCanvas  = null;
let chartCtx     = null;
let weatherData  = null;
let apiEnergyData = null;

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // Auth guard
  const session = localStorage.getItem('nexara_session') || sessionStorage.getItem('nexara_session');
  if (!session) { window.location.href = 'auth.html'; return; }
  const user = JSON.parse(session);

  // Render user info
  renderUserInfo(user);

  // Greeting & clock
  renderGreeting(user.nama);
  updateClock();
  setInterval(updateClock, 60000);

  // Setup chart canvas
  chartCanvas = document.getElementById('energyChart');
  if (chartCanvas) chartCtx = chartCanvas.getContext('2d');

  // Load data paralel
  await Promise.all([
    loadPanelData(),
    fetchWeatherAndEnergy(),
  ]);
});

// ── User Info ──────────────────────────────────────────
function renderUserInfo(user) {
  const initials = user.nama ? user.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '--';
  const el = (id) => document.getElementById(id);

  if (el('sidebarAvatar')) el('sidebarAvatar').textContent = initials;
  if (el('topbarAvatar'))  el('topbarAvatar').textContent  = initials;
  if (el('sidebarName'))   el('sidebarName').textContent   = user.nama || 'User';
  if (el('sidebarOrg'))    el('sidebarOrg').textContent    = user.org  || '--';
}

// ── Greeting ───────────────────────────────────────────
function renderGreeting(nama) {
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const el = document.getElementById('greetingText');
  if (el) el.textContent = `${greet}, ${nama ? nama.split(' ')[0] : 'User'}! 👋`;
}

function updateClock() {
  const el = document.getElementById('greetingDate');
  if (!el) return;
  const now  = new Date();
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const mons = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  el.textContent = `${days[now.getDay()]}, ${now.getDate()} ${mons[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
}

// ── Load Panel Data ────────────────────────────────────
async function loadPanelData() {
  try {
    const res  = await fetch('assets/data/panels.json');
    const data = await res.json();
    allPanels  = data.installations;
    alerts     = data.alerts;

    renderSummaryCards();
    renderPanelCards(allPanels);
    renderPanelTable(allPanels);
    renderMapMarkers(allPanels);
    renderNotifications(alerts);

    const subtitle = document.getElementById('panelSubtitle');
    if (subtitle) subtitle.textContent = `${allPanels.length} instalasi terdaftar`;

    const mapCount = document.getElementById('mapCount');
    if (mapCount) mapCount.textContent = `${allPanels.length} lokasi`;

  } catch (err) {
    console.error('Gagal load panel data:', err);
  }
}

// ── Summary Cards ──────────────────────────────────────
function renderSummaryCards() {
  const totalOutput   = allPanels.reduce((s, p) => s + p.output_today, 0);
  const avgEfficiency = Math.round(allPanels.reduce((s, p) => s + p.efficiency, 0) / allPanels.length);
  const activeCount   = allPanels.filter(p => p.status === 'active').length;
  const totalCo2      = allPanels.reduce((s, p) => s + p.co2_saved, 0).toFixed(1);
  const warningCount  = allPanels.filter(p => p.status !== 'active').length;

  const cards = [
    {
      icon: 'bx-sun', iconBg: '#DCF5E7', iconColor: '#1A6B3C',
      label: 'Output Hari Ini',
      value: totalOutput, unit: 'kWh',
      change: '+8.2% vs kemarin', changeType: 'up',
    },
    {
      icon: 'bx-tachometer', iconBg: '#E3F2FD', iconColor: '#1565C0',
      label: 'Efisiensi Rata-rata',
      value: avgEfficiency, unit: '%',
      change: avgEfficiency >= 80 ? 'Di atas threshold' : 'Di bawah threshold',
      changeType: avgEfficiency >= 80 ? 'up' : 'down',
    },
    {
      icon: 'bx-chip', iconBg: '#E8F5E9', iconColor: '#2E7D32',
      label: 'Instalasi Aktif',
      value: `${activeCount}/${allPanels.length}`, unit: '',
      change: warningCount > 0 ? `${warningCount} perlu perhatian` : 'Semua normal',
      changeType: warningCount > 0 ? 'down' : 'up',
    },
    {
      icon: 'bx-leaf', iconBg: '#F3E5F5', iconColor: '#6A1B9A',
      label: 'CO₂ Dihemat Hari Ini',
      value: totalCo2, unit: 'kg',
      change: `≈ ${Math.round(totalCo2 / 21)} pohon/hari`, changeType: 'up',
    },
  ];

  const container = document.getElementById('summaryCards');
  if (!container) return;
  container.innerHTML = cards.map(c => `
    <div class="summary-card">
      <div class="summary-card__icon" style="background:${c.iconBg}">
        <i class="bx ${c.icon}" style="color:${c.iconColor}"></i>
      </div>
      <div class="summary-card__label">${c.label}</div>
      <div class="summary-card__value">${c.value}<span>${c.unit}</span></div>
      <div class="summary-card__change ${c.changeType}">
        <i class="bx ${c.changeType === 'up' ? 'bx-trending-up' : 'bx-trending-down'}"></i>
        ${c.change}
      </div>
    </div>
  `).join('');

  // GSAP entrance
  if (typeof gsap !== 'undefined') {
    gsap.from('.summary-card', {
      y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
    });
  }
}

// ── Weather + Energy API (Open-Meteo) ─────────────────
async function fetchWeatherAndEnergy() {
  // Pakai koordinat Bali (representatif)
  const lat = -8.67, lon = 115.21;
  const weatherEl = document.getElementById('weatherBadge');

  try {
    // Open-Meteo — ambil radiasi & suhu hari ini
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=shortwave_radiation,temperature_2m&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=Asia%2FMakassar&forecast_days=7`;

    const res  = await fetch(url);
    const data = await res.json();
    weatherData = data;

    // Tampilkan cuaca di topbar
    if (weatherEl && data.daily) {
      const tempMax = data.daily.temperature_2m_max[0];
      const tempMin = data.daily.temperature_2m_min[0];
      weatherEl.innerHTML = `
        <i class="bx bx-sun" style="color:#F4A623"></i>
        <span>${tempMin}°–${tempMax}°C · Bali</span>
      `;
    }

    // Proses data radiasi → estimasi kWh per jam
    const todayHours = data.hourly.shortwave_radiation.slice(0, 24);
    apiEnergyData = todayHours.map(r => +(r * 0.25 * 0.18).toFixed(1)); // 250kWp * 18% eff

    // Render chart
    renderChart('daily');
    document.getElementById('chartLoading').style.display = 'none';

  } catch (err) {
    console.warn('Open-Meteo API gagal, pakai dummy data:', err);
    if (weatherEl) {
      weatherEl.innerHTML = `<i class="bx bx-cloud"></i><span>Data cuaca tidak tersedia</span>`;
    }
    // Fallback ke dummy data
    apiEnergyData = generateDummyEnergy('daily');
    renderChart('daily');
    document.getElementById('chartLoading').style.display = 'none';

    const subtitle = document.getElementById('chartSubtitle');
    if (subtitle) subtitle.textContent = 'Data estimasi (mode offline)';
  }
}

// ── Dummy Energy Generator (fallback) ─────────────────
function generateDummyEnergy(mode) {
  const count = mode === 'daily' ? 24 : mode === 'weekly' ? 7 : 30;
  return Array.from({ length: count }, (_, i) => {
    if (mode === 'daily') {
      // Profil surya: rendah pagi/sore, tinggi siang
      const h = i;
      if (h < 6 || h > 18) return 0;
      const mid  = 12;
      const dist = Math.abs(h - mid);
      return +(Math.max(0, 45 - dist * 7 + (Math.random() * 8 - 4))).toFixed(1);
    }
    return +(80 + Math.random() * 60).toFixed(1);
  });
}

// ── Chart Renderer (Canvas API) ───────────────────────
function renderChart(mode) {
  if (!chartCtx || !chartCanvas) return;
  chartMode = mode;

  // Siapkan data
  let energyData, radiationData, labels;

  if (mode === 'daily' && weatherData?.hourly) {
    energyData    = apiEnergyData || generateDummyEnergy('daily');
    radiationData = weatherData.hourly.shortwave_radiation.slice(0, 24).map(r => +(r / 10).toFixed(1));
    labels        = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  } else if (mode === 'weekly') {
    energyData    = generateDummyEnergy('weekly');
    radiationData = energyData.map(v => +(v * 3.2).toFixed(1));
    const days    = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
    labels        = days;
  } else {
    energyData    = generateDummyEnergy('monthly');
    radiationData = energyData.map(v => +(v * 3.2).toFixed(1));
    labels        = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  }

  const W = chartCanvas.width  = chartCanvas.parentElement.offsetWidth;
  const H = chartCanvas.height = 200;
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top - pad.bottom;

  chartCtx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...energyData, ...radiationData, 1);
  const xStep  = cW / (labels.length - 1 || 1);

  // Helper: data → canvas coords
  const cx = i => pad.left + i * xStep;
  const cy = v => pad.top  + cH - (v / maxVal) * cH;

  // Grid lines
  chartCtx.strokeStyle = 'rgba(0,0,0,0.05)';
  chartCtx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.top + cH * (1 - t);
    chartCtx.beginPath();
    chartCtx.moveTo(pad.left, y);
    chartCtx.lineTo(pad.left + cW, y);
    chartCtx.stroke();
    chartCtx.fillStyle = 'rgba(0,0,0,0.35)';
    chartCtx.font      = '10px Inter';
    chartCtx.fillText(`${Math.round(maxVal * t)}`, 2, y + 3);
  });

  // X labels (tampilkan setiap N label)
  const step = Math.ceil(labels.length / 8);
  chartCtx.fillStyle = 'rgba(0,0,0,0.4)';
  chartCtx.font = '10px Inter';
  chartCtx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    if (i % step === 0) {
      chartCtx.fillText(lbl, cx(i), H - 8);
    }
  });
  chartCtx.textAlign = 'left';

  // Draw area + line — Radiation (amber)
  drawLineChart(chartCtx, radiationData, cx, cy, '#F4A623', 'rgba(244,166,35,0.08)');

  // Draw area + line — Energy (green)
  drawLineChart(chartCtx, energyData, cx, cy, '#4ADE80', 'rgba(74,222,128,0.15)');

  // Dots for energy
  energyData.forEach((v, i) => {
    if (v === 0) return;
    chartCtx.beginPath();
    chartCtx.arc(cx(i), cy(v), 3, 0, Math.PI * 2);
    chartCtx.fillStyle = '#4ADE80';
    chartCtx.fill();
  });
}

function drawLineChart(ctx, data, cx, cy, color, fillColor) {
  if (!data.length) return;

  // Area fill
  ctx.beginPath();
  ctx.moveTo(cx(0), cy(data[0]));
  data.forEach((v, i) => {
    if (i === 0) return;
    const prevX = cx(i - 1), prevY = cy(data[i - 1]);
    const currX = cx(i),     currY = cy(v);
    const cpX   = (prevX + currX) / 2;
    ctx.bezierCurveTo(cpX, prevY, cpX, currY, currX, currY);
  });
  ctx.lineTo(cx(data.length - 1), cy(0));
  ctx.lineTo(cx(0), cy(0));
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(cx(0), cy(data[0]));
  data.forEach((v, i) => {
    if (i === 0) return;
    const prevX = cx(i - 1), prevY = cy(data[i - 1]);
    const currX = cx(i),     currY = cy(v);
    const cpX   = (prevX + currX) / 2;
    ctx.bezierCurveTo(cpX, prevY, cpX, currY, currX, currY);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.stroke();
}

// Chart tab switcher
function switchChart(mode, btn) {
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (mode === 'daily' && weatherData?.hourly) {
    renderChart('daily');
  } else {
    apiEnergyData = generateDummyEnergy(mode);
    renderChart(mode);
  }
}

// ── Map Markers ────────────────────────────────────────
function renderMapMarkers(panels) {
  const mapEl = document.getElementById('mapMarkers');
  if (!mapEl) return;

  const statusColors = { active: '#4CAF50', warning: '#F4A623', error: '#E53935' };

  // Kelompokkan panel per-provinsi biar yang satu daerah bisa
  // digeser dikit (offset) supaya nggak numpuk persis di titik yang sama
  const groups = {};
  panels.forEach(p => {
    const coord = findProvinceCoord(p.location);
    const key = `${coord.x},${coord.y}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  let markersHTML = '';
  Object.values(groups).forEach(group => {
    group.forEach((p, i) => {
      const base = findProvinceCoord(p.location);
      // Offset kecil melingkar kalau lebih dari 1 instalasi di provinsi yang sama
      const angle = (i / group.length) * Math.PI * 2;
      const spread = group.length > 1 ? 10 : 0;
      const x = base.x + Math.cos(angle) * spread;
      const y = base.y + Math.sin(angle) * spread;
      const color = statusColors[p.status] || '#4CAF50';

      markersHTML += `
        <g class="map-marker" onclick="goToDetail('${p.id}')">
          <title>${p.name}</title>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${color}" opacity="0.15"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"  fill="${color}" opacity="0.9"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"  fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5">
            <animate attributeName="r" from="5" to="12" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
          </circle>
        </g>
      `;
    });
  });

  mapEl.innerHTML = markersHTML;
}

// ── Panel Cards (Swiper) ───────────────────────────────
function renderPanelCards(panels) {
  const wrapper = document.getElementById('panelSwiperWrapper');
  if (!wrapper) return;

  const statusColors = { active: '#4CAF50', warning: '#F4A623', error: '#E53935' };
  const statusLabels = { active: 'Aktif', warning: 'Warning', error: 'Error' };
  const typeIcon     = { solar: 'bx-sun', wind: 'bx-wind' };
  const typeBg       = { solar: '#DCF5E7', wind: '#E3F2FD' };
  const typeColor    = { solar: '#1A6B3C', wind: '#1565C0' };

  wrapper.innerHTML = panels.map(p => `
    <div class="swiper-slide">
      <div class="panel-card" onclick="goToDetail('${p.id}')">
        <div class="panel-card__top">
          <div class="panel-card__icon" style="background:${typeBg[p.type]}">
            <i class="bx ${typeIcon[p.type]}" style="color:${typeColor[p.type]}"></i>
          </div>
          <span class="panel-card__status status-${p.status}">
            <span style="width:6px;height:6px;border-radius:50%;background:${statusColors[p.status]};display:inline-block"></span>
            ${statusLabels[p.status]}
          </span>
        </div>
        <div class="panel-card__name">${p.name}</div>
        <div class="panel-card__loc">
          <i class="bx bx-map-pin"></i> ${p.location}
        </div>
        <div class="panel-card__metrics">
          <div>
            <div class="panel-metric__label">Output Hari Ini</div>
            <div class="panel-metric__val">${p.output_today} kWh</div>
          </div>
          <div>
            <div class="panel-metric__label">CO₂ Dihemat</div>
            <div class="panel-metric__val">${p.co2_saved} kg</div>
          </div>
        </div>
        <div class="panel-card__eff-bar">
          <div class="panel-card__eff-fill" style="width:${p.efficiency}%;background:${statusColors[p.status]}"></div>
        </div>
        <div class="panel-card__eff-label">
          <span>Efisiensi</span>
          <span style="color:${statusColors[p.status]};font-weight:600">${p.efficiency}%</span>
        </div>
      </div>
    </div>
  `).join('');

  // Init Swiper
  if (typeof Swiper !== 'undefined') {
    new Swiper('.panel-swiper', {
      slidesPerView: 'auto',
      spaceBetween: 12,
      freeMode: true,
      scrollbar: { el: '.panel-scrollbar', draggable: true },
    });
  }
}

// ── Panel Table ────────────────────────────────────────
function renderPanelTable(panels) {
  const tbody = document.getElementById('panelTableBody');
  if (!tbody) return;

  const statusColors = { active: '#1A6B3C', warning: '#B8750A', error: '#C0392B' };
  const statusBg     = { active: '#DCF5E7', warning: '#FEF3DC', error: '#FDECEC' };
  const statusLabel  = { active: 'Aktif', warning: 'Warning', error: 'Error' };
  const typeLabel    = { solar: '☀️ Solar', wind: '💨 Wind' };

  if (!panels.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="panel-table__loading">Tidak ada instalasi ditemukan</td></tr>';
    return;
  }

  tbody.innerHTML = panels.map(p => `
    <tr>
      <td>
        <div class="table-name">${p.name}</div>
        <div class="table-loc">${p.location}</div>
      </td>
      <td>${typeLabel[p.type] || p.type}</td>
      <td>
        <span class="table-badge" style="background:${statusBg[p.status]};color:${statusColors[p.status]}">
          ${statusLabel[p.status]}
        </span>
      </td>
      <td style="font-family:var(--font-mono);font-weight:500">${p.output_today} kWh</td>
      <td>
        <div class="table-eff-bar">
          <div class="table-eff-track">
            <div class="table-eff-fill" style="width:${p.efficiency}%;background:${statusColors[p.status]}"></div>
          </div>
          <span style="font-size:12px;color:${statusColors[p.status]};font-weight:500;white-space:nowrap">${p.efficiency}%</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono)">${p.co2_saved} kg</td>
      <td>
        <a class="table-action" onclick="goToDetail('${p.id}')">
          <i class="bx bx-show"></i> Detail
        </a>
      </td>
    </tr>
  `).join('');
}

// ── Filter & Search ────────────────────────────────────
function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyFilters();
}

function filterPanels() { applyFilters(); }

function applyFilters() {
  const query    = (document.getElementById('panelSearch')?.value || '').toLowerCase();
  let filtered   = allPanels;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(p => p.status === activeFilter);
  }
  if (query) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query)
    );
  }

  renderPanelCards(filtered);
  renderPanelTable(filtered);

  const subtitle = document.getElementById('panelSubtitle');
  if (subtitle) subtitle.textContent = `${filtered.length} dari ${allPanels.length} instalasi`;
}

// ── Notifications ──────────────────────────────────────
function renderNotifications(alertsData) {
  const list    = document.getElementById('notifList');
  const badge   = document.getElementById('notifBadge');
  const unread  = alertsData.filter(a => !a.read).length;

  if (badge) badge.textContent = unread;

  if (!list) return;
  if (!alertsData.length) {
    list.innerHTML = '<div class="notif-panel__empty">Tidak ada notifikasi</div>';
    return;
  }

  const iconMap = { error: { icon: 'bx-error-circle', bg: '#FDECEC', color: '#C0392B' },
                    warning: { icon: 'bx-error', bg: '#FEF3DC', color: '#B8750A' },
                    info: { icon: 'bx-info-circle', bg: '#E3F2FD', color: '#1565C0' } };

  list.innerHTML = alertsData.map(a => {
    const ic  = iconMap[a.type] || iconMap.info;
    const time = new Date(a.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="notif-item ${a.read ? '' : 'unread'}">
        <div class="notif-item__icon" style="background:${ic.bg}">
          <i class="bx ${ic.icon}" style="color:${ic.color}"></i>
        </div>
        <div class="notif-item__body">
          <div class="notif-item__msg">${a.message}</div>
          <div class="notif-item__time">${time}</div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleNotifPanel() {
  const panel   = document.getElementById('notifPanel');
  const overlay = document.getElementById('notifOverlay');
  const isOpen  = panel.style.display !== 'none';
  panel.style.display   = isOpen ? 'none' : 'block';
  overlay.style.display = isOpen ? 'none' : 'block';
}

function markAllRead() {
  alerts.forEach(a => a.read = true);
  renderNotifications(alerts);
  toggleNotifPanel();
}

// ── Sidebar Toggle ─────────────────────────────────────
document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main');
  sidebar.classList.toggle('collapsed');
  main.classList.toggle('sidebar-collapsed');
});

function toggleMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isOpen   = sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', !isOpen);
  overlay.classList.toggle('show', !isOpen);
}

// ── Navigate to Detail ────────────────────────────────
function goToDetail(id) {
  localStorage.setItem('nexara_selected_panel', id);
  window.location.href = 'detail.html';
}

// ── Logout ────────────────────────────────────────────
function handleLogout() {
  localStorage.removeItem('nexara_session');
  sessionStorage.removeItem('nexara_session');
  window.location.href = 'auth.html';
}

// ── Resize → redraw chart ─────────────────────────────
window.addEventListener('resize', () => {
  if (apiEnergyData) renderChart(chartMode);
});