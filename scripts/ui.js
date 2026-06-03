// ============================================================
//  UI Controller — slider bindings, tool buttons, speed,
//  fitness chart, generation log
// ============================================================

const UI = {
  // DOM refs (populated in init)
  els: {},

  // Fitness history for the chart
  fitnessHistory: [],
  avgFitnessHistory: [],
  maxHistoryPoints: 100,

  init() {
    this.els = {
      // Stats
      generation:   document.getElementById('stat-generation'),
      bestFitness:  document.getElementById('stat-best-fitness'),
      avgFitness:   document.getElementById('stat-avg-fitness'),
      reached:      document.getElementById('stat-reached'),
      progressFill: document.getElementById('progress-fill'),
      progressPct:  document.getElementById('progress-pct'),

      // Sliders
      popSlider:    document.getElementById('pop-slider'),
      popVal:       document.getElementById('pop-val'),
      mutSlider:    document.getElementById('mut-slider'),
      mutVal:       document.getElementById('mut-val'),
      lifeSlider:   document.getElementById('life-slider'),
      lifeVal:      document.getElementById('life-val'),
      forceSlider:  document.getElementById('force-slider'),
      forceVal:     document.getElementById('force-val'),
      eliteSlider:  document.getElementById('elite-slider'),
      eliteVal:     document.getElementById('elite-val'),

      // Buttons
      pauseBtn:     document.getElementById('pause-btn'),

      // Sidebar / Instructions
      sidebar:      document.getElementById('sidebar'),
      collapseBtn:  document.getElementById('collapse-btn'),
      expandBtn:    document.getElementById('expand-btn'),
      instructions: document.getElementById('instructions'),
      instrClose:   document.getElementById('instructions-close'),
      helpBtn:      document.getElementById('help-btn'),

      // Chart
      chartCanvas:  document.getElementById('chart-canvas'),

      // Log
      genLog:       document.getElementById('gen-log'),
    };

    this.bindSliders();
    this.bindToolButtons();
    this.bindActionButtons();
    this.bindSpeedButtons();
    this.bindPanelControls();
  },

  // --- Slider bindings ---
  bindSliders() {
    const bind = (slider, display, formatter, callback) => {
      slider.addEventListener('input', () => {
        display.textContent = formatter(slider.value);
        if (callback) callback(parseFloat(slider.value));
      });
    };

    bind(this.els.popSlider, this.els.popVal, v => v, v => {
      SIM.config.numDrones = v;
    });
    bind(this.els.mutSlider, this.els.mutVal, v => v + '%', v => {
      SIM.config.mutationRate = v / 100;
    });
    bind(this.els.lifeSlider, this.els.lifeVal, v => v, v => {
      SIM.config.lifetime = v;
    });
    bind(this.els.forceSlider, this.els.forceVal, v => parseFloat(v).toFixed(2), v => {
      SIM.config.maxForce = v;
    });
    bind(this.els.eliteSlider, this.els.eliteVal, v => v, v => {
      SIM.config.eliteCount = v;
    });
  },

  // --- Tool Buttons ---
  bindToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM.placingMode = btn.dataset.tool;
      });
    });
  },

  // --- Action Buttons ---
  bindActionButtons() {
    document.getElementById('clear-walls-btn').addEventListener('click', () => {
      SIM.config.walls = [];
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      SIM.reset();
    });

    this.els.pauseBtn.addEventListener('click', () => {
      SIM.isPaused = !SIM.isPaused;
      this.els.pauseBtn.textContent = SIM.isPaused ? '▶️ Play' : '⏸️ Pause';
    });

    this.els.helpBtn.addEventListener('click', () => {
      this.els.instructions.classList.remove('hidden');
    });
  },

  // --- Speed Buttons ---
  bindSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM.speed = parseInt(btn.dataset.speed, 10);
      });
    });
  },

  // --- Panel Controls (collapse/expand/close) ---
  bindPanelControls() {
    // Collapse sidebar
    this.els.collapseBtn.addEventListener('click', () => {
      this.els.sidebar.classList.add('collapsed');
      this.els.expandBtn.classList.remove('hidden');
      // Resize canvas after transition
      setTimeout(() => SIM.resizeCanvas(), 450);
    });

    // Expand sidebar
    this.els.expandBtn.addEventListener('click', () => {
      this.els.sidebar.classList.remove('collapsed');
      this.els.expandBtn.classList.add('hidden');
      setTimeout(() => SIM.resizeCanvas(), 450);
    });

    // Close instructions
    this.els.instrClose.addEventListener('click', () => {
      this.els.instructions.classList.add('hidden');
    });
  },

  // --- Update stats display ---
  updateStats(generation, maxFitness, avgFitness, reached, numDrones) {
    this.els.generation.textContent = generation;
    this.els.bestFitness.textContent = maxFitness.toFixed(0);
    this.els.avgFitness.textContent = avgFitness.toFixed(0);
    this.els.reached.textContent = `${reached}/${numDrones}`;
  },

  // --- Update progress bar ---
  updateProgress(frameCount, lifetime) {
    const pct = Math.min(100, (frameCount / lifetime) * 100);
    this.els.progressFill.style.width = pct + '%';
    this.els.progressPct.textContent = Math.round(pct) + '%';
  },

  // --- Log a generation result ---
  logGeneration(gen, maxFitness, reached, numDrones) {
    const entry = document.createElement('div');
    entry.className = 'gen-log-entry';
    entry.innerHTML = `<span class="gen-num">Gen ${gen}</span><span>Best: <span class="gen-fitness">${maxFitness.toFixed(0)}</span> | ${reached}/${numDrones} ✓</span>`;

    // Prepend (newest first)
    this.els.genLog.prepend(entry);

    // Cap at 50 entries
    while (this.els.genLog.children.length > 50) {
      this.els.genLog.removeChild(this.els.genLog.lastChild);
    }
  },

  // --- Fitness Chart ---
  recordFitness(maxFitness, avgFitness) {
    this.fitnessHistory.push(maxFitness);
    this.avgFitnessHistory.push(avgFitness);
    if (this.fitnessHistory.length > this.maxHistoryPoints) {
      this.fitnessHistory.shift();
      this.avgFitnessHistory.shift();
    }
    this.drawChart();
  },

  drawChart() {
    const canvas = this.els.chartCanvas;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 8, right: 8, bottom: 8, left: 8 };

    ctx.clearRect(0, 0, w, h);

    if (this.fitnessHistory.length < 2) return;

    const allValues = [...this.fitnessHistory, ...this.avgFitnessHistory];
    const maxVal = Math.max(...allValues, 1);
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal || 1;

    const drawLine = (data, color, alpha, lineWidth) => {
      const len = data.length;
      const stepX = (w - pad.left - pad.right) / (len - 1);

      // Fill gradient
      ctx.beginPath();
      ctx.moveTo(pad.left, h - pad.bottom);
      for (let i = 0; i < len; i++) {
        const x = pad.left + i * stepX;
        const y = pad.top + (1 - (data[i] - minVal) / range) * (h - pad.top - pad.bottom);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(pad.left + (len - 1) * stepX, h - pad.bottom);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color.replace('1)', `${alpha * 0.3})`));
      grad.addColorStop(1, color.replace('1)', '0)'));
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = pad.left + i * stepX;
        const y = pad.top + (1 - (data[i] - minVal) / range) * (h - pad.top - pad.bottom);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    drawLine(this.avgFitnessHistory, 'rgba(99, 102, 241, 1)', 0.5, 1.5);
    drawLine(this.fitnessHistory, 'rgba(34, 197, 94, 1)', 0.8, 2);
  },

  resetChart() {
    this.fitnessHistory = [];
    this.avgFitnessHistory = [];
    const canvas = this.els.chartCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};