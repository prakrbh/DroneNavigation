 function initializePopulation() {
      drones = Array.from({ length: NUM_DRONES }, () => new Drone());
      frameCount = 0;
    }

    function nextGeneration() {
      // Calculate fitness for all drones
      const fitnesses = drones.map(drone => drone.calculateFitness());
      const maxFitness = Math.max(...fitnesses);
      const totalFitness = fitnesses.reduce((a, b) => a + b, 0);
      
      // Update UI
      document.getElementById('generation').textContent = generation;
      document.getElementById('best-fitness').textContent = maxFitness.toFixed(0);
      
      const successful = drones.filter(d => d.reached).length;
      document.getElementById('successful').textContent = `${successful}/${NUM_DRONES}`;

      // Create mating pool based on fitness (proportional selection)
      const matingPool = [];
      
      // Normalize fitness values to avoid huge numbers
      const normalizedFitnesses = fitnesses.map(f => f / totalFitness);
      
      // Fill mating pool - higher fitness = more copies
      for (let i = 0; i < drones.length; i++) {
        const n = Math.floor(normalizedFitnesses[i] * NUM_DRONES * 100) + 1; // +1 ensures everyone gets at least one chance
        for (let j = 0; j < n; j++) {
          matingPool.push(drones[i]);
        }
      }

      // If mating pool is empty or too small, add some random selections
      if (matingPool.length < NUM_DRONES) {
        for (let i = 0; i < NUM_DRONES; i++) {
          matingPool.push(drones[Math.floor(Math.random() * drones.length)]);
        }
      }

      const newDrones = [];
      
      // Keep the absolute best drone (elitism)
      const bestIndex = fitnesses.indexOf(maxFitness);
      newDrones.push(new Drone([...drones[bestIndex].dna]));

      // Fill rest with crossover and mutation
      for (let i = 1; i < NUM_DRONES; i++) {
        const parentA = matingPool[Math.floor(Math.random() * matingPool.length)];
        const parentB = matingPool[Math.floor(Math.random() * matingPool.length)];
        const childDNA = crossover(parentA.dna, parentB.dna);
        mutate(childDNA);
        newDrones.push(new Drone(childDNA));
      }

      drones = newDrones;
      generation++;
      frameCount = 0;
    }

    function crossover(dnaA, dnaB) {
      const newDNA = [];
      
      for (let i = 0; i < dnaA.length; i++) {
        // Random crossover - each gene has 50% chance from either parent
        if (Math.random() < 0.5) {
          newDNA.push({ x: dnaA[i].x, y: dnaA[i].y });
        } else {
          newDNA.push({ x: dnaB[i].x, y: dnaB[i].y });
        }
      }
      
      return newDNA;
    }

    function mutate(dna) {
      for (let i = 0; i < dna.length; i++) {
        if (Math.random() < MUTATION_RATE) {
          // Completely random new gene
          dna[i] = {
            x: (Math.random() - 0.5) * MAX_FORCE * 2,
            y: (Math.random() - 0.5) * MAX_FORCE * 2
          };
        }
      }
      return dna;
    }