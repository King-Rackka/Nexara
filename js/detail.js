let currentPanel  = null;
let allPanels     = [];
let allLogs       = [];
let activeFilter  = 'all';
let chartMode     = 'hourly';
let chartCanvas   = null;
let chartCtx      = null;
let energyData    = null;
let radiationData = null;

const FALLBACK_PANELS = [
  { id:'INS-001', name:'Panel Surya Bali Selatan',    location:'Denpasar, Bali',              type:'solar', lat:-8.67,  lon:115.21, capacity_kwp:250, panels_count:100, installed_date:'2023-03-15', status:'active',  efficiency:97, output_today:208, co2_saved:124.8, inverter:'normal',  battery:'normal',  temperature:42 },
  { id:'INS-002', name:'Panel Surya Surabaya Barat',  location:'Surabaya, Jawa Timur',         type:'solar', lat:-7.25,  lon:112.75, capacity_kwp:180, panels_count:72,  installed_date:'2023-06-20', status:'active',  efficiency:94, output_today:142, co2_saved:85.2,  inverter:'normal',  battery:'normal',  temperature:39 },
  { id:'INS-003', name:'Turbin Angin Enrekang',       location:'Enrekang, Sulawesi Selatan',     type:'wind',  lat:-3.95,  lon:119.85, capacity_kwp:320, panels_count:8,   installed_date:'2022-11-10', status:'warning', efficiency:61, output_today:87,  co2_saved:52.2,  inverter:'warning', battery:'normal',  temperature:35 },
  { id:'INS-004', name:'Panel Surya Medan Utara',     location:'Medan, Sumatera Utara',        type:'solar', lat:3.58,   lon:98.67,  capacity_kwp:150, panels_count:60,  installed_date:'2024-01-08', status:'active',  efficiency:88, output_today:112, co2_saved:67.2,  inverter:'normal',  battery:'normal',  temperature:41 },
  { id:'INS-005', name:'Panel Surya Makassar',        location:'Makassar, Sulawesi Selatan',   type:'solar', lat:-5.14,  lon:119.43, capacity_kwp:200, panels_count:80,  installed_date:'2023-09-01', status:'error',   efficiency:23, output_today:18,  co2_saved:10.8,  inverter:'error',   battery:'warning', temperature:58 },
  { id:'INS-006', name:'Turbin Angin Bangka',         location:'Bangka, Kep. Bangka Belitung', type:'wind',  lat:-2.13,  lon:106.12, capacity_kwp:280, panels_count:6,   installed_date:'2023-04-22', status:'active',  efficiency:82, output_today:164, co2_saved:98.4,  inverter:'normal',  battery:'normal',  temperature:33 },
  { id:'INS-007', name:'Panel Surya Yogyakarta',      location:'Yogyakarta, DIY',              type:'solar', lat:-7.80,  lon:110.36, capacity_kwp:120, panels_count:48,  installed_date:'2024-03-10', status:'active',  efficiency:91, output_today:98,  co2_saved:58.8,  inverter:'normal',  battery:'normal',  temperature:38 },
  { id:'INS-008', name:'Panel Surya Lombok',          location:'Mataram, NTB',                 type:'solar', lat:-8.58,  lon:116.10, capacity_kwp:175, panels_count:70,  installed_date:'2023-12-05', status:'warning', efficiency:68, output_today:76,  co2_saved:45.6,  inverter:'normal',  battery:'warning', temperature:47 },
];

