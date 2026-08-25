/* ═══════════════════════════════════════════════════════════
   EduSim MENTOR — Dashboard AI (ai-assistant.js)
   Per-mode isolated chat histories + side-drawer panel control
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── Configuration ────────────────────────────────────────────
const MENTOR_PROXY = 'http://127.0.0.1:3746/api/ai/chat';
const MENTOR_MODEL = 'llama3.2';

// ── Context: reads the IDE (sketch, board, language, errors) ─
class MentorContext {
  constructor() {
    this.boardType  = 'esp32';
    this.language   = 'cpp';
    this.sketch     = '';
    this.compileLog = null;

    setTimeout(() => {
      const ed = window.editor;
      if (ed && ed.getValue) {
        this.sketch = ed.getValue();
        ed.onDidChangeModelContent(() => { this.sketch = ed.getValue(); });
      }

      const boardSel = document.getElementById('boardSelect');
      if (boardSel) {
        this.boardType = boardSel.value;
        boardSel.addEventListener('change', e => { this.boardType = e.target.value; });
      }

      const langSel = document.getElementById('langSelect');
      if (langSel) {
        this.language = langSel.value;
        langSel.addEventListener('change', e => { this.language = e.target.value; });
      }

      // Intercept compile logs
      if (typeof window.logToTerminal === 'function') {
        const orig = window.logToTerminal;
        window.logToTerminal = (msg, type) => {
          orig(msg, type);
          if (type === 'err' && msg.includes('FAILED')) {
            this.compileLog = { success: false, raw: msg };
            document.dispatchEvent(new CustomEvent('mentor-compile-failed', { detail: this }));
          } else if (type === 'success') {
            this.compileLog = { success: true, raw: msg };
          }
        };
      }
    }, 1000);
  }

  getSummary() {
    const sketch = this.sketch.length > 2500
      ? this.sketch.slice(0, 2500) + '\n...[truncated]'
      : this.sketch || '(empty sketch)';
    return { board: this.boardType, language: this.language, sketch, compileLog: this.compileLog };
  }
}

const Mentor = new MentorContext();

// ── System prompt builder ─────────────────────────────────────
function buildMentorPrompt(mode) {
  const ctx = Mentor.getSummary();

  const identity = `You are EduSim MENTOR — a senior embedded-systems engineer and patient educator inside the EduSim IDE.

Your personality:
- Analytical, encouraging, and precise.
- You review code like a senior engineer reviewing a junior's PR.
- You NEVER just dump code — you teach the reasoning behind every decision.
- Give concrete examples wherever possible.
- Reference the user's ACTUAL sketch when relevant.

Current IDE state:
- Target board : ${ctx.board}
- Language     : ${ctx.language}
- Sketch (current):
\`\`\`${ctx.language === 'micropython' ? 'python' : 'cpp'}
${ctx.sketch}
\`\`\`
${ctx.compileLog ? `- Last build: ${ctx.compileLog.success ? '✓ SUCCESS' : '✗ FAILED'}\n  Log: ${ctx.compileLog.raw.slice(0, 300)}` : ''}

Formatting rules:
- Use markdown. Wrap all code in fenced blocks with the correct language.
- Keep responses focused — max 4 paragraphs unless generating full code.
- Cite exact LINE NUMBERS when referring to specific code.`;

  if (mode === 'review') {
    return identity + `

REVIEW MODE — Code Quality Mentor:
1. Identify up to 3 bugs or anti-patterns (cite exact line numbers).
2. Explain the risk each issue poses in a real embedded deployment.
3. Suggest a corrected snippet for each issue.
4. End with one positive observation about what the student did well.
Do NOT rewrite the whole sketch.`;
  }

  if (mode === 'explain') {
    return identity + `

EXPLAIN MODE — Concept Explainer:
1. Relate the concept directly to the user's current board (${ctx.board}) and sketch.
2. Use a simple analogy first, then the technical explanation.
3. Show a small, isolated code snippet demonstrating ONLY the concept.
4. Ask one follow-up question to check understanding.
Do NOT solve their homework — teach them to solve it themselves.`;
  }

  if (mode === 'optimise') {
    return identity + `

OPTIMISE MODE — Performance & Power Engineer:
Suggest concrete improvements for:
- Memory usage (RAM/Flash on ${ctx.board})
- Power consumption (sleep modes, pin states)
- Timing accuracy (avoid delay(), use millis() patterns)
- Readability and maintainability
For each suggestion: cite the line, explain the problem, show the fix.`;
  }

  return identity + `

ASSIST MODE — General Engineering Help:
Answer the user's question directly and precisely.
Give examples.
Reference their current sketch and board, when needed.
If they need code, generate it with inline comments explaining every non-obvious line.`;
}

// ── Ollama call ───────────────────────────────────────────────
async function mentorQuery(history, mode) {
  const payload = {
    model: MENTOR_MODEL,
    messages: [
      { role: 'system', content: buildMentorPrompt(mode) },
      ...history
    ],
    stream: false
  };
  const res = await fetch(MENTOR_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  const data = await res.json();
  return data.message?.content || data.response || '(empty response)';
}

// ── Per-mode isolated histories ───────────────────────────────
const modeHistories = {
  assist:   [],
  review:   [],
  explain:  [],
  optimise: []
};

// ── UI state ──────────────────────────────────────────────────
let mentorMode = 'assist';
let mentorBusy = false;

const aiPanel      = document.getElementById('aiPanel');
const btnAiToggle  = document.getElementById('btnAiToggle');
const btnAiClose   = document.getElementById('btnAiClose');
const aiModeToggle = document.getElementById('aiModeToggle');
const aiInput      = document.getElementById('aiInput');
const btnAiSend    = document.getElementById('btnAiSend');
const boardChip    = document.getElementById('mentorBoardChip');
const langChip     = document.getElementById('mentorLangChip');

if (!aiPanel || !btnAiToggle) {
  console.warn('[MENTOR] DOM elements not found — skipping init.');
} else {

// ── Toggle open/close ─────────────────────────────────────────
function openMentor()  { aiPanel.classList.add('open');    aiInput?.focus(); }
function closeMentor() { aiPanel.classList.remove('open'); }

btnAiToggle.addEventListener('click', () =>
  aiPanel.classList.contains('open') ? closeMentor() : openMentor()
);
btnAiClose.addEventListener('click', closeMentor);

// ── Active chat panel helper ──────────────────────────────────
function activeChatArea() {
  return document.getElementById('chat-' + mentorMode);
}

// ── Mode switching ────────────────────────────────────────────
function switchToMode(mode, idx) {
  mentorMode = mode;

  // Pill slide
  if (aiModeToggle) aiModeToggle.dataset.active = String(idx);

  // Swap active chat panel
  document.querySelectorAll('.ai-chat-area').forEach(a => a.classList.remove('active'));
  document.getElementById('chat-' + mode)?.classList.add('active');

  // Scroll that panel to bottom
  const area = document.getElementById('chat-' + mode);
  if (area) area.scrollTop = area.scrollHeight;

  // Update placeholder
  const placeholders = {
    assist:   'Ask MENTOR about your code or concepts…',
    review:   'Ask for a code review, or mention what to focus on…',
    explain:  'Ask about any embedded concept, e.g. "Explain I2C"…',
    optimise: 'Ask what to optimise, or press send for a full scan…'
  };
  if (aiInput) aiInput.placeholder = placeholders[mode] || 'Ask MENTOR…';
}

if (aiModeToggle) {
  aiModeToggle.querySelectorAll('.ai-mode-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      aiModeToggle.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchToMode(btn.dataset.mode, idx);
    });
  });
}

// ── Context chip sync ─────────────────────────────────────────
function syncMentorCtx() {
  const ctx = Mentor.getSummary();
  if (boardChip) boardChip.lastChild.textContent = ' ' + ctx.board;
  if (langChip)  langChip.lastChild.textContent  = ' ' + ctx.language;
}
setInterval(() => { if (aiPanel.classList.contains('open')) syncMentorCtx(); }, 2000);

// ── Quick Review ──────────────────────────────────────────────
document.getElementById('btnMentorReview')?.addEventListener('click', async () => {
  openMentor();
  const reviewBtn = aiModeToggle?.querySelector('[data-mode="review"]');
  if (reviewBtn) { reviewBtn.click(); }
  await sendMessage('Please review my current sketch for bugs and anti-patterns.');
});

// ── Quick prompt pills ────────────────────────────────────────
document.querySelectorAll('.mentor-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    if (aiInput) {
      aiInput.value = pill.dataset.prompt;
      aiInput.style.height = 'auto';
      aiInput.style.height = Math.min(aiInput.scrollHeight, 90) + 'px';
      aiInput.focus();
    }
  });
});

// ── Textarea auto-resize ──────────────────────────────────────
if (aiInput) {
  aiInput.addEventListener('input', () => {
    aiInput.style.height = 'auto';
    aiInput.style.height = Math.min(aiInput.scrollHeight, 90) + 'px';
  });
}

// ── Render helpers ────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMarkdown(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, (_, c) =>
      `<code>${escHtml(c)}</code>`)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function addMsgToArea(area, role, text) {
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  div.innerHTML = `<div class="ai-bubble">${renderMarkdown(text)}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function addBotToMode(mode, text) { addMsgToArea(document.getElementById('chat-' + mode), 'bot', text); }
function addUserToMode(mode, text) { addMsgToArea(document.getElementById('chat-' + mode), 'user', text); }

function showTyping() {
  const area = activeChatArea();
  if (!area) return;
  const div = document.createElement('div');
  div.id = 'mentor-typing';
  div.className = 'ai-message bot';
  div.innerHTML = `<div class="ai-bubble"><div class="ai-typing">
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
  </div></div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
function hideTyping() { document.getElementById('mentor-typing')?.remove(); }

// ── Send ──────────────────────────────────────────────────────
async function sendMessage(overrideText) {
  const text = overrideText || (aiInput ? aiInput.value.trim() : '');
  if (!text || mentorBusy) return;

  if (!overrideText && aiInput) {
    aiInput.value = '';
    aiInput.style.height = 'auto';
  }

  addUserToMode(mentorMode, text);
  modeHistories[mentorMode].push({ role: 'user', content: text });

  mentorBusy = true;
  if (btnAiSend) btnAiSend.disabled = true;
  showTyping();

  try {
    const reply = await mentorQuery(modeHistories[mentorMode], mentorMode);
    hideTyping();
    modeHistories[mentorMode].push({ role: 'assistant', content: reply });
    addBotToMode(mentorMode, reply);
  } catch (err) {
    hideTyping();
    addBotToMode(mentorMode,
      `**Connection error:** ${err.message}\n\nEnsure Ollama is running (\`ollama serve\`) and the agent is up (\`node server.js\`).`);
  } finally {
    mentorBusy = false;
    if (btnAiSend) btnAiSend.disabled = false;
    if (!overrideText && aiInput) aiInput.focus();
  }
}

btnAiSend?.addEventListener('click', () => sendMessage());
aiInput?.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ── Auto-open on compile failure ──────────────────────────────
document.addEventListener('mentor-compile-failed', async e => {
  openMentor();
  const reviewBtn = aiModeToggle?.querySelector('[data-mode="review"]');
  if (reviewBtn) reviewBtn.click();
  const errText = e.detail?.compileLog?.raw || 'Unknown compile error';
  await sendMessage(
    `I got a compile error. Here is the log:\n\`\`\`\n${errText.slice(0,500)}\n\`\`\`\nPlease identify the root cause and show me the minimal fix with line numbers.`
  );
});

document.addEventListener('ai-compile-failed', () => {
  document.dispatchEvent(new CustomEvent('mentor-compile-failed', { detail: Mentor }));
});

// Expose for external triggers
window.mentorOpen          = openMentor;
window.mentorTriggerReview = async () => {
  openMentor();
  aiModeToggle?.querySelector('[data-mode="review"]')?.click();
  await sendMessage('Please review my current sketch.');
};

} // end guard block
