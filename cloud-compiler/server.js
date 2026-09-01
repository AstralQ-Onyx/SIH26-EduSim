const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ARDUINO_CLI = process.env.ARDUINO_CLI_PATH || 'arduino-cli';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ══════════════════════════════════════════════════════════
//  Health Check
// ══════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'EduSim Cloud Compiler API',
    endpoints: ['/compile', '/compile-hex', '/api/ai/generate'],
    version: '2.0.0'
  });
});

// ══════════════════════════════════════════════════════════
//  Supported FQBNs
// ══════════════════════════════════════════════════════════
const VALID_FQBNS = [
  'arduino:avr:uno',
  'arduino:avr:nano',
  'arduino:avr:mega',
  'esp32:esp32:esp32',
  'esp8266:esp8266:nodemcuv2',
  'rp2040:rp2040:rpipico'
];

// ══════════════════════════════════════════════════════════
//  Core Compile Helper
//  Returns { data, format, fqbn } or throws on failure
// ══════════════════════════════════════════════════════════
function compileSketch(code, fqbn) {
  return new Promise((resolve, reject) => {
    const sketchName = 'edusim_sketch';
    const tmpBase = path.join(os.tmpdir(), `build_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    const sketchDir = path.join(tmpBase, sketchName);

    try {
      fs.mkdirSync(sketchDir, { recursive: true });
      fs.writeFileSync(path.join(sketchDir, `${sketchName}.ino`), code, 'utf8');
    } catch (err) {
      return reject(new Error('Failed to create temp sketch: ' + err.message));
    }

    const args = [
      'compile',
      '--fqbn', fqbn,
      '--output-dir', tmpBase,
      '--log-level', 'warn',
      '--warnings', 'none',
      sketchDir
    ];

    const proc = spawn(ARDUINO_CLI, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('error', err => {
      cleanup(tmpBase);
      reject(new Error('arduino-cli process error: ' + err.message));
    });

    proc.on('close', exitCode => {
      if (exitCode !== 0) {
        cleanup(tmpBase);
        return reject(new Error(stderr.trim() || stdout.trim() || `Compilation failed (exit ${exitCode})`));
      }

      // Find compiled output
      const files = fs.readdirSync(tmpBase);
      const hexFile = files.find(f => f.endsWith('.hex'));
      const binFile = files.find(f => f.endsWith('.bin'));

      let binaryData = null;
      let format = null;

      if (hexFile) {
        binaryData = fs.readFileSync(path.join(tmpBase, hexFile), 'utf8');
        format = 'hex';
      } else if (binFile) {
        binaryData = fs.readFileSync(path.join(tmpBase, binFile)).toString('base64');
        format = 'bin';
      }

      cleanup(tmpBase);

      if (!binaryData) {
        return reject(new Error('No output binary found after compilation'));
      }

      resolve({ data: binaryData, format, fqbn });
    });
  });
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════════
//  POST /compile  — Dashboard IDE (returns { success, fqbn, format, data })
// ══════════════════════════════════════════════════════════
app.post('/compile', async (req, res) => {
  const { code, fqbn = 'arduino:avr:uno' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Source code is required' });
  }
  if (!VALID_FQBNS.includes(fqbn)) {
    return res.status(400).json({ error: `Unsupported FQBN: ${fqbn}` });
  }

  try {
    const result = await compileSketch(code, fqbn);
    res.json({
      success: true,
      fqbn: result.fqbn,
      format: result.format,
      data: result.data,
      message: 'Compiled successfully'
    });
  } catch (err) {
    console.error('[/compile] Error:', err.message);
    res.status(400).json({
      error: 'Compilation failed',
      details: err.message
    });
  }
});

// ══════════════════════════════════════════════════════════
//  POST /compile-hex  — Virtual Lab Simulator
//  Returns { hex, fqbn } for direct use by avr8js
//  For non-AVR boards (ESP32), returns the hex-format dummy
//  since the pseudo-simulator doesn't use hex at all.
// ══════════════════════════════════════════════════════════
app.post('/compile-hex', async (req, res) => {
  const { code, fqbn = 'arduino:avr:uno' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Source code is required' });
  }
  if (!VALID_FQBNS.includes(fqbn)) {
    return res.status(400).json({ error: `Unsupported FQBN: ${fqbn}` });
  }

  try {
    const result = await compileSketch(code, fqbn);

    // The virtual lab simulator (avr8js) needs raw Intel HEX text.
    // For non-AVR boards that produce .bin, we return a minimal valid
    // hex record — the pseudo-simulator doesn't actually use hex anyway.
    let hex = result.data;
    if (result.format === 'bin') {
      hex = ':00000001FF';  // End-of-file record; pseudo-sim uses JS transpilation
    }

    res.json({ hex, fqbn: result.fqbn });
  } catch (err) {
    console.error('[/compile-hex] Error:', err.message);
    res.status(400).json({
      error: err.message
    });
  }
});

// ══════════════════════════════════════════════════════════
//  POST /api/ai/generate & /api/ai/chat — Gemini AI Proxy
//  Proxies requests to Google Gemini 1.5 Flash for the
//  CircuitMind and N.O.V.A. AI assistants
// ══════════════════════════════════════════════════════════
app.post(['/api/ai/generate', '/api/ai/chat'], async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return res.status(503).json({
      error: 'AI service unavailable',
      details: 'GEMINI_API_KEY is not configured on the server.'
    });
  }

  try {
    const messages = req.body.messages || [];

    // Map chat messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Gemini API error',
        details: data.error?.message || JSON.stringify(data)
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';

    res.json({
      message: { role: 'assistant', content: replyText }
    });
  } catch (err) {
    console.error('[AI Proxy] Error:', err.message);
    res.status(500).json({ error: 'AI proxy error', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════
//  Start Server
// ══════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║   EduSim Cloud Compiler API v2.0.0          ║`);
  console.log(`║   Port: ${PORT}                               ║`);
  console.log(`║   Endpoints:                                ║`);
  console.log(`║     POST /compile      (IDE dashboard)      ║`);
  console.log(`║     POST /compile-hex  (Virtual Lab sim)    ║`);
  console.log(`║     POST /api/ai/*     (AI proxy)           ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
});
