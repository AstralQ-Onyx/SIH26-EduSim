# EduSim - Interactive IoT & Embedded Systems Simulator

EduSim is a state-of-the-art, interactive Web-based IoT and Embedded Systems Simulator designed for hardware prototyping, schematic design, firmware development, and interactive AI mentoring. 

It provides an all-in-one simulator workspace integrating a **2D/3D Virtual Circuit Lab**, a **Monaco-based Web IDE**, an **Admin Control Panel**, and **Dual Local AI Copilots** (EduSim MENTOR & CircuitMind) powered by local LLMs (via Ollama).

---

## 🛠️ Technology Stack

**Frontend Architecture**
*   **Core**: HTML5, CSS3, Vanilla JavaScript (zero heavy frameworks for maximum performance).
*   **Editor**: Monaco Editor (VS Code engine) via CDN.
*   **3D Rendering**: Three.js for interactive circuit visualization.
*   **Hardware Interface**: Web Serial API (`esptool-js`, `avrgirl-arduino`) for direct browser-to-board flashing.

**Backend & Infrastructure (Cloud Native)**
*   **Compiler Backend**: Node.js & Express API.
*   **Containerization**: Docker (Debian-based container running `arduino-cli` and required board cores).
*   **Cloud Hosting**: Vercel (Frontend), Render.com (Dockerized Cloud Compiler).
*   **Proxying**: Vercel Serverless Configs (`vercel.json`) for seamless third-party cookie bypass.

**Authentication & Database**
*   **Auth Provider**: Firebase Authentication.
*   **OAuth**: Google OAuth 2.0 (First-party proxy architecture to bypass modern Chrome/Safari popup blockers).
*   **Database**: Firebase Firestore (NoSQL) for user profiles, saved sketches, and custom virtual components.

**AI Integration**
*   **Local AI**: Ollama (Llama 3.2) for completely offline, private AI assistance.
*   **Cloud AI**: Google Gemini API integration for lightweight production deployments.

---

## 🗓️ Development Timeline & Progress

### Phase 1: Core Engine & Simulation (Completed)
*   [x] Built the Monaco-powered Web IDE with syntax highlighting and auto-save.
*   [x] Developed the 2D drag-and-drop Virtual Circuit canvas.
*   [x] Implemented a synchronized 3D viewer for breadboard circuits using Three.js.
*   [x] Integrated Dual AI Copilots (EduSim MENTOR for code, CircuitMind for hardware) powered by local LLMs.

### Phase 2: Cloud Migration & Hardware (Completed)
*   [x] **Cloud Compiler**: Decoupled compilation from the local agent by containerizing `arduino-cli` in a Docker image.
*   [x] **Production Deployment**: Successfully deployed the isolated compiler backend to Render.com.
*   [x] **Web Serial Flashing**: Eliminated the need for a local USB agent server by integrating the Web Serial API directly into the browser to flash AVR and ESP microcontrollers.

### Phase 3: Enterprise Security & Auth Fixes (Completed)
*   [x] Resolved strict modern browser (Chrome 2024+) third-party cookie blocking on Vercel deployments.
*   [x] Configured `vercel.json` to proxy `/__/auth/` routes to Firebase, making Google OAuth a trusted first-party request.
*   [x] Implemented synchronized, popup-first Google Sign-In with automated redirect fallbacks.
*   [x] Modified COOP/COEP headers to allow secure cross-origin communication between the Vercel site and Google's Auth popups.

---

## 🚀 Key Modules & File Architecture

### 1. 💻 Web IDE & Student Workspace (`/platform`)
A dark-mode development platform for writing and simulating embedded firmware (C++/Arduino & MicroPython).
*   **[dashboard.html](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/dashboard.html) / [dashboard.js](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/dashboard.js) / [dashboard.css](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/dashboard.css)**: The student landing hub, displaying saved sketches, lab sheets, and workspace options.
*   **[ide.js](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/ide.js)**: Orchestrates the core code editor. Integrates the Monaco Editor with CDN workers, handles Firebase Firestore state syncs, updates board target dropdowns, and interfaces with the Web Serial API for real-world hardware connections.
*   **[ai-assistant.js](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/ai-assistant.js) / [ai-assistant.css](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/ai-assistant.css)**: Powers **EduSim MENTOR**, an AI code tutor modeled as a patient senior engineer.
    *   **Isolated Chats**: Maintains separate, persistent chat contexts and history spaces for each of its 4 modes:
        *   💬 `Assist`: General coding assistance, troubleshooting compiler warnings, and tutoring.
        *   🔍 `Review`: Structural PR-style code reviews pinpointing errors with exact line-number citations.
        *   📚 `Explain`: Conceptual lectures on embedded principles (ISRs, I2C, SPI) using everyday analogies.
        *   ⚡ `Optimise`: Code analysis targeting RAM/Flash footprint, blocking `delay()` replacement, and low-power configuration.
    *   **Dynamic Flex Layout**: Toggles as a horizontal flex sibling inside the IDE body, scaling down the Monaco Editor space gracefully and auto-hiding redundant toolbar buttons to prevent UI overlap.

