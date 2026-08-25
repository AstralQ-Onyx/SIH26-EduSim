# EduSim AI Subsystem

This directory consolidates all Artificial Intelligence components for EduSim across backend services and frontend assistant modules.

## Directory Structure

```
EduSim/ai/
├── backend/
│   └── ai-service.js       # Google Gemini SDK bridge (Tutor, Debugger, Full Code generator)
├── frontend/
│   ├── ai-context.js       # Layer 1: Centralized IDE & virtual lab state manager
│   └── ai-assistant.js     # Layer 2-4: UI drawer controller, chat handling & diff applier
└── README.md
```

## Layers Architecture

- **Layer 1: Context Manager (`frontend/ai-context.js`)**
  Synchronizes target board (FQBN), code sketch, virtual circuit components, and compilation logs.
- **Layer 2: AI Debugger (`backend/ai-service.js` & `frontend/ai-assistant.js`)**
  Analyzes compile errors, categorizes root causes, and generates 1-click diff fixes.
- **Layer 3: Socratic Tutor (`backend/ai-service.js` & `frontend/ai-assistant.js`)**
  Engaging, step-by-step guidance for students without spoiler full code.
- **Layer 4: Build Mode (`backend/ai-service.js` & `frontend/ai-assistant.js`)**
  End-to-end sketch generation with auto-validation loop via `arduino-cli`.
