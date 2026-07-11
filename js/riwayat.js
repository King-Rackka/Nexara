let allPanels     = [];
let allHistory    = [];   
let filtered      = [];   
let activeType    = 'all';
let currentPage   = 1;
let topbarAlerts = [];
const PAGE_SIZE   = 10;

const TODAY = new Date('2026-07-06T23:59:59');

const FALLBACK_PANELS = [
  { id:'INS-001', name:'Panel Surya Bali Selatan',    location:'Denpasar, Bali',              type:'solar', status:'active'  },
  { id:'INS-002', name:'Panel Surya Surabaya Barat',  location:'Surabaya, Jawa Timur',         type:'solar', status:'active'  },
  { id:'INS-003', name:'Turbin Angin Enrekang',       location:'Enrekang, Sulawesi Selatan',     type:'wind',  status:'warning' },
  { id:'INS-004', name:'Panel Surya Medan Utara',     location:'Medan, Sumatera Utara',        type:'solar', status:'active'  },
  { id:'INS-005', name:'Panel Surya Makassar',        location:'Makassar, Sulawesi Selatan',   type:'solar', status:'error'   },
  { id:'INS-006', name:'Turbin Angin Bangka',         location:'Bangka, Kep. Bangka Belitung', type:'wind',  status:'active'  },
  { id:'INS-007', name:'Panel Surya Yogyakarta',      location:'Yogyakarta, DIY',              type:'solar', status:'active'  },
  { id:'INS-008', name:'Panel Surya Lombok',          location:'Mataram, NTB',                 type:'solar', status:'warning' },
];

