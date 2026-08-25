/**
 * EduSim Virtual Lab — Real-World Circuit DRC & Diagnostics Engine
 * Evaluates overvoltage, overcurrent, blown components, and short circuits.
 */
'use strict';

class CircuitDRCEngine {
  constructor() {
    this.faults = [];
    this.blownComponents = new Set();
  }

  analyze(components = window.components || [], wires = window.wires || []) {
    this.faults = [];
    const prevBlown = new Set(this.blownComponents);
    this.blownComponents.clear();

    if (!components || !components.length) {
      this.updateDiagnosticsUI();
      return this.faults;
    }

    // 1. Build Electrical Nets
    const nets = this.buildNets(components, wires);

    // 2. Evaluate Net Voltages & Overvoltage Checks
    nets.forEach(net => {
      this.checkNetVoltageAndMCU(net, components);
      this.checkShortCircuit(net);
    });

    // 3. Evaluate Component Overcurrent / Blown Components
    components.forEach(comp => {
      this.checkComponentHealth(comp, nets, wires);
    });

    // Update canvas visual damage classes and realistic particle smoke
    prevBlown.forEach(comp => {
      if (!this.blownComponents.has(comp)) {
        comp.element?.classList.remove('comp-blown');
        window.effectsEngine?.stopComponentSmoke(comp);
      }
    });
    this.blownComponents.forEach(comp => {
      comp.element?.classList.add('comp-blown');
      window.effectsEngine?.startComponentSmoke(comp);
    });

    this.updateDiagnosticsUI();
    return this.faults;
  }

  buildNets(components, wires) {
    const pinToNet = new Map();
    const nets = [];

    const getPinKey = (compId, pinId) => `${compId}:${pinId}`;

    const addPinToNet = (compId, pinId, net) => {
      const key = getPinKey(compId, pinId);
      pinToNet.set(key, net);
      net.pins.push({ compId, pinId });
    };

    // Include breadboard internal rail connectivity
    components.forEach(comp => {
      if (comp.defId === 'breadboard_half' || comp.defId.includes('breadboard')) {
        // Group top & bot power rails
        const pwrTop = { pins: [], vcc: true, voltage: 5 };
        const gndTop = { pins: [], gnd: true, voltage: 0 };
        const pwrBot = { pins: [], vcc: true, voltage: 5 };
        const gndBot = { pins: [], gnd: true, voltage: 0 };

        for (let c = 1; c <= 30; c++) {
          addPinToNet(comp.id, `PWR_TOP_${c}`, pwrTop);
          addPinToNet(comp.id, `GND_TOP_${c}`, gndTop);
          addPinToNet(comp.id, `PWR_BOT_${c}`, pwrBot);
          addPinToNet(comp.id, `GND_BOT_${c}`, gndBot);

          // 5-hole vertical strips (A-E and F-J)
          const stripTop = { pins: [] };
          const stripBot = { pins: [] };
          ['A','B','C','D','E'].forEach(r => addPinToNet(comp.id, `${r}${c}`, stripTop));
          ['F','G','H','I','J'].forEach(r => addPinToNet(comp.id, `${r}${c}`, stripBot));
          nets.push(stripTop, stripBot);
        }
        nets.push(pwrTop, gndTop, pwrBot, gndBot);
      }
    });

    // Merge nets connected by wires
    wires.forEach(w => {
      const keyFrom = getPinKey(w.from.compId, w.from.pinId);
      const keyTo = getPinKey(w.to.compId, w.to.pinId);

      let netFrom = pinToNet.get(keyFrom);
      let netTo = pinToNet.get(keyTo);

      if (!netFrom && !netTo) {
        const newNet = { pins: [] };
        addPinToNet(w.from.compId, w.from.pinId, newNet);
        addPinToNet(w.to.compId, w.to.pinId, newNet);
        nets.push(newNet);
      } else if (netFrom && !netTo) {
        addPinToNet(w.to.compId, w.to.pinId, netFrom);
      } else if (!netFrom && netTo) {
        addPinToNet(w.from.compId, w.from.pinId, netTo);
      } else if (netFrom !== netTo) {
        // Merge netTo into netFrom
        netTo.pins.forEach(p => addPinToNet(p.compId, p.pinId, netFrom));
        const idx = nets.indexOf(netTo);
        if (idx !== -1) nets.splice(idx, 1);
      }
    });

    return nets;
  }

