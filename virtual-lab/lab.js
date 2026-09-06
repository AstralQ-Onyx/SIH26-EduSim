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

// Check if project exists in localStorage to get saved name/desc
try {
  const stored = localStorage.getItem('edusim_vlab_' + PROJECT.id);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.name) PROJECT.name = parsed.name;
    if (parsed.desc) PROJECT.desc = parsed.desc;
    if (parsed.controller) PROJECT.controller = parsed.controller;
    // URL takes precedence, otherwise use saved mode
    if (parsed.mode && !params.has('mode')) PROJECT.mode = parsed.mode;
    // If URL has no mode but localStorage does, still honor it
    if (parsed.mode && params.has('mode') && params.get('mode') === '2d' && parsed.mode === '3d') {
      PROJECT.mode = '3d'; // localStorage wins over default 2d fallback
    }
  }
} catch(e) {}

// Expose globally so lab3d.js can access it
window.LAB_PROJECT = PROJECT;
console.log('[Lab] mode:', PROJECT.mode, '| id:', PROJECT.id);

// ── Apply persisted theme style ───────────────────────────
if (localStorage.getItem('edusim_theme') === 'light') {
  document.body.classList.add('light-theme');
}
if (localStorage.getItem('edusim_theme_style') === 'multi-section') {
  document.documentElement.setAttribute('data-theme-style', 'multi-section');
}

const titleEl = document.getElementById('labProjectTitleText');
if (titleEl) titleEl.textContent = PROJECT.name;


document.getElementById('backBtn').addEventListener('click', () => {
  if (document.referrer && document.referrer !== location.href) {
    history.back();
  } else {
    location.href = '../platform/dashboard.html';
  }
});

// Manage Project Modal in Virtual Lab
const editLabTitleBtn       = document.getElementById('editLabTitleBtn');
const manageLabModal         = document.getElementById('manageLabModal');
const closeManageLabModal    = document.getElementById('closeManageLabModal');
const saveManageLabBtn       = document.getElementById('saveManageLabBtn');
const deleteLabFromEditorBtn = document.getElementById('deleteLabFromEditorBtn');

function openManageLabModal() {
  if (!manageLabModal) return;
  document.getElementById('manageLabNameInput').value = PROJECT.name;
  document.getElementById('manageLabDescInput').value = PROJECT.desc || '';
  manageLabModal.classList.add('active');
}

if (editLabTitleBtn) editLabTitleBtn.addEventListener('click', openManageLabModal);
if (closeManageLabModal) closeManageLabModal.addEventListener('click', () => manageLabModal.classList.remove('active'));
if (manageLabModal) {
  manageLabModal.addEventListener('click', e => { if (e.target === manageLabModal) manageLabModal.classList.remove('active'); });
}

if (saveManageLabBtn) {
  saveManageLabBtn.addEventListener('click', () => {
    const newName = document.getElementById('manageLabNameInput').value.trim() || 'Untitled Lab';
    const newDesc = document.getElementById('manageLabDescInput').value.trim();
    
    PROJECT.name = newName;
    PROJECT.desc = newDesc;

    if (titleEl) titleEl.textContent = PROJECT.name;
    document.title = `${PROJECT.name} — EduSim Virtual Lab`;

    saveProject();
    manageLabModal.classList.remove('active');
    if (window.clog) window.clog(`[Lab] Project renamed to "${PROJECT.name}" ✓`, 'ok');
  });
}

if (deleteLabFromEditorBtn) {
  deleteLabFromEditorBtn.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${PROJECT.name}"? This action cannot be undone.`)) return;
    localStorage.removeItem('edusim_vlab_' + PROJECT.id);
    location.href = '../platform/dashboard.html';
  });
}

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
let draggingWaypoint = null; // { wire, index }
let wireHandlesGroup = null;

let components    = [];     // { id, defId, x, y, props, element }
let wires         = [];     // { id, from:{compId,pinId}, to:{compId,pinId}, element }
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
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color, waypoints:w.waypoints?w.waypoints.map(p=>({...p})):[] })),
  };
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
}

function restoreState(data) {
  _suppressHistory = true;   // <<< stop child calls from polluting stacks
  document.getElementById('componentsLayer').innerHTML = '';
  document.getElementById('wiresLayer').innerHTML = '';
  wireHandlesGroup = null; // Reset since its DOM node was destroyed
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
  data.wires.forEach(w => {
    const nw = drawWire(w.from, w.to, w.color);
    if (w.waypoints) nw.waypoints = [...w.waypoints];
    updateWirePath(nw);
  });
  _suppressHistory = false;  // <<< re-enable
  populateDeviceSelect();
}

