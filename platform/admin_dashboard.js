/* ══════════════════════════════════════════════════════
   EduSim — Admin Dashboard JS
   ══════════════════════════════════════════════════════ */

// ── Firebase init ─────────────────────────────────────
const firebaseConfig = {
  apiKey:            ENV.FIREBASE_API_KEY,
  authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         ENV.FIREBASE_PROJECT_ID,
  storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             ENV.FIREBASE_APP_ID,
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let adminRole   = localStorage.getItem('edusim_admin_role'); // 'master' | 'admin'

// ── Theme ─────────────────────────────────────────────
if (localStorage.getItem('edusim_theme') === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
}
document.getElementById('themeBtn').addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('edusim_theme', isLight ? 'dark' : 'light');
});

// ── Auth Guard ─────────────────────────────────────────
function initDashboard(user) {
  if (adminRole === 'master') {
    const savedName = localStorage.getItem('edusim_admin_displayname') || 'Master Admin';
    currentUser = user || {
      uid: 'master',
      displayName: savedName,
      email: localStorage.getItem('edusim_admin_email') || 'prismatix4@gmail.com'
    };
    document.getElementById('adminName').textContent  = currentUser.displayName;
    document.getElementById('adminRole').textContent  = 'MASTER ADMINISTRATOR';
    document.getElementById('adminAvatar').textContent = currentUser.displayName.charAt(0).toUpperCase();
    document.getElementById('navAdmins').style.display = 'flex';

    // Silent Firebase authentication for Master Admin to ensure Firestore rules pass
    if (!user) {
      auth.signInWithEmailAndPassword('prismatix4@gmail.com', 'Prismatix4@edusim')
        .catch((err) => {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            auth.createUserWithEmailAndPassword('prismatix4@gmail.com', 'Prismatix4@edusim')
              .then(cred => {
                cred.user.updateProfile({ displayName: 'Master Admin' });
                db.collection('admins').doc(cred.user.uid).set({
                  uid: cred.user.uid, email: 'prismatix4@gmail.com',
                  addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: 'system'
                });
              });
          }
        });
    } else {
      loadAdmins();
      loadDashboardData();
    }
  } else if (adminRole === 'admin' && user) {
    currentUser = user;
    const savedName = localStorage.getItem('edusim_admin_displayname') || user.displayName || 'Admin';
    document.getElementById('adminName').textContent  = savedName;
    document.getElementById('adminRole').textContent  = 'SYSTEM ADMIN';
    document.getElementById('adminAvatar').textContent = savedName.charAt(0).toUpperCase();
    loadDashboardData();
  } else {
    localStorage.removeItem('edusim_admin_role');
    localStorage.removeItem('edusim_admin_email');
    window.location.href = 'auth.html';
  }
}

auth.onAuthStateChanged(user => {
  if (adminRole === 'master') {
    initDashboard(user);
  } else if (user && adminRole === 'admin') {
    initDashboard(user);
  } else if (!adminRole) {
    window.location.href = 'auth.html';
  }
});

// ── Logout ─────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('edusim_admin_role');
  localStorage.removeItem('edusim_admin_email');
  auth.signOut().catch(() => {}).finally(() => { window.location.href = 'auth.html'; });
});

// ── Tab Navigation ─────────────────────────────────────
document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

