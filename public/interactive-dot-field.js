const DEFAULT_OPTIONS = {
  dotCount: 480,
  dotColor: "#3B82F6",
  noiseSpeed: 0.18,
  noiseAmplitude: 10,
  interactionRadius: 160,
  interactionStrength: 0.22,
  glowIntensity: 0.28,
  animationSpeed: 0.7,
};

const SIMPLEX_GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) {
    return { r: 59, g: 130, b: 246 };
  }

  const number = Number.parseInt(normalized, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function rgba(hex, alpha) {
  const color = hexToRgb(hex);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

class SimplexNoise2D {
  constructor(seed = Math.random()) {
    this.permutation = new Uint8Array(512);
    const source = new Uint8Array(256);
    let state = Math.floor(seed * 2147483647) || 1;

    const random = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };

    for (let index = 0; index < 256; index += 1) {
      source[index] = index;
    }

    for (let index = 255; index >= 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const temp = source[index];
      source[index] = source[swapIndex];
      source[swapIndex] = temp;
    }

    for (let index = 0; index < 512; index += 1) {
      this.permutation[index] = source[index & 255];
    }
  }

  noise2D(xin, yin) {
    const s = (xin + yin) * SIMPLEX_F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SIMPLEX_G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + SIMPLEX_G2;
    const y1 = y0 - j1 + SIMPLEX_G2;
    const x2 = x0 - 1 + 2 * SIMPLEX_G2;
    const y2 = y0 - 1 + 2 * SIMPLEX_G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permutation[ii + this.permutation[jj]] % 8;
    const gi1 = this.permutation[ii + i1 + this.permutation[jj + j1]] % 8;
    const gi2 = this.permutation[ii + 1 + this.permutation[jj + 1]] % 8;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (SIMPLEX_GRADIENTS[gi0][0] * x0 + SIMPLEX_GRADIENTS[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (SIMPLEX_GRADIENTS[gi1][0] * x1 + SIMPLEX_GRADIENTS[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (SIMPLEX_GRADIENTS[gi2][0] * x2 + SIMPLEX_GRADIENTS[gi2][1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

export class InteractiveDotField {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.noise = new SimplexNoise2D(Math.random());
    this.particles = [];
    this.palette = ["#2563EB", "#3B82F6", "#60A5FA"];
    this.cursor = { x: 0, y: 0, targetX: 0, targetY: 0, active: 0, targetActive: 0 };
    this.cursor.lastMove = 0;
    this.size = { width: 0, height: 0, dpr: 1 };
    this.running = false;
    this.frame = 0;
    this.lastTimestamp = 0;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onResize = this.onResize.bind(this);
    this.tick = this.tick.bind(this);

    this.resizeObserver = null;

    this.setup();
  }

  setup() {
    this.resize();
    this.bindEvents();
    this.renderStatic();

    if (!this.reducedMotion) {
      this.start();
    }
  }

  bindEvents() {
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("resize", this.onResize, { passive: true });

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }
  }

  destroy() {
    this.stop();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("resize", this.onResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setOptions(options = {}) {
    this.options = { ...this.options, ...options };
    this.resize();
    this.renderStatic();
  }

  onResize() {
    this.resize();
    this.renderStatic();
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.stop();
      return;
    }

    if (!this.reducedMotion) {
      this.start();
    }
  }

  onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.cursor.targetX = event.clientX - rect.left;
    this.cursor.targetY = event.clientY - rect.top;
    this.cursor.targetActive = 1;
    this.cursor.lastMove = performance.now();
  }

  onPointerLeave() {
    this.cursor.targetActive = 0;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTimestamp = 0;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.size = { width, height, dpr };
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildParticles();
  }

  buildParticles() {
    const { width, height } = this.size;
    const compact = width < 768;
    const targetCount = compact
      ? Math.min(this.options.dotCount, 240)
      : this.options.dotCount;
    const columns = Math.ceil(Math.sqrt(targetCount / 0.78));
    const rows = columns;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.38;
    const radiusY = height * 0.38;
    const stepX = (radiusX * 2) / Math.max(1, columns - 1);
    const stepY = (radiusY * 2) / Math.max(1, rows - 1);
    const jitter = compact ? 0.08 : 0.12;
    const particles = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const offsetX = row % 2 === 0 ? 0 : stepX * 0.5;
        const baseX = centerX - radiusX + column * stepX + offsetX;
        const baseY = centerY - radiusY + row * stepY;
        const normalizedX = (baseX - centerX) / radiusX;
        const normalizedY = (baseY - centerY) / radiusY;
        const distance = Math.hypot(normalizedX, normalizedY);

        if (distance > 1.08) {
          continue;
        }

        const seed = (row * 97 + column * 31) % 1000;
        const jitterX = (this.noise.noise2D(seed * 0.01, seed * 0.02) * 0.5) * stepX * jitter;
        const jitterY = (this.noise.noise2D(seed * 0.03, seed * 0.04) * 0.5) * stepY * jitter;
        const depth = clamp(1 - distance * 0.95, 0, 1);
        const size = lerp(1.1, 2.8, Math.pow(depth, 0.7));
        const alpha = lerp(0.06, 0.88, Math.pow(depth, 0.9));

        particles.push({
          baseX: baseX + jitterX,
          baseY: baseY + jitterY,
          x: baseX + jitterX,
          y: baseY + jitterY,
          vx: 0,
          vy: 0,
          size,
          alpha,
          depth,
          color: this.palette[(row + column) % this.palette.length],
          phase: (row * 0.37 + column * 0.51) % Math.PI * 2,
        });
      }
    }

    particles.sort((left, right) => right.depth - left.depth);
    this.particles = particles.slice(0, targetCount);
  }

  renderStatic() {
    const ctx = this.context;
    const { width, height } = this.size;
    if (!width || !height) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    this.drawBackdrop();
    for (const particle of this.particles) {
      this.drawParticle(particle, 1);
    }
  }

  drawBackdrop() {
    const ctx = this.context;
    const { width, height } = this.size;
    const gradient = ctx.createRadialGradient(width * 0.38, height * 0.35, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, rgba(this.options.dotColor, this.reducedMotion ? 0.06 : 0.12));
    gradient.addColorStop(0.55, rgba(this.options.dotColor, 0.03));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawParticle(particle, intensity) {
    const ctx = this.context;
    const alpha = particle.alpha * intensity;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = this.options.glowIntensity * 18;
    ctx.shadowColor = rgba(particle.color, 0.5);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  updateCursor() {
    this.cursor.x = lerp(this.cursor.x, this.cursor.targetX, 0.16);
    this.cursor.y = lerp(this.cursor.y, this.cursor.targetY, 0.16);
    this.cursor.active = lerp(this.cursor.active, this.cursor.targetActive, 0.08);
  }

  tick(timestamp) {
    if (!this.running) {
      return;
    }

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const delta = Math.min(32, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.updateCursor();

    const ctx = this.context;
    const { width, height } = this.size;
    const time = timestamp * 0.001 * this.options.animationSpeed;
    if (this.cursor.lastMove && timestamp - this.cursor.lastMove > 180) {
      this.cursor.targetActive = 0;
    }

    ctx.clearRect(0, 0, width, height);
    this.drawBackdrop();

    const flowRadius = this.options.interactionRadius;
    const flowRadiusSquared = flowRadius * flowRadius;
    const cursorInfluence = this.cursor.active;
    const spring = this.reducedMotion ? 0.012 : 0.028;
    const damping = this.reducedMotion ? 0.9 : 0.865;
    const cursorSpeed = Math.min(1, Math.hypot(this.cursor.targetX - this.cursor.x, this.cursor.targetY - this.cursor.y) / 40);

    for (const particle of this.particles) {
      const baseNoiseX = this.noise.noise2D(
        particle.baseX * 0.004 + time * this.options.noiseSpeed,
        particle.baseY * 0.004 - time * this.options.noiseSpeed * 0.92,
      );
      const baseNoiseY = this.noise.noise2D(
        particle.baseX * 0.004 - 83.2 - time * this.options.noiseSpeed * 0.8,
        particle.baseY * 0.004 + 57.1 + time * this.options.noiseSpeed,
      );

      const targetX = particle.baseX + baseNoiseX * this.options.noiseAmplitude;
      const targetY = particle.baseY + baseNoiseY * this.options.noiseAmplitude;

      const dx = particle.x - this.cursor.x;
      const dy = particle.y - this.cursor.y;
      const distanceSquared = dx * dx + dy * dy;

      if (cursorInfluence > 0.01 && distanceSquared < flowRadiusSquared) {
        const distance = Math.sqrt(distanceSquared) || 0.001;
        const falloff = Math.pow(1 - distance / flowRadius, 2.2) * cursorInfluence;
        const swirlDirection = cursorSpeed > 0.1 ? Math.sign((this.cursor.targetX - this.cursor.x) * dy - (this.cursor.targetY - this.cursor.y) * dx) || 1 : 1;
        const tangentX = (-dy / distance) * swirlDirection;
        const tangentY = (dx / distance) * swirlDirection;
        const radialX = (-dx / distance) * 0.18;
        const radialY = (-dy / distance) * 0.18;
        const flowStrength = this.options.interactionStrength * falloff;

        particle.vx += (tangentX * 0.72 + radialX) * flowStrength * 8;
        particle.vy += (tangentY * 0.72 + radialY) * flowStrength * 8;
      }

      particle.vx += (targetX - particle.x) * spring;
      particle.vy += (targetY - particle.y) * spring;
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const breath = 0.92 + 0.08 * Math.sin(time * 1.2 + particle.phase);
      this.drawParticle(particle, breath);
    }

    if (this.running) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }
}
