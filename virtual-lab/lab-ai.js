/* ═══════════════════════════════════════════════════════════════
   CircuitMind — EduSim Virtual Lab AI (lab-ai.js)
   Per-mode isolated histories: Wire | Build | Check
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const CM_PROXY = 'http://127.0.0.1:3746/api/ai/chat';
const CM_MODEL = 'llama3.2';

// ── Canvas reader ─────────────────────────────────────────────
function readCanvas() {
  const mode       = window.PROJECT?.mode || '2d';
  const components = Array.isArray(window.components) ? window.components : [];
  const wires      = Array.isArray(window.wires)      ? window.wires      : [];

  const compManifest = components.map(c => {
    const def  = c.def || {};
    const pins = (def.pins || []).map(p => `    ${p.id} [${p.type}] → "${p.label || p.id}"`).join('\n');
    return `  • ${def.label || c.defId} (id:${c.id})\n    Props: ${JSON.stringify(c.props || {})}\n    Pins:\n${pins}`;
  }).join('\n');

  const connManifest = wires.map(w => {
    const fc = components.find(c => c.id === w.from.compId);
    const tc = components.find(c => c.id === w.to.compId);
    return `  ${fc?.def?.label || w.from.compId}.${w.from.pinId}  ──→  ${tc?.def?.label || w.to.compId}.${w.to.pinId}`;
  }).join('\n');

  const connectedIds = new Set(wires.flatMap(w => [w.from.compId, w.to.compId]));
  const isolated = components.filter(c => !connectedIds.has(c.id)).map(c => c.def?.label || c.defId);
  const sketch   = (window.monacoLabEditor?.getValue?.() || '').slice(0, 2000);

  return { mode, components, wires, compManifest, connManifest, isolated, sketch,
           componentCount: components.length, wireCount: wires.length };
}

// ── System prompt builder ─────────────────────────────────────
function buildCircuitMindPrompt(mode) {
  const c = readCanvas();
  const env = c.mode === '3d' ? '3D Three.js viewer' : '2D SVG schematic canvas';

  const identity = `You are CircuitMind — an embedded hardware engineer and circuit validator inside EduSim's ${env}.

Your personality:
- Think like a PCB engineer and embedded-systems lab instructor.
- ALWAYS read the actual canvas components and connections before answering.
- Be precise about PIN NUMBERS — never vague ("a digital pin"). Always name it ("GPIO 13").
- Proactively catch electrical issues (floating pins, missing pull-ups, power/GND errors).

═══ LIVE CIRCUIT STATE ═══════════════════════════════════════
Mode: ${c.mode.toUpperCase()} (${env})

Components on canvas (${c.componentCount} total):
${c.compManifest || '  (canvas is empty)'}

Wire connections (${c.wireCount} total):
${c.connManifest || '  (no wires drawn yet)'}

Isolated components (no wires):
${c.isolated.length ? c.isolated.map(n => '  ⚠ ' + n).join('\n') : '  none'}

Active sketch:
\`\`\`cpp
${c.sketch || '// (empty)'}
\`\`\`
════════════════════════════════════════════════════════════════

RULES:
1. Only reference components that are ACTUALLY listed above.
2. Always give specific pin identifiers (GPIO 13, D2, A0) — never vague.
3. If canvas is empty, tell the user to add components first.
4. Format pin tables as markdown tables: | Component | Pin | → | Component | Pin | Note |`;

  if (mode === 'wire') {
    return identity + `

WIRE MODE — Step-by-Step Wiring Guide:
Output MUST include:
1. Wiring Table (always first):
   | From Component | From Pin | → | To Component | To Pin | Note |
2. Numbered wiring steps (one wire per step).
3. Safety checks: missing GND, missing current-limiting resistors for LEDs, floating inputs.
Do NOT generate code in Wire mode.`;
  }

  if (mode === 'build') {
    return identity + `

BUILD MODE — Code Generation for THIS Circuit:
Output MUST:
1. Generate a complete, compilable Arduino/C++ sketch.
2. Use EXACT pin numbers from the components above.
3. Define #define or const int for every pin, named after the component.
4. Add comments on every setup() and loop() block.
5. After the code block: 3-line wiring recap:
   "// Wiring: [A].Pin → [B].Pin"
6. Flag any wiring that seems missing or inconsistent.`;
  }

  if (mode === 'check') {
    return identity + `

CHECK MODE — Electrical Audit:
**Section 1 — Connection Audit**
For each wire: verify source vs destination pin types, power rail correctness, voltage compatibility.

**Section 2 — Missing Connections**
List every component missing: GND, VCC/power, required pull-up/pull-down resistor.

**Section 3 — Isolated Components**
List components with NO wires at all.

**Section 4 — Overall Verdict**
One of: ✅ Circuit looks valid | ⚠️ Circuit has warnings | ❌ Circuit has errors
Then a 1-sentence summary.`;
  }

  return identity + `\nAnswer the user's circuit question directly, referencing actual components and wires from the canvas.`;
}

// ── LLM call ─────────────────────────────────────────────────
async function circuitMindQuery(history, mode) {
  const res = await fetch(CM_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CM_MODEL,
      messages: [{ role: 'system', content: buildCircuitMindPrompt(mode) }, ...history],
      stream: false
    })
  });
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  const data = await res.json();
  return data.message?.content || data.response || '(empty)';
}

// ── Per-mode isolated histories ───────────────────────────────
const cmHistories = { wire: [], build: [], check: [] };

// ── UI state ──────────────────────────────────────────────────
let cmMode = 'wire';
let cmBusy = false;

const labAiBtn   = document.getElementById('labAiBtn');
const labAiPanel = document.getElementById('labAiPanel');
const labAiClose = document.getElementById('labAiClose');
const labAiModes = document.getElementById('labAiModes');
const labAiInput = document.getElementById('labAiInput');
const labAiSend  = document.getElementById('labAiSend');
const labAiCtx   = document.getElementById('labAiCtxChip');

// ── Toggle ────────────────────────────────────────────────────
function openCM()  { labAiPanel?.classList.add('open'); refreshCtx(); labAiInput?.focus(); }
function closeCM() { labAiPanel?.classList.remove('open'); }

labAiBtn?.addEventListener('click', () =>
  labAiPanel?.classList.contains('open') ? closeCM() : openCM()
);
labAiClose?.addEventListener('click', closeCM);

// ── Active chat area ──────────────────────────────────────────
function activeCmChat() { return document.getElementById('cm-chat-' + cmMode); }

// ── Context chip ──────────────────────────────────────────────
function refreshCtx() {
  const comps = Array.isArray(window.components) ? window.components.length : 0;
  const ws    = Array.isArray(window.wires)      ? window.wires.length      : 0;
  const mode  = window.PROJECT?.mode?.toUpperCase() || '2D';
  if (labAiCtx) labAiCtx.textContent = `${mode} · ${comps}C · ${ws}W`;
}
setInterval(() => { if (labAiPanel?.classList.contains('open')) refreshCtx(); }, 1500);

// ── Mode switching ────────────────────────────────────────────
const modePlaceholders = {
  wire:  'What do you want to wire? I\'ll give you a step-by-step table…',
  build: 'Ask me to generate code for your current circuit…',
  check: 'Ask me to audit your wiring, or just press send…'
};

function switchCmMode(mode) {
  cmMode = mode;
  if (labAiModes) labAiModes.dataset.mode = mode;

  // Switch active chat
  document.querySelectorAll('.lai-chat').forEach(a => a.classList.remove('active'));
  document.getElementById('cm-chat-' + mode)?.classList.add('active');

  // Scroll to bottom of that chat
  const area = document.getElementById('cm-chat-' + mode);
  if (area) area.scrollTop = area.scrollHeight;

  if (labAiInput) labAiInput.placeholder = modePlaceholders[mode] || 'Ask CircuitMind…';
}

labAiModes?.querySelectorAll('.lai-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    labAiModes.querySelectorAll('.lai-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchCmMode(btn.dataset.mode);
  });
});

// ── Quick prompts ─────────────────────────────────────────────
document.querySelectorAll('.lai-quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (labAiInput) { labAiInput.value = btn.dataset.prompt; labAiInput.focus(); }
  });
});

// ── Auto-resize textarea ──────────────────────────────────────
labAiInput?.addEventListener('input', () => {
  labAiInput.style.height = 'auto';
  labAiInput.style.height = Math.min(labAiInput.scrollHeight, 90) + 'px';
});

// ── Render helpers ────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMarkdown(text) {
  // Tables
  let out = text.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, match => {
    const rows = match.trim().split('\n').filter(r => !/^[\|\s\-:]+$/.test(r));
    const head = rows[0].split('|').slice(1,-1).map(h => `<th>${escHtml(h.trim())}</th>`).join('');
    const body = rows.slice(1).map(r =>
      `<tr>${r.split('|').slice(1,-1).map(c=>`<td>${escHtml(c.trim())}</td>`).join('')}</tr>`
    ).join('');
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  });
  out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, __, code) =>
    `<pre><code>${escHtml(code.trim())}</code></pre>`);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`);
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\n/g, '<br>');
  return out;
}

function addMsgToChat(area, role, text, extraClass = '') {
  if (!area) return;
  const div = document.createElement('div');
  div.className = `lai-msg ${role}${extraClass ? ' ' + extraClass : ''}`;

  const hasCode   = text.includes('```');
  const codeMatch = text.match(/```(?:\w+)?\n?([\s\S]*?)```/);

  const applyHtml = (hasCode && role === 'bot')
    ? `<button class="lai-apply-btn">
         <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
           <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
         </svg>Apply to Editor
       </button>`
    : '';

  div.innerHTML = `<div class="lai-bubble">${renderMarkdown(text)}${applyHtml}</div>`;

  div.querySelector('.lai-apply-btn')?.addEventListener('click', function() {
    const code = codeMatch?.[1]?.trim() || '';
    if (code && window.monacoLabEditor?.setValue) {
      window.monacoLabEditor.setValue(code);
      this.textContent = '✓ Applied!';
      this.style.color = '#00e676';
      setTimeout(() => {
        this.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>Apply to Editor`;
        this.style.color = '';
      }, 2000);
    }
  });

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function showTyping() {
  const area = activeCmChat();
  if (!area) return;
  const div = document.createElement('div');
  div.id = 'cm-typing';
  div.className = 'lai-msg bot';
  div.innerHTML = `<div class="lai-bubble"><div class="lai-typing">
    <div class="lai-dot"></div><div class="lai-dot"></div><div class="lai-dot"></div>
  </div></div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
function hideTyping() { document.getElementById('cm-typing')?.remove(); }

// ── Send ──────────────────────────────────────────────────────
async function sendCM(override) {
  const text = override || labAiInput?.value.trim();
  if (!text || cmBusy) return;
  if (!override && labAiInput) {
    labAiInput.value = '';
    labAiInput.style.height = 'auto';
  }

  addMsgToChat(activeCmChat(), 'user', text);
  cmHistories[cmMode].push({ role: 'user', content: text });

  cmBusy = true;
  if (labAiSend) labAiSend.disabled = true;
  showTyping();

  try {
    const reply = await circuitMindQuery(cmHistories[cmMode], cmMode);
    hideTyping();
    cmHistories[cmMode].push({ role: 'assistant', content: reply });
    addMsgToChat(activeCmChat(), 'bot', reply, cmMode === 'check' ? 'debug' : '');
  } catch (err) {
    hideTyping();
    addMsgToChat(activeCmChat(), 'bot',
      `**CircuitMind offline:** ${err.message}\n\nStart: \`ollama serve\` and \`node server.js\``);
  } finally {
    cmBusy = false;
    if (labAiSend) labAiSend.disabled = false;
    if (!override && labAiInput) labAiInput.focus();
  }
}

labAiSend?.addEventListener('click', () => sendCM());
labAiInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCM(); }
});

// ── Auto-check on compile error ───────────────────────────────
document.addEventListener('ai-compile-failed', async e => {
  openCM();
  labAiModes?.querySelector('[data-mode="check"]')?.click();
  const log = e.detail?.compileOutput?.rawLog || 'Unknown error';
  await sendCM(`Compile failed. Check my circuit and code.\n\nError:\n\`\`\`\n${log.slice(0,400)}\n\`\`\``);
});

// ── Expose global helpers ─────────────────────────────────────
window.circuitMindOpen  = openCM;
window.circuitMindCheck = () => {
  openCM();
  labAiModes?.querySelector('[data-mode="check"]')?.click();
  sendCM('Please run a full wiring audit on my current circuit.');
};
