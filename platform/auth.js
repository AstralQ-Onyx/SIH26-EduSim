/* ═══════════════════════════════════════════════════════════
   EduSim — Authentication Logic (auth.js)
   Phase 1 · Firebase + Google OAuth + Firestore
   ═══════════════════════════════════════════════════════════ */

// ── Firebase Config ────────────────────────────────────────
// Keys live in config.js (loaded before this script in auth.html)
const firebaseConfig = {
  apiKey:            ENV.FIREBASE_API_KEY,
  authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         ENV.FIREBASE_PROJECT_ID,
  storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             ENV.FIREBASE_APP_ID,
};

// NOTE: Replace apiKey above with your actual Web API key from
//       Firebase Console → Project Settings → General → Web API key.
//       The Client ID / Secret you provided are for OAuth on a backend server.
//       For the client-side Firebase SDK, only the apiKey is needed.

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ── Global State ───────────────────────────────────────────
let usernameCheckTimer = null;
let currentUsernameValid = false;
let passwordValid = false;

// ── Theme Init ─────────────────────────────────────────────
if (localStorage.getItem('edusim_theme') === 'light') {
  document.body.setAttribute('data-theme', 'light');
}

// ── Theme Toggle ────────────────────────────────────────────
window.toggleTheme = function () {
  const body = document.body;
  if (body.getAttribute('data-theme') === 'light') {
    body.removeAttribute('data-theme');
    localStorage.setItem('edusim_theme', 'dark');
  } else {
    body.setAttribute('data-theme', 'light');
    localStorage.setItem('edusim_theme', 'light');
  }
};