function undo() {
  if (!undoStack.length) return;
  const cur = {
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color, waypoints:w.waypoints?w.waypoints.map(p=>({...p})):[] })),
  };
  redoStack.push(JSON.stringify(cur));
  restoreState(JSON.parse(undoStack.pop()));
  clog('[Lab] Undo ↩', 'sys');
}

function redo() {
  if (!redoStack.length) return;
  const cur = {
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:{...w.from}, to:{...w.to}, color:w.color, waypoints:w.waypoints?w.waypoints.map(p=>({...p})):[] })),
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
  if (draggingWaypoint) {
    const pt = svgPoint(e.clientX, e.clientY);
    const { wire, index } = draggingWaypoint;
    let sx = snap(pt.x);
    let sy = snap(pt.y);

    // Magnetic axis-snap: lock to neighbor X/Y if within threshold
    const MAGNET = 15;
    const fc = components.find(c => c.id === wire.from.compId);
    const tc = components.find(c => c.id === wire.to.compId);
    const p1 = fc ? getRotatedPinCoords(fc, wire.from.pinId) : null;
    const p2 = tc ? getRotatedPinCoords(tc, wire.to.pinId) : null;

    // Collect all snap targets (other waypoints + endpoints)
    const targets = [];
    wire.waypoints.forEach((wp, i) => { if (i !== index) targets.push(wp); });
    if (p1) targets.push(p1);
    if (p2) targets.push(p2);

    for (const t of targets) {
      if (Math.abs(sx - t.x) < MAGNET) sx = t.x;
      if (Math.abs(sy - t.y) < MAGNET) sy = t.y;
    }

    wire.waypoints[index].x = sx;
    wire.waypoints[index].y = sy;
    updateWirePath(wire);
    if (wireHandlesGroup && wireHandlesGroup.children[index]) {
      wireHandlesGroup.children[index].setAttribute('cx', sx);
      wireHandlesGroup.children[index].setAttribute('cy', sy);
    }
  }
  if (wireMode && wireStart) {
    const pt = svgPoint(e.clientX, e.clientY);
    activeWire.setAttribute('x2', pt.x);
    activeWire.setAttribute('y2', pt.y);
  }
});
svg.addEventListener('mouseup',   e => { 
  isPanning = false; 
  svg.style.cursor = ''; 
  if (draggingWaypoint) draggingWaypoint = null;
});
svg.addEventListener('mouseleave',e => { isPanning = false; });

