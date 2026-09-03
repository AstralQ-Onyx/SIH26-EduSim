/* ═══════════════════════════════════════════════════════════
   EduSim — Dashboard JS  (complete rewrite)
   ═══════════════════════════════════════════════════════════ */

// ── Toast helper ─────────────────────────────────────────
const toastEl = (() => {
  const el = document.createElement('div');
  el.id = 'toast';
  document.body.appendChild(el);
  return el;
})();

function showToast(msg, type = '') {
  toastEl.textContent = msg;
  toastEl.className = 'show ' + type;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.className = ''; }, 3000);
}

// ── Theme ─────────────────────────────────────────────────
const saved = localStorage.getItem('edusim_theme');
if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');

document.getElementById('themeBtn').addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('edusim_theme', isLight ? 'dark' : 'light');
  // Update Monaco theme if loaded
  if (window._monacoEditor) {
    monaco.editor.setTheme(isLight ? 'vs-dark' : 'vs');
  }
});

// ── Tab Navigation ────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  const btn   = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  const panel = document.getElementById('tab-' + tabId);

  if (btn)   btn.classList.add('active');
  if (panel) panel.classList.add('active');

  // Relayout Monaco when IDE tab becomes visible
  if (tabId === 'ide' && window._monacoEditor) {
    setTimeout(() => window._monacoEditor.layout(), 50);
  }
  
  if (tabId === 'virtuallab') {
    if (typeof loadVirtualLabs === 'function') loadVirtualLabs();
  }
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Expose so Simulations card can trigger virtuallab tab
window.switchTab = switchTab;

// ── Firebase Init ─────────────────────────────────────────
const firebaseConfig = {
  apiKey:            ENV.FIREBASE_API_KEY,
  authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         ENV.FIREBASE_PROJECT_ID,
  storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             ENV.FIREBASE_APP_ID,
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Auth Gate ─────────────────────────────────────────────
let currentUser = null;

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  currentUser = user;

  // ── Sidebar basics (always available from Auth) ──
  const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
  document.getElementById('userAvatar').textContent       = initial;
  document.getElementById('profileAvatarBig').textContent = initial;
  document.getElementById('displayUser').textContent      = user.displayName || user.email;

  // Helper to render a value or dash
  const val = (v, fb) => (v && String(v).trim()) ? String(v).trim() : (fb || '—');

  try {
    const doc  = await db.collection('users').doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    // Merge Auth data as fallback for any empty Firestore fields
    const name     = val(data.name,        user.displayName);
    const email    = val(data.email,       user.email);
    const role     = val(data.role,        '');
    const username = val(data.username,    '');
    const org      = val(data.org,         '');
    const dept     = val(data.dept,        '');
    const contact  = val(data.contactMail, '');

    // Sidebar role
    document.getElementById('displayRole').textContent = role || 'User';

    // ── Profile card ──
    document.getElementById('profileFullName').textContent  = name;
    document.getElementById('profileRoleBadge').textContent = role || 'User';
    document.getElementById('profileEmailDisp').textContent = email;

    // ── Detail grid ──
    document.getElementById('profName').textContent     = name;
    document.getElementById('profUsername').textContent = username ? '@' + username : '—';
    document.getElementById('profEmail').textContent    = email;
    document.getElementById('profRole').textContent     = role || '—';
    document.getElementById('profOrg').textContent      = org || '—';
    document.getElementById('profDept').textContent     = dept || '—';
    document.getElementById('profContact').textContent  = contact || '—';

    // Joined date from Firestore timestamp or Auth metadata
    const created = data.createdAt
      ? data.createdAt.toDate()
      : user.metadata.creationTime
        ? new Date(user.metadata.creationTime)
        : null;
    if (created) {
      document.getElementById('statJoined').textContent =
        created.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    }

    // Pre-fill edit form
    document.getElementById('editName').value    = (data.name    || user.displayName || '');
    document.getElementById('editRole').value    = data.role     || '';
    document.getElementById('editOrg').value     = data.org      || '';
    document.getElementById('editDept').value    = data.dept     || '';
    document.getElementById('editContact').value = data.contactMail || '';

    // Load projects count
    loadProjects(user.uid);

  } catch (err) {
    console.error('Profile load error:', err);
    // Still show whatever Auth has
    document.getElementById('profileFullName').textContent  = user.displayName || user.email;
    document.getElementById('profileEmailDisp').textContent = user.email;
    document.getElementById('profEmail').textContent        = user.email;
    document.getElementById('profName').textContent         = user.displayName || '—';
    showToast('Could not load full profile — check Firestore rules.', 'error');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'auth.html';
});

// ── Sidebar Avatar → Profile Tab ──
document.getElementById('userProfileArea').addEventListener('click', (e) => {
  if (e.target.closest('#logoutBtn')) return;
  document.querySelector('[data-tab="profile"]').click();
});

