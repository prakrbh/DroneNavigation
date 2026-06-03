# Evolutionary Drone Navigation Simulator

An interactive, browser-based simulation that demonstrates how autonomous agents learn obstacle navigation using **Genetic Algorithms** and evolutionary optimization — rendered in real-time on an HTML5 Canvas.

A population of drones attempts to reach a target while avoiding user-created obstacles. Instead of being manually programmed with paths, the drones **evolve** their movement behavior over successive generations through tournament selection, multi-point crossover, adaptive mutation, and elitism. As generations progress, efficient navigation strategies naturally emerge.

---

## Features

- **Real-time swarm simulation** — watch 10–200 drones evolve simultaneously
- **Interactive obstacle editor** — draw rectangular walls by clicking and dragging
- **Repositionable start & target** — click to place them anywhere on the canvas
- **Live GA parameter tuning** — adjust population size, mutation rate, lifespan, thrust force, and elite count mid-run via sliders
- **Simulation speed control** — 1×, 2×, 5×, and 10× speed multipliers
- **Fitness chart** — real-time line graph plotting best and average fitness over generations
- **Generation log** — scrollable history of every generation's results
- **HiDPI / Retina support** — canvas renders at native device pixel ratio
- **Dark glassmorphism UI** — polished sidebar with Inter and JetBrains Mono typography

---

## How It Works

### 1. DNA Encoding

Each drone carries a **DNA sequence** — an array of 2D force vectors, one per simulation frame:

```js
DNA = [
  { x: +0.12, y: -0.08 },   // frame 0: apply this acceleration
  { x: -0.05, y: +0.22 },   // frame 1
  { x: +0.30, y: +0.01 },   // frame 2
  ...                         // one entry per frame in the lifespan
]
```

The length of the DNA equals the **lifespan** parameter (default: 400 frames). A newly created drone receives either random DNA or DNA inherited from its parents via crossover.

### 2. Physics Model

At every simulation frame, the drone's motion is updated using Newtonian mechanics:

```
acceleration = DNA[currentStep]
velocity    += acceleration
velocity     = clamp(velocity, maxSpeed)    // maxSpeed = 5 units/frame
position    += velocity
```

This produces:

- **Momentum** — drones don't stop instantly; they carry velocity between frames
- **Inertia** — changing direction requires counteracting existing velocity
- **Smooth trajectories** — the combination of accumulated velocity and per-frame forces creates curved, realistic paths
- **Non-linear navigation** — drones can orbit, spiral, or arc around obstacles

### 3. Collision Detection

Each drone has a radius of 3.5 pixels. Collisions are checked against:

- **Rectangular walls** — axis-aligned bounding box (AABB) check with wall normalization (handles negative width/height from any drag direction)
- **Canvas boundaries** — the drone crashes if it leaves the visible area

A crashed drone stops moving and receives a fitness penalty.

### 4. Fitness Function

Fitness evaluation determines which drones survive to reproduce. The function uses an **inverse-square distance reward** to heavily incentivize getting close to the target:

```
if drone reached the target:
    fitness = 10,000 + (lifespan − steps_taken) × 50
else:
    normalizedDistance = distance_to_target / diagonal_of_canvas
    distanceFitness   = 1 / (normalizedDistance² + 0.001)
    crashPenalty      = 0.3 if crashed, else 1.0
    survivalBonus     = steps_survived × 2  (only if not crashed)
    obstaclePenalty   = Σ max(0, 40 − dist_to_wall_center) × 0.5

    fitness = (distanceFitness + survivalBonus) × crashPenalty − obstaclePenalty
    fitness = max(0.1, fitness)
```

**Key design choices:**

| Component | Purpose |
|---|---|
| Inverse-square distance | Rewards getting *very* close exponentially more than getting somewhat close — creates strong gradient toward target |
| Step efficiency bonus (×50) | Among drones that reach the target, faster paths are strongly preferred |
| Crash penalty (0.3× multiplier) | Crashed drones still contribute some genetic material, but are heavily down-weighted |
| Survival bonus | Drones that survive longer without crashing get a small linear reward |
| Obstacle proximity penalty | Drones that linger near walls lose fitness — encourages cleaner paths with clearance |
| Fitness floor (0.1) | Prevents zero-fitness drones from being completely excluded from selection |

