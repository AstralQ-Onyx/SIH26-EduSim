import { getProfile } from './profiles/index.js';

export class CodeTranslator {
  constructor(profileId) {
    this.profile = getProfile(profileId);
  }

  // ── Validation ────────────────────────────────────────────────

  validate(code) {
    if (!this.profile) {
      return { valid: false, error: 'Controller profile not supported yet.' };
    }

    // 1. Function whitelist check
    const unsupported = [];
    const usedFunctions = this.extractFunctions(code);
    usedFunctions.forEach(fn => {
      if (!this.profile.supportedFunctions.includes(fn) && !this.isCoreFunction(fn)) {
        unsupported.push(fn);
      }
    });
    if (unsupported.length > 0) {
      return {
        valid: false,
        error: 'Some functions in your code are not yet supported by EduSim Hub.',
        unsupported
      };
    }

    // 2. Reserved-pin check (if profile defines any)
    if (this.profile.reservedPins && this.profile.reservedPins.length > 0) {
      const usedPins = this.extractLiteralPins(code);
      const violations = usedPins.filter(p => this.profile.reservedPins.includes(p));
      if (violations.length > 0) {
        return {
          valid: false,
          error: `Pin(s) ${violations.join(', ')} are reserved and cannot be used with the ${this.profile.displayName} profile.\n` +
                 `Reserved pins: ${this.profile.reservedPins.join(', ')}`
        };
      }
    }

    return { valid: true };
  }

  extractFunctions(code) {
    const fnRegex = /\b([a-zA-Z_]\w*)\s*\(/g;
    const matches = [...code.matchAll(fnRegex)];
    return [...new Set(matches.map(m => m[1]))];
  }

  /**
   * Extract all integer pin literals used in standard Arduino calls.
   * E.g. pinMode(15, OUTPUT) → [15]
   */
  extractLiteralPins(code) {
    const pinRegex = /(?:pinMode|digitalWrite|digitalRead|analogRead|analogWrite)\s*\(\s*(\d+)/g;
    const matches = [...code.matchAll(pinRegex)];
    return [...new Set(matches.map(m => parseInt(m[1], 10)))];
  }

  isCoreFunction(fn) {
    const coreFns = [
      'setup', 'loop', 'print', 'println', 'begin',
      'if', 'else', 'for', 'while', 'switch', 'case',
      'int', 'void', 'bool', 'float', 'String', 'return'
    ];
    return coreFns.includes(fn);
  }

  // ── Translation ───────────────────────────────────────────────

  translate(code) {
    if (!this.profile) {
      throw new Error('Controller profile not found');
    }

    let translated = code;

    // pinMode(pin, mode) → eduPinMode(mappedPin, mode)
    translated = translated.replace(
      /pinMode\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
      (_, pin, mode) => `eduPinMode(${this.mapDigitalPin(pin)}, ${mode})`
    );

    // digitalWrite(pin, val) → eduDigitalWrite(mappedPin, val)
    translated = translated.replace(
      /digitalWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
      (_, pin, val) => `eduDigitalWrite(${this.mapDigitalPin(pin)}, ${val})`
    );

    // digitalRead(pin) → eduDigitalRead(mappedPin)
    translated = translated.replace(
      /digitalRead\s*\(\s*([^)]+)\s*\)/g,
      (_, pin) => `eduDigitalRead(${this.mapDigitalPin(pin)})`
    );

    // analogRead(pin) → eduAnalogRead(mappedAnalogPin)
    translated = translated.replace(
      /analogRead\s*\(\s*([^)]+)\s*\)/g,
      (_, pin) => `eduAnalogRead(${this.mapAnalogPin(pin)})`
    );

    // analogWrite(pin, val) → eduAnalogWrite(mappedPin, val)
    // Only active if profile supports analogWrite
    if (this.profile.supportedFunctions.includes('analogWrite')) {
      translated = translated.replace(
        /analogWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
        (_, pin, val) => `eduAnalogWrite(${this.mapDigitalPin(pin)}, ${val})`
      );
    }

    return this.wrapInFirmwareTemplate(translated);
  }

  // ── Pin Mapping ───────────────────────────────────────────────

