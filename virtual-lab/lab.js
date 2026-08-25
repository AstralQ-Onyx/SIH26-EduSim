/**
 * EduSim Virtual Lab — 2D Canvas Engine
 * Handles: drag-from-palette, move, wire, select, delete, zoom/pan, properties
 */
'use strict';

// ── Load project metadata from URL params ─────────────────
const params  = new URLSearchParams(location.search);
const PROJECT = {
  id:         params.get('id')   || 'new_' + Date.now(),
  name:       params.get('name')      || 'Untitled Lab',
  controller: params.get('controller')|| 'none',
  mode:       params.get('mode')      || '2d',
};
document.getElementById('labProjectName').textContent = PROJECT.name;
document.getElementById('backBtn').addEventListener('click', () => {
  // Navigate back to dashboard; fall back to root if no history
  if (document.referrer && document.referrer !== location.href) {
    history.back();
  } else {
    location.href = '../platform/dashboard.html';
  }
});

// ── SVG canvas state ──────────────────────────────────────
const svg            = document.getElementById('labSvg');
const wiresLayer     = document.getElementById('wiresLayer');
const componentsLayer= document.getElementById('componentsLayer');
const activeWire     = document.getElementById('activeWire');

let zoom      = 1.0;
let panX      = 0;
let panY      = 0;
let isPanning = false;
let panStart  = null;

let selectedComp  = null;
let selectedWire  = null;
let wireMode      = false;
let wireStart     = null;   // { compId, pinId, x, y }

let components    = [];     // { id, defId, x, y, props, element }
let wires         = [];     // { id, from:{compId,pinId}, to:{compId,pinId}, element }
window.components = components;
window.wires      = wires;
let nextId        = 1;

const SNAP = 10;

// ── Undo / Redo ──────────────────────────────────────────────
const undoStack = [];
const redoStack = [];
let _suppressHistory = false;  // prevents restoreState from triggering new history entries

function pushHistory() {
  if (_suppressHistory) return;
  const state = {
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color })),
  };
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
}

function restoreState(data) {
  _suppressHistory = true;   // <<< stop child calls from polluting stacks
  document.getElementById('componentsLayer').innerHTML = '';
  document.getElementById('wiresLayer').innerHTML = '';
  components.length = 0;
  wires.length = 0;
  clearSelection();

  data.components.forEach(c => {
    const comp = addComponent(c.defId, c.x, c.y);
    comp.id = c.id;
    comp.element.dataset.id = c.id;
    comp.element.querySelectorAll('.pin-circle').forEach(circle => {
      circle.dataset.compId = c.id;
    });
    comp.rotation = c.rotation || 0;
    Object.assign(comp.props, c.props);
    if (c.props.label) comp.labelEl.textContent = c.props.label;
    comp.element.setAttribute('transform', `translate(${comp.x},${comp.y}) rotate(${comp.rotation} ${comp.def.w/2} ${comp.def.h/2})`);
  });
  data.wires.forEach(w => drawWire(w.from, w.to, w.color));
  _suppressHistory = false;  // <<< re-enable
  populateDeviceSelect();
}

function undo() {
  if (!undoStack.length) return;
  const cur = {
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color })),
  };
  redoStack.push(JSON.stringify(cur));
  restoreState(JSON.parse(undoStack.pop()));
  clog('[Lab] Undo ↩', 'sys');
}

function redo() {
  if (!redoStack.length) return;
  const cur = {
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color })),
  };
  undoStack.push(JSON.stringify(cur));
  restoreState(JSON.parse(redoStack.pop()));
  clog('[Lab] Redo ↪', 'sys');
}


// ── Build Component Palette ───────────────────────────────
(function buildPalette() {
  const body = document.getElementById('paletteBody');
  const cats  = {};
  Object.values(LAB_COMPONENTS).forEach(def => {
    if (!cats[def.category]) cats[def.category] = [];
    cats[def.category].push(def);
  });
  Object.entries(cats).forEach(([cat, defs]) => {
    const section = document.createElement('div');
    section.className = 'palette-category';
    section.innerHTML = `<div class="palette-cat-title">${cat}</div>`;
    defs.forEach(def => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.draggable = true;
      item.dataset.defId = def.id;
      item.innerHTML = `
        <div class="palette-thumb"><svg viewBox="0 0 ${def.w} ${def.h}" xmlns="http://www.w3.org/2000/svg">${def.svg}</svg></div>
        <div class="palette-info">
          <strong>${def.label}</strong>
          <small>${def.desc}</small>
        </div>`;
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('defId', def.id);
      });
      section.appendChild(item);
    });
    body.appendChild(section);
  });
})();

// ── Palette Search ────────────────────────────────────────
document.getElementById('compSearch').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.palette-item').forEach(el => {
    el.style.display = el.querySelector('strong').textContent.toLowerCase().includes(q) ? '' : 'none';
  });
  document.querySelectorAll('.palette-cat-title').forEach(title => {
    const section = title.parentElement;
    const visible = [...section.querySelectorAll('.palette-item')].some(i => i.style.display !== 'none');
    section.style.display = visible ? '' : 'none';
  });
});

// ── Coord helpers ─────────────────────────────────────────
function svgPoint(clientX, clientY) {
  const r = svg.getBoundingClientRect();
  return {
    x: (clientX - r.left - panX) / zoom,
    y: (clientY - r.top  - panY) / zoom,
  };
}
function snap(v) { return Math.round(v / SNAP) * SNAP; }

// ── Transform layer ───────────────────────────────────────
function applyTransform() {
  const t = `translate(${panX},${panY}) scale(${zoom})`;
  wiresLayer.setAttribute('transform', t);
  componentsLayer.setAttribute('transform', t);
  document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}