// ── Edit Profile Modal ──
const editProfileModal = document.getElementById('editProfileModal');

document.getElementById('editProfileBtn').addEventListener('click', () => {
  editProfileModal.classList.add('active');
});
document.getElementById('closeEditProfileModal').addEventListener('click', () => {
  editProfileModal.classList.remove('active');
});
editProfileModal.addEventListener('click', e => {
  if (e.target === editProfileModal) editProfileModal.classList.remove('active');
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  const name    = document.getElementById('editName').value.trim();
  const role    = document.getElementById('editRole').value;
  const org     = document.getElementById('editOrg').value.trim();
  const dept    = document.getElementById('editDept').value.trim();
  const contact = document.getElementById('editContact').value.trim();

  if (!name) { showToast('Name cannot be empty', 'error'); return; }

  const saveBtn = document.getElementById('saveProfileBtn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const updates = {
      name, role, org, dept,
      contactMail: contact || currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(currentUser.uid).set(updates, { merge: true });

    // Update Auth display name
    await currentUser.updateProfile({ displayName: name });

    // Refresh UI immediately
    const initial = name[0].toUpperCase();
    document.getElementById('userAvatar').textContent       = initial;
    document.getElementById('profileAvatarBig').textContent = initial;
    document.getElementById('displayUser').textContent      = name;
    document.getElementById('profileFullName').textContent  = name;
    document.getElementById('profileRoleBadge').textContent = role || 'User';
    document.getElementById('displayRole').textContent      = role || 'User';
    document.getElementById('profName').textContent         = name;
    document.getElementById('profRole').textContent         = role || '—';
    document.getElementById('profOrg').textContent          = org  || '—';
    document.getElementById('profDept').textContent         = dept || '—';
    document.getElementById('profContact').textContent      = contact || '—';

    editProfileModal.classList.remove('active');
    showToast('Profile updated!', 'success');
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = 'Save Changes';
    saveBtn.disabled = false;
  }
});

// ── Projects ──────────────────────────────────────────────
const newProjectBtn   = document.getElementById('newProjectBtn');
const newProjectModal = document.getElementById('newProjectModal');
const closeProjectModal = document.getElementById('closeProjectModal');
const createProjectBtn  = document.getElementById('createProjectBtn');

newProjectBtn.addEventListener('click', () => newProjectModal.classList.add('active'));
closeProjectModal.addEventListener('click', () => newProjectModal.classList.remove('active'));
newProjectModal.addEventListener('click', e => { if (e.target === newProjectModal) newProjectModal.classList.remove('active'); });

