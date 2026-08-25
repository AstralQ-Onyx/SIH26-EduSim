/**
 * EduSim Virtual Lab — Electricity / Electron Flow Animation Subsystem
 * Handles: Animating glowing electron/current flow pulses along circuit wires
 * during simulation execution based on pin states.
 */
'use strict';

class CurrentFlowEngine {
  constructor() {
    this.running = false;
    this.pinStates = {};
  }

  start() {
    this.running = true;
    this.updateFlowAnimations();
  }

  stop() {
    this.running = false;
    this.clearFlowAnimations();
  }

  setPinState(pinId, val) {
    this.pinStates[pinId] = val;
    if (this.running) {
      this.updateFlowAnimations();
    }
  }

  updateFlowAnimations(wires = window.wires || []) {
    if (!this.running) {
      this.clearFlowAnimations(wires);
      return;
    }

    wires.forEach(w => {
      const el = w.element;
      if (!el) return;

      const fromPin = w.from?.pinId || '';
      const toPin = w.to?.pinId || '';
      const fromVal = this.pinStates[fromPin];
      const toVal = this.pinStates[toPin];

      const fpUpper = fromPin.toUpperCase();
      const tpUpper = toPin.toUpperCase();

      const isVCC = fpUpper.includes('VCC') || fpUpper.includes('5V') || fpUpper.includes('3.3V') || fpUpper.includes('9V') || fpUpper.includes('3V') || fpUpper.startsWith('PWR') || fromVal === 1;
      const isGND = fpUpper.includes('GND') || tpUpper.includes('GND');
      
      const isActive = isVCC || isGND || fromVal > 0 || toVal > 0;

      if (isActive) {
        el.classList.add('wire-flowing');
        if (isVCC) {
          el.classList.add('flow-vcc');
          el.classList.remove('flow-gnd');
        } else if (isGND) {
          el.classList.add('flow-gnd');
          el.classList.remove('flow-vcc');
        }
      } else {
        el.classList.remove('wire-flowing', 'flow-vcc', 'flow-gnd');
      }
    });
  }

  clearFlowAnimations(wires = window.wires || []) {
    wires.forEach(w => {
      if (w.element) {
        w.element.classList.remove('wire-flowing', 'flow-vcc', 'flow-gnd');
      }
    });
    document.querySelectorAll('.wire-flowing').forEach(el => el.classList.remove('wire-flowing', 'flow-vcc', 'flow-gnd'));
  }
}

window.currentFlowEngine = new CurrentFlowEngine();
