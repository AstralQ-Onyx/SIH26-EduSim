# EduSim — Interactive IoT & Embedded Systems Simulator

> A full-stack, browser-based platform for hardware prototyping, firmware development, and AI-assisted embedded systems education.

EduSim combines a **2D/3D Virtual Circuit Lab**, a **Monaco-powered Web IDE**, an **Admin Dashboard**, and **Dual Local AI Copilots** into a single cohesive workspace — all running in the browser, backed by a lightweight local Node.js agent.

---

## 📁 Project Structure

```
SIHDEP/
├── index.html                   # Root redirect → platform/auth.html
├── .env                         # Firebase environment variables (do not commit)
│
├── agent/                       # Local Node.js Agent (WebSocket + HTTP)
│   ├── server.js                # WS bridge: Browser IDE ↔ arduino-cli ↔ USB
│   ├── package.json             # Dependencies: ws, serialport; devDep: pkg
│   ├── bin/                     # Auto-downloaded arduino-cli binary
│   └── dist/                    # Packaged standalone EduSimAgent.exe (via pkg)
│
├── platform/                    # Student IDE & Admin Panels
│   ├── auth.html / auth.js / auth.css          # Firebase Authentication UI
│   ├── dashboard.html / dashboard.js / dashboard.css  # Student workspace hub
│   ├── ide.js                   # Monaco Editor + Web Serial API integration
│   ├── admin_dashboard.html / admin_dashboard.js  # Admin control panel
│
├── virtual-lab/                 # 2D/3D Circuit Simulator
│   ├── lab.html / lab.js / lab.css    # 2D schematic canvas & wiring engine
│   ├── lab3d.js                 # Three.js 3D breadboard renderer
│
├── assistant_workflow/          # AI Copilot UI layers
│   ├── ai-assistant.js / ai-assistant.css   # EduSim MENTOR (IDE copilot)
│   └── lab-ai.js / lab-ai.css              # CircuitMind (Lab copilot)
│
├── components/
│   └── registry.js              # 192 KB component registry (SVG + pins + simulate())
│
├── core-engine/
│   └── simulator.js             # AVR/ESP32 emulation engine (avr8js CDN)
│
└── config/
    └── config.js                # Firebase config + backend URL switcher
```

---

## 🚀 Key Modules

### 1. 🔑 Authentication — `/platform`

| File | Purpose |
|------|---------|
| [auth.html](platform/auth.html) | Dark-themed Login / Sign-up / Password reset UI |
| [auth.js](platform/auth.js) | Firebase Authentication logic |
| [auth.css](platform/auth.css) | Auth page styles |

Entry point: `index.html` redirects directly to `platform/auth.html`.

---

### 2. 💻 Student IDE — `/platform`

| File | Purpose |
|------|---------|
| [dashboard.html](platform/dashboard.html) | Student hub — saved sketches, lab sheets, workspace options |
| [dashboard.js](platform/dashboard.js) | Dashboard logic & Firestore state management |
| [dashboard.css](platform/dashboard.css) | Dashboard styles |
| [ide.js](platform/ide.js) | Monaco Editor integration, Web Serial API, board FQBN selector |

**`ide.js`** orchestrates:
- **Monaco Editor** loaded from CDN with Web Worker support
- **Web Serial API** for real-device communication over USB
- Board target dropdown feeding `arduino-cli` FQBN strings
- Firestore-backed sketch persistence

---

### 3. 🤖 EduSim MENTOR (IDE AI Copilot) — `/assistant_workflow`

| File | Purpose |
|------|---------|
| [ai-assistant.js](assistant_workflow/ai-assistant.js) | AI tutor panel, isolated chat contexts, mode routing |
| [ai-assistant.css](assistant_workflow/ai-assistant.css) | Flex-sibling layout, panel transitions |

**4 isolated chat modes**, each maintaining separate history:

