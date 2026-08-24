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
  arduinoUno: {
  id: 'arduinoUno',
  label: 'Arduino UNO R3',
  category: 'Controllers',
  desc: 'Arduino UNO R3 development board based on ATmega328P',
  w: 160,
  h: 120,

  svg: `
    <defs>
      <linearGradient id="unoBoardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1698d4"/>
        <stop offset="0.6" stop-color="#087eb7"/>
        <stop offset="1" stop-color="#05658f"/>
      </linearGradient>
      <linearGradient id="unoMetalGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d7d7d7"/>
        <stop offset="1" stop-color="#7f7f7f"/>
      </linearGradient>
    </defs>

    <!-- PCB -->
    <path
      d="M7 8 H145 Q152 8 152 15 V103 Q152 111 144 111 H18 Q10 111 10 103 V94 H5 V63 H10 V15 Q10 8 17 8 Z"
      fill="url(#unoBoardGrad)"
      stroke="#0a5778"
      stroke-width="1.2"
    />

    <!-- mounting holes -->
    <g fill="#f0f0f0" stroke="#8c8c8c" stroke-width=".8">
      <circle cx="16" cy="15" r="4.5"/>
      <circle cx="145" cy="15" r="4.5"/>
      <circle cx="18" cy="103" r="4.5"/>
      <circle cx="143" cy="103" r="4.5"/>
    </g>

    <!-- USB B connector -->
    <rect x="4" y="28" width="34" height="27" rx="1.5"
          fill="url(#unoMetalGrad)" stroke="#6a6a6a" stroke-width="1"/>
    <rect x="2" y="31" width="31" height="21" rx="1.2"
          fill="#5f5f5f"/>
    <rect x="3" y="33" width="27" height="17" rx="1"
          fill="#3d3d3d"/>

    <!-- DC barrel jack -->
    <rect x="5" y="79" width="28" height="20" rx="3"
          fill="#111" stroke="#454545" stroke-width="1"/>
    <circle cx="10" cy="89" r="6" fill="#262626"/>
    <rect x="2" y="83" width="10" height="13" rx="2" fill="#1a1a1a"/>

    <!-- Reset button -->
    <rect x="15" y="12" width="12" height="10" rx="1.5"
          fill="#d7d7d7" stroke="#777" stroke-width=".7"/>
    <circle cx="21" cy="17" r="3.5" fill="#b6653a"/>
    <text x="21" y="27" text-anchor="middle" fill="#e5e5e5"
          font-size="3" font-family="monospace">RESET</text>

    <!-- USB interface IC -->
    <rect x="42" y="41" width="14" height="13" rx="1"
          fill="#242424" stroke="#595959" stroke-width=".5"/>
    <g stroke="#bcbcbc" stroke-width=".4">
      <path d="M44 41V38"/><path d="M47 41V38"/><path d="M50 41V38"/><path d="M53 41V38"/>
      <path d="M44 54V57"/><path d="M47 54V57"/><path d="M50 54V57"/><path d="M53 54V57"/>
    </g>

    <!-- crystal -->
    <rect x="56" y="64" width="25" height="8" rx="2"
          fill="#c6c6c6" stroke="#727272" stroke-width=".6"/>
    <text x="68.5" y="69.5" text-anchor="middle" fill="#555"
          font-size="2.8" font-family="monospace">16.000</text>

    <!-- ATmega328P -->
    <rect x="82" y="63" width="56" height="18" rx="1.5"
          fill="#1c1c1c" stroke="#555" stroke-width=".7"/>
    <circle cx="87" cy="68" r="1.3" fill="#555"/>
    <text x="110" y="72" text-anchor="middle" fill="#7c7c7c"
          font-size="3.2" font-family="monospace">ATMEGA328P-PU</text>
    <g stroke="#b8b8b8" stroke-width=".45">
      <path d="M86 63V59"/><path d="M91 63V59"/><path d="M96 63V59"/><path d="M101 63V59"/>
      <path d="M106 63V59"/><path d="M111 63V59"/><path d="M116 63V59"/><path d="M121 63V59"/>
      <path d="M126 63V59"/><path d="M131 63V59"/>
      <path d="M86 81V85"/><path d="M91 81V85"/><path d="M96 81V85"/><path d="M101 81V85"/>
      <path d="M106 81V85"/><path d="M111 81V85"/><path d="M116 81V85"/><path d="M121 81V85"/>
      <path d="M126 81V85"/><path d="M131 81V85"/>
    </g>

    <!-- power regulation area -->
    <g>
      <rect x="42" y="79" width="11" height="10" rx="1"
            fill="#242424" stroke="#555" stroke-width=".5"/>
      <rect x="55" y="84" width="9" height="7" rx="1"
            fill="#242424" stroke="#555" stroke-width=".5"/>
      <circle cx="68" cy="88" r="6" fill="#c6c6c6" stroke="#666" stroke-width=".6"/>
      <circle cx="80" cy="88" r="6" fill="#c6c6c6" stroke="#666" stroke-width=".6"/>
      <text x="68" y="90" text-anchor="middle" fill="#555" font-size="2.3">47</text>
      <text x="80" y="90" text-anchor="middle" fill="#555" font-size="2.3">47</text>
    </g>

    <!-- TX/RX LEDs -->
    <g fill="#d6d0a0" stroke="#6c6a58" stroke-width=".3">
      <rect x="47" y="30" width="6" height="3" rx=".5"/>
      <rect x="47" y="35" width="6" height="3" rx=".5"/>
    </g>
    <text x="55" y="33" fill="#ececec" font-size="2.6" font-family="monospace">TX</text>
    <text x="55" y="38" fill="#ececec" font-size="2.6" font-family="monospace">RX</text>

    <!-- Arduino logo / board marking -->
    <circle cx="90" cy="33" r="8" fill="none" stroke="#f5f5f5" stroke-width="1.4"/>
    <path d="M84 33 H96 M87 30 L84 33 L87 36 M93 30 L96 33 L93 36"
          fill="none" stroke="#f5f5f5" stroke-width="1.2"/>
    <text x="104" y="36" fill="#fff" font-size="6.6" font-family="Arial, sans-serif">UNO</text>
    <text x="78" y="44" fill="#fff" font-size="4" font-family="Arial, sans-serif">ARDUINO</text>

    <!-- ICSP header -->
    <g fill="#252525" stroke="#707070" stroke-width=".5">
      <rect x="139" y="48" width="12" height="16" rx="1"/>
      <circle cx="143" cy="52" r="1.3" fill="#c6c6c6"/>
      <circle cx="148" cy="52" r="1.3" fill="#c6c6c6"/>
      <circle cx="143" cy="57" r="1.3" fill="#c6c6c6"/>
      <circle cx="148" cy="57" r="1.3" fill="#c6c6c6"/>
      <circle cx="143" cy="62" r="1.3" fill="#c6c6c6"/>
      <circle cx="148" cy="62" r="1.3" fill="#c6c6c6"/>
    </g>
    <text x="145" y="69" text-anchor="middle" fill="#e5e5e5"
          font-size="2.6" font-family="monospace">ICSP</text>

    <!-- top DIGITAL headers -->
    <g fill="#202020" stroke="#555" stroke-width=".5">
      <rect x="57" y="9" width="88" height="9" rx="1"/>
    </g>
    <g fill="#c9c9c9">
      <circle cx="62" cy="13.5" r="1.7"/><circle cx="69" cy="13.5" r="1.7"/>
      <circle cx="76" cy="13.5" r="1.7"/><circle cx="83" cy="13.5" r="1.7"/>
      <circle cx="90" cy="13.5" r="1.7"/><circle cx="97" cy="13.5" r="1.7"/>
      <circle cx="104" cy="13.5" r="1.7"/><circle cx="111" cy="13.5" r="1.7"/>
      <circle cx="118" cy="13.5" r="1.7"/><circle cx="125" cy="13.5" r="1.7"/>
      <circle cx="132" cy="13.5" r="1.7"/><circle cx="139" cy="13.5" r="1.7"/>
    </g>

    <text x="101" y="23" text-anchor="middle" fill="#fff"
          font-size="3.2" font-family="monospace">DIGITAL (PWM~)</text>

    <!-- digital pin labels -->
    <g fill="#e8e8e8" font-size="2.4" font-family="monospace">
      <text x="62" y="7" text-anchor="middle">13</text>
      <text x="69" y="7" text-anchor="middle">12</text>
      <text x="76" y="7" text-anchor="middle">11~</text>
      <text x="83" y="7" text-anchor="middle">10~</text>
      <text x="90" y="7" text-anchor="middle">9~</text>
      <text x="97" y="7" text-anchor="middle">8</text>
      <text x="104" y="7" text-anchor="middle">7</text>
      <text x="111" y="7" text-anchor="middle">6~</text>
      <text x="118" y="7" text-anchor="middle">5~</text>
      <text x="125" y="7" text-anchor="middle">4</text>
      <text x="132" y="7" text-anchor="middle">3~</text>
      <text x="139" y="7" text-anchor="middle">2</text>
    </g>

    <!-- bottom POWER + ANALOG headers -->
    <rect x="57" y="100" width="49" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>
    <rect x="111" y="100" width="36" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="61" cy="104.5" r="1.7"/><circle cx="68" cy="104.5" r="1.7"/>
      <circle cx="75" cy="104.5" r="1.7"/><circle cx="82" cy="104.5" r="1.7"/>
      <circle cx="89" cy="104.5" r="1.7"/><circle cx="96" cy="104.5" r="1.7"/>
      <circle cx="103" cy="104.5" r="1.7"/>
      <circle cx="115" cy="104.5" r="1.7"/><circle cx="121" cy="104.5" r="1.7"/>
      <circle cx="127" cy="104.5" r="1.7"/><circle cx="133" cy="104.5" r="1.7"/>
      <circle cx="139" cy="104.5" r="1.7"/><circle cx="145" cy="104.5" r="1.7"/>
    </g>

    <text x="81" y="97" text-anchor="middle" fill="#fff"
          font-size="3" font-family="monospace">POWER</text>
    <text x="129" y="97" text-anchor="middle" fill="#fff"
          font-size="3" font-family="monospace">ANALOG IN</text>

    <!-- bottom labels -->
    <g fill="#ececec" font-size="2.2" font-family="monospace">
      <text x="61" y="114" text-anchor="middle">IOREF</text>
      <text x="68" y="114" text-anchor="middle">RST</text>
      <text x="75" y="114" text-anchor="middle">3V3</text>
      <text x="82" y="114" text-anchor="middle">5V</text>
      <text x="89" y="114" text-anchor="middle">GND</text>
      <text x="96" y="114" text-anchor="middle">GND</text>
      <text x="103" y="114" text-anchor="middle">VIN</text>

      <text x="115" y="114" text-anchor="middle">A0</text>
      <text x="121" y="114" text-anchor="middle">A1</text>
      <text x="127" y="114" text-anchor="middle">A2</text>
      <text x="133" y="114" text-anchor="middle">A3</text>
      <text x="139" y="114" text-anchor="middle">A4</text>
      <text x="145" y="114" text-anchor="middle">A5</text>
    </g>

    <!-- simulator connection contact hints -->
    <g fill="#cfcfcf" opacity=".9">
      <!-- digital -->
      <circle cx="62" cy="0" r="1.5"/><circle cx="69" cy="0" r="1.5"/>
      <circle cx="76" cy="0" r="1.5"/><circle cx="83" cy="0" r="1.5"/>
      <circle cx="90" cy="0" r="1.5"/><circle cx="97" cy="0" r="1.5"/>
      <circle cx="104" cy="0" r="1.5"/><circle cx="111" cy="0" r="1.5"/>
      <circle cx="118" cy="0" r="1.5"/><circle cx="125" cy="0" r="1.5"/>
      <circle cx="132" cy="0" r="1.5"/><circle cx="139" cy="0" r="1.5"/>

      <!-- bottom -->
      <circle cx="61" cy="120" r="1.5"/><circle cx="68" cy="120" r="1.5"/>
      <circle cx="75" cy="120" r="1.5"/><circle cx="82" cy="120" r="1.5"/>
      <circle cx="89" cy="120" r="1.5"/><circle cx="96" cy="120" r="1.5"/>
      <circle cx="103" cy="120" r="1.5"/>
      <circle cx="115" cy="120" r="1.5"/><circle cx="121" cy="120" r="1.5"/>
      <circle cx="127" cy="120" r="1.5"/><circle cx="133" cy="120" r="1.5"/>
      <circle cx="139" cy="120" r="1.5"/><circle cx="145" cy="120" r="1.5"/>
    </g>
  `,

  pins: [
    // DIGITAL HEADER — left to right across top
    { id:'D13', x:62,  y:0,   type:'digital', label:'D13 / SCK' },
    { id:'D12', x:69,  y:0,   type:'digital', label:'D12 / MISO' },
    { id:'D11', x:76,  y:0,   type:'digital', label:'D11 / MOSI / PWM' },
    { id:'D10', x:83,  y:0,   type:'digital', label:'D10 / SS / PWM' },
    { id:'D9',  x:90,  y:0,   type:'digital', label:'D9 / PWM' },
    { id:'D8',  x:97,  y:0,   type:'digital', label:'D8' },
    { id:'D7',  x:104, y:0,   type:'digital', label:'D7' },
    { id:'D6',  x:111, y:0,   type:'digital', label:'D6 / PWM' },
    { id:'D5',  x:118, y:0,   type:'digital', label:'D5 / PWM' },
    { id:'D4',  x:125, y:0,   type:'digital', label:'D4' },
    { id:'D3',  x:132, y:0,   type:'digital', label:'D3 / PWM' },
    { id:'D2',  x:139, y:0,   type:'digital', label:'D2' },

    // POWER HEADER
    { id:'IOREF', x:61,  y:120, type:'power',   label:'IOREF' },
    { id:'RESET', x:68,  y:120, type:'digital', label:'RESET' },
    { id:'3V3',   x:75,  y:120, type:'power',   label:'3.3V' },
    { id:'5V',    x:82,  y:120, type:'power',   label:'5V' },
    { id:'GND1',  x:89,  y:120, type:'gnd',     label:'GND' },
    { id:'GND2',  x:96,  y:120, type:'gnd',     label:'GND' },
    { id:'VIN',   x:103, y:120, type:'power',   label:'VIN' },

    // ANALOG HEADER
    { id:'A0', x:115, y:120, type:'analog', label:'A0' },
    { id:'A1', x:121, y:120, type:'analog', label:'A1' },
    { id:'A2', x:127, y:120, type:'analog', label:'A2' },
    { id:'A3', x:133, y:120, type:'analog', label:'A3' },
    { id:'A4', x:139, y:120, type:'analog', label:'A4 / SDA' },
    { id:'A5', x:145, y:120, type:'analog', label:'A5 / SCL' }
  ],

  defaults: {
    label: 'Arduino UNO'
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
  arduinoMega: {
  id: 'arduinoMega',
  label: 'Arduino Mega 2560 R3',
  category: 'Controllers',
  desc: 'Arduino Mega 2560 R3 development board based on the ATmega2560',
  w: 210,
  h: 130,

  svg: `
    <defs>
      <linearGradient id="megaPcb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#20b8ae"/>
        <stop offset="0.55" stop-color="#109b95"/>
        <stop offset="1" stop-color="#087b78"/>
      </linearGradient>

      <linearGradient id="megaMetal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eeeeee"/>
        <stop offset="1" stop-color="#969696"/>
      </linearGradient>
    </defs>

    <!-- ================= PCB ================= -->
    <path
      d="M18 6 H191
         Q200 6 200 15
         V113
         Q200 123 190 123
         H24
         Q14 123 14 113
         V101
         H7
         V73
         H14
         V16
         Q14 6 24 6 Z"
      fill="url(#megaPcb)"
      stroke="#08706d"
      stroke-width="1.3"
    />

    <!-- ================= MOUNTING HOLES ================= -->
    <g fill="#f3f3f3" stroke="#888" stroke-width=".7">
      <circle cx="22" cy="14" r="4.5"/>
      <circle cx="190" cy="14" r="4.5"/>
      <circle cx="24" cy="115" r="4.5"/>
      <circle cx="190" cy="115" r="4.5"/>
      <circle cx="138" cy="61" r="4"/>
    </g>

    <!-- ================= USB-B CONNECTOR ================= -->
    <rect x="2" y="25" width="33" height="25" rx="1.5"
          fill="url(#megaMetal)" stroke="#6f6f6f" stroke-width="1"/>
    <rect x="2" y="28" width="28" height="19" rx="1"
          fill="#6a6a6a"/>
    <rect x="4" y="30" width="24" height="15" rx="1"
          fill="#444"/>

    <!-- ================= DC BARREL JACK ================= -->
    <rect x="8" y="88" width="31" height="20" rx="3"
          fill="#151515" stroke="#4a4a4a" stroke-width="1"/>
    <circle cx="12" cy="98" r="6.2" fill="#292929"/>
    <rect x="4" y="92" width="10" height="13" rx="2" fill="#1e1e1e"/>

    <!-- ================= RESET BUTTON ================= -->
    <rect x="18" y="12" width="13" height="11" rx="1.5"
          fill="#d9d9d9" stroke="#777" stroke-width=".7"/>
    <circle cx="24.5" cy="17.5" r="3.4" fill="#b96944"/>
    <text x="24.5" y="28" text-anchor="middle" fill="#f2f2f2"
          font-size="3" font-family="monospace">RESET</text>

    <!-- ================= USB INTERFACE IC ================= -->
    <rect x="42" y="33" width="15" height="14" rx="1"
          fill="#222" stroke="#555" stroke-width=".5"/>
    <g stroke="#bebebe" stroke-width=".35">
      <path d="M44 33V30"/><path d="M47 33V30"/><path d="M50 33V30"/><path d="M53 33V30"/>
      <path d="M44 47V50"/><path d="M47 47V50"/><path d="M50 47V50"/><path d="M53 47V50"/>
    </g>

    <!-- ================= 16 MHz CRYSTAL ================= -->
    <rect x="52" y="60" width="24" height="8" rx="2"
          fill="#c8c8c8" stroke="#707070" stroke-width=".6"/>
    <text x="64" y="65.5" text-anchor="middle" fill="#595959"
          font-size="2.7" font-family="monospace">16.000</text>

    <!-- ================= ATMEGA2560 ================= -->
    <rect x="93" y="42" width="42" height="42" rx="2"
          fill="#222" stroke="#555" stroke-width=".7"/>
    <circle cx="99" cy="48" r="1.3" fill="#555"/>
    <text x="114" y="61" text-anchor="middle" fill="#777"
          font-size="3.2" font-family="monospace">ATMEGA2560</text>
    <text x="114" y="66" text-anchor="middle" fill="#6b6b6b"
          font-size="2.6" font-family="monospace">16U-TW</text>

    <!-- ATmega pins -->
    <g stroke="#bdbdbd" stroke-width=".35">
      <path d="M97 42V38"/><path d="M102 42V38"/><path d="M107 42V38"/><path d="M112 42V38"/>
      <path d="M117 42V38"/><path d="M122 42V38"/><path d="M127 42V38"/><path d="M132 42V38"/>

      <path d="M97 84V88"/><path d="M102 84V88"/><path d="M107 84V88"/><path d="M112 84V88"/>
      <path d="M117 84V88"/><path d="M122 84V88"/><path d="M127 84V88"/><path d="M132 84V88"/>

      <path d="M93 47H89"/><path d="M93 52H89"/><path d="M93 57H89"/><path d="M93 62H89"/>
      <path d="M93 67H89"/><path d="M93 72H89"/><path d="M93 77H89"/>

      <path d="M135 47H139"/><path d="M135 52H139"/><path d="M135 57H139"/><path d="M135 62H139"/>
      <path d="M135 67H139"/><path d="M135 72H139"/><path d="M135 77H139"/>
    </g>

    <!-- ================= POWER COMPONENTS ================= -->
    <g>
      <circle cx="60" cy="96" r="5.7" fill="#c9c9c9" stroke="#666" stroke-width=".6"/>
      <circle cx="73" cy="96" r="5.7" fill="#c9c9c9" stroke="#666" stroke-width=".6"/>
      <text x="60" y="98" text-anchor="middle" fill="#555" font-size="2.2">47</text>
      <text x="73" y="98" text-anchor="middle" fill="#555" font-size="2.2">47</text>

      <rect x="41" y="80" width="12" height="11" rx="1"
            fill="#222" stroke="#555" stroke-width=".5"/>
      <rect x="54" y="77" width="8" height="7" rx="1"
            fill="#222" stroke="#555" stroke-width=".5"/>
    </g>

    <!-- ================= TX/RX LEDs ================= -->
    <g fill="#ddd6a2" stroke="#706e5e" stroke-width=".25">
      <rect x="49" y="24" width="6" height="3" rx=".4"/>
      <rect x="49" y="29" width="6" height="3" rx=".4"/>
    </g>
    <text x="57" y="26.6" fill="#fff" font-size="2.4" font-family="monospace">TX</text>
    <text x="57" y="31.6" fill="#fff" font-size="2.4" font-family="monospace">RX</text>

    <!-- ================= ARDUINO / MEGA MARKINGS ================= -->
    <text x="80" y="29" fill="#fff" font-size="5.2"
          font-family="Arial, sans-serif" font-weight="bold">
      ARDUINO
    </text>

    <g fill="none" stroke="#fff" stroke-width="1.2">
      <circle cx="148" cy="84" r="7.5"/>
      <path d="M142 84H154 M145 81L142 84L145 87 M151 81L154 84L151 87"/>
    </g>

    <text x="158" y="88" fill="#fff" font-size="7"
          font-family="Arial, sans-serif">
      MEGA
    </text>

    <text x="146" y="97" fill="#fff" font-size="4.5"
          font-family="Arial, sans-serif">
      ARDUINO
    </text>

    <!-- ================= ICSP HEADER ================= -->
    <g>
      <rect x="136" y="53" width="12" height="16" rx="1"
            fill="#262626" stroke="#686868" stroke-width=".5"/>
      <g fill="#c9c9c9">
        <circle cx="140" cy="57" r="1.3"/>
        <circle cx="145" cy="57" r="1.3"/>
        <circle cx="140" cy="62" r="1.3"/>
        <circle cx="145" cy="62" r="1.3"/>
        <circle cx="140" cy="67" r="1.3"/>
        <circle cx="145" cy="67" r="1.3"/>
      </g>
    </g>

    <!-- ================= TOP DIGITAL HEADER 0-13 ================= -->
    <rect x="57" y="7" width="90" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="62" cy="11.5" r="1.6"/>
      <circle cx="68" cy="11.5" r="1.6"/>
      <circle cx="74" cy="11.5" r="1.6"/>
      <circle cx="80" cy="11.5" r="1.6"/>
      <circle cx="86" cy="11.5" r="1.6"/>
      <circle cx="92" cy="11.5" r="1.6"/>
      <circle cx="98" cy="11.5" r="1.6"/>
      <circle cx="104" cy="11.5" r="1.6"/>
      <circle cx="110" cy="11.5" r="1.6"/>
      <circle cx="116" cy="11.5" r="1.6"/>
      <circle cx="122" cy="11.5" r="1.6"/>
      <circle cx="128" cy="11.5" r="1.6"/>
      <circle cx="134" cy="11.5" r="1.6"/>
      <circle cx="140" cy="11.5" r="1.6"/>
    </g>

    <g fill="#fff" font-size="2.3" font-family="monospace">
      <text x="62"  y="5" text-anchor="middle">13</text>
      <text x="68"  y="5" text-anchor="middle">12</text>
      <text x="74"  y="5" text-anchor="middle">11</text>
      <text x="80"  y="5" text-anchor="middle">10</text>
      <text x="86"  y="5" text-anchor="middle">9</text>
      <text x="92"  y="5" text-anchor="middle">8</text>
      <text x="98"  y="5" text-anchor="middle">7</text>
      <text x="104" y="5" text-anchor="middle">6</text>
      <text x="110" y="5" text-anchor="middle">5</text>
      <text x="116" y="5" text-anchor="middle">4</text>
      <text x="122" y="5" text-anchor="middle">3</text>
      <text x="128" y="5" text-anchor="middle">2</text>
      <text x="134" y="5" text-anchor="middle">1</text>
      <text x="140" y="5" text-anchor="middle">0</text>
    </g>

    <text x="102" y="22" text-anchor="middle" fill="#fff"
          font-size="3" font-family="monospace">
      DIGITAL (PWM~)
    </text>

    <!-- ================= COMMUNICATION HEADER ================= -->
    <rect x="149" y="7" width="45" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>
    <g fill="#c9c9c9">
      <circle cx="153" cy="11.5" r="1.6"/>
      <circle cx="159" cy="11.5" r="1.6"/>
      <circle cx="165" cy="11.5" r="1.6"/>
      <circle cx="171" cy="11.5" r="1.6"/>
      <circle cx="177" cy="11.5" r="1.6"/>
      <circle cx="183" cy="11.5" r="1.6"/>
      <circle cx="189" cy="11.5" r="1.6"/>
    </g>

    <!-- ================= RIGHT DIGITAL HEADER 22-53 ================= -->
    <rect x="192" y="18" width="12" height="91" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="196" cy="22" r="1.5"/><circle cx="201" cy="22" r="1.5"/>
      <circle cx="196" cy="27" r="1.5"/><circle cx="201" cy="27" r="1.5"/>
      <circle cx="196" cy="32" r="1.5"/><circle cx="201" cy="32" r="1.5"/>
      <circle cx="196" cy="37" r="1.5"/><circle cx="201" cy="37" r="1.5"/>
      <circle cx="196" cy="42" r="1.5"/><circle cx="201" cy="42" r="1.5"/>
      <circle cx="196" cy="47" r="1.5"/><circle cx="201" cy="47" r="1.5"/>
      <circle cx="196" cy="52" r="1.5"/><circle cx="201" cy="52" r="1.5"/>
      <circle cx="196" cy="57" r="1.5"/><circle cx="201" cy="57" r="1.5"/>
      <circle cx="196" cy="62" r="1.5"/><circle cx="201" cy="62" r="1.5"/>
      <circle cx="196" cy="67" r="1.5"/><circle cx="201" cy="67" r="1.5"/>
      <circle cx="196" cy="72" r="1.5"/><circle cx="201" cy="72" r="1.5"/>
      <circle cx="196" cy="77" r="1.5"/><circle cx="201" cy="77" r="1.5"/>
      <circle cx="196" cy="82" r="1.5"/><circle cx="201" cy="82" r="1.5"/>
      <circle cx="196" cy="87" r="1.5"/><circle cx="201" cy="87" r="1.5"/>
      <circle cx="196" cy="92" r="1.5"/><circle cx="201" cy="92" r="1.5"/>
      <circle cx="196" cy="97" r="1.5"/><circle cx="201" cy="97" r="1.5"/>
      <circle cx="196" cy="102" r="1.5"/><circle cx="201" cy="102" r="1.5"/>
      <circle cx="196" cy="107" r="1.5"/><circle cx="201" cy="107" r="1.5"/>
    </g>

    <!-- ================= BOTTOM POWER HEADER ================= -->
    <rect x="58" y="111" width="52" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="62" cy="115.5" r="1.6"/>
      <circle cx="69" cy="115.5" r="1.6"/>
      <circle cx="76" cy="115.5" r="1.6"/>
      <circle cx="83" cy="115.5" r="1.6"/>
      <circle cx="90" cy="115.5" r="1.6"/>
      <circle cx="97" cy="115.5" r="1.6"/>
      <circle cx="104" cy="115.5" r="1.6"/>
    </g>

    <text x="84" y="108" text-anchor="middle" fill="#fff"
          font-size="3" font-family="monospace">POWER</text>

    <!-- ================= BOTTOM ANALOG HEADER A0-A15 ================= -->
    <rect x="111" y="111" width="80" height="9" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="115" cy="115.5" r="1.5"/>
      <circle cx="120" cy="115.5" r="1.5"/>
      <circle cx="125" cy="115.5" r="1.5"/>
      <circle cx="130" cy="115.5" r="1.5"/>
      <circle cx="135" cy="115.5" r="1.5"/>
      <circle cx="140" cy="115.5" r="1.5"/>
      <circle cx="145" cy="115.5" r="1.5"/>
      <circle cx="150" cy="115.5" r="1.5"/>
      <circle cx="155" cy="115.5" r="1.5"/>
      <circle cx="160" cy="115.5" r="1.5"/>
      <circle cx="165" cy="115.5" r="1.5"/>
      <circle cx="170" cy="115.5" r="1.5"/>
      <circle cx="175" cy="115.5" r="1.5"/>
      <circle cx="180" cy="115.5" r="1.5"/>
      <circle cx="185" cy="115.5" r="1.5"/>
      <circle cx="190" cy="115.5" r="1.5"/>
    </g>

    <text x="151" y="108" text-anchor="middle" fill="#fff"
          font-size="3" font-family="monospace">ANALOG IN</text>

    <!-- simulator connection hints -->
    <g fill="#cfcfcf" opacity=".9">
      <!-- top D13-D0 -->
      <circle cx="62" cy="0" r="1.5"/><circle cx="68" cy="0" r="1.5"/>
      <circle cx="74" cy="0" r="1.5"/><circle cx="80" cy="0" r="1.5"/>
      <circle cx="86" cy="0" r="1.5"/><circle cx="92" cy="0" r="1.5"/>
      <circle cx="98" cy="0" r="1.5"/><circle cx="104" cy="0" r="1.5"/>
      <circle cx="110" cy="0" r="1.5"/><circle cx="116" cy="0" r="1.5"/>
      <circle cx="122" cy="0" r="1.5"/><circle cx="128" cy="0" r="1.5"/>
      <circle cx="134" cy="0" r="1.5"/><circle cx="140" cy="0" r="1.5"/>

      <!-- bottom -->
      <circle cx="62" cy="130" r="1.5"/><circle cx="69" cy="130" r="1.5"/>
      <circle cx="76" cy="130" r="1.5"/><circle cx="83" cy="130" r="1.5"/>
      <circle cx="90" cy="130" r="1.5"/><circle cx="97" cy="130" r="1.5"/>
      <circle cx="104" cy="130" r="1.5"/>

      <circle cx="115" cy="130" r="1.5"/><circle cx="120" cy="130" r="1.5"/>
      <circle cx="125" cy="130" r="1.5"/><circle cx="130" cy="130" r="1.5"/>
      <circle cx="135" cy="130" r="1.5"/><circle cx="140" cy="130" r="1.5"/>
      <circle cx="145" cy="130" r="1.5"/><circle cx="150" cy="130" r="1.5"/>
      <circle cx="155" cy="130" r="1.5"/><circle cx="160" cy="130" r="1.5"/>
      <circle cx="165" cy="130" r="1.5"/><circle cx="170" cy="130" r="1.5"/>
      <circle cx="175" cy="130" r="1.5"/><circle cx="180" cy="130" r="1.5"/>
      <circle cx="185" cy="130" r="1.5"/><circle cx="190" cy="130" r="1.5"/>

      <!-- right side block -->
      <circle cx="210" cy="22" r="1.5"/><circle cx="210" cy="27" r="1.5"/>
      <circle cx="210" cy="32" r="1.5"/><circle cx="210" cy="37" r="1.5"/>
      <circle cx="210" cy="42" r="1.5"/><circle cx="210" cy="47" r="1.5"/>
      <circle cx="210" cy="52" r="1.5"/><circle cx="210" cy="57" r="1.5"/>
      <circle cx="210" cy="62" r="1.5"/><circle cx="210" cy="67" r="1.5"/>
      <circle cx="210" cy="72" r="1.5"/><circle cx="210" cy="77" r="1.5"/>
      <circle cx="210" cy="82" r="1.5"/><circle cx="210" cy="87" r="1.5"/>
      <circle cx="210" cy="92" r="1.5"/><circle cx="210" cy="97" r="1.5"/>
      <circle cx="210" cy="102" r="1.5"/><circle cx="210" cy="107" r="1.5"/>
    </g>
  `,

  pins: [
    // DIGITAL 0-13
    { id:'D13', x:62,  y:0, type:'digital', label:'D13 / SCK' },
    { id:'D12', x:68,  y:0, type:'digital', label:'D12 / MISO' },
    { id:'D11', x:74,  y:0, type:'digital', label:'D11 / MOSI / PWM' },
    { id:'D10', x:80,  y:0, type:'digital', label:'D10 / PWM' },
    { id:'D9',  x:86,  y:0, type:'digital', label:'D9 / PWM' },
    { id:'D8',  x:92,  y:0, type:'digital', label:'D8 / PWM' },
    { id:'D7',  x:98,  y:0, type:'digital', label:'D7' },
    { id:'D6',  x:104, y:0, type:'digital', label:'D6 / PWM' },
    { id:'D5',  x:110, y:0, type:'digital', label:'D5 / PWM' },
    { id:'D4',  x:116, y:0, type:'digital', label:'D4 / PWM' },
    { id:'D3',  x:122, y:0, type:'digital', label:'D3 / PWM' },
    { id:'D2',  x:128, y:0, type:'digital', label:'D2 / PWM' },
    { id:'D1',  x:134, y:0, type:'digital', label:'D1 / TX0' },
    { id:'D0',  x:140, y:0, type:'digital', label:'D0 / RX0' },

    // POWER
    { id:'IOREF', x:62,  y:130, type:'power',   label:'IOREF' },
    { id:'RESET', x:69,  y:130, type:'digital', label:'RESET' },
    { id:'3V3',   x:76,  y:130, type:'power',   label:'3.3V' },
    { id:'5V',    x:83,  y:130, type:'power',   label:'5V' },
    { id:'GND1',  x:90,  y:130, type:'gnd',     label:'GND' },
    { id:'GND2',  x:97,  y:130, type:'gnd',     label:'GND' },
    { id:'VIN',   x:104, y:130, type:'power',   label:'VIN' },

    // ANALOG A0-A15
    { id:'A0',  x:115, y:130, type:'analog', label:'A0' },
    { id:'A1',  x:120, y:130, type:'analog', label:'A1' },
    { id:'A2',  x:125, y:130, type:'analog', label:'A2' },
    { id:'A3',  x:130, y:130, type:'analog', label:'A3' },
    { id:'A4',  x:135, y:130, type:'analog', label:'A4' },
    { id:'A5',  x:140, y:130, type:'analog', label:'A5' },
    { id:'A6',  x:145, y:130, type:'analog', label:'A6' },
    { id:'A7',  x:150, y:130, type:'analog', label:'A7' },
    { id:'A8',  x:155, y:130, type:'analog', label:'A8' },
    { id:'A9',  x:160, y:130, type:'analog', label:'A9' },
    { id:'A10', x:165, y:130, type:'analog', label:'A10' },
    { id:'A11', x:170, y:130, type:'analog', label:'A11' },
    { id:'A12', x:175, y:130, type:'analog', label:'A12' },
    { id:'A13', x:180, y:130, type:'analog', label:'A13' },
    { id:'A14', x:185, y:130, type:'analog', label:'A14' },
    { id:'A15', x:190, y:130, type:'analog', label:'A15' },

    // EXTRA DIGITAL 22-53
    { id:'D22', x:210, y:22,  type:'digital', label:'D22' },
    { id:'D23', x:210, y:27,  type:'digital', label:'D23' },
    { id:'D24', x:210, y:32,  type:'digital', label:'D24' },
    { id:'D25', x:210, y:37,  type:'digital', label:'D25' },
    { id:'D26', x:210, y:42,  type:'digital', label:'D26' },
    { id:'D27', x:210, y:47,  type:'digital', label:'D27' },
    { id:'D28', x:210, y:52,  type:'digital', label:'D28' },
    { id:'D29', x:210, y:57,  type:'digital', label:'D29' },
    { id:'D30', x:210, y:62,  type:'digital', label:'D30' },
    { id:'D31', x:210, y:67,  type:'digital', label:'D31' },
    { id:'D32', x:210, y:72,  type:'digital', label:'D32' },
    { id:'D33', x:210, y:77,  type:'digital', label:'D33' },
    { id:'D34', x:210, y:82,  type:'digital', label:'D34' },
    { id:'D35', x:210, y:87,  type:'digital', label:'D35' },
    { id:'D36', x:210, y:92,  type:'digital', label:'D36' },
    { id:'D37', x:210, y:97,  type:'digital', label:'D37' },
    { id:'D38', x:210, y:102, type:'digital', label:'D38' },
    { id:'D39', x:210, y:107, type:'digital', label:'D39' },

    { id:'D40', x:205, y:22,  type:'digital', label:'D40' },
    { id:'D41', x:205, y:27,  type:'digital', label:'D41' },
    { id:'D42', x:205, y:32,  type:'digital', label:'D42' },
    { id:'D43', x:205, y:37,  type:'digital', label:'D43' },
    { id:'D44', x:205, y:42,  type:'digital', label:'D44 / PWM' },
    { id:'D45', x:205, y:47,  type:'digital', label:'D45 / PWM' },
    { id:'D46', x:205, y:52,  type:'digital', label:'D46 / PWM' },
    { id:'D47', x:205, y:57,  type:'digital', label:'D47' },
    { id:'D48', x:205, y:62,  type:'digital', label:'D48' },
    { id:'D49', x:205, y:67,  type:'digital', label:'D49' },
    { id:'D50', x:205, y:72,  type:'digital', label:'D50 / MISO' },
    { id:'D51', x:205, y:77,  type:'digital', label:'D51 / MOSI' },
    { id:'D52', x:205, y:82,  type:'digital', label:'D52 / SCK' },
    { id:'D53', x:205, y:87,  type:'digital', label:'D53 / SS' }
  ],

  defaults: {
    label: 'Arduino Mega'
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
  arduinoNano: {
  id: 'arduinoNano',
  label: 'Arduino Nano V3',
  category: 'Controllers',
  desc: 'Compact Arduino Nano-compatible development board based on the ATmega328P',
  w: 100,
  h: 220,

  svg: `
    <defs>
      <linearGradient id="nanoPcbGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#43b8ad"/>
        <stop offset="0.55" stop-color="#169c95"/>
        <stop offset="1" stop-color="#087b75"/>
      </linearGradient>

      <linearGradient id="nanoMetalGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eeeeee"/>
        <stop offset="1" stop-color="#8d8d8d"/>
      </linearGradient>
    </defs>

    <!-- ================= PCB ================= -->
    <rect
      x="7" y="4"
      width="86" height="212"
      rx="5"
      fill="url(#nanoPcbGrad)"
      stroke="#0b746f"
      stroke-width="1.2"
    />

    <rect
      x="10" y="7"
      width="80" height="206"
      rx="3"
      fill="none"
      stroke="#48c8be"
      stroke-width=".5"
    />

    <!-- ================= USB MINI CONNECTOR ================= -->
    <path
      d="M31 4 H69
         L73 10
         V30
         L69 36
         H31
         L27 30
         V10 Z"
      fill="url(#nanoMetalGrad)"
      stroke="#666"
      stroke-width=".9"
    />

    <rect
      x="34" y="9"
      width="32" height="20"
      rx="1.5"
      fill="#4a4a4a"
    />

    <rect
      x="39" y="12"
      width="22" height="13"
      rx="1"
      fill="#181818"
    />

    <!-- ================= RESET BUTTON ================= -->
    <rect
      x="43" y="41"
      width="15" height="12"
      rx="1.5"
      fill="#dedede"
      stroke="#777"
      stroke-width=".6"
    />
    <circle cx="50.5" cy="47" r="3.5" fill="#d6d6d6"/>
    <text
      x="50"
      y="58"
      text-anchor="middle"
      fill="#f2f2f2"
      font-size="3"
      font-family="monospace"
    >
      RESET
    </text>

    <!-- ================= ATMEGA328P ================= -->
    <rect
      x="34" y="78"
      width="32" height="32"
      rx="1.8"
      fill="#202020"
      stroke="#555"
      stroke-width=".7"
    />

    <circle cx="39" cy="83" r="1.2" fill="#555"/>

    <text
      x="50"
      y="92"
      text-anchor="middle"
      fill="#777"
      font-size="3.2"
      font-family="monospace"
    >
      ATMEGA328P
    </text>

    <text
      x="50"
      y="98"
      text-anchor="middle"
      fill="#666"
      font-size="2.5"
      font-family="monospace"
    >
      AU
    </text>

    <!-- ATmega side pins -->
    <g stroke="#bdbdbd" stroke-width=".35">
      <path d="M38 78V74"/><path d="M43 78V74"/><path d="M48 78V74"/>
      <path d="M53 78V74"/><path d="M58 78V74"/><path d="M63 78V74"/>

      <path d="M38 110V114"/><path d="M43 110V114"/><path d="M48 110V114"/>
      <path d="M53 110V114"/><path d="M58 110V114"/><path d="M63 110V114"/>

      <path d="M34 82H30"/><path d="M34 87H30"/><path d="M34 92H30"/>
      <path d="M34 97H30"/><path d="M34 102H30"/><path d="M34 107H30"/>

      <path d="M66 82H70"/><path d="M66 87H70"/><path d="M66 92H70"/>
      <path d="M66 97H70"/><path d="M66 102H70"/><path d="M66 107H70"/>
    </g>

    <!-- ================= USB SERIAL / REGULATOR AREA ================= -->
    <rect
      x="20" y="60"
      width="16" height="13"
      rx="1"
      fill="#242424"
      stroke="#555"
      stroke-width=".5"
    />

    <rect
      x="64" y="60"
      width="16" height="13"
      rx="1"
      fill="#242424"
      stroke="#555"
      stroke-width=".5"
    />

    <!-- ================= CRYSTAL ================= -->
    <rect
      x="39"
      y="119"
      width="22" height="7"
      rx="2"
      fill="#c9c9c9"
      stroke="#707070"
      stroke-width=".6"
    />

    <text
      x="50"
      y="124"
      text-anchor="middle"
      fill="#555"
      font-size="2.5"
      font-family="monospace"
    >
      16.000
    </text>

    <!-- ================= SMALL COMPONENTS ================= -->
    <g fill="#d6d0a1" stroke="#646257" stroke-width=".25">
      <rect x="20" y="116" width="9" height="3" rx=".4"/>
      <rect x="20" y="123" width="9" height="3" rx=".4"/>
      <rect x="71" y="116" width="9" height="3" rx=".4"/>
      <rect x="71" y="123" width="9" height="3" rx=".4"/>

      <rect x="24" y="134" width="8" height="3" rx=".4"/>
      <rect x="35" y="134" width="8" height="3" rx=".4"/>
      <rect x="57" y="134" width="8" height="3" rx=".4"/>
      <rect x="68" y="134" width="8" height="3" rx=".4"/>

      <rect x="24" y="141" width="8" height="3" rx=".4"/>
      <rect x="35" y="141" width="8" height="3" rx=".4"/>
      <rect x="57" y="141" width="8" height="3" rx=".4"/>
      <rect x="68" y="141" width="8" height="3" rx=".4"/>
    </g>

    <!-- ================= POWER / STATUS LEDS ================= -->
    <g fill="#ddd69a" stroke="#686755" stroke-width=".25">
      <rect x="42" y="134" width="6" height="3" rx=".4"/>
      <rect x="52" y="134" width="6" height="3" rx=".4"/>
      <rect x="42" y="141" width="6" height="3" rx=".4"/>
      <rect x="52" y="141" width="6" height="3" rx=".4"/>
    </g>

    <g fill="#f2f2f2" font-size="2.5" font-family="monospace">
      <text x="41" y="151">TX</text>
      <text x="51" y="151">RX</text>
      <text x="62" y="151">L</text>
      <text x="71" y="151">PWR</text>
    </g>

    <!-- ================= BOARD LABEL ================= -->
    <text
      x="50"
      y="164"
      text-anchor="middle"
      fill="#ffffff"
      font-size="5"
      font-family="Arial, sans-serif"
      font-weight="bold"
    >
      NANO
    </text>

    <text
      x="50"
      y="171"
      text-anchor="middle"
      fill="#e7ffff"
      font-size="3"
      font-family="Arial, sans-serif"
    >
      ARDUINO
    </text>

    <!-- ================= LEFT PIN HEADER ================= -->
    <rect x="6" y="31" width="9" height="155" rx="1"
          fill="#1f1f1f" stroke="#555" stroke-width=".5"/>

    <!-- ================= RIGHT PIN HEADER ================= -->
    <rect x="85" y="31" width="9" height="155" rx="1"
          fill="#1f1f1f" stroke="#555" stroke-width=".5"/>

    <!-- header holes -->
    <g fill="#c8c8c8">
      <!-- LEFT -->
      <circle cx="10.5" cy="36" r="1.5"/>
      <circle cx="10.5" cy="46" r="1.5"/>
      <circle cx="10.5" cy="56" r="1.5"/>
      <circle cx="10.5" cy="66" r="1.5"/>
      <circle cx="10.5" cy="76" r="1.5"/>
      <circle cx="10.5" cy="86" r="1.5"/>
      <circle cx="10.5" cy="96" r="1.5"/>
      <circle cx="10.5" cy="106" r="1.5"/>
      <circle cx="10.5" cy="116" r="1.5"/>
      <circle cx="10.5" cy="126" r="1.5"/>
      <circle cx="10.5" cy="136" r="1.5"/>
      <circle cx="10.5" cy="146" r="1.5"/>
      <circle cx="10.5" cy="156" r="1.5"/>
      <circle cx="10.5" cy="166" r="1.5"/>
      <circle cx="10.5" cy="176" r="1.5"/>

      <!-- RIGHT -->
      <circle cx="89.5" cy="36" r="1.5"/>
      <circle cx="89.5" cy="46" r="1.5"/>
      <circle cx="89.5" cy="56" r="1.5"/>
      <circle cx="89.5" cy="66" r="1.5"/>
      <circle cx="89.5" cy="76" r="1.5"/>
      <circle cx="89.5" cy="86" r="1.5"/>
      <circle cx="89.5" cy="96" r="1.5"/>
      <circle cx="89.5" cy="106" r="1.5"/>
      <circle cx="89.5" cy="116" r="1.5"/>
      <circle cx="89.5" cy="126" r="1.5"/>
      <circle cx="89.5" cy="136" r="1.5"/>
      <circle cx="89.5" cy="146" r="1.5"/>
      <circle cx="89.5" cy="156" r="1.5"/>
      <circle cx="89.5" cy="166" r="1.5"/>
      <circle cx="89.5" cy="176" r="1.5"/>
    </g>

    <!-- ================= PIN LABELS ================= -->
    <g fill="#fff" font-size="2.65" font-family="monospace">
      <!-- LEFT -->
      <text x="17" y="37">D1/TX</text>
      <text x="17" y="47">D0/RX</text>
      <text x="17" y="57">RST</text>
      <text x="17" y="67">GND</text>
      <text x="17" y="77">D2</text>
      <text x="17" y="87">D3~</text>
      <text x="17" y="97">D4</text>
      <text x="17" y="107">D5~</text>
      <text x="17" y="117">D6~</text>
      <text x="17" y="127">D7</text>
      <text x="17" y="137">D8</text>
      <text x="17" y="147">D9~</text>
      <text x="17" y="157">D10~</text>
      <text x="17" y="167">D11~</text>
      <text x="17" y="177">D12</text>

      <!-- RIGHT -->
      <text x="83" y="37" text-anchor="end">D13</text>
      <text x="83" y="47" text-anchor="end">3V3</text>
      <text x="83" y="57" text-anchor="end">AREF</text>
      <text x="83" y="67" text-anchor="end">A0</text>
      <text x="83" y="77" text-anchor="end">A1</text>
      <text x="83" y="87" text-anchor="end">A2</text>
      <text x="83" y="97" text-anchor="end">A3</text>
      <text x="83" y="107" text-anchor="end">A4</text>
      <text x="83" y="117" text-anchor="end">A5</text>
      <text x="83" y="127" text-anchor="end">A6</text>
      <text x="83" y="137" text-anchor="end">A7</text>
      <text x="83" y="147" text-anchor="end">5V</text>
      <text x="83" y="157" text-anchor="end">RST</text>
      <text x="83" y="167" text-anchor="end">GND</text>
      <text x="83" y="177" text-anchor="end">VIN</text>
    </g>

    <!-- ================= SIMULATOR CONNECTION POINTS ================= -->
    <g fill="#cfcfcf" opacity=".95">
      <!-- LEFT -->
      <circle cx="0" cy="36" r="1.5"/>
      <circle cx="0" cy="46" r="1.5"/>
      <circle cx="0" cy="56" r="1.5"/>
      <circle cx="0" cy="66" r="1.5"/>
      <circle cx="0" cy="76" r="1.5"/>
      <circle cx="0" cy="86" r="1.5"/>
      <circle cx="0" cy="96" r="1.5"/>
      <circle cx="0" cy="106" r="1.5"/>
      <circle cx="0" cy="116" r="1.5"/>
      <circle cx="0" cy="126" r="1.5"/>
      <circle cx="0" cy="136" r="1.5"/>
      <circle cx="0" cy="146" r="1.5"/>
      <circle cx="0" cy="156" r="1.5"/>
      <circle cx="0" cy="166" r="1.5"/>
      <circle cx="0" cy="176" r="1.5"/>

      <!-- RIGHT -->
      <circle cx="100" cy="36" r="1.5"/>
      <circle cx="100" cy="46" r="1.5"/>
      <circle cx="100" cy="56" r="1.5"/>
      <circle cx="100" cy="66" r="1.5"/>
      <circle cx="100" cy="76" r="1.5"/>
      <circle cx="100" cy="86" r="1.5"/>
      <circle cx="100" cy="96" r="1.5"/>
      <circle cx="100" cy="106" r="1.5"/>
      <circle cx="100" cy="116" r="1.5"/>
      <circle cx="100" cy="126" r="1.5"/>
      <circle cx="100" cy="136" r="1.5"/>
      <circle cx="100" cy="146" r="1.5"/>
      <circle cx="100" cy="156" r="1.5"/>
      <circle cx="100" cy="166" r="1.5"/>
      <circle cx="100" cy="176" r="1.5"/>
    </g>
  `,

  pins: [
    // LEFT SIDE — Top to Bottom
    { id:'D1',    x:0,   y:36,  type:'digital', label:'D1 / TX' },
    { id:'D0',    x:0,   y:46,  type:'digital', label:'D0 / RX' },
    { id:'RESET1',x:0,   y:56,  type:'digital', label:'RESET' },
    { id:'GND1',  x:0,   y:66,  type:'gnd',     label:'GND' },
    { id:'D2',    x:0,   y:76,  type:'digital', label:'D2' },
    { id:'D3',    x:0,   y:86,  type:'digital', label:'D3 / PWM' },
    { id:'D4',    x:0,   y:96,  type:'digital', label:'D4' },
    { id:'D5',    x:0,   y:106, type:'digital', label:'D5 / PWM' },
    { id:'D6',    x:0,   y:116, type:'digital', label:'D6 / PWM' },
    { id:'D7',    x:0,   y:126, type:'digital', label:'D7' },
    { id:'D8',    x:0,   y:136, type:'digital', label:'D8' },
    { id:'D9',    x:0,   y:146, type:'digital', label:'D9 / PWM' },
    { id:'D10',   x:0,   y:156, type:'digital', label:'D10 / PWM / SS' },
    { id:'D11',   x:0,   y:166, type:'digital', label:'D11 / PWM / MOSI' },
    { id:'D12',   x:0,   y:176, type:'digital', label:'D12 / MISO' },

    // RIGHT SIDE — Top to Bottom
    { id:'D13',   x:100, y:36,  type:'digital', label:'D13 / SCK / LED' },
    { id:'3V3',   x:100, y:46,  type:'power',   label:'3.3V' },
    { id:'AREF',  x:100, y:56,  type:'power',   label:'AREF' },
    { id:'A0',    x:100, y:66,  type:'analog',  label:'A0' },
    { id:'A1',    x:100, y:76,  type:'analog',  label:'A1' },
    { id:'A2',    x:100, y:86,  type:'analog',  label:'A2' },
    { id:'A3',    x:100, y:96,  type:'analog',  label:'A3' },
    { id:'A4',    x:100, y:106, type:'analog',  label:'A4 / SDA' },
    { id:'A5',    x:100, y:116, type:'analog',  label:'A5 / SCL' },
    { id:'A6',    x:100, y:126, type:'analog',  label:'A6' },
    { id:'A7',    x:100, y:136, type:'analog',  label:'A7' },
    { id:'5V',    x:100, y:146, type:'power',   label:'5V' },
    { id:'RESET2',x:100, y:156, type:'digital', label:'RESET' },
    { id:'GND2',  x:100, y:166, type:'gnd',     label:'GND' },
    { id:'VIN',   x:100, y:176, type:'power',   label:'VIN' }
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
    return {};
  }
  },
  arduinoUnoR4Wifi: {
  id: 'arduinoUnoR4Wifi',
  label: 'Arduino UNO R4 WiFi',
  category: 'Controllers',
  desc: 'Arduino UNO R4 WiFi development board with Renesas RA4M1 MCU, ESP32-S3 WiFi/Bluetooth module and 12x8 LED matrix',
  w: 180,
  h: 130,

  svg: `
    <defs>
      <linearGradient id="unoR4Pcb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0f4f87"/>
        <stop offset="0.55" stop-color="#0b3f70"/>
        <stop offset="1" stop-color="#082e53"/>
      </linearGradient>

      <linearGradient id="unoR4Metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#efefef"/>
        <stop offset="1" stop-color="#8d8d8d"/>
      </linearGradient>

      <linearGradient id="unoR4Module" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f1f1e9"/>
        <stop offset="1" stop-color="#bdbdb4"/>
      </linearGradient>
    </defs>

    <!-- ================= PCB ================= -->
    <path
      d="M12 7 H166
         Q173 7 173 14
         V112
         Q173 120 165 120
         H22
         Q14 120 14 112
         V103
         H8
         V77
         H14
         V16
         Q14 7 22 7 Z"
      fill="url(#unoR4Pcb)"
      stroke="#062c4d"
      stroke-width="1.2"
    />

    <!-- ================= MOUNTING HOLES ================= -->
    <g fill="#e9e9e9" stroke="#858585" stroke-width=".7">
      <circle cx="20" cy="15" r="4.5"/>
      <circle cx="164" cy="15" r="4.5"/>
      <circle cx="23" cy="111" r="4.5"/>
      <circle cx="162" cy="111" r="4.5"/>
    </g>

    <!-- ================= USB-C CONNECTOR ================= -->
    <rect x="3" y="70" width="30" height="17" rx="3"
          fill="url(#unoR4Metal)" stroke="#6c6c6c" stroke-width=".9"/>
    <rect x="4.5" y="74" width="26" height="9" rx="3"
          fill="#333"/>
    <rect x="7" y="76" width="21" height="5" rx="2.5"
          fill="#161616"/>

    <!-- ================= RESET BUTTON ================= -->
    <rect x="14" y="22" width="14" height="12" rx="2"
          fill="#dedede" stroke="#7c7c7c" stroke-width=".6"/>
    <circle cx="21" cy="28" r="3.6" fill="#d9d9d9"/>
    <text x="21" y="39" text-anchor="middle" fill="#f5f5f5"
          font-size="3" font-family="monospace">RESET</text>

    <!-- ================= MAIN MCU: RA4M1 ================= -->
    <rect x="70" y="43" width="38" height="38" rx="2"
          fill="#202020" stroke="#555" stroke-width=".7"/>
    <circle cx="76" cy="49" r="1.3" fill="#575757"/>

    <text x="89" y="57" text-anchor="middle" fill="#777"
          font-size="3.5" font-family="monospace">RENESAS</text>
    <text x="89" y="63" text-anchor="middle" fill="#6a6a6a"
          font-size="3.2" font-family="monospace">RA4M1</text>

    <g stroke="#bcbcbc" stroke-width=".35">
      <path d="M74 43V39"/><path d="M79 43V39"/><path d="M84 43V39"/><path d="M89 43V39"/>
      <path d="M94 43V39"/><path d="M99 43V39"/><path d="M104 43V39"/>

      <path d="M74 81V85"/><path d="M79 81V85"/><path d="M84 81V85"/><path d="M89 81V85"/>
      <path d="M94 81V85"/><path d="M99 81V85"/><path d="M104 81V85"/>

      <path d="M70 47H66"/><path d="M70 52H66"/><path d="M70 57H66"/><path d="M70 62H66"/>
      <path d="M70 67H66"/><path d="M70 72H66"/><path d="M70 77H66"/>

      <path d="M108 47H112"/><path d="M108 52H112"/><path d="M108 57H112"/><path d="M108 62H112"/>
      <path d="M108 67H112"/><path d="M108 72H112"/><path d="M108 77H112"/>
    </g>

    <!-- ================= ESP32-S3 MODULE ================= -->
    <rect x="66" y="86" width="42" height="25" rx="2"
          fill="url(#unoR4Module)" stroke="#777" stroke-width=".6"/>

    <rect x="69" y="89" width="36" height="19" rx="1"
          fill="#e2e2da" stroke="#aaa" stroke-width=".4"/>

    <text x="87" y="96" text-anchor="middle" fill="#555"
          font-size="2.8" font-family="monospace">ESP32-S3</text>

    <text x="87" y="101" text-anchor="middle" fill="#666"
          font-size="2.4" font-family="monospace">WiFi / BT</text>

    <!-- PCB antenna on module -->
    <path d="M70 105 h9 v-3 h7 v3 h7 v-3 h8"
          fill="none" stroke="#9d7d35" stroke-width="1.1"/>

    <!-- ================= 12x8 LED MATRIX ================= -->
    <g fill="#e7e7cf" stroke="#777" stroke-width=".22">
      <!-- row 1 -->
      <rect x="118" y="44" width="3.2" height="3.2"/><rect x="123" y="44" width="3.2" height="3.2"/>
      <rect x="128" y="44" width="3.2" height="3.2"/><rect x="133" y="44" width="3.2" height="3.2"/>
      <rect x="138" y="44" width="3.2" height="3.2"/><rect x="143" y="44" width="3.2" height="3.2"/>
      <rect x="148" y="44" width="3.2" height="3.2"/><rect x="153" y="44" width="3.2" height="3.2"/>
      <rect x="158" y="44" width="3.2" height="3.2"/><rect x="163" y="44" width="3.2" height="3.2"/>
      <rect x="168" y="44" width="3.2" height="3.2"/><rect x="173" y="44" width="3.2" height="3.2"/>

      <!-- row 2 -->
      <rect x="118" y="49" width="3.2" height="3.2"/><rect x="123" y="49" width="3.2" height="3.2"/>
      <rect x="128" y="49" width="3.2" height="3.2"/><rect x="133" y="49" width="3.2" height="3.2"/>
      <rect x="138" y="49" width="3.2" height="3.2"/><rect x="143" y="49" width="3.2" height="3.2"/>
      <rect x="148" y="49" width="3.2" height="3.2"/><rect x="153" y="49" width="3.2" height="3.2"/>
      <rect x="158" y="49" width="3.2" height="3.2"/><rect x="163" y="49" width="3.2" height="3.2"/>
      <rect x="168" y="49" width="3.2" height="3.2"/><rect x="173" y="49" width="3.2" height="3.2"/>

      <!-- row 3 -->
      <rect x="118" y="54" width="3.2" height="3.2"/><rect x="123" y="54" width="3.2" height="3.2"/>
      <rect x="128" y="54" width="3.2" height="3.2"/><rect x="133" y="54" width="3.2" height="3.2"/>
      <rect x="138" y="54" width="3.2" height="3.2"/><rect x="143" y="54" width="3.2" height="3.2"/>
      <rect x="148" y="54" width="3.2" height="3.2"/><rect x="153" y="54" width="3.2" height="3.2"/>
      <rect x="158" y="54" width="3.2" height="3.2"/><rect x="163" y="54" width="3.2" height="3.2"/>
      <rect x="168" y="54" width="3.2" height="3.2"/><rect x="173" y="54" width="3.2" height="3.2"/>

      <!-- row 4 -->
      <rect x="118" y="59" width="3.2" height="3.2"/><rect x="123" y="59" width="3.2" height="3.2"/>
      <rect x="128" y="59" width="3.2" height="3.2"/><rect x="133" y="59" width="3.2" height="3.2"/>
      <rect x="138" y="59" width="3.2" height="3.2"/><rect x="143" y="59" width="3.2" height="3.2"/>
      <rect x="148" y="59" width="3.2" height="3.2"/><rect x="153" y="59" width="3.2" height="3.2"/>
      <rect x="158" y="59" width="3.2" height="3.2"/><rect x="163" y="59" width="3.2" height="3.2"/>
      <rect x="168" y="59" width="3.2" height="3.2"/><rect x="173" y="59" width="3.2" height="3.2"/>

      <!-- row 5 -->
      <rect x="118" y="64" width="3.2" height="3.2"/><rect x="123" y="64" width="3.2" height="3.2"/>
      <rect x="128" y="64" width="3.2" height="3.2"/><rect x="133" y="64" width="3.2" height="3.2"/>
      <rect x="138" y="64" width="3.2" height="3.2"/><rect x="143" y="64" width="3.2" height="3.2"/>
      <rect x="148" y="64" width="3.2" height="3.2"/><rect x="153" y="64" width="3.2" height="3.2"/>
      <rect x="158" y="64" width="3.2" height="3.2"/><rect x="163" y="64" width="3.2" height="3.2"/>
      <rect x="168" y="64" width="3.2" height="3.2"/><rect x="173" y="64" width="3.2" height="3.2"/>

      <!-- row 6 -->
      <rect x="118" y="69" width="3.2" height="3.2"/><rect x="123" y="69" width="3.2" height="3.2"/>
      <rect x="128" y="69" width="3.2" height="3.2"/><rect x="133" y="69" width="3.2" height="3.2"/>
      <rect x="138" y="69" width="3.2" height="3.2"/><rect x="143" y="69" width="3.2" height="3.2"/>
      <rect x="148" y="69" width="3.2" height="3.2"/><rect x="153" y="69" width="3.2" height="3.2"/>
      <rect x="158" y="69" width="3.2" height="3.2"/><rect x="163" y="69" width="3.2" height="3.2"/>
      <rect x="168" y="69" width="3.2" height="3.2"/><rect x="173" y="69" width="3.2" height="3.2"/>

      <!-- row 7 -->
      <rect x="118" y="74" width="3.2" height="3.2"/><rect x="123" y="74" width="3.2" height="3.2"/>
      <rect x="128" y="74" width="3.2" height="3.2"/><rect x="133" y="74" width="3.2" height="3.2"/>
      <rect x="138" y="74" width="3.2" height="3.2"/><rect x="143" y="74" width="3.2" height="3.2"/>
      <rect x="148" y="74" width="3.2" height="3.2"/><rect x="153" y="74" width="3.2" height="3.2"/>
      <rect x="158" y="74" width="3.2" height="3.2"/><rect x="163" y="74" width="3.2" height="3.2"/>
      <rect x="168" y="74" width="3.2" height="3.2"/><rect x="173" y="74" width="3.2" height="3.2"/>

      <!-- row 8 -->
      <rect x="118" y="79" width="3.2" height="3.2"/><rect x="123" y="79" width="3.2" height="3.2"/>
      <rect x="128" y="79" width="3.2" height="3.2"/><rect x="133" y="79" width="3.2" height="3.2"/>
      <rect x="138" y="79" width="3.2" height="3.2"/><rect x="143" y="79" width="3.2" height="3.2"/>
      <rect x="148" y="79" width="3.2" height="3.2"/><rect x="153" y="79" width="3.2" height="3.2"/>
      <rect x="158" y="79" width="3.2" height="3.2"/><rect x="163" y="79" width="3.2" height="3.2"/>
      <rect x="168" y="79" width="3.2" height="3.2"/><rect x="173" y="79" width="3.2" height="3.2"/>
    </g>

    <!-- ================= TOP DIGITAL HEADER ================= -->
    <rect x="55" y="7" width="111" height="10" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="60" cy="12" r="1.6"/><circle cx="67" cy="12" r="1.6"/>
      <circle cx="74" cy="12" r="1.6"/><circle cx="81" cy="12" r="1.6"/>
      <circle cx="88" cy="12" r="1.6"/><circle cx="95" cy="12" r="1.6"/>
      <circle cx="102" cy="12" r="1.6"/><circle cx="109" cy="12" r="1.6"/>
      <circle cx="116" cy="12" r="1.6"/><circle cx="123" cy="12" r="1.6"/>
      <circle cx="130" cy="12" r="1.6"/><circle cx="137" cy="12" r="1.6"/>
      <circle cx="144" cy="12" r="1.6"/><circle cx="151" cy="12" r="1.6"/>
      <circle cx="158" cy="12" r="1.6"/>
    </g>

    <g fill="#fff" font-size="2.4" font-family="monospace">
      <text x="60" y="5" text-anchor="middle">AREF</text>
      <text x="67" y="5" text-anchor="middle">GND</text>
      <text x="74" y="5" text-anchor="middle">13</text>
      <text x="81" y="5" text-anchor="middle">12</text>
      <text x="88" y="5" text-anchor="middle">11</text>
      <text x="95" y="5" text-anchor="middle">10</text>
      <text x="102" y="5" text-anchor="middle">9</text>
      <text x="109" y="5" text-anchor="middle">8</text>
      <text x="116" y="5" text-anchor="middle">7</text>
      <text x="123" y="5" text-anchor="middle">6</text>
      <text x="130" y="5" text-anchor="middle">5</text>
      <text x="137" y="5" text-anchor="middle">4</text>
      <text x="144" y="5" text-anchor="middle">3</text>
      <text x="151" y="5" text-anchor="middle">2</text>
      <text x="158" y="5" text-anchor="middle">1/0</text>
    </g>

    <!-- ================= BOTTOM POWER + ANALOG HEADER ================= -->
    <rect x="54" y="109" width="112" height="10" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c9c9c9">
      <circle cx="59" cy="114" r="1.6"/><circle cx="66" cy="114" r="1.6"/>
      <circle cx="73" cy="114" r="1.6"/><circle cx="80" cy="114" r="1.6"/>
      <circle cx="87" cy="114" r="1.6"/><circle cx="94" cy="114" r="1.6"/>
      <circle cx="101" cy="114" r="1.6"/>
      <circle cx="111" cy="114" r="1.6"/><circle cx="118" cy="114" r="1.6"/>
      <circle cx="125" cy="114" r="1.6"/><circle cx="132" cy="114" r="1.6"/>
      <circle cx="139" cy="114" r="1.6"/><circle cx="146" cy="114" r="1.6"/>
    </g>

    <g fill="#fff" font-size="2.3" font-family="monospace">
      <text x="59" y="125" text-anchor="middle">IOREF</text>
      <text x="66" y="125" text-anchor="middle">RST</text>
      <text x="73" y="125" text-anchor="middle">3V3</text>
      <text x="80" y="125" text-anchor="middle">5V</text>
      <text x="87" y="125" text-anchor="middle">GND</text>
      <text x="94" y="125" text-anchor="middle">GND</text>
      <text x="101" y="125" text-anchor="middle">VIN</text>

      <text x="111" y="125" text-anchor="middle">A0</text>
      <text x="118" y="125" text-anchor="middle">A1</text>
      <text x="125" y="125" text-anchor="middle">A2</text>
      <text x="132" y="125" text-anchor="middle">A3</text>
      <text x="139" y="125" text-anchor="middle">A4</text>
      <text x="146" y="125" text-anchor="middle">A5</text>
    </g>

    <!-- ================= QWIIC / JST-SH STYLE CONNECTOR ================= -->
    <rect x="155" y="29" width="17" height="10" rx="2"
          fill="#eeeeee" stroke="#a5a5a5" stroke-width=".5"/>
    <rect x="158" y="31" width="11" height="6" rx="1"
          fill="#d7d7d7"/>

    <!-- ================= SILKSCREEN ================= -->
    <text x="68" y="32" fill="#fff"
          font-size="5" font-family="Arial, sans-serif" font-weight="bold">
      ARDUINO
    </text>

    <text x="91" y="91" fill="#fff"
          font-size="4" font-family="Arial, sans-serif" font-weight="bold">
      UNO R4 WiFi
    </text>

    <!-- ================= SIMULATOR CONNECTION HINTS ================= -->
    <g fill="#cfcfcf" opacity=".95">
      <!-- top -->
      <circle cx="60" cy="0" r="1.5"/><circle cx="67" cy="0" r="1.5"/>
      <circle cx="74" cy="0" r="1.5"/><circle cx="81" cy="0" r="1.5"/>
      <circle cx="88" cy="0" r="1.5"/><circle cx="95" cy="0" r="1.5"/>
      <circle cx="102" cy="0" r="1.5"/><circle cx="109" cy="0" r="1.5"/>
      <circle cx="116" cy="0" r="1.5"/><circle cx="123" cy="0" r="1.5"/>
      <circle cx="130" cy="0" r="1.5"/><circle cx="137" cy="0" r="1.5"/>
      <circle cx="144" cy="0" r="1.5"/><circle cx="151" cy="0" r="1.5"/>
      <circle cx="158" cy="0" r="1.5"/>

      <!-- bottom -->
      <circle cx="59" cy="130" r="1.5"/><circle cx="66" cy="130" r="1.5"/>
      <circle cx="73" cy="130" r="1.5"/><circle cx="80" cy="130" r="1.5"/>
      <circle cx="87" cy="130" r="1.5"/><circle cx="94" cy="130" r="1.5"/>
      <circle cx="101" cy="130" r="1.5"/>

      <circle cx="111" cy="130" r="1.5"/><circle cx="118" cy="130" r="1.5"/>
      <circle cx="125" cy="130" r="1.5"/><circle cx="132" cy="130" r="1.5"/>
      <circle cx="139" cy="130" r="1.5"/><circle cx="146" cy="130" r="1.5"/>
    </g>
  `,

  pins: [
    // TOP HEADER
    { id:'AREF', x:60,  y:0, type:'power',   label:'AREF' },
    { id:'GND_TOP', x:67, y:0, type:'gnd',   label:'GND' },
    { id:'D13', x:74,  y:0, type:'digital', label:'D13 / SCK / LED' },
    { id:'D12', x:81,  y:0, type:'digital', label:'D12 / MISO' },
    { id:'D11', x:88,  y:0, type:'digital', label:'D11 / MOSI / PWM' },
    { id:'D10', x:95,  y:0, type:'digital', label:'D10 / PWM' },
    { id:'D9',  x:102, y:0, type:'digital', label:'D9 / PWM' },
    { id:'D8',  x:109, y:0, type:'digital', label:'D8' },
    { id:'D7',  x:116, y:0, type:'digital', label:'D7' },
    { id:'D6',  x:123, y:0, type:'digital', label:'D6 / PWM' },
    { id:'D5',  x:130, y:0, type:'digital', label:'D5 / PWM' },
    { id:'D4',  x:137, y:0, type:'digital', label:'D4' },
    { id:'D3',  x:144, y:0, type:'digital', label:'D3 / PWM' },
    { id:'D2',  x:151, y:0, type:'digital', label:'D2' },
    { id:'D1_D0', x:158, y:0, type:'digital', label:'D1 TX / D0 RX' },

    // POWER HEADER
    { id:'IOREF', x:59,  y:130, type:'power',   label:'IOREF' },
    { id:'RESET', x:66,  y:130, type:'digital', label:'RESET' },
    { id:'3V3',   x:73,  y:130, type:'power',   label:'3.3V' },
    { id:'5V',    x:80,  y:130, type:'power',   label:'5V' },
    { id:'GND1',  x:87,  y:130, type:'gnd',     label:'GND' },
    { id:'GND2',  x:94,  y:130, type:'gnd',     label:'GND' },
    { id:'VIN',   x:101, y:130, type:'power',   label:'VIN' },

    // ANALOG HEADER
    { id:'A0', x:111, y:130, type:'analog', label:'A0' },
    { id:'A1', x:118, y:130, type:'analog', label:'A1' },
    { id:'A2', x:125, y:130, type:'analog', label:'A2' },
    { id:'A3', x:132, y:130, type:'analog', label:'A3' },
    { id:'A4', x:139, y:130, type:'analog', label:'A4 / SDA' },
    { id:'A5', x:146, y:130, type:'analog', label:'A5 / SCL' }
  ],

  defaults: {
    label: 'Arduino UNO R4 WiFi'
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
  raspberryPi5: {
  id: 'raspberryPi5',
  label: 'Raspberry Pi 5',
  category: 'Controllers',
  desc: 'Raspberry Pi 5 single-board computer with 40-pin GPIO, dual micro-HDMI, USB, Ethernet, CSI/DSI and PCIe',
  w: 190,
  h: 130,

  svg: `
    <defs>
      <linearGradient id="rpi5Pcb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#39b35e"/>
        <stop offset="0.55" stop-color="#1f9f4b"/>
        <stop offset="1" stop-color="#147d39"/>
      </linearGradient>

      <linearGradient id="rpi5Metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0f0f0"/>
        <stop offset="1" stop-color="#939393"/>
      </linearGradient>
    </defs>

    <!-- ================= PCB ================= -->
    <rect x="8" y="8" width="174" height="114" rx="8"
          fill="url(#rpi5Pcb)" stroke="#126a32" stroke-width="1.2"/>

    <!-- mounting holes -->
    <g fill="#f0f0f0" stroke="#8b8b8b" stroke-width=".7">
      <circle cx="17" cy="17" r="4.5"/>
      <circle cx="173" cy="17" r="4.5"/>
      <circle cx="17" cy="113" r="4.5"/>
      <circle cx="173" cy="113" r="4.5"/>
    </g>

    <!-- ================= 40-PIN GPIO HEADER ================= -->
    <rect x="43" y="10" width="91" height="12" rx="1.5"
          fill="#232323" stroke="#555" stroke-width=".5"/>

    <g fill="#c7a85f" stroke="#725f34" stroke-width=".25">
      <circle cx="47" cy="14" r="1.6"/><circle cx="47" cy="18" r="1.6"/>
      <circle cx="51" cy="14" r="1.6"/><circle cx="51" cy="18" r="1.6"/>
      <circle cx="55" cy="14" r="1.6"/><circle cx="55" cy="18" r="1.6"/>
      <circle cx="59" cy="14" r="1.6"/><circle cx="59" cy="18" r="1.6"/>
      <circle cx="63" cy="14" r="1.6"/><circle cx="63" cy="18" r="1.6"/>
      <circle cx="67" cy="14" r="1.6"/><circle cx="67" cy="18" r="1.6"/>
      <circle cx="71" cy="14" r="1.6"/><circle cx="71" cy="18" r="1.6"/>
      <circle cx="75" cy="14" r="1.6"/><circle cx="75" cy="18" r="1.6"/>
      <circle cx="79" cy="14" r="1.6"/><circle cx="79" cy="18" r="1.6"/>
      <circle cx="83" cy="14" r="1.6"/><circle cx="83" cy="18" r="1.6"/>
      <circle cx="87" cy="14" r="1.6"/><circle cx="87" cy="18" r="1.6"/>
      <circle cx="91" cy="14" r="1.6"/><circle cx="91" cy="18" r="1.6"/>
      <circle cx="95" cy="14" r="1.6"/><circle cx="95" cy="18" r="1.6"/>
      <circle cx="99" cy="14" r="1.6"/><circle cx="99" cy="18" r="1.6"/>
      <circle cx="103" cy="14" r="1.6"/><circle cx="103" cy="18" r="1.6"/>
      <circle cx="107" cy="14" r="1.6"/><circle cx="107" cy="18" r="1.6"/>
      <circle cx="111" cy="14" r="1.6"/><circle cx="111" cy="18" r="1.6"/>
      <circle cx="115" cy="14" r="1.6"/><circle cx="115" cy="18" r="1.6"/>
      <circle cx="119" cy="14" r="1.6"/><circle cx="119" cy="18" r="1.6"/>
      <circle cx="123" cy="14" r="1.6"/><circle cx="123" cy="18" r="1.6"/>
    </g>

    <text x="89" y="28" text-anchor="middle" fill="#fff"
          font-size="4" font-family="Arial, sans-serif" font-weight="bold">
      Raspberry Pi 5
    </text>

    <!-- ================= CPU / SoC ================= -->
    <rect x="69" y="42" width="34" height="34" rx="2"
          fill="#252525" stroke="#555" stroke-width=".7"/>
    <text x="86" y="56" text-anchor="middle" fill="#777"
          font-size="3.4" font-family="monospace">BCM2712</text>
    <text x="86" y="62" text-anchor="middle" fill="#666"
          font-size="2.5" font-family="monospace">CPU</text>

    <!-- ================= RP1 I/O CONTROLLER ================= -->
    <rect x="112" y="41" width="23" height="23" rx="1.5"
          fill="#292929" stroke="#555" stroke-width=".6"/>
    <text x="123.5" y="54" text-anchor="middle" fill="#747474"
          font-size="3" font-family="monospace">RP1</text>

    <!-- ================= RAM ================= -->
    <rect x="43" y="42" width="19" height="28" rx="1.5"
          fill="#303030" stroke="#555" stroke-width=".6"/>
    <text x="52.5" y="57" text-anchor="middle" fill="#777"
          font-size="2.7" font-family="monospace">RAM</text>

    <!-- ================= USB-C POWER ================= -->
    <rect x="25" y="102" width="24" height="12" rx="3"
          fill="url(#rpi5Metal)" stroke="#777" stroke-width=".7"/>
    <rect x="28" y="105" width="18" height="6" rx="2.5" fill="#333"/>

    <!-- ================= DUAL MICRO-HDMI ================= -->
    <g>
      <rect x="55" y="105" width="18" height="8" rx="1.2"
            fill="url(#rpi5Metal)" stroke="#747474" stroke-width=".6"/>
      <rect x="77" y="105" width="18" height="8" rx="1.2"
            fill="url(#rpi5Metal)" stroke="#747474" stroke-width=".6"/>
      <rect x="59" y="107" width="10" height="4" fill="#222"/>
      <rect x="81" y="107" width="10" height="4" fill="#222"/>
    </g>

    <!-- ================= USB PORTS ================= -->
    <g>
      <rect x="144" y="30" width="26" height="17" rx="1"
            fill="url(#rpi5Metal)" stroke="#666" stroke-width=".7"/>
      <rect x="144" y="51" width="26" height="17" rx="1"
            fill="url(#rpi5Metal)" stroke="#666" stroke-width=".7"/>

      <rect x="148" y="33" width="18" height="11" rx=".8" fill="#2f2f2f"/>
      <rect x="148" y="54" width="18" height="11" rx=".8" fill="#2f2f2f"/>
    </g>

    <!-- ================= ETHERNET ================= -->
    <rect x="142" y="76" width="29" height="29" rx="2"
          fill="url(#rpi5Metal)" stroke="#666" stroke-width=".8"/>
    <rect x="147" y="82" width="19" height="18" rx="1" fill="#3e3e3e"/>

    <!-- ================= CSI/DSI CONNECTORS ================= -->
    <g fill="#eeeeee" stroke="#8f8f8f" stroke-width=".45">
      <rect x="108" y="104" width="18" height="8" rx="1"/>
      <rect x="129" y="104" width="18" height="8" rx="1"/>
    </g>

    <!-- ================= M.2 / PCIe FFC ================= -->
    <rect x="17" y="51" width="10" height="34" rx="1.5"
          fill="#212121" stroke="#555" stroke-width=".6"/>
    <text x="22" y="70" transform="rotate(-90 22 70)" text-anchor="middle"
          fill="#e5e5e5" font-size="2.6" font-family="monospace">PCIe</text>

    <!-- ================= microSD SLOT ================= -->
    <rect x="15" y="34" width="16" height="12" rx="1.5"
          fill="#2e2e2e" stroke="#666" stroke-width=".6"/>
    <rect x="17" y="36" width="12" height="8" rx=".8" fill="#111"/>
    <text x="23" y="49" text-anchor="middle" fill="#fff"
          font-size="2.3" font-family="monospace">microSD</text>

    <!-- ================= FAN HEADER ================= -->
    <rect x="133" y="29" width="8" height="8" rx="1"
          fill="#f0f0f0" stroke="#a0a0a0" stroke-width=".4"/>
    <g fill="#bbb">
      <circle cx="135" cy="33" r=".8"/>
      <circle cx="137" cy="33" r=".8"/>
      <circle cx="139" cy="33" r=".8"/>
    </g>

    <!-- ================= RTC BATTERY HEADER ================= -->
    <rect x="34" y="106" width="12" height="6" rx="1"
          fill="#efefef" stroke="#999" stroke-width=".4"/>

    <!-- ================= POWER BUTTON ================= -->
    <circle cx="28" cy="91" r="4.2" fill="#d6d6d6" stroke="#777" stroke-width=".6"/>
    <text x="28" y="98" text-anchor="middle" fill="#fff"
          font-size="2.5" font-family="monospace">PWR</text>

    <!-- ================= STATUS LED ================= -->
    <circle cx="36" cy="91" r="1.8" fill="#e35f4c" stroke="#7b3027" stroke-width=".35"/>

    <!-- ================= SMALL COMPONENTS ================= -->
    <g fill="#d8d2a5" stroke="#666" stroke-width=".22">
      <rect x="39" y="81" width="7" height="3" rx=".4"/>
      <rect x="49" y="81" width="7" height="3" rx=".4"/>
      <rect x="59" y="81" width="7" height="3" rx=".4"/>
      <rect x="106" y="70" width="7" height="3" rx=".4"/>
      <rect x="116" y="70" width="7" height="3" rx=".4"/>
      <rect x="126" y="70" width="7" height="3" rx=".4"/>
      <rect x="106" y="78" width="7" height="3" rx=".4"/>
      <rect x="116" y="78" width="7" height="3" rx=".4"/>
      <rect x="126" y="78" width="7" height="3" rx=".4"/>
    </g>

    <!-- ================= HDMI / BOARD MARKINGS ================= -->
    <text x="74" y="97" text-anchor="middle" fill="#fff"
          font-size="4" font-family="Arial, sans-serif" font-weight="bold">
      HDMI
    </text>

    <text x="87" y="34" text-anchor="middle" fill="#d7ffe2"
          font-size="3" font-family="Arial, sans-serif">
      Raspberry Pi
    </text>

    <!-- ================= SIMULATOR CONNECTION HINTS ================= -->
    <g fill="#cfcfcf" opacity=".95">
      <!-- 40-pin logical breakout points placed above header -->
      <circle cx="47" cy="0" r="1.3"/><circle cx="51" cy="0" r="1.3"/>
      <circle cx="55" cy="0" r="1.3"/><circle cx="59" cy="0" r="1.3"/>
      <circle cx="63" cy="0" r="1.3"/><circle cx="67" cy="0" r="1.3"/>
      <circle cx="71" cy="0" r="1.3"/><circle cx="75" cy="0" r="1.3"/>
      <circle cx="79" cy="0" r="1.3"/><circle cx="83" cy="0" r="1.3"/>
      <circle cx="87" cy="0" r="1.3"/><circle cx="91" cy="0" r="1.3"/>
      <circle cx="95" cy="0" r="1.3"/><circle cx="99" cy="0" r="1.3"/>
      <circle cx="103" cy="0" r="1.3"/><circle cx="107" cy="0" r="1.3"/>
      <circle cx="111" cy="0" r="1.3"/><circle cx="115" cy="0" r="1.3"/>
      <circle cx="119" cy="0" r="1.3"/><circle cx="123" cy="0" r="1.3"/>
    </g>
  `,

  pins: [
    // Raspberry Pi 40-pin header — BCM numbering / power labels
    { id:'3V3_1',   x:47,  y:0, type:'power',   label:'Pin 1 - 3.3V' },
    { id:'5V_1',    x:51,  y:0, type:'power',   label:'Pin 2 - 5V' },
    { id:'GPIO2',   x:55,  y:0, type:'digital', label:'Pin 3 - GPIO2 / SDA1' },
    { id:'5V_2',    x:59,  y:0, type:'power',   label:'Pin 4 - 5V' },
    { id:'GPIO3',   x:63,  y:0, type:'digital', label:'Pin 5 - GPIO3 / SCL1' },
    { id:'GND1',    x:67,  y:0, type:'gnd',     label:'Pin 6 - GND' },
    { id:'GPIO4',   x:71,  y:0, type:'digital', label:'Pin 7 - GPIO4' },
    { id:'GPIO14',  x:75,  y:0, type:'digital', label:'Pin 8 - GPIO14 / TXD0' },
    { id:'GND2',    x:79,  y:0, type:'gnd',     label:'Pin 9 - GND' },
    { id:'GPIO15',  x:83,  y:0, type:'digital', label:'Pin 10 - GPIO15 / RXD0' },
    { id:'GPIO17',  x:87,  y:0, type:'digital', label:'Pin 11 - GPIO17' },
    { id:'GPIO18',  x:91,  y:0, type:'digital', label:'Pin 12 - GPIO18 / PWM0' },
    { id:'GPIO27',  x:95,  y:0, type:'digital', label:'Pin 13 - GPIO27' },
    { id:'GND3',    x:99,  y:0, type:'gnd',     label:'Pin 14 - GND' },
    { id:'GPIO22',  x:103, y:0, type:'digital', label:'Pin 15 - GPIO22' },
    { id:'GPIO23',  x:107, y:0, type:'digital', label:'Pin 16 - GPIO23' },
    { id:'3V3_2',   x:111, y:0, type:'power',   label:'Pin 17 - 3.3V' },
    { id:'GPIO24',  x:115, y:0, type:'digital', label:'Pin 18 - GPIO24' },
    { id:'GPIO10',  x:119, y:0, type:'digital', label:'Pin 19 - GPIO10 / MOSI' },
    { id:'GND4',    x:123, y:0, type:'gnd',     label:'Pin 20 - GND' },

    { id:'GPIO9',   x:127, y:0, type:'digital', label:'Pin 21 - GPIO9 / MISO' },
    { id:'GPIO25',  x:131, y:0, type:'digital', label:'Pin 22 - GPIO25' },
    { id:'GPIO11',  x:135, y:0, type:'digital', label:'Pin 23 - GPIO11 / SCLK' },
    { id:'GPIO8',   x:139, y:0, type:'digital', label:'Pin 24 - GPIO8 / CE0' },
    { id:'GND5',    x:143, y:0, type:'gnd',     label:'Pin 25 - GND' },
    { id:'GPIO7',   x:147, y:0, type:'digital', label:'Pin 26 - GPIO7 / CE1' },
    { id:'GPIO0',   x:151, y:0, type:'digital', label:'Pin 27 - GPIO0 / ID_SD' },
    { id:'GPIO1',   x:155, y:0, type:'digital', label:'Pin 28 - GPIO1 / ID_SC' },
    { id:'GPIO5',   x:159, y:0, type:'digital', label:'Pin 29 - GPIO5' },
    { id:'GND6',    x:163, y:0, type:'gnd',     label:'Pin 30 - GND' },
    { id:'GPIO6',   x:167, y:0, type:'digital', label:'Pin 31 - GPIO6' },
    { id:'GPIO12',  x:171, y:0, type:'digital', label:'Pin 32 - GPIO12 / PWM0' },
    { id:'GPIO13',  x:175, y:0, type:'digital', label:'Pin 33 - GPIO13 / PWM1' },
    { id:'GND7',    x:179, y:0, type:'gnd',     label:'Pin 34 - GND' },
    { id:'GPIO19',  x:183, y:0, type:'digital', label:'Pin 35 - GPIO19 / PCM_FS' },
    { id:'GPIO16',  x:187, y:0, type:'digital', label:'Pin 36 - GPIO16' },
    { id:'GPIO26',  x:191, y:0, type:'digital', label:'Pin 37 - GPIO26' },
    { id:'GPIO20',  x:195, y:0, type:'digital', label:'Pin 38 - GPIO20 / PCM_DIN' },
    { id:'GND8',    x:199, y:0, type:'gnd',     label:'Pin 39 - GND' },
    { id:'GPIO21',  x:203, y:0, type:'digital', label:'Pin 40 - GPIO21 / PCM_DOUT' }
  ],

  defaults: {
    label: 'Raspberry Pi 5'
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
  raspberryPi4: {
  id: 'raspberryPi4',
  label: 'Raspberry Pi 4 Model B',
  category: 'Controllers',
  desc: 'Raspberry Pi 4 Model B single-board computer with 40-pin GPIO, dual micro-HDMI, USB 3.0, USB 2.0, Gigabit Ethernet and CSI/DSI interfaces',
  w: 190,
  h: 130,

  svg: `
    <defs>
      <linearGradient id="rpi4Pcb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#45b95f"/>
        <stop offset="0.55" stop-color="#2aa54d"/>
        <stop offset="1" stop-color="#16813a"/>
      </linearGradient>

      <linearGradient id="rpi4Metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#efefef"/>
        <stop offset="1" stop-color="#8a8a8a"/>
      </linearGradient>
    </defs>

    <!-- ================= PCB ================= -->
    <rect x="8" y="8" width="174" height="114" rx="8"
          fill="url(#rpi4Pcb)" stroke="#126a32" stroke-width="1.2"/>

    <!-- ================= MOUNTING HOLES ================= -->
    <g fill="#f0f0f0" stroke="#888" stroke-width=".7">
      <circle cx="17" cy="17" r="4.5"/>
      <circle cx="173" cy="17" r="4.5"/>
      <circle cx="17" cy="113" r="4.5"/>
      <circle cx="173" cy="113" r="4.5"/>
    </g>

    <!-- ================= 40 PIN GPIO HEADER ================= -->
    <rect x="42" y="10" width="93" height="12" rx="1.5"
          fill="#202020" stroke="#555" stroke-width=".5"/>

    <g fill="#c7a85f" stroke="#725f34" stroke-width=".25">
      <circle cx="46" cy="14" r="1.5"/><circle cx="46" cy="18" r="1.5"/>
      <circle cx="50" cy="14" r="1.5"/><circle cx="50" cy="18" r="1.5"/>
      <circle cx="54" cy="14" r="1.5"/><circle cx="54" cy="18" r="1.5"/>
      <circle cx="58" cy="14" r="1.5"/><circle cx="58" cy="18" r="1.5"/>
      <circle cx="62" cy="14" r="1.5"/><circle cx="62" cy="18" r="1.5"/>
      <circle cx="66" cy="14" r="1.5"/><circle cx="66" cy="18" r="1.5"/>
      <circle cx="70" cy="14" r="1.5"/><circle cx="70" cy="18" r="1.5"/>
      <circle cx="74" cy="14" r="1.5"/><circle cx="74" cy="18" r="1.5"/>
      <circle cx="78" cy="14" r="1.5"/><circle cx="78" cy="18" r="1.5"/>
      <circle cx="82" cy="14" r="1.5"/><circle cx="82" cy="18" r="1.5"/>
      <circle cx="86" cy="14" r="1.5"/><circle cx="86" cy="18" r="1.5"/>
      <circle cx="90" cy="14" r="1.5"/><circle cx="90" cy="18" r="1.5"/>
      <circle cx="94" cy="14" r="1.5"/><circle cx="94" cy="18" r="1.5"/>
      <circle cx="98" cy="14" r="1.5"/><circle cx="98" cy="18" r="1.5"/>
      <circle cx="102" cy="14" r="1.5"/><circle cx="102" cy="18" r="1.5"/>
      <circle cx="106" cy="14" r="1.5"/><circle cx="106" cy="18" r="1.5"/>
      <circle cx="110" cy="14" r="1.5"/><circle cx="110" cy="18" r="1.5"/>
      <circle cx="114" cy="14" r="1.5"/><circle cx="114" cy="18" r="1.5"/>
      <circle cx="118" cy="14" r="1.5"/><circle cx="118" cy="18" r="1.5"/>
      <circle cx="122" cy="14" r="1.5"/><circle cx="122" cy="18" r="1.5"/>
    </g>

    <text x="88" y="28" text-anchor="middle" fill="#ffffff"
          font-size="4" font-family="Arial, sans-serif" font-weight="bold">
      Raspberry Pi 4 Model B
    </text>

    <!-- ================= BCM2711 CPU ================= -->
    <rect x="76" y="45" width="34" height="34" rx="2"
          fill="#252525" stroke="#555" stroke-width=".7"/>
    <text x="93" y="58" text-anchor="middle" fill="#777"
          font-size="3.4" font-family="monospace">BCM2711</text>
    <text x="93" y="64" text-anchor="middle" fill="#666"
          font-size="2.5" font-family="monospace">CPU</text>

    <!-- ================= RAM ================= -->
    <rect x="116" y="45" width="20" height="28" rx="1.5"
          fill="#303030" stroke="#555" stroke-width=".6"/>
    <text x="126" y="60" text-anchor="middle" fill="#777"
          font-size="2.8" font-family="monospace">RAM</text>

    <!-- ================= WIFI / BLUETOOTH MODULE ================= -->
    <rect x="38" y="34" width="24" height="28" rx="1.5"
          fill="#c9c9c9" stroke="#7e7e7e" stroke-width=".6"/>
    <text x="50" y="47" text-anchor="middle" fill="#666"
          font-size="2.6" font-family="monospace">WiFi</text>
    <text x="50" y="52" text-anchor="middle" fill="#666"
          font-size="2.4" font-family="monospace">BT 5.0</text>

    <!-- ================= microSD SLOT ================= -->
    <rect x="10" y="46" width="15" height="22" rx="1.5"
          fill="#202020" stroke="#555" stroke-width=".6"/>
    <text x="17.5" y="58" transform="rotate(-90 17.5 58)"
          text-anchor="middle" fill="#eeeeee"
          font-size="2.4" font-family="monospace">microSD</text>

    <!-- ================= DSI DISPLAY CONNECTOR ================= -->
    <rect x="29" y="60" width="9" height="30" rx="1"
          fill="#efefef" stroke="#999" stroke-width=".4"/>
    <text x="33.5" y="75" transform="rotate(-90 33.5 75)"
          text-anchor="middle" fill="#777"
          font-size="2.2" font-family="monospace">DSI</text>

    <!-- ================= CSI CAMERA CONNECTOR ================= -->
    <rect x="120" y="85" width="9" height="28" rx="1"
          fill="#efefef" stroke="#999" stroke-width=".4"/>
    <text x="124.5" y="99" transform="rotate(-90 124.5 99)"
          text-anchor="middle" fill="#777"
          font-size="2.2" font-family="monospace">CSI</text>

    <!-- ================= USB-C POWER ================= -->
    <rect x="29" y="104" width="24" height="12" rx="3"
          fill="url(#rpi4Metal)" stroke="#777" stroke-width=".7"/>
    <rect x="32" y="107" width="18" height="6" rx="2.5" fill="#333"/>

    <!-- ================= DUAL MICRO HDMI ================= -->
    <g>
      <rect x="57" y="105" width="18" height="8" rx="1.2"
            fill="url(#rpi4Metal)" stroke="#747474" stroke-width=".6"/>
      <rect x="79" y="105" width="18" height="8" rx="1.2"
            fill="url(#rpi4Metal)" stroke="#747474" stroke-width=".6"/>
      <rect x="61" y="107" width="10" height="4" fill="#222"/>
      <rect x="83" y="107" width="10" height="4" fill="#222"/>
    </g>

    <!-- ================= AUDIO JACK ================= -->
    <rect x="104" y="104" width="13" height="12" rx="2"
          fill="#242424" stroke="#555" stroke-width=".6"/>
    <circle cx="110.5" cy="110" r="3.2" fill="#111"/>

    <!-- ================= USB 3.0 ================= -->
    <g>
      <rect x="145" y="44" width="27" height="18" rx="1"
            fill="url(#rpi4Metal)" stroke="#666" stroke-width=".7"/>
      <rect x="149" y="47" width="19" height="12" rx=".8" fill="#2d2d2d"/>
      <rect x="150.5" y="49" width="16" height="3" fill="#3775bb"/>
    </g>

    <!-- ================= USB 2.0 ================= -->
    <g>
      <rect x="145" y="70" width="27" height="18" rx="1"
            fill="url(#rpi4Metal)" stroke="#666" stroke-width=".7"/>
      <rect x="149" y="73" width="19" height="12" rx=".8" fill="#2d2d2d"/>
    </g>

    <!-- ================= GIGABIT ETHERNET ================= -->
    <rect x="143" y="18" width="31" height="24" rx="2"
          fill="url(#rpi4Metal)" stroke="#666" stroke-width=".8"/>
    <rect x="148" y="23" width="21" height="14" rx="1" fill="#3d3d3d"/>
    <text x="158.5" y="16" text-anchor="middle" fill="#fff"
          font-size="2.5" font-family="monospace">ETH</text>

    <!-- ================= PoE HAT HEADER ================= -->
    <rect x="132" y="24" width="8" height="12" rx="1"
          fill="#202020" stroke="#555" stroke-width=".5"/>
    <g fill="#c7a85f">
      <circle cx="134" cy="27" r=".9"/><circle cx="138" cy="27" r=".9"/>
      <circle cx="134" cy="33" r=".9"/><circle cx="138" cy="33" r=".9"/>
    </g>

    <!-- ================= SMALL COMPONENTS ================= -->
    <g fill="#d8d2a5" stroke="#666" stroke-width=".22">
      <rect x="44" y="71" width="7" height="3" rx=".4"/>
      <rect x="54" y="71" width="7" height="3" rx=".4"/>
      <rect x="64" y="71" width="7" height="3" rx=".4"/>
      <rect x="114" y="74" width="7" height="3" rx=".4"/>
      <rect x="124" y="74" width="7" height="3" rx=".4"/>
      <rect x="134" y="74" width="7" height="3" rx=".4"/>
    </g>

    <!-- ================= BOARD MARKINGS ================= -->
    <text x="62" y="86" fill="#e9ffe9"
          font-size="5.5" font-family="Arial, sans-serif" font-weight="bold">
      Raspberry Pi
    </text>

    <text x="70" y="95" fill="#ffffff"
          font-size="3.5" font-family="monospace">
      HDMI
    </text>

    <!-- ================= SIMULATOR CONNECTION HINTS ================= -->
    <g fill="#cfcfcf" opacity=".95">
      <!-- 40 header points -->
      <circle cx="46" cy="0" r="1.3"/><circle cx="50" cy="0" r="1.3"/>
      <circle cx="54" cy="0" r="1.3"/><circle cx="58" cy="0" r="1.3"/>
      <circle cx="62" cy="0" r="1.3"/><circle cx="66" cy="0" r="1.3"/>
      <circle cx="70" cy="0" r="1.3"/><circle cx="74" cy="0" r="1.3"/>
      <circle cx="78" cy="0" r="1.3"/><circle cx="82" cy="0" r="1.3"/>
      <circle cx="86" cy="0" r="1.3"/><circle cx="90" cy="0" r="1.3"/>
      <circle cx="94" cy="0" r="1.3"/><circle cx="98" cy="0" r="1.3"/>
      <circle cx="102" cy="0" r="1.3"/><circle cx="106" cy="0" r="1.3"/>
      <circle cx="110" cy="0" r="1.3"/><circle cx="114" cy="0" r="1.3"/>
      <circle cx="118" cy="0" r="1.3"/><circle cx="122" cy="0" r="1.3"/>
      <circle cx="126" cy="0" r="1.3"/><circle cx="130" cy="0" r="1.3"/>
      <circle cx="134" cy="0" r="1.3"/><circle cx="138" cy="0" r="1.3"/>
      <circle cx="142" cy="0" r="1.3"/><circle cx="146" cy="0" r="1.3"/>
      <circle cx="150" cy="0" r="1.3"/><circle cx="154" cy="0" r="1.3"/>
      <circle cx="158" cy="0" r="1.3"/><circle cx="162" cy="0" r="1.3"/>
      <circle cx="166" cy="0" r="1.3"/><circle cx="170" cy="0" r="1.3"/>
      <circle cx="174" cy="0" r="1.3"/><circle cx="178" cy="0" r="1.3"/>
      <circle cx="182" cy="0" r="1.3"/><circle cx="186" cy="0" r="1.3"/>
      <circle cx="190" cy="0" r="1.3"/><circle cx="194" cy="0" r="1.3"/>
      <circle cx="198" cy="0" r="1.3"/><circle cx="202" cy="0" r="1.3"/>
    </g>
  `,

  pins: [
    { id:'3V3_1',  x:46,  y:0, type:'power',   label:'Pin 1 - 3.3V' },
    { id:'5V_1',   x:50,  y:0, type:'power',   label:'Pin 2 - 5V' },
    { id:'GPIO2',  x:54,  y:0, type:'digital', label:'Pin 3 - GPIO2 / SDA1' },
    { id:'5V_2',   x:58,  y:0, type:'power',   label:'Pin 4 - 5V' },
    { id:'GPIO3',  x:62,  y:0, type:'digital', label:'Pin 5 - GPIO3 / SCL1' },
    { id:'GND1',   x:66,  y:0, type:'gnd',     label:'Pin 6 - GND' },
    { id:'GPIO4',  x:70,  y:0, type:'digital', label:'Pin 7 - GPIO4' },
    { id:'GPIO14', x:74,  y:0, type:'digital', label:'Pin 8 - GPIO14 / TXD0' },
    { id:'GND2',   x:78,  y:0, type:'gnd',     label:'Pin 9 - GND' },
    { id:'GPIO15', x:82,  y:0, type:'digital', label:'Pin 10 - GPIO15 / RXD0' },
    { id:'GPIO17', x:86,  y:0, type:'digital', label:'Pin 11 - GPIO17' },
    { id:'GPIO18', x:90,  y:0, type:'digital', label:'Pin 12 - GPIO18 / PWM0' },
    { id:'GPIO27', x:94,  y:0, type:'digital', label:'Pin 13 - GPIO27' },
    { id:'GND3',   x:98,  y:0, type:'gnd',     label:'Pin 14 - GND' },
    { id:'GPIO22', x:102, y:0, type:'digital', label:'Pin 15 - GPIO22' },
    { id:'GPIO23', x:106, y:0, type:'digital', label:'Pin 16 - GPIO23' },
    { id:'3V3_2',  x:110, y:0, type:'power',   label:'Pin 17 - 3.3V' },
    { id:'GPIO24', x:114, y:0, type:'digital', label:'Pin 18 - GPIO24' },
    { id:'GPIO10', x:118, y:0, type:'digital', label:'Pin 19 - GPIO10 / MOSI' },
    { id:'GND4',   x:122, y:0, type:'gnd',     label:'Pin 20 - GND' },

    { id:'GPIO9',  x:126, y:0, type:'digital', label:'Pin 21 - GPIO9 / MISO' },
    { id:'GPIO25', x:130, y:0, type:'digital', label:'Pin 22 - GPIO25' },
    { id:'GPIO11', x:134, y:0, type:'digital', label:'Pin 23 - GPIO11 / SCLK' },
    { id:'GPIO8',  x:138, y:0, type:'digital', label:'Pin 24 - GPIO8 / CE0' },
    { id:'GND5',   x:142, y:0, type:'gnd',     label:'Pin 25 - GND' },
    { id:'GPIO7',  x:146, y:0, type:'digital', label:'Pin 26 - GPIO7 / CE1' },
    { id:'GPIO0',  x:150, y:0, type:'digital', label:'Pin 27 - GPIO0 / ID_SD' },
    { id:'GPIO1',  x:154, y:0, type:'digital', label:'Pin 28 - GPIO1 / ID_SC' },
    { id:'GPIO5',  x:158, y:0, type:'digital', label:'Pin 29 - GPIO5' },
    { id:'GND6',   x:162, y:0, type:'gnd',     label:'Pin 30 - GND' },
    { id:'GPIO6',  x:166, y:0, type:'digital', label:'Pin 31 - GPIO6' },
    { id:'GPIO12', x:170, y:0, type:'digital', label:'Pin 32 - GPIO12 / PWM0' },
    { id:'GPIO13', x:174, y:0, type:'digital', label:'Pin 33 - GPIO13 / PWM1' },
    { id:'GND7',   x:178, y:0, type:'gnd',     label:'Pin 34 - GND' },
    { id:'GPIO19', x:182, y:0, type:'digital', label:'Pin 35 - GPIO19 / PCM_FS' },
    { id:'GPIO16', x:186, y:0, type:'digital', label:'Pin 36 - GPIO16' },
    { id:'GPIO26', x:190, y:0, type:'digital', label:'Pin 37 - GPIO26' },
    { id:'GPIO20', x:194, y:0, type:'digital', label:'Pin 38 - GPIO20 / PCM_DIN' },
    { id:'GND8',   x:198, y:0, type:'gnd',     label:'Pin 39 - GND' },
    { id:'GPIO21', x:202, y:0, type:'digital', label:'Pin 40 - GPIO21 / PCM_DOUT' }
  ],

  defaults: {
    label: 'Raspberry Pi 4'
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
