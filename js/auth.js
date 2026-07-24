document.addEventListener('DOMContentLoaded', () => {

  // AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 600, once: true, offset: 40 });
  }

  // Cek hash URL untuk auto-switch ke register
  if (window.location.hash === '#register') switchTab('register');

  // Cek kalau sudah login, langsung redirect (cek keduanya)
  const session = localStorage.getItem('nexara_session')
               || sessionStorage.getItem('nexara_session');
  if (session) {
    try {
      const user = JSON.parse(session);
      if (user && user.email) {
        window.location.href = 'dashboard.html';
        return;
      }
    } catch {}
  }

  // Canvas particles background
  initCanvas();

  // Real-time validation
  setupValidation();

  // Password strength checker
  const regPw = document.getElementById('regPassword');
  if (regPw) {
    regPw.addEventListener('input', () => checkPasswordStrength(regPw.value));
  }

  // Tutup modal lupa password pakai tombol Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeForgotModal();
  });
});

function switchTab(tab) {
  const loginForm    = document.getElementById('formLogin');
  const registerForm = document.getElementById('formRegister');
  const tabLogin     = document.getElementById('tabLogin');
  const tabRegister  = document.getElementById('tabRegister');
  const indicator    = document.getElementById('tabIndicator');

  if (tab === 'login') {
    loginForm.style.display    = 'block';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    indicator.classList.remove('right');
    // animate in
    animateFormIn(loginForm);
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    indicator.classList.add('right');
    animateFormIn(registerForm);
  }
  clearAlerts();
}

function animateFormIn(el) {
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
  }
}

// ── Validation Helpers ────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePassword(pw) {
  return pw.length >= 8;
}

function setFieldState(fieldId, state, errorMsg = '') {
  const field   = document.getElementById(fieldId);
  const input   = field ? field.querySelector('input, select') : null;
  const errorEl = field ? field.querySelector('.auth-field__error') : null;
  const statusEl = field ? field.querySelector('.auth-field__status') : null;

  if (!field || !input) return;

  input.classList.remove('is-valid', 'is-invalid');

  if (state === 'valid') {
    input.classList.add('is-valid');
    if (statusEl) { statusEl.innerHTML = '<i class="bx bx-check-circle"></i>'; statusEl.className = 'auth-field__status valid'; }
    if (errorEl)  { errorEl.textContent = ''; errorEl.classList.remove('show'); }
  } else if (state === 'invalid') {
    input.classList.add('is-invalid');
    if (statusEl) { statusEl.innerHTML = '<i class="bx bx-x-circle"></i>'; statusEl.className = 'auth-field__status invalid'; }
    if (errorEl)  { errorEl.textContent = errorMsg; errorEl.classList.add('show'); }
  } else {
    if (statusEl) { statusEl.className = 'auth-field__status'; statusEl.innerHTML = ''; }
    if (errorEl)  { errorEl.textContent = ''; errorEl.classList.remove('show'); }
  }
}

function showAlert(alertId, msg, type = 'error') {
  const el = document.getElementById(alertId);
  if (!el) return;
  const icon = type === 'error' ? 'bx-error-circle' : 'bx-check-circle';
  el.className = `auth-alert ${type}`;
  el.innerHTML = `<i class="bx ${icon}"></i> ${msg}`;
  el.style.display = 'flex';
}

function clearAlerts() {
  ['loginAlert', 'registerAlert', 'forgotAlert', 'forgotResetAlert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
}

function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  if (!btn) return;
  const text   = btn.querySelector('.auth-submit__text');
  const loader = btn.querySelector('.auth-submit__loader');
  btn.disabled = loading;
  if (text)   text.style.display   = loading ? 'none' : 'flex';
  if (loader) loader.style.display = loading ? 'flex' : 'none';
}