// ── Drop component from palette ───────────────────────────
const container = document.getElementById('canvasContainer');
container.addEventListener('dragover', e => e.preventDefault());
container.addEventListener('drop', e => {
  e.preventDefault();
  const defId = e.dataTransfer.getData('defId');
  if (!defId || !LAB_COMPONENTS[defId]) return;
  const pt = (PROJECT.mode === '3d' && window.get3DDropPoint) 
             ? window.get3DDropPoint(e.clientX, e.clientY) 
             : svgPoint(e.clientX, e.clientY);
  if (!pt) return;
  pushHistory();         // snapshot before adding
  addComponent(defId, snap(pt.x), snap(pt.y));
  // In 3D mode trigger explicit rebuild so the new mesh appears immediately
  if (PROJECT.mode === '3d' && typeof window.build3DScene === 'function') {
    clearTimeout(window._3dRebuildTimer);
    window._3dRebuildTimer = setTimeout(window.build3DScene, 50);
  }
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

  clog(`Added: ${def.label}`, 'sys');
  selectComponent(comp);
  return comp;
}
window.addComponent    = addComponent;
window.LAB_COMPONENTS  = LAB_COMPONENTS;
window.components      = components;
window.wires           = wires;
window.pushHistory     = pushHistory;
window.deleteSelected  = deleteSelected;
window.selectComponent = selectComponent;
window.clearSelection  = clearSelection;

// ── Props Panel Collapse Toggle ──────────────────────────
const propsPanel     = document.getElementById('propsPanel');
const togglePropsBtn = document.getElementById('togglePropsBtn');
if (togglePropsBtn) {
  togglePropsBtn.addEventListener('click', () => {
    const collapsed = propsPanel.classList.toggle('collapsed');
    togglePropsBtn.title = collapsed ? 'Show Properties Panel' : 'Hide Properties Panel';
  });
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

  const labelText = pin._customLabel || pin.label;
  pinTooltip.innerHTML = `<strong>${pin.id}</strong><br/>${labelText}`;
  pinTooltip.style.left = (e.clientX + 15) + 'px';
  pinTooltip.style.top = (e.clientY + 15) + 'px';
  pinTooltip.style.display = 'block';
}

function onPinOut() {
  pinTooltip.style.display = 'none';
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

// Rotation-aware pin coords
function getRotatedPinCoords(comp, pinId) {
  const pin = comp.def.pins.find(p => p.id === pinId);
  if (!pin) return { x: comp.x, y: comp.y };
  const cx = comp.def.w / 2;
  const cy = comp.def.h / 2;
  const rad = (comp.rotation || 0) * Math.PI / 180;
  const dx = pin.x - cx, dy = pin.y - cy;
  return {
    x: comp.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: comp.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function distToSegment(p, v, w) {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
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
  
  line.addEventListener('dblclick', e => {
    e.stopPropagation();
    pushHistory();
    if (!wire.waypoints) wire.waypoints = [];
    const pt = svgPoint(e.clientX, e.clientY);
    
    const fc = components.find(c => c.id === wire.from.compId);
    const tc = components.find(c => c.id === wire.to.compId);
    if (!fc || !tc) return;
    
    const p1 = getRotatedPinCoords(fc, wire.from.pinId);
    const p2 = getRotatedPinCoords(tc, wire.to.pinId);
    const pts = [p1, ...wire.waypoints, p2];
    
    let minDist = Infinity, insertIdx = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(pt, pts[i], pts[i+1]);
      if (d < minDist) { minDist = d; insertIdx = i; }
    }
    
    wire.waypoints.splice(insertIdx, 0, { x: snap(pt.x), y: snap(pt.y) });
    updateWirePath(wire);
    if (selectedWire === wire) renderWireHandles(wire);
  });

  wiresLayer.appendChild(line);
  updateWirePath(wire);
  clog(`Wire: ${from.compId}.${from.pinId} → ${to.compId}.${to.pinId}`, 'sys');
  return wire;
}

function updateWirePath(wire) {
  const fc = components.find(c => c.id === wire.from.compId);
  const tc = components.find(c => c.id === wire.to.compId);
  if (!fc || !tc) return;
  const p1 = getRotatedPinCoords(fc, wire.from.pinId);
  const p2 = getRotatedPinCoords(tc, wire.to.pinId);

  // Auto-generate ortho corner waypoints if none exist
  if (!wire.waypoints || wire.waypoints.length === 0) {
    const mx = snap((p1.x + p2.x) / 2);
    wire.waypoints = [
      { x: mx, y: snap(p1.y) },
      { x: mx, y: snap(p2.y) },
    ];
  }

  // Build path through all waypoints
  let d = `M${p1.x},${p1.y}`;
  wire.waypoints.forEach(wp => {
    d += ` L${wp.x},${wp.y}`;
  });
  d += ` L${p2.x},${p2.y}`;
  wire.element.setAttribute('d', d);
}

function updateWiresForComp(compId) {
  wires.filter(w => w.from.compId === compId || w.to.compId === compId)
       .forEach(updateWirePath);
}

// ── Selection ─────────────────────────────────────────────
function renderWireHandles(wire) {
  if (!wireHandlesGroup) {
    wireHandlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wireHandlesGroup.id = 'wireHandles';
    wiresLayer.appendChild(wireHandlesGroup);
  }
  wireHandlesGroup.innerHTML = '';
  
  if (!wire.waypoints) return;
  
  wire.waypoints.forEach((wp, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', wp.x);
    circle.setAttribute('cy', wp.y);
    circle.setAttribute('r', 5);
    circle.setAttribute('fill', '#00d4ff');
    circle.setAttribute('stroke', '#000');
    circle.setAttribute('stroke-width', 2);
    circle.style.cursor = 'grab';
    
    circle.addEventListener('mousedown', e => {
      e.stopPropagation();
      pushHistory();
      draggingWaypoint = { wire, index: i };
    });
    
    circle.addEventListener('dblclick', e => {
      e.stopPropagation();
      pushHistory();
      wire.waypoints.splice(i, 1);
      updateWirePath(wire);
      renderWireHandles(wire);
    });
    
    wireHandlesGroup.appendChild(circle);
  });
}

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
    renderWireHandles(selectedWire);
  }
}

function clearSelection() {
  if (selectedComp) { selectedComp.element.classList.remove('selected'); selectedComp = null; }
  if (selectedWire) { selectedWire.element.classList.remove('selected'); selectedWire = null; }
  if (wireHandlesGroup) { wireHandlesGroup.innerHTML = ''; }
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
    const affectedCompIds = [selectedWire.from.compId, selectedWire.to.compId];
    selectedWire.element.remove();
    wires = wires.filter(w => w !== selectedWire);
    window.wires = wires; // update global ref
    selectedWire = null;
    clearSelection(); // This clears the UI handles

    // Re-evaluate affected components after wire removal
    affectedCompIds.forEach(id => {
      const c = components.find(comp => comp.id === id);
      if (c && (c.defId.startsWith('led') || c.defId.startsWith('buzzer'))) {
        driveComponent(c, null, undefined);
      }
    });

  } else if (selectedComp) {
    // If a buzzing component is deleted, stop its oscillator
    if (activeOscillators[selectedComp.id]) {
      activeOscillators[selectedComp.id].stop();
      activeOscillators[selectedComp.id].disconnect();
      delete activeOscillators[selectedComp.id];
    }

    // Remove connected wires
    const affectedCompIds = [];
    wires = wires.filter(w => {
      if (w.from.compId === selectedComp.id || w.to.compId === selectedComp.id) {
        w.element.remove(); 
        const otherCompId = w.from.compId === selectedComp.id ? w.to.compId : w.from.compId;
        affectedCompIds.push(otherCompId);
        return false;
      }
      return true;
    });
    window.wires = wires; // update global ref
    selectedComp.element.remove();
    components = components.filter(c => c !== selectedComp);
    window.components = components; // update global ref
    selectedComp = null;
    clearSelection();
    populateDeviceSelect();

    // Re-evaluate other components that lost a connection
    setTimeout(() => {
      affectedCompIds.forEach(id => {
        const c = components.find(comp => comp.id === id);
        if (c && (c.defId.startsWith('led') || c.defId.startsWith('buzzer'))) {
          driveComponent(c, null, undefined);
        }
      });
    }, 0);
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

  // Pin table — with edit capability for controllers
  const tbl = document.createElement('div');
  tbl.innerHTML = `<span class="prop-label" style="margin-top:10px;display:block">Pins</span>`;

  const isController = ['esp32','arduino_uno','arduino_nano','arduino_mega','esp8266','rp2040'].includes(comp.defId);

  if (isController) {
    // Editable pin config for controllers
    const pinConfigSection = document.createElement('div');
    pinConfigSection.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span class="prop-label" style="margin:0">Pin Configuration</span>
        <button id="editPinsToggleBtn" class="lab-btn" style="font-size:10px;padding:2px 6px;">Edit Pins</button>
      </div>
      <div id="pinConfigTable" style="max-height:260px;overflow-y:auto;"></div>
    `;
    body.appendChild(pinConfigSection);

    // Store pin overrides in comp.props._pinOverrides
    if (!comp.props._pinOverrides) comp.props._pinOverrides = {};

    let editMode = false;
    const pinTable = pinConfigSection.querySelector('#pinConfigTable');
    const editBtn  = pinConfigSection.querySelector('#editPinsToggleBtn');

    function renderPinTable() {
      pinTable.innerHTML = '';

      if (editMode) {
        // Editable rows
        comp.def.pins.forEach(pin => {
          const override = comp.props._pinOverrides[pin.id] || {};
          const row = document.createElement('div');
          row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 60px;gap:4px;margin:3px 0;align-items:center;';
          row.innerHTML = `
            <div style="font-size:10px;color:var(--muted);font-family:var(--font-mono);padding:2px 4px;background:var(--surface2);border-radius:4px;" title="Pin ID">${pin.id}</div>
            <input class="pin-label-input prop-input" style="padding:2px 5px;font-size:10px;font-family:var(--font-mono)" placeholder="Label" value="${override.label || pin.label}" data-pin-id="${pin.id}" data-field="label"/>
            <span style="font-size:9px;color:var(--muted);text-align:center;padding:2px;">${pin.type}</span>
          `;
          pinTable.appendChild(row);

          row.querySelector('.pin-label-input').addEventListener('change', function() {
            if (!comp.props._pinOverrides[pin.id]) comp.props._pinOverrides[pin.id] = {};
            comp.props._pinOverrides[pin.id].label = this.value;
          });
        });

        // Save/Cancel buttons
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
        btnRow.innerHTML = `
          <button id="savePinConfig" class="prop-input" style="background:var(--accent);color:#000;border:none;cursor:pointer;flex:1;padding:5px;border-radius:5px;font-weight:600;">Save</button>
          <button id="cancelPinConfig" class="prop-input" style="cursor:pointer;flex:1;padding:5px;border-radius:5px;">Cancel</button>
        `;
        pinTable.appendChild(btnRow);

        btnRow.querySelector('#savePinConfig').onclick = () => {
          pushHistory();
          editMode = false;
          editBtn.textContent = 'Edit Pins';
          // Apply overrides to the component's live def pins (visual labels on canvas)
          comp.def.pins.forEach(pin => {
            const ov = comp.props._pinOverrides[pin.id];
            if (ov && ov.label) {
              pin._customLabel = ov.label;
              // Update tooltip data on SVG pin circles
              const circle = comp.element.querySelector(`.pin-circle[data-pin-id="${pin.id}"]`);
              if (circle) circle.dataset.pinLabel = ov.label;
            }
          });
          renderPinTable();
        };
        btnRow.querySelector('#cancelPinConfig').onclick = () => {
          editMode = false;
          editBtn.textContent = 'Edit Pins';
          renderPinTable();
        };

      } else {
        // Read-only rows with type color dots
        comp.def.pins.forEach(pin => {
          const override = comp.props._pinOverrides[pin.id] || {};
          const label = override.label || pin._customLabel || pin.label;
          pinTable.innerHTML += `
            <div style="display:flex;align-items:center;gap:8px;margin:3px 0;padding:3px 4px;border-radius:5px;transition:background .12s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
              <div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${
                pin.type==='power'?'#ff4466':pin.type==='gnd'?'#888':pin.type==='analog'?'#aa66ff':'#00d4ff'}"></div>
              <span style="font-size:11px;font-family:var(--font-mono);font-weight:600;color:var(--accent);min-width:38px">${pin.id}</span>
              <span style="font-size:10px;color:var(--text)">${label}</span>
              <span style="font-size:9px;color:var(--muted);margin-left:auto">${pin.type}</span>
            </div>`;
        });

        // Info note if any overrides exist
        const hasOverrides = Object.keys(comp.props._pinOverrides).length > 0;
        if (hasOverrides) {
          pinTable.innerHTML += `<div style="font-size:9px;color:var(--accent);margin-top:6px;">&#x2713; Custom pin labels applied</div>`;
        }
      }
    }

    editBtn.addEventListener('click', () => {
      editMode = !editMode;
      editBtn.textContent = editMode ? 'Cancel' : 'Edit Pins';
      renderPinTable();
    });

    renderPinTable();

  } else {
    // Non-controller: simple read-only pin list
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

// Map LED defId → glow color
const LED_GLOW_COLOR = {
  ledBlue:   '#33aaff',
  ledRed:    '#ff3020',
  ledGreen:  '#44ff22',
  ledYellow: '#ffee00',
  ledWhite:  '#ffffff',
};

function getPinLogicLevel(comp, pinId) {
  // 1. Check if it's actively driven by the controller
  if (comp.pinStates && comp.pinStates[pinId] !== undefined) {
    return comp.pinStates[pinId];
  }

  // 2. Check if it's hardwired to a constant power/gnd pin
  const connectedWires = wires.filter(w => 
    (w.from.compId === comp.id && w.from.pinId === pinId) ||
    (w.to.compId === comp.id && w.to.pinId === pinId)
  );

  for (const w of connectedWires) {
    const otherSide = w.from.compId === comp.id ? w.to : w.from;
    const otherComp = components.find(c => c.id === otherSide.compId);
    if (otherComp && otherComp.def && otherComp.def.pins) {
      const otherPinDef = otherComp.def.pins.find(p => p.id === otherSide.pinId);
      if (otherPinDef) {
        if (otherPinDef.type === 'gnd') return false; // Hard LOW
        if (otherPinDef.type === 'power') return true; // Hard HIGH
      }
    }
  }

  return undefined; // Floating / not connected
}

function driveComponent(comp, pinId, isHigh) {
  if (!comp.pinStates) comp.pinStates = {};
  if (pinId !== null) comp.pinStates[pinId] = isHigh;

  if (comp.defId.startsWith('led')) {
    const isAnodeHigh = getPinLogicLevel(comp, 'ANODE');
    const isCathodeHigh = getPinLogicLevel(comp, 'CATHODE');
    
    // LED glows only if ANODE is HIGH and CATHODE is LOW (GND)
    const shouldGlow = (isAnodeHigh === true) && (isCathodeHigh === false);

    if (window.update3DComponentState) window.update3DComponentState(comp.id, shouldGlow);

    const body = comp.element.querySelector('.comp-body');
    if (body) {
      const glowColor = LED_GLOW_COLOR[comp.defId] || '#ffffff';
      body.style.filter = shouldGlow
        ? `brightness(2.2) drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 4px ${glowColor})`
        : 'brightness(0.38) saturate(0.4)';
    }
  } else if (comp.defId.startsWith('buzzer')) {
    const isPosHigh = getPinLogicLevel(comp, 'POS');
    const isNegHigh = getPinLogicLevel(comp, 'NEG');
    
    // Buzzer buzzes if POS is HIGH and NEG is LOW (GND)
    const shouldBuzz = (isPosHigh === true) && (isNegHigh === false);

    if (window.update3DComponentState) window.update3DComponentState(comp.id, shouldBuzz);

    if (shouldBuzz) {
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
        const body = comp.element.querySelector('.comp-body');
        if (body) body.style.filter = 'drop-shadow(0 0 8px #ffd54a)';
      }
    } else {
      if (activeOscillators[comp.id]) {
        activeOscillators[comp.id].stop();
        activeOscillators[comp.id].disconnect();
        delete activeOscillators[comp.id];
        const body = comp.element.querySelector('.comp-body');
        if (body) body.style.filter = '';
      }
    }
  }
}