// ── Animated Background Canvas ─────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], animFrame;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Node {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r = Math.random() * 2 + 1;
      this.life = 1;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw(isLight) {
      const bColor = isLight ? '0,102,255' : '0,212,255';
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3);
      grad.addColorStop(0, `rgba(${bColor},0.8)`);
      grad.addColorStop(1, `rgba(${bColor},0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  function buildNodes() {
    const count = Math.floor(W * H / 14000);
    nodes = Array.from({ length: Math.min(count, 80) }, () => new Node());
  }

  function drawLines(isLight) {
    const maxDist = 140;
    const bColor = isLight ? '0,102,255' : '0,212,255';
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.25;
          ctx.strokeStyle = `rgba(${bColor},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function drawHexGrid(isLight) {
    const size = 40;
    const cols = Math.ceil(W / (size * 1.75)) + 2;
    const rows = Math.ceil(H / (size * 1.5)) + 2;
    const t = Date.now() / 4000;
    const rColor = isLight ? '94,23,235' : '123,47,255';

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const cx = c * size * 1.75 + (r % 2 === 0 ? 0 : size * 0.875);
        const cy = r * size * 1.5;
        const pulse = Math.sin(t + cx * 0.008 + cy * 0.006) * 0.5 + 0.5;
        const alpha = pulse * 0.06;
        ctx.strokeStyle = `rgba(${rColor},${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + size * Math.cos(angle);
          const py = cy + size * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);

    const isLight = document.body.getAttribute('data-theme') === 'light';

    // Deep background gradient
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    if (isLight) {
      bg.addColorStop(0, 'rgba(240, 244, 248, 0.85)');
      bg.addColorStop(0.5, 'rgba(230, 238, 244, 0.9)');
      bg.addColorStop(1, 'rgba(210, 220, 230, 1)');
    } else {
      bg.addColorStop(0, 'rgba(15, 25, 50, 0.85)');
      bg.addColorStop(0.5, 'rgba(8, 14, 30, 0.9)');
      bg.addColorStop(1, 'rgba(4, 8, 18, 1)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawHexGrid(isLight);
    nodes.forEach(n => { n.update(); n.draw(isLight); });
    drawLines(isLight);
    animFrame = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); buildNodes(); });
  resize();
  buildNodes();
  loop();
})();

// ── Floating Particles DOM ──────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.setProperty('--x', `${Math.random() * 100}%`);
    p.style.setProperty('--dur', `${Math.random() * 12 + 8}s`);
    p.style.setProperty('--delay', `${Math.random() * 12}s`);
    if (Math.random() > 0.5) p.style.background = 'var(--c-accent2)';
    container.appendChild(p);
  }
})();

// ── Tab Switching ───────────────────────────────────────────
function switchTab(tab) {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const slider = document.getElementById('tabSlider');

  if (tab === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    slider.classList.remove('right');
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    slider.classList.add('right');
  }
}

// ── Toggle Password Visibility ──────────────────────────────
function togglePw(fieldId, btn) {
  const field = document.getElementById(fieldId);
  const isHidden = field.type === 'password';
  field.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ── Password Validation ─────────────────────────────────────
function checkPassword() {
  const pw = document.getElementById('regPassword').value;
  const conds = {
    length: pw.length >= 6,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num: /[0-9]/.test(pw),
  };

  Object.entries(conds).forEach(([key, met]) => {
    const el = document.getElementById(`cond-${key}`);
    const icon = el.querySelector('.cond-icon');
    el.classList.toggle('met', met);
    icon.textContent = met ? '✓' : '○';
  });

  const score = Object.values(conds).filter(Boolean).length;
  const fill = document.getElementById('pwStrengthFill');
  fill.style.width = `${(score / 4) * 100}%`;
  fill.style.background = score < 2
    ? '#ff4466'
    : score < 4
      ? '#ffd700'
      : '#00ff88';

  passwordValid = Object.values(conds).every(Boolean);
  document.getElementById('regPassword').classList.toggle('valid', passwordValid);
  document.getElementById('regPassword').classList.toggle('invalid', !passwordValid && pw.length > 0);

  checkConfirm();
}

// ── Confirm Password ────────────────────────────────────────
function checkConfirm() {
  const pw = document.getElementById('regPassword').value;
  const conf = document.getElementById('regConfirm').value;
  const hint = document.getElementById('confirmHint');
  const confField = document.getElementById('regConfirm');
  if (!conf) { hint.style.display = 'none'; confField.classList.remove('valid', 'invalid'); return; }
  const match = pw === conf;
  hint.style.display = match ? 'none' : 'block';
  confField.classList.toggle('valid', match);
  confField.classList.toggle('invalid', !match);
}

// ── Username Availability Check ─────────────────────────────
function checkUsername() {
  const val = document.getElementById('regUsername').value.trim().toLowerCase();
  const hint = document.getElementById('usernameHint');
  const status = document.getElementById('usernameStatus');
  const field = document.getElementById('regUsername');

  currentUsernameValid = false;
  field.classList.remove('valid', 'invalid');

  if (val.length < 3) {
    hint.className = 'field-hint';
    hint.textContent = val.length ? 'Username must be at least 3 characters.' : '';
    status.textContent = '';
    return;
  }

  if (!/^[a-z0-9_]+$/.test(val)) {
    hint.className = 'field-hint error';
    hint.textContent = 'Only lowercase letters, numbers, and underscores.';
    status.textContent = '✗';
    status.style.color = 'var(--c-error)';
    field.classList.add('invalid');
    return;
  }

  // Debounce Firestore check
  clearTimeout(usernameCheckTimer);
  hint.textContent = 'Checking availability…';
  hint.className = 'field-hint';
  status.textContent = '⟳';
  status.style.color = 'var(--c-text-muted)';

  usernameCheckTimer = setTimeout(async () => {
    try {
      const snap = await db.collection('usernames').doc(val).get();
      if (snap.exists) {
        hint.className = 'field-hint error';
        hint.textContent = `@${val} is already taken.`;
        status.textContent = '✗';
        status.style.color = 'var(--c-error)';
        field.classList.add('invalid');
        field.classList.remove('valid');
        currentUsernameValid = false;
      } else {
        hint.className = 'field-hint success';
        hint.textContent = `@${val} is available!`;
        status.textContent = '✓';
        status.style.color = 'var(--c-success)';
        field.classList.add('valid');
        field.classList.remove('invalid');
        currentUsernameValid = true;
      }
    } catch (err) {
      hint.className = 'field-hint';
      hint.textContent = 'Could not verify — will check on submit.';
      currentUsernameValid = true; // allow optimistically
    }
  }, 700);
}

// ── Role Conditional Fields ─────────────────────────────────
function handleRoleChange() {
  const role = document.getElementById('regRole').value;
  const section = document.getElementById('conditionalSection');
  const orgLabel = document.getElementById('orgLabel');
  const yearLabel = document.getElementById('yearLabel');

  const showFor = ['student', 'teacher', 'researcher', 'industry', 'admin'];

  if (showFor.includes(role)) {
    section.style.display = 'block';

    if (role === 'student') {
      orgLabel.innerHTML = 'University / College <span class="req">*</span>';
      yearLabel.textContent = 'Year of Study';
      document.getElementById('regYear').placeholder = '3rd Year / Final Year…';
      document.getElementById('regOrg').placeholder = 'MIT / IIT Bombay / BITS…';
    } else if (role === 'teacher') {
      orgLabel.innerHTML = 'Institution / University <span class="req">*</span>';
      yearLabel.textContent = 'Designation';
      document.getElementById('regYear').placeholder = 'Associate Professor / HOD…';
      document.getElementById('regOrg').placeholder = 'Your institution name…';
    } else if (role === 'researcher') {
      orgLabel.innerHTML = 'Research Institute / University <span class="req">*</span>';
      yearLabel.textContent = 'Research Focus / Position';
      document.getElementById('regYear').placeholder = 'PhD Candidate / PostDoc / PI…';
      document.getElementById('regOrg').placeholder = 'IISER / NIT / IIT / Private Lab…';
    } else if (role === 'industry') {
      orgLabel.innerHTML = 'Company / Organization <span class="req">*</span>';
      yearLabel.textContent = 'Designation';
      document.getElementById('regYear').placeholder = 'Senior Engineer / CTO…';
      document.getElementById('regOrg').placeholder = 'Google / Infosys / Startup…';
    } else {
      orgLabel.innerHTML = 'Organization <span class="req">*</span>';
      yearLabel.textContent = 'Position / Title';
      document.getElementById('regYear').placeholder = 'Your title…';
      document.getElementById('regOrg').placeholder = 'Your organization…';
    }
  } else {
    section.style.display = 'none';
  }
}

// ── Show Toast ──────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');

  icon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  text.textContent = msg;

  toast.className = `toast toast-${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3800);
}

// ── Loading State ───────────────────────────────────────────
function setLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = show ? 'flex' : 'none';
}

function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

// ── Update Status Bar ───────────────────────────────────────
function setStatus(msg) {
  document.getElementById('statusText').textContent = msg;
}

// ── Google OAuth Sign-In (Redirect flow — bulletproof for Vercel/mobile) ──────
function handleGoogleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  setLoading(true);
  setStatus('REDIRECTING TO GOOGLE…');
  
  // This completely bypasses all browser popup blockers
  auth.signInWithRedirect(provider).catch(err => {
    setLoading(false);
    setStatus('SYSTEM ONLINE');
    showToast(`Authentication failed: ${err.message}`, 'error');
  });
}