// ── Zoom ──────────────────────────────────────────────────
document.getElementById('zoomInBtn') .addEventListener('click', () => { zoom = Math.min(zoom + 0.1, 3);   applyTransform(); });
document.getElementById('zoomOutBtn').addEventListener('click', () => { zoom = Math.max(zoom - 0.1, 0.2); applyTransform(); });
document.getElementById('fitBtn')    .addEventListener('click', () => { zoom=1; panX=0; panY=0; applyTransform(); });

svg.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.08 : -0.08;
  zoom = Math.max(0.2, Math.min(3, zoom + delta));
  applyTransform();
}, { passive: false });

// ── Pan (middle mouse or space+drag) ──────────────────────
svg.addEventListener('mousedown', e => {
  if (e.button === 1 || (e.button === 0 && e.spaceKey)) {
    isPanning = true;
    panStart = { x: e.clientX - panX, y: e.clientY - panY };
    svg.style.cursor = 'grabbing';
    e.preventDefault();
  }
});
svg.addEventListener('mousemove', e => {
  if (isPanning) {
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    applyTransform();
  }
  if (wireMode && wireStart) {
    const pt = svgPoint(e.clientX, e.clientY);
    activeWire.setAttribute('x2', pt.x);
    activeWire.setAttribute('y2', pt.y);
  }
});
svg.addEventListener('mouseup',   e => { isPanning = false; svg.style.cursor = ''; });
svg.addEventListener('mouseleave',e => { isPanning = false; });

// ── Drop component from palette ───────────────────────────
const container = document.getElementById('canvasContainer');
container.addEventListener('dragover', e => e.preventDefault());
container.addEventListener('drop', e => {
  e.preventDefault();
  pushHistory();
  const defId = e.dataTransfer.getData('defId');
  if (!defId || !LAB_COMPONENTS[defId]) return;
  const pt = svgPoint(e.clientX, e.clientY);
  addComponent(defId, snap(pt.x), snap(pt.y));
});

// ── Add Component to Canvas ───────────────────────────────
function addComponent(defId, x, y) {
  const def = LAB_COMPONENTS[defId];
  const id  = 'c_' + (nextId++);
  const props = Object.assign({}, def.defaults);

  // Build SVG group
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.classList.add('lab-component');
  g.dataset.id = id;
  g.setAttribute('transform', `translate(${x},${y}) rotate(0 ${def.w/2} ${def.h/2})`);

  // Component body
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  body.classList.add('comp-body');
  body.innerHTML = def.svg;
  g.appendChild(body);

  // Pin hit circles
  def.pins.forEach(pin => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.classList.add('pin-circle');
    c.setAttribute('cx', pin.x);
    c.setAttribute('cy', pin.y);
    c.setAttribute('r',  5);
    c.dataset.pinId  = pin.id;
    c.dataset.compId = id;
    c.addEventListener('mousedown', onPinMouseDown);
    c.addEventListener('mouseup', onPinMouseUp);
    c.addEventListener('mouseover', onPinHover);
    c.addEventListener('mouseout', onPinOut);
    g.appendChild(c);
  });

  // Label
  const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lbl.setAttribute('x', def.w / 2);
  lbl.setAttribute('y', def.h + 12);
  lbl.setAttribute('text-anchor', 'middle');
  lbl.setAttribute('fill', '#5a7090');
  lbl.setAttribute('font-size', '10');
  lbl.setAttribute('font-family', 'Inter,sans-serif');
  lbl.textContent = props.label || def.label;
  g.appendChild(lbl);

  // Drag-to-move
  makeDraggable(g, id);

  componentsLayer.appendChild(g);

  const comp = { id, defId, x, y, rotation: 0, props, element:g, labelEl:lbl, def };
  components.push(comp);

  // Trigger modern drop/placement ripple animation
  if (window.effectsEngine) {
    window.effectsEngine.spawnDropRipple(x, y, def.w, def.h);
  }

  clog(`Added: ${def.label}`, 'sys');
  selectComponent(comp);
  return comp;
}

// ── Make component draggable ──────────────────────────────
function makeDraggable(g, _unusedId) {
  let dragging = false, ox=0, oy=0;
  g.addEventListener('mousedown', e => {
    if (wireMode || e.target.classList.contains('pin-circle')) return;
    e.stopPropagation();
    pushHistory();
    dragging = true;
    const pt   = svgPoint(e.clientX, e.clientY);
    const comp = components.find(c => c.id === g.dataset.id);  // always read live id
    if (!comp) return;
    ox = pt.x - comp.x;
    oy = pt.y - comp.y;
    selectComponent(comp);
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const pt   = svgPoint(e.clientX, e.clientY);
    const comp = components.find(c => c.id === g.dataset.id);  // always read live id
    if (!comp) return;
    comp.x = snap(pt.x - ox);
    comp.y = snap(pt.y - oy);
    comp.element.setAttribute('transform', `translate(${comp.x},${comp.y}) rotate(${comp.rotation || 0} ${comp.def.w/2} ${comp.def.h/2})`);
    updateWiresForComp(g.dataset.id);
  });
  window.addEventListener('mouseup', () => { dragging = false; });
}

// ── Tooltip element ───────────────────────────────────────
const pinTooltip = document.createElement('div');
pinTooltip.className = 'pin-tooltip';
document.body.appendChild(pinTooltip);

// ── Wire Mode & Drawing ───────────────────────────────────
// We no longer strictly need the Wire button, but we'll keep it for explicit mode
const wireBtn = document.getElementById('wireBtn');
wireBtn.addEventListener('click', () => {
  wireMode = !wireMode;
  wireBtn.classList.toggle('active', wireMode);
  svg.style.cursor = wireMode ? 'crosshair' : '';
  if (!wireMode) { cancelWire(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'W') { wireBtn.click(); }
  if (e.key === 'Escape')             { cancelWire(); if(wireMode) wireBtn.click(); }
  
  // X-Ray Mode Toggle (X key)
  if ((e.key === 'x' || e.key === 'X') && !e.target.matches('input, textarea')) {
    if (window.xrayEngine) window.xrayEngine.toggle();
  }

  // Undo / Redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault();
    redo();
  }

  // Rotate (R key)
  if ((e.key === 'r' || e.key === 'R') && selectedComp) {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      pushHistory();
      selectedComp.rotation = ((selectedComp.rotation || 0) + 90) % 360;
      selectedComp.element.setAttribute('transform', `translate(${selectedComp.x},${selectedComp.y}) rotate(${selectedComp.rotation} ${selectedComp.def.w/2} ${selectedComp.def.h/2})`);
      wires.forEach(updateWirePath);
    }
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input,textarea')) {
    deleteSelected();
  }
});

