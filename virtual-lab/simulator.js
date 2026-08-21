/**
 * EduSim Virtual Lab — AVR Simulator Engine
 * Uses avr8js (CDN) to emulate ATmega328P / ESP32 pins.
 * Talks to the agent HTTP server on port 3746 to compile sketches.
 */
'use strict';

const AGENT_HTTP = 'http://127.0.0.1:3746';

// Board FQBN map
const FQBN_MAP = {
  arduino_uno_r3:   'arduino:avr:uno',
  arduino_nano:     'arduino:avr:nano',
  esp32_dev_module: 'esp32:esp32:esp32',
  esp32:            'esp32:esp32:esp32',
};

// ── avr8js loaded state ─────────────────────────────────────
let AVR8JS_LOADED = false;
let cpu, portB, portC, portD;
let simRunner = null;   // setInterval handle
let onPinChange = null; // callback(port, pin, value)

let pseudoSimRunner = null; // Promise for ESP32
let pseudoStopRequested = false;

// Load avr8js via ESM
async function loadAvr8js() {
  if (AVR8JS_LOADED) return;
  try {
    const module = await import('https://esm.sh/avr8js');
    window.avr8js = module;
    AVR8JS_LOADED = true;
  } catch (err) {
    throw new Error('Failed to load avr8js from ESM CDN');
  }
}

// Parse Intel HEX into a Uint8Array sized for ATmega328P (32KB)
function parseHex(hexString) {
  const prog = new Uint8Array(0x8000);
  hexString.split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith(':')) return;
    const bytes  = parseInt(line.slice(1, 3), 16);
    const addr   = parseInt(line.slice(3, 7), 16);
    const type   = parseInt(line.slice(7, 9), 16);
    if (type !== 0) return; // only data records
    for (let i = 0; i < bytes; i++) {
      const byte = parseInt(line.slice(9 + i * 2, 11 + i * 2), 16);
      if (addr + i < prog.length) prog[addr + i] = byte;
    }
  });
  return prog;
}

// ── Lexical Pseudo-Simulator for ESP32 ──────────────────────
function transpileArduinoToJS(code) {
  let js = code;
  // Remove includes
  js = js.replace(/#include\s+<.*>/g, '');
  // Defines to const
  js = js.replace(/#define\s+(\w+)\s+(.+)/g, 'const $1 = $2;');
  // Types to let
  js = js.replace(/\b(int|float|double|String|bool|long|char)\s+([a-zA-Z0-9_]+)(\s*[=;])/g, 'let $2$3');
  js = js.replace(/\b(int|float|double|String|bool|long|char)\s+([a-zA-Z0-9_]+)(\s*,)/g, 'let $2$3');
  // void setup() -> async function setup()
  js = js.replace(/void\s+setup\s*\(\s*\)/g, 'async function setup()');
  // void loop() -> async function loop()
  js = js.replace(/void\s+loop\s*\(\s*\)/g, 'async function loop()');
  // delay(x) -> await delay(x)
  js = js.replace(/\bdelay\s*\(/g, 'await delay(');
  return js;
}

async function runPseudoSim(code, onLog, onReady) {
  pseudoStopRequested = false;
  const jsCode = transpileArduinoToJS(code);
  
  const env = {
    HIGH: 1,
    LOW: 0,
    INPUT: 0,
    OUTPUT: 1,
    delay: (ms) => new Promise(res => setTimeout(res, ms)),
    digitalWrite: (pin, val) => {
      if (onPinChange) onPinChange('PSEUDO', pin, val);
    },
    pinMode: () => {},
    Serial: {
      begin: () => {},
      print: (msg) => onLog(msg, 'sys'),
      println: (msg) => onLog(msg, 'sys')
    }
  };

  const wrappedCode = `
    return (async function(env) {
      const { HIGH, LOW, INPUT, OUTPUT, delay, digitalWrite, pinMode, Serial } = env;
      ${jsCode}
      if (typeof setup === 'function') await setup();
      while (true) {
        if (env.checkStop()) break;
        if (typeof loop === 'function') await loop();
        else break;
        await new Promise(r => setTimeout(r, 0)); 
      }
    });
  `;

  try {
    env.checkStop = () => pseudoStopRequested;
    const runner = new Function(wrappedCode)();
    onLog('[PseudoSim] Lexical transpilation complete. Running...', 'sys');
    onReady();
    pseudoSimRunner = runner(env); 
  } catch(err) {
    onLog('[PseudoSim] Transpiler Error: ' + err.message, 'err');
  }
}

// ── Main: compile + run ────────────────────────────────────
async function compileAndSimulate(code, defId, callbacks) {
  const { onLog, onError, onReady, onPin } = callbacks;
  onPinChange = onPin;

  stopSimulation();

  const fqbn = FQBN_MAP[defId];
  if (!fqbn) {
    onError(`[Sim] Unknown board type.`);
    return false;
  }
  
  onLog(`[Sim] Compiling for ${fqbn}…`, 'sys');

  let hex;
  try {
    const resp = await fetch(`${AGENT_HTTP}/compile-hex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, fqbn }),
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || 'Compile failed');
    hex = data.hex;
    onLog('[Sim] Compilation successful ✓', 'success');
  } catch (err) {
    onError(`[Sim] ${err.message}`);
    return false;
  }

  // ── Route to correct emulator ──
  if (!fqbn.includes('avr')) {
    onLog(`[Sim] Warning: Non-AVR board detected. Engaging Lexical Pseudo-Simulator...`, 'warn');
    runPseudoSim(code, onLog, onReady);
    return true;
  }

  try {
    await loadAvr8js();
  } catch (err) {
    onError('[Sim] ' + err.message);
    return false;
  }

  const { CPU, avrInstruction, AVRTimer, timer0Config, timer1Config, timer2Config, AVRIOPort, portBConfig, portCConfig, portDConfig } = window.avr8js;

  const prog = parseHex(hex);
  cpu   = new CPU(new Uint16Array(prog.buffer));
  portB = new AVRIOPort(cpu, portBConfig);
  portC = new AVRIOPort(cpu, portCConfig);
  portD = new AVRIOPort(cpu, portDConfig);

  function watchPort(port, name) {
    port.addListener(() => {
      for (let pin = 0; pin < 8; pin++) {
        const val = port.pinState(pin);
        if (onPinChange) onPinChange(name, pin, val);
      }
    });
  }
  watchPort(portB, 'B');
  watchPort(portC, 'C');
  watchPort(portD, 'D');

  new AVRTimer(cpu, timer0Config);
  new AVRTimer(cpu, timer1Config);
  new AVRTimer(cpu, timer2Config);

  onLog('[Sim] CPU initialized. Running…', 'sys');
  onReady();

  const CYCLES_PER_TICK = 160000; 
  simRunner = setInterval(() => {
    for (let i = 0; i < CYCLES_PER_TICK; i++) {
      avrInstruction(cpu);
    }
  }, 10);

  return true;
}

function stopSimulation() {
  if (simRunner) {
    clearInterval(simRunner);
    simRunner = null;
  }
  cpu = null;
  pseudoStopRequested = true;
  pseudoSimRunner = null;
}

function isRunning() {
  return simRunner !== null || pseudoSimRunner !== null;
}

// Export to global scope (no module bundler)
window.EduSimulator = { compileAndSimulate, stopSimulation, isRunning };
