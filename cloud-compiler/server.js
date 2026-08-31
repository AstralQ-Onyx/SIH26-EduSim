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

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'online', service: 'EduSim Cloud Compiler API' });
});

app.post('/compile', async (req, res) => {
  const { code, fqbn = 'arduino:avr:uno' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Source code is required' });
  }

  // Support for multiple FQBNs
  const validFqbns = ['arduino:avr:uno', 'arduino:avr:nano', 'arduino:avr:mega', 'esp32:esp32:esp32', 'esp8266:esp8266:nodemcuv2', 'rp2040:rp2040:rpipico'];
  if (!validFqbns.includes(fqbn)) {
    return res.status(400).json({ error: 'Unsupported FQBN' });
  }

  const sketchName = 'edusim_sketch';
  const tmpBase = path.join(os.tmpdir(), `build_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const sketchDir = path.join(tmpBase, sketchName);

  try {
    // 1. Setup temporary build directory
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, `${sketchName}.ino`), code, 'utf8');

    // 2. Extract `#include` directives to auto-install missing libraries (Basic implementation)
    // In a production environment, this would be more robust or libraries would be pre-installed.
    const includes = [...code.matchAll(/#include\s*[<"]([^>"]+)\.h[>"]/g)].map(m => m[1]);
    
    // NOTE: For speed in a cloud environment, it's better to pre-install libraries in the Docker image.
    // We assume the Docker image has standard libraries installed.

    // 3. Compile using arduino-cli
    const args = [
      'compile',
      '--fqbn', fqbn,
      '--output-dir', tmpBase,
      '--log-level', 'warn',
      '--warnings', 'none', // suppress warnings to speed up and reduce logs
      sketchDir
    ];

    const proc = spawn(ARDUINO_CLI, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', exitCode => {
      if (exitCode !== 0) {
        fs.rmSync(tmpBase, { recursive: true, force: true });
        return res.status(400).json({ 
          error: 'Compilation failed', 
          details: stderr.trim() || stdout.trim() 
        });
      }

      // 4. Find the compiled output (.hex for AVR, .bin for ESP32/ESP8266/RP2040)
      const files = fs.readdirSync(tmpBase);
      const hexFile = files.find(f => f.endsWith('.hex'));
      const binFile = files.find(f => f.endsWith('.bin'));

      let binaryData = null;
      let format = null;

      if (hexFile) {
        binaryData = fs.readFileSync(path.join(tmpBase, hexFile), 'utf8');
        format = 'hex';
      } else if (binFile) {
        // Read as base64 for .bin files
        binaryData = fs.readFileSync(path.join(tmpBase, binFile)).toString('base64');
        format = 'bin';
      }

      // 5. Cleanup temp files
      fs.rmSync(tmpBase, { recursive: true, force: true });

      if (!binaryData) {
        return res.status(500).json({ error: 'No output binary found after compilation' });
      }

      // 6. Send response
      res.json({
        success: true,
        fqbn: fqbn,
        format: format,
        data: binaryData,
        message: 'Compiled successfully'
      });
    });

    proc.on('error', err => {
      fs.rmSync(tmpBase, { recursive: true, force: true });
      console.error('Process error:', err);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    });

  } catch (error) {
    try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch (e) {}
    console.error('Try-catch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`EduSim Cloud Compiler API is running on port ${PORT}`);
});
