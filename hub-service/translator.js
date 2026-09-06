import { ArduinoNanoProfile } from './profiles/arduinoNano.js';

export class CodeTranslator {
  constructor(profileId) {
    this.profile = this.getProfile(profileId);
  }

  getProfile(profileId) {
    if (profileId === 'arduinoNano' || profileId === 'arduino_nano') {
      return ArduinoNanoProfile;
    }
    return null;
  }

  validate(code) {
    if (!this.profile) {
      return { valid: false, error: 'Controller profile not supported yet.' };
    }

    const unsupported = [];
    const usedFunctions = this.extractFunctions(code);

    usedFunctions.forEach(fn => {
      // Basic Arduino core functions like setup, loop, Serial, are usually implicitly allowed
      // The profile defines hardware interactions
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

    return { valid: true };
  }

  extractFunctions(code) {
    // Very basic regex to find function calls.
    // E.g., pinMode(13, OUTPUT) -> 'pinMode'
    const fnRegex = /\b([a-zA-Z_]\w*)\s*\(/g;
    const matches = [...code.matchAll(fnRegex)];
    const functions = matches.map(m => m[1]);
    return [...new Set(functions)];
  }

  isCoreFunction(fn) {
    const coreFns = ['setup', 'loop', 'print', 'println', 'begin', 'if', 'else', 'for', 'while', 'switch', 'case'];
    return coreFns.includes(fn);
  }

  translate(code) {
    if (!this.profile) {
      throw new Error('Controller profile not found');
    }

    // A simple lexical translation strategy mapping standard Arduino calls
    // to EduSim HAL calls for ESP32.
    
    let translated = code;

    // 1. Map pinMode(pin, mode) -> eduPinMode(mappedPin, mode)
    // 2. Map digitalWrite(pin, val) -> eduDigitalWrite(mappedPin, val)
    // 3. Map digitalRead(pin) -> eduDigitalRead(mappedPin)
    // 4. Map analogRead(pin) -> eduAnalogRead(mappedPin)

    // Using regex replacement as a basic translation engine. 
    // This is safe assuming simple usage, but could be enhanced with AST parsing later.
    
    // pinMode
    translated = translated.replace(/pinMode\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, (match, pin, mode) => {
      return `eduPinMode(${this.mapPin(pin)}, ${mode})`;
    });

    // digitalWrite
    translated = translated.replace(/digitalWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, (match, pin, val) => {
      return `eduDigitalWrite(${this.mapPin(pin)}, ${val})`;
    });

    // digitalRead
    translated = translated.replace(/digitalRead\s*\(\s*([^)]+)\s*\)/g, (match, pin) => {
      return `eduDigitalRead(${this.mapPin(pin)})`;
    });

    // analogRead
    translated = translated.replace(/analogRead\s*\(\s*([^)]+)\s*\)/g, (match, pin) => {
      return `eduAnalogRead(${this.mapAnalogPin(pin)})`;
    });

    return this.wrapInFirmwareTemplate(translated);
  }

  mapPin(pin) {
    // If it's a string like '13', we parse it. If it's a variable, we pass it through (risky but okay for basic).
    // The profile has string/number keys.
    const cleanPin = pin.toString().trim();
    if (this.profile.digitalPins.hasOwnProperty(cleanPin)) {
      return this.profile.digitalPins[cleanPin];
    }
    // If it's A0-A7, it should be mapped to the analog index
    if (this.profile.analogPins.hasOwnProperty(cleanPin)) {
      return this.profile.analogPins[cleanPin];
    }
    return pin; // Pass through (might be a variable name)
  }

  mapAnalogPin(pin) {
    const cleanPin = pin.toString().trim();
    if (this.profile.analogPins.hasOwnProperty(cleanPin)) {
      return this.profile.analogPins[cleanPin];
    }
    return pin;
  }

  wrapInFirmwareTemplate(translatedCode) {
    // Rename setup and loop
    let fwCode = translatedCode.replace(/void\s+setup\s*\(\s*\)/g, 'void studentSetup()');
    fwCode = fwCode.replace(/void\s+loop\s*\(\s*\)/g, 'void studentLoop()');

    return `
#include <Arduino.h>

HardwareSerial InterESP(2);

// UART Pins
#define TX_PIN 4
#define RX_PIN 5

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

// [EDUSIM ANALOG HAL]
int eduAnalogRead(int analogPinIndex) {
  // Request analog value from Left ESP32
  InterESP.print("READ:A");
  InterESP.println(analogPinIndex);
  
  // Wait for response
  long startTime = millis();
  while (!InterESP.available() && millis() - startTime < 100) {
    delay(1);
  }
  
  if (InterESP.available()) {
    String resp = InterESP.readStringUntil('\\n');
    // Expected format: A0:2048
    int colonIdx = resp.indexOf(':');
    if (colonIdx > 0) {
      return resp.substring(colonIdx + 1).toInt();
    }
  }
  return 0; // Default or error value
}

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
}