function setupValidation() {
  // Login
  const loginEmail = document.getElementById('loginEmail');
  const loginPw    = document.getElementById('loginPassword');
  if (loginEmail) loginEmail.addEventListener('blur', () => {
    if (!loginEmail.value) return;
    validateEmail(loginEmail.value)
      ? setFieldState('loginEmailField', 'valid')
      : setFieldState('loginEmailField', 'invalid', 'Format email tidak valid');
  });
  if (loginPw) loginPw.addEventListener('blur', () => {
    if (!loginPw.value) return;
    loginPw.value.length > 0
      ? setFieldState('loginPasswordField', 'valid')
      : setFieldState('loginPasswordField', 'invalid', 'Password tidak boleh kosong');
  });

  // Register
  const fields = {
    regNama:    ['regNamaField',    v => v.trim().length >= 2,      'Nama minimal 2 karakter'],
    regOrg:     ['regOrgField',     v => v.trim().length >= 2,      'Nama organisasi minimal 2 karakter'],
    regEmail:   ['regEmailField',   validateEmail,                   'Format email tidak valid'],
    regPassword:['regPasswordField',validatePassword,               'Password minimal 8 karakter'],
  };
  Object.entries(fields).forEach(([id, [fieldId, validator, errMsg]]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => {
      if (!el.value) return;
      validator(el.value)
        ? setFieldState(fieldId, 'valid')
        : setFieldState(fieldId, 'invalid', errMsg);
    });
  });

  // Konfirmasi password
  const regConfirm = document.getElementById('regConfirm');
  if (regConfirm) regConfirm.addEventListener('blur', () => {
    if (!regConfirm.value) return;
    const pw = document.getElementById('regPassword');
    regConfirm.value === pw.value
      ? setFieldState('regConfirmField', 'valid')
      : setFieldState('regConfirmField', 'invalid', 'Password tidak cocok');
  });
}

function checkPasswordStrength(pw) {
  const wrapper = document.getElementById('pwStrength');
  const label   = document.getElementById('pwStrengthLabel');
  const bars    = wrapper ? wrapper.querySelectorAll('.pw-strength__bars span') : [];

  if (!wrapper || !pw) { if (wrapper) wrapper.style.display = 'none'; return; }
  wrapper.style.display = 'flex';

  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);

  const colors = ['#E53935', '#F4A623', '#FDD835', '#4CAF50'];
  const labels = ['Terlalu lemah', 'Lemah', 'Cukup kuat', 'Kuat', 'Sangat kuat'];
  bars.forEach((bar, i) => {
    bar.style.background = i < score ? colors[score - 1] : 'var(--clr-border)';
  });
  if (label) {
    label.textContent  = labels[score] || 'Terlalu lemah';
    label.style.color  = score > 0 ? colors[score - 1] : 'var(--clr-text-muted)';
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) icon.className = isHidden ? 'bx bx-show' : 'bx bx-hide';
}

function handleLogin() {
  clearAlerts();
  const email = document.getElementById('loginEmail')?.value?.trim();
  const pw    = document.getElementById('loginPassword')?.value;
  const remember = document.getElementById('rememberMe')?.checked;
  let valid   = true;

  if (!email) {
    setFieldState('loginEmailField', 'invalid', 'Email tidak boleh kosong');
    valid = false;
  } else if (!validateEmail(email)) {
    setFieldState('loginEmailField', 'invalid', 'Format email tidak valid');
    valid = false;
  } else {
    setFieldState('loginEmailField', 'valid');
  }

  if (!pw) {
    setFieldState('loginPasswordField', 'invalid', 'Password tidak boleh kosong');
    valid = false;
  } else {
    setFieldState('loginPasswordField', 'valid');
  }

  if (!valid) return;

  setLoading('loginBtn', true);

  // Simulasi loading 1.2 detik (meniru API call)
  setTimeout(() => {
    // Cek user di localStorage
    const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
    const user  = users.find(u => u.email === email && u.password === btoa(pw));

    if (user) {
      // Simpan session
      const session = { email: user.email, nama: user.nama, org: user.org, role: user.role };

      localStorage.setItem('nexara_session', JSON.stringify(session));
      if (!remember) {
        // Tandai sebagai session sementara
        session._temp = true;
        sessionStorage.setItem('nexara_session', JSON.stringify(session));
      }
      // Redirect ke dashboard
      window.location.href = 'dashboard.html';
    } else {
      setLoading('loginBtn', false);
      showAlert('loginAlert', 'Email atau password salah. Periksa kembali dan coba lagi.');
      setFieldState('loginPasswordField', 'invalid', '');
    }
  }, 1200);
}