window.addEventListener('mouseup', () => {
  // If we were dragging a wire but didn't land on a pin, cancel it
  if (wireStart) cancelWire();
});

function onPinHover(e) {
  const pinId = e.target.dataset.pinId;
  const compId = e.target.dataset.compId;
  const comp = components.find(c => c.id === compId);
  const pin = comp?.def.pins.find(p => p.id === pinId);
  if (!pin) return;

  pinTooltip.innerHTML = `<strong>${pin.id}</strong><br/>${pin.label}`;
  pinTooltip.style.left = (e.clientX + 15) + 'px';
  pinTooltip.style.top = (e.clientY + 15) + 'px';
  pinTooltip.style.display = 'block';

  if (window.xrayEngine) {
    window.xrayEngine.highlightNetForPin(compId, pinId, components, wires);
  }
}

function onPinOut() {
  pinTooltip.style.display = 'none';
  if (window.xrayEngine) {
    window.xrayEngine.clearHighlights();
  }
}

function onPinMouseDown(e) {
  e.stopPropagation();
  const compId = e.target.dataset.compId;
  const pinId  = e.target.dataset.pinId;
  const comp   = components.find(c => c.id === compId);
  const pin    = comp?.def.pins.find(p => p.id === pinId);
  if (!comp || !pin) return;

  // Rotation-aware pin start position
  function rotPin(comp, pin) {
    const cx = comp.def.w / 2, cy = comp.def.h / 2;
    const rad = (comp.rotation || 0) * Math.PI / 180;
    const dx = pin.x - cx, dy = pin.y - cy;
    return {
      x: comp.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: comp.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }
  const {x: ax, y: ay} = rotPin(comp, pin);

  // Force wireMode on when dragging from a pin
  wireMode = true; 
  wireStart = { compId, pinId, x: ax, y: ay };
  activeWire.setAttribute('x1', ax);
  activeWire.setAttribute('y1', ay);
  activeWire.setAttribute('x2', ax);
  activeWire.setAttribute('y2', ay);
  activeWire.setAttribute('display', '');
  svg.style.cursor = 'crosshair';
}

function onPinMouseUp(e) {
  if (!wireStart) return;
  e.stopPropagation();
  const compId = e.target.dataset.compId;
  const pinId  = e.target.dataset.pinId;
  
  if (wireStart.compId !== compId) {
    const comp = components.find(c => c.id === compId);
    const pin = comp?.def.pins.find(p => p.id === pinId);
    if (comp && pin) {
      drawWire(wireStart, { compId, pinId, x: comp.x + pin.x, y: comp.y + pin.y });
    }
  }
  cancelWire();
}

function cancelWire() {
  wireStart = null;
  activeWire.setAttribute('display', 'none');
  if (!wireBtn.classList.contains('active')) {
    wireMode = false;
    svg.style.cursor = '';
  }
}

function drawWire(from, to, color = '#00d4ff') {
  const id   = 'w_' + (nextId++);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.classList.add('lab-wire');
  line.setAttribute('stroke', color);
  line.dataset.wireId = id;
  line.addEventListener('click', () => selectWire(id));

  pushHistory();
  const wire = { id, from, to, element:line, color };
  wires.push(wire);
  wiresLayer.appendChild(line);
  updateWirePath(wire);
  clog(`Wire: ${from.compId}.${from.pinId} → ${to.compId}.${to.pinId}`, 'sys');

  // Trigger electric connection snap spark at target pin
  if (window.effectsEngine) {
    const tc = components.find(c => c.id === to.compId);
    const tp = tc?.def?.pins?.find(p => p.id === to.pinId);
    if (tc && tp) {
      window.effectsEngine.spawnConnectionSpark(tc.x + tp.x, tc.y + tp.y, color);
    }
  }

  // Run DRC analysis after every new wire connection
  if (window.circuitDRCEngine) {
    setTimeout(() => window.circuitDRCEngine.analyze(components, wires), 50);
  }
}

function updateWirePath(wire) {
  const fc = components.find(c => c.id === wire.from.compId);
  const tc = components.find(c => c.id === wire.to.compId);
  if (!fc || !tc) return;
  const fp = fc.def.pins.find(p => p.id === wire.from.pinId);
  const tp = tc.def.pins.find(p => p.id === wire.to.pinId);
  if (!fp || !tp) return;

  // Rotation-aware pin coords
  function rotatedPin(comp, pin) {
    const cx = comp.def.w / 2;
    const cy = comp.def.h / 2;
    const rad = (comp.rotation || 0) * Math.PI / 180;
    const dx = pin.x - cx, dy = pin.y - cy;
    return {
      x: comp.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: comp.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }

  const {x:x1, y:y1} = rotatedPin(fc, fp);
  const {x:x2, y:y2} = rotatedPin(tc, tp);
  
  // Ortho routing: L-shaped path
  const mx = (x1 + x2) / 2;
  wire.element.setAttribute('d', `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`);
}

function updateWiresForComp(compId) {
  wires.filter(w => w.from.compId === compId || w.to.compId === compId)
       .forEach(updateWirePath);
}

// ── Selection ─────────────────────────────────────────────
function selectComponent(comp) {
  clearSelection();
  selectedComp = comp;
  comp.element.classList.add('selected');
  renderProps(comp);
}

function selectWire(wireId) {
  clearSelection();
  selectedWire = wires.find(w => w.id === wireId);
  if (selectedWire) {
    selectedWire.element.classList.add('selected');
    renderWireProps(selectedWire);
  }
}

function clearSelection() {
  if (selectedComp) { selectedComp.element.classList.remove('selected'); selectedComp = null; }
  if (selectedWire) { selectedWire.element.classList.remove('selected'); selectedWire = null; }
  document.getElementById('propsBody').innerHTML = `
    <div class="props-empty">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>Select a component to inspect</p>
    </div>`;
}

svg.addEventListener('click', e => {
  if (e.target === svg || e.target.id === 'svgBg') clearSelection();
});

// ── Delete ────────────────────────────────────────────────
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
function deleteSelected() {
  pushHistory();
  if (selectedWire) {
    selectedWire.element.remove();
    wires = wires.filter(w => w !== selectedWire);
    window.wires = wires;
    selectedWire = null;
  } else if (selectedComp) {
    // Stop smoke if any and emit deletion disintegration particles
    if (window.effectsEngine) {
      window.effectsEngine.stopComponentSmoke(selectedComp);
      window.effectsEngine.spawnDeleteBurst(selectedComp.x, selectedComp.y, selectedComp.def.w, selectedComp.def.h);
    }
    // Remove connected wires
    wires = wires.filter(w => {
      if (w.from.compId === selectedComp.id || w.to.compId === selectedComp.id) {
        w.element.remove(); return false;
      }
      return true;
    });
    window.wires = wires;
    selectedComp.element.remove();
    components = components.filter(c => c !== selectedComp);
    window.components = components;
    selectedComp = null;
    clearSelection();
    populateDeviceSelect();
  }

  // Re-run DRC after deletion to clear stale faults
  if (window.circuitDRCEngine) {
    setTimeout(() => window.circuitDRCEngine.analyze(components, wires), 50);
  }
}

// ── Properties Inspector ──────────────────────────────────
function renderWireProps(wire) {
  const body = document.getElementById('propsBody');
  body.innerHTML = `<div class="prop-group"><span class="prop-label">Wire</span><strong style="font-size:13px">${wire.from.pinId} → ${wire.to.pinId}</strong></div>`;
  
  const grp = document.createElement('div');
  grp.className = 'prop-group';
  grp.innerHTML = `<label class="prop-label" for="prop_wirecolor">Wire Color</label>`;
  
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'prop-input prop-color';
  input.id = 'prop_wirecolor';
  input.value = wire.color || '#00d4ff';
  
  input.addEventListener('change', () => {
    wire.color = input.value;
    wire.element.setAttribute('stroke', wire.color);
  });
  
  grp.appendChild(input);
  body.appendChild(grp);
}

function renderProps(comp) {
  const body = document.getElementById('propsBody');
  body.innerHTML = `<div class="prop-group"><span class="prop-label">Component</span><strong style="font-size:13px">${comp.def.label}</strong></div>`;

  comp.def.props.forEach(p => {
    const grp = document.createElement('div');
    grp.className = 'prop-group';
    grp.innerHTML = `<label class="prop-label" for="prop_${p.key}">${p.label}</label>`;

    let input;
    if (p.type === 'select') {
      input = document.createElement('select');
      input.className = 'prop-input prop-select';
      p.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = o;
        if (String(comp.props[p.key]) === o) opt.selected = true;
        input.appendChild(opt);
      });
    } else if (p.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.className = 'prop-input prop-color';
      input.value = comp.props[p.key] || '#ffffff';
    } else {
      input = document.createElement('input');
      input.type = p.type === 'number' ? 'number' : 'text';
      input.className = 'prop-input';
      input.value = comp.props[p.key] ?? '';
      if (p.min != null) input.min = p.min;
      if (p.max != null) input.max = p.max;
    }
    input.id = 'prop_' + p.key;
    input.addEventListener('change', () => {
      comp.props[p.key] = p.type === 'number' ? parseFloat(input.value) : input.value;
      if (p.key === 'label') {
        comp.labelEl.textContent = input.value || comp.def.label;
      }
      if (p.key === 'color') {
        // Update LED body fill
        const ellipse = comp.element.querySelector('ellipse');
        if (ellipse) ellipse.setAttribute('fill', input.value);
      }
    });
    grp.appendChild(input);
    body.appendChild(grp);
  });

  // Pin table
  const tbl = document.createElement('div');
  tbl.innerHTML = `<span class="prop-label" style="margin-top:10px;display:block">Pins</span>`;
  comp.def.pins.forEach(pin => {
    tbl.innerHTML += `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <div style="width:8px;height:8px;border-radius:50%;background:${
          pin.type==='power'?'#ff4466':pin.type==='gnd'?'#888':pin.type==='analog'?'#aa66ff':'#00d4ff'}"></div>
        <span style="font-size:11px;font-weight:600">${pin.id}</span>
        <span style="font-size:10px;color:var(--muted)">${pin.label}</span>
      </div>`;
  });
  body.appendChild(tbl);
}