document.addEventListener('DOMContentLoaded', async () => {

  // Auth guard
  const session = localStorage.getItem('nexara_session') || sessionStorage.getItem('nexara_session');
  if (!session) { window.location.href = 'auth.html'; return; }
  const user = JSON.parse(session);
  renderUserInfo(user);

  // Sidebar toggle
  document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed');
    setTimeout(() => { if (energyData) renderChart(chartMode); }, 320);
  });

  // Canvas setup
  chartCanvas = document.getElementById('detailChart');
  if (chartCanvas) chartCtx = chartCanvas.getContext('2d');

  // Load panels data
  await loadPanels();

  // Get selected panel ID
  const selectedId = localStorage.getItem('nexara_selected_panel') || 'INS-001';
  currentPanel = allPanels.find(p => p.id === selectedId) || allPanels[0];

  if (!currentPanel) {
    alert('Panel tidak ditemukan. Kembali ke dashboard.');
    window.location.href = 'dashboard.html';
    return;
  }

  // Render all sections
  renderPanelHeader(currentPanel);
  renderMetricCards(currentPanel);
  renderKomponen(currentPanel);
  renderGallery(currentPanel);
  renderLogs(currentPanel);

  // Fetch weather + chart
  await fetchWeatherAndChart(currentPanel);

  // Set date defaults for modal
  const today = new Date().toISOString().split('T')[0];
  const maintDate = document.getElementById('maintDate');
  if (maintDate) maintDate.value = today;
});

async function loadPanels() {
  try {
    const res = await fetch('assets/data/panels.json');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    allPanels = data.installations;
  } catch {
    allPanels = FALLBACK_PANELS;
  }
}

function renderUserInfo(user) {
  const initials = user.nama ? user.nama.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '--';
  const el = id => document.getElementById(id);
  if (el('sidebarAvatar')) el('sidebarAvatar').textContent = initials;
  if (el('topbarAvatar'))  el('topbarAvatar').textContent  = initials;
  if (el('sidebarName'))   el('sidebarName').textContent   = user.nama || 'User';
  if (el('sidebarOrg'))    el('sidebarOrg').textContent    = user.org  || '--';
}

function renderPanelHeader(p) {
  const statusMap = {
    active:  { label: 'Aktif',   cls: 'status-active' },
    warning: { label: 'Warning', cls: 'status-warning' },
    error:   { label: 'Error',   cls: 'status-error'   },
  };
  const s = statusMap[p.status] || statusMap.active;

  document.getElementById('breadcrumbName').textContent = p.name;
  document.getElementById('panelName').textContent      = p.name;
  document.getElementById('panelLocation').textContent  = p.location;
  document.getElementById('panelCapacity').textContent  = p.capacity_kwp;
  document.getElementById('panelInstalled').textContent = formatDate(p.installed_date);

  const statusEl = document.getElementById('panelStatus');
  statusEl.textContent  = s.label;
  statusEl.className    = `panel-header__status ${s.cls}`;

  const iconEl = document.getElementById('panelIcon');
  if (p.type === 'wind') {
    iconEl.className  = 'panel-header__icon wind';
    iconEl.innerHTML  = '<i class="bx bx-wind"></i>';
  } else {
    iconEl.className  = 'panel-header__icon';
    iconEl.innerHTML  = '<i class="bx bx-sun"></i>';
  }
}