async function loadProjects(uid) {
  const grid = document.getElementById('projectsGrid');
  try {
    const snap = await db.collection('users').doc(uid).collection('projects').orderBy('createdAt','desc').get();
    document.getElementById('statProjects').textContent = snap.size;

    if (snap.empty) { grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg><p>No projects yet. Click <strong>New Project</strong> to get started.</p></div>'; return; }

    grid.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <h4>${escHtml(d.name)}</h4>
        <p>${escHtml(d.desc || 'No description.')}</p>
        <div class="project-meta">
          <span class="tag">${escHtml(d.board || 'esp32')}</span>
          <span class="tag">${d.lang || 'C++'}</span>
        </div>
        <div class="project-actions">
          <button class="btn open-proj-btn" data-id="${doc.id}" data-code="${encodeURIComponent(d.code || '')}">Open IDE</button>
          <button class="btn delete-proj-btn" data-id="${doc.id}" style="color:var(--error)">Delete</button>
        </div>`;
      grid.appendChild(card);
    });

    // Open in IDE
    grid.querySelectorAll('.open-proj-btn').forEach(b => {
      b.addEventListener('click', () => {
        const code = decodeURIComponent(b.dataset.code);
        if (window._monacoEditor) window._monacoEditor.setValue(code);
        // Switch to IDE tab
        document.querySelector('[data-tab="ide"]').click();
        showToast('Project loaded in IDE', 'success');
      });
    });

    // Delete
    grid.querySelectorAll('.delete-proj-btn').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('Delete this project?')) return;
        await db.collection('users').doc(currentUser.uid).collection('projects').doc(b.dataset.id).delete();
        showToast('Project deleted');
        loadProjects(currentUser.uid);
      });
    });

  } catch (err) {
    console.error('Projects load error:', err);
    grid.innerHTML = '<div class="empty-state"><p>Failed to load projects. Check Firestore rules.</p></div>';
  }
}

createProjectBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const name  = document.getElementById('projNameInput').value.trim();
  const board = document.getElementById('projBoardInput').value;
  const desc  = document.getElementById('projDescInput').value.trim();

  if (!name) { showToast('Project name is required', 'error'); return; }

  const defaultCode = `// ${name}\n// Board: ${board}\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  // Your code here\n}\n`;

  try {
    createProjectBtn.textContent = 'Creating…';
    createProjectBtn.disabled = true;
    await db.collection('users').doc(currentUser.uid).collection('projects').add({
      name, board, desc,
      code: defaultCode,
      lang: board === 'rp2040' ? 'MicroPython' : 'C++',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    newProjectModal.classList.remove('active');
    document.getElementById('projNameInput').value = '';
    document.getElementById('projDescInput').value = '';
    showToast('Project created!', 'success');
    loadProjects(currentUser.uid);
  } catch (err) {
    showToast('Failed to create project: ' + err.message, 'error');
  } finally {
    createProjectBtn.textContent = 'Create Project';
    createProjectBtn.disabled = false;
  }
});

// ── Monaco Editor ─────────────────────────────────────────
// Try loading Monaco; fallback to textarea if CDN fails
const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';

window.MonacoEnvironment = {
  getWorkerUrl: function(_moduleId, label) {
    const url = label === 'json'       ? `${MONACO_BASE}/language/json/jsonWorker.js`
               : label === 'css'       ? `${MONACO_BASE}/language/css/cssWorker.js`
               : label === 'html'      ? `${MONACO_BASE}/language/html/htmlWorker.js`
               : label === 'typescript'? `${MONACO_BASE}/language/typescript/tsWorker.js`
               :                        `${MONACO_BASE}/editor/editorWorker.js`;
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(
      `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};importScripts('${url}');`
    )}`;
  }
};

function loadMonacoScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${MONACO_BASE}/loader.js`;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const STARTER_CODE = {
  cpp: `// EduSim — ESP32 Starter Template
// ───────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("EduSim: Device Ready!");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
`,
  python: `# EduSim — MicroPython Starter Template
# ────────────────────────────────────────
import time
from machine import Pin

led = Pin(2, Pin.OUT)

print("EduSim: Device Ready!")

while True:
    led.on()
    print("LED ON")
    time.sleep(1)
    led.off()
    print("LED OFF")
    time.sleep(1)
`,
  javascript: `// EduSim — JavaScript IoT Starter (Espruino)
// ─────────────────────────────────────────────

var LED = D2;

pinMode(LED, 'output');
console.log("EduSim: Device Ready!");

setInterval(function() {
  LED.write(1);
  console.log("LED ON");
  setTimeout(function() {
    LED.write(0);
    console.log("LED OFF");
  }, 500);
}, 1000);
`
};

async function initMonaco() {
  try {
    await loadMonacoScript();
    await new Promise((resolve) => {
      require.config({ paths: { vs: MONACO_BASE } });
      require(['vs/editor/editor.main'], resolve);
    });

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    window._monacoEditor = monaco.editor.create(document.getElementById('editor'), {
      value:     STARTER_CODE.cpp,
      language:  'cpp',
      theme:     isLight ? 'vs' : 'vs-dark',
      automaticLayout: true,
      fontFamily:'Fira Code, Consolas, monospace',
      fontSize:  14,
      lineHeight:22,
      minimap:   { enabled: false },
      scrollBeyondLastLine: false,
      padding:   { top: 14 },
      renderLineHighlight: 'gutter',
    });

    // Mark unsaved on edit & sync with AI Context
    window._monacoEditor.onDidChangeModelContent(() => {
      document.getElementById('unsavedDot').classList.add('show');
      if (window.EduSimContext) {
        window.EduSimContext.setSketch(window._monacoEditor.getValue());
      }
    });

    if (window.EduSimContext) {
      window.EduSimContext.setSketch(STARTER_CODE.cpp);
    }

    console.log('Monaco loaded via unpkg.');
  } catch (err) {
    console.warn('Monaco failed, using textarea fallback:', err);
    document.getElementById('editor').style.display = 'none';
    const fb = document.getElementById('editorFallback');
    fb.style.display = 'block';
    fb.value = STARTER_CODE.cpp;
    // Provide a shim so rest of code can call getCode()
    window._monacoEditor = null;
  }
}

initMonaco();

// Language selector
document.getElementById('langSelect').addEventListener('change', function() {
  const lang = this.value;
  const langMap = { cpp: 'cpp', python: 'python', javascript: 'javascript' };

  if (window._monacoEditor) {
    monaco.editor.setModelLanguage(window._monacoEditor.getModel(), langMap[lang]);
    window._monacoEditor.setValue(STARTER_CODE[lang] || '');
  } else {
    document.getElementById('editorFallback').value = STARTER_CODE[lang] || '';
  }

  // Update file tab name
  const extMap = { cpp:'sketch.ino', python:'main.py', javascript:'main.js' };
  document.getElementById('currentFileName').textContent = extMap[lang];
});

function getCode() {
  if (window._monacoEditor) return window._monacoEditor.getValue();
  return document.getElementById('editorFallback').value;
}

// ══════════════════════════════════════════════════════════════
//  AGENT CONNECTION  (ws://127.0.0.1:3745)
//  When the EduSim local agent is running → all ops are REAL.
//  When offline                           → simulation fallback.
// ══════════════════════════════════════════════════════════════

let agent       = null;   // WebSocket to local agent
let agentOnline = false;
let selectedPort = null;  // port path chosen from agent port list
let autoScroll  = true;

const connectBtn     = document.getElementById('connectBtn');
const connectBtnText = document.getElementById('connectBtnText');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const uploadBtn      = document.getElementById('uploadBtn');
const serialInput    = document.getElementById('serialInput');
const sendSerialBtn  = document.getElementById('sendSerialBtn');
const eolSelect      = document.getElementById('eolSelect');
const terminal       = document.getElementById('terminal');

// ── Logging helpers ──────────────────────────────────────
function termLog(msg, type = '') {
  const line = document.createElement('div');
  line.className = 'terminal-line' + (type ? ' ' + type : '');
  line.textContent = msg;
  terminal.appendChild(line);
  if (autoScroll) terminal.scrollTop = terminal.scrollHeight;
}

function buildLog(msg, type = '') {
  const line = document.createElement('div');
  line.className = 'terminal-line' + (type ? ' ' + type : '');
  line.textContent = msg;
  const build = document.getElementById('buildOutput');
  build.appendChild(line);
  if (autoScroll) build.scrollTop = build.scrollHeight;
}

document.getElementById('autoScrollBtn').addEventListener('click', function() {
  autoScroll = !autoScroll;
  this.classList.toggle('active', autoScroll);
});

// Panel tabs
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
  });
});

