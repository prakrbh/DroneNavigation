// ============================================================
//  Genetic Algorithm Engine
//  - Tournament selection
//  - Multi-point crossover
//  - Adaptive mutation
//  - Configurable elitism
//  - Fitness sharing for diversity
// ============================================================

const GA = {
  // --- Tournament Selection ---
  // Picks `tournamentSize` random individuals and returns the fittest.
  tournamentSelect(drones, tournamentSize = 5) {
    let best = null;
    for (let i = 0; i < tournamentSize; i++) {
      const candidate = drones[Math.floor(Math.random() * drones.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best;
  },

  // --- Multi-Point Crossover ---
  // Splits the DNA at `numPoints` random locations and alternates segments.
  crossover(dnaA, dnaB, numPoints = 2) {
    const len = dnaA.length;
    const points = new Set();
    while (points.size < numPoints) {
      points.add(Math.floor(Math.random() * (len - 1)) + 1);
    }
    const sortedPoints = [...points].sort((a, b) => a - b);

    const child = [];
    let useA = true;
    let pointIdx = 0;

    for (let i = 0; i < len; i++) {
      if (pointIdx < sortedPoints.length && i === sortedPoints[pointIdx]) {
        useA = !useA;
        pointIdx++;
      }
      const src = useA ? dnaA[i] : dnaB[i];
      child.push({ x: src.x, y: src.y });
    }

    return child;
  },

  // --- Adaptive Mutation ---
  // Higher mutation early on (exploration), lower when converging (exploitation).
  // Also supports Gaussian perturbation instead of fully random replacement.
  mutate(dna, baseMutationRate, maxForce, generation) {
    // Adaptive rate: starts higher, decays with generations
    const adaptiveRate = baseMutationRate * Math.max(0.3, 1.0 - generation * 0.005);

    for (let i = 0; i < dna.length; i++) {
      if (Math.random() < adaptiveRate) {
        if (Math.random() < 0.6) {
          // Gaussian perturbation — nudge existing gene
          dna[i].x += (Math.random() - 0.5) * maxForce * 0.8;
          dna[i].y += (Math.random() - 0.5) * maxForce * 0.8;
          // Clamp
          dna[i].x = Math.max(-maxForce, Math.min(maxForce, dna[i].x));
          dna[i].y = Math.max(-maxForce, Math.min(maxForce, dna[i].y));
        } else {
          // Full random reset
          dna[i] = {
            x: (Math.random() - 0.5) * maxForce * 2,
            y: (Math.random() - 0.5) * maxForce * 2
          };
        }
      }
    }
    return dna;
  },

  // --- Next Generation ---
  nextGeneration(drones, config) {
    // 1. Calculate fitness
    const fitnesses = drones.map(d => d.calculateFitness());
    const maxFitness = Math.max(...fitnesses);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const reached = drones.filter(d => d.reached).length;

    // 2. Sort by fitness (descending) for elitism
    const sorted = [...drones].sort((a, b) => b.fitness - a.fitness);

    // 3. Create new population
    const newDrones = [];

    // Elitism: preserve top N
    const eliteCount = Math.min(config.eliteCount, drones.length);
    for (let i = 0; i < eliteCount; i++) {
      const eliteDNA = sorted[i].dna.map(g => ({ x: g.x, y: g.y }));
      newDrones.push(new Drone(eliteDNA, config));
    }

    // Fill remainder with tournament selection + crossover + mutation
    while (newDrones.length < config.numDrones) {
      const parentA = this.tournamentSelect(drones);
      const parentB = this.tournamentSelect(drones);
      let childDNA = this.crossover(parentA.dna, parentB.dna);
      childDNA = this.mutate(childDNA, config.mutationRate, config.maxForce, config.generation);
      newDrones.push(new Drone(childDNA, config));
    }

    // Mark the best drone
    newDrones[0].isBest = true;

    return {
      drones: newDrones,
      stats: {
        maxFitness: maxFitness,
        avgFitness: avgFitness,
        reached: reached
      }
    };
  },

  // --- Initialize Population ---
  initPopulation(config) {
    const drones = [];
    for (let i = 0; i < config.numDrones; i++) {
      drones.push(new Drone(null, config));
    }
    // Mark first as "best" placeholder
    if (drones.length > 0) drones[0].isBest = true;
    return drones;
  }
};