async function loadTopbarWeather() {
  const weatherEl = document.getElementById('weatherBadge');
  if (!weatherEl) return;

  const lat = -8.67, lon = 115.21; // Bali
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FMakassar&forecast_days=1`;
    const res  = await fetch(url);
    const data = await res.json();

    const tempMax = data.daily.temperature_2m_max[0];
    const tempMin = data.daily.temperature_2m_min[0];
    weatherEl.innerHTML = `
      <i class="bx bx-sun" style="color:#F4A623"></i>
      <span>${tempMin}°–${tempMax}°C · Bali</span>
    `;
  } catch (err) {
    console.warn('Open-Meteo API gagal:', err);
    weatherEl.innerHTML = `<i class="bx bx-cloud"></i><span>Data cuaca tidak tersedia</span>`;
  }
}

async function loadTopbarNotifications() {
  try {
    const res  = await fetch('assets/data/panels.json', { cache: 'no-store' });
    const data = await res.json();
    topbarAlerts = data.alerts || [];
  } catch (err) {
    topbarAlerts = [];
  }
  renderTopbarNotifications(topbarAlerts);
}

function renderTopbarNotifications(alertsData) {
  const list   = document.getElementById('notifList');
  const badge  = document.getElementById('notifBadge');
  const unread = alertsData.filter(a => !a.read).length;

  if (badge) badge.textContent = unread;
  if (!list) return;

  if (!alertsData.length) {
    list.innerHTML = '<div class="notif-panel__empty">Tidak ada notifikasi</div>';
    return;
  }

  const iconMap = {
    error:   { icon: 'bx-error-circle', bg: '#FDECEC', color: '#C0392B' },
    warning: { icon: 'bx-error',        bg: '#FEF3DC', color: '#B8750A' },
    info:    { icon: 'bx-info-circle',  bg: '#E3F2FD', color: '#1565C0' },
  };

  list.innerHTML = alertsData.map(a => {
    const ic   = iconMap[a.type] || iconMap.info;
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
  if (!panel || !overlay) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display   = isOpen ? 'none' : 'block';
  overlay.style.display = isOpen ? 'none' : 'block';
}

function markAllRead() {
  topbarAlerts.forEach(a => a.read = true);
  renderTopbarNotifications(topbarAlerts);
  toggleNotifPanel();
}

document.addEventListener('DOMContentLoaded', async () => {

  const session = localStorage.getItem('nexara_session') || sessionStorage.getItem('nexara_session');
  if (!session) { window.location.href = 'auth.html'; return; }
  const user = JSON.parse(session);
  renderUserInfo(user);
  renderGreeting(user.nama);
  updateClock();
  setInterval(updateClock, 60000);
  loadTopbarWeather();
  loadTopbarNotifications();

  document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('main').classList.toggle('sidebar-collapsed');
  });

  const fromDefault = new Date(TODAY); fromDefault.setDate(fromDefault.getDate() - 90);
  document.getElementById('dateFrom').value = toInputDate(fromDefault);
  document.getElementById('dateTo').value   = toInputDate(TODAY);
  document.getElementById('dateFrom').max   = toInputDate(TODAY);
  document.getElementById('dateTo').max     = toInputDate(TODAY);

  document.getElementById('dateFrom').addEventListener('change', () => { currentPage = 1; applyFilters(); });
  document.getElementById('dateTo').addEventListener('change',   () => { currentPage = 1; applyFilters(); });
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  await loadPanels();
  allHistory = generateHistory(allPanels);
  applyFilters();
});

function renderUserInfo(user) {
  const initials = user.nama ? user.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '--';
  const el = (id) => document.getElementById(id);
  if (el('sidebarAvatar')) el('sidebarAvatar').textContent = initials;
  if (el('topbarAvatar'))  el('topbarAvatar').textContent  = initials;
  if (el('sidebarName'))   el('sidebarName').textContent   = user.nama || 'User';
  if (el('sidebarOrg'))    el('sidebarOrg').textContent    = user.org  || '--';
}
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

async function loadPanels() {
  try {
    const res  = await fetch('assets/data/panels.json');
    const data = await res.json();
    allPanels  = data.installations || FALLBACK_PANELS;
  } catch (e) {
    allPanels = FALLBACK_PANELS;
  }
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h || 1;
}

const DESC_POOL = {
  anomali: [
    'Penurunan output akibat cuaca mendung berkepanjangan.',
    'Efisiensi turun di bawah threshold 65%.',
    'Temperatur komponen melebihi batas aman.',
    'Inverter mengalami gangguan sementara.',
    'Output tidak stabil terdeteksi sistem monitoring.',
  ],
  maintenance: [
    'Pemeriksaan rutin bulanan pada seluruh komponen.',
    'Pembersihan permukaan panel dari debu dan kotoran.',
    'Update firmware inverter ke versi terbaru.',
    'Kalibrasi ulang sensor radiasi/kecepatan angin.',
    'Pengecekan baut dan koneksi kabel instalasi.',
  ],
  laporan: [
    'Laporan produksi energi mingguan berhasil dibuat.',
    'Sinkronisasi data ke server Nexara berhasil.',
    'Laporan efisiensi bulanan tersedia untuk diunduh.',
    'Ringkasan CO₂ yang dihemat periode ini diperbarui.',
  ],
};
const TYPE_WEIGHT = ['laporan','laporan','maintenance','laporan','anomali','maintenance','laporan'];

function generateHistory(panels) {
  const history = [];
  const rangeStart = new Date(TODAY); rangeStart.setDate(rangeStart.getDate() - 120);

  panels.forEach((p, pIdx) => {
    const rand = seededRandom(hashSeed(p.id) + pIdx);
    const eventCount = 8 + Math.floor(rand() * 6); // 8–13 event per instalasi

    for (let i = 0; i < eventCount; i++) {
      const dayOffset = Math.floor(rand() * 120);
      const date = new Date(TODAY);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(6 + Math.floor(rand() * 14), Math.floor(rand() * 60), 0, 0);

      let type = TYPE_WEIGHT[Math.floor(rand() * TYPE_WEIGHT.length)];
      if ((p.status === 'warning' || p.status === 'error') && rand() < 0.4) type = 'anomali';

      const descPool = DESC_POOL[type];
      const desc = descPool[Math.floor(rand() * descPool.length)];

      let status = 'selesai';
      if (type === 'anomali') status = rand() < 0.3 ? 'terbuka' : 'selesai';

      const output = type === 'laporan' ? Math.round((p.capacity_kwp || 150) * (0.4 + rand() * 0.5)) : null;

      history.push({
        date, type, desc, status,
        installId: p.id,
        installName: p.name,
        installLocation: p.location,
        output,
      });
    }
  });

  return history.sort((a, b) => b.date - a.date);
}

function setTypeFilter(type, btn) {
  activeType = type;
  currentPage = 1;
  document.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const fromVal = document.getElementById('dateFrom').value;
  const toVal   = document.getElementById('dateTo').value;
  const from    = fromVal ? new Date(fromVal + 'T00:00:00') : null;
  const to      = toVal   ? new Date(toVal + 'T23:59:59')   : null;

  filtered = allHistory.filter(h => {
    if (activeType !== 'all' && h.type !== activeType) return false;
    if (from && h.date < from) return false;
    if (to && h.date > to) return false;
    return true;
  });

  renderSummary(filtered);
  renderTable();
}

function renderSummary(list) {
  const anomaliCount     = list.filter(h => h.type === 'anomali').length;
  const maintenanceCount = list.filter(h => h.type === 'maintenance').length;
  const totalEnergy      = list.filter(h => h.output).reduce((sum, h) => sum + h.output, 0);

  const cards = [
    { icon: 'bx-list-ul',      iconBg: '#DCF5E7', iconColor: '#1A6B3C', label: 'Total Event Tercatat',   value: list.length, unit: '' },
    { icon: 'bx-error-circle', iconBg: '#FDECEC', iconColor: '#C0392B', label: 'Anomali Terdeteksi',     value: anomaliCount, unit: '' },
    { icon: 'bx-wrench',       iconBg: '#E3F2FD', iconColor: '#1565C0', label: 'Maintenance Dilakukan',  value: maintenanceCount, unit: '' },
    { icon: 'bx-bolt-circle',  iconBg: '#F3E5F5', iconColor: '#6A1B9A', label: 'Total Energi Terekam',   value: totalEnergy.toLocaleString('id-ID'), unit: 'kWh' },
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
    </div>
  `).join('');
}

function renderTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('historySubtitle').textContent = `${filtered.length} event ditemukan pada periode terpilih`;

  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="log-table__loading">Tidak ada riwayat pada filter ini</td></tr>';
  } else {
    const typeLabel   = { maintenance: 'Maintenance', anomali: 'Anomali', laporan: 'Laporan' };
    const statusMap   = {
      terbuka: { color: '#E53935', label: 'Terbuka' },
      selesai: { color: '#4CAF50', label: 'Selesai' },
    };

    tbody.innerHTML = pageItems.map(h => {
      const s = statusMap[h.status] || statusMap.selesai;
      return `
      <tr>
        <td style="white-space:nowrap;font-family:var(--font-mono);font-size:12px">${formatDateTime(h.date)}</td>
        <td class="table-instalasi">
          <strong>${h.installName}</strong>
          <span>${h.installLocation}</span>
        </td>
        <td><span class="log-badge ${h.type}">${typeLabel[h.type] || h.type}</span></td>
        <td style="min-width:220px">${h.desc}</td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:${s.color}">
            <span class="log-status-dot" style="background:${s.color}"></span>${s.label}
          </span>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function goPrevPage() { if (currentPage > 1) { currentPage--; renderTable(); } }
function goNextPage() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage < totalPages) { currentPage++; renderTable(); }
}

function exportCSV() {
  if (!filtered.length) { alert('Tidak ada data untuk diekspor pada filter ini.'); return; }

  const header = ['Tanggal', 'Waktu', 'Instalasi', 'Lokasi', 'Tipe', 'Deskripsi', 'Status', 'Energi (kWh)'];
  const rows = filtered.map(h => [
    h.date.toLocaleDateString('id-ID'),
    h.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    h.installName,
    h.installLocation,
    h.type,
    h.desc,
    h.status,
    h.output ?? '',
  ]);

  const csvEscape = (val) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvContent = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const dateStr = toInputDate(TODAY);
  a.href = url;
  a.download = `Nexara_Riwayat_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatDateTime(d) {
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const mons = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]} ${d.getFullYear()} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function handleLogout() {
  localStorage.removeItem('nexara_session');
  sessionStorage.removeItem('nexara_session');
  window.location.href = 'auth.html';
}