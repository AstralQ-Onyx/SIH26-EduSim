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
  esp32: {
    id: 'esp32',
    label: 'ESP32 Dev Module',
    category: 'Controllers',
    desc: 'ESP32 WiFi + Bluetooth development board, 30 GPIO',
    w: 100,
    h: 220,

    svg: `
    <!-- ================= BOARD ================= -->
    <defs>
      <linearGradient id="esp32PcbGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#24282b"/>
        <stop offset="0.55" stop-color="#111416"/>
        <stop offset="1" stop-color="#050607"/>
      </linearGradient>

      <linearGradient id="esp32MetalGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d0d0d0"/>
        <stop offset="0.35" stop-color="#9c9c9c"/>
        <stop offset="1" stop-color="#666"/>
      </linearGradient>

      <linearGradient id="esp32UsbGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d9d9d9"/>
        <stop offset="1" stop-color="#8b8b8b"/>
      </linearGradient>
    </defs>

    <!-- PCB -->
    <rect
      x="4" y="4"
      width="92" height="212"
      rx="6"
      fill="url(#esp32PcbGrad)"
      stroke="#25292b"
      stroke-width="1.4"
    />

    <!-- Inner board -->
    <rect
      x="7" y="7"
      width="86" height="206"
      rx="4"
      fill="none"
      stroke="#3b3f41"
      stroke-width=".8"
    />

    <!-- ================= MOUNTING HOLES ================= -->
    <g>
      <circle cx="10" cy="10" r="5.5" fill="#0a0b0c" stroke="#bcbcbc" stroke-width="1.4"/>
      <circle cx="90" cy="10" r="5.5" fill="#0a0b0c" stroke="#bcbcbc" stroke-width="1.4"/>
      <circle cx="10" cy="210" r="5.5" fill="#0a0b0c" stroke="#bcbcbc" stroke-width="1.4"/>
      <circle cx="90" cy="210" r="5.5" fill="#0a0b0c" stroke="#bcbcbc" stroke-width="1.4"/>
    </g>

    <!-- ================= ANTENNA ================= -->
    <rect
      x="23" y="8"
      width="54" height="17"
      rx="1.5"
      fill="#151718"
      stroke="#383b3d"
      stroke-width=".5"
    />

    <g fill="none" stroke="#c4c4c4" stroke-width="1.4">
      <path d="M28 10 H72"/>
      <path d="M31 13 H69"/>
      <path d="M34 16 H66"/>
    </g>

    <!-- ================= ESP-WROOM SHIELD ================= -->
    <rect
      x="20" y="24"
      width="60" height="76"
      rx="2.5"
      fill="url(#esp32MetalGrad)"
      stroke="#666"
      stroke-width=".8"
    />

    <rect
      x="23" y="27"
      width="54" height="70"
      rx="2"
      fill="#9a9a9a"
      stroke="#858585"
      stroke-width=".4"
    />

    <text
      x="50" y="45"
      text-anchor="middle"
      fill="#6d6d6d"
      font-size="4.8"
      font-family="Arial, sans-serif"
      font-weight="bold"
    >
      ESP-WROOM-32
    </text>

    <text
      x="50" y="53"
      text-anchor="middle"
      fill="#747474"
      font-size="3"
      font-family="Arial, sans-serif"
    >
      WiFi + Bluetooth
    </text>

    <text
      x="50" y="62"
      text-anchor="middle"
      fill="#747474"
      font-size="2.8"
      font-family="Arial, sans-serif"
    >
      CE  FCC
    </text>

    <!-- ================= HEADER PADS ================= -->
    <g fill="#bcbcbc" stroke="#555" stroke-width=".35">
      <!-- LEFT -->
      <rect x="4.5" y="32" width="6" height="4"/>
      <rect x="4.5" y="42" width="6" height="4"/>
      <rect x="4.5" y="52" width="6" height="4"/>
      <rect x="4.5" y="62" width="6" height="4"/>
      <rect x="4.5" y="72" width="6" height="4"/>
      <rect x="4.5" y="82" width="6" height="4"/>
      <rect x="4.5" y="92" width="6" height="4"/>
      <rect x="4.5" y="102" width="6" height="4"/>
      <rect x="4.5" y="112" width="6" height="4"/>
      <rect x="4.5" y="122" width="6" height="4"/>
      <rect x="4.5" y="132" width="6" height="4"/>
      <rect x="4.5" y="142" width="6" height="4"/>
      <rect x="4.5" y="152" width="6" height="4"/>
      <rect x="4.5" y="162" width="6" height="4"/>
      <rect x="4.5" y="172" width="6" height="4"/>

      <!-- RIGHT -->
      <rect x="89.5" y="32" width="6" height="4"/>
      <rect x="89.5" y="42" width="6" height="4"/>
      <rect x="89.5" y="52" width="6" height="4"/>
      <rect x="89.5" y="62" width="6" height="4"/>
      <rect x="89.5" y="72" width="6" height="4"/>
      <rect x="89.5" y="82" width="6" height="4"/>
      <rect x="89.5" y="92" width="6" height="4"/>
      <rect x="89.5" y="102" width="6" height="4"/>
      <rect x="89.5" y="112" width="6" height="4"/>
      <rect x="89.5" y="122" width="6" height="4"/>
      <rect x="89.5" y="132" width="6" height="4"/>
      <rect x="89.5" y="142" width="6" height="4"/>
      <rect x="89.5" y="152" width="6" height="4"/>
      <rect x="89.5" y="162" width="6" height="4"/>
      <rect x="89.5" y="172" width="6" height="4"/>
    </g>

    <!-- ================= BOARD PIN LABELS ================= -->
    <g fill="#e7e7e7" font-size="3" font-family="monospace">
      <!-- LEFT -->
      <text x="12" y="35">VIN</text>
      <text x="12" y="45">GND</text>
      <text x="12" y="55">GPIO13</text>
      <text x="12" y="65">GPIO12</text>
      <text x="12" y="75">GPIO14</text>
      <text x="12" y="85">GPIO27</text>
      <text x="12" y="95">GPIO26</text>
      <text x="12" y="105">GPIO25</text>
      <text x="12" y="115">GPIO33</text>
      <text x="12" y="125">GPIO32</text>
      <text x="12" y="135">GPIO35</text>
      <text x="12" y="145">GPIO34</text>
      <text x="12" y="155">GPIO39</text>
      <text x="12" y="165">GPIO36</text>
      <text x="12" y="175">EN</text>

      <!-- RIGHT -->
      <text x="88" y="35" text-anchor="end">3V3</text>
      <text x="88" y="45" text-anchor="end">GND</text>
      <text x="88" y="55" text-anchor="end">GPIO15</text>
      <text x="88" y="65" text-anchor="end">GPIO2</text>
      <text x="88" y="75" text-anchor="end">GPIO4</text>
      <text x="88" y="85" text-anchor="end">GPIO16</text>
      <text x="88" y="95" text-anchor="end">GPIO17</text>
      <text x="88" y="105" text-anchor="end">GPIO5</text>
      <text x="88" y="115" text-anchor="end">GPIO18</text>
      <text x="88" y="125" text-anchor="end">GPIO19</text>
      <text x="88" y="135" text-anchor="end">GPIO21</text>
      <text x="88" y="145" text-anchor="end">GPIO3</text>
      <text x="88" y="155" text-anchor="end">GPIO1</text>
      <text x="88" y="165" text-anchor="end">GPIO22</text>
      <text x="88" y="175" text-anchor="end">GPIO23</text>
    </g>

    <!-- ================= COMPONENT AREA ================= -->
    <g fill="#c9c6a4" stroke="#666" stroke-width=".35">
      <rect x="18" y="106" width="13" height="4" rx=".5"/>
      <rect x="18" y="113" width="13" height="4" rx=".5"/>
      <rect x="18" y="120" width="13" height="4" rx=".5"/>
      <rect x="18" y="127" width="13" height="4" rx=".5"/>

      <rect x="69" y="106" width="13" height="4" rx=".5"/>
      <rect x="69" y="113" width="13" height="4" rx=".5"/>
      <rect x="69" y="120" width="13" height="4" rx=".5"/>
      <rect x="69" y="127" width="13" height="4" rx=".5"/>

      <rect x="36" y="106" width="5" height="4" rx=".5"/>
      <rect x="46" y="106" width="5" height="4" rx=".5"/>
      <rect x="56" y="106" width="5" height="4" rx=".5"/>
    </g>

    <!-- ================= VOLTAGE REGULATOR ================= -->
    <rect
      x="27" y="136"
      width="16" height="20"
      rx="1.5"
      fill="#26292a"
      stroke="#555"
      stroke-width=".5"
    />

    <text
      x="35" y="148"
      text-anchor="middle"
      fill="#777"
      font-size="2.8"
      font-family="monospace"
    >
      3.3V
    </text>

    <!-- ================= CP2102 ================= -->
    <rect
      x="51" y="135"
      width="29" height="28"
      rx="1.5"
      fill="#0a0b0c"
      stroke="#444"
      stroke-width=".6"
    />

    <g stroke="#777" stroke-width=".45">
      <path d="M55 135V131"/>
      <path d="M60 135V131"/>
      <path d="M65 135V131"/>
      <path d="M70 135V131"/>
      <path d="M75 135V131"/>

      <path d="M55 163V167"/>
      <path d="M60 163V167"/>
      <path d="M65 163V167"/>
      <path d="M70 163V167"/>
      <path d="M75 163V167"/>
    </g>

    <text
      x="65.5" y="151"
      text-anchor="middle"
      fill="#666"
      font-size="3.5"
      font-family="monospace"
    >
      CP2102
    </text>

    <!-- ================= STATUS LEDs ================= -->
    <g fill="#ddd7a7" stroke="#666" stroke-width=".3">
      <rect x="29" y="166" width="8" height="4" rx=".5"/>
      <rect x="41" y="166" width="8" height="4" rx=".5"/>
      <rect x="53" y="166" width="8" height="4" rx=".5"/>
    </g>

    <!-- ================= RESET / BOOT BUTTONS ================= -->
    <g>
      <rect x="12" y="182" width="16" height="16" rx="2" fill="#2a2d2e" stroke="#666" stroke-width=".6"/>
      <circle cx="20" cy="190" r="4.5" fill="#555" stroke="#202020" stroke-width=".7"/>
      <text x="20" y="202" text-anchor="middle" fill="#d0d0d0" font-size="2.8" font-family="monospace">EN</text>

      <rect x="72" y="182" width="16" height="16" rx="2" fill="#2a2d2e" stroke="#666" stroke-width=".6"/>
      <circle cx="80" cy="190" r="4.5" fill="#555" stroke="#202020" stroke-width=".7"/>
      <text x="80" y="202" text-anchor="middle" fill="#d0d0d0" font-size="2.8" font-family="monospace">BOOT</text>
    </g>

    <!-- ================= USB CONNECTOR ================= -->
    <path
      d="M36 181 H64 Q68 181 68 185 V209 H32 V185 Q32 181 36 181Z"
      fill="url(#esp32UsbGrad)"
      stroke="#777"
      stroke-width=".8"
    />

    <rect
      x="36" y="188"
      width="28" height="15"
      rx="1.5"
      fill="#505050"
    />

    <rect
      x="39" y="191"
      width="22" height="9"
      rx="1"
      fill="#17191a"
    />

    <!-- ================= BOARD LABEL ================= -->
    <text
      x="50" y="177"
      text-anchor="middle"
      fill="#7f7f7f"
      font-size="3.2"
      font-family="monospace"
    >
      ESP32 DEV MODULE
    </text>
  `,

    pins: [
      // LEFT SIDE — Top to Bottom
      { id: 'VIN', x: 0, y: 34, type: 'power', label: 'VIN' },
      { id: 'GND1', x: 0, y: 44, type: 'gnd', label: 'GND' },
      { id: 'GPIO13', x: 0, y: 54, type: 'digital', label: 'GPIO13' },
      { id: 'GPIO12', x: 0, y: 64, type: 'digital', label: 'GPIO12' },
      { id: 'GPIO14', x: 0, y: 74, type: 'digital', label: 'GPIO14' },
      { id: 'GPIO27', x: 0, y: 84, type: 'digital', label: 'GPIO27' },
      { id: 'GPIO26', x: 0, y: 94, type: 'digital', label: 'GPIO26' },
      { id: 'GPIO25', x: 0, y: 104, type: 'digital', label: 'GPIO25' },
      { id: 'GPIO33', x: 0, y: 114, type: 'digital', label: 'GPIO33' },
      { id: 'GPIO32', x: 0, y: 124, type: 'digital', label: 'GPIO32' },
      { id: 'GPIO35', x: 0, y: 134, type: 'analog', label: 'GPIO35' },
      { id: 'GPIO34', x: 0, y: 144, type: 'analog', label: 'GPIO34' },
      { id: 'GPIO39', x: 0, y: 154, type: 'analog', label: 'GPIO39 / VN' },
      { id: 'GPIO36', x: 0, y: 164, type: 'analog', label: 'GPIO36 / VP' },
      { id: 'EN', x: 0, y: 174, type: 'digital', label: 'EN' },

      // RIGHT SIDE — Top to Bottom
      { id: '3V3', x: 100, y: 34, type: 'power', label: '3.3V' },
      { id: 'GND2', x: 100, y: 44, type: 'gnd', label: 'GND' },
      { id: 'GPIO15', x: 100, y: 54, type: 'digital', label: 'GPIO15' },
      { id: 'GPIO2', x: 100, y: 64, type: 'digital', label: 'GPIO2' },
      { id: 'GPIO4', x: 100, y: 74, type: 'digital', label: 'GPIO4' },
      { id: 'GPIO16', x: 100, y: 84, type: 'digital', label: 'GPIO16 / RX2' },
      { id: 'GPIO17', x: 100, y: 94, type: 'digital', label: 'GPIO17 / TX2' },
      { id: 'GPIO5', x: 100, y: 104, type: 'digital', label: 'GPIO5' },
      { id: 'GPIO18', x: 100, y: 114, type: 'digital', label: 'GPIO18' },
      { id: 'GPIO19', x: 100, y: 124, type: 'digital', label: 'GPIO19' },
      { id: 'GPIO21', x: 100, y: 134, type: 'digital', label: 'GPIO21' },
      { id: 'GPIO3', x: 100, y: 144, type: 'digital', label: 'GPIO3 / RX0' },
      { id: 'GPIO1', x: 100, y: 154, type: 'digital', label: 'GPIO1 / TX0' },
      { id: 'GPIO22', x: 100, y: 164, type: 'digital', label: 'GPIO22' },
      { id: 'GPIO23', x: 100, y: 174, type: 'digital', label: 'GPIO23' }
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
  esp8266: {
    id: 'esp8266',
    label: 'ESP8266 NodeMCU',
    category: 'Controllers',
    desc: 'ESP8266 NodeMCU development board with WiFi, 30-pin DevKit layout',
    w: 100,
    h: 220,

    svg: `
    <!-- ================= NODEMCU ESP8266 DEV BOARD ================= -->
    <defs>
      <linearGradient id="esp8266_board_grad" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#151818"/>
        <stop offset="0.55" stop-color="#0b0d0e"/>
        <stop offset="1" stop-color="#030404"/>
      </linearGradient>

      <linearGradient id="esp8266_shield_grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c8c3a3"/>
        <stop offset="0.45" stop-color="#9a957c"/>
        <stop offset="1" stop-color="#6f6b59"/>
      </linearGradient>

      <linearGradient id="esp8266_usb_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d5d5d5"/>
        <stop offset="1" stop-color="#8c8c8c"/>
      </linearGradient>

      <linearGradient id="esp8266_gold_grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d2b05c"/>
        <stop offset="1" stop-color="#8e6c25"/>
      </linearGradient>
    </defs>

    <!-- BOARD -->
    <rect x="4" y="3" width="92" height="214" rx="7"
          fill="url(#esp8266_board_grad)"
          stroke="#414446" stroke-width="1.4"/>

    <rect x="7" y="6" width="86" height="208" rx="5"
          fill="none" stroke="#252829" stroke-width=".6"/>

    <!-- MOUNTING HOLES -->
    <g>
      <circle cx="10" cy="10" r="5.2" fill="#f2f2f2"/>
      <circle cx="10" cy="10" r="3.2" fill="#151515"/>
      <circle cx="90" cy="10" r="5.2" fill="#f2f2f2"/>
      <circle cx="90" cy="10" r="3.2" fill="#151515"/>
      <circle cx="10" cy="210" r="5.2" fill="#f2f2f2"/>
      <circle cx="10" cy="210" r="3.2" fill="#151515"/>
      <circle cx="90" cy="210" r="5.2" fill="#f2f2f2"/>
      <circle cx="90" cy="210" r="3.2" fill="#151515"/>
    </g>

    <!-- ANTENNA AREA -->
    <rect x="23" y="5.5" width="54" height="25" rx="1.5"
          fill="#111313" stroke="#343737" stroke-width=".5"/>

    <!-- ANTENNA TRACE -->
    <path d="
      M28 7
      H36 V11 H42 V7
      H48 V11 H54 V7
      H60 V11 H66 V7
      H72
    "
    fill="none" stroke="#b08b39" stroke-width="2.4"
    stroke-linejoin="miter"/>

    <!-- ESP MODULE -->
    <rect x="23" y="31" width="54" height="70" rx="2"
          fill="url(#esp8266_shield_grad)"
          stroke="#5f5b4c" stroke-width=".8"/>

    <rect x="26" y="34" width="48" height="64" rx="1.2"
          fill="#9a957d" opacity=".72"/>

    <text x="50" y="49" text-anchor="middle"
          fill="#77715e" font-size="4.6"
          font-family="Arial, sans-serif" font-weight="bold">
      ESP-12E
    </text>

    <text x="50" y="56" text-anchor="middle"
          fill="#716c5a" font-size="2.8"
          font-family="Arial, sans-serif">
      ESP8266 WiFi
    </text>

    <text x="50" y="64" text-anchor="middle"
          fill="#716c5a" font-size="2.5"
          font-family="Arial, sans-serif">
      CE  FCC
    </text>

    <!-- SHIELD EDGE GOLD PADS -->
    <g fill="url(#esp8266_gold_grad)" stroke="#6e571f" stroke-width=".25">
      <rect x="20.5" y="37" width="3.5" height="5"/>
      <rect x="20.5" y="45" width="3.5" height="5"/>
      <rect x="20.5" y="53" width="3.5" height="5"/>
      <rect x="20.5" y="61" width="3.5" height="5"/>
      <rect x="20.5" y="69" width="3.5" height="5"/>
      <rect x="20.5" y="77" width="3.5" height="5"/>
      <rect x="20.5" y="85" width="3.5" height="5"/>

      <rect x="76" y="37" width="3.5" height="5"/>
      <rect x="76" y="45" width="3.5" height="5"/>
      <rect x="76" y="53" width="3.5" height="5"/>
      <rect x="76" y="61" width="3.5" height="5"/>
      <rect x="76" y="69" width="3.5" height="5"/>
      <rect x="76" y="77" width="3.5" height="5"/>
      <rect x="76" y="85" width="3.5" height="5"/>
    </g>

    <!-- LEFT/RIGHT PIN HEADER SOLDER POINTS -->
    <g fill="#c8c8b9" stroke="#4c4c4c" stroke-width=".35">
      <!-- left -->
      <circle cx="7.5" cy="34" r="1.8"/><circle cx="7.5" cy="44" r="1.8"/>
      <circle cx="7.5" cy="54" r="1.8"/><circle cx="7.5" cy="64" r="1.8"/>
      <circle cx="7.5" cy="74" r="1.8"/><circle cx="7.5" cy="84" r="1.8"/>
      <circle cx="7.5" cy="94" r="1.8"/><circle cx="7.5" cy="104" r="1.8"/>
      <circle cx="7.5" cy="114" r="1.8"/><circle cx="7.5" cy="124" r="1.8"/>
      <circle cx="7.5" cy="134" r="1.8"/><circle cx="7.5" cy="144" r="1.8"/>
      <circle cx="7.5" cy="154" r="1.8"/><circle cx="7.5" cy="164" r="1.8"/>
      <circle cx="7.5" cy="174" r="1.8"/>

      <!-- right -->
      <circle cx="92.5" cy="34" r="1.8"/><circle cx="92.5" cy="44" r="1.8"/>
      <circle cx="92.5" cy="54" r="1.8"/><circle cx="92.5" cy="64" r="1.8"/>
      <circle cx="92.5" cy="74" r="1.8"/><circle cx="92.5" cy="84" r="1.8"/>
      <circle cx="92.5" cy="94" r="1.8"/><circle cx="92.5" cy="104" r="1.8"/>
      <circle cx="92.5" cy="114" r="1.8"/><circle cx="92.5" cy="124" r="1.8"/>
      <circle cx="92.5" cy="134" r="1.8"/><circle cx="92.5" cy="144" r="1.8"/>
      <circle cx="92.5" cy="154" r="1.8"/><circle cx="92.5" cy="164" r="1.8"/>
      <circle cx="92.5" cy="174" r="1.8"/>
    </g>

    <!-- PIN LABELS -->
    <g fill="#d5d5d5" font-size="2.25" font-family="monospace">
      <!-- LEFT: NodeMCU 30-pin layout -->
      <text x="12" y="35">A0</text>
      <text x="12" y="45">RSV</text>
      <text x="12" y="55">RSV</text>
      <text x="12" y="65">SD3</text>
      <text x="12" y="75">SD2</text>
      <text x="12" y="85">SD1</text>
      <text x="12" y="95">CMD</text>
      <text x="12" y="105">SD0</text>
      <text x="12" y="115">CLK</text>
      <text x="12" y="125">GND</text>
      <text x="12" y="135">3V3</text>
      <text x="12" y="145">EN</text>
      <text x="12" y="155">RST</text>
      <text x="12" y="165">GND</text>
      <text x="12" y="175">VIN</text>

      <!-- RIGHT: NodeMCU user GPIO pins -->
      <text x="88" y="35" text-anchor="end">D0</text>
      <text x="88" y="45" text-anchor="end">D1</text>
      <text x="88" y="55" text-anchor="end">D2</text>
      <text x="88" y="65" text-anchor="end">D3</text>
      <text x="88" y="75" text-anchor="end">D4</text>
      <text x="88" y="85" text-anchor="end">3V3</text>
      <text x="88" y="95" text-anchor="end">GND</text>
      <text x="88" y="105" text-anchor="end">D5</text>
      <text x="88" y="115" text-anchor="end">D6</text>
      <text x="88" y="125" text-anchor="end">D7</text>
      <text x="88" y="135" text-anchor="end">D8</text>
      <text x="88" y="145" text-anchor="end">RX</text>
      <text x="88" y="155" text-anchor="end">TX</text>
      <text x="88" y="165" text-anchor="end">GND</text>
      <text x="88" y="175" text-anchor="end">3V3</text>
    </g>

    <!-- SMALL PASSIVES -->
    <g fill="#d8d3a4" stroke="#5b5b55" stroke-width=".28">
      <rect x="18" y="108" width="8" height="3.2" rx=".4"/>
      <rect x="28" y="108" width="8" height="3.2" rx=".4"/>
      <rect x="40" y="108" width="8" height="3.2" rx=".4"/>
      <rect x="52" y="108" width="8" height="3.2" rx=".4"/>
      <rect x="64" y="108" width="8" height="3.2" rx=".4"/>

      <rect x="18" y="115" width="8" height="3.2" rx=".4"/>
      <rect x="30" y="115" width="8" height="3.2" rx=".4"/>
      <rect x="42" y="115" width="8" height="3.2" rx=".4"/>
      <rect x="54" y="115" width="8" height="3.2" rx=".4"/>
      <rect x="66" y="115" width="8" height="3.2" rx=".4"/>
    </g>

    <!-- BLUE / BLACK POWER COMPONENTS -->
    <rect x="17" y="125" width="15" height="17" rx="1"
          fill="#172127" stroke="#4b5356" stroke-width=".5"/>
    <text x="24.5" y="135" text-anchor="middle"
          fill="#9aa5a7" font-size="2.4" font-family="monospace">
      1117
    </text>

    <!-- CP2102 / USB-UART -->
    <rect x="53" y="128" width="28" height="28" rx="1.5"
          fill="#080909" stroke="#454545" stroke-width=".6"/>

    <g stroke="#777" stroke-width=".35">
      <path d="M56 128V124"/><path d="M61 128V124"/>
      <path d="M66 128V124"/><path d="M71 128V124"/>
      <path d="M76 128V124"/>
      <path d="M56 156V160"/><path d="M61 156V160"/>
      <path d="M66 156V160"/><path d="M71 156V160"/>
      <path d="M76 156V160"/>
    </g>

    <text x="67" y="144" text-anchor="middle"
          fill="#5d5d5d" font-size="3.2" font-family="monospace">
      CP2102
    </text>

    <!-- STATUS COMPONENTS -->
    <g fill="#d2cc96" stroke="#5c5b50" stroke-width=".25">
      <rect x="22" y="148" width="7" height="3"/>
      <rect x="33" y="148" width="7" height="3"/>
      <rect x="44" y="148" width="7" height="3"/>
      <rect x="22" y="154" width="7" height="3"/>
      <rect x="33" y="154" width="7" height="3"/>
      <rect x="44" y="154" width="7" height="3"/>
    </g>

    <!-- SILKSCREEN / MARKINGS -->
    <g fill="#bfc2c2" font-size="2.1" font-family="monospace">
      <text x="17" y="162">RST</text>
      <text x="77" y="162">FLASH</text>
      <text x="50" y="169" text-anchor="middle">NODEMCU V1.0</text>
    </g>

    <!-- EN BUTTON -->
    <rect x="15" y="181" width="15" height="15" rx="2"
          fill="#353838" stroke="#646666" stroke-width=".5"/>
    <circle cx="22.5" cy="188.5" r="4"
            fill="#606262" stroke="#262626" stroke-width=".6"/>

    <!-- BOOT BUTTON -->
    <rect x="70" y="181" width="15" height="15" rx="2"
          fill="#353838" stroke="#646666" stroke-width=".5"/>
    <circle cx="77.5" cy="188.5" r="4"
            fill="#606262" stroke="#262626" stroke-width=".6"/>

    <!-- USB CONNECTOR -->
    <path d="M36 182 H64 Q68 182 68 186 V210 H32 V186 Q32 182 36 182Z"
          fill="url(#esp8266_usb_grad)"
          stroke="#777" stroke-width=".8"/>

    <rect x="35.5" y="190" width="29" height="14" rx="1.4"
          fill="#505050"/>
    <rect x="39" y="193" width="22" height="8" rx=".8"
          fill="#171818"/>

    <!-- CONNECTION CONTACT HINTS -->
    <g fill="#c9c9c9" opacity=".9">
      <circle cx="0" cy="34" r="1.5"/>
      <circle cx="0" cy="44" r="1.5"/>
      <circle cx="0" cy="54" r="1.5"/>
      <circle cx="0" cy="64" r="1.5"/>
      <circle cx="0" cy="74" r="1.5"/>
      <circle cx="0" cy="84" r="1.5"/>
      <circle cx="0" cy="94" r="1.5"/>
      <circle cx="0" cy="104" r="1.5"/>
      <circle cx="0" cy="114" r="1.5"/>
      <circle cx="0" cy="124" r="1.5"/>
      <circle cx="0" cy="134" r="1.5"/>
      <circle cx="0" cy="144" r="1.5"/>
      <circle cx="0" cy="154" r="1.5"/>
      <circle cx="0" cy="164" r="1.5"/>
      <circle cx="0" cy="174" r="1.5"/>

      <circle cx="100" cy="34" r="1.5"/>
      <circle cx="100" cy="44" r="1.5"/>
      <circle cx="100" cy="54" r="1.5"/>
      <circle cx="100" cy="64" r="1.5"/>
      <circle cx="100" cy="74" r="1.5"/>
      <circle cx="100" cy="84" r="1.5"/>
      <circle cx="100" cy="94" r="1.5"/>
      <circle cx="100" cy="104" r="1.5"/>
      <circle cx="100" cy="114" r="1.5"/>
      <circle cx="100" cy="124" r="1.5"/>
      <circle cx="100" cy="134" r="1.5"/>
      <circle cx="100" cy="144" r="1.5"/>
      <circle cx="100" cy="154" r="1.5"/>
      <circle cx="100" cy="164" r="1.5"/>
      <circle cx="100" cy="174" r="1.5"/>
    </g>
  `,

    pins: [
      // LEFT SIDE — Top to Bottom (NodeMCU 30-pin)
      { id: 'A0', x: 0, y: 34, type: 'analog', label: 'A0 / ADC0' },
      { id: 'RSV1', x: 0, y: 44, type: 'reserved', label: 'RSV' },
      { id: 'RSV2', x: 0, y: 54, type: 'reserved', label: 'RSV' },
      { id: 'SD3', x: 0, y: 64, type: 'digital', label: 'SD3 / GPIO10' },
      { id: 'SD2', x: 0, y: 74, type: 'digital', label: 'SD2 / GPIO9' },
      { id: 'SD1', x: 0, y: 84, type: 'digital', label: 'SD1 / GPIO8' },
      { id: 'CMD', x: 0, y: 94, type: 'digital', label: 'CMD / GPIO11' },
      { id: 'SD0', x: 0, y: 104, type: 'digital', label: 'SD0 / GPIO7' },
      { id: 'CLK', x: 0, y: 114, type: 'digital', label: 'CLK / GPIO6' },
      { id: 'GND1', x: 0, y: 124, type: 'gnd', label: 'GND' },
      { id: '3V3_1', x: 0, y: 134, type: 'power', label: '3.3V' },
      { id: 'EN', x: 0, y: 144, type: 'digital', label: 'EN / CH_PD' },
      { id: 'RST', x: 0, y: 154, type: 'digital', label: 'RST' },
      { id: 'GND2', x: 0, y: 164, type: 'gnd', label: 'GND' },
      { id: 'VIN', x: 0, y: 174, type: 'power', label: 'VIN' },

      // RIGHT SIDE — Top to Bottom
      { id: 'D0', gpio: 16, x: 100, y: 34, type: 'digital', label: 'D0 / GPIO16' },
      { id: 'D1', gpio: 5, x: 100, y: 44, type: 'digital', label: 'D1 / GPIO5 / SCL' },
      { id: 'D2', gpio: 4, x: 100, y: 54, type: 'digital', label: 'D2 / GPIO4 / SDA' },
      { id: 'D3', gpio: 0, x: 100, y: 64, type: 'digital', label: 'D3 / GPIO0' },
      { id: 'D4', gpio: 2, x: 100, y: 74, type: 'digital', label: 'D4 / GPIO2' },
      { id: '3V3_2', x: 100, y: 84, type: 'power', label: '3.3V' },
      { id: 'GND3', x: 100, y: 94, type: 'gnd', label: 'GND' },
      { id: 'D5', gpio: 14, x: 100, y: 104, type: 'digital', label: 'D5 / GPIO14 / SCLK' },
      { id: 'D6', gpio: 12, x: 100, y: 114, type: 'digital', label: 'D6 / GPIO12 / MISO' },
      { id: 'D7', gpio: 13, x: 100, y: 124, type: 'digital', label: 'D7 / GPIO13 / MOSI' },
      { id: 'D8', gpio: 15, x: 100, y: 134, type: 'digital', label: 'D8 / GPIO15 / CS' },
      { id: 'RX', gpio: 3, x: 100, y: 144, type: 'digital', label: 'RX / GPIO3' },
      { id: 'TX', gpio: 1, x: 100, y: 154, type: 'digital', label: 'TX / GPIO1' },
      { id: 'GND4', x: 100, y: 164, type: 'gnd', label: 'GND' },
      { id: '3V3_3', x: 100, y: 174, type: 'power', label: '3.3V' }
    ],

    defaults: {
      label: 'ESP8266'
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



  /* ════════════════════════════
     INPUTS


  /* ════════════════════════════
     PASSIVES
  ════════════════════════════ */

};

// Export as flat array for the palette renderer
window.LAB_COMPONENTS = EDUSIM_COMPONENTS;