function renderMetricCards(p) {
  const statusColor = { active: 'var(--clr-success)', warning: 'var(--clr-warning)', error: 'var(--clr-danger)' };
  const tempStatus  = p.temperature > 55 ? 'err' : p.temperature > 45 ? 'warn' : 'ok';
  const tempIcon    = p.temperature > 55 ? 'bx-error-circle' : p.temperature > 45 ? 'bx-error' : 'bx-check-circle';

  const cards = [
    {
      icon: 'bx-bolt-circle', iconBg: '#DCF5E7', iconColor: '#1A6B3C',
      label: 'Output Hari Ini',
      value: p.output_today, unit: 'kWh',
      sub: `<i class="bx bx-trending-up"></i> ${p.efficiency}% dari kapasitas`,
      subCls: p.efficiency >= 80 ? 'ok' : p.efficiency >= 50 ? 'warn' : 'err',
    },
    {
      icon: 'bx-layer', iconBg: '#E3F2FD', iconColor: '#1565C0',
      label: 'Kapasitas Terpasang',
      value: p.capacity_kwp, unit: 'kWp',
      sub: `<i class="bx bx-grid-alt"></i> ${p.panels_count} ${p.type === 'solar' ? 'panel' : 'turbin'}`,
      subCls: '',
    },
    {
      icon: 'bx-tachometer', iconBg: '#F3E5F5', iconColor: '#6A1B9A',
      label: 'Efisiensi',
      value: p.efficiency, unit: '%',
      sub: p.efficiency >= 80
        ? '<i class="bx bx-check-circle"></i> Di atas threshold'
        : '<i class="bx bx-error-circle"></i> Di bawah threshold',
      subCls: p.efficiency >= 80 ? 'ok' : 'err',
    },
    {
      icon: 'bx-thermometer', iconBg: '#FEF3DC', iconColor: '#B8750A',
      label: 'Temperatur Panel',
      value: p.temperature, unit: '°C',
      sub: `<i class="bx ${tempIcon}"></i> ${p.temperature > 55 ? 'Kritis' : p.temperature > 45 ? 'Perlu perhatian' : 'Normal'}`,
      subCls: tempStatus,
    },
  ];

  const container = document.getElementById('metricCards');
  if (!container) return;
  container.innerHTML = cards.map(c => `
    <div class="metric-card">
      <div class="metric-card__icon" style="background:${c.iconBg}">
        <i class="bx ${c.icon}" style="color:${c.iconColor}"></i>
      </div>
      <div class="metric-card__label">${c.label}</div>
      <div class="metric-card__value">${c.value}<span>${c.unit}</span></div>
      <div class="metric-card__sub ${c.subCls}">${c.sub}</div>
    </div>
  `).join('');

  if (typeof gsap !== 'undefined') {
    gsap.from('.metric-card', { y: 16, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' });
  }
}

function renderKomponen(p) {
  const komponen = [
    { name: 'Inverter', desc: 'Konverter DC ke AC', icon: 'bx-chip', iconBg: '#DCF5E7', iconColor: '#1A6B3C', status: p.inverter },
    { name: 'Baterai',  desc: 'Penyimpan energi',   icon: 'bx-battery', iconBg: '#E3F2FD', iconColor: '#1565C0', status: p.battery },
    { name: 'Sensor',   desc: 'Monitoring radiasi',  icon: 'bx-radar', iconBg: '#F3E5F5', iconColor: '#6A1B9A', status: 'normal' },
    { name: p.type === 'solar' ? 'Panel Array' : 'Blade Turbin', desc: p.type === 'solar' ? `${p.panels_count} panel aktif` : `${p.panels_count} bilah`, icon: p.type === 'solar' ? 'bx-sun' : 'bx-wind', iconBg: '#FEF3DC', iconColor: '#B8750A', status: p.status === 'error' ? 'error' : p.status === 'warning' ? 'warning' : 'normal' },
  ];

  const list = document.getElementById('komponenList');
  if (list) {
    list.innerHTML = komponen.map(k => `
      <div class="komponen-item">
        <div class="komponen-item__left">
          <div class="komponen-item__icon" style="background:${k.iconBg}">
            <i class="bx ${k.icon}" style="color:${k.iconColor}"></i>
          </div>
          <div>
            <div class="komponen-item__name">${k.name}</div>
            <div class="komponen-item__desc">${k.desc}</div>
          </div>
        </div>
        <span class="komponen-badge ${k.status}">
          ${k.status === 'normal' ? 'Normal' : k.status === 'warning' ? 'Warning' : 'Error'}
        </span>
      </div>
    `).join('');
  }

  // Efficiency gauge
  const fill  = document.getElementById('effFill');
  const val   = document.getElementById('effValue');
  if (fill) setTimeout(() => { fill.style.width = p.efficiency + '%'; }, 300);
  if (val)  val.textContent = p.efficiency + '%';

  // CO2 box
  const co2 = document.getElementById('co2Val');
  if (co2) co2.textContent = p.co2_saved + ' kg';

  // Last update time
  const upd = document.getElementById('lastUpdate');
  if (upd) {
    const now = new Date();
    upd.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }
}

function renderGallery(p) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  // Foto placeholder dengan warna berbeda per kategori
  const photos = [
    { caption: 'Tampak keseluruhan instalasi', color: '#DCF5E7', icon: 'bx-image', iconColor: '#1A6B3C' },
    { caption: 'Panel/turbin dari dekat',      color: '#E3F2FD', icon: 'bx-sun',   iconColor: '#1565C0' },
    { caption: 'Unit inverter',                color: '#FEF3DC', icon: 'bx-chip',  iconColor: '#B8750A' },
    { caption: 'Panel kontrol & monitoring',   color: '#F3E5F5', icon: 'bx-desktop', iconColor: '#6A1B9A' },
    { caption: 'Kondisi area sekitar',         color: '#E8F5E9', icon: 'bx-map-pin', iconColor: '#2E7D32' },
    { caption: 'Meter & sensor',               color: '#E8EAF6', icon: 'bx-tachometer', iconColor: '#3949AB' },
  ];

  grid.innerHTML = photos.map((photo, i) => `
    <a class="gallery-item"
       data-fancybox="gallery-${p.id}"
       data-caption="${photo.caption} — ${p.name}"
       href="#gallery-placeholder-${i}">
      <div class="gallery-item__placeholder" style="background:${photo.color}">
        <i class="bx ${photo.icon}" style="color:${photo.iconColor};font-size:36px"></i>
        <span style="font-size:11px;color:${photo.iconColor};font-weight:500">${photo.caption}</span>
      </div>
      <div class="gallery-item__overlay">
        <i class="bx bx-zoom-in"></i>
      </div>
      <div class="gallery-item__caption">${photo.caption}</div>
    </a>

    <!-- Hidden lightbox content -->
    <div id="gallery-placeholder-${i}" style="display:none">
      <div style="
        width:600px; max-width:90vw;
        background:${photo.color};
        border-radius:12px;
        padding:60px 40px;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        gap:16px; text-align:center;
      ">
        <i class="bx ${photo.icon}" style="font-size:80px;color:${photo.iconColor}"></i>
        <h3 style="font-family:var(--font-heading);font-size:18px;color:#0D1F14">${photo.caption}</h3>
        <p style="font-size:14px;color:#4B6356">${p.name}<br>${p.location}</p>
      </div>
    </div>
  `).join('');

  // Init Fancybox
  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind(`[data-fancybox="gallery-${p.id}"]`, {
      animated: true,
      showClass: 'fancybox-zoomInUp',
      Toolbar: { display: { left: ['infobar'], middle: [], right: ['close'] } },
    });
  } else if (typeof $ !== 'undefined' && $.fancybox) {
    $(`[data-fancybox="gallery-${p.id}"]`).fancybox();
  }
}

