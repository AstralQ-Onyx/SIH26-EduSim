/* ═══════════════════════════════════════════════════════════
   EduSim — IDE & Web Serial Logic (ide.js)
   Phase 2 · Hardware Connection
   ═══════════════════════════════════════════════════════════ */

window.addEventListener('error', (event) => {
  document.getElementById('displayUser').textContent = "Error: " + event.message;
  console.error("Global Error:", event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  document.getElementById('displayUser').textContent = "Promise Error: " + event.reason;
});

// ── Firebase Auth Check ────────────────────────────────────
// Using the same API key from auth.js (Make sure to update here if you change it)
const firebaseConfig = {
  apiKey: "AIzaSyBAD3LTO0wwOT1EdVxJhxGc4682RfSkDAI",
  authDomain: "edu-sim.firebaseapp.com",
  projectId: "edu-sim",
  storageBucket: "edu-sim.appspot.com",
  messagingSenderId: "836936321609",
  appId: "1:836936321609:web:edusim_phase1",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    document.getElementById('displayUser').textContent = user.displayName || user.email;
    
    // Fetch profile data
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        document.querySelector('.user-role').textContent = data.role || 'User';
        
        // Populate Modal
        document.getElementById('profName').textContent = data.name || user.displayName || 'N/A';
        document.getElementById('profEmail').textContent = data.email || 'N/A';
        document.getElementById('profRole').textContent = data.role || 'N/A';
        
        if (data.org) {
          document.getElementById('profOrg').textContent = data.org;
          document.getElementById('profOrgWrapper').style.display = 'block';
        } else {
          document.getElementById('profOrgWrapper').style.display = 'none';
        }
        
        if (data.dept || data.year) {
          document.getElementById('profDept').textContent = data.dept || data.year;
          document.getElementById('profDeptWrapper').style.display = 'block';
        } else {
          document.getElementById('profDeptWrapper').style.display = 'none';
        }
      }
    } catch(err) {
      console.error("Failed to load profile:", err);
    }
  } else {
    // Redirect to login if not authenticated
    window.location.href = 'auth.html';
  }
});

// ── Profile Modal Logic ──
const profileModal = document.getElementById('profileModal');
document.querySelector('.user-profile').addEventListener('click', (e) => {
  if(e.target.closest('#logoutBtn')) return; // Don't open if logout clicked
  profileModal.classList.add('active');
});
document.getElementById('closeProfileBtn').addEventListener('click', () => {
  profileModal.classList.remove('active');
});
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) profileModal.classList.remove('active');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  firebase.auth().signOut();
});

// ── Monaco Editor Setup ─────────────────────────────────────
let editor;

// Configure Monaco Environment for CDN usage
window.MonacoEnvironment = {
  getWorkerUrl: function(workerId, label) {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/'
      };
      importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/base/worker/workerMain.js');`
    )}`;
  }
};

require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: 
`// EduSim Edge Device Template
// Target: ESP32

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  Serial.println("EduSim: Device is running perfectly!");
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`,
    language: 'cpp',
    theme: isLight ? 'vs' : 'vs-dark',
    automaticLayout: true,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 16 }
  });
});

// ── Web Serial API Logic ────────────────────────────────────
let port;
let reader;
let writer;
let keepReading = true;

const connectBtn = document.getElementById('connectBtn');
const uploadBtn = document.getElementById('uploadBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const terminal = document.getElementById('terminal');
const serialInput = document.getElementById('serialInput');
const sendSerialBtn = document.getElementById('sendSerialBtn');
const baudRateSelect = document.getElementById('baudRate');

function logToTerminal(msg, type = 'normal') {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = msg;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

async function connectSerial() {
  if (!('serial' in navigator)) {
    logToTerminal('Web Serial API is not supported in this browser. Please use Chrome or Edge.', 'err');
    return;
  }

  if (port) {
    // Disconnect logic
    await disconnectSerial();
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    const baudRate = parseInt(baudRateSelect.value);
    await port.open({ baudRate: baudRate });
    
    statusDot.classList.add('connected');
    statusText.textContent = 'CONNECTED';
    connectBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg> Disconnect';
    uploadBtn.disabled = false;
    serialInput.disabled = false;
    sendSerialBtn.disabled = false;

    logToTerminal(`Connected to device at ${baudRate} baud.`, 'sys');
    keepReading = true;
    readUntilClosed();
  } catch (err) {
    logToTerminal(`Connection failed: ${err.message}`, 'err');
  }
}

async function disconnectSerial() {
  keepReading = false;
  if (reader) {
    await reader.cancel();
  }
  if (port) {
    await port.close();
    port = null;
  }
  
  statusDot.classList.remove('connected');
  statusText.textContent = 'DISCONNECTED';
  connectBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Select Port';
  uploadBtn.disabled = true;
  serialInput.disabled = true;
  sendSerialBtn.disabled = true;
  logToTerminal('Disconnected from device.', 'sys');
}

async function readUntilClosed() {
  while (port.readable && keepReading) {
    reader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        // value is a Uint8Array. Convert to text.
        const text = new TextDecoder().decode(value);
        // Clean up newlines for the terminal display
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        lines.forEach(line => logToTerminal(line));
      }
    } catch (error) {
      logToTerminal(`Read error: ${error.message}`, 'err');
    } finally {
      reader.releaseLock();
    }
  }
}

async function writeToSerial(data) {
  if (port && port.writable) {
    writer = port.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(data + '\n'));
    writer.releaseLock();
    logToTerminal(`> ${data}`, 'sys');
  }
}

// ── Event Listeners ─────────────────────────────────────────

connectBtn.addEventListener('click', connectSerial);

document.getElementById('clearTerminal').addEventListener('click', () => {
  terminal.innerHTML = '';
});

sendSerialBtn.addEventListener('click', () => {
  const val = serialInput.value;
  if (val) {
    writeToSerial(val);
    serialInput.value = '';
  }
});

serialInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendSerialBtn.click();
  }
});

// Mock Compile/Upload logic
document.getElementById('compileBtn').addEventListener('click', () => {
  logToTerminal('Verifying sketch...', 'sys');
  setTimeout(() => logToTerminal('Done compiling. Sketch uses 248674 bytes (18%) of program storage space.', 'success'), 1500);
});

uploadBtn.addEventListener('click', () => {
  logToTerminal('Compiling and uploading...', 'sys');
  uploadBtn.disabled = true;
  
  setTimeout(() => logToTerminal('Writing at 0x00010000... (10 %)', 'normal'), 1000);
  setTimeout(() => logToTerminal('Writing at 0x00014000... (30 %)', 'normal'), 1500);
  setTimeout(() => logToTerminal('Writing at 0x0001c000... (70 %)', 'normal'), 2000);
  setTimeout(() => logToTerminal('Writing at 0x00020000... (100 %)', 'normal'), 2500);
  setTimeout(() => {
    logToTerminal('Wrote 248674 bytes in 4.2 seconds. Hard resetting via RTS pin...', 'success');
    uploadBtn.disabled = false;
  }, 3000);
});

// Sync Theme with localStorage if set previously
if (localStorage.getItem('edusim_theme') === 'light') {
  document.body.setAttribute('data-theme', 'light');
}
