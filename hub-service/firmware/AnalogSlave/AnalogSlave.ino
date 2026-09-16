/*
 * EduSim Analog Slave Firmware v2
 *
 * Handles two analog read protocols from the Master ESP32:
 *
 *   Protocol 1 — slave_index (Arduino Nano mode)
 *     Master sends:  "READ:A<index>\n"   e.g. "READ:A0"
 *     Slave replies: "A<index>:<value>\n" e.g. "A0:2048"
 *     Index maps to physical ADC pins via analogPins[].
 *
 *   Protocol 2 — slave_gpio (ESP32 DevKit mode)
 *     Master sends:  "READ:G<gpio>\n"    e.g. "READ:G36"
 *     Slave replies: "G<gpio>:<value>\n" e.g. "G36:1024"
 *     The slave directly calls analogRead(gpio) on the requested pin.
 *
 * Wiring (Master <-> Slave):
 *   Master TX (GPIO 4)  -> Slave RX (GPIO 16)
 *   Master RX (GPIO 5)  -> Slave TX (GPIO 17)
 *   GND                 -> GND
 */

#include <Arduino.h>

HardwareSerial MasterComm(2);

// ── slave_index pin table (Protocol 1) ──────────────────────────
// Index 0-5 → physical ADC pins on this Slave ESP32
const int analogIndexPins[] = {
  36, // A0
  39, // A1
  34, // A2
  35, // A3
  32, // A4
  33  // A5
};
const int maxIndexPins = sizeof(analogIndexPins) / sizeof(analogIndexPins[0]);

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Returns true if the requested GPIO is a valid ADC-capable input pin
 * on this Slave ESP32. Prevents mis-use of output or reserved pins.
 */
bool isValidAdcPin(int gpio) {
  // ADC1 pins: 32, 33, 34, 35, 36(VP), 39(VN)
  // ADC2 pins: 0,2,4,12,13,14,15,25,26,27 — avoid when Wi-Fi active
  const int validPins[] = { 32, 33, 34, 35, 36, 39 };
  for (int i = 0; i < 6; i++) {
    if (validPins[i] == gpio) return true;
  }
  return false;
}

// ── Setup ────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  MasterComm.begin(115200, SERIAL_8N1, 16, 17); // RX=16, TX=17

  Serial.println("EduSim Analog Slave v2 — Ready");
  Serial.println("Protocols: READ:A<index> | READ:G<gpio>");
}

// ── Main Loop ────────────────────────────────────────────────────

void loop() {
  if (!MasterComm.available()) return;

  String cmd = MasterComm.readStringUntil('\n');
  cmd.trim();

  if (cmd.startsWith("READ:A")) {
    // ── Protocol 1: slave_index (Nano mode) ─────────────────────
    int idx = cmd.substring(6).toInt();

    if (idx >= 0 && idx < maxIndexPins) {
      int val = analogRead(analogIndexPins[idx]);
      MasterComm.print("A");
      MasterComm.print(idx);
      MasterComm.print(":");
      MasterComm.println(val);
      Serial.printf("[A-mode] idx=%d pin=%d val=%d\n", idx, analogIndexPins[idx], val);
    } else {
      MasterComm.print("A"); MasterComm.print(idx); MasterComm.println(":0");
      Serial.printf("[A-mode] ERROR: invalid index %d\n", idx);
    }

  } else if (cmd.startsWith("READ:G")) {
    // ── Protocol 2: slave_gpio (ESP32 mode) ─────────────────────
    int gpio = cmd.substring(6).toInt();

    if (isValidAdcPin(gpio)) {
      int val = analogRead(gpio);
      MasterComm.print("G");
      MasterComm.print(gpio);
      MasterComm.print(":");
      MasterComm.println(val);
      Serial.printf("[G-mode] gpio=%d val=%d\n", gpio, val);
    } else {
      MasterComm.print("G"); MasterComm.print(gpio); MasterComm.println(":0");
      Serial.printf("[G-mode] ERROR: invalid/unsafe ADC gpio %d\n", gpio);
    }

  } else {
    // Unknown command — ignore silently to avoid flooding
    Serial.printf("[Slave] Unknown cmd: %s\n", cmd.c_str());
  }
}
