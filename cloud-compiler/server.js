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
let ARDUINO_CLI = process.env.ARDUINO_CLI_PATH || 'arduino-cli';
if (os.platform() === 'win32' && !process.env.ARDUINO_CLI_PATH) {
  const customPath = "D:\\Applications Softwares\\ArduinoCLI\\arduino-cli.exe";
  if (fs.existsSync(customPath)) {
    ARDUINO_CLI = customPath;
  }
}

app.use(cors());
app.use(helmet());
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

    // Do NOT use shell: true — pass the CLI path directly to avoid security warnings and arg injection
    const proc = spawn(ARDUINO_CLI, args);
    let stdout = '';
    let stderr = '';

    // 120s timeout to handle Render's slower free-tier CPU (local is ~12s, Render ~30-60s)
    const timeout = setTimeout(() => {
      proc.kill();
      cleanup(tmpBase);
      reject(new Error('Compilation timed out after 120 seconds. The server CPU may be under load.'));
    }, 120000);

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('error', err => {
      clearTimeout(timeout);
      cleanup(tmpBase);
      reject(new Error('arduino-cli process error: ' + err.message));
    });

    proc.on('close', exitCode => {
      clearTimeout(timeout);
      if (exitCode !== 0) {
        cleanup(tmpBase);
        return reject(new Error(stderr.trim() || stdout.trim() || `Compilation failed (exit ${exitCode})`));
      }

      // Find compiled output
      const files = fs.readdirSync(tmpBase);
      const hexFile = files.find(f => f.endsWith('.hex'));
      const binFile = files.find(f => f.endsWith('.ino.bin')) || files.find(f => f.endsWith('.bin'));

      let binaryData = null;
      let format = null;
      const flashFiles = [];

      if (hexFile) {
        binaryData = fs.readFileSync(path.join(tmpBase, hexFile), 'utf8');
        format = 'hex';
      } else if (binFile) {
        binaryData = fs.readFileSync(path.join(tmpBase, binFile)).toString('base64');
        format = 'bin';

        // For ESP targets: include bootloader, partition table, boot_app0, and app binary
        const bootloaderFile = files.find(f => f.endsWith('.bootloader.bin'));
        const partitionsFile = files.find(f => f.endsWith('.partitions.bin'));
        const mergedFile = files.find(f => f.endsWith('.merged.bin'));

        if (bootloaderFile) {
          flashFiles.push({
            name: 'bootloader',
            address: 0x1000,
            data: fs.readFileSync(path.join(tmpBase, bootloaderFile)).toString('base64')
          });
        }
        if (partitionsFile) {
          flashFiles.push({
            name: 'partitions',
            address: 0x8000,
            data: fs.readFileSync(path.join(tmpBase, partitionsFile)).toString('base64')
          });
        }
        // Extract standard boot_app0 (8KB at offset 0xe000) from merged.bin if generated
        if (mergedFile) {
          try {
            const mergedBuf = fs.readFileSync(path.join(tmpBase, mergedFile));
            if (mergedBuf.length >= 0x10000) {
              const bootApp0 = mergedBuf.subarray(0xe000, 0x10000);
              flashFiles.push({
                name: 'boot_app0',
                address: 0xe000,
                data: bootApp0.toString('base64')
              });
            }
          } catch (e) {
            console.warn('Could not extract boot_app0 from merged.bin:', e.message);
          }
        }
        // Application binary at offset 0x10000
        flashFiles.push({
          name: 'app',
          address: 0x10000,
          data: binaryData
        });
      }

      cleanup(tmpBase);

      if (!binaryData) {
        return reject(new Error('No output binary found after compilation'));
      }

      resolve({ data: binaryData, format, fqbn, files: flashFiles });
    });
  });
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════════
//  POST /compile  — Dashboard IDE (returns { success, fqbn, format, data, files })
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
      files: result.files,
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
//  POST /api/ai/generate & /api/ai/chat — LLM Proxy (ngrok)
//  Proxies requests to local LLM via ngrok OpenAI API
// ══════════════════════════════════════════════════════════
app.post(['/api/ai/generate', '/api/ai/chat'], async (req, res) => {
  const ngrokUrl = 'https://salute-polygon-feline.ngrok-free.dev/v1/chat/completions';
  const apiKey = 'sk-sara-abc123';

  try {
    const messages = req.body.messages || [];
    
    // The ngrok endpoint is assumed to be OpenAI compatible, so we can pass messages directly
    const response = await fetch(ngrokUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: req.body.model || 'llama3.2', // Fallback or pass-through model name
        messages: messages,
        temperature: req.body.temperature || 0.7,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'LLM API error',
        details: data.error?.message || JSON.stringify(data)
      });
    }

    const replyText = data.choices?.[0]?.message?.content || '(empty response)';

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