function resetVisuals() {
  components.forEach(comp => {
    comp.pinStates = {}; // Clear active pin states on reset
    if (window.update3DComponentState) window.update3DComponentState(comp.id, false);
    if (comp.defId.startsWith('led')) {
      const body = comp.element.querySelector('.comp-body');
      if (body) body.style.filter = '';
    } else if (comp.defId.startsWith('buzzer')) {
      if (activeOscillators[comp.id]) {
        activeOscillators[comp.id].stop();
        delete activeOscillators[comp.id];
      }
      const body = comp.element.querySelector('.comp-body');
      if (body) body.style.filter = '';
    }
  });
}

function setSimUI(running) {
  document.getElementById('simDot').classList.toggle('running', running);
  document.getElementById('simStatusText').textContent = running ? 'Running' : 'Ready';
  document.getElementById('runBtn').disabled  = running;
  document.getElementById('stopBtn').disabled = !running;
}

function startSim() {
  if (EduSimulator.isRunning()) return;
  clog('[Simulator] No code uploaded — use the Code panel to compile & run.', 'warn');
}

function stopSim() {
  EduSimulator.stopSimulation();
  setSimUI(false);
  resetVisuals();
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

  const ok = await EduSimulator.compileAndSimulate(code, defId, {
    onLog:  (msg, type) => clog(msg, type),
    onError:(msg)       => clog(msg, 'err'),
    onReady: () => {
      setSimUI(true);
      // Perform an initial static pass to light up anything hardwired to 5V/GND
      components.forEach(c => {
        if (c.defId.startsWith('led') || c.defId.startsWith('buzzer')) {
          driveComponent(c, null, undefined);
        }
      });
    },
    onSerial: (text)    => slog(text),
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
          // Pseudo-sim passes raw pin numbers (e.g. bit=2 for GPIO2 / D2)
          // Match against all pin naming conventions used in the registry:
          //   ESP32  → GPIO2, GPIO13, etc.
          //   Arduino → D2, D13, etc.
          //   Raw num → "2", "13", etc.
          if (
            cPinId === `GPIO${bit}` ||
            cPinId === `D${bit}`    ||
            cPinId === bit.toString() ||
            cPinId === `A${bit}`
          ) {
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

  if (!ok) setSimUI(false);
}

// ── Save ──────────────────────────────────────────────────
document.getElementById('saveLabBtn').addEventListener('click', saveProject);
function saveProject() {
  const data = {
    id: PROJECT.id,
    name: PROJECT.name,
    desc: PROJECT.desc || '',
    controller: PROJECT.controller,
    mode: PROJECT.mode,
    code: labEditor ? labEditor.getValue() : '',
    components: components.map(c => ({ id:c.id, defId:c.defId, x:c.x, y:c.y, rotation:c.rotation||0, props:{...c.props} })),
    wires: wires.map(w => ({ id:w.id, from:w.from, to:w.to, color:w.color, waypoints:w.waypoints?w.waypoints.map(p=>({...p})):[] })),
  };
  localStorage.setItem('edusim_vlab_' + PROJECT.id, JSON.stringify(data));
  clog('[Lab] Project saved to local storage ✓', 'ok');
}

// ── Report Modal ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const reportModal = document.getElementById('reportModal');
  if (!reportModal) return;

  document.getElementById('reportLabBtn').addEventListener('click', () => {
    document.getElementById('reportProjectName').value = PROJECT.name || 'EduSim Project';
    
    const userInfoInput = document.getElementById('reportUserInfo');
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      userInfoInput.value = user.displayName || user.email || '';
    } else {
      userInfoInput.value = '';
    }

    const compList = components.map(c => c.props.label || c.def.label || c.def.name).filter(Boolean);
    document.getElementById('reportComponents').textContent = compList.join(', ') || 'No components used';

    document.getElementById('reportCode').textContent = labEditor ? labEditor.getValue() : 'No code uploaded.';

    const svgNode = document.getElementById('labSvg').cloneNode(true);
    svgNode.style.width = '100%';
    svgNode.style.height = '100%';
    svgNode.style.background = 'transparent';
    
    // Strip zoom/pan transforms so it renders cleanly in the PDF
    const cLayer = svgNode.querySelector('#componentsLayer');
    const wLayer = svgNode.querySelector('#wiresLayer');
    if (cLayer) cLayer.removeAttribute('transform');
    if (wLayer) wLayer.removeAttribute('transform');
    
    // Compute proper bounding box, falling back to 80px if w/h not defined
    let vbW = 800, vbH = 400;
    let vbx = 0, vby = 0;
    if (components.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      components.forEach(c => {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x + (c.def.w || 80));
        maxY = Math.max(maxY, c.y + (c.def.h || 80));
      });
      const pad = 60;
      minX -= pad; minY -= pad; maxX += pad; maxY += pad;
      vbW = maxX - minX;
      vbH = maxY - minY;
      vbx = minX;
      vby = minY;
      svgNode.setAttribute('viewBox', `${minX} ${minY} ${vbW} ${vbH}`);
    }

    const cs = getComputedStyle(document.documentElement);
    const varMap = {
      '--accent':   cs.getPropertyValue('--accent').trim()  || '#00d4ff',
      '--accent2':  cs.getPropertyValue('--accent2').trim() || '#7c3aed',
      '--bg':       cs.getPropertyValue('--bg').trim()      || '#0d1117',
      '--surface':  cs.getPropertyValue('--surface').trim() || '#161b22',
      '--surface2': cs.getPropertyValue('--surface2').trim()|| '#1c2128',
      '--text':     cs.getPropertyValue('--text').trim()    || '#e6edf3',
      '--muted':    cs.getPropertyValue('--muted').trim()   || '#8b949e',
      '--border':   cs.getPropertyValue('--border').trim()  || '#30363d',
      '--border-h': cs.getPropertyValue('--border-h').trim()|| '#444c56',
      '--success':  cs.getPropertyValue('--success').trim() || '#3fb950',
      '--error':    cs.getPropertyValue('--error').trim()   || '#ff4466',
    };

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(vbx));
    bgRect.setAttribute('y', String(vby));
    bgRect.setAttribute('width', String(vbW));
    bgRect.setAttribute('height', String(vbH));
    bgRect.setAttribute('fill', varMap['--bg']);
    svgNode.insertBefore(bgRect, svgNode.firstChild);
    
    let svgStr = new XMLSerializer().serializeToString(svgNode);
    svgStr = svgStr.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]+)?\s*\)/g, (_, varName) => varMap[varName] || '#888888');
    
    const container = document.getElementById('reportImageContainer');
    container.innerHTML = '<div style="color:var(--text-dim);font-style:italic">Rendering circuit...</div>';
    reportModal.style.display = 'flex';

    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = Math.round(1200 * (vbH / vbW));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      
      const outImg = document.createElement('img');
      outImg.src = canvas.toDataURL('image/png');
      outImg.style.width = '100%';
      outImg.style.maxHeight = '100%';
      outImg.style.objectFit = 'contain';
      outImg.style.borderRadius = '4px';
      
      container.innerHTML = '';
      container.appendChild(outImg);
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      container.innerHTML = '';
      container.appendChild(svgNode); // fallback
    };
    img.src = svgUrl;
  });

  // Close handlers
  const _closeReport = () => { reportModal.style.display = 'none'; };
  document.getElementById('closeReportBtn').addEventListener('click', _closeReport);
  document.getElementById('closeReportFooterBtn').addEventListener('click', _closeReport);
  reportModal.addEventListener('click', e => { if (e.target === reportModal) _closeReport(); });

  // Print / Save PDF
  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });



  document.getElementById('reportAiToggle').addEventListener('change', async (e) => {
    const descEl = document.getElementById('reportDescription');
    const generatingText = document.getElementById('aiGeneratingText');
    
    if (e.target.checked) {
      descEl.disabled = true;
      generatingText.style.display = 'inline';
      
      try {
        const compList = components.map(c => c.props.label || c.def.label || c.def.name).join(', ');
        const codeStr = labEditor ? labEditor.getValue() : '';
        
        const prompt = `Write a short, professional description (2-3 sentences max) for an electronics project. Components used: ${compList}. Code snippet: ${codeStr.substring(0, 400)}. Focus on what the circuit likely does. No conversational filler, just the description.`;

        const aiUrl = (typeof ENV !== 'undefined' && ENV.BACKEND_URL) 
          ? `${ENV.BACKEND_URL}/api/ai/generate` 
          : 'http://localhost:3000/api/ai/generate';

        const res = await fetch(aiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });
        
        if (!res.ok) throw new Error('AI API failed');
        const data = await res.json();
        descEl.value = data.message.content.trim();
      } catch (err) {
        console.error('AI error:', err);
        descEl.value = 'Failed to generate description. Please ensure the backend is running.';
        e.target.checked = false;
      } finally {
        descEl.disabled = false;
        generatingText.style.display = 'none';
      }
    }
  });
});

