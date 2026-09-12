export const ArduinoNanoProfile = {
  id: 'arduinoNano',
  boardId: 'arduinoNano',
  displayName: 'Arduino Nano V3',
  shortName: 'Nano',
  // FQBN used by the cloud compiler
  fqbn: 'esp32:esp32:esp32',
  // Master ESP32 GPIO that drives the transistor/relay powering this header bank
  bankControlPin: 15,
  supportedFunctions: [
    'pinMode',
    'digitalWrite',
    'digitalRead',
    'analogRead',
    'delay'
  ],
  // Arduino pin number → Master ESP32 GPIO mapping
  digitalPins: {
    0: 16,
    1: 17,
    2: 13,
    3: 18,
    4: 14,
    5: 19,
    6: 23,
    7: 21,
    8: 22,
    9: 25,
    10: 26,
    11: 27,
    12: 32,
    13: 33
  },
  analogPins: {
    // Handled by the Analog ESP32 slave; mapped to index 0-7
    'A0': 0, 'A1': 1, 'A2': 2, 'A3': 3, 'A4': 4, 'A5': 5, 'A6': 6, 'A7': 7
  }
};