// ── Load All Dashboard Data ────────────────────────────
async function loadDashboardData() {
  try {
    // Load users
    try {
      const usersSnap = await db.collection('users').orderBy('createdAt', 'desc').get();
      document.getElementById('statTotalUsers').textContent = usersSnap.size;
      renderUserRows('recentUsersBody', usersSnap, 5, 4);
      renderUserRows('allUsersBody', usersSnap, Infinity, 5);
    } catch (e) {
      console.warn('Could not load users:', e);
      document.getElementById('statTotalUsers').textContent = '—';
      document.getElementById('recentUsersBody').innerHTML = `<tr><td colspan="4" class="table-empty" style="color:var(--error)">Access Denied</td></tr>`;
      document.getElementById('allUsersBody').innerHTML = `<tr><td colspan="5" class="table-empty" style="color:var(--error)">Access Denied</td></tr>`;
    }

    // Load admins
    try {
      const adminsSnap = await db.collection('admins').get();
      document.getElementById('statTotalAdmins').textContent = adminsSnap.size;
    } catch (e) {
      console.warn('Could not load admins:', e);
      document.getElementById('statTotalAdmins').textContent = '—';
    }

    // Load components
    try {
      const compsSnap = await db.collection('lab_components').get();
      document.getElementById('statTotalComps').textContent = compsSnap.size;
      renderCompsRows(compsSnap);
    } catch (e) {
      console.warn('Could not load components:', e);
      document.getElementById('statTotalComps').textContent = '—';
      renderCompsRows(null); // Will render built-ins only
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to load dashboard data: ' + err.message, 'error');
  }
}

function renderUserRows(tbodyId, snap, limit, cols) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="${cols}" class="table-empty">No users found.</td></tr>`;
    return;
  }
  let count = 0;
  snap.forEach(doc => {
    if (count++ >= limit) return;
    const u    = doc.data();
    const date = u.createdAt ? u.createdAt.toDate().toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : 'N/A';
    const role = (u.role || 'user').toLowerCase();
    const init = (u.name || '?').charAt(0).toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="row-user">
          <div class="row-avatar">${init}</div>
          <div>
            <div class="row-user-name">${u.name || 'Unknown'}</div>
            <div class="row-user-sub">@${u.username || '—'}</div>
          </div>
        </div>
      </td>
      <td>${u.email || '—'}</td>
      <td><span class="role-tag">${role.toUpperCase()}</span></td>
      ${cols === 5 ? `<td>${u.org || '—'}</td>` : ''}
      <td>${date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCompsRows(firestoreSnap) {
  const tbody = document.getElementById('compsBody');
  tbody.innerHTML = '';

  // ── Built-in registry components ──
  const registry = window.LAB_COMPONENTS || {};
  const builtinEntries = Object.values(registry);

  // ── Firestore custom components ──
  const firestoreDocs = [];
  if (firestoreSnap && !firestoreSnap.empty) {
    firestoreSnap.forEach(doc => firestoreDocs.push({ id: doc.id, ...doc.data() }));
  }

  if (builtinEntries.length === 0 && firestoreDocs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No components found.</td></tr>`;
    return;
  }

  // Render built-ins first
  builtinEntries.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${c.id}</code></td>
      <td>${c.label || c.id}</td>
      <td><span class="role-tag">${c.category || 'General'}</span></td>
      <td><span style="color:var(--muted)">—</span></td>
      <td><span style="font-size:11px;color:var(--muted);font-family:var(--font-ui);">Built-in</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Render Firestore custom ones
  firestoreDocs.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${c.id}</code></td>
      <td>${c.name || c.id}</td>
      <td><span class="role-tag">${c.category || 'Custom'}</span></td>
      <td>${c.glbUrl ? '<span style="color:var(--success)">✓ GLB</span>' : '<span style="color:var(--muted)">—</span>'}</td>
      <td><button class="btn danger" style="padding:4px 10px;font-size:11px;" onclick="deleteComponent('${c.id}')">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Admin Management ───────────────────────────────────
