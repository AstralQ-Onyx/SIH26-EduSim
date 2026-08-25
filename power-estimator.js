/**
 * EduSim Virtual Lab — Power & Battery Life Estimator
 * Dynamic calculation of circuit current draw, power consumption, ideal & practical battery runtime,
 * component breakdown, customizable power sources, and datasheet warning triggers.
 */
'use strict';

(function () {
  // ── Component Datasheet / Typical Current Specs (mA) ──
  const KNOWN_SPECS = {
    arduino_uno_r3: { current: 50,  voltage: 5.0, label: 'Arduino UNO R3', category: 'Controllers' },
    arduino_nano:   { current: 45,  voltage: 5.0, label: 'Arduino Nano', category: 'Controllers' },
    esp32:          { current: 160, voltage: 3.3, label: 'ESP32 Dev Module', category: 'Controllers' },
    led_red:        { current: 20,  voltage: 2.0, label: 'LED (Red)', category: 'Outputs' },
    led_green:      { current: 20,  voltage: 2.1, label: 'LED (Green)', category: 'Outputs' },
    led_blue:       { current: 20,  voltage: 3.2, label: 'LED (Blue)', category: 'Outputs' },
    buzzer:         { current: 30,  voltage: 5.0, label: 'Buzzer', category: 'Outputs' },
    push_button:    { current: 0.5, voltage: 5.0, label: 'Push Button', category: 'Inputs' },
    potentiometer:  { current: 0.5, voltage: 5.0, label: 'Potentiometer', category: 'Inputs' },
    resistor:       { current: 0,   voltage: 0,   label: 'Resistor', category: 'Passives' },
    capacitor:      { current: 0,   voltage: 0,   label: 'Capacitor', category: 'Passives' },
  };

  const CATEGORY_FALLBACKS = {
    Controllers: { current: 50,  voltage: 5.0 },
    Outputs:     { current: 20,  voltage: 5.0 },
    Inputs:      { current: 5,   voltage: 5.0 },
    Passives:    { current: 0,   voltage: 0 },
  };

  // ── Power Source Presets ──
  const BATTERY_PRESETS = [
    { id: '9v',        name: '9V Battery',                 voltage: 9.0, capacity: 400,   usablePct: 80 },
    { id: '4xaa',      name: '4x AA Batteries (6V)',       voltage: 6.0, capacity: 2000,  usablePct: 80 },
    { id: '4xaaa',     name: '4x AAA Batteries (6V)',      voltage: 6.0, capacity: 1000,  usablePct: 80 },
    { id: 'lipo1000',  name: 'LiPo Battery (3.7V 1000mAh)',voltage: 3.7, capacity: 1000,  usablePct: 80 },
    { id: 'lipo2000',  name: 'LiPo Battery (3.7V 2000mAh)',voltage: 3.7, capacity: 2000,  usablePct: 80 },
    { id: 'powerbank', name: 'USB Power Bank (5V 10000mAh)',voltage: 5.0, capacity: 10000, usablePct: 80 },
    { id: 'custom',    name: 'Custom Power Source',        voltage: 9.0, capacity: 1000,  usablePct: 80 },
  ];

  let currentConfig = {
    presetId:  '9v',
    voltage:   9.0,
    capacity:  400,
    usablePct: 80,
  };

  // ── Helper: Get power specs for a single canvas component ──
  function resolveComponentSpecs(comp) {
    const registry = window.LAB_COMPONENTS || {};
    const def = comp.def || registry[comp.defId] || {};
    const defId = comp.defId;

    // Check registry properties or custom data first
    if (def.currentMA != null || def.powerData?.current != null) {
      return {
        label: comp.props?.label || def.label || defId,
        current: Number(def.currentMA ?? def.powerData.current),
        voltage: Number(def.operatingVoltage ?? def.powerData?.voltage ?? 5.0),
        status: 'known',
        category: def.category || 'Other'
      };
    }

    // Check known specs lookup table
    if (KNOWN_SPECS[defId]) {
      const spec = KNOWN_SPECS[defId];
      return {
        label: comp.props?.label || spec.label,
        current: spec.current,
        voltage: spec.voltage,
        status: 'known',
        category: spec.category || def.category || 'Other'
      };
    }

    // Fall back by category
    const cat = def.category || 'Other';
    if (CATEGORY_FALLBACKS[cat]) {
      const fallback = CATEGORY_FALLBACKS[cat];
      return {
        label: comp.props?.label || def.label || defId,
        current: fallback.current,
        voltage: fallback.voltage,
        status: 'estimated',
        category: cat
      };
    }

    // Unknown power data
    return {
      label: comp.props?.label || def.label || defId,
      current: null,
      voltage: null,
      status: 'unknown',
      category: cat
    };
  }

  // ── Formatters ──
  function formatRuntime(hours) {
    if (!isFinite(hours) || hours <= 0 || hours === Infinity) return '∞';
    if (hours < 1) {
      const mins = Math.max(1, Math.round(hours * 60));
      return `~${mins} min${mins === 1 ? '' : 's'}`;
    }
    if (hours < 48) {
      return `~${hours.toFixed(1)} hrs`;
    }
    const days = (hours / 24).toFixed(1);
    return `~${days} days`;
  }

  // ── Compute Total Estimate & Component Breakdown ──
  function computeEstimate(config = currentConfig) {
    const rawComps = window.components || [];
    const breakdownMap = new Map();
    const warnings = [];

    let totalCurrentMA = 0;
    let hasUnknownSpecs = false;
    let hasControllers = false;

    rawComps.forEach(comp => {
      const spec = resolveComponentSpecs(comp);
      const key = comp.defId;

      if (spec.category === 'Controllers') hasControllers = true;

      if (spec.status === 'unknown' || spec.current == null) {
        hasUnknownSpecs = true;
        warnings.push(`Missing power data for "${spec.label}". Using 0 mA estimate.`);
      }

      const draw = spec.current || 0;
      totalCurrentMA += draw;

      if (breakdownMap.has(key)) {
        const item = breakdownMap.get(key);
        item.count += 1;
        item.totalCurrent += draw;
      } else {
        breakdownMap.set(key, {
          defId: key,
          label: spec.label,
          unitCurrent: spec.current,
          count: 1,
          totalCurrent: draw,
          status: spec.status,
          category: spec.category
        });
      }
    });

    const breakdownList = Array.from(breakdownMap.values());

    // Power (W) = Voltage * Current(A)
    const supplyVoltage = Number(config.voltage) || 5.0;
    const totalPowerW = (supplyVoltage * (totalCurrentMA / 1000));

    // Capacities & Runtimes
    const totalCapacity = Number(config.capacity) || 0;
    const usablePct = Math.min(100, Math.max(1, Number(config.usablePct) || 80));
    const practicalCapacity = totalCapacity * (usablePct / 100);

    const idealHours = totalCurrentMA > 0 ? (totalCapacity / totalCurrentMA) : Infinity;
    const practicalHours = totalCurrentMA > 0 ? (practicalCapacity / totalCurrentMA) : Infinity;

    // Warnings Checks
    if (totalCurrentMA > 500) {
      warnings.push(`High current draw (${totalCurrentMA} mA). Verify board regulator & power trace current limits.`);
    }

    if (hasControllers && (supplyVoltage < 4.5 || supplyVoltage > 12.0) && config.presetId !== 'lipo1000' && config.presetId !== 'lipo2000') {
      warnings.push(`Power source voltage (${supplyVoltage}V) may be out of optimal range (5V-12V) for standard microcontrollers.`);
    }

    return {
      componentsCount: rawComps.length,
      totalCurrentMA,
      totalPowerW,
      supplyVoltage,
      totalCapacity,
      usablePct,
      practicalCapacity,
      idealHours,
      practicalHours,
      idealFormatted: formatRuntime(idealHours),
      practicalFormatted: formatRuntime(practicalHours),
      breakdown: breakdownList,
      warnings,
      hasUnknownSpecs
    };
  }

  // ── Modal UI Construction & Management ──
  let modalEl = null;

  function ensureModalCreated() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.id = 'powerEstimatorModal';

    modalEl.innerHTML = `
      <div class="modal-content power-modal-content">
        <div class="modal-header">
          <h3>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px;color:var(--warning)">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Power & Battery Life Estimator
          </h3>
          <button class="close-btn" id="closePowerModalBtn">&times;</button>
        </div>

        <div class="modal-body power-modal-body">
          <!-- Summary Cards -->
          <div class="power-summary-grid">
            <div class="power-card">
              <span class="power-card-lbl">Total Current</span>
              <strong class="power-card-val" id="pwrTotalCurrent">0 mA</strong>
            </div>
            <div class="power-card">
              <span class="power-card-lbl">Total Power</span>
              <strong class="power-card-val" id="pwrTotalPower">0.00 W</strong>
            </div>
            <div class="power-card highlight">
              <span class="power-card-lbl">Ideal Runtime</span>
              <strong class="power-card-val" id="pwrIdealRuntime">∞</strong>
            </div>
            <div class="power-card highlight-success">
              <span class="power-card-lbl">Practical Runtime</span>
              <strong class="power-card-val" id="pwrPracticalRuntime">∞</strong>
              <small class="power-card-sub" id="pwrUsableSub">at 80% capacity</small>
            </div>
          </div>

          <!-- Warnings Area -->
          <div id="pwrWarningsContainer" class="pwr-warnings-box" style="display:none;"></div>

          <!-- Configuration Controls -->
          <div class="pwr-config-section">
            <div class="form-group">
              <label for="pwrPresetSelect">Power Source Preset</label>
              <select id="pwrPresetSelect" class="form-input">
                ${BATTERY_PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>

            <div class="pwr-inputs-row">
              <div class="form-group">
                <label for="pwrVoltageInput">Voltage (V)</label>
                <input type="number" id="pwrVoltageInput" class="form-input" step="0.1" min="0.1" value="9.0"/>
              </div>
              <div class="form-group">
                <label for="pwrCapacityInput">Capacity (mAh)</label>
                <input type="number" id="pwrCapacityInput" class="form-input" step="50" min="1" value="400"/>
              </div>
              <div class="form-group">
                <label for="pwrUsableInput">Usable Cap. (%)</label>
                <input type="number" id="pwrUsableInput" class="form-input" step="5" min="1" max="100" value="80"/>
              </div>
            </div>
          </div>

          <!-- Component Breakdown Table -->
          <div class="pwr-breakdown-section">
            <div class="pwr-section-header">
              <h4>Component Power Breakdown</h4>
              <button class="btn" id="pwrRecalcBtn" title="Recalculate live estimate">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/></svg>
                Recalculate
              </button>
            </div>

            <div class="pwr-table-wrapper" id="pwrTableWrapper">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <div class="pwr-disclaimer">
            * Estimates are based on typical component datasheets and active operational states, not exact hardware measurements.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // BIND EVENTS
    modalEl.querySelector('#closePowerModalBtn').addEventListener('click', closeModal);
    modalEl.addEventListener('click', e => {
      if (e.target === modalEl) closeModal();
    });

    const presetSel = modalEl.querySelector('#pwrPresetSelect');
    const voltInput = modalEl.querySelector('#pwrVoltageInput');
    const capInput  = modalEl.querySelector('#pwrCapacityInput');
    const useInput  = modalEl.querySelector('#pwrUsableInput');

    presetSel.addEventListener('change', () => {
      const selectedId = presetSel.value;
      const preset = BATTERY_PRESETS.find(p => p.id === selectedId);
      if (preset && selectedId !== 'custom') {
        currentConfig.presetId = preset.id;
        currentConfig.voltage = preset.voltage;
        currentConfig.capacity = preset.capacity;
        currentConfig.usablePct = preset.usablePct;

        voltInput.value = preset.voltage;
        capInput.value = preset.capacity;
        useInput.value = preset.usablePct;
      } else {
        currentConfig.presetId = 'custom';
      }
      refreshUI();
    });

    const onCustomInputChange = () => {
      presetSel.value = 'custom';
      currentConfig.presetId = 'custom';
      currentConfig.voltage = parseFloat(voltInput.value) || 5.0;
      currentConfig.capacity = parseFloat(capInput.value) || 1000;
      currentConfig.usablePct = parseFloat(useInput.value) || 80;
      refreshUI();
    };

    voltInput.addEventListener('input', onCustomInputChange);
    capInput.addEventListener('input', onCustomInputChange);
    useInput.addEventListener('input', onCustomInputChange);

    modalEl.querySelector('#pwrRecalcBtn').addEventListener('click', refreshUI);

    return modalEl;
  }

  function refreshUI() {
    if (!modalEl) return;
    const res = computeEstimate(currentConfig);

    modalEl.querySelector('#pwrTotalCurrent').textContent = `${res.totalCurrentMA} mA`;
    modalEl.querySelector('#pwrTotalPower').textContent = `${res.totalPowerW.toFixed(2)} W`;
    modalEl.querySelector('#pwrIdealRuntime').textContent = res.idealFormatted;
    modalEl.querySelector('#pwrPracticalRuntime').textContent = res.practicalFormatted;
    modalEl.querySelector('#pwrUsableSub').textContent = `at ${res.usablePct}% usable capacity`;

    // Warnings
    const warnBox = modalEl.querySelector('#pwrWarningsContainer');
    if (res.warnings.length > 0) {
      warnBox.style.display = 'block';
      warnBox.innerHTML = res.warnings.map(w => `
        <div class="pwr-warning-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>${w}</span>
        </div>
      `).join('');
    } else {
      warnBox.style.display = 'none';
      warnBox.innerHTML = '';
    }

    // Breakdown Table or Empty State
    const tableWrap = modalEl.querySelector('#pwrTableWrapper');
    if (res.componentsCount === 0) {
      tableWrap.innerHTML = `
        <div class="pwr-empty-state">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>Add some components to the canvas to see a power estimate.</p>
        </div>
      `;
    } else {
      let rowsHtml = res.breakdown.map(item => {
        const unitDisp = item.unitCurrent == null ? '<span class="status-badge unknown">Unknown</span>' : `${item.unitCurrent} mA`;
        const totalDisp = item.totalCurrent == null ? '0 mA' : `${item.totalCurrent} mA`;
        const badgeClass = item.status === 'known' ? 'known' : item.status === 'estimated' ? 'estimated' : 'unknown';

        return `
          <tr>
            <td>
              <strong>${item.label}</strong>
              <small class="comp-cat-tag">${item.category}</small>
            </td>
            <td style="text-align:center;">${item.count}</td>
            <td style="text-align:right;">${unitDisp}</td>
            <td style="text-align:right;font-weight:600;">${totalDisp}</td>
            <td style="text-align:center;">
              <span class="status-badge ${badgeClass}">${item.status}</span>
            </td>
          </tr>
        `;
      }).join('');

      tableWrap.innerHTML = `
        <table class="pwr-breakdown-table">
          <thead>
            <tr>
              <th>Component</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Unit Draw</th>
              <th style="text-align:right;">Total Draw</th>
              <th style="text-align:center;">Data Specs</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Total Canvas Current</strong></td>
              <td style="text-align:right;color:var(--accent);font-weight:700;">${res.totalCurrentMA} mA</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `;
    }
  }

  function openModal() {
    ensureModalCreated();
    refreshUI();
    modalEl.classList.add('active');
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove('active');
  }

  // ── Public Global API Exposure ──
  window.EduSimPowerEstimator = {
    open: openModal,
    close: closeModal,
    computeEstimate: function (optConfig) {
      return computeEstimate(optConfig || currentConfig);
    },
    getComponentBreakdown: function () {
      return computeEstimate(currentConfig).breakdown;
    },
    getPresets: function () {
      return BATTERY_PRESETS;
    }
  };

  // ── Auto-attach Power button listener when DOM is ready ──
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('powerEstBtn');
    if (btn) {
      btn.addEventListener('click', openModal);
    }
  });

})();
