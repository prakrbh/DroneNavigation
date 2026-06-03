// ============================================================
//  Main Simulation Controller
//  - Canvas setup & rendering
//  - Animation loop with speed multiplier
//  - Mouse interaction for wall / start / target placement
//  - Dark-themed canvas with glow effects
// ============================================================

const SIM = {
  canvas: null,
  ctx: null,

  config: {
    numDrones: 60,
    lifetime: 400,
    mutationRate: 0.02,
    maxForce: 0.30,
    eliteCount: 3,
    generation: 1,
    width: 0,
    height: 0,
    start: { x: 80, y: 0 },
    target: { x: 0, y: 0 },
    walls: []
  },

  drones: [],
  frameCount: 0,
  isPaused: false,
  placingMode: 'wall',
  speed: 1,

  // Wall drawing state
  _drawing: false,
  _currentWall: null,

  // Animation time for pulsing effects
  _animTime: 0,

  // --- Initialize ---
  init() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.bindMouse();
    UI.init();

    this.drones = GA.initPopulation(this.config);
    this.animate();
  },

  resizeCanvas() {
    const area = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = area.clientWidth;
    const h = area.clientHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.config.width = w;
    this.config.height = h;

    // Default positions if never set
    if (this.config.start.y === 0) {
      this.config.start = { x: 80, y: h / 2 };
    }
    if (this.config.target.x === 0) {
      this.config.target = { x: w - 80, y: h / 2 };
    }
  },

  reset() {
    this.config.generation = 1;
    this.frameCount = 0;
    this.drones = GA.initPopulation(this.config);
    UI.updateStats(1, 0, 0, 0, this.config.numDrones);
    UI.updateProgress(0, this.config.lifetime);
    UI.resetChart();
    // Clear log
    document.getElementById('gen-log').innerHTML = '';
  },

  // --- Animation loop ---
  animate() {
    if (!this.isPaused) {
      for (let s = 0; s < this.speed; s++) {
        this.step();
      }
    }

    this.render();
    requestAnimationFrame(() => this.animate());
  },

  step() {
    for (const drone of this.drones) {
      drone.update();
    }

    UI.updateProgress(this.frameCount, this.config.lifetime);
    this.frameCount++;

    if (this.frameCount >= this.config.lifetime) {
      this.evolve();
    }
  },

  evolve() {
    const result = GA.nextGeneration(this.drones, this.config);
    this.drones = result.drones;

    const gen = this.config.generation;
    const { maxFitness, avgFitness, reached } = result.stats;

    UI.updateStats(gen, maxFitness, avgFitness, reached, this.config.numDrones);
    UI.logGeneration(gen, maxFitness, reached, this.config.numDrones);
    UI.recordFitness(maxFitness, avgFitness);

    this.config.generation++;
    this.frameCount = 0;
  },

  // --- Render ---
  render() {
    const ctx = this.ctx;
    const W = this.config.width;
    const H = this.config.height;
    this._animTime += 0.02;

    // Background — dark gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0e1a');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    this.drawGrid(ctx, W, H);

    // Walls
    this.drawWalls(ctx);

    // Drones
    for (const drone of this.drones) {
      drone.draw(ctx);
    }

    // Start & Target with glow
    this.drawNode(ctx, this.config.start, '#3b82f6', 'START', 14);
    this.drawNode(ctx, this.config.target, '#f59e0b', 'TARGET', 16);
  },

  drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = step; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  },

  drawWalls(ctx) {
    for (const wall of this.config.walls) {
      const wx = Math.min(wall.x, wall.x + wall.w);
      const wy = Math.min(wall.y, wall.y + wall.h);
      const ww = Math.abs(wall.w);
      const wh = Math.abs(wall.h);

      // Glow
      ctx.shadowColor = 'rgba(239, 68, 68, 0.25)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(wx, wy, ww, wh);

      // Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, ww, wh);

      // Fill pattern
      ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.fillRect(wx, wy, ww, wh);
    }
  },

  drawNode(ctx, pos, color, label, radius) {
    const pulse = 0.15 * Math.sin(this._animTime * 3);

    // Outer glow rings
    for (let i = 3; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + i * 6 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(')', `, ${0.03 * (4 - i)})`).replace('rgb', 'rgba');
      // Simple fallback: use hex to rgba
      ctx.fillStyle = this.hexToRgba(color, 0.03 * (4 - i));
      ctx.fill();
    }

    // Main circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold 9px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pos.x, pos.y);
  },

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // --- Mouse Interaction ---
  bindMouse() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      if (this.placingMode === 'wall') {
        this._drawing = true;
        this._currentWall = { x: pos.x, y: pos.y, w: 0, h: 0 };
        this.config.walls.push(this._currentWall);
      } else if (this.placingMode === 'start') {
        this.config.start = pos;
        this.reset();
      } else if (this.placingMode === 'target') {
        this.config.target = pos;
        this.reset();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this._drawing || !this._currentWall) return;
      const pos = getPos(e);
      this._currentWall.w = pos.x - this._currentWall.x;
      this._currentWall.h = pos.y - this._currentWall.y;
    });

    this.canvas.addEventListener('mouseup', () => {
      // Remove tiny accidental walls
      if (this._currentWall && Math.abs(this._currentWall.w) < 5 && Math.abs(this._currentWall.h) < 5) {
        const idx = this.config.walls.indexOf(this._currentWall);
        if (idx > -1) this.config.walls.splice(idx, 1);
      }
      this._drawing = false;
      this._currentWall = null;
    });
  }
};

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  SIM.init();
});