function renderLogs(p) {
  // Generate log dummy berdasarkan status panel
  const baseDate = new Date('2026-07-05');
  const logs = [];

  if (p.status === 'error') {
    logs.push({ date: new Date('2026-07-05T06:32:00'), type: 'anomali', desc: 'Inverter mengalami gangguan serius. Output turun drastis.', status: 'open' });
    logs.push({ date: new Date('2026-07-04T22:10:00'), type: 'anomali', desc: 'Temperatur panel melebihi batas aman (58°C).', status: 'open' });
  }
  if (p.status === 'warning') {
    logs.push({ date: new Date('2026-07-05T05:15:00'), type: 'anomali', desc: `Efisiensi turun ke ${p.efficiency}%, di bawah threshold 65%.`, status: 'open' });
  }

  logs.push({ date: new Date('2026-07-03T10:00:00'), type: 'maintenance', desc: 'Pemeriksaan rutin bulanan. Semua komponen dicek.', status: 'selesai' });
  logs.push({ date: new Date('2026-06-28T08:30:00'), type: 'update', desc: 'Update firmware inverter ke versi 3.2.1.', status: 'selesai' });
  logs.push({ date: new Date('2026-06-20T14:00:00'), type: 'maintenance', desc: 'Pembersihan permukaan panel dari debu dan kotoran.', status: 'selesai' });
  logs.push({ date: new Date('2026-06-10T09:15:00'), type: 'anomali', desc: 'Penurunan output 15% akibat cuaca mendung berkepanjangan.', status: 'selesai' });
  logs.push({ date: new Date('2026-05-25T11:00:00'), type: 'update', desc: 'Kalibrasi ulang sensor radiasi matahari.', status: 'selesai' });
  logs.push({ date: new Date('2026-05-15T08:00:00'), type: 'maintenance', desc: `Pengecekan baut dan koneksi kabel pada ${p.panels_count} ${p.type === 'solar' ? 'panel' : 'turbin'}.`, status: 'selesai' });
  logs.push({ date: new Date('2026-04-30T13:30:00'), type: 'update', desc: 'Sinkronisasi data ke server Nexara berhasil.', status: 'selesai' });

  allLogs = logs.sort((a, b) => b.date - a.date);

  const subtitle = document.getElementById('logSubtitle');
  if (subtitle) subtitle.textContent = `${allLogs.length} event tercatat`;

  renderLogTable(allLogs);
}