// ── Simulation ────────────────────────────────────────────
document.getElementById('runBtn').addEventListener('click',  startSim);
document.getElementById('stopBtn').addEventListener('click', stopSim);

// Arduino UNO digital pin → AVR port+bit map
// D0..D7  = Port D 0..7
// D8..D13 = Port B 0..5
const PIN_MAP = {
  'D0':'D0','D1':'D1','D2':'D2','D3':'D3','D4':'D4','D5':'D5','D6':'D6','D7':'D7',
  'D8':'B0','D9':'B1','D10':'B2','D11':'B3','D12':'B4','D13':'B5',
  'LED_BUILTIN':'B5',
};



let audioCtx = null;
const activeOscillators = {};

function driveComponent(comp, pinId, isHigh) {
  if (comp.defId.startsWith('led_')) {
    const ellipse = comp.element.querySelector('ellipse');
    if (ellipse) {
      ellipse.style.filter = isHigh
        ? `brightness(2.5) drop-shadow(0 0 8px ${comp.props.color || '#ff0033'})`
        : 'brightness(0.35)';
    }
  } else if (comp.defId === 'buzzer') {
    if (isHigh) {
      if (!activeOscillators[comp.id]) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440Hz beep
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); // Low volume
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        activeOscillators[comp.id] = osc;
        comp.element.style.filter = 'drop-shadow(0 0 8px #00aaff)';
      }
    } else {
      if (activeOscillators[comp.id]) {
        activeOscillators[comp.id].stop();
        activeOscillators[comp.id].disconnect();
        delete activeOscillators[comp.id];
        comp.element.style.filter = '';
      }
    }
  }
}

