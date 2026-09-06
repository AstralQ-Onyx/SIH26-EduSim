import { CodeTranslator } from './translator.js';

// URL for the cloud compiler — matches existing simulator.js pattern
// Uses localhost:3000 if running locally (local dev), otherwise remote
const COMPILER_URL = (typeof ENV !== 'undefined' && ENV.BACKEND_URL)
  ? ENV.BACKEND_URL
  : (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://edusim-compiler.onrender.com';

export class HubService {
  constructor(callbacks) {
    this.translator = null;
    this.callbacks = callbacks || {};
    this.port = null;
    this.transport = null;
    this.esploader = null;
  }

  async uploadToHub(controllerId, code) {
    try {
      // ── Step 1: Validate ──────────────────────────────────────
      this.updateProgress(1, 'Validating Code...');
      this.translator = new CodeTranslator(controllerId);
      const validation = this.translator.validate(code);
      if (!validation.valid) {
        this.callbacks.onError(
          validation.error +
          (validation.unsupported ? '\nUnsupported: ' + validation.unsupported.join(', ') : '')
        );
        return;
      }
      await this.delay(300);

      // ── Step 2: Check compatibility ───────────────────────────
      this.updateProgress(2, `Arduino Nano Profile Loaded ✓`);
      await this.delay(300);

      // ── Step 3: Translate ─────────────────────────────────────
      this.updateProgress(3, 'Translating Code...');
      const translatedCode = this.translator.translate(code);
      await this.delay(300);

      // ── Step 4: Request Serial Port (MUST happen before any fetch/await) ──
      // Browser only allows requestPort() directly within a user gesture context.
      // If we compile first (fetch), the gesture is consumed and it throws.
      this.updateProgress(4, 'Please select USB port for EduSim Hub...');
      const portSelected = await this.connectWebSerial();
      if (!portSelected) return;

      // ── Step 5: Load esptool-js while still in sync context ───
      this.updateProgress(5, 'Loading ESP32 Flasher...');
      await this.loadEsptool();

      // ── Step 6: Compile via cloud (now safe to fetch) ─────────
      this.updateProgress(6, 'Generating Firmware (Compiling via Cloud)...');
      const binStr = await this.compileFirmware(translatedCode);
      if (!binStr) return;

      // ── Step 7: Flash ─────────────────────────────────────────
      this.updateProgress(7, 'Uploading Firmware...');
      await this.flashESP32(binStr);

      // ── Step 8: Verify ────────────────────────────────────────
      this.updateProgress(8, 'Verifying Hub...');
      await this.delay(600);

      // ── Step 9: Done ──────────────────────────────────────────
      this.updateProgress(9, 'Upload Complete ✓');
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(true, '✓ Successfully uploaded to EduSim Hub');
      }

    } catch (err) {
      console.error('[HubService]', err);
      if (this.callbacks.onError) {
        this.callbacks.onError('Upload failed: ' + err.message);
      }
    } finally {
      if (this.transport) {
        try { await this.transport.disconnect(); } catch (e) {}
      }
      if (this.port) {
        try { await this.port.close(); } catch (e) {}
      }
    }
  }

  updateProgress(stepIndex, message) {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(stepIndex, message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Compile translated C++ to ESP32 .bin via cloud compiler ──
  async compileFirmware(code) {
    try {
      const resp = await fetch(`${COMPILER_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, fqbn: 'esp32:esp32:esp32' })
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.details || data.error || `Compile failed (HTTP ${resp.status})`);
      }

      // Decode base64 .bin to binary string (esptool-js expects a binary string, not Uint8Array)
      const b64 = data.data;
      const binaryString = atob(b64);
      return binaryString;

    } catch (err) {
      this.callbacks.onError('Compilation failed: ' + err.message);
      return null;
    }
  }

  // ── Request and open the Web Serial port ─────────────────────
  async connectWebSerial() {
    if (!('serial' in navigator)) {
      this.callbacks.onError(
        'Web Serial API is not supported in this browser.\n' +
        'Please open EduSim in Google Chrome or Microsoft Edge.'
      );
      return false;
    }
    try {
      this.port = await navigator.serial.requestPort();
      // Do NOT open the port here — esptool-js Transport opens it internally
      return true;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        this.callbacks.onError('No port selected. Please connect your EduSim Hub and try again.');
      } else {
        this.callbacks.onError('Could not access serial port: ' + err.message);
      }
      return false;
    }
  }

  // ── Dynamically load esptool-js as ES Module from CDN ────────
  async loadEsptool() {
    if (this._ESPLoader && this._Transport) return; // already loaded

    if (!window.Buffer) {
      try {
        const { Buffer } = await import('https://esm.sh/buffer');
        window.Buffer = Buffer;
      } catch(e) {
        console.warn('Failed to load Buffer polyfill, esptool-js might fail during stub upload.', e);
      }
    }

    // esptool-js is an ES module — use dynamic import()
    try {
      const mod = await import('https://unpkg.com/esptool-js@0.4.3/bundle.js');
      this._ESPLoader = mod.ESPLoader;
      this._Transport = mod.Transport;
      if (!this._ESPLoader || !this._Transport) {
        // Some builds export as default
        const def = mod.default || {};
        this._ESPLoader = this._ESPLoader || def.ESPLoader;
        this._Transport = this._Transport || def.Transport;
      }
      if (!this._ESPLoader || !this._Transport) {
        throw new Error('ESPLoader or Transport not found in esptool-js module exports: ' + Object.keys(mod).join(', '));
      }
    } catch(e) {
      throw new Error('Failed to load esptool-js: ' + e.message);
    }
  }

  // ── Flash the compiled .bin to ESP32 at 0x10000 ──────────────
  async flashESP32(binBytes) {
    const ESPLoader = this._ESPLoader;
    const Transport = this._Transport;
    if (!ESPLoader || !Transport) throw new Error('esptool-js not loaded');

    // Transport wraps the port and opens it at the appropriate baud rate
    this.transport = new Transport(this.port);

    const terminal = {
      writeLine: (msg) => console.log('[esptool]', msg),
      write:     (msg) => console.log('[esptool]', msg),
      clean:     ()    => {}
    };

    // 115200 is slower but 100% reliable on all ESP32 clones. 921600 fails on some CH340 chips.
    this.esploader = new ESPLoader({
      transport: this.transport,
      baudrate: 115200,
      terminal
    });

    // Connect to ROM bootloader
    this.updateProgress(7, 'Uploading Firmware... (Connecting to ROM Bootloader)');
    const chip = await this.esploader.main();
    this.updateProgress(7, `Uploading Firmware... (Chip: ${chip})`);

    // Flash the .bin at the standard Arduino app offset
    const fileArray = [{ data: binBytes, address: 0x10000 }];

    await this.esploader.writeFlash({
      fileArray,
      flashMode:  'keep',
      flashFreq:  'keep',
      flashSize:  'keep',
      compress:   true,
      reportProgress: (fileIndex, written, total) => {
        const pct = Math.floor((written / total) * 100);
        this.updateProgress(7, `Uploading Firmware... (${pct}%)`);
      }
    });

    this.updateProgress(7, 'Uploading Firmware... (Resetting ESP32)');
    await this.esploader.hardReset();
  }

  // ── Serial Monitor ────────────────────────────────────────────
  // Opens a Web Serial port and streams incoming bytes to onData(text).
  // Resolves when the port is opened; streaming runs in background.
  async startSerialMonitor({ baudRate = 115200, onData, onError, onDisconnect }) {
    if (!('serial' in navigator)) {
      if (onError) onError('Web Serial API not supported in this browser.');
      return false;
    }
    try {
      this._monitorPort = await navigator.serial.requestPort();
      await this._monitorPort.open({ baudRate });
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        if (onError) onError('Could not open port: ' + err.message);
      }
      return false;
    }

    this._monitorActive = true;

    // Keep a reference to the writer for sending data
    this._monitorWriter = this._monitorPort.writable.getWriter();

    // Read loop — runs in background
    (async () => {
      const decoder = new TextDecoderStream();
      const readableStreamClosed = this._monitorPort.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();

      try {
        while (this._monitorActive) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && onData) onData(value);
        }
      } catch (err) {
        if (this._monitorActive && onError) onError('Serial read error: ' + err.message);
      } finally {
        reader.releaseLock();
        if (onDisconnect) onDisconnect();
      }
    })();

    return true;
  }

  async sendSerialData(text) {
    if (!this._monitorWriter) return;
    const encoder = new TextEncoder();
    try {
      await this._monitorWriter.write(encoder.encode(text + '\n'));
    } catch(e) {
      console.error('Serial send error:', e);
    }
  }

  async stopSerialMonitor() {
    this._monitorActive = false;
    try {
      if (this._monitorWriter) {
        await this._monitorWriter.releaseLock();
        this._monitorWriter = null;
      }
    } catch(e) {}
    try {
      if (this._monitorPort) {
        await this._monitorPort.close();
        this._monitorPort = null;
      }
    } catch(e) {}
  }
}
