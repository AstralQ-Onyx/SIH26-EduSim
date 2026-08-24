/* ═══════════════════════════════════════════════════════════
   EduSim — AI Context Manager (ai/frontend/ai-context.js)
   Layer 1: Single Source of Truth for Project Context
   ═══════════════════════════════════════════════════════════ */

'use strict';

class EduSimContextManager extends EventTarget {
  constructor() {
    super();
    this.context = {
      boardType: 'uno',
      fqbn: 'arduino:avr:uno',
      language: 'cpp',
      sketch: '',
      simulatorState: {
        running: false,
        pins: {},
        sensorReadings: {}
      },
      virtualLabComponents: [],
      compileOutput: null
    };
  }

  get() {
    return { ...this.context };
  }

  update(partial) {
    let changed = false;
    for (const key of Object.keys(partial)) {
      if (JSON.stringify(this.context[key]) !== JSON.stringify(partial[key])) {
        this.context[key] = partial[key];
        changed = true;
      }
    }
    if (changed) {
      this.dispatchEvent(new CustomEvent('contextChanged', { detail: this.context }));
    }
  }

  setSketch(code) {
    if (this.context.sketch !== code) {
      this.context.sketch = code;
      this.dispatchEvent(new CustomEvent('contextChanged', { detail: this.context }));
    }
  }

  setCompileOutput(output) {
    this.context.compileOutput = output;
    this.dispatchEvent(new CustomEvent('contextChanged', { detail: this.context }));
  }

  setBoard(boardType, fqbn) {
    this.context.boardType = boardType;
    this.context.fqbn = fqbn || this.mapBoardToFQBN(boardType);
    this.dispatchEvent(new CustomEvent('contextChanged', { detail: this.context }));
  }

  setVirtualComponents(components) {
    this.context.virtualLabComponents = Array.isArray(components) ? components : [];
    this.dispatchEvent(new CustomEvent('contextChanged', { detail: this.context }));
  }

  mapBoardToFQBN(board) {
    const map = {
      uno: 'arduino:avr:uno',
      nano: 'arduino:avr:nano',
      nano_old: 'arduino:avr:nano:cpu=atmega328old',
      mega: 'arduino:avr:mega',
      esp32: 'esp32:esp32:esp32',
      esp8266: 'esp8266:esp8266:nodemcuv2',
      rp2040: 'rp2040:rp2040:rpipico'
    };
    return map[board] || 'arduino:avr:uno';
  }

  subscribe(callback) {
    const handler = (e) => callback(e.detail);
    this.addEventListener('contextChanged', handler);
    return () => this.removeEventListener('contextChanged', handler);
  }
}

// Global Singleton Instance
window.EduSimContext = new EduSimContextManager();