// ── Agent Banner ─────────────────────────────────────────
function showAgentBanner(online) {
  let banner = document.getElementById('agentBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'agentBanner';
    banner.style.cssText = `
      position:fixed; top:0; left:0; right:0; z-index:999;
      padding:8px 16px; font-family:var(--font-ui); font-size:12px;
      display:flex; align-items:center; justify-content:center; gap:12px;
    `;
    document.body.appendChild(banner);
    // Push main content down
    document.querySelector('.main-content').style.marginTop = '34px';
    document.querySelector('.sidebar').style.marginTop = '34px';
  }
  if (online) {
    banner.style.background = 'rgba(0,255,136,0.12)';
    banner.style.borderBottom = '1px solid rgba(0,255,136,0.3)';
    banner.style.color = 'var(--success)';
    banner.innerHTML = '● EduSim Agent Connected — Real compile &amp; upload enabled';
  } else {
    banner.style.background = 'rgba(255,68,102,0.1)';
    banner.style.borderBottom = '1px solid rgba(255,68,102,0.3)';
    banner.style.color = 'var(--error)';
    banner.innerHTML = `
      ⚠ EduSim Agent not running — operating in simulation mode &nbsp;|&nbsp;
      <strong>To enable real upload:</strong>
      open a terminal in <code style="font-size:11px">EduSim/agent/</code>, run
      <code style="font-size:11px">npm install</code> then
      <code style="font-size:11px">node server.js</code>
    `;
  }
}

// ── Connect to Agent ─────────────────────────────────────
function connectAgent() {
  try {
    agent = new WebSocket('ws://127.0.0.1:3745');

    agent.onopen = () => {
      agentOnline = true;
      showAgentBanner(true);
      termLog('[Agent] Connected to EduSim Local Agent ✓', 'sys');
      console.log('[Dashboard] Agent connected');
    };

    agent.onclose = () => {
      agentOnline = false;
      agent = null;
      selectedPort = null;
      setConnectedUI(false);
      showAgentBanner(false);
      termLog('[Agent] Disconnected from agent — switching to simulation mode.', 'warn');
      // Retry every 5 s
      setTimeout(connectAgent, 5000);
    };

    agent.onerror = () => {
      // Will trigger onclose automatically
    };

    agent.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      handleAgentMessage(msg);
    };
  } catch (e) {
    agentOnline = false;
    showAgentBanner(false);
    setTimeout(connectAgent, 5000);
  }
}

function sendAgent(obj) {
  if (agent && agent.readyState === WebSocket.OPEN) {
    agent.send(JSON.stringify(obj));
    return true;
  }
  return false;
}

// ── Handle Agent Messages ─────────────────────────────────
let _ports = []; // cached port list from agent

