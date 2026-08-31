/**
 * EduSim Virtual Lab — Visual Effects & Animation Engine
 * Handles realistic particles, smoke puffs, connection sparks, drop ripples, and electrical arcs.
 */
'use strict';

class EffectsEngine {
  constructor() {
    this.svg = null;
    this.effectsLayer = null;
    this.particles = [];
    this.smokeEmitters = new Map(); // compId -> { x, y, intervalId }
    this.animFrameId = null;
    this.init();
  }

  init() {
    const checkSvg = () => {
      this.svg = document.getElementById('labSvg');
      if (this.svg) {
        let layer = document.getElementById('effectsLayer');
        if (!layer) {
          layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          layer.id = 'effectsLayer';
          layer.style.pointerEvents = 'none';
          this.svg.appendChild(layer);
        }
        this.effectsLayer = layer;
        this.startLoop();
      } else {
        setTimeout(checkSvg, 100);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkSvg);
    } else {
      checkSvg();
    }
  }

  startLoop() {
    if (this.animFrameId) return;
    const loop = () => {
      this.updateParticles();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // ── 1. SNAP / CONNECTION SPARK ─────────────────────────────
  /**
   * Spawns an electric spark burst at (x, y)
   */
  spawnConnectionSpark(x, y, color = '#00f2fe') {
    if (!this.effectsLayer) return;

    // Glowing ring shockwave
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', x);
    ring.setAttribute('cy', y);
    ring.setAttribute('r', '3');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', color);
    ring.setAttribute('stroke-width', '2.5');
    ring.setAttribute('filter', 'drop-shadow(0 0 6px ' + color + ')');
    this.effectsLayer.appendChild(ring);

    let ringRadius = 3;
    let ringOpacity = 1;
    const expandRing = () => {
      ringRadius += 1.8;
      ringOpacity -= 0.08;
      ring.setAttribute('r', ringRadius);
      ring.setAttribute('opacity', Math.max(0, ringOpacity));
      if (ringOpacity > 0) {
        requestAnimationFrame(expandRing);
      } else {
        ring.remove();
      }
    };
    requestAnimationFrame(expandRing);

    // Micro sparks flying out
    const count = 7;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 2 + Math.random() * 3.5;
      this.particles.push({
        el: this.createParticleElement(x, y, color, 2 + Math.random() * 2),
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        fadeSpeed: 0.04 + Math.random() * 0.03,
        size: 2,
        gravity: 0.1
      });
    }
  }

  // ── 2. COMPONENT DROP / PLACEMENT RIPPLE ────────────────────
  /**
   * Creates a modern pulsing neon boundary ripple when dropping a component
   */
  spawnDropRipple(x, y, w = 40, h = 40, color = '#00ffcc') {
    if (!this.effectsLayer) return;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x - 4);
    rect.setAttribute('y', y - 4);
    rect.setAttribute('width', w + 8);
    rect.setAttribute('height', h + 8);
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('filter', `drop-shadow(0 0 8px ${color})`);
    this.effectsLayer.appendChild(rect);

    let scale = 0;
    let opacity = 1;
    const animateDrop = () => {
      scale += 0.8;
      opacity -= 0.045;
      rect.setAttribute('x', x - 4 - scale);
      rect.setAttribute('y', y - 4 - scale);
      rect.setAttribute('width', w + 8 + scale * 2);
      rect.setAttribute('height', h + 8 + scale * 2);
      rect.setAttribute('opacity', Math.max(0, opacity));
      if (opacity > 0) {
        requestAnimationFrame(animateDrop);
      } else {
        rect.remove();
      }
    };
    requestAnimationFrame(animateDrop);
  }