// ── Email Login ─────────────────────────────────────────────
async function handleEmailLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const isAdminLogin = document.getElementById('adminLoginToggle')?.checked;

  setBtnLoading('loginSubmitBtn', true);
  setStatus('AUTHENTICATING CREDENTIALS…');

  if (isAdminLogin) {
    if (email === 'prismatix4@gmail.com' && pw === 'Prismatix4@edusim') {
      // Master admin — sign into Firebase with these credentials, then go to admin dashboard
      try {
        await auth.signInWithEmailAndPassword(email, pw);
      } catch (fireErr) {
        if (fireErr.code === 'auth/user-not-found' || fireErr.code === 'auth/invalid-credential') {
          // Auto-create the master admin account so Firestore permissions work
          try {
            const cred = await auth.createUserWithEmailAndPassword(email, pw);
            await cred.user.updateProfile({ displayName: 'Master Admin' });
            // Add to admins collection explicitly
            await db.collection('admins').doc(cred.user.uid).set({
              uid: cred.user.uid,
              email: email,
              addedAt: firebase.firestore.FieldValue.serverTimestamp(),
              addedBy: 'system'
            });
          } catch(createErr) {
            console.error('[Admin] Failed to create master admin:', createErr);
          }
        } else {
          console.warn('[Admin] Firebase sign-in skipped for master:', fireErr.code);
        }
      }
      showToast('Welcome, Master Admin!', 'success');
      setStatus('ACCESS GRANTED · REDIRECTING TO ADMIN DASHBOARD…');
      localStorage.setItem('edusim_admin_role', 'master');
      localStorage.setItem('edusim_admin_email', email);
      setBtnLoading('loginSubmitBtn', false);
      setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1200);
      return;
    }
    
    // Otherwise check Firebase for admin status
    try {
      const cred = await auth.signInWithEmailAndPassword(email, pw);
      const snap = await db.collection('admins').doc(cred.user.uid).get();
      if (!snap.exists) {
        auth.signOut();
        throw new Error('Not authorized as an admin.');
      }
      showToast(`Welcome back, Admin!`, 'success');
      localStorage.setItem('edusim_admin_role', 'admin');
      setStatus('ACCESS GRANTED · REDIRECTING TO ADMIN DASHBOARD…');
      setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1200);
    } catch (err) {
      setBtnLoading('loginSubmitBtn', false);
      setStatus('SYSTEM ONLINE · SECURE CONNECTION ESTABLISHED');
      showToast(err.message === 'Not authorized as an admin.' ? err.message : `Admin Login failed: Invalid credentials.`, 'error');
    }
    return;
  }

  // Regular User Login
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pw);
    const snap = await db.collection('users').doc(cred.user.uid).get();
    
    // Check if they are trying to log in as a normal user but they are actually an admin? (optional)
    
    const name = snap.exists ? snap.data().name || 'there' : 'there';
    showToast(`Welcome back, ${name.split(' ')[0]}!`, 'success');
    setStatus('ACCESS GRANTED · REDIRECTING…');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
  } catch (err) {
    setBtnLoading('loginSubmitBtn', false);
    setStatus('SYSTEM ONLINE · SECURE CONNECTION ESTABLISHED');
    const msgs = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been suspended.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/invalid-credential': 'Invalid email or password.',
    };
    showToast(msgs[err.code] || `Login failed: ${err.message}`, 'error');
  }
}

