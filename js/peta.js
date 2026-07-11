let topbarAlerts = [];

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

let allPanels    = [];
let activeStatus = 'all';
let activeType   = 'all';
let selectedPanelId = null;

const FALLBACK_PANELS = [
  { id:'INS-001', name:'Panel Surya Bali Selatan',    location:'Denpasar, Bali',              type:'solar', status:'active',  output_today:208, efficiency:97, co2_saved:124.8 },
  { id:'INS-002', name:'Panel Surya Surabaya Barat',  location:'Surabaya, Jawa Timur',         type:'solar', status:'active',  output_today:142, efficiency:94, co2_saved:85.2  },
  { id:'INS-003', name:'Turbin Angin Enrekang',       location:'Enrekang, Sulawesi Selatan',    type:'wind',  status:'warning', output_today:87,  efficiency:61, co2_saved:52.2  },
  { id:'INS-004', name:'Panel Surya Medan Utara',     location:'Medan, Sumatera Utara',        type:'solar', status:'active',  output_today:112, efficiency:88, co2_saved:67.2  },
  { id:'INS-005', name:'Panel Surya Makassar',        location:'Makassar, Sulawesi Selatan',   type:'solar', status:'error',   output_today:18,  efficiency:23, co2_saved:10.8  },
  { id:'INS-006', name:'Turbin Angin Bangka',         location:'Bangka, Kep. Bangka Belitung', type:'wind',  status:'active',  output_today:164, efficiency:82, co2_saved:98.4  },
  { id:'INS-007', name:'Panel Surya Yogyakarta',      location:'Yogyakarta, DIY',              type:'solar', status:'active',  output_today:98,  efficiency:91, co2_saved:58.8  },
  { id:'INS-008', name:'Panel Surya Lombok',          location:'Mataram, NTB',                 type:'solar', status:'warning', output_today:76,  efficiency:68, co2_saved:45.6  },
];

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

  await loadPanels();
  applyFiltersAndRender();
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
    const res  = await fetch('assets/data/panels.json', { cache: 'no-store' });
    const data = await res.json();
    allPanels  = data.installations || FALLBACK_PANELS;
  } catch (e) {
    allPanels = FALLBACK_PANELS;
  }
}

function setStatusFilter(status, btn) {
  activeStatus = status;
  const group = btn.parentElement;
  group.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFiltersAndRender();
}
function setTypeFilter(type, btn) {
  activeType = type;
  const group = btn.parentElement;
  group.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const filtered = allPanels.filter(p => {
    if (activeStatus !== 'all' && p.status !== activeStatus) return false;
    if (activeType !== 'all' && p.type !== activeType) return false;
    return true;
  });

  document.getElementById('mapCount').textContent = `${filtered.length} lokasi`;
  document.getElementById('filterResultCount').textContent = `${filtered.length} instalasi ditemukan`;

  renderMapMarkers(filtered);

  if (selectedPanelId && !filtered.some(p => p.id === selectedPanelId)) {
    closeDetailPanel();
  }
}

function renderMapMarkers(panels) {
  const mapEl = document.getElementById('mapMarkers');
  if (!mapEl) return;

  const statusColors = { active: '#4CAF50', warning: '#F4A623', error: '#E53935' };

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
      const angle = (i / group.length) * Math.PI * 2;
      const spread = group.length > 1 ? 10 : 0;
      const x = base.x + Math.cos(angle) * spread;
      const y = base.y + Math.sin(angle) * spread;
      const color = statusColors[p.status] || '#4CAF50';

      markersHTML += `
        <g class="map-marker" onclick="openDetailPanel('${p.id}')">
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

function openDetailPanel(id) {
  const p = allPanels.find(x => x.id === id);
  if (!p) return;
  selectedPanelId = id;

  const statusLabel = { active: 'Aktif', warning: 'Warning', error: 'Error' };
  const statusColor  = { active: '#1A6B3C', warning: '#8A5A00', error: '#C0392B' };
  const statusBg     = { active: '#DCF5E7', warning: '#FFF3D6', error: '#FDECEC' };
  const typeIcon     = { solar: 'bx-sun', wind: 'bx-wind' };
  const typeBg       = { solar: '#DCF5E7', wind: '#E3F2FD' };
  const typeColor    = { solar: '#1A6B3C', wind: '#1565C0' };

  document.getElementById('detailIcon').style.background = typeBg[p.type] || '#DCF5E7';
  document.getElementById('detailIcon').innerHTML = `<i class="bx ${typeIcon[p.type] || 'bx-sun'}" style="color:${typeColor[p.type] || '#1A6B3C'}"></i>`;

  const statusEl = document.getElementById('detailStatus');
  statusEl.textContent = statusLabel[p.status] || p.status;
  statusEl.style.background = statusBg[p.status] || '#DCF5E7';
  statusEl.style.color = statusColor[p.status] || '#1A6B3C';

  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailLocation').textContent = p.location;
  document.getElementById('detailOutput').textContent = `${p.output_today ?? '--'} kWh`;
  document.getElementById('detailEfficiency').textContent = `${p.efficiency ?? '--'}%`;
  document.getElementById('detailCo2').textContent = `${p.co2_saved ?? '--'} kg`;

  document.getElementById('detailBtn').onclick = () => goToDetail(p.id);

  document.getElementById('mapDetailPanel').classList.add('show');
}

function closeDetailPanel() {
  selectedPanelId = null;
  document.getElementById('mapDetailPanel').classList.remove('show');
}

function goToDetail(id) {
  localStorage.setItem('nexara_selected_panel', id);
  window.location.href = 'detail.html';
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