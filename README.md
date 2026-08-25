# EduSim - Interactive IoT & Embedded Systems Simulator

EduSim is a state-of-the-art, interactive Web-based IoT and Embedded Systems Simulator designed for hardware prototyping, schematic design, firmware development, and interactive AI mentoring. 

It provides an all-in-one simulator workspace integrating a **2D/3D Virtual Circuit Lab**, a **Monaco-based Web IDE**, an **Admin Control Panel**, and **Dual Local AI Copilots** (EduSim MENTOR & CircuitMind) powered by local LLMs (via Ollama).

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

## 🌐 Deployment Options (Free & Scalable)

When taking this project public, you can choose between two free deployment strategies depending on how you want to handle the AI.

### Option A: Static Frontend + Local Agent (100% Free & recommended)
This structure hosts your interface on the web, while all AI model operations and compile tools run on the user's machine.

1. **Deploy the Frontend**: Host the folders `/platform` and `/virtual-lab` on a free host:
   * **Vercel** or **GitHub Pages**.
2. **User Setup**: Instruct your users/students to run the local agent (`node server.js`) and Ollama on their systems. 
3. **Why it works**: The deployed cloud interface automatically communicates with `http://127.0.0.1:3746` to send compile requests and query their local Ollama. You pay **$0** for hosting and tokens.

### Option B: Cloud Server + Google Gemini API (Free Tier)
To provide users with zero-setup AI (no local Ollama installation required), switch your proxy server to use a cloud API:

1. **Get a Gemini API Key**: Register for a free API key at [Google AI Studio](https://aistudio.google.com/). The free tier offers up to 15 Requests Per Minute (RPM) for the **Gemini 1.5 Flash** model.
2. **Update the Proxy**: Modify `agent/server.js` to route `/api/ai/chat` requests to the Gemini endpoint:
   ```javascript
   const apiKey = process.env.GEMINI_API_KEY;
   const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
   ```
3. **Deploy Backend**: Host the `agent` Node.js server on a free backend hosting platform like **Render** or **Railway**.