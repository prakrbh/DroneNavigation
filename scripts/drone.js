// ============================================================
//  Drone class — physics, collision, rendering, fitness
// ============================================================

class Drone {
  constructor(dna, simConfig) {
    this.config = simConfig;
    this.x = simConfig.start.x;
    this.y = simConfig.start.y;
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.r = 3.5;
    this.maxSpeed = 5;

    this.dna = dna || this.generateRandomDNA();
    this.step = 0;
    this.reached = false;
    this.crashed = false;
    this.fitness = 0;
    this.isBest = false;

    // Trail history for rendering persistent paths
    this.trail = [];
    this.maxTrailLength = 80;
  }

  generateRandomDNA() {
    const len = this.config.lifetime;
    const mf = this.config.maxForce;
    return Array.from({ length: len }, () => ({
      x: (Math.random() - 0.5) * mf * 2,
      y: (Math.random() - 0.5) * mf * 2
    }));
  }

  update() {
    if (this.step >= this.dna.length || this.reached || this.crashed) return;

    // Store trail point
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) this.trail.shift();

    // Apply force from DNA
    this.acc = this.dna[this.step];

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;

    // Limit speed
    const speed = Math.sqrt(this.vel.x ** 2 + this.vel.y ** 2);
    if (speed > this.maxSpeed) {
      this.vel.x = (this.vel.x / speed) * this.maxSpeed;
      this.vel.y = (this.vel.y / speed) * this.maxSpeed;
    }

    this.x += this.vel.x;
    this.y += this.vel.y;
    this.step++;

    // Reached target?
    if (this.distanceToTarget() < 18) {
      this.reached = true;
    }

    // Collision?
    if (this.checkWallCollision() || this.checkBoundaryCollision()) {
      this.crashed = true;
    }
  }

  checkWallCollision() {
    for (const wall of this.config.walls) {
      const wx = Math.min(wall.x, wall.x + wall.w);
      const wy = Math.min(wall.y, wall.y + wall.h);
      const ww = Math.abs(wall.w);
      const wh = Math.abs(wall.h);
      if (
        this.x + this.r > wx &&
        this.x - this.r < wx + ww &&
        this.y + this.r > wy &&
        this.y - this.r < wy + wh
      ) {
        return true;
      }
    }
    return false;
  }

  checkBoundaryCollision() {
    return (
      this.x < this.r ||
      this.x > this.config.width - this.r ||
      this.y < this.r ||
      this.y > this.config.height - this.r
    );
  }

  distanceToTarget() {
    const dx = this.x - this.config.target.x;
    const dy = this.y - this.config.target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Enhanced fitness function ---
  calculateFitness() {
    const distance = this.distanceToTarget();
    const maxDistance = Math.sqrt(this.config.width ** 2 + this.config.height ** 2);

    if (this.reached) {
      // Big reward + efficiency bonus (fewer steps = better)
      this.fitness = 10000 + (this.config.lifetime - this.step) * 50;
    } else {
      // Inverse-square distance reward — rewards getting very close much more
      const normalizedDist = distance / maxDistance;
      const distanceFitness = 1 / (normalizedDist * normalizedDist + 0.001);

      // Penalize crashing
      const crashPenalty = this.crashed ? 0.3 : 1.0;

      // Survival bonus for non-crashed drones
      const survivalBonus = this.crashed ? 0 : this.step * 2;

      // Proximity to obstacles penalty — encourages cleaner paths
      let obstaclePenalty = 0;
      for (const wall of this.config.walls) {
        const cx = wall.x + wall.w / 2;
        const cy = wall.y + wall.h / 2;
        const dWall = Math.sqrt((this.x - cx) ** 2 + (this.y - cy) ** 2);
        if (dWall < 40) {
          obstaclePenalty += (40 - dWall) * 0.5;
        }
      }

      this.fitness = (distanceFitness + survivalBonus) * crashPenalty - obstaclePenalty;
      this.fitness = Math.max(0.1, this.fitness); // Floor at 0.1
    }

    return this.fitness;
  }

  // --- Rendering ---
  draw(ctx) {
    // Draw trail
    if (this.trail.length > 1 && !this.crashed) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }

      if (this.isBest) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 2;
      } else if (this.reached) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // Draw body
    ctx.beginPath();
    const radius = this.isBest ? 5 : this.r;

    if (this.reached) {
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
      ctx.shadowBlur = 6;
    } else if (this.crashed) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.shadowBlur = 0;
    } else if (this.isBest) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#6366f1';
      ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
      ctx.shadowBlur = 4;
    }

    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}