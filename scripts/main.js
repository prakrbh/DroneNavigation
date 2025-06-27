  const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
      canvas.width = window.innerWidth - 20;
      canvas.height = window.innerHeight - 20;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const NUM_DRONES = 50;
    const LIFETIME = 300; // frames per generation
    const MUTATION_RATE = 0.01; // Lower mutation rate
    const MAX_FORCE = 0.3; // Slightly higher force
    
    let frameCount = 0;
    let generation = 1;
    let placing = 'wall';
    let isPaused = false;
    let walls = [];
    let start = { x: 50, y: HEIGHT / 2 };
    let target = { x: WIDTH - 50, y: HEIGHT / 2 };

   

    let drones = [];
    initializePopulation();

   

    function animate() {
      if (!isPaused) {
        // Clear canvas with gradient
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, '#f5f7fa');
        gradient.addColorStop(1, '#c3cfe2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw walls with shadow effect
        ctx.fillStyle = '#37474F';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        for (const wall of walls) {
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        }
        ctx.shadowBlur = 0;

        // Draw start point
        ctx.beginPath();
        ctx.fillStyle = '#2196F3';
        ctx.strokeStyle = '#1976D2';
        ctx.lineWidth = 2;
        ctx.arc(start.x, start.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add start label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START', start.x, start.y + 3);

        // Draw target
        ctx.beginPath();
        ctx.fillStyle = '#FF9800';
        ctx.strokeStyle = '#F57C00';
        ctx.lineWidth = 2;
        ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add target label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET', target.x, target.y + 3);

        // Update and draw drones
        for (const drone of drones) {
          drone.update();
          drone.draw();
        }

        // Update progress bar
        const progress = (frameCount / LIFETIME) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';

        frameCount++;
        if (frameCount >= LIFETIME) {
          nextGeneration();
        }
      }
      
      requestAnimationFrame(animate);
    }

  

    // Mouse interaction
    let drawing = false;
    let currentWall = null;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (placing === 'wall') {
        drawing = true;
        currentWall = { x, y, w: 0, h: 0 };
        walls.push(currentWall);
      } else if (placing === 'start') {
        start = { x, y };
        resetGA();
      } else if (placing === 'target') {
        target = { x, y };
        resetGA();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing || !currentWall) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      currentWall.w = x - currentWall.x;
      currentWall.h = y - currentWall.y;
    });

    canvas.addEventListener('mouseup', () => {
      drawing = false;
      currentWall = null;
    });

    // Start animation
    animate();