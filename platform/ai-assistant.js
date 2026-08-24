/* ═══════════════════════════════════════════════════════════
   EduSim AI Assistant — Core Logic
   Implements the 4-layer architecture defined in AI_prompt.md
   ═══════════════════════════════════════════════════════════ */

// ── Layer 1: Context Management ────────────────────────────
class ContextManager {
  constructor() {
    this.context = {
      boardType: 'esp32',
      language: 'cpp',
      sketch: '',
      simulatorState: { running: false, pins: [], sensorReadings: {} },
      virtualLabComponents: [],
      compileOutput: null
    };
    
    // Attempt to hook into editor updates
    setTimeout(() => {
      if (window.editor) {
        this.context.sketch = window.editor.getValue();
        window.editor.onDidChangeModelContent(() => {
          this.context.sketch = window.editor.getValue();
        });
      }
      
      const boardSelect = document.getElementById('boardSelect');
      if (boardSelect) {
        this.context.boardType = boardSelect.value;
        boardSelect.addEventListener('change', (e) => this.context.boardType = e.target.value);
      }
      
      const langSelect = document.getElementById('langSelect');
      if (langSelect) {
        this.context.language = langSelect.value;
        langSelect.addEventListener('change', (e) => this.context.language = e.target.value);
      }
      
      // Override IDE's logToTerminal or hook into build events if possible
      // In dashboard.js / ide.js, compiling logic outputs to terminal.
      // We will monkey-patch logToTerminal to catch errors.
      if (typeof window.logToTerminal === 'function') {
        const originalLog = window.logToTerminal;
        window.logToTerminal = (msg, type) => {
          originalLog(msg, type);
          if (type === 'err' && msg.includes('FAILED')) {
            this.context.compileOutput = {
              success: false,
              rawLog: msg,
              errors: [{ message: msg }]
            };
            document.dispatchEvent(new CustomEvent('ai-compile-failed', { detail: this.context }));
          } else if (type === 'success' && msg.includes('successful')) {
            this.context.compileOutput = { success: true, rawLog: msg, errors: [] };
          }
        };
      }
    }, 1000); // give Monaco time to load
  }
  
  getContext() {
    return { ...this.context };
  }
  
  getContextSummary() {
    const ctx = this.context;
    let sketchSummary = ctx.sketch;
    if (sketchSummary.length > 2000) {
      sketchSummary = sketchSummary.substring(0, 2000) + "\n...[truncated]";
    }
    return `Board: ${ctx.boardType}, Language: ${ctx.language}. Sketch:\n\`\`\`\n${sketchSummary}\n\`\`\``;
  }
}

const ProjectContext = new ContextManager();


// ── LLM Integration (Ollama Proxy) ─────────────────────────
async function queryOllama(messages, systemPrompt = '') {
  try {
    const payload = {
      model: "llama3.2", // updated to match installed model
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: false
    };
    
    // Proxy via our local node agent on port 3746 (HTTP_PORT)
    // Wait, the agent HTTP_PORT is 3746, and it proxies to Ollama on 11434.
    const res = await fetch('http://127.0.0.1:3746/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error("Failed to connect to local AI proxy.");
    
    const data = await res.json();
    return data.message.content;
  } catch (err) {
    console.error("AI Error:", err);
    return "Error: Could not reach the AI agent. Please ensure the local server and Ollama are running.";
  }
}

// ── UI Logic ───────────────────────────────────────────────
const aiPanel = document.getElementById('aiPanel');
const btnAiToggle = document.getElementById('btnAiToggle');
const btnAiClose = document.getElementById('btnAiClose');
const aiModeToggle = document.getElementById('aiModeToggle');
const aiChatArea = document.getElementById('aiChatArea');
const aiInput = document.getElementById('aiInput');
const btnAiSend = document.getElementById('btnAiSend');

let currentMode = 'learn'; // 'learn' (Layer 3) or 'build' (Layer 4)
let chatHistory = [];

btnAiToggle.addEventListener('click', () => {
  aiPanel.classList.toggle('open');
});

btnAiClose.addEventListener('click', () => {
  aiPanel.classList.remove('open');
});

// Mode Toggle
aiModeToggle.querySelectorAll('.ai-mode-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    aiModeToggle.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentMode = e.target.dataset.mode;
    
    if (currentMode === 'build') {
      aiModeToggle.classList.add('build');
      addBotMessage("Switched to **Build Mode** (Layer 4). I can write complete sketches for you. What do you need?");
    } else {
      aiModeToggle.classList.remove('build');
      addBotMessage("Switched to **Learn Mode** (Layer 3). I'll guide you step-by-step. What do you want to learn?");
    }
  });
});