function resetVisuals() {
  components.forEach(comp => {
    if (comp.defId.startsWith('led_')) {
      const ellipse = comp.element.querySelector('ellipse');
      if (ellipse) ellipse.style.filter = '';
    } else if (comp.defId === 'buzzer') {
      if (activeOscillators[comp.id]) {
        activeOscillators[comp.id].stop();
        delete activeOscillators[comp.id];
      }
      comp.element.style.filter = '';
    }
  });
}

function setSimUI(running) {
  document.getElementById('simDot').classList.toggle('running', running);
  document.getElementById('simStatusText').textContent = running ? 'Running' : 'Ready';
  document.getElementById('runBtn').disabled  = running;
  document.getElementById('stopBtn').disabled = !running;

  if (window.currentFlowEngine) {
    if (running) window.currentFlowEngine.start();
    else window.currentFlowEngine.stop();
  }

  // Run DRC at simulation start to catch circuit errors before damage
  if (running && window.circuitDRCEngine) {
    setTimeout(() => {
      const faults = window.circuitDRCEngine.analyze(components, wires);
      if (faults.length > 0) {
        clog(`[DRC] ⚠ ${faults.length} circuit fault(s) detected! Click "Diagnostics & Faults" tab.`, 'warn');
        // Auto-expand console to show warning
        const labConsole = document.getElementById('labConsole');
        if (labConsole) labConsole.classList.add('expanded');
      }
    }, 100);
  }
}

function startSim() {
  if (EduSimulator.isRunning()) return;
  clog('[Simulator] No code uploaded — use the Code panel to compile & run.', 'warn');
}

function stopSim() {
  EduSimulator.stopSimulation();
  setSimUI(false);
  resetVisuals();
  if (window.currentFlowEngine) {
    window.currentFlowEngine.stop();
  }
  clog('[Simulator] Stopped.', 'warn');
}

// Called from Upload button in code panel
async function runUpload() {
  const deviceId = document.getElementById('codeDeviceSelect').value;
  if (!deviceId) {
    clog('[Code] Please select a target device first.', 'err');
    return;
  }
  if (!labEditor) {
    clog('[Code] Editor not ready yet.', 'err');
    return;
  }
  const code  = labEditor.getValue();
  const comp  = components.find(c => c.id === deviceId);
  const defId = comp?.defId || 'arduino_uno_r3';

  clog(`[Code] Uploading to ${comp?.def?.label || defId}…`, 'sys');

  EduSimulator.stopSimulation();
  setSimUI(false);
  resetVisuals();

  // Enable console input during sim
  const cInput = document.getElementById('consoleInput');
  const cSend  = document.getElementById('consoleSend');
  if (cInput) cInput.disabled = false;
  if (cSend)  cSend.disabled  = false;

  const ok = await EduSimulator.compileAndSimulate(code, defId, {
    onLog: (msg, type) => {
      clog(msg, type);
      if (type !== 'err') SerialPlotter.pushData(msg);
    },
    onError: (msg) => clog(msg, 'err'),
    onReady: () => setSimUI(true),
    onSerial: (line) => {
      SerialPlotter.pushData(line);
      const sBody = document.getElementById('serialBody');
      if (sBody) {
        const d = document.createElement('div');
        d.className = 'clog';
        d.textContent = line;
        sBody.appendChild(d);
        sBody.scrollTop = 9999;
      }
    },
    onMemory: (stats, fqbn) => {
      MemoryMeter.update(stats, defId);
    },
    onPin: (portName, bit, pinState) => {
      const isHigh = (pinState === 1 || pinState === true);

      const ctrlComp = comp;
      if (!ctrlComp) return;

      wires.forEach(w => {
        let matches = false;
        let cPinId = '';

        if (w.from.compId === ctrlComp.id) cPinId = w.from.pinId;
        else if (w.to.compId === ctrlComp.id) cPinId = w.to.pinId;

        if (!cPinId) return;

        if (portName === 'PSEUDO') {
          // For pseudo-sim, bit is the raw pin number (e.g. 23)
          if (cPinId === `D${bit}` || cPinId === bit.toString() || cPinId === `A${bit}`) {
            matches = true;
          }
        } else {
          // Normal AVR avr8js logic
          const portBit = PIN_MAP[cPinId];
          if (portBit && portBit === `${portName}${bit}`) {
            matches = true;
          }
        }

        if (matches) {
          if (window.currentFlowEngine) {
            window.currentFlowEngine.setPinState(cPinId, isHigh ? 1 : 0);
          }
          if (w.from.compId === ctrlComp.id) {
            const toComp = components.find(c => c.id === w.to.compId);
            if (toComp) driveComponent(toComp, w.to.pinId, isHigh);
          } else {
            const fromComp = components.find(c => c.id === w.from.compId);
            if (fromComp) driveComponent(fromComp, w.from.pinId, isHigh);
          }
        }
      });
    },
  });

  if (!ok) {
    setSimUI(false);
    if (cInput) cInput.disabled = true;
    if (cSend)  cSend.disabled  = true;
  }
}