function renderLogTable(logs) {
  const tbody = document.getElementById('logTableBody');
  if (!tbody) return;

  const typeLabel = { maintenance: 'Maintenance', anomali: 'Anomali', update: 'Update', info: 'Info' };
  const statusMap = {
    open:    { color: '#E53935', label: 'Terbuka' },
    selesai: { color: '#4CAF50', label: 'Selesai' },
    proses:  { color: '#F4A623', label: 'Dalam proses' },
  };

  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="log-table__loading">Tidak ada log ditemukan</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const s = statusMap[log.status] || statusMap.selesai;
    return `
    <tr>
      <td style="white-space:nowrap;font-family:var(--font-mono);font-size:12px">
        ${formatDateTime(log.date)}
      </td>
      <td>
        <span class="log-badge ${log.type}">${typeLabel[log.type] || log.type}</span>
      </td>
      <td style="min-width:200px">${log.desc}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:${s.color}">
          <span class="log-status-dot" style="background:${s.color}"></span>
          ${s.label}
        </span>
      </td>
    </tr>`;
  }).join('');
}

function setLogFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = filter === 'all' ? allLogs : allLogs.filter(l => l.type === filter);
  renderLogTable(filtered);
}

async function fetchWeatherAndChart(p) {
  const weatherEl = document.getElementById('weatherBadge');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
      `&hourly=shortwave_radiation,temperature_2m&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=Asia%2FMakassar&forecast_days=7`;

    const res  = await fetch(url);
    const data = await res.json();

    if (weatherEl && data.daily) {
      const tMax = data.daily.temperature_2m_max[0];
      const tMin = data.daily.temperature_2m_min[0];
      weatherEl.innerHTML = `<i class="bx bx-sun" style="color:#F4A623"></i><span>${tMin}°–${tMax}°C · ${p.location.split(',')[1]?.trim() || 'Lokal'}</span>`;
    }

    // Simpan data untuk chart
    energyData    = data.hourly.shortwave_radiation.slice(0, 24).map(r => +(r * 0.001 * p.capacity_kwp * 0.18).toFixed(1));
    radiationData = data.hourly.shortwave_radiation.slice(0, 24).map(r => +(r / 10).toFixed(1));

    document.getElementById('chartLoading').style.display = 'none';
    renderChart('hourly');

    const subtitle = document.getElementById('chartSubtitle');
    if (subtitle) subtitle.textContent = `Data real-time dari Open-Meteo · ${p.location}`;

  } catch {
    if (weatherEl) weatherEl.innerHTML = `<i class="bx bx-cloud"></i><span>Cuaca tidak tersedia</span>`;
    energyData    = generateDummy('hourly', p);
    radiationData = energyData.map(v => +(v * 3.5).toFixed(1));
    document.getElementById('chartLoading').style.display = 'none';
    renderChart('hourly');

    const subtitle = document.getElementById('chartSubtitle');
    if (subtitle) subtitle.textContent = 'Data estimasi (mode offline)';
  }
}