---

## Genetic Algorithm

### Selection: Tournament Selection (k = 5)

For each child in the new generation, **5 random drones** are sampled from the population. The one with the highest fitness wins and becomes a parent:

```
function tournamentSelect(population, k=5):
    best = null
    repeat k times:
        candidate = random drone from population
        if candidate.fitness > best.fitness:
            best = candidate
    return best
```

**Why tournament over roulette wheel:**
- More robust to fitness scaling — doesn't require normalization
- Adjustable selection pressure by changing `k`
- Handles negative or very large fitness ranges gracefully
- `O(k)` per selection vs. `O(n)` for roulette wheel with mating pool construction

### Crossover: Multi-Point Crossover (2 split points)

Two parents produce a child by splitting their DNA at **2 random points** and alternating segments:

```
Parent A: [A₀ A₁ A₂ | A₃ A₄ A₅ | A₆ A₇ A₈]
Parent B: [B₀ B₁ B₂ | B₃ B₄ B₅ | B₆ B₇ B₈]
                    ↑ point 1    ↑ point 2

Child:    [A₀ A₁ A₂ | B₃ B₄ B₅ | A₆ A₇ A₈]
```

**Why multi-point over uniform random:**
- Preserves **contiguous gene sequences** — if a parent has a good movement pattern from frame 50–100, those genes stay together as a block
- Uniform crossover (50/50 per gene) breaks apart any sequential patterns, making convergence harder
- 2 crossover points balance exploration and preservation

### Mutation: Adaptive Rate with Gaussian Perturbation

The mutation rate **decays over generations**, balancing exploration (early) and exploitation (late):

```
effectiveRate = baseMutationRate × max(0.3, 1.0 − generation × 0.005)
```

For each gene selected for mutation:

- **60% chance → Gaussian perturbation** — the existing force vector is nudged by a small random offset, then clamped to `[-maxForce, +maxForce]`
- **40% chance → Full random reset** — the gene is replaced with a completely new random force vector

```
if random() < 0.6:
    gene.x += random(-0.5, 0.5) × maxForce × 0.8
    gene.y += random(-0.5, 0.5) × maxForce × 0.8
    gene = clamp(gene, -maxForce, +maxForce)
else:
    gene = { x: random(-maxForce, +maxForce), y: random(-maxForce, +maxForce) }
```

**Why adaptive + Gaussian:**
- Early generations have high mutation → broad search of the solution space
- Late generations have low mutation → fine-tune already-good solutions
- Gaussian perturbation makes small adjustments to promising genes instead of destroying them
- The 40% full-reset component maintains some randomness to escape local optima

### Elitism: Top-N Preservation

The **top N drones** (configurable, default 3) survive unchanged into the next generation. Their DNA is deep-copied to prevent reference issues.

This ensures:
- The best solution found so far is **never lost**
- Fitness is monotonically non-decreasing across generations
- The "best drone" is visually highlighted with a gold trail and glow

---

## Configurable Parameters

All parameters can be adjusted in real-time via the sidebar sliders:

| Parameter | Range | Default | Effect |
|---|---|---|---|
| Population | 10 – 200 | 60 | Number of drones per generation |
| Mutation Rate | 0.5% – 15% | 2% | Base probability of each gene mutating |
| Lifespan | 100 – 800 | 400 | Frames per generation (DNA length) |
| Max Force | 0.05 – 1.0 | 0.30 | Maximum acceleration magnitude per frame |
| Elite Count | 1 – 10 | 3 | Number of top drones preserved unchanged |

Changing **Population** or **Lifespan** takes effect on the next reset. Changing **Mutation Rate**, **Max Force**, or **Elite Count** takes effect on the next generation.

---

## Project Structure

```
DroneNavigation/
├── index.html              # App shell — sidebar layout, sliders, chart, canvas
├── styles/
│   └── style.css           # Dark glassmorphism theme, responsive layout
└── scripts/
    ├── drone.js            # Drone class — physics, collision, fitness, rendering
    ├── genetic.js          # GA engine — selection, crossover, mutation, elitism
    ├── ui.js               # UI controller — slider bindings, chart, log, stats
    └── main.js             # Simulation controller — loop, canvas, mouse input
```