### 2. 🔌 2D/3D Virtual Circuit Lab (`/virtual-lab`)
An interactive canvas allowing users to drag and drop ESP32/Arduino microcontrollers and connect hardware components.
*   **[lab.html](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab.html) / [lab.js](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab.js) / [lab.css](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab.css)**: Renders the 2D schematic simulator. Includes component placement, property configurations, dynamic wiring, and custom component loading from Firestore.
*   **[lab3d.js](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab3d.js)**: Leverages Three.js to render a fully-interactive 3D model of the current 2D circuit breadboard, matching active component coordinates.
*   **[lab-ai.js](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab-ai.js) / [lab-ai.css](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab-ai.css)**: Implements **CircuitMind**, an AI hardware assistant.
    *   **Live Canvas Reading**: Intercepts `window.components` and `window.wires` lists from the simulation to read pin types, source-to-destination connection paths, and isolated nodes.
    *   **Isolated Chats**:
        *   🔌 `Wire`: Outputs structured markdown pin connection tables showing exactly which node hooks to which board pin.
        *   💻 `Build`: Generates custom compilable C++ code mapped specifically to the components connected on the canvas. Features a **"Apply to Editor"** button for direct script injection.
        *   🔍 `Check`: Performs safety checks, highlighting missing GND rails, floating pins, or voltage level mismatches.

### 3. 🛡️ System Administration (`/platform`)
Allows instructors and administrators to monitor platform activity and customize components.
*   **[admin_dashboard.html](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/admin_dashboard.html) / [admin_dashboard.js](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/admin_dashboard.js)**: The control center for managing registered user directories, granting administrative privileges, and registering new custom hardware components by pasting 2D SVG paths and uploading 3D `.glb` assets.

### 4. 🔑 Authentication (`/platform`)
*   **[auth.html](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/auth.html) / [auth.js](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/auth.js) / [auth.css](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/auth.css)**: A dark-themed login, signup, and password recovery interface backed by Firebase Authentication.

### 5. ⚡ Local AI Agent Backend (`/agent`)
*   **[server.js](file:///d:/sih_hackathonnew/SIH26-EduSim/agent/server.js)**: A local Node.js Express server that simulates compilation routines, hosts project configs, and relays prompt context packets to a locally-served Ollama LLM endpoint (typically `llama3.2`).

---

## ⚙️ How to Run Locally

### Prerequisites
1.  **Node.js** (v18 or newer installed).
2.  **Ollama** server installed and running.
3.  Download the LLM model:
    ```bash
    ollama pull llama3.2
    ```

### Step 1: Start the Local Proxy Server
Navigate to the `agent` folder, install Node modules, and launch the server:
```bash
cd agent
npm install
node server.js
```
The server will start listening at `http://127.0.0.1:3746`.

### Step 2: Launch the App
Open the web app in any browser:
*   **Student IDE**: Open [platform/dashboard.html](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/dashboard.html).
*   **Virtual Lab**: Open [virtual-lab/lab.html](file:///d:/sih_hackathonnew/SIH26-EduSim/virtual-lab/lab.html).
*   **Admin Console**: Open [platform/admin_dashboard.html](file:///d:/sih_hackathonnew/SIH26-EduSim/platform/admin_dashboard.html).

---

## 🌐 100% Free Production Deployment (Step-by-Step Guide)

For hackathon demos or class deployment where you want the web application fully online and the AI operational instantly without demanding students run Ollama locally, deploy using this combination:

### Step 1: Get a Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google Account.
3. Click **Create API Key** and copy your key. (The Gemini 1.5 Flash Free Tier supports up to 15 requests per minute, which is perfect for development and demonstration).

### Step 2: Deploy the Backend on Render
1. Push your codebase to a **GitHub** repository.
2. Sign up on [Render](https://render.com/) (free tier).
3. Click **New +** and select **Web Service**. Connect your GitHub repository.
4. Set the following fields:
   * **Root Directory**: `agent`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
5. Go to the **Environment** tab on Render and add a new variable:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: *[Paste your Gemini API Key here]*
6. Click **Deploy**. Copy the live URL generated by Render (e.g. `https://edusim-agent.onrender.com`).

### Step 3: Deploy the Frontend on Vercel
1. Sign up on [Vercel](https://vercel.com/) (free tier).
2. Create a new project, select your GitHub repository, and choose your root project.
3. Set your environment variables in Vercel to point to your live Render backend if necessary, or let Vercel host your static frontend assets directly.
4. Once deployed, open your live link. The frontend will communicate with your Render server which handles compilation and AI requests securely and for free.