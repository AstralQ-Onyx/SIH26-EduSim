export const ESP32Profile = {

  id: 'esp32',
  boardId: 'esp32',
  displayName: 'ESP32 DevKit V1',
  shortName: 'ESP32',

  // FQBN used by the cloud compiler
  fqbn: 'esp32:esp32:esp32',

  // Master ESP32 GPIO that controls power for the ESP32 header bank
  bankControlPin: 15,

  supportedFunctions: [
    'pinMode',
    'digitalWrite',
    'digitalRead',
    'analogRead',
    'analogWrite',
    'delay'
  ],

  /*
   * Virtual ESP32 GPIO → physical HUB GPIO
   *
   * These are the pins on the ESP32 female header.
   * The Master ESP32 handles the digital pins.
   */
  digitalPins: {

    // Basic GPIO
    2: 13,
    4: 18,
    5: 14,

    // UART2 pins exposed as GPIO16/17
    16: 19,
    17: 23,

    // General-purpose GPIO
    18: 21,
    19: 22,
    21: 25,
    22: 26,
    23: 27,
    25: 32,
    26: 33,

    // Additional exposed GPIOs
    13: 16,
    14: 17
  },

  /*
   * ESP32 analog-capable pins.
   *
   * These are physically handled by the Analog ESP32 slave.
   *
   * IMPORTANT:
   * GPIO34, GPIO35, GPIO36 and GPIO39 are input-only on
   * the ESP32, so they must never be used as digital outputs.
   */
  analogPins: {

    32: 32,
    33: 33,
    34: 34,
    35: 35,
    36: 36,
    39: 39
  },

  /*
   * Pins intentionally reserved in the current hardware revision.
   *
   * GPIO0  -> boot strap / programming
   * GPIO1  -> UART0 TX
   * GPIO3  -> UART0 RX
   * GPIO12 -> boot/flash-voltage strap
   * GPIO15 -> boot strap
   * GPIO27 -> currently reserved by hardware architecture
   * EN     -> reset/enable, not GPIO
   */
  reservedPins: [
    0,
    1,
    3,
    12,
    15,
    27
  ]

};