function generateDummy(mode, p) {
  const eff = (p?.efficiency || 80) / 100;
  if (mode === 'hourly') {
    return Array.from({ length: 24 }, (_, h) => {
      if (h < 6 || h > 18) return 0;
      const dist = Math.abs(h - 12);
      return +(Math.max(0, (45 - dist * 7) * eff + (Math.random() * 6 - 3))).toFixed(1);
    });
  }
  const count = mode === 'daily' ? 7 : 30;
  return Array.from({ length: count }, () => +(60 + Math.random() * 80 * eff).toFixed(1));
}

function renderChart(mode) {
  if (!chartCtx || !chartCanvas) return;
  chartMode = mode;

  let eData, rData, labels;

  if (mode === 'hourly' && energyData) {
    eData  = energyData;
    rData  = radiationData || eData.map(v => +(v * 3.5).toFixed(1));
    labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
  } else if (mode === 'daily') {
    eData  = generateDummy('daily', currentPanel);
    rData  = eData.map(v => +(v * 3.5).toFixed(1));
    labels = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  } else {
    eData  = generateDummy('monthly', currentPanel);
    rData  = eData.map(v => +(v * 3.5).toFixed(1));
    labels = Array.from({ length: 30 }, (_, i) => `${i+1}`);
  }

  const W = chartCanvas.width  = chartCanvas.parentElement.offsetWidth;
  const H = chartCanvas.height = 200;
  const pad = { top: 20, right: 16, bottom: 36, left: 38 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top - pad.bottom;

  chartCtx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...eData, ...rData, 1);
  const xStep  = cW / (labels.length - 1 || 1);
  const cx = i => pad.left + i * xStep;
  const cy = v => pad.top + cH - (v / maxVal) * cH;

  // Grid lines
  chartCtx.strokeStyle = 'rgba(0,0,0,0.05)';
  chartCtx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.top + cH * (1 - t);
    chartCtx.beginPath(); chartCtx.moveTo(pad.left, y); chartCtx.lineTo(pad.left + cW, y); chartCtx.stroke();
    chartCtx.fillStyle = 'rgba(0,0,0,0.35)';
    chartCtx.font = '10px Inter';
    chartCtx.fillText(`${Math.round(maxVal * t)}`, 2, y + 3);
  });

  // X labels
  chartCtx.fillStyle = 'rgba(0,0,0,0.4)'; chartCtx.font = '10px Inter'; chartCtx.textAlign = 'center';
  const step = Math.ceil(labels.length / 8);
  labels.forEach((lbl, i) => { if (i % step === 0) chartCtx.fillText(lbl, cx(i), H - 6); });
  chartCtx.textAlign = 'left';

  // Draw radiation (amber)
  drawLine(chartCtx, rData, cx, cy, '#F4A623', 'rgba(244,166,35,0.08)');
  // Draw energy (green)
  drawLine(chartCtx, eData, cx, cy, '#4ADE80', 'rgba(74,222,128,0.15)');

  // Dots for energy
  eData.forEach((v, i) => {
    if (v === 0) return;
    chartCtx.beginPath(); chartCtx.arc(cx(i), cy(v), 3, 0, Math.PI * 2);
    chartCtx.fillStyle = '#4ADE80'; chartCtx.fill();
  });
}