// ── Load ──────────────────────────────────────────────────
function loadProject() {
  const raw = localStorage.getItem('edusim_vlab_' + PROJECT.id);
  if (!raw) {
    // Auto-add the selected controller to canvas
    if (PROJECT.controller !== 'none' && LAB_COMPONENTS[PROJECT.controller]) {
      addComponent(PROJECT.controller, 150, 100);
    }
    populateDeviceSelect();
    window.dispatchEvent(new Event('edusim-project-loaded')); // boot 3D if mode=3d
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
    
    // Apply any pin overrides
    if (comp.props._pinOverrides) {
      comp.def.pins.forEach(pin => {
        const ov = comp.props._pinOverrides[pin.id];
        if (ov && ov.label) {
          pin._customLabel = ov.label;
          const circle = comp.element.querySelector(`.pin-circle[data-pin-id="${pin.id}"]`);
          if (circle) circle.dataset.pinLabel = ov.label;
        }
      });
    }

    comp.element.setAttribute('transform',
      `translate(${comp.x},${comp.y}) rotate(${comp.rotation} ${comp.def.w/2} ${comp.def.h/2})`);
  });

  data.wires.forEach(w => {
    const nw = drawWire(w.from, w.to, w.color);
    if (w.waypoints) nw.waypoints = [...w.waypoints];
    updateWirePath(nw);
  });

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
  window.dispatchEvent(new Event('edusim-project-loaded'));
}

// ── Console helpers ───────────────────────────────────────
function clog(msg, type='') {
  const el = document.createElement('div');
  el.className = 'clog ' + type;
  el.textContent = msg;
  document.getElementById('consoleBody').appendChild(el);
  document.getElementById('consoleBody').scrollTop = 9999;
}

let serialBuffer = '';
function slog(text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\n') {
      const el = document.createElement('div');
      el.className = 'clog';
      el.textContent = serialBuffer || ' ';
      const sb = document.getElementById('serialBody');
      sb.appendChild(el);
      sb.scrollTop = 9999;
      serialBuffer = '';
    } else {
      if (char !== '\r') serialBuffer += char;
    }
  }
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
  localStorage.setItem('edusim_theme', isLight ? 'light' : 'dark');
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

// ── Init ──────────────────────────────────────────────────
document.addEventListener('contextmenu', e => {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
});
setTimeout(() => {
  applyTransform();
  loadProject();
  // Directly boot the 3D engine if available (lab3d.js defines window.boot3DLab)
  // This is more reliable than the custom event approach
  if (typeof window.boot3DLab === 'function') {
    window.boot3DLab();
  }
}, 0);

