  // UI Functions
    function setPlacingMode(mode) {
      placing = mode;
      document.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      document.getElementById(mode + '-btn').classList.add('active');
    }

    function clearWalls() {
      walls = [];
    }

    function resetGA() {
      initializePopulation();
      generation = 1;
      document.getElementById('generation').textContent = generation;
      document.getElementById('best-fitness').textContent = '0.00';
      document.getElementById('successful').textContent = '0/50';
    }

    function togglePause() {
      isPaused = !isPaused;
    }