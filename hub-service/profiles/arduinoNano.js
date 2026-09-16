export const ArduinoNanoProfile = {
  id: 'arduinoNano',
  boardId: 'arduinoNano',
  displayName: 'Arduino Nano V3',
  shortName: 'Nano',

  // FQBN used by the cloud compiler
  fqbn: 'esp32:esp32:esp32',

  // Analog routing: 'slave_index' sends READ:A<n> to the slave.
  // The slave maps index 0-7 to its physical ADC pins.
  analogMode: 'slave_index',

  supportedFunctions: [
    'pinMode',
    'digitalWrite',
    'digitalRead',
    'analogRead',
    'delay'
  ],

  // Arduino Nano pin number → Master ESP32 physical GPIO
  digitalPins: {
    0:  16,
    1:  17,
    2:  13,
    3:  18,
    4:  14,
    5:  19,
    6:  23,
    7:  21,
    8:  22,
    9:  25,
    10: 26,
    11: 27,
    12: 32,
    13: 33
  },

  // Analog pin label → slave index (0-7)
  // Handled by the Analog ESP32 slave via READ:A<index>
  analogPins: {
    'A0': 0, 'A1': 1, 'A2': 2, 'A3': 3,
    'A4': 4, 'A5': 5, 'A6': 6, 'A7': 7
  },

  // No restricted pins for Nano-style usage
  reservedPins: []
};
