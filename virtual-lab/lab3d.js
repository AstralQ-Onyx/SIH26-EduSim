/* ═══════════════════════════════════════════════════════════
   EduSim — 3D Virtual Lab Engine  (lab3d.js)
   Auto-activates when URL contains  ?mode=3d
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── Read URL Mode ─────────────────────────────────────────
const _urlParams = new URLSearchParams(window.location.search);
const _urlMode   = _urlParams.get('mode');   // may be null if not in URL
const _projId    = _urlParams.get('id');

// Check localStorage for the project's saved mode — reliable even if URL is wrong
let _savedMode = null;
if (_projId) {
  try {
    const _raw = localStorage.getItem('edusim_vlab_' + _projId);
    if (_raw) _savedMode = (JSON.parse(_raw)).mode || null;
  } catch(e) {}
}

// IS_3D: check all 3 sources — URL param, localStorage, window.LAB_PROJECT (set by lab.js)
const IS_3D = (_urlMode === '3d')
           || (_savedMode === '3d')
           || (window.LAB_PROJECT && window.LAB_PROJECT.mode === '3d');

console.log('[lab3d] urlMode:', _urlMode, '| savedMode:', _savedMode, '| IS_3D:', IS_3D);


// ── Globals ───────────────────────────────────────────────
let scene, camera, renderer, controls, transformControl;
let sceneObjects   = [];
let componentMeshes = {};   // comp.id → THREE.Object3D for simulation updates
let gltfLoader     = null;

// Map component defIds to GLB file paths under assets/models/
const MODEL_PATHS = {
  'uno':          '../assets/models/arduino_uno.glb',
  'nano':         '../assets/models/arduino_nano.glb',
  'esp32':        '../assets/models/esp32.glb',
  'buzzer':       '../assets/models/buzzerPassive.glb',
  'buzzerPassive':'../assets/models/buzzerPassive.glb',
  'ledRed5mm':    '../assets/models/ledRed5mm.glb',
  'ledWhite5mm':  '../assets/models/ledRed5mm.glb',
  'ledBlue5mm':   '../assets/models/ledRed5mm.glb',
  'ledGreen5mm':  '../assets/models/ledRed5mm.glb',
  'ledRgb5mm':    '../assets/models/ledRed5mm.glb',
};
// LEDs keep procedural materials so emissive glow works at runtime.

// ── Boot ──────────────────────────────────────────────────
// Single boot function — called via self-timer, direct call, or event listener
var _3dBooted = false;
function _do3DBoot() {
  if (_3dBooted) return;          // prevent double-init
  if (!IS_3D) return;             // 2D mode — do nothing
  _3dBooted = true;

  console.log('[lab3d] _do3DBoot() activated');

  const labSvg      = document.getElementById('labSvg');
  const canvas3dDiv = document.getElementById('canvas3d');

  if (!labSvg || !canvas3dDiv) {
    console.error('[lab3d] DOM elements missing — retrying in 200ms');
    _3dBooted = false;
    setTimeout(_do3DBoot, 200);
    return;
  }

  // ── Switch canvas ─────────────────────────────────────────
  labSvg.style.display      = 'none';
  canvas3dDiv.style.display = 'block';
  console.log('[lab3d] Canvas switched to 3D');

  const badge = document.getElementById('labModeBadge');
  if (badge) badge.style.display = 'inline-block';
  ['wireBtn', 'fitBtn', 'zoomInBtn', 'zoomOutBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = true; el.style.opacity = '0.35'; }
  });

  // ── Initialize Three.js ───────────────────────────────────
  requestAnimationFrame(() => {
    init3DScene(canvas3dDiv);
    build3DScene();

    // Drop support on canvas3d wrapper
    canvas3dDiv.addEventListener('dragover', e => e.preventDefault());
    canvas3dDiv.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      const defId = e.dataTransfer.getData('defId');
      if (!defId || !window.LAB_COMPONENTS || !window.LAB_COMPONENTS[defId]) return;
      const pt = window.get3DDropPoint ? window.get3DDropPoint(e.clientX, e.clientY) : null;
      if (!pt) return;
      if (typeof window.pushHistory  === 'function') window.pushHistory();
      if (typeof window.addComponent === 'function') window.addComponent(defId, Math.round(pt.x / 10) * 10, Math.round(pt.y / 10) * 10);
      clearTimeout(window._3dRebuildTimer);
      window._3dRebuildTimer = setTimeout(build3DScene, 50);
    });

    // Raycaster for palette drag-drop position
    const _rBoot = new THREE.Raycaster();
    const _mBoot = new THREE.Vector2();
    window.get3DDropPoint = function(clientX, clientY) {
      if (!scene || !camera) return null;
      const rect = canvas3dDiv.getBoundingClientRect();
      _mBoot.x = ((clientX - rect.left) / rect.width)  *  2 - 1;
      _mBoot.y = ((clientY - rect.top)  / rect.height) * -2 + 1;
      _rBoot.setFromCamera(_mBoot, camera);
      const fp = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const tg = new THREE.Vector3();
      return _rBoot.ray.intersectPlane(fp, tg) ? { x: tg.x, y: -tg.z } : null;
    };

    const _origPush = window.pushHistory;
    window.pushHistory = function(...args) {
      if (typeof _origPush === 'function') _origPush(...args);
      clearTimeout(window._3dRebuildTimer);
      window._3dRebuildTimer = setTimeout(build3DScene, 80);
    };
  });
}


// Expose globally (for lab.js direct call)
window.boot3DLab = _do3DBoot;

// ── Self-boot: fires 100ms after page loads ─────────────────
// loadProject() uses setTimeout(0) in lab.js → it runs first.
// Our 100ms timer ensures components[] is populated before build3DScene().
if (IS_3D) {
  console.log('[lab3d] Self-boot armed for 3D mode');
  setTimeout(_do3DBoot, 100);
}

// Backup: custom event from lab.js
window.addEventListener('edusim-project-loaded', _do3DBoot);



// ── Scene Initialisation ─────────────────────────────────
function init3DScene(container) {
  const W = container.clientWidth  || window.innerWidth  - 300;
  const H = container.clientHeight || window.innerHeight - 56;

  // Scene
  scene = new THREE.Scene();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  scene.background = new THREE.Color(isLight ? '#f0f2f5' : '#0d1117');
  scene.fog = new THREE.FogExp2(isLight ? 0xf0f2f5 : 0x0d1117, 0.0008);

  // Camera
  camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 8000);
  camera.position.set(0, 400, 600);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Orbit Controls — LOCKED by default to middle-mouse only (like Blender)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.06;
  controls.minDistance      = 80;
  controls.maxDistance      = 3000;
  controls.maxPolarAngle    = Math.PI / 2.05;
  // Disable left/right mouse rotation/pan by default; middle-mouse orbits freely
  controls.mouseButtons = {
    LEFT:   null,              // Left mouse: reserved for selection
    MIDDLE: THREE.MOUSE.ROTATE, // Middle mouse: orbit/rotate view
    RIGHT:  THREE.MOUSE.PAN,    // Right mouse: pan
  };
  controls.touches = {
    ONE: null,                // One finger: reserved
    TWO: THREE.TOUCH.DOLLY_PAN // Two fingers: zoom + pan
  };

  // Transform Controls (Blender-like gizmo)
  if (window.THREE && window.THREE.TransformControls) {
    transformControl = new THREE.TransformControls(camera, renderer.domElement);
    
    // Live-sync position/rotation every frame while dragging
    transformControl.addEventListener('objectChange', () => {
      const obj = transformControl.object;
      if (!obj || !obj.userData || !obj.userData.isComp) return;
      const comp = window.components && window.components.find(c => c.id === obj.userData.compId);
      if (!comp) return;
      // Sync 3D position → 2D lab coords
      comp.x = Math.round(obj.position.x / 10) * 10;
      comp.y = Math.round(-obj.position.z / 10) * 10;
      // Sync Y-axis rotation → comp.rotation (degrees)
      const euler = new THREE.Euler().setFromQuaternion(obj.quaternion, 'YXZ');
      comp.rotation = (Math.round(-(euler.y * 180 / Math.PI)) % 360 + 360) % 360;
      // Save full 3D transform (rotation/scale) to props so it persists freely
      if (!comp.props) comp.props = {};
      comp.props._transform3d = {
        qx: obj.quaternion.x, qy: obj.quaternion.y, qz: obj.quaternion.z, qw: obj.quaternion.w,
        sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z
      };
    });
    
    // When drag ends: save history but DO NOT rebuild the scene (already live)
    transformControl.addEventListener('dragging-changed', event => {
      controls.enabled = !event.value;
      if (!event.value && transformControl.object) {
        // Drag ended — save history only. No rebuild needed as object is already in place.
        if (window.pushHistory) {
          // Temporarily detach to prevent circular rebuild
          const saved = transformControl.object;
          transformControl.detach();
          window._skipRebuild = true;
          window.pushHistory();
          window._skipRebuild = false;
          // Re-attach to the fresh mesh after rebuild
          const compId = saved.userData && saved.userData.compId;
          if (compId) {
            setTimeout(() => {
              const freshMesh = componentMeshes[compId];
              if (freshMesh && transformControl) transformControl.attach(freshMesh);
            }, 120);
          }
        }
      }
    });
    scene.add(transformControl);
  }

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, isLight ? 0.7 : 0.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, isLight ? 0.8 : 1.0);
  keyLight.position.set(300, 600, 400);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near   = 10;
  keyLight.shadow.camera.far    = 2000;
  keyLight.shadow.camera.left   = -600;
  keyLight.shadow.camera.right  =  600;
  keyLight.shadow.camera.top    =  600;
  keyLight.shadow.camera.bottom = -600;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3);
  fillLight.position.set(-300, 200, -200);
  scene.add(fillLight);

  // Environment map (simple gradient hemisphere)
  const hemi = new THREE.HemisphereLight(
    isLight ? 0xddeeff : 0x1a2a4a,  // sky
    isLight ? 0xc8c8c8 : 0x050a0f,  // ground
    0.8
  );
  scene.add(hemi);

  // Basic environment for metal reflections (fixes "no texture / black model" issue)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

  // Grid / Floor
  const gridHelper = new THREE.GridHelper(3000, 60,
    isLight ? 0xbbbbbb : 0x2a2a3a,
    isLight ? 0xdddddd : 0x1a1a2a
  );
  gridHelper.position.y = -2;
  scene.add(gridHelper);

  // Resize handler
  window.addEventListener('resize', () => {
    const nW = container.clientWidth;
    const nH = container.clientHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  });

  // GLTF Loader
  if (window.THREE && window.THREE.GLTFLoader) {
    gltfLoader = new THREE.GLTFLoader();
  }

  // Animation loop
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

// ── Build Scene from 2D State ─────────────────────────────
// Exposed on window so lab.js drop handler can trigger it directly
window.build3DScene = build3DScene;

function build3DScene() {
  if (window._skipRebuild) return; // Don't rebuild while TransformControl drag is saving
  if (typeof transformControl !== 'undefined' && transformControl) transformControl.detach(); // prevent orphaned attachments
  
  // Clear any previous objects
  sceneObjects.forEach(obj => scene.remove(obj));
  sceneObjects     = [];
  componentMeshes  = {};

  if (!window.components || window.components.length === 0) {
    console.info('[lab3d] No components to render — empty circuit.');
    return;
  }

  let minX =  Infinity, maxX = -Infinity;
  let minY =  Infinity, maxY = -Infinity;

  window.components.forEach(comp => {
    minX = Math.min(minX, comp.x); maxX = Math.max(maxX, comp.x);
    minY = Math.min(minY, comp.y); maxY = Math.max(maxY, comp.y);

    const cx   = comp.x + (comp.def.w / 2);
    const cz   = -(comp.y + (comp.def.h / 2));
    const rotY = -(comp.rotation || 0) * (Math.PI / 180);

    // Fallback procedural mesh builder
    const buildFallback = () => {
      let mesh;

      if (comp.def.category === 'Controllers') {
        const geo = new THREE.BoxGeometry(comp.def.w, 12, comp.def.h);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x1a4a3a, roughness: 0.7, metalness: 0.3
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, 6, cz);

        // Pin row dots
        comp.def.pins.forEach(pin => {
          const pinGeo = new THREE.CylinderGeometry(2, 2, 6, 8);
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, metalness: 0.9, roughness: 0.2 });
          const pinMesh = new THREE.Mesh(pinGeo, pinMat);
          const [px, pz] = rotatePin(pin.x - comp.def.w/2, pin.y - comp.def.h/2, comp.rotation || 0);
          pinMesh.position.set(px, 9, -pz);
          mesh.add(pinMesh);
        });

      } else if (comp.defId && (comp.defId.startsWith('led_') || comp.defId.toLowerCase().startsWith('led'))) {
        const colorHex = parseInt((comp.props?.color || '#ff0044').replace('#', ''), 16);
        const geo = new THREE.CapsuleGeometry(7, 10, 6, 12);
        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          metalness: 0.0
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, 12, cz);
        // LED leads
        const leadGeo = new THREE.CylinderGeometry(0.8, 0.8, 14, 6);
        const leadMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 });
        [-3, 3].forEach(offset => {
          const lead = new THREE.Mesh(leadGeo, leadMat);
          lead.position.set(offset, -12, 0);
          mesh.add(lead);
        });
        componentMeshes[comp.id] = mesh;

      } else if (comp.defId === 'buzzer') {
        const geo = new THREE.CylinderGeometry(comp.def.w / 2.5, comp.def.w / 2.5, 14, 24);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, 7, cz);
        componentMeshes[comp.id] = mesh;

      } else if (comp.defId === 'resistor') {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(4, 4, comp.def.w * 0.7, 12),
          new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.5 })
        );
        body.rotation.z = Math.PI / 2;
        body.position.set(cx, 5, cz);
        mesh = new THREE.Group();
        mesh.add(body);

      } else {
        const geo = new THREE.BoxGeometry(comp.def.w || 30, 14, comp.def.h || 30);
        const mat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, 7, cz);
      }

      if (mesh.castShadow !== undefined) {
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
      } else {
        mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      }
      // Apply 3D free transform if available (overrides basic Y rot)
      if (comp.props && comp.props._transform3d) {
        const t3 = comp.props._transform3d;
        mesh.quaternion.set(t3.qx, t3.qy, t3.qz, t3.qw);
        mesh.scale.set(t3.sx, t3.sy, t3.sz);
      } else {
        mesh.rotation.y = rotY;
      }

      mesh.userData = { isComp: true, compId: comp.id };
      scene.add(mesh);
      sceneObjects.push(mesh);
      componentMeshes[comp.id] = mesh;
    };

    // Try GLB first
    const modelPath = MODEL_PATHS[comp.defId];
    if (modelPath && gltfLoader) {
      gltfLoader.load(modelPath, gltf => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const sx = size.x || 1;
        const sz = size.z || 1;
        const scale = Math.min(comp.def.w / sx, comp.def.h / sz) * 0.9;
        
        // Center the model geometry inside a wrapper group
        const wrapper = new THREE.Group();
        model.position.set(-center.x, -center.y, -center.z);
        wrapper.add(model);
        
        wrapper.scale.setScalar(scale);
        wrapper.position.set(cx, (size.y * scale) / 2, cz);
        
        // Apply 3D free transform if available
        if (comp.props && comp.props._transform3d) {
          const t3 = comp.props._transform3d;
          wrapper.quaternion.set(t3.qx, t3.qy, t3.qz, t3.qw);
          wrapper.scale.set(t3.sx, t3.sy, t3.sz);
        } else {
          wrapper.rotation.y = rotY;
        }
        
        wrapper.traverse(child => {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        
        wrapper.userData = { isComp: true, compId: comp.id };
        scene.add(wrapper);
        sceneObjects.push(wrapper);
        componentMeshes[comp.id] = wrapper;
      }, undefined, () => {
        console.warn(`[lab3d] GLB not found for "${comp.defId}" — using fallback.`);
        buildFallback();
      });
    } else {
      buildFallback();
    }
  });

  // Create hitboxes for pins so they can be clicked to route wires in 3D
  window.components.forEach(comp => {
    if (!comp.def.pins) return;
    comp.def.pins.forEach(pin => {
      const p3d = pinTo3D(comp, pin);
      const hitGeo = new THREE.SphereGeometry(4, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(p3d);
      hitMesh.userData = { isPin: true, compId: comp.id, pinId: pin.id };
      scene.add(hitMesh);
      sceneObjects.push(hitMesh);
    });
  });

  // Build wires as smooth tubes
  const _wires = window.wires || [];
  _wires.forEach(wire => {
    const fc = window.components.find(c => c.id === wire.from.compId);
    const tc = window.components.find(c => c.id === wire.to.compId);
    if (!fc || !tc) return;

    const fp = fc.def.pins.find(p => p.id === wire.from.pinId);
    const tp = tc.def.pins.find(p => p.id === wire.to.pinId);
    if (!fp || !tp) return;

    const p1 = pinTo3D(fc, fp);
    const p2 = pinTo3D(tc, tp);

    const dist = p1.distanceTo(p2);
    const mid  = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      p1.y + dist * 0.25,
      (p1.z + p2.z) / 2
    );

    const curve   = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, 1.8, 8, false);
    const colorHex = parseInt((wire.color || '#35d0ba').replace('#', ''), 16);
    const tubeMat  = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.5,
      metalness: 0.1
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.castShadow = true;
    // Tag wire so raycaster can identify and select it
    tube.userData = { isWire: true, wireId: wire.id };
    scene.add(tube);
    sceneObjects.push(tube);
  });

  // Set camera only on FIRST build to avoid view snapping every rebuild
  if (minX !== Infinity && !window._3dCameraSet) {
    window._3dCameraSet = true;
    const cx = (minX + maxX) / 2;
    const cz = -((minY + maxY) / 2);
    controls.target.set(cx, 0, cz);
    camera.position.set(cx, 350, cz + 500);
  }
  controls.update();
}

// ── Helpers ───────────────────────────────────────────────
function rotatePin(dx, dy, deg) {
  const r = deg * Math.PI / 180;
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
}

function pinTo3D(comp, pin) {
  const cx  = comp.def.w / 2;
  const cy  = comp.def.h / 2;
  const rad = (comp.rotation || 0) * Math.PI / 180;
  const dx  = pin.x - cx, dy = pin.y - cy;
  const rx  = comp.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry  = comp.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad);
  return new THREE.Vector3(rx, 18, -ry);
}

// ── Simulation Visual Feedback ────────────────────────────
// Called by lab.js driveComponent() when a pin changes state
window.update3DComponentState = function(compId, isHigh) {
  if (!IS_3D) return;
  const mesh = componentMeshes[compId];
  if (!mesh) return;

  const comp = window.components ? window.components.find(c => c.id === compId) : null;
  if (!comp) return;

  if (comp.defId && comp.defId.startsWith('led_')) {
    const intensity = isHigh ? 1.8 : 0.15;
    if (mesh.material) {
      mesh.material.emissiveIntensity = intensity;
    } else {
      mesh.traverse(child => {
        if (child.isMesh && child.material) child.material.emissiveIntensity = intensity;
      });
    }
  } else if (comp.defId === 'buzzer') {
    const color = isHigh ? 0x00aaff : 0x222222;
    if (mesh.material) {
      mesh.material.color.setHex(color);
    } else {
      mesh.traverse(child => {
        if (child.isMesh) child.material.color.setHex(color);
      });
    }
  }
};

// ── 3D Editor Interactions ──────────────────────────────────
(function init3DEditorInteractions() {
  const canvas3dDiv = document.getElementById('canvas3d');
  if (!canvas3dDiv) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredPinMesh = null;

  // ── Wire State (click-to-lock, Ctrl+click to connect) ────
  let pendingWireFrom  = null;   // { compId, pinId }
  let activeWireMesh   = null;   // THREE.Mesh tube preview (while routing)
  let selectedWire3d   = null;   // { wireId, mesh } — currently selected wire
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Toast overlay shown during wiring mode
  const wireToast = document.createElement('div');
  wireToast.id = 'wire3dToast';
  Object.assign(wireToast.style, {
    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(53,208,186,0.12)', border: '1px solid rgba(53,208,186,0.5)',
    backdropFilter: 'blur(10px)', color: '#35d0ba', fontFamily: 'Inter,sans-serif',
    fontSize: '13px', fontWeight: '600', padding: '8px 18px', borderRadius: '8px',
    pointerEvents: 'none', zIndex: '9999', display: 'none', letterSpacing: '0.3px',
    boxShadow: '0 0 20px rgba(53,208,186,0.3)'
  });
  document.body.appendChild(wireToast);

  function showToast(msg) { wireToast.textContent = msg; wireToast.style.display = 'block'; }
  function hideToast()    { wireToast.style.display = 'none'; }

  function clearWirePreview() {
    if (activeWireMesh) { scene.remove(activeWireMesh); activeWireMesh = null; }
  }

  function cancelWiring() {
    pendingWireFrom = null;
    clearWirePreview();
    hideToast();
  }

  // ── Helper: classify what was hit ───────────────────────
  function getHitData(e) {
    const rect = canvas3dDiv.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(sceneObjects, true);
    
    let pinData = null, compData = null, wireData = null;
    for (const hit of hits) {
      let curr = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.isPin  && !pinData)  pinData  = curr.userData;
        if (curr.userData && curr.userData.isComp && !compData) compData = curr.userData;
        if (curr.userData && curr.userData.isWire && !wireData) wireData = { ...curr.userData, mesh: curr };
        curr = curr.parent;
      }
      if (pinData) break;
    }
    return { pinData, compData, wireData };
  }

  // ── Wire selection helpers ────────────────────────────────
  function selectWire3d(wireId, mesh) {
    deselectWire3d();
    selectedWire3d = { wireId, mesh };
    // Highlight selected wire
    if (mesh && mesh.material) {
      mesh.material.emissive    = new THREE.Color(0x35d0ba);
      mesh.material.emissiveIntensity = 0.6;
    }
    // Show wire props in the right panel
    const wire = window.wires && window.wires.find(w => w.id === wireId);
    const body = document.getElementById('propsBody');
    if (body && wire) {
      body.innerHTML = `
        <div class="prop-group"><span class="prop-label">Wire</span>
          <strong style="font-size:13px">${wire.from.pinId} → ${wire.to.pinId}</strong>
        </div>`;
      const grp = document.createElement('div');
      grp.className = 'prop-group';
      grp.innerHTML = '<label class="prop-label" for="prop_wire3dcolor">Wire Color</label>';
      const inp = document.createElement('input');
      inp.type = 'color'; inp.className = 'prop-input prop-color'; inp.id = 'prop_wire3dcolor';
      inp.value = wire.color || '#35d0ba';
      inp.addEventListener('input', () => {
        wire.color = inp.value;
        // Update tube material
        if (mesh && mesh.material) mesh.material.color.set(inp.value);
      });
      grp.appendChild(inp);
      body.appendChild(grp);
      const delGrp = document.createElement('div');
      delGrp.className = 'prop-group';
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑 Delete Wire';
      delBtn.className = 'prop-input';
      delBtn.style.cssText = 'background:#ff3366;color:#fff;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;margin-top:4px;width:100%';
      delBtn.onclick = () => deleteSelectedWire3d();
      delGrp.appendChild(delBtn);
      body.appendChild(delGrp);
    }
  }

  function deselectWire3d() {
    if (selectedWire3d && selectedWire3d.mesh && selectedWire3d.mesh.material) {
      selectedWire3d.mesh.material.emissiveIntensity = 0;
    }
    selectedWire3d = null;
  }

  function deleteSelectedWire3d() {
    if (!selectedWire3d) return;
    if (window.pushHistory) window.pushHistory();
    const id = selectedWire3d.wireId;
    // Remove from wires array
    if (window.wires) {
      const wire = window.wires.find(w => w.id === id);
      if (wire && wire.element) wire.element.remove();
      window.wires = window.wires.filter(w => w.id !== id);
    }
    deselectWire3d();
    build3DScene();
  }

  // ── Click handler ────────────────────────────────────────
  canvas3dDiv.addEventListener('click', e => {
    if (!IS_3D || !scene || !camera) return;
    if (transformControl && transformControl.dragging) return;

    const { pinData, compData, wireData } = getHitData(e);

    // ── Ctrl + Click on a pin → CONNECT ─────────────────────
    if (e.ctrlKey && pinData && pendingWireFrom) {
      if (pinData.compId === pendingWireFrom.compId) {
        showToast('⚠ Cannot connect a pin to itself. Click another component.');
        setTimeout(hideToast, 2000);
        return;
      }
      // Draw the wire!
      if (window.pushHistory) window.pushHistory();
      const wireId = 'w_' + Date.now();
      const newWire = {
        id: wireId,
        from: { compId: pendingWireFrom.compId, pinId: pendingWireFrom.pinId },
        to:   { compId: pinData.compId,         pinId: pinData.pinId },
        color: '#35d0ba'
      };
      if (window.wires) {
        window.wires.push(newWire);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.classList.add('lab-wire');
        line.setAttribute('stroke', newWire.color);
        line.dataset.wireId = wireId;
        newWire.element = line;
        const wiresLayer = document.getElementById('wiresLayer');
        if (wiresLayer) wiresLayer.appendChild(line);
      }
      cancelWiring();
      build3DScene();
      return;
    }

    // ── Plain Click on a pin → LOCK SOURCE ───────────────────
    if (pinData && !e.ctrlKey) {
      if (pendingWireFrom && pendingWireFrom.compId === pinData.compId && pendingWireFrom.pinId === pinData.pinId) {
        // Clicking same pin again → cancel
        cancelWiring();
        return;
      }
      pendingWireFrom = { compId: pinData.compId, pinId: pinData.pinId };
      // Find the pin label for display
      const comp = window.components && window.components.find(c => c.id === pinData.compId);
      const pin  = comp && comp.def.pins.find(p => p.id === pinData.pinId);
      const label = pin ? pin.label : pinData.pinId;
      showToast(`🔌 Pin "${pinData.pinId}" locked — Ctrl + Click target pin to connect   |   Click again to cancel`);
      return;
    }

    // ── Plain Click on a component → SELECT / TRANSFORM GIZMO ─
    if (compData && !e.ctrlKey) {
      deselectWire3d();
      const comp = window.components && window.components.find(c => c.id === compData.compId);
      if (comp) {
        if (window.selectComponent) window.selectComponent(comp);
        if (transformControl) {
          const rootMesh = componentMeshes[compData.compId];
          if (rootMesh) transformControl.attach(rootMesh);
        }
      }
      return;
    }

    // ── Plain Click on a wire → SELECT WIRE ──────────────────
    if (wireData && !e.ctrlKey && !pinData) {
      cancelWiring();
      if (transformControl) transformControl.detach();
      selectWire3d(wireData.wireId, wireData.mesh);
      return;
    }

    // ── Click on empty space ─────────────────────────────────
    if (!compData && !pinData && !wireData) {
      deselectWire3d();
      if (pendingWireFrom) { cancelWiring(); return; }
      if (transformControl) transformControl.detach();
      if (window.clearSelection) window.clearSelection();
    }
  });

  // ── Live wire-preview while hovering (after pin locked) ──
  canvas3dDiv.addEventListener('pointermove', e => {
    const rect = canvas3dDiv.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // ── Wire preview ─────────────────────────────────────────
    if (pendingWireFrom) {
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(floorPlane, target)) {
        const fc = window.components && window.components.find(c => c.id === pendingWireFrom.compId);
        const fp = fc && fc.def.pins.find(p => p.id === pendingWireFrom.pinId);
        if (fc && fp) {
          const p1 = pinTo3D(fc, fp);
          target.y = Math.max(target.y, 10);
          clearWirePreview();
          const mid = new THREE.Vector3((p1.x+target.x)/2, p1.y + p1.distanceTo(target)*0.3, (p1.z+target.z)/2);
          const curve = new THREE.QuadraticBezierCurve3(p1, mid, target);
          const geo = new THREE.TubeGeometry(curve, 32, 1.5, 8, false);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x35d0ba, emissive: 0x003344, emissiveIntensity: 0.5,
            roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.8
          });
          activeWireMesh = new THREE.Mesh(geo, mat);
          scene.add(activeWireMesh);
        }
      }
    }

    // ── Pin hover highlighting ────────────────────────────────
    if (!transformControl || !transformControl.dragging) {
      const hits = raycaster.intersectObjects(sceneObjects, true);
      let foundPin = null;
      for (const hit of hits) {
        if (hit.object.userData && hit.object.userData.isPin) { foundPin = hit.object; break; }
      }

      const tt = document.querySelector('.pin-tooltip');

      if (hoveredPinMesh && hoveredPinMesh !== foundPin) {
        hoveredPinMesh.material.opacity = 0;
        hoveredPinMesh = null;
        if (tt) tt.style.display = 'none';
        canvas3dDiv.style.cursor = '';
      }

      if (foundPin && foundPin !== hoveredPinMesh) {
        hoveredPinMesh = foundPin;
        hoveredPinMesh.material.color.setHex(pendingWireFrom ? 0x00ff88 : 0xff3366);
        hoveredPinMesh.material.opacity = 0.85;
        canvas3dDiv.style.cursor = 'crosshair';

        if (tt) {
          const comp = window.components && window.components.find(c => c.id === foundPin.userData.compId);
          const pin  = comp && comp.def.pins.find(p => p.id === foundPin.userData.pinId);
          const pinLabel = pin ? (pin._customLabel || pin.label) : '';
          tt.innerHTML = pendingWireFrom
            ? `<strong>${foundPin.userData.pinId}</strong><br/><span style="font-size:10px;color:#0fa">Ctrl+Click to connect</span>`
            : `<strong>${foundPin.userData.pinId}</strong>${pinLabel ? '<br/>' + pinLabel : ''}`;
          tt.style.left = (e.clientX + 15) + 'px';
          tt.style.top  = (e.clientY + 15) + 'px';
          tt.style.display = 'block';
          tt.style.zIndex = '9999';
        }
      } else if (foundPin && tt) {
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top  = (e.clientY + 15) + 'px';
      }
    }
  });

  // ── Keyboard shortcuts ───────────────────────────────────
  window.addEventListener('keydown', e => {
    if (!IS_3D) return;
    if (e.target.matches('input,textarea')) return;

    // Escape cancels wiring or deselects
    if (e.key === 'Escape') {
      if (pendingWireFrom) { cancelWiring(); return; }
      deselectWire3d();
      if (transformControl) transformControl.detach();
      if (window.clearSelection) window.clearSelection();
    }

    // Delete / Backspace — delete selected wire or component
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedWire3d) { deleteSelectedWire3d(); return; }
      if (window.deleteSelected) window.deleteSelected();
    }

    // Blender-style transform mode hotkeys
    if (transformControl && transformControl.object) {
      const k = e.key.toLowerCase();
      if (k === 'g') transformControl.setMode('translate');
      if (k === 'r') transformControl.setMode('rotate');
      if (k === 's') transformControl.setMode('scale');
    }

    // Numpad 0 → toggle viewport navigation mode (like a camera lock/unlock)
    if (e.code === 'Numpad0' || e.key === 'Insert') {
      const isViewportMode = controls.mouseButtons.LEFT === THREE.MOUSE.ROTATE;
      if (isViewportMode) {
        // Exit viewport mode → restore selection mode
        controls.mouseButtons = {
          LEFT:   null,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT:  THREE.MOUSE.PAN
        };
        showToast('🔒 Viewport locked — Middle-mouse to orbit');
      } else {
        // Enter viewport mode → all mouse buttons orbit
        controls.mouseButtons = {
          LEFT:   THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT:  THREE.MOUSE.PAN
        };
        showToast('🎥 Viewport mode — Numpad 0 to exit');
      }
      setTimeout(hideToast, 2500);
    }
  });

  // ── Toolbar UI ──────────────────────────────────────────
  document.getElementById('btnTranslate')?.addEventListener('click', () => transformControl?.setMode('translate'));
  document.getElementById('btnRotate')?.addEventListener('click', () => transformControl?.setMode('rotate'));
  document.getElementById('btnScale')?.addEventListener('click', () => transformControl?.setMode('scale'));

})();


