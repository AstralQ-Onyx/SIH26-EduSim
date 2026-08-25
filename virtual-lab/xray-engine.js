/**
 * EduSim Virtual Lab — X-Ray Mode Subsystem
 * Handles: Blueprint canvas mode toggle, internal breadboard rail reveal,
 * and electrical net highlighting on pin hover.
 */
'use strict';

class XRayEngine {
  constructor() {
    this.active = false;
  }

  init(svgElement, buttonElement) {
    this.svg = svgElement;
    this.button = buttonElement;
  }

  toggle() {
    this.active = !this.active;
    if (this.svg) {
      this.svg.classList.toggle('xray-mode', this.active);
    }
    if (this.button) {
      this.button.classList.toggle('active', this.active);
    }
    if (!this.active) {
      this.clearHighlights();
    }
    return this.active;
  }

  highlightNetForPin(compId, pinId, components, wires) {
    if (!this.active) return;
    this.clearHighlights();

    const targetComp = components.find(c => c.id === compId);
    if (!targetComp) return;

    if (targetComp.defId === 'breadboard_half' || targetComp.defId.includes('breadboard')) {
      const el = targetComp.element;
      if (!el) return;

      if (pinId.startsWith('PWR_')) {
        el.querySelectorAll('.xray-rail.power-rail').forEach(r => r.classList.add('active-net'));
      } else if (pinId.startsWith('GND_')) {
        el.querySelectorAll('.xray-rail.gnd-rail').forEach(r => r.classList.add('active-net'));
      } else {
        const match = pinId.match(/([A-J])(\d+)/);
        if (match) {
          const row = match[1];
          const col = match[2];
          const isTop = ['A','B','C','D','E'].includes(row);
          const stripSelector = `[data-rail="${isTop ? 'top' : 'bot'}-${col}"]`;
          el.querySelectorAll(stripSelector).forEach(s => s.classList.add('active-net'));
        }
      }
    }

    wires.forEach(w => {
      if ((w.from.compId === compId && w.from.pinId === pinId) ||
          (w.to.compId === compId && w.to.pinId === pinId)) {
        if (w.element) {
          w.element.classList.add('active-net');
        }
      }
    });
  }

  clearHighlights() {
    document.querySelectorAll('.active-net').forEach(el => el.classList.remove('active-net'));
  }
}

window.xrayEngine = new XRayEngine();