function handleAgentMessage(msg) {
  switch (msg.type) {

    case 'agent_info':
      termLog(`[Agent] v${msg.version} | arduino-cli: ${msg.cliAvailable ? 'Found ✓' : 'NOT FOUND ✗'}`, 'sys');
      if (!msg.cliAvailable) {
        termLog('[Agent] Install arduino-cli: https://arduino.github.io/arduino-cli/', 'warn');
        termLog('[Agent] Then run: arduino-cli core install arduino:avr', 'warn');
      }
      break;

    case 'ports':
      _ports = msg.ports || [];
      renderPortDropdown(_ports);
      break;

    case 'serial_opened':
      setConnectedUI(true, msg.port, msg.baudRate);
      termLog(`[Serial] Connected to ${msg.port} at ${msg.baudRate} baud`, 'sys');
      showToast('Device connected!', 'success');
      break;

    case 'serial_closed':
      setConnectedUI(false);
      break;

    case 'serial_data':
      termLog(msg.text);
      break;

    case 'serial_error':
      termLog('[Serial] ' + msg.message, 'err');
      setConnectedUI(false);
      break;

    case 'build_log':
      buildLog(msg.text, msg.level || '');
      break;

    case 'compiled':
      uploadBtn.disabled = false;
      buildLog('[EduSim] Ready to upload ↑', 'sys');
      if (window.EduSimContext) window.EduSimContext.setCompileOutput({ success: true, rawLog: '' });
      break;

    case 'compile_error':
      uploadBtn.disabled = false;
      document.getElementById('compileBtn').disabled = false;
      showToast('Compilation failed — check Build Output', 'error');
      if (window.EduSimContext) window.EduSimContext.setCompileOutput({ success: false, rawLog: msg.message || '' });
      buildLog('[AI Assistant] Need help resolving this error?', 'warn');
      const debugPromptBtn = document.createElement('button');
      debugPromptBtn.className = 'btn ai-toggle-btn';
      debugPromptBtn.style.cssText = 'margin: 6px 0; display: inline-flex;';
      debugPromptBtn.innerHTML = '✨ Debug with AI';
      debugPromptBtn.onclick = () => window.AIAssistantInstance?.triggerDebug(msg.message || '');
      document.getElementById('buildOutput').appendChild(debugPromptBtn);
      break;

    case 'ai_message_response':
      window.AIAssistantInstance?.onAgentResponse(msg);
      break;

    case 'ai_debug_result':
      window.AIAssistantInstance?.onDebugResult(msg);
      break;

    case 'upload_done':
      uploadBtn.disabled = false;
      document.getElementById('compileBtn').disabled = false;
      showToast('Upload complete!', 'success');
      
      // Auto-reconnect if it was connected before upload
      if (window._wasConnected && selectedPort && window._lastBaud) {
        termLog(`[EduSim] Auto-reconnecting to ${selectedPort}...`, 'sys');
        sendAgent({ type: 'serial_open', port: selectedPort, baudRate: window._lastBaud });
        window._wasConnected = false;
      }
      break;

    case 'upload_error':
      uploadBtn.disabled = false;
      document.getElementById('compileBtn').disabled = false;
      showToast('Upload failed — check Build Output', 'error');
      break;
  }
}

// ── Port Dropdown (agent mode) ────────────────────────────
function renderPortDropdown(ports) {
  // Replace the connectBtn with a port selector dropdown when agent is online
  let portSel = document.getElementById('agentPortSelect');
  if (!portSel) {
    portSel = document.createElement('select');
    portSel.id = 'agentPortSelect';
    portSel.className = 'select-box';
    portSel.style.maxWidth = '200px';
    connectBtn.parentNode.insertBefore(portSel, connectBtn);
  }

  portSel.innerHTML = ports.length
    ? ports.map(p => `<option value="${p.path}">${p.friendlyName}</option>`).join('')
    : '<option value="">No devices found</option>';

  selectedPort = ports.length ? ports[0].path : null;
  portSel.addEventListener('change', function() { selectedPort = this.value; });

  // Update refresh button label
  connectBtnText.textContent = 'Refresh Ports';
}

// ── UI State Helpers ──────────────────────────────────────
function setConnectedUI(connected, port = '', baud = '') {
  statusDot.classList.toggle('connected', connected);
  statusText.textContent = connected ? `CONNECTED  ${port} @ ${baud}` : 'DISCONNECTED';
  connectBtnText.textContent = connected ? 'Disconnect' : (agentOnline ? 'Refresh Ports' : 'Select Port');
  serialInput.disabled   = !connected;
  sendSerialBtn.disabled = !connected;
  eolSelect.disabled     = !connected;
}

