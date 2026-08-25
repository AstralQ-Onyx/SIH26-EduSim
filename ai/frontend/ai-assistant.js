/* ═══════════════════════════════════════════════════════════
   EduSim — AI Assistant Controller (ai/frontend/ai-assistant.js)
   Integrates Layer 2 (Debugger), Layer 3 (Tutor), Layer 4 (Build)
   ═══════════════════════════════════════════════════════════ */

'use strict';

class AIAssistant {
  constructor() {
    this.mode = 'tutor'; // 'tutor' (Learn) or 'build' (Build)
    this.chatHistory = [];
    this.isOpen = false;
    this.isProcessing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Check if drawer exists, else inject
    let drawer = document.getElementById('aiAssistantDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'aiAssistantDrawer';
      drawer.className = 'ai-drawer';
      drawer.innerHTML = `
        <div class="ai-header">
          <div class="ai-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>EduSim AI Assistant</span>
          </div>
          <div class="ai-mode-toggle">
            <button class="ai-mode-btn active" id="aiModeLearn" data-mode="tutor">Learn</button>
            <button class="ai-mode-btn" id="aiModeBuild" data-mode="build">Build</button>
          </div>
          <button class="ai-close-btn" id="aiCloseBtn" title="Close Panel">&times;</button>
        </div>

        <div class="ai-messages" id="aiMessagesList">
          <div class="ai-msg bot">
            <div class="ai-bubble">
              👋 Hi! I'm your embedded systems AI tutor and debugger. 
              <br><br>
              • <strong>Learn Mode:</strong> Ask conceptual questions &amp; step-by-step guidance.
              <br>
              • <strong>Build Mode:</strong> Generate &amp; auto-verify complete hardware sketches.
              <br>
              • <strong>Auto-Debug:</strong> If a build fails, click <em>Debug with AI</em> to get a 1-click diff fix!
            </div>
          </div>
        </div>

        <div class="ai-input-area">
          <textarea id="aiInputText" placeholder="Ask a question or describe what you want to build..." rows="2"></textarea>
          <button class="ai-send-btn" id="aiSendBtn" title="Send">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    this.drawer = drawer;
    this.messagesList = document.getElementById('aiMessagesList');
    this.inputText = document.getElementById('aiInputText');
    this.sendBtn = document.getElementById('aiSendBtn');
    this.modeLearnBtn = document.getElementById('aiModeLearn');
    this.modeBuildBtn = document.getElementById('aiModeBuild');
    this.closeBtn = document.getElementById('aiCloseBtn');
  }

  bindEvents() {
    this.modeLearnBtn.addEventListener('click', () => this.setMode('tutor'));
    this.modeBuildBtn.addEventListener('click', () => this.setMode('build'));
    this.closeBtn.addEventListener('click', () => this.toggle(false));

    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Subscribe to context changes
    if (window.EduSimContext) {
      window.EduSimContext.subscribe((ctx) => {
        // Can be used for live hints
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.modeLearnBtn.classList.toggle('active', mode === 'tutor');
    this.modeBuildBtn.classList.toggle('active', mode === 'build');
    this.appendBotMessage(`Switched to **${mode === 'tutor' ? 'Learn (Tutor)' : 'Build (Full Code)'} Mode**.`);
  }

  toggle(open) {
    this.isOpen = (open !== undefined) ? open : !this.isOpen;
    this.drawer.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.inputText.focus();
    }
  }

  appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'ai-msg user';
    msg.innerHTML = `<div class="ai-bubble">${this.escapeHTML(text)}</div>`;
    this.messagesList.appendChild(msg);
    this.scrollToBottom();
  }

  appendBotMessage(content, rawHTML = false) {
    const msg = document.createElement('div');
    msg.className = 'ai-msg bot';
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    
    if (rawHTML) {
      bubble.innerHTML = content;
    } else {
      bubble.innerHTML = this.formatMarkdown(content);
    }
    
    msg.appendChild(bubble);
    this.messagesList.appendChild(msg);
    this.scrollToBottom();
    return bubble;
  }

  appendTypingIndicator() {
    const id = 'typing_' + Date.now();
    const msg = document.createElement('div');
    msg.className = 'ai-msg bot';
    msg.id = id;
    msg.innerHTML = `
      <div class="ai-bubble ai-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    this.messagesList.appendChild(msg);
    this.scrollToBottom();
    return id;
  }

  removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  scrollToBottom() {
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }

  handleSend() {
    const text = this.inputText.value.trim();
    if (!text || this.isProcessing) return;

    this.appendUserMessage(text);
    this.inputText.value = '';
    this.isProcessing = true;

    const typingId = this.appendTypingIndicator();

    const context = window.EduSimContext ? window.EduSimContext.get() : {};
    
    // Check if WebSocket agent is available
    if (typeof sendAgent === 'function' && sendAgent({
      type: 'ai_message',
      mode: this.mode,
      text: text,
      context: context,
      history: this.chatHistory.slice(-6)
    })) {
      this.currentTypingId = typingId;
    } else {
      this.removeTypingIndicator(typingId);
      this.appendBotMessage('⚠️ **Local Agent Offline**: Please ensure `node server.js` is running in `EduSim/agent/` to use AI features.');
      this.isProcessing = false;
    }
  }

  // ── Receive Agent Responses ───────────────────────────────
  onAgentResponse(msg) {
    this.isProcessing = false;
    if (this.currentTypingId) {
      this.removeTypingIndicator(this.currentTypingId);
      this.currentTypingId = null;
    }

    const res = msg.result;
    if (!res) {
      this.appendBotMessage('⚠️ Received empty response from AI service.');
      return;
    }

    if (res.mode === 'build' && res.code) {
      // Layer 4 Build Response
      const card = document.createElement('div');
      const validationBadge = res.validated 
        ? '<span class="ai-badge-valid">✓ Verified &amp; Compiled</span>'
        : '<span class="ai-badge-warn">⚠ Unverified</span>';

      card.innerHTML = `
        ${validationBadge}
        <p style="margin: 8px 0;">${this.formatMarkdown(res.explanation || '')}</p>
        <div class="ai-code-preview">
          <div class="ai-code-header">
            <span>Generated Sketch (${res.code.split('\n').length} lines)</span>
            <button class="ai-apply-btn" id="applyBuildBtn_${Date.now()}">
              Apply to Editor
            </button>
          </div>
          <pre><code>${this.escapeHTML(res.code)}</code></pre>
        </div>
      `;

      const btn = card.querySelector('.ai-apply-btn');
      if (btn) {
        btn.addEventListener('click', () => this.applyCode(res.code));
      }

      const bubble = this.appendBotMessage('', true);
      bubble.appendChild(card);
    } else {
      // Layer 3 Tutor Response or General Text
      this.appendBotMessage(res.text || res.explanation || 'No response text');
    }
  }

  // ── Layer 2: Debugger Trigger & Handler ───────────────────
  triggerDebug(rawLog) {
    this.toggle(true);
    this.appendBotMessage(`🔍 **Analyzing Compilation Errors...**`);
    const typingId = this.appendTypingIndicator();
    this.isProcessing = true;

    const context = window.EduSimContext ? window.EduSimContext.get() : {};

    if (typeof sendAgent === 'function' && sendAgent({
      type: 'ai_debug',
      compileOutput: { rawLog },
      context: context
    })) {
      this.currentTypingId = typingId;
    } else {
      this.removeTypingIndicator(typingId);
      this.appendBotMessage('⚠️ **Agent Offline**: Start `node server.js` in `EduSim/agent/` to debug.');
      this.isProcessing = false;
    }
  }

  onDebugResult(msg) {
    this.isProcessing = false;
    if (this.currentTypingId) {
      this.removeTypingIndicator(this.currentTypingId);
      this.currentTypingId = null;
    }

    const res = msg.result;
    if (!res || !res.success) {
      this.appendBotMessage(res?.explanation || 'Could not analyze error. Please inspect the Build Output.');
      return;
    }

    const summary = res.summary || 'Identified fix for compilation error';
    const explanation = res.explanation || '';
    const orig = res.originalSnippet || '';
    const fixed = res.fixedSnippet || '';
    const fullFixedCode = res.fullFixedCode || null;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="ai-debug-summary">🛠️ <strong>${this.escapeHTML(summary)}</strong></div>
      <p style="margin: 6px 0 10px 0;">${this.formatMarkdown(explanation)}</p>
    `;

    if (orig && fixed) {
      const diffCard = document.createElement('div');
      diffCard.className = 'ai-diff-card';
      diffCard.innerHTML = `
        <div class="ai-diff-header">
          <span>Line ${res.line || '—'}: Suggested Patch</span>
          <button class="ai-apply-btn">Apply Fix</button>
        </div>
        <div class="ai-diff-body">
          <div class="diff-line del">- ${this.escapeHTML(orig)}</div>
          <div class="diff-line add">+ ${this.escapeHTML(fixed)}</div>
        </div>
      `;

      const applyBtn = diffCard.querySelector('.ai-apply-btn');
      applyBtn.addEventListener('click', () => {
        this.applyDiff(orig, fixed, res.line, fullFixedCode);
      });

      container.appendChild(diffCard);
    } else if (fullFixedCode) {
      const fullBtn = document.createElement('button');
      fullBtn.className = 'btn ai-toggle-btn';
      fullBtn.style.marginTop = '8px';
      fullBtn.textContent = 'Apply Corrected Sketch';
      fullBtn.addEventListener('click', () => this.applyCode(fullFixedCode));
      container.appendChild(fullBtn);
    }

    const bubble = this.appendBotMessage('', true);
    bubble.appendChild(container);
  }

  // ── Safe Code Application ─────────────────────────────────
  applyCode(newCode) {
    if (!newCode) return;
    if (window._monacoEditor) {
      window._monacoEditor.setValue(newCode);
    } else {
      const fb = document.getElementById('editorFallback');
      if (fb) fb.value = newCode;
    }
    if (window.EduSimContext) {
      window.EduSimContext.setSketch(newCode);
    }
    if (window.showToast) window.showToast('Updated sketch in editor! ✓', 'success');
  }

  applyDiff(origSnippet, fixedSnippet, lineNum, fullFixedCode) {
    let currentCode = '';
    if (window._monacoEditor) {
      currentCode = window._monacoEditor.getValue();
    } else {
      const fb = document.getElementById('editorFallback');
      if (fb) currentCode = fb.value;
    }

    // Normalize newlines
    const normCurrent = currentCode.replace(/\r\n/g, '\n');
    const normOrig = origSnippet.replace(/\r\n/g, '\n').trim();
    const normFixed = fixedSnippet.replace(/\r\n/g, '\n').trim();

    // 1. Direct exact or trimmed match
    if (normCurrent.includes(normOrig)) {
      const updated = normCurrent.replace(normOrig, normFixed);
      this.applyCode(updated);
      return;
    }

    // 2. Line by line fuzzy search
    const lines = normCurrent.split('\n');
    let replaced = false;

    // Check near specified line number first
    if (lineNum && lineNum <= lines.length) {
      const targetIdx = lineNum - 1;
      const targetLine = lines[targetIdx].trim();
      if (targetLine && normOrig.includes(targetLine)) {
        // preserve leading indentation
        const indent = lines[targetIdx].match(/^\s*/)[0] || '';
        lines[targetIdx] = indent + normFixed;
        this.applyCode(lines.join('\n'));
        replaced = true;
        return;
      }
    }

    // Check across all lines for best match
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() && (lines[i].includes(normOrig) || normOrig.includes(lines[i].trim()))) {
        const indent = lines[i].match(/^\s*/)[0] || '';
        lines[i] = indent + normFixed;
        this.applyCode(lines.join('\n'));
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      if (fullFixedCode) {
        this.applyCode(fullFixedCode);
      } else {
        if (window.showToast) window.showToast('Could not auto-locate snippet. Please apply manually.', 'warn');
      }
    }
  }

  // ── Format Helpers ────────────────────────────────────────
  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  formatMarkdown(text) {
    if (!text) return '';
    let parsed = this.escapeHTML(text);
    // Bold
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Newlines
    parsed = parsed.replace(/\n/g, '<br>');
    return parsed;
  }
}

// Global Singleton
window.AIAssistantInstance = new AIAssistant();