| Mode | Function |
|------|----------|
| 💬 **Assist** | General coding help, compiler warning triage |
| 🔍 **Review** | PR-style code review with exact line citations |
| 📚 **Explain** | Conceptual lectures on ISRs, I2C, SPI, etc. |
| ⚡ **Optimise** | RAM/Flash footprint, `delay()` replacement, low-power config |

The panel renders as a **horizontal flex sibling** inside the IDE body — Monaco Editor resizes gracefully, redundant toolbar buttons auto-hide.

---

### 4. 🔌 2D/3D Virtual Circuit Lab — `/virtual-lab`

| File | Purpose |
|------|---------|
| [lab.html](virtual-lab/lab.html) | Lab shell and canvas scaffold |
| [lab.js](virtual-lab/lab.js) | 2D schematic engine — drag/drop, wiring, properties inspector, Firestore sync |
| [lab.css](virtual-lab/lab.css) | Lab UI styles |
| [lab3d.js](virtual-lab/lab3d.js) | Three.js 3D breadboard renderer, mirrors 2D component coordinates |

---

### 5. ⚡ CircuitMind (Lab AI Copilot) — `/assistant_workflow`

| File | Purpose |
|------|---------|
| [lab-ai.js](assistant_workflow/lab-ai.js) | Hardware AI — live canvas reading, 3 isolated chat modes |
| [lab-ai.css](assistant_workflow/lab-ai.css) | Copilot panel styles |

**CircuitMind** reads `window.components` and `window.wires` live from the simulation:

| Mode | Function |
|------|----------|
| 🔌 **Wire** | Outputs structured pin connection tables (source → destination) |
| 💻 **Build** | Generates compilable C++ mapped to canvas components; includes **"Apply to Editor"** button |
| 🔍 **Check** | Safety checks — floating pins, missing GND rails, voltage mismatches |

---

### 6. 🧩 Component Registry — `/components`

| File | Purpose |
|------|---------|
| [registry.js](components/registry.js) | `EDUSIM_COMPONENTS` object — all built-in hardware components |

Each component entry contains:
- `id`, `label`, `category`, `desc`
- `w`, `h` — canvas dimensions
- `svg` — inline SVG markup (no `<svg>` wrapper)
- `pins[]` — `{ id, x, y, type: 'digital'|'analog'|'power'|'gnd', label }`
- `defaults`, `props[]` — inspector panel configuration
- `simulate(state, inputs)` — tick function returning pin outputs

**Built-in controllers:** ESP32 Dev Module, ESP8266 NodeMCU, Arduino UNO R3, Arduino Nano, and more.

---

### 7. ⚙️ AVR/ESP32 Simulator Engine — `/core-engine`

| File | Purpose |
|------|---------|
| [simulator.js](core-engine/simulator.js) | `window.EduSimulator` — compile → emulate → drive virtual pins |

**Architecture:**
1. Sends sketch to local agent `/compile-hex` endpoint
2. For **AVR boards** (UNO, Nano): loads `avr8js` from ESM CDN, emulates ATmega328P at 16 MHz
3. For **ESP32/non-AVR**: runs a **Lexical Pseudo-Simulator** — transpiles Arduino C++ to JS, runs async `setup()` + `loop()` in a sandboxed `Function()`
4. Pin changes fire `onPinChange(port, pin, value)` callbacks driving component animations

**Exported API:** `window.EduSimulator.compileAndSimulate(code, boardId, callbacks)`, `.stopSimulation()`, `.isRunning()`

---

### 8. 🛡️ Admin Dashboard — `/platform`

| File | Purpose |
|------|---------|
| [admin_dashboard.html](platform/admin_dashboard.html) | Admin control center |
| [admin_dashboard.js](platform/admin_dashboard.js) | User management, privilege grants, custom component registration |

Admins can register new hardware components by pasting SVG paths and uploading `.glb` 3D assets — these sync to Firestore and appear in the lab palette.

---

### 9. 🤖 Local Agent — `/agent`

| File | Purpose |
|------|---------|
| [server.js](agent/server.js) | Node.js Express-like server — WS + HTTP |
| [package.json](agent/package.json) | `ws`, `serialport`; packaged with `pkg` |