// ── Connect / Disconnect Button ───────────────────────────
connectBtn.addEventListener('click', async () => {

  // ── AGENT MODE ─────────────────────────────────────────
  if (agentOnline) {
    if (statusDot.classList.contains('connected')) {
      // Disconnect
      sendAgent({ type: 'serial_close' });
      return;
    }
    // Refresh ports first if no port selected
    if (!selectedPort) {
      sendAgent({ type: 'list_ports' });
      showToast('Refreshed port list', '');
      return;
    }
    const baud = parseInt(document.getElementById('baudRate').value);
    sendAgent({ type: 'serial_open', port: selectedPort, baudRate: baud });
    return;
  }

  // ── FALLBACK: Web Serial API ────────────────────────────
  if (!('serial' in navigator)) {
    termLog('Web Serial API not supported — use Chrome or Edge.', 'err');
    showToast('Use Chrome or Edge for serial access', 'error');
    return;
  }

  if (window._wsPort) {
    // Already connected — disconnect
    window._wsKeepReading = false;
    try { await window._wsReader?.cancel(); } catch {}
    try { await window._wsPort.close(); }    catch {}
    window._wsPort = null;
    setConnectedUI(false);
    termLog('Disconnected.', 'sys');
    return;
  }

  try {
    const port = await navigator.serial.requestPort();
    const baud = parseInt(document.getElementById('baudRate').value);
    await port.open({ baudRate: baud });
    window._wsPort = port;
    window._wsKeepReading = true;
    setConnectedUI(true, 'USB', baud);
    termLog(`Connected via Web Serial at ${baud} baud.`, 'sys');
    showToast('Device connected!', 'success');
    wsReadLoop(port);
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      termLog('Connection error: ' + err.message, 'err');
      showToast('Connection failed', 'error');
    }
  }
});

async function wsReadLoop(port) {
  const dec = new TextDecoder();
  let buf = '';
  while (port.readable && window._wsKeepReading) {
    window._wsReader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await window._wsReader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        lines.forEach(l => { if (l.trim()) termLog(l.replace(/\r/g,'')); });
      }
    } catch {}
    finally { try { window._wsReader.releaseLock(); } catch {} }
  }
  setConnectedUI(false);
}

// Serial send works for both modes
sendSerialBtn.addEventListener('click', () => {
  const val = serialInput.value; if (!val) return;
  const eol = eolSelect.value;
  if (agentOnline) {
    sendAgent({ type: 'serial_send', text: val, eol });
  } else if (window._wsPort?.writable) {
    const w = window._wsPort.writable.getWriter();
    w.write(new TextEncoder().encode(val + eol)).then(() => w.releaseLock());
  }
  termLog('> ' + val, 'sys');
  serialInput.value = '';
});
serialInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendSerialBtn.click(); });
document.getElementById('clearTerminal').addEventListener('click', () => { terminal.innerHTML = ''; });

// ── Board Profiles ────────────────────────────────────────
const BOARD_PROFILES = {
  uno:       { family:'avr', mcu:'ATmega328P', flashKB:32,  ramKB:2,   fqbn:'arduino:avr:uno' },
  nano:      { family:'avr', mcu:'ATmega328P', flashKB:32,  ramKB:2,   fqbn:'arduino:avr:nano' },
  nano_old:  { family:'avr', mcu:'ATmega328P', flashKB:32,  ramKB:2,   fqbn:'arduino:avr:nano:cpu=atmega328old' },
  mega:      { family:'avr', mcu:'ATmega2560', flashKB:256, ramKB:8,   fqbn:'arduino:avr:mega' },
  esp32:     { family:'esp', mcu:'ESP32',      flashKB:1310,ramKB:520, fqbn:'esp32:esp32:esp32' },
  esp8266:   { family:'esp', mcu:'ESP8266',    flashKB:1024,ramKB:80,  fqbn:'esp8266:esp8266:nodemcuv2' },
  rp2040:    { family:'rp',  mcu:'RP2040',     flashKB:2048,ramKB:264, fqbn:'rp2040:rp2040:rpipico' },
};
function getBoardProfile() {
  return BOARD_PROFILES[document.getElementById('boardSelect').value] || BOARD_PROFILES.uno;
}
function boardLabel() {
  const sel = document.getElementById('boardSelect');
  return sel.options[sel.selectedIndex].text;
}

// ── Verify / Compile ──────────────────────────────────────
const CLOUD_COMPILER_URL = ((typeof ENV !== 'undefined' && ENV.BACKEND_URL) ? ENV.BACKEND_URL : 'https://edusim-compiler.onrender.com') + '/compile';