  // ── 3. REALISTIC BLOWN COMPONENT SMOKE & SPARKS ──────────────
  /**
   * Starts continuous smoke & spark puffing from a blown component
   */
  startComponentSmoke(comp) {
    if (!comp || this.smokeEmitters.has(comp.id)) return;

    const spawnPuff = () => {
      if (!this.smokeEmitters.has(comp.id)) return;
      const cx = comp.x + (comp.def?.w || 40) / 2;
      const cy = comp.y + 10;

      // Spawn 2-3 expanding gray smoke particles
      for (let i = 0; i < 2; i++) {
        const offset = (Math.random() - 0.5) * 12;
        const size = 6 + Math.random() * 6;
        const smokeEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        smokeEl.setAttribute('cx', cx + offset);
        smokeEl.setAttribute('cy', cy);
        smokeEl.setAttribute('r', size);
        smokeEl.setAttribute('fill', 'rgba(180, 180, 190, 0.7)');
        smokeEl.setAttribute('filter', 'blur(3px)');
        this.effectsLayer.appendChild(smokeEl);

        this.particles.push({
          el: smokeEl,
          x: cx + offset,
          y: cy,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2 - Math.random() * 1.2, // Floats upward
          alpha: 0.75,
          fadeSpeed: 0.015 + Math.random() * 0.01,
          size: size,
          growSpeed: 0.35, // Smoke billows and expands
          isSmoke: true
        });
      }

      // Occasional crackling fire spark (yellow/orange)
      if (Math.random() > 0.4) {
        const sparkEl = this.createParticleElement(cx, cy, '#ff5500', 3);
        sparkEl.setAttribute('filter', 'drop-shadow(0 0 4px #ffaa00)');
        this.particles.push({
          el: sparkEl,
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 3,
          alpha: 1,
          fadeSpeed: 0.05,
          size: 2.5,
          gravity: 0.15
        });
      }
    };

    // Immediate puff + continuous interval
    spawnPuff();
    const intervalId = setInterval(spawnPuff, 220);
    this.smokeEmitters.set(comp.id, { intervalId });
  }

  stopComponentSmoke(comp) {
    if (!comp || !this.smokeEmitters.has(comp.id)) return;
    const emitter = this.smokeEmitters.get(comp.id);
    clearInterval(emitter.intervalId);
    this.smokeEmitters.delete(comp.id);
  }

  stopAllSmoke() {
    this.smokeEmitters.forEach(emitter => clearInterval(emitter.intervalId));
    this.smokeEmitters.clear();
  }

  // ── 4. SHORT CIRCUIT ARCS ──────────────────────────────────
  /**
   * Emits rapid electric sparks and flashing arcs along a shorted line
   */
  spawnShortCircuitZap(x1, y1, x2, y2) {
    if (!this.effectsLayer) return;

    // Jagged lightning path
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
    const d = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

    const zap = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    zap.setAttribute('d', d);
    zap.setAttribute('stroke', '#ff3344');
    zap.setAttribute('stroke-width', '3');
    zap.setAttribute('fill', 'none');
    zap.setAttribute('filter', 'drop-shadow(0 0 8px #ff0022)');
    this.effectsLayer.appendChild(zap);

    setTimeout(() => zap.remove(), 120);

    // Spark burst at both endpoints
    this.spawnConnectionSpark(x1, y1, '#ff3300');
    this.spawnConnectionSpark(x2, y2, '#ff3300');
  }

  // ── 5. DELETION DISSOLVE EFFECT ─────────────────────────────
  /**
   * Spawns an explosion burst of tiny disintegrating particles on delete
   */
  spawnDeleteBurst(x, y, w = 30, h = 30) {
    if (!this.effectsLayer) return;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const colors = ['#ff4b4b', '#ff7878', '#ffa3a3', '#888888'];

    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        el: this.createParticleElement(cx, cy, color, 3),
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        fadeSpeed: 0.04 + Math.random() * 0.03,
        size: 3,
        gravity: 0.05
      });
    }
  }

  // ── PARTICLE UTILITIES ─────────────────────────────────────
  createParticleElement(x, y, color, size = 3) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', size);
    circle.setAttribute('fill', color);
    this.effectsLayer.appendChild(circle);
    return circle;
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.alpha -= p.fadeSpeed;
      if (p.growSpeed) p.size += p.growSpeed;

      if (p.alpha <= 0) {
        p.el.remove();
        this.particles.splice(i, 1);
      } else {
        p.el.setAttribute('cx', p.x);
        p.el.setAttribute('cy', p.y);
        p.el.setAttribute('r', Math.max(0.5, p.size));
        p.el.setAttribute('opacity', Math.max(0, p.alpha));
      }
    }
  }
}

window.effectsEngine = new EffectsEngine();