function addBotMessage(text, isHTML = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message bot';
  if (isHTML) {
    msgDiv.innerHTML = `<div class="ai-bubble">${text}</div>`;
  } else {
    // Simple markdown to HTML
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:4px;">$1</code>');
    msgDiv.innerHTML = `<div class="ai-bubble">${formatted}</div>`;
  }
  aiChatArea.appendChild(msgDiv);
  scrollToBottom();
}

function addUserMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message user';
  msgDiv.innerHTML = `<div class="ai-bubble">${text}</div>`;
  aiChatArea.appendChild(msgDiv);
  scrollToBottom();
}

function showTypingIndicator() {
  const id = 'typing-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message bot';
  msgDiv.id = id;
  msgDiv.innerHTML = `
    <div class="ai-bubble">
      <div class="ai-typing">
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
      </div>
    </div>`;
  aiChatArea.appendChild(msgDiv);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  aiChatArea.scrollTop = aiChatArea.scrollHeight;
}

// ── Messaging Flow (Layers 3 & 4) ──────────────────────────
async function handleUserSend() {
  const text = aiInput.value.trim();
  if (!text) return;
  
  aiInput.value = '';
  addUserMessage(text);
  chatHistory.push({ role: 'user', content: text });
  
  const typingId = showTypingIndicator();
  
  const ctxStr = ProjectContext.getContextSummary();
  let systemPrompt = "";
  
  if (currentMode === 'learn') {
    // Layer 3
    systemPrompt = `You are a tutor for embedded systems.
Context: ${ctxStr}
Flow to follow strictly:
1. Explain the concept grounded in the current board.
2. Ask for learning intent (a short clarifying question).
3. Provide guided steps (do NOT give full code yet).
4. Keep it conversational and encouraging.`;
  } else {
    // Layer 4
    systemPrompt = `You are an expert embedded systems developer.
Context: ${ctxStr}
Task: The user wants full code. Generate the complete sketch for the requested feature.
Provide a concise walkthrough of what the code does.`;
  }
  
  const response = await queryOllama(chatHistory, systemPrompt);
  
  chatHistory.push({ role: 'assistant', content: response });
  removeTypingIndicator(typingId);
  addBotMessage(response);
}

btnAiSend.addEventListener('click', handleUserSend);
aiInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleUserSend();
  }
});

// ── Layer 2: Debug Engine ──────────────────────────────────
document.addEventListener('ai-compile-failed', async (e) => {
  const ctx = e.detail;
  aiPanel.classList.add('open');
  addBotMessage("I noticed a compile error. Let me take a look...");
  const typingId = showTypingIndicator();
  
  const systemPrompt = `You are a debug assistant.
Analyze this compile error and the sketch.
Sketch:
${ctx.sketch}
Error:
${ctx.compileOutput.rawLog}

Output exactly one short paragraph explaining the root cause to a beginner, then output the minimal code diff to fix it.`;

  const response = await queryOllama([{ role: 'user', content: 'Fix my error.' }], systemPrompt);
  removeTypingIndicator(typingId);
  addBotMessage(`**Debug Analysis:**<br/>${response}`);
});