document.getElementById('compileBtn').addEventListener('click', async () => {
  const build = document.getElementById('buildOutput');
  build.innerHTML = '';
  document.querySelector('[data-panel="output"]').click();
  document.getElementById('compileBtn').disabled = true;

  const p = getBoardProfile();
  const code = getCode();
  const lang = document.getElementById('langSelect').value;

  // Intercept non-C++ languages
  if (lang !== 'cpp') {
    buildLog(`[EduSim] Verification skipped for ${lang.toUpperCase()}.`, 'sys');
    buildLog(`MicroPython and JavaScript are interpreted languages and do not require C++ compilation.`, 'warn');
    buildLog(`You can click 'Upload' to transfer this script directly to the device.`, 'success');
    document.getElementById('compileBtn').disabled = false;
    document.getElementById('uploadBtn').disabled = false;
    return;
  }



  // ── Cloud Compilation ──
  buildLog(`[EduSim] [CLOUD] Compiling for ${boardLabel()} (${p.fqbn}) …`, 'sys');
  buildLog(`[EduSim] Sending code to Cloud Compiler API (${CLOUD_COMPILER_URL})…`);

  try {
    const response = await fetch(CLOUD_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, fqbn: p.fqbn })
    });

    const data = await response.json();

    if (!response.ok) {
      buildLog(`[Cloud API Error] Compilation FAILED`, 'err');
      if (data.details) {
        data.details.split('\n').filter(l => l.trim()).forEach(l => buildLog(l, 'err'));
      } else {
        buildLog(data.error || 'Unknown error', 'err');
      }
      showToast('Compilation failed', 'error');
    } else {
      buildLog(`[Cloud API] Compilation successful ✓`, 'success');
      buildLog(`[Cloud API] Received .${data.format} file (${Math.round(data.data.length / 1024)} KB)`);
      buildLog(`[EduSim] Ready to upload ↑`, 'sys');
      
      // Store the compiled binary globally so the Upload button can access it later
      window._cloudCompiledData = data;
      showToast('Verified OK (Cloud)', 'success');
      document.getElementById('uploadBtn').disabled = false;
    }
  } catch (err) {
    buildLog(`[Cloud API Error] Failed to connect to Cloud Compiler: ${err.message}`, 'err');
    buildLog(`⚠ Ensure the Cloud Compiler backend is running on port 3000.`, 'warn');
    showToast('Cloud compile failed', 'error');
  } finally {
    document.getElementById('compileBtn').disabled = false;
  }
});

// ── Upload ────────────────────────────────────────────────
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const build = document.getElementById('buildOutput');
  build.innerHTML = '';
  document.querySelector('[data-panel="output"]').click();
  uploadBtn.disabled = true;

  const p = getBoardProfile();



  // ── Cloud / Web Serial Upload ──
  if (!window._cloudCompiledData) {
    buildLog(`[EduSim] ✗ No compiled code found. Please click Verify first.`, 'err');
    showToast('Click Verify first', 'error');
    uploadBtn.disabled = false;
    return;
  }

  buildLog(`[EduSim] [CLOUD UPLOAD] Preparing to flash ${boardLabel()} via Web Serial…`, 'sys');
  
  if (!('serial' in navigator)) {
    buildLog(`[EduSim] ✗ Web Serial API is not supported in this browser. Please use Chrome or Edge.`, 'err');
    uploadBtn.disabled = false;
    return;
  }

  try {
    buildLog(`[EduSim] Please select your board from the browser popup...`);
    const port = await navigator.serial.requestPort();
    
    // Close the serial monitor port if it's currently open
    if (window._wsPort) {
      window._wsKeepReading = false;
      try { await window._wsReader?.cancel(); } catch {}
      try { await window._wsPort.close(); } catch {}
      window._wsPort = null;
    }

    buildLog(`[EduSim] Connected to port. Initializing flasher...`, 'sys');

    const compiledData = window._cloudCompiledData;
    
    if (p.family === 'esp') {
      buildLog(`[EduSim] ESP board detected. Integrating esptool.js...`, 'sys');
      // TODO: Implement esptool-js flashing here using compiledData.data (base64)
      buildLog(`⚠ esptool-js library not yet loaded. Flashing skipped.`, 'warn');
    } else if (p.family === 'avr') {
      buildLog(`[EduSim] AVR board detected. Integrating avrgirl-arduino...`, 'sys');
      // TODO: Implement avrgirl-arduino flashing here using compiledData.data (hex string)
      buildLog(`⚠ avrgirl-arduino library not yet loaded. Flashing skipped.`, 'warn');
    } else {
      buildLog(`[EduSim] ✗ Web Serial flashing for ${p.family} is not yet supported.`, 'err');
    }

    buildLog(`[EduSim] Upload process finished.`, 'success');

  } catch (err) {
    buildLog(`[EduSim] Web Serial Error: ${err.message}`, 'err');
    showToast('Upload aborted', 'error');
  } finally {
    uploadBtn.disabled = false;
  }
});

