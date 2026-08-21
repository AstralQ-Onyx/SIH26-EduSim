/**
 * EduSim Virtual Lab — Component Registry
 * Each component is a plain JS object:
 *  {
 *    id        : string  — unique identifier
 *    label     : string  — display name in palette
 *    category  : string  — palette group
 *    desc      : string  — short description
 *    w, h      : number  — canvas size in px
 *    svg       : string  — SVG content (no <svg> wrapper, just inner markup)
 *    pins      : [{ id, x, y, type:'digital'|'analog'|'power'|'gnd', label }]
 *    defaults  : {}      — default property values shown in inspector
 *    props     : [{ key, label, type:'text'|'number'|'select'|'color', options?, min?, max? }]
 *    simulate  : function(state, inputs) — returns outputs (called every tick)
 *  }
 */

'use strict';

const EDUSIM_COMPONENTS = {

  /* ════════════════════════════
     CONTROLLERS
  ════════════════════════════ */
  arduino_uno_r3: {
  id: 'arduino_uno_r3',
  label: 'Arduino UNO R3',
  category: 'Controllers',
  desc: 'ATmega328P, 14 Digital I/O, 6 Analog Inputs, USB',
  w: 240,
  h: 150,

  svg: `

    <!-- ================================================= -->
    <!-- ARDUINO UNO R3 PCB                                -->
    <!-- ================================================= -->

    <rect
      x="5" y="5"
      width="230" height="140"
      rx="5"
      fill="#0878a8"
      stroke="#075b80"
      stroke-width="2"
    />

    <!-- PCB inner surface -->
    <rect
      x="9" y="9"
      width="222" height="132"
      rx="3"
      fill="#087fad"
    />

    <!-- ================================================= -->
    <!-- MOUNTING HOLES                                    -->
    <!-- ================================================= -->

    <circle cx="15" cy="15" r="5"
      fill="#111" stroke="#aaa" stroke-width="1"/>

    <circle cx="225" cy="15" r="5"
      fill="#111" stroke="#aaa" stroke-width="1"/>

    <circle cx="15" cy="135" r="5"
      fill="#111" stroke="#aaa" stroke-width="1"/>

    <circle cx="225" cy="135" r="5"
      fill="#111" stroke="#aaa" stroke-width="1"/>

    <!-- ================================================= -->
    <!-- USB-B CONNECTOR                                   -->
    <!-- ================================================= -->

    <rect
      x="4" y="38"
      width="47" height="40"
      rx="3"
      fill="#777"
      stroke="#555"
      stroke-width="1"
    />

    <!-- USB metal -->
    <rect
      x="1" y="41"
      width="43" height="34"
      rx="2"
      fill="#555"
    />

    <!-- USB opening -->
    <rect
      x="5" y="45"
      width="34" height="26"
      rx="2"
      fill="#1a1a1a"
    />

    <!-- USB inner -->
    <rect
      x="8" y="48"
      width="28" height="20"
      rx="1"
      fill="#252525"
    />

    <!-- USB contacts -->
    <rect x="11" y="49" width="22" height="2"
      fill="#b9a45d"/>
    <rect x="11" y="53" width="22" height="2"
      fill="#b9a45d"/>
    <rect x="11" y="57" width="22" height="2"
      fill="#b9a45d"/>
    <rect x="11" y="61" width="22" height="2"
      fill="#b9a45d"/>

    <!-- ================================================= -->
    <!-- RESET BUTTON                                      -->
    <!-- ================================================= -->

    <rect
      x="26" y="12"
      width="20"
      height="16"
      rx="2"
      fill="#222"
      stroke="#555"
    />

    <circle
      cx="36"
      cy="20"
      r="6"
      fill="#c0392b"
      stroke="#7d241c"
      stroke-width="1"
    />

    <text
      x="36"
      y="32"
      text-anchor="middle"
      fill="#d9efff"
      font-size="3.5"
      font-family="Arial"
    >
      RESET
    </text>

    <!-- ================================================= -->
    <!-- USB SERIAL CHIP - ATMEGA16U2                      -->
    <!-- ================================================= -->

    <rect
      x="62" y="44"
      width="25"
      height="25"
      rx="2"
      fill="#242628"
      stroke="#111"
      stroke-width="1"
    />

    <text
      x="74.5" y="56"
      text-anchor="middle"
      fill="#777"
      font-size="3.5"
      font-family="monospace"
    >
      ATmega
    </text>

    <text
      x="74.5" y="62"
      text-anchor="middle"
      fill="#666"
      font-size="3"
      font-family="monospace"
    >
      16U2
    </text>

    <!-- ================================================= -->
    <!-- SERIAL LEDs                                       -->
    <!-- ================================================= -->

    <circle cx="92" cy="44" r="2.2"
      fill="#e9e9e9" stroke="#777"/>

    <circle cx="92" cy="51" r="2.2"
      fill="#e9e9e9" stroke="#777"/>

    <text
      x="98" y="45"
      fill="#dff4ff"
      font-size="3.2"
      font-family="monospace"
    >
      TX
    </text>

    <text
      x="98" y="52"
      fill="#dff4ff"
      font-size="3.2"
      font-family="monospace"
    >
      RX
    </text>

    <!-- ================================================= -->
    <!-- CRYSTAL                                           -->
    <!-- ================================================= -->

    <rect
      x="58" y="76"
      width="25"
      height="10"
      rx="2"
      fill="#b8b9b6"
      stroke="#777"
    />

    <text
      x="70.5" y="82"
      text-anchor="middle"
      fill="#555"
      font-size="3"
      font-family="monospace"
    >
      16.000
    </text>

    <!-- ================================================= -->
    <!-- POWER REGULATOR                                   -->
    <!-- ================================================= -->

    <rect
      x="27" y="94"
      width="17"
      height="24"
      rx="2"
      fill="#222"
      stroke="#111"
    />

    <text
      x="35.5" y="108"
      text-anchor="middle"
      fill="#777"
      font-size="3"
      font-family="monospace"
    >
      REG
    </text>

    <!-- ================================================= -->
    <!-- ATMEGA328P DIP                                    -->
    <!-- ================================================= -->

    <rect
      x="105" y="75"
      width="92"
      height="34"
      rx="3"
      fill="#242628"
      stroke="#111"
      stroke-width="1.2"
    />

    <!-- DIP notch -->
    <path
      d="M145 75
         Q151 82 157 75"
      fill="none"
      stroke="#555"
      stroke-width="2"
    />

    <!-- IC top highlight -->
    <rect
      x="110" y="79"
      width="82"
      height="26"
      rx="2"
      fill="#292b2d"
    />

    <!-- IC label -->
    <text
      x="151" y="91"
      text-anchor="middle"
      fill="#777"
      font-size="4.2"
      font-family="monospace"
    >
      ATMEGA328P
    </text>

    <text
      x="151" y="98"
      text-anchor="middle"
      fill="#555"
      font-size="3.2"
      font-family="monospace"
    >
      8-BIT AVR
    </text>

    <!-- DIP pins -->
    <g
      stroke="#aaa"
      stroke-width="1"
    >
      <path d="M111 75 V70"/>
      <path d="M117 75 V70"/>
      <path d="M123 75 V70"/>
      <path d="M129 75 V70"/>
      <path d="M135 75 V70"/>
      <path d="M141 75 V70"/>
      <path d="M147 75 V70"/>
      <path d="M153 75 V70"/>
      <path d="M159 75 V70"/>
      <path d="M165 75 V70"/>
      <path d="M171 75 V70"/>
      <path d="M177 75 V70"/>
      <path d="M183 75 V70"/>
      <path d="M189 75 V70"/>

      <path d="M111 109 V114"/>
      <path d="M117 109 V114"/>
      <path d="M123 109 V114"/>
      <path d="M129 109 V114"/>
      <path d="M135 109 V114"/>
      <path d="M141 109 V114"/>
      <path d="M147 109 V114"/>
      <path d="M153 109 V114"/>
      <path d="M159 109 V114"/>
      <path d="M165 109 V114"/>
      <path d="M171 109 V114"/>
      <path d="M177 109 V114"/>
      <path d="M183 109 V114"/>
      <path d="M189 109 V114"/>
    </g>

    <!-- ================================================= -->
    <!-- POWER LED                                         -->
    <!-- ================================================= -->

    <circle
      cx="202"
      cy="47"
      r="3"
      fill="#20e620"
      stroke="#0a750a"
      stroke-width=".8"
    />

    <text
      x="210"
      y="48"
      fill="#dff4ff"
      font-size="3.5"
      font-family="monospace"
    >
      ON
    </text>

    <!-- ================================================= -->
    <!-- USER LED - D13                                    -->
    <!-- ================================================= -->

    <circle
      cx="202"
      cy="57"
      r="3"
      fill="#d9d9d9"
      stroke="#777"
      stroke-width=".8"
    />

    <text
      x="210"
      y="58"
      fill="#dff4ff"
      font-size="3.2"
      font-family="monospace"
    >
      L
    </text>

    <!-- ================================================= -->
    <!-- ICSP HEADER                                       -->
    <!-- ================================================= -->

    <rect
      x="205"
      y="78"
      width="20"
      height="28"
      rx="2"
      fill="#164c75"
      stroke="#0d304c"
    />

    <circle cx="210" cy="84" r="2.5"
      fill="#111" stroke="#aaa"/>

    <circle cx="220" cy="84" r="2.5"
      fill="#111" stroke="#aaa"/>

    <circle cx="210" cy="92" r="2.5"
      fill="#111" stroke="#aaa"/>

    <circle cx="220" cy="92" r="2.5"
      fill="#111" stroke="#aaa"/>

    <circle cx="210" cy="100" r="2.5"
      fill="#111" stroke="#aaa"/>

    <circle cx="220" cy="100" r="2.5"
      fill="#111" stroke="#aaa"/>

    <text
      x="215"
      y="112"
      text-anchor="middle"
      fill="#dff4ff"
      font-size="3"
      font-family="monospace"
    >
      ICSP
    </text>

    <!-- ================================================= -->
    <!-- ARDUINO LOGO                                      -->
    <!-- ================================================= -->

    <circle
      cx="120"
      cy="42"
      r="12"
      fill="none"
      stroke="#d8f1ff"
      stroke-width="2"
    />

    <text
      x="120"
      y="46"
      text-anchor="middle"
      fill="#d8f1ff"
      font-size="10"
      font-family="Arial"
      font-weight="bold"
    >
      −+
    </text>

    <text
      x="151"
      y="47"
      text-anchor="middle"
      fill="#e5f5ff"
      font-size="9"
      font-family="Arial"
      font-weight="bold"
    >
      UNO
    </text>

    <text
      x="151"
      y="58"
      text-anchor="middle"
      fill="#d7efff"
      font-size="5"
      font-family="Arial"
      font-weight="bold"
    >
      ARDUINO
    </text>

    <!-- ================================================= -->
    <!-- DC BARREL JACK                                    -->
    <!-- ================================================= -->

    <rect
      x="12" y="108"
      width="40"
      height="25"
      rx="5"
      fill="#252729"
      stroke="#111"
      stroke-width="1"
    />

    <circle
      cx="32"
      cy="120"
      r="9"
      fill="#111"
      stroke="#555"
      stroke-width="1"
    />

    <circle
      cx="32"
      cy="120"
      r="4"
      fill="#555"
    />

    <!-- ================================================= -->
    <!-- BOARD SILK TEXT                                   -->
    <!-- ================================================= -->

    <text
      x="125"
      y="68"
      fill="#d7efff"
      font-size="3.5"
      font-family="monospace"
    >
      DIGITAL (PWM~)
    </text>

    <text
      x="135"
      y="128"
      fill="#d7efff"
      font-size="4"
      font-family="monospace"
    >
      POWER
    </text>

    <text
      x="190"
      y="128"
      fill="#d7efff"
      font-size="4"
      font-family="monospace"
    >
      ANALOG IN
    </text>

    <!-- ================================================= -->
    <!-- SMALL COMPONENTS                                  -->
    <!-- ================================================= -->

    <rect x="54" y="92" width="7" height="4"
      rx="1" fill="#d7d3b4"/>

    <rect x="67" y="92" width="7" height="4"
      rx="1" fill="#d7d3b4"/>

    <rect x="82" y="92" width="7" height="4"
      rx="1" fill="#d7d3b4"/>

    <rect x="90" y="96" width="7" height="4"
      rx="1" fill="#d7d3b4"/>

  `,

  pins: [

    // =================================================
    // DIGITAL HEADER
    // =================================================

    {
      id: 'D0',
      x: 105,
      y: 0,
      type: 'digital',
      label: 'D0/RX',
      gpio: 0,
      uart: 'RX'
    },

    {
      id: 'D1',
      x: 115,
      y: 0,
      type: 'digital',
      label: 'D1/TX',
      gpio: 1,
      uart: 'TX'
    },

    {
      id: 'D2',
      x: 125,
      y: 0,
      type: 'digital',
      label: 'D2',
      gpio: 2,
      interrupt: true
    },

    {
      id: 'D3',
      x: 135,
      y: 0,
      type: 'digital',
      label: 'D3~',
      gpio: 3,
      pwm: true,
      interrupt: true
    },

    {
      id: 'D4',
      x: 145,
      y: 0,
      type: 'digital',
      label: 'D4',
      gpio: 4
    },

    {
      id: 'D5',
      x: 155,
      y: 0,
      type: 'digital',
      label: 'D5~',
      gpio: 5,
      pwm: true
    },

    {
      id: 'D6',
      x: 165,
      y: 0,
      type: 'digital',
      label: 'D6~',
      gpio: 6,
      pwm: true
    },

    {
      id: 'D7',
      x: 175,
      y: 0,
      type: 'digital',
      label: 'D7',
      gpio: 7
    },

    {
      id: 'D8',
      x: 185,
      y: 0,
      type: 'digital',
      label: 'D8',
      gpio: 8
    },

    {
      id: 'D9',
      x: 195,
      y: 0,
      type: 'digital',
      label: 'D9~',
      gpio: 9,
      pwm: true
    },

    {
      id: 'D10',
      x: 205,
      y: 0,
      type: 'digital',
      label: 'D10~',
      gpio: 10,
      pwm: true,
      spi: 'SS'
    },

    {
      id: 'D11',
      x: 215,
      y: 0,
      type: 'digital',
      label: 'D11~',
      gpio: 11,
      pwm: true,
      spi: 'MOSI'
    },

    {
      id: 'D12',
      x: 225,
      y: 0,
      type: 'digital',
      label: 'D12',
      gpio: 12,
      spi: 'MISO'
    },

    {
      id: 'D13',
      x: 235,
      y: 0,
      type: 'digital',
      label: 'D13~',
      gpio: 13,
      pwm: true,
      spi: 'SCK',
      builtin_led: true
    },


    // =================================================
    // POWER HEADER
    // =================================================

    {
      id: 'IOREF',
      x: 65,
      y: 150,
      type: 'power',
      label: 'IOREF'
    },

    {
      id: 'RESET',
      x: 75,
      y: 150,
      type: 'reset',
      label: 'RESET'
    },

    {
      id: '3V3',
      x: 85,
      y: 150,
      type: 'power',
      label: '3.3V',
      voltage: 3.3
    },

    {
      id: '5V',
      x: 95,
      y: 150,
      type: 'power',
      label: '5V',
      voltage: 5
    },

    {
      id: 'GND1',
      x: 105,
      y: 150,
      type: 'gnd',
      label: 'GND'
    },

    {
      id: 'GND2',
      x: 115,
      y: 150,
      type: 'gnd',
      label: 'GND'
    },

    {
      id: 'VIN',
      x: 125,
      y: 150,
      type: 'power',
      label: 'VIN'
    },


    // =================================================
    // ANALOG HEADER
    // =================================================

    {
      id: 'A0',
      x: 150,
      y: 150,
      type: 'analog',
      label: 'A0',
      analog: true,
      adc: 0
    },

    {
      id: 'A1',
      x: 160,
      y: 150,
      type: 'analog',
      label: 'A1',
      analog: true,
      adc: 1
    },

    {
      id: 'A2',
      x: 170,
      y: 150,
      type: 'analog',
      label: 'A2',
      analog: true,
      adc: 2
    },

    {
      id: 'A3',
      x: 180,
      y: 150,
      type: 'analog',
      label: 'A3',
      analog: true,
      adc: 3
    },

    {
      id: 'A4',
      x: 190,
      y: 150,
      type: 'analog',
      label: 'A4/SDA',
      analog: true,
      adc: 4,
      i2c: 'SDA'
    },

    {
      id: 'A5',
      x: 200,
      y: 150,
      type: 'analog',
      label: 'A5/SCL',
      analog: true,
      adc: 5,
      i2c: 'SCL'
    },


    // =================================================
    // AREF
    // =================================================

    {
      id: 'AREF',
      x: 75,
      y: 0,
      type: 'analog',
      label: 'AREF'
    }
  ],


  defaults: {
    label: 'Arduino UNO R3'
  },


  props: [
    {
      key: 'label',
      label: 'Label',
      type: 'text'
    }
  ],


  simulate(state, inputs) {

    return {
      digital: {},
      analog: {},
      pwm: {},
      serial: {},
      spi: {},
      i2c: {},
      power: {}
    };

  }
},

  arduino_nano: {
  id: 'arduino_nano',
  label: 'Arduino Nano',
  category: 'Controllers',
  desc: 'ATmega328P, 8-bit MCU, 22 I/O, Mini-USB',
  w: 80,
  h: 220,

  svg: `
    <!-- ================= PCB ================= -->

    <rect
      x="5" y="4"
      width="70" height="212"
      rx="4"
      fill="#1455a0"
      stroke="#0b3568"
      stroke-width="1.5"
    />

    <!-- PCB inner surface -->
    <rect
      x="8" y="7"
      width="64" height="206"
      rx="2"
      fill="#185ca8"
    />

    <!-- ================= MOUNTING HOLES ================= -->

    <circle cx="10" cy="10" r="4.5"
            fill="#111" stroke="#aaa" stroke-width=".7"/>

    <circle cx="70" cy="10" r="4.5"
            fill="#111" stroke="#aaa" stroke-width=".7"/>

    <circle cx="10" cy="210" r="4.5"
            fill="#111" stroke="#aaa" stroke-width=".7"/>

    <circle cx="70" cy="210" r="4.5"
            fill="#111" stroke="#aaa" stroke-width=".7"/>


    <!-- ================= ICSP HEADER ================= -->

    <rect
      x="25" y="7"
      width="30" height="25"
      rx="2"
      fill="#174d91"
      stroke="#0d376c"
      stroke-width=".7"
    />

    <!-- ICSP holes -->
    <circle cx="31" cy="14" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>

    <circle cx="40" cy="14" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>

    <circle cx="49" cy="14" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>

    <circle cx="31" cy="25" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>

    <circle cx="40" cy="25" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>

    <circle cx="49" cy="25" r="3"
            fill="#0a0a0a"
            stroke="#aaa"
            stroke-width=".5"/>


    <!-- ================= POWER / SERIAL AREA ================= -->

    <text
      x="39"
      y="39"
      text-anchor="middle"
      fill="#dcecff"
      font-size="3.8"
      font-family="monospace"
      font-weight="bold"
    >
      RX   TX   PWR
    </text>

    <!-- Resistors -->
    <rect x="27" y="43" width="6" height="15"
          rx="1" fill="#d6d5bd" stroke="#777"/>

    <rect x="36" y="43" width="6" height="15"
          rx="1" fill="#d6d5bd" stroke="#777"/>

    <rect x="45" y="43" width="6" height="15"
          rx="1" fill="#d6d5bd" stroke="#777"/>

    <!-- resistor markings -->
    <text x="30" y="53"
          text-anchor="middle"
          fill="#555"
          font-size="2.4"
          font-family="monospace">
      1K
    </text>

    <text x="39" y="53"
          text-anchor="middle"
          fill="#555"
          font-size="2.4"
          font-family="monospace">
      1K
    </text>

    <text x="48" y="53"
          text-anchor="middle"
          fill="#555"
          font-size="2.4"
          font-family="monospace">
      1K
    </text>


    <!-- ================= RESET BUTTON ================= -->

    <rect
      x="31" y="62"
      width="18"
      height="10"
      rx="2"
      fill="#bbb"
      stroke="#777"
      stroke-width=".7"
    />

    <rect
      x="34" y="64"
      width="12"
      height="6"
      rx="1"
      fill="#d0d0d0"
    />


    <!-- ================= POWER LED ================= -->

    <circle cx="53" cy="66" r="2.3"
            fill="#19e619"
            stroke="#0c770c"
            stroke-width=".5"/>


    <!-- ================= ATMEGA328P ================= -->

    <!-- IC body -->
    <rect
      x="22" y="76"
      width="36" height="43"
      rx="2"
      fill="#202124"
      stroke="#090909"
      stroke-width="1"
      transform="rotate(45 40 97.5)"
    />

    <!-- Simplified chip body -->
    <polygon
      points="
        40,72
        57,89
        57,106
        40,123
        23,106
        23,89
      "
      fill="#292a2c"
      stroke="#111"
      stroke-width="1"
    />

    <!-- ATmega marking -->
    <text
      x="40"
      y="96"
      text-anchor="middle"
      fill="#777"
      font-size="4"
      font-family="monospace"
      transform="rotate(45 40 96)"
    >
      ATMEGA328P
    </text>

    <text
      x="40"
      y="103"
      text-anchor="middle"
      fill="#555"
      font-size="3"
      font-family="monospace"
      transform="rotate(45 40 103)"
    >
      AU
    </text>


    <!-- ================= CRYSTAL ================= -->

    <rect
      x="27" y="124"
      width="12" height="8"
      rx="1"
      fill="#bfc0bd"
      stroke="#777"
    />

    <text
      x="33"
      y="130"
      text-anchor="middle"
      fill="#666"
      font-size="2.5"
      font-family="monospace"
    >
      16M
    </text>


    <!-- ================= SMALL COMPONENTS ================= -->

    <rect x="44" y="124" width="8" height="5"
          rx="1" fill="#d3d2b8"/>

    <rect x="44" y="132" width="8" height="5"
          rx="1" fill="#d3d2b8"/>

    <rect x="26" y="137" width="9" height="5"
          rx="1" fill="#d3d2b8"/>


    <!-- ================= USB SECTION ================= -->

    <rect
      x="27" y="169"
      width="26"
      height="31"
      rx="2"
      fill="#aaa"
      stroke="#666"
      stroke-width="1"
    />

    <!-- USB metal -->
    <rect
      x="30" y="172"
      width="20"
      height="25"
      rx="2"
      fill="#777"
    />

    <!-- USB inner opening -->
    <rect
      x="33" y="175"
      width="14"
      height="19"
      rx="1"
      fill="#17191a"
    />

    <!-- USB contacts -->
    <rect x="35" y="176" width="10" height="2"
          fill="#c9b56c"/>

    <rect x="35" y="179" width="10" height="2"
          fill="#c9b56c"/>

    <rect x="35" y="182" width="10" height="2"
          fill="#c9b56c"/>


    <!-- ================= BOARD TEXT ================= -->

    <text
      x="40"
      y="151"
      text-anchor="middle"
      fill="#d8eaff"
      font-size="5"
      font-family="Arial, sans-serif"
      font-weight="bold"
    >
      NANO
    </text>

    <text
      x="40"
      y="158"
      text-anchor="middle"
      fill="#a8c8e8"
      font-size="3"
      font-family="monospace"
    >
      ATmega328P
    </text>


    <!-- ================= PIN NUMBERS / SILK ================= -->

    <text x="17" y="78"
          fill="#dcecff"
          font-size="3"
          font-family="monospace">
      TX1
    </text>

    <text x="17" y="88"
          fill="#dcecff"
          font-size="3"
          font-family="monospace">
      RX0
    </text>

    <text x="17" y="98"
          fill="#dcecff"
          font-size="3"
          font-family="monospace">
      D2
    </text>

    <text x="17" y="108"
          fill="#dcecff"
          font-size="3"
          font-family="monospace">
      D3
    </text>
  `,

  pins: [

    // ================= LEFT SIDE =================

    { id:'TX1', x:0, y:38,  type:'digital', label:'TX1', gpio:1 },

    { id:'RX0', x:0, y:48,  type:'digital', label:'RX0', gpio:0 },

    { id:'RST', x:0, y:58,  type:'reset',   label:'RST' },

    { id:'GND', x:0, y:68,  type:'gnd',     label:'GND' },

    { id:'D2',  x:0, y:78,  type:'digital', label:'D2',  gpio:2 },

    { id:'D3',  x:0, y:88,  type:'digital', label:'D3',  gpio:3, pwm:true, interrupt:true },

    { id:'D4',  x:0, y:98,  type:'digital', label:'D4',  gpio:4 },

    { id:'D5',  x:0, y:108, type:'digital', label:'D5',  gpio:5, pwm:true },

    { id:'D6',  x:0, y:118, type:'digital', label:'D6',  gpio:6, pwm:true },

    { id:'D7',  x:0, y:128, type:'digital', label:'D7',  gpio:7 },

    { id:'D8',  x:0, y:138, type:'digital', label:'D8',  gpio:8 },

    { id:'D9',  x:0, y:148, type:'digital', label:'D9',  gpio:9, pwm:true },

    { id:'D10', x:0, y:158, type:'digital', label:'D10', gpio:10, pwm:true, spi:'SS' },

    { id:'D11', x:0, y:168, type:'digital', label:'D11', gpio:11, pwm:true, spi:'MOSI' },

    { id:'D12', x:0, y:178, type:'digital', label:'D12', gpio:12, spi:'MISO' },

    { id:'D13', x:0, y:188, type:'digital', label:'D13', gpio:13, pwm:true, spi:'SCK', builtin_led:true },


    // ================= RIGHT SIDE =================

    { id:'VIN', x:80, y:38,  type:'power',   label:'VIN' },

    { id:'GND2', x:80, y:48, type:'gnd',      label:'GND' },

    { id:'RST2', x:80, y:58, type:'reset',    label:'RST' },

    { id:'5V', x:80, y:68,   type:'power',    label:'5V' },

    { id:'A7', x:80, y:78,   type:'analog',   label:'A7',  analog:true },

    { id:'A6', x:80, y:88,   type:'analog',   label:'A6',  analog:true },

    { id:'A5', x:80, y:98,   type:'analog',   label:'A5',  gpio:19, i2c:'SCL', analog:true },

    { id:'A4', x:80, y:108,  type:'analog',   label:'A4',  gpio:18, i2c:'SDA', analog:true },

    { id:'A3', x:80, y:118,  type:'analog',   label:'A3',  analog:true },

    { id:'A2', x:80, y:128,  type:'analog',   label:'A2',  analog:true },

    { id:'A1', x:80, y:138,  type:'analog',   label:'A1',  analog:true },

    { id:'A0', x:80, y:148,  type:'analog',   label:'A0',  analog:true },

    { id:'AREF', x:80, y:158, type:'analog', label:'REF' },

    { id:'3V3', x:80, y:168, type:'power',   label:'3.3V' },

    { id:'RST3', x:80, y:178, type:'reset',  label:'RST' }
  ],

  defaults: {
    label: 'Arduino Nano'
  },

  props: [
    {
      key: 'label',
      label: 'Label',
      type: 'text'
    }
  ],

  simulate(state, inputs) {

    return {
      digital: {},
      analog: {},
      pwm: {},
      serial: {},
      i2c: {},
      spi: {}
    };

  }
},

  esp32: {
  id: 'esp32',
  label: 'ESP32 Dev Module',
  category: 'Controllers',
  desc: 'ESP32 WiFi + Bluetooth development board, 30 GPIO',
  w: 100,
  h: 220,

  svg: `
    <!-- ================= BOARD ================= -->

    <!-- PCB -->
    <rect
      x="4" y="4"
      width="92" height="212"
      rx="5"
      fill="#15191b"
      stroke="#34383a"
      stroke-width="1.5"
    />

    <!-- PCB inner surface -->
    <rect
      x="7" y="7"
      width="86" height="206"
      rx="3"
      fill="#1c2022"
    />

    <!-- ================= ANTENNA ================= -->

    <!-- Antenna area -->
    <rect
      x="15" y="6"
      width="70" height="25"
      rx="2"
      fill="#111315"
    />

    <!-- Antenna trace -->
    <path
      d="
        M22 8
        V19
        H30
        V8
        M36 8
        V19
        H44
        V8
        M50 8
        V19
        H58
        V8
        M64 8
        V19
        H72
        V8
      "
      fill="none"
      stroke="#292d2f"
      stroke-width="1.4"
    />

    <!-- ================= ESP32 RF MODULE ================= -->

    <!-- Metal shield -->
    <rect
      x="18" y="27"
      width="64" height="48"
      rx="3"
      fill="#9b9b9b"
      stroke="#666"
      stroke-width="1"
    />

    <!-- Shield highlight -->
    <rect
      x="20" y="29"
      width="60" height="44"
      rx="2"
      fill="#a9a9a9"
    />

    <!-- Shield gradient-like detail -->
    <rect
      x="22" y="31"
      width="56"
      height="40"
      rx="2"
      fill="#999"
    />

    <!-- ESP-32 text -->
    <text
      x="50"
      y="49"
      text-anchor="middle"
      fill="#e2e2e2"
      font-size="7"
      font-family="Arial, sans-serif"
      font-weight="bold"
    >
      ESP-32
    </text>

    <!-- WiFi / BT text -->
    <text
      x="50"
      y="59"
      text-anchor="middle"
      fill="#555"
      font-size="3.5"
      font-family="Arial, sans-serif"
    >
      WiFi  Bluetooth
    </text>

    <!-- FCC marks -->
    <text
      x="50"
      y="67"
      text-anchor="middle"
      fill="#555"
      font-size="3.2"
      font-family="Arial, sans-serif"
    >
      WiFi + BT
    </text>

    <!-- ================= COMPONENT AREA ================= -->

    <!-- Left resistors -->
    <rect x="17" y="82" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="17" y="91" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="17" y="100" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="17" y="109" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>

    <!-- Right resistors -->
    <rect x="67" y="82" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="67" y="91" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="67" y="100" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>
    <rect x="67" y="109" width="16" height="5" rx="1"
          fill="#b8b8a5" stroke="#555" stroke-width=".5"/>

    <!-- Small capacitors -->
    <rect x="37" y="82" width="7" height="6" rx="1"
          fill="#c7c7a8" stroke="#666"/>
    <rect x="56" y="82" width="7" height="6" rx="1"
          fill="#c7c7a8" stroke="#666"/>

    <rect x="37" y="94" width="7" height="6" rx="1"
          fill="#c7c7a8" stroke="#666"/>
    <rect x="56" y="94" width="7" height="6" rx="1"
          fill="#c7c7a8" stroke="#666"/>

    <!-- ================= VOLTAGE REGULATOR ================= -->

    <rect
      x="36" y="108"
      width="16"
      height="22"
      rx="2"
      fill="#242729"
      stroke="#444"
      stroke-width=".7"
    />

    <text
      x="44"
      y="121"
      text-anchor="middle"
      fill="#777"
      font-size="3"
      font-family="monospace"
    >
      3.3V
    </text>

    <!-- ================= CP2102 USB IC ================= -->

    <rect
      x="54" y="108"
      width="28"
      height="28"
      rx="2"
      fill="#0b0d0e"
      stroke="#333"
      stroke-width=".7"
    />

    <!-- IC pins -->
    <g stroke="#666" stroke-width=".6">
      <path d="M57 108V104"/>
      <path d="M61 108V104"/>
      <path d="M65 108V104"/>
      <path d="M69 108V104"/>
      <path d="M73 108V104"/>
      <path d="M77 108V104"/>

      <path d="M57 136V140"/>
      <path d="M61 136V140"/>
      <path d="M65 136V140"/>
      <path d="M69 136V140"/>
      <path d="M73 136V140"/>
      <path d="M77 136V140"/>
    </g>

    <text
      x="68"
      y="123"
      text-anchor="middle"
      fill="#555"
      font-size="4"
      font-family="monospace"
    >
      CP2102
    </text>

    <!-- ================= STATUS COMPONENTS ================= -->

    <!-- Power LED -->
    <rect
      x="35" y="144"
      width="9" height="5"
      rx="1"
      fill="#d7d7b8"
    />

    <!-- TX/RX LEDs -->
    <rect
      x="48" y="144"
      width="9" height="5"
      rx="1"
      fill="#d7d7b8"
    />

    <!-- ================= USB CONNECTOR ================= -->

    <rect
      x="30" y="184"
      width="40" height="25"
      rx="2"
      fill="#bfc1c2"
      stroke="#777"
      stroke-width="1"
    />

    <!-- USB opening -->
    <rect
      x="35" y="187"
      width="30" height="17"
      rx="2"
      fill="#777"
    />

    <rect
      x="38" y="189"
      width="24" height="12"
      rx="1"
      fill="#1b1d1e"
    />

    <!-- ================= RESET / BOOT BUTTONS ================= -->

    <!-- EN / RESET -->
    <circle
      cx="15"
      cy="190"
      r="6"
      fill="#1d2021"
      stroke="#444"
    />

    <circle
      cx="15"
      cy="190"
      r="3"
      fill="#555"
    />

    <!-- BOOT -->
    <circle
      cx="85"
      cy="190"
      r="6"
      fill="#1d2021"
      stroke="#444"
    />

    <circle
      cx="85"
      cy="190"
      r="3"
      fill="#555"
    />

    <!-- ================= MOUNTING HOLES ================= -->

    <circle cx="10" cy="10" r="5" fill="#050607"/>
    <circle cx="90" cy="10" r="5" fill="#050607"/>
    <circle cx="10" cy="210" r="5" fill="#050607"/>
    <circle cx="90" cy="210" r="5" fill="#050607"/>

    <!-- ================= PIN LABEL AREA ================= -->

    <text x="7" y="35"
          fill="#ddd"
          font-size="3.2"
          font-family="monospace">
      VIN
    </text>

    <text x="7" y="45"
          fill="#ddd"
          font-size="3.2"
          font-family="monospace">
      3V3
    </text>

    <!-- ================= BOARD LABEL ================= -->

    <text
      x="50"
      y="179"
      text-anchor="middle"
      fill="#777"
      font-size="4"
      font-family="monospace"
    >
      ESP32 DEV MODULE
    </text>
  `,

  pins: [
    // LEFT SIDE — exact board order
    { id:'D23', x:0, y:34,  type:'digital', label:'D23' },
    { id:'D22', x:0, y:44,  type:'digital', label:'D22' },
    { id:'TX0', x:0, y:54,  type:'digital', label:'TX0' },
    { id:'RX0', x:0, y:64,  type:'digital', label:'RX0' },
    { id:'D21', x:0, y:74,  type:'digital', label:'D21' },
    { id:'D19', x:0, y:84,  type:'digital', label:'D19' },
    { id:'D18', x:0, y:94,  type:'digital', label:'D18' },
    { id:'D5',  x:0, y:104, type:'digital', label:'D5' },
    { id:'D17', x:0, y:114, type:'digital', label:'TX2' },
    { id:'D16', x:0, y:124, type:'digital', label:'RX2' },
    { id:'D4',  x:0, y:134, type:'digital', label:'D4' },
    { id:'D2',  x:0, y:144, type:'digital', label:'D2' },
    { id:'D15', x:0, y:154, type:'digital', label:'D15' },
    { id:'GND', x:0, y:164, type:'gnd',     label:'GND' },
    { id:'3V3', x:0, y:174, type:'power',   label:'3V3' },
    { id:'VIN', x:0, y:184, type:'power',   label:'VIN' },

    // RIGHT SIDE
    { id:'D13', x:100, y:34,  type:'digital', label:'D13' },
    { id:'D12', x:100, y:44,  type:'digital', label:'D12' },
    { id:'D14', x:100, y:54,  type:'digital', label:'D14' },
    { id:'D27', x:100, y:64,  type:'digital', label:'D27' },
    { id:'D26', x:100, y:74,  type:'digital', label:'D26' },
    { id:'D25', x:100, y:84,  type:'digital', label:'D25' },
    { id:'D33', x:100, y:94,  type:'digital', label:'D33' },
    { id:'D32', x:100, y:104, type:'digital', label:'D32' },
    { id:'D35', x:100, y:114, type:'analog',  label:'D35' },
    { id:'D34', x:100, y:124, type:'analog',  label:'D34' },
    { id:'VN',  x:100, y:134, type:'analog',  label:'VN' },
    { id:'VP',  x:100, y:144, type:'analog',  label:'VP' },
    { id:'EN',  x:100, y:154, type:'digital', label:'EN' },
    { id:'D0',  x:100, y:164, type:'digital', label:'D0' },
    { id:'D1',  x:100, y:174, type:'digital', label:'TX0' },
    { id:'D3',  x:100, y:184, type:'digital', label:'RX0' }
  ],

  defaults: {
    label: 'ESP32'
  },

  props: [
    {
      key: 'label',
      label: 'Label',
      type: 'text'
    }
  ],

  simulate(state, inputs) {
    return {};
  }
},

  /* ════════════════════════════
     OUTPUTS
  ════════════════════════════ */
  led_red: {
    id:'led_red', label:'LED (Red)', category:'Outputs',
    desc:'Red LED, ~2V forward voltage',
    w:30, h:50,
    svg:`
      <!-- Body -->
      <ellipse cx="15" cy="20" rx="10" ry="14" fill="#cc0022" stroke="#ff1133" stroke-width="1"/>
      <!-- Flat side indicator -->
      <line x1="5" y1="28" x2="25" y2="28" stroke="#ff1133" stroke-width="1"/>
      <!-- Dome highlight -->
      <ellipse cx="11" cy="13" rx="4" ry="3" fill="rgba(255,255,255,0.25)"/>
      <!-- Leads -->
      <line x1="10" y1="34" x2="10" y2="50" stroke="#aaa" stroke-width="1.5"/>
      <line x1="20" y1="34" x2="20" y2="50" stroke="#aaa" stroke-width="1.5"/>
    `,
    pins:[
      { id:'anode',   x:10, y:50, type:'digital', label:'Anode (+)' },
      { id:'cathode', x:20, y:50, type:'gnd',     label:'Cathode (-)'},
    ],
    defaults:{ color:'#cc0022', brightness:1 },
    props:[
      { key:'color', label:'LED Color', type:'color' },
    ],
    simulate(state, inputs) {
      const on = inputs.anode && !inputs.cathode;
      return { on };
    }
  },

  led_green: {
    id:'led_green', label:'LED (Green)', category:'Outputs',
    desc:'Green LED, ~2.1V forward voltage',
    w:30, h:50,
    svg:`
      <ellipse cx="15" cy="20" rx="10" ry="14" fill="#00aa33" stroke="#00ff55" stroke-width="1"/>
      <line x1="5" y1="28" x2="25" y2="28" stroke="#00ff55" stroke-width="1"/>
      <ellipse cx="11" cy="13" rx="4" ry="3" fill="rgba(255,255,255,0.25)"/>
      <line x1="10" y1="34" x2="10" y2="50" stroke="#aaa" stroke-width="1.5"/>
      <line x1="20" y1="34" x2="20" y2="50" stroke="#aaa" stroke-width="1.5"/>
    `,
    pins:[
      { id:'anode',   x:10, y:50, type:'digital', label:'Anode (+)'  },
      { id:'cathode', x:20, y:50, type:'gnd',     label:'Cathode (-) '},
    ],
    defaults:{ color:'#00aa33' },
    props:[{ key:'color', label:'LED Color', type:'color' }],
    simulate(state, inputs) { return { on: inputs.anode && !inputs.cathode }; }
  },

  led_blue: {
    id:'led_blue', label:'LED (Blue)', category:'Outputs',
    desc:'Blue LED, ~3.2V forward voltage',
    w:30, h:50,
    svg:`
      <ellipse cx="15" cy="20" rx="10" ry="14" fill="#0044cc" stroke="#2266ff" stroke-width="1"/>
      <line x1="5" y1="28" x2="25" y2="28" stroke="#2266ff" stroke-width="1"/>
      <ellipse cx="11" cy="13" rx="4" ry="3" fill="rgba(255,255,255,0.25)"/>
      <line x1="10" y1="34" x2="10" y2="50" stroke="#aaa" stroke-width="1.5"/>
      <line x1="20" y1="34" x2="20" y2="50" stroke="#aaa" stroke-width="1.5"/>
    `,
    pins:[
      { id:'anode',   x:10, y:50, type:'digital', label:'Anode (+'  },
      { id:'cathode', x:20, y:50, type:'gnd',     label:'Cathode (-)'},
    ],
    defaults:{ color:'#0044cc' },
    props:[{ key:'color', label:'LED Color', type:'color' }],
    simulate(state, inputs) { return { on: inputs.anode && !inputs.cathode }; }
  },

  buzzer: {
    id:'buzzer', label:'Buzzer', category:'Outputs',
    desc:'Passive piezo buzzer',
    w:40, h:40,
    svg:`
      <circle cx="20" cy="20" r="16" fill="#333" stroke="#555" stroke-width="1"/>
      <circle cx="20" cy="20" r="10" fill="#222"/>
      <circle cx="20" cy="20" r="4"  fill="#444"/>
      <text x="20" y="24" text-anchor="middle" fill="#888" font-size="7" font-family="sans-serif">BUZZ</text>
      <line x1="10" y1="36" x2="10" y2="44" stroke="#aaa" stroke-width="1.5"/>
      <line x1="30" y1="36" x2="30" y2="44" stroke="#aaa" stroke-width="1.5"/>
    `,
    pins:[
      { id:'vcc', x:10, y:44, type:'power',  label:'+' },
      { id:'gnd', x:30, y:44, type:'gnd',    label:'-' },
    ],
    defaults:{ frequency:1000 },
    props:[{ key:'frequency', label:'Frequency (Hz)', type:'number', min:20, max:20000 }],
    simulate(state, inputs) { return { tone: inputs.vcc ? state.frequency : 0 }; }
  },

  /* ════════════════════════════
     INPUTS
  ════════════════════════════ */
  push_button: {
    id:'push_button', label:'Push Button', category:'Inputs',
    desc:'Tactile momentary push button',
    w:40, h:40,
    svg:`
      <!-- PCB pads -->
      <rect x="2"  y="2"  width="12" height="12" rx="1" fill="#1a6e1a"/>
      <rect x="26" y="2"  width="12" height="12" rx="1" fill="#1a6e1a"/>
      <rect x="2"  y="26" width="12" height="12" rx="1" fill="#1a6e1a"/>
      <rect x="26" y="26" width="12" height="12" rx="1" fill="#1a6e1a"/>
      <!-- Body -->
      <rect x="10" y="10" width="20" height="20" rx="2" fill="#555" stroke="#666" stroke-width="0.5"/>
      <!-- Button cap -->
      <circle cx="20" cy="20" r="7" fill="#cc3300" stroke="#dd4400" stroke-width="0.5"/>
      <!-- Legs -->
      <line x1="8"  y1="8"  x2="2"  y2="2"  stroke="#aaa" stroke-width="1"/>
      <line x1="32" y1="8"  x2="38" y2="2"  stroke="#aaa" stroke-width="1"/>
      <line x1="8"  y1="32" x2="2"  y2="38" stroke="#aaa" stroke-width="1"/>
      <line x1="32" y1="32" x2="38" y2="38" stroke="#aaa" stroke-width="1"/>
    `,
    pins:[
      { id:'A', x:0, y:0,  type:'digital', label:'A' },
      { id:'B', x:40, y:0, type:'digital', label:'B' },
    ],
    defaults:{ label:'BTN', pullup:true },
    props:[
      { key:'label',  label:'Label',   type:'text'   },
      { key:'pullup', label:'Pull-up', type:'select', options:['true','false'] },
    ],
    simulate(state, inputs) {
      return { pressed: !!state._pressed };
    }
  },

  potentiometer: {
    id:'potentiometer', label:'Potentiometer', category:'Inputs',
    desc:'Variable resistor 0–10kΩ',
    w:50, h:55,
    svg:`
      <rect x="5"  y="10" width="40" height="35" rx="3" fill="#555" stroke="#666" stroke-width="0.5"/>
      <circle cx="25" cy="27" r="12" fill="#333" stroke="#444" stroke-width="0.5"/>
      <circle cx="25" cy="27" r="6"  fill="#222"/>
      <line x1="25" y1="15" x2="25" y2="21" stroke="#aaa" stroke-width="2"/>
      <!-- Leads -->
      <line x1="10" y1="45" x2="10" y2="55" stroke="#aaa" stroke-width="1.5"/>
      <line x1="25" y1="45" x2="25" y2="55" stroke="#aaa" stroke-width="1.5"/>
      <line x1="40" y1="45" x2="40" y2="55" stroke="#aaa" stroke-width="1.5"/>
    `,
    pins:[
      { id:'vcc',  x:10, y:55, type:'power',  label:'VCC'    },
      { id:'wiper',x:25, y:55, type:'analog', label:'Wiper'  },
      { id:'gnd',  x:40, y:55, type:'gnd',    label:'GND'    },
    ],
    defaults:{ resistance:5000, maxR:10000 },
    props:[
      { key:'resistance', label:'Position (Ω)', type:'number', min:0, max:10000 },
    ],
    simulate(state, inputs) {
      const v = (state.resistance / state.maxR) * 5.0;
      return { voltage: v, raw: Math.round((v / 5.0) * 1023) };
    }
  },

  /* ════════════════════════════
     PASSIVES
  ════════════════════════════ */
  resistor: {
    id:'resistor', label:'Resistor', category:'Passives',
    desc:'Fixed value resistor',
    w:60, h:18,
    svg:`
      <!-- Leads -->
      <line x1="0"  y1="9" x2="12" y2="9" stroke="#aaa" stroke-width="1.5"/>
      <line x1="48" y1="9" x2="60" y2="9" stroke="#aaa" stroke-width="1.5"/>
      <!-- Body -->
      <rect x="12" y="3" width="36" height="12" rx="4" fill="#e8c88a" stroke="#c9a060" stroke-width="0.5"/>
      <!-- Bands (220Ω: red red brown gold) -->
      <rect x="18" y="3" width="3" height="12" fill="#cc0000" opacity="0.85"/>
      <rect x="23" y="3" width="3" height="12" fill="#cc0000" opacity="0.85"/>
      <rect x="28" y="3" width="3" height="12" fill="#663300" opacity="0.85"/>
      <rect x="38" y="3" width="3" height="12" fill="#ffcc00" opacity="0.85"/>
    `,
    pins:[
      { id:'p1', x:0,  y:9, type:'digital', label:'Pin 1' },
      { id:'p2', x:60, y:9, type:'digital', label:'Pin 2' },
    ],
    defaults:{ resistance:220 },
    props:[
      { key:'resistance', label:'Resistance (Ω)', type:'number', min:1, max:10000000 },
    ],
    simulate(state, inputs) { return {}; }
  },

  capacitor: {
    id:'capacitor', label:'Capacitor', category:'Passives',
    desc:'Electrolytic or ceramic capacitor',
    w:30, h:50,
    svg:`
      <!-- Leads -->
      <line x1="10" y1="0"  x2="10" y2="18" stroke="#aaa" stroke-width="1.5"/>
      <line x1="20" y1="0"  x2="20" y2="18" stroke="#aaa" stroke-width="1.5"/>
      <!-- Plates -->
      <line x1="4"  y1="18" x2="16" y2="18" stroke="#aaa" stroke-width="2"/>
      <line x1="14" y1="22" x2="26" y2="22" stroke="#aaa" stroke-width="2"/>
      <line x1="14" y1="22" x2="14" y2="50" stroke="#aaa" stroke-width="1.5"/>
      <line x1="4"  y1="18" x2="4"  y2="50" stroke="#aaa" stroke-width="1.5"/>
      <!-- + symbol -->
      <text x="3" y="15" fill="#aaa" font-size="8">+</text>
    `,
    pins:[
      { id:'pos', x:4,  y:50, type:'power', label:'+' },
      { id:'neg', x:14, y:50, type:'gnd',   label:'-' },
    ],
    defaults:{ capacitance:100, unit:'µF' },
    props:[
      { key:'capacitance', label:'Capacitance', type:'number', min:1, max:100000 },
      { key:'unit', label:'Unit', type:'select', options:['pF','nF','µF'] },
    ],
    simulate(state, inputs) { return {}; }
  },
};

// Export as flat array for the palette renderer
window.LAB_COMPONENTS = EDUSIM_COMPONENTS;
