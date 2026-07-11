let currentUser = null;
let usingSessionStorage = false;
let topbarAlerts = [];

const ROLE_LABELS = {
  operator:   'Operator Energi',
  analis:     'Analis / Peneliti',
  pemerintah: 'Instansi Pemerintah',
  konsultan:  'Konsultan Energi',
  lainnya:    'Lainnya',
};

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

document.addEventListener('DOMContentLoaded', () => {
  const localSession   = localStorage.getItem('nexara_session');
  const sessionSession = sessionStorage.getItem('nexara_session');

  const raw = localSession || sessionSession;
  if (!raw) { window.location.href = 'auth.html'; return; }

  usingSessionStorage = !localSession && !!sessionSession;
  currentUser = JSON.parse(raw);

  renderUserInfo(currentUser);
  fillProfileForm(currentUser);
  renderGreeting(currentUser.nama);
  updateClock();
  setInterval(updateClock, 60000);
  loadTopbarWeather();
  loadTopbarNotifications();

  document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('main').classList.toggle('sidebar-collapsed');
  });
});

function renderUserInfo(user) {
  const initials = user.nama ? user.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '--';
  const el = (id) => document.getElementById(id);
  if (el('sidebarAvatar')) el('sidebarAvatar').textContent = initials;
  if (el('topbarAvatar'))  el('topbarAvatar').textContent  = initials;
  if (el('sidebarName'))   el('sidebarName').textContent   = user.nama || 'User';
  if (el('sidebarOrg'))    el('sidebarOrg').textContent    = user.org  || '--';
  if (el('profileAvatar')) el('profileAvatar').textContent = initials;
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

function fillProfileForm(user) {
  document.getElementById('profileNama').value  = user.nama  || '';
  document.getElementById('profileOrg').value   = user.org   || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profileDisplayName').textContent = user.nama || 'User';
  document.getElementById('profileDisplayRole').textContent = ROLE_LABELS[user.role] || user.role || '--';
  document.getElementById('profileRoleBadge').textContent   = ROLE_LABELS[user.role] || user.role || '--';
}

function saveProfile() {
  const nama = document.getElementById('profileNama').value.trim();
  const org  = document.getElementById('profileOrg').value.trim();

  clearFieldError('profileNamaError');
  clearFieldError('profileOrgError');

  let valid = true;
  if (nama.length < 3) {
    showFieldError('profileNamaError', 'Nama minimal 3 karakter');
    valid = false;
  }
  if (org.length < 2) {
    showFieldError('profileOrgError', 'Organisasi wajib diisi');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('profileSaveBtn');
  btn.disabled = true;

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx !== -1) {
      users[idx].nama = nama;
      users[idx].org  = org;
      localStorage.setItem('nexara_users', JSON.stringify(users));
    }

    currentUser.nama = nama;
    currentUser.org  = org;
    const storage = usingSessionStorage ? sessionStorage : localStorage;
    storage.setItem('nexara_session', JSON.stringify(currentUser));

    renderUserInfo(currentUser);
    document.getElementById('profileDisplayName').textContent = nama;

    btn.disabled = false;
    showSaveMsg('profileSaveMsg', 'Perubahan berhasil disimpan', false);
  }, 400);
}

function changePassword() {
  const current = document.getElementById('currentPassword').value;
  const newPw   = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  clearFieldError('currentPasswordError');
  clearFieldError('newPasswordError');
  clearFieldError('confirmPasswordError');

  const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
  const idx = users.findIndex(u => u.email === currentUser.email);

  let valid = true;

  if (idx === -1 || users[idx].password !== btoa(current)) {
    showFieldError('currentPasswordError', 'Password saat ini salah');
    valid = false;
  }
  if (newPw.length < 8) {
    showFieldError('newPasswordError', 'Password baru minimal 8 karakter');
    valid = false;
  }
  if (confirm !== newPw || !newPw) {
    showFieldError('confirmPasswordError', 'Konfirmasi password tidak cocok');
    valid = false;
  }
  if (valid && current === newPw) {
    showFieldError('newPasswordError', 'Password baru harus berbeda dari password lama');
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById('securitySaveBtn');
  btn.disabled = true;

  setTimeout(() => {
    users[idx].password = btoa(newPw);
    localStorage.setItem('nexara_users', JSON.stringify(users));

    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    btn.disabled = false;
    showSaveMsg('securitySaveMsg', 'Password berhasil diganti', false);
  }, 400);
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}
function showSaveMsg(id, msg, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 3000);
}

function togglePwVisibility(id, btn) {
  const input = document.getElementById(id);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('bx-hide');
    icon.classList.add('bx-show');
  } else {
    input.type = 'password';
    icon.classList.remove('bx-show');
    icon.classList.add('bx-hide');
  }
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