**Two transports on two ports:**

| Port | Protocol | Purpose |
|------|----------|---------|
| `3745` | WebSocket | IDE compile, upload, serial monitor |
| `3746` | HTTP REST | Virtual lab `/compile-hex`, AI proxy `/api/ai/generate` |

**AI routing (server.js):**
- If `GEMINI_API_KEY` env var is set → routes to **Google Gemini 1.5 Flash**
- Otherwise → proxies to local **Ollama** at `http://127.0.0.1:11434`

**Auto-setup on first run:**
- Downloads `arduino-cli` binary if missing (Windows: PowerShell `Invoke-WebRequest`, Linux/macOS: install.sh)
- Installs `arduino:avr` and `esp32:esp32` cores automatically

---

### 10. ⚙️ Central Config — `/config`

| File | Purpose |
|------|---------|
| [config.js](config/config.js) | Firebase SDK config + backend URL switcher |

`BACKEND_URL` auto-switches: `http://127.0.0.1:3746` locally, `https://edusim-agent.onrender.com` in production.

---

## ⚙️ Running Locally

### Prerequisites

- **Node.js** ≥ 16
- **Arduino CLI** is auto-downloaded on first agent start (no manual install needed)
- **AI (choose one):**
  - **Local:** [Ollama](https://ollama.com/) running with `ollama pull llama3.2`
  - **Cloud:** A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/))

### Step 1 — Start the Local Agent

```bash
cd agent
npm install
node server.js
```

The agent starts on:
- `ws://127.0.0.1:3745` — WebSocket (IDE compile/upload/serial)
- `http://127.0.0.1:3746` — HTTP REST (virtual lab compile + AI proxy)

On first run it will auto-download `arduino-cli` and install the AVR and ESP32 cores (~5 min).

### Step 2 — Open the App

Open any of these directly in your browser (no build step needed):

| Page | Path |
|------|------|
| Entry / redirect | `index.html` |
| Login / Signup | `platform/auth.html` |
| Student Dashboard | `platform/dashboard.html` |
| Virtual Circuit Lab | `virtual-lab/lab.html` |
| Admin Console | `platform/admin_dashboard.html` |

---

## ☁️ Free Cloud Deployment

Deploy the full stack for free for hackathon demos or classroom use.

### Step 1 — Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Click **Create API Key** — the **Gemini 1.5 Flash** free tier supports 15 RPM, ideal for demos.

### Step 2 — Deploy the Backend on Render
1. Push this repo to GitHub.
2. Sign up on [Render](https://render.com/) (free tier).
3. Create a **Web Service**, connect the repo, and set:
   - **Root Directory:** `agent`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. In the **Environment** tab, add:
   - `GEMINI_API_KEY` = `<your key>`
5. Deploy — copy the live URL (e.g. `https://edusim-agent.onrender.com`).

### Step 3 — Deploy the Frontend on Vercel / Netlify / GitHub Pages
1. Sign up on [Vercel](https://vercel.com/) (free).
2. Import the GitHub repo, set root to `/` (static site — no build command needed).
3. Deploy. The frontend auto-detects the production hostname and routes to your Render backend via `config/config.js`.

---

## 🔧 Packaging the Agent as a Standalone `.exe`

The agent can be compiled to a self-contained Windows binary (no Node.js install required):

```bash
cd agent
npm install
npm run build
# Output: dist/EduSimAgent.exe
```

Students double-click `EduSimAgent.exe` — it auto-configures everything and opens the WS/HTTP ports.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Code Editor | Monaco Editor (CDN) |
| 3D Rendering | Three.js (CDN) |
| AVR Emulation | avr8js (ESM CDN) |
| Backend | Node.js (ws, serialport) |
| Database / Auth | Firebase Firestore + Authentication |
| AI (local) | Ollama + llama3.2 |
| AI (cloud) | Google Gemini 1.5 Flash |
| Packaging | pkg (node → standalone binary) |

---

## 📄 License

This project was built for **Smart India Hackathon 2026**. All rights reserved.