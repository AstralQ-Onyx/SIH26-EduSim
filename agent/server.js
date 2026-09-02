/* ═══════════════════════════════════════════════════════════
   EduSim Local Agent  —  server.js
   WebSocket bridge: Browser IDE ↔ arduino-cli ↔ USB devices
   Port: ws://localhost:3745
   ═══════════════════════════════════════════════════════════

   Prerequisites (install once):
     1. Node.js  ≥ 16        https://nodejs.org
     2. arduino-cli           https://arduino.github.io/arduino-cli/
        • After install, run:
            arduino-cli core install arduino:avr
            arduino-cli core install esp32:esp32
            arduino-cli core install esp8266:esp8266
            arduino-cli core install rp2040:rp2040
     3. npm install           (inside this /agent folder)

   Then run:  node server.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

const { WebSocketServer } = require('ws');
const fs    = require('fs');
const path  = require('path');

// ── Load .env from root folder ────────────────────────────
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const index = line.indexOf('=');
      if (index > 0) {
        const key = line.substring(0, index).trim();
        let val = line.substring(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
    console.log('[Agent] Loaded environment variables from .env');
  }
} catch (e) {
  console.warn('[Agent] Failed to load .env file:', e.message);
}
const { spawn, execSync, exec } = require('child_process');
const { SerialPort }      = require('serialport');
const { ReadlineParser }  = require('@serialport/parser-readline');
const os    = require('os');
const https = require('https');
const http  = require('http');

// ── Load .env ──
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .forEach(line => {
          const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        });
      console.log('[Agent] ✓ .env loaded via fallback');
    }
  } catch (err) {
    console.warn('[Agent] Could not load .env:', err.message);
  }
}
const aiService = require('../ai/backend/ai-service');

const AGENT_PORT    = 3745;
const HTTP_PORT     = 3746;   // REST API for virtual lab compile-hex
const AGENT_VERSION = '1.1.0';

// ── Paths ─────────────────────────────────────────────────
// When packaged with pkg, __dirname points to a read-only snapshot.
// Use process.execPath to store the bin folder next to the .exe
const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;
const BIN_DIR = path.join(baseDir, 'bin');
const CLI_EXE = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
let ARDUINO_CLI = path.join(BIN_DIR, CLI_EXE);

// ── Auto-Setup Logic ──────────────────────────────────────
function runCmd(cmd, args, ignoreError = false) {
  return new Promise((resolve, reject) => {
    // shell: true is not needed for executables and causes warnings when args are passed
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0 || ignoreError) resolve(code);
      else reject(new Error(`Command failed with code ${code}`));
    });
    proc.on('error', err => {
      if (ignoreError) resolve(-1);
      else reject(err);
    });
  });
}

function runCmdSilent(cmd, args) {
  return new Promise(resolve => {
    const proc = spawn(cmd, args);
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => out += d.toString());
    proc.on('close', () => resolve(out));
    proc.on('error', () => resolve(''));
  });
}

async function setupArduinoCli() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  // 1. Download arduino-cli if missing
  if (!fs.existsSync(ARDUINO_CLI)) {
    console.log('\n[Setup] arduino-cli not found. Downloading...');
    await downloadArduinoCli();
  }

  // 2. Initialize config and update index
  await runCmd(ARDUINO_CLI, ['config', 'init'], true);
  await runCmd(ARDUINO_CLI, ['config', 'add', 'board_manager.additional_urls', 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json'], true);
  await runCmd(ARDUINO_CLI, ['config', 'add', 'board_manager.additional_urls', 'https://arduino.esp8266.com/stable/package_esp8266com_index.json'], true);
  await runCmd(ARDUINO_CLI, ['config', 'add', 'board_manager.additional_urls', 'https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json'], true);
  await runCmd(ARDUINO_CLI, ['core', 'update-index'], true);

  // 3. Install required cores if missing
  const requiredCores = [
    { id: 'arduino:avr', name: 'Arduino AVR (Uno, Nano, Mega)' },
    { id: 'esp32:esp32', name: 'ESP32' }
  ];

  const installedCores = await runCmdSilent(ARDUINO_CLI, ['core', 'list']);

  for (const core of requiredCores) {
    if (!installedCores.includes(core.id)) {
      console.log(`\n[Setup] Installing core: ${core.name} (${core.id})...`);
      try {
        if (core.id === 'esp32:esp32') {
            await runCmd(ARDUINO_CLI, ['config', 'init'], true);
            await runCmd(ARDUINO_CLI, ['config', 'add', 'board_manager.additional_urls', 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json'], true);
            console.log('[Setup] Updating index for ESP32...');
            await runCmd(ARDUINO_CLI, ['core', 'update-index'], true);
        }
        await runCmd(ARDUINO_CLI, ['core', 'install', core.id]);
        console.log(`[Setup] ✓ Successfully installed ${core.id}`);
      } catch (err) {
        console.error(`[Setup] ✗ Failed to install ${core.id}:`, err.message);
      }
    }
  }
  console.log('\n[Setup] Initialization complete.\n');
}

function downloadArduinoCli() {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    
    if (isWin) {
      const url = 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip';
      const zipPath = path.join(BIN_DIR, 'cli.zip');
      console.log(`[Setup] Downloading from ${url}...`);
      
      const cmd = `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}'; Expand-Archive -Path '${zipPath}' -DestinationPath '${BIN_DIR}' -Force; Remove-Item '${zipPath}'"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[Setup] Download failed:', error);
          reject(error);
        } else {
          console.log('[Setup] Download and extraction complete.');
          resolve();
        }
      });
    } else {
      // Mac/Linux
      const cmd = `curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR="${BIN_DIR}" sh`;
      console.log('[Setup] Running install script...');
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[Setup] Download failed:', error);
          reject(error);
        } else {
          console.log('[Setup] Download complete.');
          resolve();
        }
      });
    }
  });
}

// ── Active sessions ───────────────────────────────────────
// Map: ws → { serialPort, parser, compiledDir }
const sessions = new Map();

// ── WebSocket Server ──────────────────────────────────────
// ── Startup ───────────────────────────────────────────────
async function startServer() {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   EduSim Local Agent v${AGENT_VERSION}             ║`);
  console.log(`║   ws://127.0.0.1:${AGENT_PORT}                ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  
  await setupArduinoCli();

  // ── HTTP REST API for Virtual Lab ─────────────────────
  const httpServer = http.createServer(async (req, res) => {
    // CORS for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'POST' && req.url === '/compile-hex') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', async () => {
        try {
          const { code, fqbn = 'arduino:avr:uno' } = JSON.parse(body);
          const result = await compileToHex(code, fqbn);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else if (req.method === 'POST' && (req.url === '/api/ai/generate' || req.url === '/api/ai/chat')) {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        const geminiKey = process.env.GEMINI_API_KEY;
        
        if (geminiKey) {
          // --- Route to Google Gemini 1.5 Flash ---
          try {
            const parsed = JSON.parse(body);
            const messages = parsed.messages || [];
            
            // Map chat messages to Gemini's format: { role: "user"|"model", parts: [{ text: "..." }] }
            const contents = messages.map(msg => {
              const role = msg.role === 'assistant' ? 'model' : 'user';
              return {
                role: role,
                parts: [{ text: msg.content }]
              };
            });

            const geminiPayload = JSON.stringify({ contents });
            const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            
            const geminiReq = https.request(targetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }, (geminiRes) => {
              let resData = '';
              geminiRes.on('data', d => resData += d);
              geminiRes.on('end', () => {
                try {
                  const data = JSON.parse(resData);
                  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';
                  
                  // Send back in the exact format the frontend expects
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    message: { role: 'assistant', content: replyText }
                  }));
                } catch (e) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Failed parsing Gemini response', raw: resData }));
                }
              });
            });
            
            geminiReq.on('error', (err) => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Gemini request error', details: err.message }));
            });
            
            geminiReq.write(geminiPayload);
            geminiReq.end();
            
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid payload JSON structure' }));
          }
          
        } else {
          // --- Default: Route to Local Ollama ---
          const targetUrl = req.url === '/api/ai/generate' ? 'http://127.0.0.1:11434/api/generate' : 'http://127.0.0.1:11434/api/chat';
          const ollamaReq = http.request(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, (ollamaRes) => {
            res.writeHead(ollamaRes.statusCode, ollamaRes.headers);
            ollamaRes.pipe(res);
          });
          ollamaReq.on('error', (err) => {
            console.error('[Agent] Ollama proxy error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to connect to local Ollama. Ensure Ollama is running on port 11434.' }));
          });
          ollamaReq.write(body);
          ollamaReq.end();
        }
      });
    } else {
      res.writeHead(404); res.end('Not found');
    }
  });

  // Gracefully handle port-in-use: don't crash, just warn
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Agent] ⚠ HTTP port ${HTTP_PORT} already in use — REST API unavailable this session.`);
      console.warn(`[Agent]   To free it: run  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${HTTP_PORT}).OwningProcess -Force  in PowerShell`);
    } else {
      console.error('[Agent] HTTP server error:', err.message);
    }
  });
  httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`[Agent] ✓ HTTP REST API listening on http://127.0.0.1:${HTTP_PORT}`);
  });

  const wss = new WebSocketServer({ port: AGENT_PORT, host: '127.0.0.1' });
  
  console.log(`\n[Agent] ✓ Server is now running and listening on port ${AGENT_PORT}`);
  console.log(`[Agent] You can now use the EduSim dashboard in your browser!\n`);

  wss.on('connection', (ws, req) => {
    console.log(`[Agent] Browser connected from ${req.socket.remoteAddress}`);
    sessions.set(ws, { serialPort: null, compiledDir: null });

    // Greet with agent info
    send(ws, { type: 'agent_info', version: AGENT_VERSION, cliAvailable: isCLIAvailable() });

    // List ports immediately on connect
    listPorts(ws);

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      console.log(`[Agent] ← ${msg.type}`, msg.board || msg.port || '');

      switch (msg.type) {
        case 'list_ports':   await listPorts(ws);                       break;
        case 'compile':      await handleCompile(ws, msg);              break;
        case 'upload':       await handleUpload(ws, msg);               break;
        case 'serial_open':  await handleSerialOpen(ws, msg);           break;
        case 'serial_close': await handleSerialClose(ws);               break;
        case 'serial_send':  await handleSerialSend(ws, msg);           break;
        case 'ai_debug':     await handleAIDebug(ws, msg);               break;
        case 'ai_message':   await handleAIMessage(ws, msg);             break;
      }
    });

    ws.on('close', async () => {
      console.log('[Agent] Browser disconnected');
      await handleSerialClose(ws);
      sessions.delete(ws);
    });

    ws.on('error', (err) => console.error('[Agent] WS error:', err.message));
  });

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Agent] ✗ Port ${AGENT_PORT} is already in use — another instance may be running.`);
    } else {
      console.error('[Agent] Server error:', err);
    }
  });
}

startServer();

// ── Helpers ───────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function log(ws, text, level = '') {
  send(ws, { type: 'build_log', text, level });
}

function isCLIAvailable() {
  return fs.existsSync(ARDUINO_CLI);
}

// ── List Serial Ports ─────────────────────────────────────
async function listPorts(ws) {
  try {
    const ports = await SerialPort.list();
    const filtered = ports.map(p => ({
      path:         p.path,
      manufacturer: p.manufacturer || '—',
      vendorId:     p.vendorId     || '',
      productId:    p.productId    || '',
      serialNumber: p.serialNumber || '',
      friendlyName: guessFriendlyName(p),
    }));
    send(ws, { type: 'ports', ports: filtered });
    console.log(`[Agent] → ports (${filtered.length} found)`);
  } catch (err) {
    send(ws, { type: 'ports', ports: [], error: err.message });
  }
}

function guessFriendlyName(p) {
  const mfr = (p.manufacturer || '').toLowerCase();
  const vid  = (p.vendorId    || '').toLowerCase();
  if (mfr.includes('ch340') || vid === '1a86')   return `${p.path} [CH340 — Arduino/ESP]`;
  if (mfr.includes('ftdi')  || vid === '0403')   return `${p.path} [FTDI — Arduino/ESP]`;
  if (mfr.includes('cp210') || vid === '10c4')   return `${p.path} [CP210x — ESP/Arduino]`;
  if (vid === '303a')                             return `${p.path} [Espressif Native USB]`;
  if (mfr.includes('arduino'))                   return `${p.path} [Arduino]`;
  if (p.manufacturer)                            return `${p.path} [${p.manufacturer}]`;
  return p.path;
}

function parseMemoryStats(output) {
  const mem = {
    flashUsed: 0,
    flashTotal: 0,
    flashPercent: 0,
    ramUsed: 0,
    ramTotal: 0,
    ramPercent: 0
  };
  if (!output) return mem;

  const flashMatch = output.match(/Sketch uses ([\d,]+) bytes \(([\d.]+)%\) of program storage space\. Maximum is ([\d,]+) bytes/i);
  if (flashMatch) {
    mem.flashUsed = parseInt(flashMatch[1].replace(/,/g, ''), 10);
    mem.flashPercent = parseFloat(flashMatch[2]);
    mem.flashTotal = parseInt(flashMatch[3].replace(/,/g, ''), 10);
  }

  const ramMatch = output.match(/Global variables use ([\d,]+) bytes \(([\d.]+)%\) of dynamic memory.*?Maximum is ([\d,]+) bytes/i);
  if (ramMatch) {
    mem.ramUsed = parseInt(ramMatch[1].replace(/,/g, ''), 10);
    mem.ramPercent = parseFloat(ramMatch[2]);
    mem.ramTotal = parseInt(ramMatch[3].replace(/,/g, ''), 10);
  }

  return mem;
}

// ── compileToHex — used by HTTP REST endpoint ─────────────
// Returns { hex: '<intel hex string>', fqbn, memory: {...} } or throws on error.
function compileToHex(code, fqbn) {
  return new Promise((resolve, reject) => {
    if (!isCLIAvailable()) {
      return reject(new Error('arduino-cli not installed'));
    }
    const sketchName = 'edusim_vlab';
    const tmpBase    = path.join(os.tmpdir(), `edusim_vlab_${Date.now()}`);
    const sketchDir  = path.join(tmpBase, sketchName);
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, `${sketchName}.ino`), code, 'utf8');

    const args = [
      'compile', '--fqbn', fqbn,
      '--output-dir', tmpBase,
      '--log-level', 'warn',
      sketchDir,
    ];

    const proc  = spawn(`"${ARDUINO_CLI}"`, args, { shell: true });
    let stderr  = '';
    let stdout  = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', exitCode => {
      if (exitCode !== 0) {
        // Cleanup
        try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
        return reject(new Error(stderr.trim() || `Exit code ${exitCode}`));
      }
      // Find the .hex or .bin file
      const files = fs.readdirSync(tmpBase);
      const hexFile = files.find(f => f.endsWith('.hex'));
      const binFile = files.find(f => f.endsWith('.bin'));
      
      let hex = '';
      if (hexFile) {
        hex = fs.readFileSync(path.join(tmpBase, hexFile), 'utf8');
      } else if (binFile) {
        // ESP32 generates .bin files. We don't execute this in the browser,
        // so just return a dummy string to signal successful compile.
        hex = ':00000001FF'; 
      } else {
        try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
        return reject(new Error('No .hex or .bin output found after compilation'));
      }
      const memory = parseMemoryStats(stdout + '\n' + stderr);
      // Cleanup
      try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
      resolve({ hex, fqbn, memory, stdout });
    });
    proc.on('error', err => reject(err));
  });
}

// ── Compile ───────────────────────────────────────────────
async function handleCompile(ws, msg) {
  const { code, fqbn, sketchName = 'edusim_sketch' } = msg;

  if (!isCLIAvailable()) {
    log(ws, '[Agent] ✗ arduino-cli not found. Install it from https://arduino.github.io/arduino-cli/', 'err');
    send(ws, { type: 'compile_error', message: 'arduino-cli not installed' });
    return;
  }

  // Write sketch to a temp directory
  const tmpBase   = path.join(os.tmpdir(), `edusim_${Date.now()}`);
  const sketchDir = path.join(tmpBase, sketchName);
  fs.mkdirSync(sketchDir, { recursive: true });
  const sketchFile = path.join(sketchDir, `${sketchName}.ino`);
  fs.writeFileSync(sketchFile, code, 'utf8');

  log(ws, `[arduino-cli] Compiling for ${fqbn} …`, 'sys');
  log(ws, `[arduino-cli] Sketch: ${sketchFile}`);

  const args = [
    'compile',
    '--fqbn', fqbn,
    '--output-dir', tmpBase,
    '--log-level', 'warn',
    sketchDir,
  ];

  const proc = spawn(`"${ARDUINO_CLI}"`, args, { shell: true });
  let stderr = '';

  proc.stdout.on('data', d => {
    d.toString().split('\n').filter(l => l.trim()).forEach(l => log(ws, l));
  });
  proc.stderr.on('data', d => {
    const chunk = d.toString();
    stderr += chunk;
    chunk.split('\n').filter(l => l.trim()).forEach(l => {
      const level = /error:/i.test(l) ? 'err' : /warning:/i.test(l) ? 'warn' : '';
      log(ws, l, level);
    });
  });

  proc.on('close', code => {
    if (code === 0) {
      const session = sessions.get(ws);
      if (session) session.compiledDir = tmpBase;
      log(ws, '[arduino-cli] Compilation successful ✓', 'success');
      send(ws, { type: 'compiled', compiledDir: tmpBase, fqbn });
    } else {
      log(ws, `[arduino-cli] Compilation FAILED (exit code ${code})`, 'err');
      send(ws, { type: 'compile_error', message: stderr.trim() });
      // Cleanup
      try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
    }
  });

  proc.on('error', err => {
    log(ws, `[Agent] Failed to spawn arduino-cli: ${err.message}`, 'err');
    send(ws, { type: 'compile_error', message: err.message });
  });
}

// ── Upload ────────────────────────────────────────────────
async function handleUpload(ws, msg) {
  const { port, fqbn, code, sketchName = 'edusim_sketch' } = msg;

  if (!isCLIAvailable()) {
    log(ws, '[Agent] ✗ arduino-cli not found.', 'err');
    send(ws, { type: 'upload_error', message: 'arduino-cli not installed' });
    return;
  }
  if (!port) {
    log(ws, '[Agent] ✗ No port specified.', 'err');
    send(ws, { type: 'upload_error', message: 'No port' });
    return;
  }

  // Close serial monitor if open on this port
  const session = sessions.get(ws);
  if (session && session.serialPort && session.serialPort.path === port) {
    await handleSerialClose(ws);
    await sleep(300); // Give OS time to release the port
  }

  // Compile first if compiledDir not cached
  let compiledDir = session?.compiledDir;
  if (!compiledDir) {
    log(ws, '[Agent] No cached build — compiling first …', 'sys');

    const tmpBase   = path.join(os.tmpdir(), `edusim_${Date.now()}`);
    const sketchDir = path.join(tmpBase, sketchName);
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, `${sketchName}.ino`), code || '', 'utf8');

    const compiled = await compileSync(ws, fqbn, sketchDir, tmpBase);
    if (!compiled) return;
    compiledDir = tmpBase;
    if (session) session.compiledDir = tmpBase;
  }

  log(ws, `[arduino-cli] Uploading to ${port} …`, 'sys');

  const args = [
    'upload',
    '--fqbn', fqbn,
    '--port', port,
    '--input-dir', compiledDir,
    '--log-level', 'warn',
  ];

  const proc = spawn(`"${ARDUINO_CLI}"`, args, { shell: true });

  proc.stdout.on('data', d => {
    d.toString().split('\n').filter(l => l.trim()).forEach(l => log(ws, l));
  });
  proc.stderr.on('data', d => {
    d.toString().split('\n').filter(l => l.trim()).forEach(l => {
      // avrdude writes progress to stderr — not all of it is errors
      const level = /error:/i.test(l) ? 'err' : '';
      log(ws, l, level);
    });
  });

  proc.on('close', exitCode => {
    if (exitCode === 0) {
      log(ws, '[arduino-cli] Upload complete ✓', 'success');
      send(ws, { type: 'upload_done' });
      // Invalidate compiled cache so next upload re-compiles fresh code
      if (session) session.compiledDir = null;
    } else {
      log(ws, `[arduino-cli] Upload FAILED (exit ${exitCode})`, 'err');
      send(ws, { type: 'upload_error' });
    }
  });

  proc.on('error', err => {
    log(ws, `[Agent] spawn error: ${err.message}`, 'err');
    send(ws, { type: 'upload_error', message: err.message });
  });
}

// ── compileSync helper (returns Promise<bool>) ─────────────
function compileSync(ws, fqbn, sketchDir, outputDir) {
  return new Promise(resolve => {
    const proc = spawn(`"${ARDUINO_CLI}"`, [
      'compile', '--fqbn', fqbn,
      '--output-dir', outputDir,
      '--log-level', 'warn',
      sketchDir
    ], { shell: true });

    proc.stdout.on('data', d => d.toString().split('\n').filter(l=>l.trim()).forEach(l=>log(ws,l)));
    proc.stderr.on('data', d => d.toString().split('\n').filter(l=>l.trim()).forEach(l=>{
      log(ws, l, /error:/i.test(l)?'err':/warning:/i.test(l)?'warn':'');
    }));
    proc.on('close', code => {
      if (code === 0) { log(ws,'[arduino-cli] Compilation OK ✓','success'); resolve(true); }
      else            { log(ws,'[arduino-cli] Compilation FAILED','err');    resolve(false); }
    });
    proc.on('error', err => { log(ws, err.message, 'err'); resolve(false); });
  });
}

// ── Serial Monitor ────────────────────────────────────────
async function handleSerialOpen(ws, msg) {
  const { port, baudRate = 115200 } = msg;
  await handleSerialClose(ws); // close any existing

  try {
    const sp = new SerialPort({ path: port, baudRate: parseInt(baudRate), autoOpen: false });
    const parser = sp.pipe(new ReadlineParser({ delimiter: '\n' }));

    sp.open(err => {
      if (err) {
        log(ws, `[Agent] Cannot open ${port}: ${err.message}`, 'err');
        send(ws, { type: 'serial_error', message: err.message });
        return;
      }
      const session = sessions.get(ws);
      if (session) { session.serialPort = sp; }
      send(ws, { type: 'serial_opened', port, baudRate });
      log(ws, `[Serial] Opened ${port} at ${baudRate} baud`, 'sys');
    });

    parser.on('data', line => {
      send(ws, { type: 'serial_data', text: line.replace(/\r/g, '') });
    });

    sp.on('error', err => log(ws, `[Serial] Error: ${err.message}`, 'err'));
    sp.on('close', ()  => {
      send(ws, { type: 'serial_closed' });
      log(ws, '[Serial] Port closed', 'sys');
    });
  } catch (err) {
    log(ws, `[Agent] SerialPort error: ${err.message}`, 'err');
  }
}

async function handleSerialClose(ws) {
  const session = sessions.get(ws);
  if (!session || !session.serialPort) return;
  const sp = session.serialPort;
  session.serialPort = null;
  await new Promise(resolve => {
    if (sp.isOpen) sp.close(resolve);
    else resolve();
  });
}

async function handleSerialSend(ws, msg) {
  const session = sessions.get(ws);
  const sp = session?.serialPort;
  if (!sp || !sp.isOpen) { log(ws, '[Agent] Serial port not open', 'err'); return; }
  const text = (msg.text || '') + (msg.eol || '\n');
  sp.write(text, err => {
    if (err) log(ws, `[Serial] Write error: ${err.message}`, 'err');
  });
}

<<<<<<< HEAD
=======
// ── AI Assistant Handlers ─────────────────────────────────
async function handleAIDebug(ws, msg) {
  const { context, compileOutput } = msg;
  log(ws, '[AI Assistant] Analyzing errors with Gemini...', 'sys');
  const result = await aiService.handleDebugRequest(context, compileOutput);
  send(ws, { type: 'ai_debug_result', result });
}

async function handleAIMessage(ws, msg) {
  const { context, text, mode, history } = msg;
  log(ws, `[AI Assistant] Processing in ${String(mode || 'tutor').toUpperCase()} mode...`, 'sys');
  if (mode === 'build') {
    const result = await aiService.handleFullCodeGeneration(context, text, compileToHex);
    send(ws, { type: 'ai_message_response', result });
  } else {
    const result = await aiService.handleTutorChat(context, text, history);
    send(ws, { type: 'ai_message_response', result });
  }
}

>>>>>>> origin/Nikil
// ── Utility ───────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