  checkNetVoltageAndMCU(net, components) {
    let maxVoltage = 0;
    let hasGND = false;

    net.pins.forEach(p => {
      const comp = components.find(c => c.id === p.compId);
      if (!comp) return;

      const pinDef = comp.def?.pins?.find(pin => pin.id === p.pinId);
      if (pinDef?.type === 'gnd' || p.pinId.includes('GND')) {
        hasGND = true;
      }
      if (pinDef?.voltage) {
        maxVoltage = Math.max(maxVoltage, pinDef.voltage);
      }
      if (comp.props?.voltage) {
        maxVoltage = Math.max(maxVoltage, parseFloat(comp.props.voltage) || 0);
      }
    });

    net.voltage = maxVoltage;
    net.hasGND = hasGND;

    // Check MCU Overvoltage
    if (maxVoltage > 5.5) {
      net.pins.forEach(p => {
        const comp = components.find(c => c.id === p.compId);
        if (comp && comp.def?.category === 'Controllers') {
          if (p.pinId === '5V' || p.pinId === '3V3' || p.pinId === '3.3V') {
            this.addFault('CRITICAL', `[OVERVOLTAGE] ${comp.props?.label || comp.def.label}: Direct ${maxVoltage}V connected to ${p.pinId} pin (Max rating: ${p.pinId === '5V' ? '5.5V' : '3.6V'})! Risk of MCU destruction. Connect power to VIN pin instead.`);
          }
        }
      });
    }
  }

  checkShortCircuit(net) {
    if (net.voltage > 0 && net.hasGND) {
      // Check if there is zero series resistance load in this net
      const hasLoad = net.pins.some(p => {
        return p.pinId.includes('anode') || p.pinId.includes('p1') || p.pinId.includes('p2') || p.pinId.includes('wiper');
      });
      if (!hasLoad) {
        this.addFault('CRITICAL', `[SHORT CIRCUIT] Power Rail (${net.voltage}V) connected directly to Ground! Zero load resistance detected. Power supply protection tripped!`);
      }
    }
  }

  checkComponentHealth(comp, nets, wires) {
    if (comp.defId.startsWith('led_')) {
      // Find net connected to anode and cathode
      const anodePin = `${comp.id}:anode`;
      const cathodePin = `${comp.id}:cathode`;

      const anodeWire = wires.find(w => `${w.from.compId}:${w.from.pinId}` === anodePin || `${w.to.compId}:${w.to.pinId}` === anodePin);
      const cathodeWire = wires.find(w => `${w.from.compId}:${w.from.pinId}` === cathodePin || `${w.to.compId}:${w.to.pinId}` === cathodePin);

      if (anodeWire && cathodeWire) {
        // Trace if there is a series resistor attached
        const hasResistor = wires.some(w => {
          const fromComp = components.find(c => c.id === w.from.compId);
          const toComp = components.find(c => c.id === w.to.compId);
          return fromComp?.defId === 'resistor' || toComp?.defId === 'resistor';
        });

        // Find supply voltage
        let suppliedV = 0;
        nets.forEach(n => {
          if (n.pins.some(p => p.compId === comp.id && p.pinId === 'anode')) {
            suppliedV = Math.max(suppliedV, n.voltage || 5);
          }
        });

        if (suppliedV >= 5 && !hasResistor) {
          this.blownComponents.add(comp);
          this.addFault('CRITICAL', `[BLOWN COMPONENT] ${comp.props?.label || comp.def.label}: Blown by ${suppliedV}V overcurrent! Missing series current-limiting resistor. Recommended: Add a 220Ω resistor.`);
        }
      }
    }
  }

  addFault(level, text) {
    this.faults.push({ level, text });
  }

  updateDiagnosticsUI() {
    const badge = document.getElementById('faultCountBadge');
    const body = document.getElementById('diagnosticsBody');
    if (!body || !badge) return;

    badge.textContent = this.faults.length;
    badge.className = 'drc-badge ' + (this.faults.length > 0 ? 'err' : 'ok');

    if (this.faults.length === 0) {
      body.innerHTML = '<div class="clog ok">[ DRC Engine ] No electrical rule violations detected. All circuits nominal ✓</div>';
    } else {
      body.innerHTML = '';
      this.faults.forEach(f => {
        const div = document.createElement('div');
        div.className = 'clog ' + (f.level === 'CRITICAL' ? 'err' : 'warn');
        div.textContent = f.text;
        body.appendChild(div);
      });
    }
  }
}

window.circuitDRCEngine = new CircuitDRCEngine();