function handleRegister() {
  clearAlerts();
  const nama    = document.getElementById('regNama')?.value?.trim();
  const org     = document.getElementById('regOrg')?.value?.trim();
  const email   = document.getElementById('regEmail')?.value?.trim();
  const role    = document.getElementById('regRole')?.value;
  const pw      = document.getElementById('regPassword')?.value;
  const confirm = document.getElementById('regConfirm')?.value;
  const terms   = document.getElementById('agreeTerms')?.checked;
  let valid     = true;

  // Validasi semua field
  if (!nama || nama.length < 2) {
    setFieldState('regNamaField', 'invalid', 'Nama minimal 2 karakter'); valid = false;
  } else { setFieldState('regNamaField', 'valid'); }

  if (!org || org.length < 2) {
    setFieldState('regOrgField', 'invalid', 'Nama organisasi wajib diisi'); valid = false;
  } else { setFieldState('regOrgField', 'valid'); }

  if (!email || !validateEmail(email)) {
    setFieldState('regEmailField', 'invalid', 'Format email tidak valid'); valid = false;
  } else { setFieldState('regEmailField', 'valid'); }

  if (!role) {
    setFieldState('regRoleField', 'invalid', 'Pilih peran kamu'); valid = false;
  }

  if (!pw || !validatePassword(pw)) {
    setFieldState('regPasswordField', 'invalid', 'Password minimal 8 karakter'); valid = false;
  } else { setFieldState('regPasswordField', 'valid'); }

  if (!confirm || confirm !== pw) {
    setFieldState('regConfirmField', 'invalid', 'Password tidak cocok'); valid = false;
  } else { setFieldState('regConfirmField', 'valid'); }

  if (!terms) {
    showAlert('registerAlert', 'Kamu harus menyetujui Syarat & Ketentuan untuk melanjutkan.');
    valid = false;
  }

  if (!valid) return;

  setLoading('registerBtn', true);

  setTimeout(() => {
    // Cek email sudah terdaftar
    const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
    if (users.find(u => u.email === email)) {
      setLoading('registerBtn', false);
      showAlert('registerAlert', 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');
      setFieldState('regEmailField', 'invalid', 'Email sudah digunakan');
      return;
    }

    // Simpan user baru
    const newUser = { nama, org, email, role, password: btoa(pw), createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('nexara_users', JSON.stringify(users));

    // Simpan session
    const session = { email, nama, org, role };
    localStorage.setItem('nexara_session', JSON.stringify(session));

    setLoading('registerBtn', false);

    // Tampilkan success state
    const formWrap = document.querySelector('.auth-form-wrap');
    const success  = document.getElementById('authSuccess');
    if (formWrap && success) {
      document.getElementById('formRegister').style.display = 'none';
      document.querySelector('.auth-tabs').style.display    = 'none';
      success.style.display = 'block';
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(success, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4 });
      }
    }

    // Redirect setelah 2 detik
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2200);

  }, 1500);
}

// ── Social Login (UI Only) ────────────────────────────
function handleSocialLogin(provider) {
  showAlert('loginAlert', `Login dengan ${provider} belum tersedia di versi demo ini.`, 'error');
}

let forgotVerifiedEmail = null; // email yang lolos verifikasi step 1