function drawLine(ctx, data, cx, cy, color, fill) {
  if (!data.length) return;
  ctx.beginPath(); ctx.moveTo(cx(0), cy(data[0]));
  data.forEach((v, i) => {
    if (!i) return;
    const px = cx(i-1), py = cy(data[i-1]), nx = cx(i), ny = cy(v), mx = (px+nx)/2;
    ctx.bezierCurveTo(mx, py, mx, ny, nx, ny);
  });
  ctx.lineTo(cx(data.length-1), cy(0)); ctx.lineTo(cx(0), cy(0)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx(0), cy(data[0]));
  data.forEach((v, i) => {
    if (!i) return;
    const px = cx(i-1), py = cy(data[i-1]), nx = cx(i), ny = cy(v), mx = (px+nx)/2;
    ctx.bezierCurveTo(mx, py, mx, ny, nx, ny);
  });
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

function switchChart(mode, btn) {
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderChart(mode);
}

function exportReport() {
  if (!currentPanel) return;

  const csvEscape = (val) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const now = new Date();
  const rows = [
    ['Laporan Panel', currentPanel.name],
    ['Tanggal Export', now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
    [''],
    ['INFORMASI PANEL'],
    ['Lokasi', currentPanel.location],
    ['Tipe', currentPanel.type === 'solar' ? 'Panel Surya' : 'Turbin Angin'],
    ['Kapasitas (kWp)', currentPanel.capacity_kwp],
    ['Dipasang', formatDate(currentPanel.installed_date)],
    ['Status', currentPanel.status.toUpperCase()],
    [''],
    ['PERFORMA HARI INI'],
    ['Output (kWh)', currentPanel.output_today],
    ['Efisiensi (%)', currentPanel.efficiency],
    ['Temperatur (°C)', currentPanel.temperature],
    ['CO2 Dihemat (kg)', currentPanel.co2_saved],
    [''],
    ['STATUS KOMPONEN'],
    ['Inverter', currentPanel.inverter],
    ['Baterai', currentPanel.battery],
    ['Sensor', 'Normal'],
    [''],
    ['Dibuat oleh', 'Nexara Energy Intelligence Platform'],
  ];

  const csvContent = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Laporan_${currentPanel.id}_${now.toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function scheduleMaintenance() {
  document.getElementById('maintenanceModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function saveMaintenance() {
  const date = document.getElementById('maintDate').value;
  const type = document.getElementById('maintType').value;
  const note = document.getElementById('maintNote').value;

  if (!date) { alert('Pilih tanggal maintenance!'); return; }

  // Simpan ke localStorage
  const key   = `nexara_maintenance_${currentPanel?.id}`;
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  saved.push({ date, type, note, createdAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(saved));

  closeModal('maintenanceModal');

  // Tambah ke log tabel
  allLogs.unshift({ date: new Date(date), type: 'maintenance', desc: `Jadwal maintenance: ${type}${note ? ' — ' + note : ''}`, status: 'proses' });
  renderLogTable(allLogs);

  // Toast notifikasi
  showToast(`Maintenance dijadwalkan: ${formatDate(date)}`);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:1000;
    background:var(--clr-primary); color:#fff;
    padding:12px 20px; border-radius:10px;
    font-size:14px; font-weight:500;
    box-shadow:0 4px 16px rgba(0,0,0,0.2);
    display:flex; align-items:center; gap:8px;
    animation: slideIn 0.3s ease;
  `;
  toast.innerHTML = `<i class="bx bx-check-circle" style="font-size:18px"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('show');
}

function handleLogout() {
  localStorage.removeItem('nexara_session');
  sessionStorage.removeItem('nexara_session');
  window.location.href = 'auth.html';
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}
function formatDateTime(date) {
  return date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) + ' ' +
    date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

window.addEventListener('resize', () => { if (energyData) renderChart(chartMode); });