// ── Save ──────────────────────────────────────────────────
document.getElementById('saveLabBtn').addEventListener('click', saveProject);
function saveProject() {
  const data = {
    id: PROJECT.id,
    name: PROJECT.name,
    controller: PROJECT.controller,
    code: labEditor ? labEditor.getValue() : '',
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:w.from, to:w.to, color:w.color })),
  };
  localStorage.setItem('edusim_vlab_' + PROJECT.id, JSON.stringify(data));
  clog('[Lab] Project saved to local storage ✓', 'ok');
}

// ── Load ──────────────────────────────────────────────────
function loadProject() {
  const raw = localStorage.getItem('edusim_vlab_' + PROJECT.id);
  if (!raw) {
    // Auto-add the selected controller to canvas
    if (PROJECT.controller !== 'none' && LAB_COMPONENTS[PROJECT.controller]) {
      addComponent(PROJECT.controller, 150, 100);
    }
    populateDeviceSelect();
    return;
  }
  const data = JSON.parse(raw);

  data.components.forEach(c => {
    const comp = addComponent(c.defId, c.x, c.y);
    // Restore the original ID so wires reconnect properly
    comp.id = c.id;
    comp.element.dataset.id = c.id;
    comp.element.querySelectorAll('.pin-circle').forEach(circle => {
      circle.dataset.compId = c.id;
    });
    comp.rotation = c.rotation || 0;
    Object.assign(comp.props, c.props);
    if (c.props.label) comp.labelEl.textContent = c.props.label;
    comp.element.setAttribute('transform',
      `translate(${comp.x},${comp.y}) rotate(${comp.rotation} ${comp.def.w/2} ${comp.def.h/2})`);
  });

  data.wires.forEach(w => drawWire(w.from, w.to, w.color));

  // Restore editor code (may run after Monaco is ready)
  if (data.code) {
    if (labEditor) {
      labEditor.setValue(data.code);
    } else {
      // Monaco not ready yet — store and apply once it loads
      window._pendingEditorCode = data.code;
    }
  }

  populateDeviceSelect();
  clog('[Lab] Project loaded ✓', 'ok');
}

// ── Console helpers ───────────────────────────────────────
function clog(msg, type='') {
  const el = document.createElement('div');
  el.className = 'clog ' + type;
  el.textContent = msg;
  document.getElementById('consoleBody').appendChild(el);
  document.getElementById('consoleBody').scrollTop = 9999;
}

// ── Undo / Redo buttons ───────────────────────────────────
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

// ── Console tabs ──────────────────────────────────────────
const labConsole = document.getElementById('labConsole');
document.getElementById('toggleConsoleBtn').addEventListener('click', () => {
  labConsole.classList.toggle('expanded');
});

document.querySelectorAll('.console-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.console-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.console-body').forEach(b => b.style.display = 'none');
    document.getElementById(tab.dataset.ctab + 'Body').style.display = 'block';

    // Refresh DRC analysis when user opens Diagnostics tab
    if (tab.dataset.ctab === 'diagnostics' && window.circuitDRCEngine) {
      window.circuitDRCEngine.analyze(components, wires);
    }
  });
});

// ── Code Panel & Theme ────────────────────────────────────
const codePanel = document.getElementById('codePanel');
let labEditor;

function populateDeviceSelect() {
  const sel = document.getElementById('codeDeviceSelect');
  const oldVal = sel.value;
  sel.innerHTML = '<option value="">Select target device...</option>';
  components.filter(c => c.def.category === 'Controllers').forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.props.label || c.def.label;
    sel.appendChild(opt);
  });
  if (components.find(c => c.id === oldVal)) {
    sel.value = oldVal;
  }
}

document.getElementById('codeDeviceSelect').addEventListener('focus', populateDeviceSelect);
document.getElementById('codeDeviceSelect').addEventListener('mousedown', populateDeviceSelect);
document.getElementById('codeDeviceSelect').addEventListener('change', (e) => {
  const deviceId = e.target.value;
  const comp = components.find(c => c.id === deviceId);
  const defId = comp?.defId || 'arduino_uno_r3';
  if (labEditor) {
    MemoryMeter.update(EduSimulator.estimateMemory(labEditor.getValue(), defId), defId);
  } else {
    MemoryMeter.update({}, defId);
  }
});

document.getElementById('toggleCodeBtn').addEventListener('click', () => {
  const isOpening = codePanel.style.display === 'none';
  codePanel.style.display = isOpening ? 'flex' : 'none';
  if (isOpening) {
    populateDeviceSelect();
    if (labEditor) setTimeout(() => labEditor.layout(), 10);
  }
});
document.getElementById('closeCodeBtn').addEventListener('click', () => {
  codePanel.style.display = 'none';
});

document.getElementById('uploadCodeBtn').addEventListener('click', runUpload);

document.getElementById('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  if (labEditor) {
    monaco.editor.setTheme(isLight ? 'vs-light' : 'vs-dark');
  }
});

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';
if (typeof require !== 'undefined') {
  require.config({ paths: { 'vs': MONACO_CDN } });
  require(['vs/editor/editor.main'], function() {
    labEditor = monaco.editor.create(document.getElementById('monacoLabEditor'), {
      value: [
        '// EduSim Virtual Lab — Simulation Code',
        '// Select your target device from the dropdown below, then click Upload.',
        '',
        'void setup() {',
        '  // Runs once at startup',
        '  pinMode(LED_BUILTIN, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  // Runs repeatedly',
        '  digitalWrite(LED_BUILTIN, HIGH);',
        '  delay(500);',
        '  digitalWrite(LED_BUILTIN, LOW);',
        '  delay(500);',
        '}',
      ].join('\n'),
      language: 'cpp',
      theme: document.body.classList.contains('light-theme') ? 'vs-light' : 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'Fira Code', monospace",
      fontLigatures: true,
      wordWrap: 'on',
      tabSize: 2,
    });
    // Apply any code that was loaded before Monaco was ready
    if (window._pendingEditorCode) {
      labEditor.setValue(window._pendingEditorCode);
      delete window._pendingEditorCode;
    }
  });
}