// ── Save Sketch ───────────────────────────────────────────
document.getElementById('saveSketchBtn').addEventListener('click', async () => {
  if (!currentUser) return;
  const code  = getCode();
  const board = document.getElementById('boardSelect').value;
  const lang  = document.getElementById('langSelect').value;
  try {
    const col  = db.collection('users').doc(currentUser.uid).collection('projects');
    const snap = await col.where('name','==','Quick Save').limit(1).get();
    if (snap.empty) {
      await col.add({ name:'Quick Save', board, lang, code, desc:'Auto-saved sketch', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    } else {
      await snap.docs[0].ref.update({ code, board, lang, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    document.getElementById('unsavedDot').classList.remove('show');
    showToast('Sketch saved!', 'success');
    loadProjects(currentUser.uid);
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
});

// ── Utility ───────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Virtual Lab Management ────────────────────────────────
const newLabModal = document.getElementById('newLabModal');
const closeLabModal = document.getElementById('closeLabModal');
const newLabProjectBtn = document.getElementById('newLabProjectBtn');
const createLabProjectBtn = document.getElementById('createLabProjectBtn');

if (newLabProjectBtn) {
  newLabProjectBtn.addEventListener('click', () => {
    newLabModal.classList.add('active');
  });
}

if (closeLabModal) {
  closeLabModal.addEventListener('click', () => {
    newLabModal.classList.remove('active');
  });
}

// Mode Selection
const modeOptions = document.querySelectorAll('.mode-option');
modeOptions.forEach(opt => {
  opt.addEventListener('click', function() {
    modeOptions.forEach(o => o.classList.remove('selected'));
    this.classList.add('selected');
    // Mark the clicked option with the data-selected attribute for reliable reading
    document.querySelectorAll('.mode-option').forEach(o => o.removeAttribute('data-selected'));
    this.setAttribute('data-selected', 'true');
    // Also update the radio for semantics
    const radio = this.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

// Helper: reliably read chosen lab mode from the UI
function getSelectedLabMode() {
  // 1) Prefer data-selected attribute (set on click)
  const byAttr = document.querySelector('.mode-option[data-selected]');
  if (byAttr) return byAttr.querySelector('input[type="radio"]')?.value || '2d';
  // 2) Fall back to checked radio
  const byRadio = document.querySelector('input[name="labMode"]:checked');
  if (byRadio) return byRadio.value;
  // 3) Fall back to .selected class
  const byClass = document.querySelector('.mode-option.selected');
  if (byClass) return byClass.querySelector('input[type="radio"]')?.value || '2d';
  return '2d';
}

if (createLabProjectBtn) {
  createLabProjectBtn.addEventListener('click', () => {
    const name = document.getElementById('labProjName').value || 'Untitled Lab';
    const controller = document.getElementById('labController').value;
    const desc = document.getElementById('labProjDesc') ? document.getElementById('labProjDesc').value.trim() : '';
    const mode = getSelectedLabMode();
    console.log('[EduSim] Creating lab with mode:', mode); // debug — remove after testing
    
    const id = 'vlab_' + Date.now();
    const url = `../virtual-lab/lab.html?id=${id}&name=${encodeURIComponent(name)}&controller=${encodeURIComponent(controller)}&mode=${mode}`;
    window.location.href = url;
  });
}

function loadVirtualLabs() {
  const grid = document.getElementById('vlabGrid');
  if (!grid) return;
  
  const labs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('edusim_vlab_')) {
      try {
        labs.push(JSON.parse(localStorage.getItem(key)));
      } catch (e) {}
    }
  }
  
  if (labs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
          <circle cx="15" cy="15" r="2"/>
          <path d="M13 15h-3M12 13v-2"/>
        </svg>
        <p>No lab projects yet.<br>Click <strong>New Lab Project</strong> to start simulating.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  labs.forEach(lab => {
    const card = document.createElement('div');
    card.className = 'vlab-card';
    card.onclick = () => {
      window.location.href = `../virtual-lab/lab.html?id=${lab.id}&name=${encodeURIComponent(lab.name)}&controller=${encodeURIComponent(lab.controller)}`;
    };
    card.innerHTML = `
      <div class="vlab-card-header">
        <div class="vlab-card-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div>
          <h4>${escHtml(lab.name)}</h4>
          <div class="vlab-card-meta">
            <span class="tag">${lab.controller === 'none' ? 'No Controller' : lab.controller}</span>
          </div>
        </div>
      </div>
      <p>Components: ${lab.components ? lab.components.length : 0} | Wires: ${lab.wires ? lab.wires.length : 0}</p>
    `;
    grid.appendChild(card);
  });
}

// Call once on load, and maybe we can hook it to the tab switch
loadVirtualLabs();


// ── Start Agent Connection ────────────────────────────────
connectAgent();
// Also show offline banner immediately (before WS connects)
showAgentBanner(false);

// ── AI Assistant Button Listener ──────────────────────────
const aiBtn = document.getElementById('aiAssistantBtn');
if (aiBtn) {
  aiBtn.addEventListener('click', () => {
    window.AIAssistantInstance?.toggle();
  });
}

// ── Sync Board to AI Context ──────────────────────────────
const bSelect = document.getElementById('boardSelect');
if (bSelect) {
  bSelect.addEventListener('change', function() {
    if (window.EduSimContext) {
      window.EduSimContext.setBoard(this.value, getBoardProfile().fqbn);
    }
  });
  // Initial sync
  if (window.EduSimContext) {
    window.EduSimContext.setBoard(bSelect.value, getBoardProfile().fqbn);
  }
}
