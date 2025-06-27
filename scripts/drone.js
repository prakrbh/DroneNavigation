 class Drone {
      constructor(dna) {
        this.x = start.x;
        this.y = start.y;
        this.prevX = this.x;
        this.prevY = this.y;
        this.vel = { x: 0, y: 0 };
        this.acc = { x: 0, y: 0 };
        this.r = 4;
        this.maxSpeed = 20;
        this.dna = dna || this.generateRandomDNA();
        this.step = 0;
        this.reached = false;
        this.crashed = false;
        this.fitness = 0;
      }

      generateRandomDNA() {
        return Array.from({ length: LIFETIME }, () => ({
          x: (Math.random() - 0.5) * MAX_FORCE * 2,
          y: (Math.random() - 0.5) * MAX_FORCE * 2
        }));
      }

      update() {
        if (this.step >= this.dna.length || this.reached || this.crashed) return;

        this.prevX = this.x;
        this.prevY = this.y;

        // Apply force from DNA
        this.acc = this.dna[this.step];
        
        // Update velocity and position
        this.vel.x += this.acc.x;
        this.vel.y += this.acc.y;
        
        // Limit speed
        const speed = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
        if (speed > this.maxSpeed) {
          this.vel.x = (this.vel.x / speed) * this.maxSpeed;
          this.vel.y = (this.vel.y / speed) * this.maxSpeed;
        }
        
        this.x += this.vel.x;
        this.y += this.vel.y;
        this.step++;

        // Check if reached target
        if (this.distanceToTarget() < 15) {
          this.reached = true;
        }

        // Check wall collisions
        if (this.checkWallCollision() || this.checkBoundaryCollision()) {
          this.crashed = true;
        }
      }

      checkWallCollision() {
        for (const wall of walls) {
          if (this.x + this.r > wall.x && 
              this.x - this.r < wall.x + wall.w && 
              this.y + this.r > wall.y && 
              this.y - this.r < wall.y + wall.h) {
            return true;
          }
        }
        return false;
      }

      checkBoundaryCollision() {
        return this.x < this.r || this.x > WIDTH - this.r || 
               this.y < this.r || this.y > HEIGHT - this.r;
      }

      distanceToTarget() {
        return Math.sqrt((this.x - target.x) ** 2 + (this.y - target.y) ** 2);
      }

      draw() {
        ctx.beginPath();
        
        if (this.reached) {
          ctx.fillStyle = '#4CAF50';
          ctx.strokeStyle = '#2E7D32';
        } else if (this.crashed) {
          ctx.fillStyle = '#9E9E9E';
          ctx.strokeStyle = '#616161';
        } else {
          ctx.fillStyle = '#FF5722';
          ctx.strokeStyle = '#D84315';
        }
        
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw trail for active drones
        if (!this.crashed && !this.reached) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 87, 34, 0.3)';
          ctx.lineWidth = 1;
          ctx.moveTo(this.prevX, this.prevY);
          ctx.lineTo(this.x, this.y);
          ctx.stroke();
        }
      }

      calculateFitness() {
        const distance = this.distanceToTarget();
        const maxDistance = Math.sqrt(WIDTH * WIDTH + HEIGHT * HEIGHT);
        
        if (this.reached) {
          // High reward for reaching target, bonus for efficiency (fewer steps)
          this.fitness = 10000 + (LIFETIME - this.step) * 10;
        } else {
          // Fitness based on how close we got to the target
          // Scale from 1 to 1000 based on distance
          const distanceFitness = Math.max(1, 1000 * (1 - distance / maxDistance));
          
          // bonus for surviving longer without crashing
          const survivalBonus = this.crashed ? 0 : this.step * 5;
          
          this.fitness = distanceFitness + survivalBonus;
        }
        
        return this.fitness;
      }
    }