// ── Memory Meter Module ────────────────────────────────────
const MemoryMeter = {
  profiles: {
    arduino_uno_r3:   { name: 'ATmega328P', flashTotal: 32256, ramTotal: 2048 },
    arduino_nano:     { name: 'ATmega328P', flashTotal: 32256, ramTotal: 2048 },
    esp32_dev_module: { name: 'ESP32 (WROOM)', flashTotal: 1310720, ramTotal: 524288 },
    esp32:            { name: 'ESP32', flashTotal: 1310720, ramTotal: 524288 },
    raspberry_pi_pico:{ name: 'RP2040', flashTotal: 2097152, ramTotal: 270336 }
  },

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  },

  update(stats = {}, boardKey = 'arduino_uno_r3') {
    const profile = this.profiles[boardKey] || this.profiles.arduino_uno_r3;
    const badge = document.getElementById('memBoardBadge');
    if (badge) badge.textContent = profile.name;

    const flashUsed = stats.flashUsed || 0;
    const flashTotal = stats.flashTotal || profile.flashTotal;
    const flashPct = Math.min(100, stats.flashPercent !== undefined ? stats.flashPercent : ((flashUsed / flashTotal) * 100));

    const ramUsed = stats.ramUsed || 0;
    const ramTotal = stats.ramTotal || profile.ramTotal;
    const ramPct = Math.min(100, stats.ramPercent !== undefined ? stats.ramPercent : ((ramUsed / ramTotal) * 100));

    // Flash UI
    const flashValEl = document.getElementById('flashUsageVal');
    const flashBarEl = document.getElementById('flashProgressBar');
    const flashFreeEl = document.getElementById('flashFreeVal');
    const flashStateEl = document.getElementById('flashState');

    if (flashValEl) flashValEl.textContent = `${this.formatBytes(flashUsed)} / ${this.formatBytes(flashTotal)} (${flashPct.toFixed(1)}%)`;
    if (flashBarEl) {
      flashBarEl.style.width = `${Math.max(1, flashPct)}%`;
      flashBarEl.className = 'mem-bar flash-bar' + (flashPct > 90 ? ' danger' : flashPct > 75 ? ' warn' : '');
    }
    if (flashFreeEl) flashFreeEl.textContent = `${this.formatBytes(Math.max(0, flashTotal - flashUsed))} Free`;
    if (flashStateEl) {
      flashStateEl.textContent = flashPct > 90 ? 'Critical' : flashPct > 75 ? 'Warning' : 'Optimal';
      flashStateEl.className = 'mem-state' + (flashPct > 90 ? ' danger' : flashPct > 75 ? ' warn' : '');
    }

    // SRAM UI
    const sramValEl = document.getElementById('sramUsageVal');
    const sramBarEl = document.getElementById('sramProgressBar');
    const sramFreeEl = document.getElementById('sramFreeVal');
    const sramStateEl = document.getElementById('sramState');

    if (sramValEl) sramValEl.textContent = `${this.formatBytes(ramUsed)} / ${this.formatBytes(ramTotal)} (${ramPct.toFixed(1)}%)`;
    if (sramBarEl) {
      sramBarEl.style.width = `${Math.max(1, ramPct)}%`;
      sramBarEl.className = 'mem-bar sram-bar' + (ramPct > 90 ? ' danger' : ramPct > 75 ? ' warn' : '');
    }
    if (sramFreeEl) sramFreeEl.textContent = `${this.formatBytes(Math.max(0, ramTotal - ramUsed))} Free`;
    if (sramStateEl) {
      sramStateEl.textContent = ramPct > 90 ? 'Critical' : ramPct > 75 ? 'Warning' : 'Optimal';
      sramStateEl.className = 'mem-state' + (ramPct > 90 ? ' danger' : ramPct > 75 ? ' warn' : '');
    }
  }
};