### Architecture

The codebase is organized into three singleton objects with no global state:

| Object | Responsibility |
|---|---|
| `SIM` | Simulation state, animation loop, canvas rendering, mouse interaction |
| `GA` | Pure genetic algorithm operations — stateless functions for selection, crossover, mutation |
| `UI` | DOM bindings, stats display, fitness chart rendering, generation log |

**Data flow:**

```
SIM.animate()
  └─ SIM.step()          — updates all drones (physics + collision)
       └─ SIM.evolve()   — called when frameCount >= lifespan
            ├─ GA.nextGeneration(drones, config)
            │    ├─ drone.calculateFitness()   — for each drone
            │    ├─ GA.tournamentSelect()       — pick parents
            │    ├─ GA.crossover()              — produce child DNA
            │    └─ GA.mutate()                 — mutate child DNA
            └─ UI.updateStats() / UI.recordFitness() / UI.logGeneration()
```

---

## Controls

| Action | Description |
|---|---|
| 🧱 **Wall** tool | Click & drag on canvas to draw rectangular obstacles |
| 🚀 **Start** tool | Click on canvas to reposition the drone spawn point |
| 🎯 **Target** tool | Click on canvas to reposition the goal |
| 🗑️ **Clear Walls** | Remove all obstacles from the environment |
| 🔄 **Reset GA** | Restart evolution from generation 1 with fresh random drones |
| ⏸️ **Pause / Play** | Pause or resume the simulation |
| **Speed buttons** | Run the simulation at 1×, 2×, 5×, or 10× speed |
| **Sliders** | Adjust GA parameters in real-time (see table above) |

---

## Rendering Details

### Canvas

- **Dark background** with a subtle 40px grid for spatial reference
- **HiDPI aware** — renders at `window.devicePixelRatio` for crisp output on Retina displays
- **Walls** — rendered with translucent red fill (`rgba(239, 68, 68, 0.15)`) and a red border with soft glow
- **Start node** — blue circle with animated pulsing glow rings
- **Target node** — amber circle with animated pulsing glow rings

### Drones

| State | Color | Trail |
|---|---|---|
| Active | Indigo (`#6366f1`) with glow | Faint indigo trail (last 80 positions) |
| Reached target | Green (`#22c55e`) with glow | Green trail |
| Crashed | Dim grey (`rgba(100, 116, 139, 0.35)`) | No trail |
| Best of generation | Gold (`#f59e0b`) with bright glow | Gold trail, larger radius |

### Fitness Chart

A dual-line chart plotting:
- **Green line** — best fitness per generation
- **Indigo line** — average fitness per generation

Both lines include gradient fills. The chart auto-scales to the data range and retains the last 100 generations.

---

## How to Run

### Option 1 — Open Directly

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).

### Option 2 — Local Server

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code
# Use the Live Server extension
```

Then navigate to `http://localhost:8080`.

---

## Evolution Behavior

### Early Generations (1–10)

- Drones move in random, erratic patterns
- Most crash into walls or boundaries within the first few frames
- Fitness values are low (typically 100–500)
- No clear directional preference

### Mid Generations (10–50)

- Population begins to orient toward the target
- Some drones survive longer and reach proximity
- A few may reach the target, causing a fitness spike
- Mutation explores variations of partially successful paths

### Late Generations (50+)

- Majority of drones navigate around obstacles
- Paths become smooth and efficient
- Convergence around 1–3 dominant path strategies
- Best fitness stabilizes near the theoretical maximum
- Adaptive mutation rate drops, preserving refined solutions

---

## Technologies

- **JavaScript (ES6+)** — classes, arrow functions, destructuring, template literals
- **HTML5 Canvas API** — 2D rendering context with shadow effects, gradients, arcs
- **CSS3** — custom properties, backdrop-filter, grid, flexbox, animations
- **Google Fonts** — Inter (UI), JetBrains Mono (numeric displays)

No external libraries or frameworks. Zero build dependencies. Pure vanilla web.

---

## License

This project is open for experimentation and educational purposes.