// ── Email Registration ──────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const email = document.getElementById('regEmail').value.trim();
  const pw = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const role = document.getElementById('regRole').value;
  const org = document.getElementById('regOrg')?.value.trim() || '';
  const dept = document.getElementById('regDept')?.value.trim() || '';
  const year = document.getElementById('regYear')?.value.trim() || '';
  const contact = document.getElementById('regContact').value.trim();

  const errEl = document.getElementById('regError');

  function showRegError(msg) {
    errEl.textContent = '⚠ ' + msg;
    errEl.classList.remove('hidden');
  }

  errEl.classList.add('hidden');

  // Client-side validations
  if (!name) return showRegError('Please enter your full name.');
  if (username.length < 3) return showRegError('Username must be at least 3 characters.');
  if (!/^[a-z0-9_]+$/.test(username)) return showRegError('Username: only lowercase letters, numbers, underscores.');
  if (!currentUsernameValid) return showRegError('Please wait for username availability check, or choose another.');
  if (!passwordValid) return showRegError('Password does not meet all requirements.');
  if (pw !== confirm) return showRegError('Passwords do not match.');
  if (!role) return showRegError('Please select your role.');

  const requiredOrg = ['student', 'teacher', 'researcher', 'industry', 'admin'];
  if (requiredOrg.includes(role) && !org) {
    return showRegError('Please enter your organization / institution.');
  }

  setBtnLoading('registerSubmitBtn', true);
  setStatus('CREATING SECURE ACCOUNT…');

  try {
    // 1. Double-check username uniqueness
    const usernameDoc = await db.collection('usernames').doc(username).get();
    if (usernameDoc.exists) {
      setBtnLoading('registerSubmitBtn', false);
      setStatus('SYSTEM ONLINE · SECURE CONNECTION ESTABLISHED');
      return showRegError(`Username @${username} was just taken. Please choose another.`);
    }

    // 2. Create Firebase Auth user
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    const uid = cred.user.uid;

    // 3. Update Auth display name
    await cred.user.updateProfile({ displayName: name });

    // 4. Batch write: user profile + username reservation
    const batch = db.batch();

    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
      uid,
      name,
      username,
      email,
      photoURL: '',
      authMethod: 'email',
      role,
      org,
      dept,
      year,
      contactMail: contact || email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: true,
    });

    const unameRef = db.collection('usernames').doc(username);
    batch.set(unameRef, { uid, reservedAt: firebase.firestore.FieldValue.serverTimestamp() });

    await batch.commit();

    // 5. Send verification email
    await cred.user.sendEmailVerification();

    showToast('Account created! Check your email to verify.', 'success');
    setStatus('REGISTRATION COMPLETE · REDIRECTING…');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1800);

  } catch (err) {
    setBtnLoading('registerSubmitBtn', false);
    setStatus('SYSTEM ONLINE · SECURE CONNECTION ESTABLISHED');
    const msgs = {
      'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password is too weak.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    showRegError(msgs[err.code] || `Registration failed: ${err.message}`);
  }
}

// ── Forgot Password ─────────────────────────────────────────
async function showForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) {
    showToast('Enter your email above first.', 'warn');
    document.getElementById('loginEmail').focus();
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Password reset email sent! Check your inbox.', 'success');
  } catch (err) {
    const msgs = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/invalid-email': 'Please enter a valid email address.',
    };
    showToast(msgs[err.code] || 'Could not send reset email.', 'error');
  }
}

// ── Auth State & Redirect Handling ──────────────────────────
// Check if we are returning from a Google Redirect
auth.getRedirectResult().then(result => {
  if (result.user) {
    setLoading(true);
    setStatus('FINALIZING SECURE CONNECTION...');
    const user = result.user;
    const isNew = result.additionalUserInfo?.isNewUser ?? false;

    if (isNew) {
      const userData = {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email,
        photoURL: user.photoURL || '',
        authMethod: 'google',
        role: '', username: '', org: '', dept: '', year: '', contactMail: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      db.collection('users').doc(user.uid).set(userData).then(() => {
        showToast('Google account linked! Please complete your profile.', 'success');
        setTimeout(() => { window.location.href = `dashboard.html?setup=1&uid=${user.uid}`; }, 1500);
      });
    } else {
      showToast(`Welcome back, ${user.displayName?.split(' ')[0] || 'there'}!`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    }
  } else {
    // If no redirect occurred, start observing normal auth state
    auth.onAuthStateChanged(user => {
      if (user) {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('setup')) {
          window.location.href = 'dashboard.html';
        }
      }
    });
  }
}).catch(err => {
  showToast(`Google Sign-In failed: ${err.message}`, 'error');
});