async function loadAdmins() {
  try {
    const snap  = await db.collection('admins').orderBy('addedAt', 'desc').get();
    const tbody = document.getElementById('adminsBody');
    tbody.innerHTML = '';
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No secondary admins added yet.</td></tr>`;
      return;
    }
    snap.forEach(doc => {
      const a    = doc.data();
      const date = a.addedAt ? a.addedAt.toDate().toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : 'N/A';
      const tr   = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${doc.id}</code></td>
        <td>${a.email || '—'}</td>
        <td>${date}</td>
        <td><button class="btn danger" style="padding:4px 10px;font-size:11px;" onclick="removeAdmin('${doc.id}')">Revoke</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.warn('Could not load admins list:', err);
    document.getElementById('adminsBody').innerHTML = `<tr><td colspan="4" class="table-empty" style="color:var(--error)">Access Denied</td></tr>`;
  }
}

document.getElementById('addAdminBtn')?.addEventListener('click', () => {
  document.getElementById('newAdminUid').value = '';
  document.getElementById('addAdminModal').classList.add('active');
});
document.getElementById('closeAddAdminModal').addEventListener('click', () => {
  document.getElementById('addAdminModal').classList.remove('active');
});

async function submitAddAdmin() {
  const uid = document.getElementById('newAdminUid').value.trim();
  if (!uid) return showToast('Please enter a UID', 'warn');
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return showToast('User not found in registry', 'error');
    const u = userSnap.data();
    await db.collection('admins').doc(uid).set({
      uid, email: u.email,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      addedBy: currentUser.uid
    });
    document.getElementById('addAdminModal').classList.remove('active');
    showToast('Admin access granted!', 'success');
    loadAdmins();
    loadDashboardData();
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

async function removeAdmin(uid) {
  if (!confirm('Revoke admin access for this user?')) return;
  try {
    await db.collection('admins').doc(uid).delete();
    showToast('Admin access revoked.', 'success');
    loadAdmins();
    loadDashboardData();
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

// ── Add Component ──────────────────────────────────────
let selectedGlbFile = null;

function handleGlbSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.glb')) {
    showToast('Only .glb files are supported', 'error');
    return;
  }
  selectedGlbFile = file;
  document.getElementById('glbFileName').textContent = file.name;
  document.getElementById('glbFileName').classList.add('file-name');
}

async function handleAddComponent(e) {
  e.preventDefault();
  const compId  = document.getElementById('compId').value.trim();
  const name    = document.getElementById('compName').value.trim();
  const cat     = document.getElementById('compCategory').value;
  const svg     = document.getElementById('compSvg').value.trim();
  const btn     = document.getElementById('btnSubmitComponent');

  btn.disabled = true;
  btn.querySelector('svg').style.display = 'none';
  btn.childNodes[btn.childNodes.length - 1].textContent = ' Uploading…';

  try {
    let glbUrl = null;
    if (selectedGlbFile) {
      const ref = storage.ref(`components/${compId}_${Date.now()}.glb`);
      await ref.put(selectedGlbFile);
      glbUrl = await ref.getDownloadURL();
    }

    await db.collection('lab_components').doc(compId).set({
      id: compId, name, category: cat, svg, glbUrl,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      addedBy: currentUser.uid
    });

    showToast('Component added to registry!', 'success');
    e.target.reset();
    selectedGlbFile = null;
    document.getElementById('glbFileName').textContent = 'Click to select .glb file';
    document.getElementById('glbFileName').classList.remove('file-name');
    loadDashboardData();
  } catch(err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('svg').style.display = '';
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Add to Registry';
  }
}

async function deleteComponent(id) {
  if (!confirm(`Remove component "${id}" from registry?`)) return;
  try {
    await db.collection('lab_components').doc(id).delete();
    showToast('Component removed.', 'success');
    loadDashboardData();
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

// ── Toast ──────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3800);
}

// ── Admin Profile Modal ────────────────────────────────
document.querySelector('.user-profile').addEventListener('click', openAdminProfile);
document.getElementById('closeAdminProfileModal').addEventListener('click', () => {
  document.getElementById('adminProfileModal').classList.remove('active');
});

function openAdminProfile() {
  const name  = currentUser.displayName || 'Master Admin';
  const email = currentUser.email || localStorage.getItem('edusim_admin_email') || '—';
  const role  = adminRole === 'master' ? 'Master Administrator' : 'System Admin';

  document.getElementById('profileModalAvatar').textContent    = name.charAt(0).toUpperCase();
  document.getElementById('profileModalName').textContent      = name;
  document.getElementById('profileModalRole').textContent      = role;
  document.getElementById('profileModalEmail').textContent     = email;
  document.getElementById('profileModalAccess').textContent    = adminRole === 'master' ? '🔐 Full Access' : '🛡️ Admin Access';
  document.getElementById('profileModalDisplayName').value     = name;

  document.getElementById('adminProfileModal').classList.add('active');
}

function saveAdminProfile() {
  const newName = document.getElementById('profileModalDisplayName').value.trim();
  if (!newName) return showToast('Name cannot be empty', 'error');

  localStorage.setItem('edusim_admin_displayname', newName);
  currentUser.displayName = newName;

  // Update sidebar
  document.getElementById('adminName').textContent             = newName;
  document.getElementById('adminAvatar').textContent           = newName.charAt(0).toUpperCase();
  document.getElementById('profileModalName').textContent      = newName;
  document.getElementById('profileModalAvatar').textContent    = newName.charAt(0).toUpperCase();

  document.getElementById('adminProfileModal').classList.remove('active');
  showToast('Profile updated!', 'success');
}

// Close modals on overlay click
['addAdminModal', 'adminProfileModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });
});