  /**
   * Maps a student digital pin to the physical Master ESP32 GPIO.
   * Looks up profile.digitalPins first, then analogPins, then passes through.
   */
  mapDigitalPin(pin) {
    const clean = pin.toString().trim();
    if (Object.prototype.hasOwnProperty.call(this.profile.digitalPins, clean)) {
      return this.profile.digitalPins[clean];
    }
    if (Object.prototype.hasOwnProperty.call(this.profile.analogPins, clean)) {
      return this.profile.analogPins[clean];
    }
    return pin; // variable name or unmapped literal — pass through
  }

  /**
   * Maps a student analog pin to the value sent to the Analog Slave.
   * - slave_index mode (Nano): returns the index (0-7)
   * - slave_gpio mode (ESP32): returns the physical ADC GPIO number on the slave
   */
  mapAnalogPin(pin) {
    const clean = pin.toString().trim();
    if (Object.prototype.hasOwnProperty.call(this.profile.analogPins, clean)) {
      return this.profile.analogPins[clean];
    }
    return pin;
  }

  // ── Firmware Template ─────────────────────────────────────────

  wrapInFirmwareTemplate(translatedCode) {
    // Rename student setup/loop so HAL setup runs first
    let fwCode = translatedCode
      .replace(/void\s+setup\s*\(\s*\)/g, 'void studentSetup()')
      .replace(/void\s+loop\s*\(\s*\)/g,  'void studentLoop()');

    const analogMode = this.profile.analogMode || 'slave_index';
    const supportsAnalogWrite = this.profile.supportedFunctions.includes('analogWrite');

    // Build the profile-specific analog read HAL
    const analogReadHAL = analogMode === 'slave_gpio'
      ? this._analogReadHAL_gpio()
      : this._analogReadHAL_index();

    const analogWriteHAL = supportsAnalogWrite
      ? this._analogWriteHAL()
      : '';

    return `
#include <Arduino.h>

HardwareSerial InterESP(2);

// UART Pins (Master <-> Analog Slave)
#define TX_PIN 4
#define RX_PIN 5

// ── EDUSIM BOARD SELECTION HAL ──────────────────────────────────
// Removed: Both header banks are powered directly; no power transistors.
// ───────────────────────────────────────────────────────────────

// [EDUSIM DIGITAL HAL]
void eduPinMode(int pin, int mode) {
  pinMode(pin, mode);
}

void eduDigitalWrite(int pin, int value) {
  digitalWrite(pin, value);
}

int eduDigitalRead(int pin) {
  return digitalRead(pin);
}

// [EDUSIM ANALOG HAL — mode: ${analogMode}]
${analogReadHAL}
${analogWriteHAL}
// --- STUDENT CODE ---
${fwCode}
// --------------------

void setup() {
  Serial.begin(115200);
  InterESP.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);
  studentSetup();
}

void loop() {
  studentLoop();
}
`;
  }

  // ── Private HAL Builders ──────────────────────────────────────

  /**
   * slave_index mode (Arduino Nano):
   * Sends READ:A<index> and expects A<index>:<value>
   */
  _analogReadHAL_index() {
    return `
int eduAnalogRead(int idx) {
  InterESP.print("READ:A");
  InterESP.println(idx);
  long t = millis();
  while (!InterESP.available() && millis() - t < 100) delay(1);
  if (InterESP.available()) {
    String resp = InterESP.readStringUntil('\\n');
    int col = resp.indexOf(':');
    if (col > 0) return resp.substring(col + 1).toInt();
  }
  return 0;
}
`;
  }

  /**
   * slave_gpio mode (ESP32):
   * Sends READ:G<gpio> and expects G<gpio>:<value>
   * The slave directly calls analogRead(gpio) on its hardware.
   */
  _analogReadHAL_gpio() {
    return `
int eduAnalogRead(int gpio) {
  InterESP.print("READ:G");
  InterESP.println(gpio);
  long t = millis();
  while (!InterESP.available() && millis() - t < 100) delay(1);
  if (InterESP.available()) {
    String resp = InterESP.readStringUntil('\\n');
    int col = resp.indexOf(':');
    if (col > 0) return resp.substring(col + 1).toInt();
  }
  return 0;
}
`;
  }

  /**
   * PWM output via ESP32 LEDC peripheral.
   * Uses channel 0 with 8-bit resolution at 5 kHz.
   */
  _analogWriteHAL() {
    return `
void eduAnalogWrite(int pin, int value) {
  // ESP32 Arduino Core 3.x unified LEDC API
  ledcAttach(pin, 5000, 8); // pin, freq=5kHz, resolution=8-bit
  ledcWrite(pin, value);    // 0-255
}
`;
  }
}