// ── Real-Time Serial Plotter Engine ────────────────────────
const SerialPlotter = {
  canvas: null,
  ctx: null,
  channels: new Map(), // name -> { color, data: [], latest }
  maxPoints: 75,
  palette: ['#00d4ff', '#b34eff', '#00ff88', '#ffd700', '#ff4466', '#ff8c00', '#2de2e6'],
  isPaused: false,
  demoTimer: null,
  demoAngle: 0,
  animationId: null,

  init() {
    this.canvas = document.getElementById('serialPlotterCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    const pauseBtn = document.getElementById('plotPauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

    const clearBtn = document.getElementById('plotClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clear());

    const demoBtn = document.getElementById('plotDemoBtn');
    if (demoBtn) demoBtn.addEventListener('click', () => this.toggleDemo());

    this.renderLoop();
  },

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = Math.floor(rect.width * (window.devicePixelRatio || 1));
      this.canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
    }
  },

  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseText = document.getElementById('plotPauseText');
    const pauseBtn = document.getElementById('plotPauseBtn');
    if (pauseText) pauseText.textContent = this.isPaused ? 'Resume' : 'Pause';
    if (pauseBtn) pauseBtn.classList.toggle('active', this.isPaused);
  },

  clear() {
    this.channels.clear();
    this.updateChannelTags();
  },

  toggleDemo() {
    const demoBtn = document.getElementById('plotDemoBtn');
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
      if (demoBtn) demoBtn.classList.remove('active');
    } else {
      if (demoBtn) demoBtn.classList.add('active');
      this.demoTimer = setInterval(() => {
        this.demoAngle += 0.12;
        const sinVal = Math.sin(this.demoAngle) * 50 + 50;
        const cosVal = Math.cos(this.demoAngle * 0.7) * 30 + 40;
        const noise  = Math.sin(this.demoAngle * 2.3) * 15 + Math.random() * 8 + 25;
        this.pushData(`sine:${sinVal.toFixed(1)}, cos:${cosVal.toFixed(1)}, sensor:${noise.toFixed(1)}`);
      }, 50);
    }
  },

  pushData(rawLine) {
    if (this.isPaused || !rawLine) return;
    const trimmed = String(rawLine).trim();
    if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('>')) return;

    // Pattern 1: key:val, key2:val2 OR CSV: 12.3, 45.6
    if (trimmed.includes(':') || trimmed.includes(',')) {
      const parts = trimmed.split(',');
      let matchedAny = false;

      parts.forEach((p, idx) => {
        const seg = p.trim();
        if (seg.includes(':')) {
          const [key, valStr] = seg.split(':');
          const num = parseFloat(valStr);
          if (!isNaN(num)) {
            this.addPoint(key.trim(), num);
            matchedAny = true;
          }
        } else {
          const num = parseFloat(seg);
          if (!isNaN(num)) {
            this.addPoint(`Ch ${idx + 1}`, num);
            matchedAny = true;
          }
        }
      });

      if (matchedAny) {
        this.updateChannelTags();
        return;
      }
    }

    // Pattern 2: Single number
    const singleNum = parseFloat(trimmed);
    if (!isNaN(singleNum)) {
      this.addPoint('Value', singleNum);
      this.updateChannelTags();
    }
  },

  addPoint(channelName, value) {
    if (!this.channels.has(channelName)) {
      const color = this.palette[this.channels.size % this.palette.length];
      this.channels.set(channelName, { color, data: [], latest: value });
    }
    const ch = this.channels.get(channelName);
    ch.latest = value;
    ch.data.push(value);
    if (ch.data.length > this.maxPoints) {
      ch.data.shift();
    }
  },

  updateChannelTags() {
    const wrap = document.getElementById('plotterChannels');
    if (!wrap) return;
    if (this.channels.size === 0) {
      wrap.innerHTML = '<span class="no-stream-msg">Waiting for serial stream data…</span>';
      return;
    }
    wrap.innerHTML = '';
    this.channels.forEach((ch, name) => {
      const tag = document.createElement('div');
      tag.className = 'channel-tag';
      tag.innerHTML = `
        <span class="ch-color-dot" style="background: ${ch.color};"></span>
        <span>${name}:</span>
        <strong style="color: ${ch.color};">${typeof ch.latest === 'number' ? ch.latest.toFixed(1) : ch.latest}</strong>
      `;
      wrap.appendChild(tag);
    });
  },

  renderLoop() {
    this.render();
    this.animationId = requestAnimationFrame(() => this.renderLoop());
  },

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Compute min / max range
    let minVal = Infinity;
    let maxVal = -Infinity;

    this.channels.forEach(ch => {
      ch.data.forEach(val => {
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      });
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      minVal = 0;
      maxVal = 100;
    } else if (minVal === maxVal) {
      minVal -= 5;
      maxVal += 5;
    } else {
      const pad = (maxVal - minVal) * 0.12;
      minVal -= pad;
      maxVal += pad;
    }

    // Update Y-Axis labels
    const maxEl = document.getElementById('plotterYMax');
    const midEl = document.getElementById('plotterYMid');
    const minEl = document.getElementById('plotterYMin');
    if (maxEl) maxEl.textContent = maxVal > 1000 ? (maxVal/1000).toFixed(1)+'k' : maxVal.toFixed(0);
    if (midEl) midEl.textContent = ((maxVal + minVal) / 2).toFixed(0);
    if (minEl) minEl.textContent = minVal < -1000 ? (minVal/1000).toFixed(1)+'k' : minVal.toFixed(0);

    // Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = (h / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero-line if spanned
    if (minVal < 0 && maxVal > 0) {
      const zeroY = h - ((0 - minVal) / (maxVal - minVal)) * h;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(w, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw lines
    const range = maxVal - minVal;
    this.channels.forEach(ch => {
      if (ch.data.length < 1) return;
      ctx.beginPath();
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const step = w / Math.max(1, this.maxPoints - 1);
      const startOffset = (this.maxPoints - ch.data.length) * step;

      ch.data.forEach((val, idx) => {
        const x = startOffset + idx * step;
        const norm = (val - minVal) / range;
        const y = Math.max(2, Math.min(h - 2, h - norm * h));
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }
};

// ── Side Panel Tabs ────────────────────────────────────────
document.querySelectorAll('.side-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.side-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tabName = tab.dataset.stab;
    const propsTab = document.getElementById('sideTabProps');
    const telemTab = document.getElementById('sideTabTelemetry');
    if (propsTab) propsTab.style.display = tabName === 'props' ? 'flex' : 'none';
    if (telemTab) telemTab.style.display = tabName === 'telemetry' ? 'flex' : 'none';
    if (tabName === 'telemetry') {
      setTimeout(() => SerialPlotter.handleResize(), 30);
    }
  });
});

// ── Console Serial Send ────────────────────────────────────
const consoleSendBtn = document.getElementById('consoleSend');
const consoleInputEl = document.getElementById('consoleInput');
if (consoleSendBtn && consoleInputEl) {
  const sendAction = () => {
    const val = consoleInputEl.value.trim();
    if (!val) return;
    clog('> ' + val, 'sys');
    SerialPlotter.pushData(val);
    consoleInputEl.value = '';
  };
  consoleSendBtn.addEventListener('click', sendAction);
  consoleInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendAction(); });
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('contextmenu', e => {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
});
applyTransform();
loadProject();
SerialPlotter.init();
MemoryMeter.update({}, PROJECT.controller || 'arduino_uno_r3');

if (window.xrayEngine) {
  window.xrayEngine.init(svg, document.getElementById('xrayBtn'));
  const xrayBtn = document.getElementById('xrayBtn');
  if (xrayBtn) {
    xrayBtn.addEventListener('click', () => window.xrayEngine.toggle());
  }
}