function openForgotModal() {
  const overlay = document.getElementById('forgotOverlay');
  if (!overlay) return;

  // Reset ke step 1 tiap kali dibuka
  document.getElementById('forgotStepEmail').style.display   = 'block';
  document.getElementById('forgotStepReset').style.display   = 'none';
  document.getElementById('forgotStepSuccess').style.display = 'none';

  const emailInput = document.getElementById('forgotEmail');
  if (emailInput) emailInput.value = '';
  const newPw = document.getElementById('forgotNewPw');
  const confirmPw = document.getElementById('forgotConfirmPw');
  if (newPw) newPw.value = '';
  if (confirmPw) confirmPw.value = '';

  setFieldState('forgotEmailField', 'none');
  setFieldState('forgotNewPwField', 'none');
  setFieldState('forgotConfirmPwField', 'none');
  clearAlerts();
  forgotVerifiedEmail = null;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeForgotModal(e) {
  // Kalau dipanggil dari klik overlay, hanya tutup kalau yang diklik overlay-nya sendiri
  if (e && e.target && e.target.id !== 'forgotOverlay') return;
  const overlay = document.getElementById('forgotOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function handleForgotEmailSubmit() {
  clearAlerts();
  const email = document.getElementById('forgotEmail')?.value?.trim();

  if (!email) {
    setFieldState('forgotEmailField', 'invalid', 'Email tidak boleh kosong');
    return;
  }
  if (!validateEmail(email)) {
    setFieldState('forgotEmailField', 'invalid', 'Format email tidak valid');
    return;
  }

  setLoading('forgotEmailBtn', true);

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
    const user  = users.find(u => u.email === email);

    setLoading('forgotEmailBtn', false);

    if (!user) {
      setFieldState('forgotEmailField', 'invalid', 'Email ini belum terdaftar di Nexara');
      showAlert('forgotAlert', 'Email tidak ditemukan. Periksa kembali atau daftar akun baru.');
      return;
    }

    setFieldState('forgotEmailField', 'valid');
    forgotVerifiedEmail = email;

    // Pindah ke step 2
    document.getElementById('forgotVerifiedEmail').textContent = email;
    document.getElementById('forgotStepEmail').style.display = 'none';
    document.getElementById('forgotStepReset').style.display = 'block';

    if (typeof gsap !== 'undefined') {
      gsap.fromTo('#forgotStepReset', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
    }
  }, 900);
}

function handleResetPassword() {
  if (!forgotVerifiedEmail) return;
  clearAlerts();

  const newPw     = document.getElementById('forgotNewPw')?.value;
  const confirmPw = document.getElementById('forgotConfirmPw')?.value;
  let valid = true;

  if (!newPw || !validatePassword(newPw)) {
    setFieldState('forgotNewPwField', 'invalid', 'Password minimal 8 karakter');
    valid = false;
  } else {
    setFieldState('forgotNewPwField', 'valid');
  }

  if (!confirmPw || confirmPw !== newPw) {
    setFieldState('forgotConfirmPwField', 'invalid', 'Password tidak cocok');
    valid = false;
  } else {
    setFieldState('forgotConfirmPwField', 'valid');
  }

  if (!valid) return;

  setLoading('forgotResetBtn', true);

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('nexara_users') || '[]');
    const idx   = users.findIndex(u => u.email === forgotVerifiedEmail);

    if (idx === -1) {
      setLoading('forgotResetBtn', false);
      showAlert('forgotResetAlert', 'Terjadi kesalahan, akun tidak ditemukan. Coba lagi.');
      return;
    }

    users[idx].password = btoa(newPw);
    localStorage.setItem('nexara_users', JSON.stringify(users));

    setLoading('forgotResetBtn', false);

    document.getElementById('forgotStepReset').style.display   = 'none';
    document.getElementById('forgotStepSuccess').style.display = 'block';

    if (typeof gsap !== 'undefined') {
      gsap.fromTo('#forgotStepSuccess', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.35 });
    }

    const loginEmailInput = document.getElementById('loginEmail');
    if (loginEmailInput) loginEmailInput.value = forgotVerifiedEmail;

    forgotVerifiedEmail = null;
  }, 900);
}

function initCanvas() {
  const canvas = document.getElementById('authCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const nodes = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: 2 + Math.random() * 2,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    nodes.forEach((n, i) => {
      nodes.slice(i + 1).forEach(m => {
        const dist = Math.hypot(n.x - m.x, n.y - m.y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(74,222,128,${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth   = 0.8;
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74,222,128,0.4)';
      ctx.fill();

      // Move
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}