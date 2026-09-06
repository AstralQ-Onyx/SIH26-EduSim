export const ArduinoNanoProfile = {
  id: 'arduinoNano',
  name: 'Arduino Nano',
  supportedFunctions: [
    'pinMode',
    'digitalWrite',
    'digitalRead',
    'analogRead',
    'delay'
  ],
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
    // Handled by analog ESP32 remotely, these are mapped to A0-A7 commands internally
    'A0': 0, 'A1': 1, 'A2': 2, 'A3': 3, 'A4': 4, 'A5': 5, 'A6': 6, 'A7': 7
  }
};
