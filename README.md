# Evolutionary Drone Navigation Simulator

An interactive, browser-based simulation that demonstrates how autonomous agents learn obstacle navigation using **Genetic Algorithms** and evolutionary optimization — rendered in real-time on an HTML5 Canvas.

A population of drones attempts to reach a target while avoiding user-created obstacles. Instead of being manually programmed with paths, the drones **evolve** their movement behavior over successive generations through tournament selection, multi-point crossover, adaptive mutation, and elitism. As generations progress, efficient navigation strategies naturally emerge from pure randomness.

---

## Table of Contents

- [Features](#features)
- [How It Works — The Complete Pipeline](#how-it-works--the-complete-pipeline)
  - [1. DNA Encoding](#1-dna-encoding)
  - [2. Physics Model](#2-physics-model)
  - [3. Collision Detection](#3-collision-detection)
  - [4. Fitness Function](#4-fitness-function)
- [Genetic Algorithm — In Depth](#genetic-algorithm--in-depth)
  - [Overview of the Evolutionary Loop](#overview-of-the-evolutionary-loop)
  - [Selection: Tournament Selection](#selection-tournament-selection-k--5)
  - [Crossover: Multi-Point Crossover](#crossover-multi-point-crossover-2-split-points)
  - [Mutation: Adaptive Rate with Gaussian Perturbation](#mutation-adaptive-rate-with-gaussian-perturbation)
  - [Elitism: Top-N Preservation](#elitism-top-n-preservation)
- [Configurable Parameters](#configurable-parameters)
- [Project Structure](#project-structure)
- [Controls](#controls)
- [Rendering & Visual Design](#rendering--visual-design)
- [Evolution Behavior Timeline](#evolution-behavior-timeline)
- [Technologies](#technologies)
- [How to Run](#how-to-run)
- [License](#license)

---

## Features

- **Real-time swarm simulation** — watch 10–200 drones evolve simultaneously on a live canvas
- **Interactive obstacle editor** — draw rectangular walls by clicking and dragging anywhere
- **Repositionable start & target** — click to place them at any position on the canvas
- **Live GA parameter tuning** — adjust population size, mutation rate, lifespan, thrust force, and elite count mid-run via sliders
- **Simulation speed control** — 1×, 2×, 5×, 10×, 20×, and 100× speed multipliers for fast-forwarding evolution
- **Fitness chart** — real-time dual-line graph plotting best fitness and average fitness over generations
- **Generation log** — scrollable history panel recording every generation's best fitness and success count
- **Live statistics** — generation counter, best fitness, average fitness, reached count, and generation progress bar
- **HiDPI / Retina support** — canvas renders at the native device pixel ratio for crisp output
- **Dark glassmorphism UI** — polished sidebar with Inter and JetBrains Mono typography, subtle animations, and a premium dark color scheme
- **Zero dependencies** — pure vanilla HTML, CSS, and JavaScript; no frameworks, no build tools, no npm

---

## How It Works — The Complete Pipeline

### 1. DNA Encoding

Every drone in the simulation carries a **DNA sequence**. This DNA is not a traditional biological encoding — it is an ordered array of 2D acceleration vectors, one per simulation frame. The length of this array equals the drone's **lifespan** (configurable from 100 to 10,000 frames).

```js
// Each drone's DNA is an array of force vectors
DNA = [
  { x: +0.12, y: -0.08 },   // frame 0: apply this acceleration
  { x: -0.05, y: +0.22 },   // frame 1: apply this acceleration
  { x: +0.30, y: +0.01 },   // frame 2: apply this acceleration
  ...                         // continues for `lifespan` entries
]
```

**Key insight:** The DNA does **not** encode positions or waypoints. It encodes *forces*. This means the drone's actual path emerges from the cumulative effect of all previous forces — creating complex, curved trajectories from simple per-frame instructions. Two drones with slightly different DNA will follow noticeably different paths, especially as differences compound over hundreds of frames.

When a new drone is created without parents (generation 1), each gene is initialized with random values:

```js
gene.x = (Math.random() - 0.5) × maxForce × 2   // range: [-maxForce, +maxForce]
gene.y = (Math.random() - 0.5) × maxForce × 2   // range: [-maxForce, +maxForce]
```

### 2. Physics Model

At every simulation frame, the drone's motion is updated using a simplified **Newtonian mechanics** model. There are three state variables: position, velocity, and acceleration.

```
Step 1:  acceleration ← DNA[currentStep]              // read force from DNA
Step 2:  velocity     ← velocity + acceleration        // integrate acceleration
Step 3:  velocity     ← clamp(velocity, maxSpeed)      // enforce speed limit (5 units/frame)
Step 4:  position     ← position + velocity            // integrate velocity
Step 5:  currentStep  ← currentStep + 1                // advance to next gene
```

This produces several important physical behaviors:

| Behavior | Cause |
|---|---|
| **Momentum** | Velocity persists between frames; the drone doesn't stop unless opposing forces are applied |
| **Inertia** | Changing direction requires multiple frames of counter-force to overcome existing velocity |
| **Smooth curves** | Gradual velocity changes create arcs rather than sharp turns |
| **Overshoot** | A drone moving fast toward a target can overshoot it if it doesn't apply braking forces early enough |
| **Emergent complexity** | Simple per-frame force vectors compound into sophisticated flight paths |

The **speed limit** (`maxSpeed = 5 units/frame`) prevents drones from accumulating infinite velocity. When the velocity magnitude exceeds `maxSpeed`, the velocity vector is normalized and scaled back down:

```js
speed = √(vel.x² + vel.y²)
if (speed > maxSpeed) {
  vel.x = (vel.x / speed) × maxSpeed
  vel.y = (vel.y / speed) × maxSpeed
}
```

### 3. Collision Detection

Each drone is modeled as a circle with radius `r = 3.5 pixels`. Two types of collisions are checked every frame:

#### Wall Collisions (AABB)

Walls are axis-aligned rectangles. The collision check handles walls drawn in any direction (negative width/height) by normalizing the rectangle first:

```js
// Normalize wall bounds (handles drag in any direction)
wallLeft   = min(wall.x, wall.x + wall.w)
wallTop    = min(wall.y, wall.y + wall.h)
wallWidth  = abs(wall.w)
wallHeight = abs(wall.h)

// Circle-vs-AABB collision
collision = (drone.x + r > wallLeft)       AND
            (drone.x - r < wallLeft + wallWidth) AND
            (drone.y + r > wallTop)        AND
            (drone.y - r < wallTop + wallHeight)
```

#### Boundary Collisions

The drone crashes if any part of its circular body exits the visible canvas:

```js
collision = (drone.x < r)              OR    // left edge
            (drone.x > canvasWidth - r)  OR    // right edge
            (drone.y < r)              OR    // top edge
            (drone.y > canvasHeight - r)       // bottom edge
```

When a collision is detected, the drone's `crashed` flag is set to `true` and it stops updating. Crashed drones remain visible (dimmed) but no longer move.

### 4. Fitness Function

The fitness function is the **most critical component** of the genetic algorithm. It defines what "good" means, and the entire evolutionary process optimizes toward it. A poorly designed fitness function leads to stagnation or convergence on suboptimal behavior.

This simulator uses a **multi-component fitness function** with five distinct terms:

#### Case 1: Drone reached the target

```
fitness = 10,000 + (lifespan − steps_taken) × 50
```

- The base reward of **10,000** ensures any drone that reaches the target dominates selection over drones that didn't
- The **efficiency bonus** (`× 50 per saved step`) creates strong selective pressure for faster paths among successful drones
- Example: At lifespan = 400, a drone reaching in 200 steps gets `10,000 + 200 × 50 = 20,000`, while one reaching in 350 steps gets `10,000 + 50 × 50 = 12,500`

#### Case 2: Drone did NOT reach the target

```
normalizedDist = distance_to_target / canvas_diagonal
distanceFitness = 1 / (normalizedDist² + 0.001)
crashPenalty    = 0.3 if crashed, else 1.0
survivalBonus   = steps_survived × 2 (only if not crashed)
obstaclePenalty = Σ max(0, 40 − distance_to_wall_center) × 0.5

fitness = max(0.1, (distanceFitness + survivalBonus) × crashPenalty − obstaclePenalty)
```

Each component serves a specific purpose:

| Component | Formula | Purpose | Effect on Evolution |
|---|---|---|---|
| **Inverse-square distance** | `1 / (d² + ε)` | Rewards proximity to target with exponentially increasing strength | Drones that get *very* close are massively favored over those that are "somewhat close". The `+ 0.001` term prevents division by zero. A drone at 10% of max distance gets 100× the reward of one at 100% distance. |
| **Crash penalty** | `× 0.3` | Reduces fitness of crashed drones to 30% | Crashed drones still contribute some genetic material (they may have had a good initial trajectory), but are heavily down-weighted in selection. |
| **Survival bonus** | `steps × 2` | Linearly rewards staying alive longer | In early generations when no drone reaches the target, this creates selective pressure for drones that at least survive longer and explore more space. |
| **Obstacle proximity penalty** | `Σ (40 − d_wall) × 0.5` | Penalizes drones lingering within 40px of wall centers | Encourages evolved paths that maintain clearance from obstacles, producing cleaner trajectories. |
| **Fitness floor** | `max(0.1, ...)` | Prevents any drone from having zero or negative fitness | Ensures every drone has a non-zero chance of being selected, maintaining genetic diversity. |

**Why inverse-square instead of linear?**

Linear distance fitness (`1 - d/maxD`) creates a nearly flat gradient when far from the target — a drone at 80% distance and one at 90% distance have almost the same fitness. Inverse-square creates a steep gradient near the target, providing a strong signal for the GA to exploit once any drone gets close.

---

## Genetic Algorithm — In Depth

### Overview of the Evolutionary Loop

Each generation follows this cycle:

```
┌─────────────────────────────────────────────────────┐
│  1. INITIALIZE                                      │
│     Create population of N drones with DNA          │
│     (random for gen 1, inherited for gen 2+)        │
│                                                     │
│  2. SIMULATE                                        │
│     Run all drones for `lifespan` frames            │
│     Apply DNA forces → physics → collision          │
│                                                     │
│  3. EVALUATE                                        │
│     Calculate fitness for every drone               │
│     Record stats (best, avg, reached count)         │
│                                                     │
│  4. SELECT + REPRODUCE                              │
│     a. Copy top-N elites unchanged                  │
│     b. For remaining slots:                         │
│        i.   Tournament-select Parent A              │
│        ii.  Tournament-select Parent B              │
│        iii. Crossover A × B → Child DNA             │
│        iv.  Mutate Child DNA (adaptive rate)        │
│     c. Replace old population with new              │
│                                                     │
│  5. REPEAT from step 2                              │
└─────────────────────────────────────────────────────┘
```

### Selection: Tournament Selection (k = 5)

For each child in the new generation, **5 random drones** are sampled from the current population. The one with the highest fitness becomes a parent. This is repeated independently for Parent A and Parent B.

```
function tournamentSelect(population, k = 5):
    best ← null
    repeat k times:
        candidate ← random drone from population
        if best is null OR candidate.fitness > best.fitness:
            best ← candidate
    return best
```

**Properties of tournament selection:**

| Property | Detail |
|---|---|
| **Selection pressure** | Controlled by `k`. Higher `k` = stronger pressure (more likely to pick the best). `k = 5` with population 60 means roughly the top 20% dominate reproduction. |
| **Computational cost** | `O(k)` per selection — constant time regardless of population size |
| **No normalization needed** | Unlike roulette wheel, doesn't require computing total fitness or building a mating pool |
| **Handles negative fitness** | Works correctly even if some fitness values are negative or zero |
| **Implicit diversity** | Because selection is stochastic, weaker drones still have a chance (they just need to be picked against 4 other weak drones) |

**Why not roulette wheel (fitness-proportional selection)?**

Roulette wheel selection assigns selection probability proportional to fitness. This has several problems:
1. Requires building a mating pool array — `O(N²)` memory in the worst case
2. Extremely sensitive to fitness scaling — one drone with 10× the fitness of others dominates entirely
3. Breaks with negative fitness values
4. Can't easily adjust selection pressure without modifying fitness values directly

### Crossover: Multi-Point Crossover (2 split points)

Two parents produce one child. The DNA arrays are split at **2 randomly chosen points**, and segments alternate between parents:

```
Example with DNA length 9 and split points at positions 3 and 6:

Parent A: [ A₀  A₁  A₂ │ A₃  A₄  A₅ │ A₆  A₇  A₈ ]
Parent B: [ B₀  B₁  B₂ │ B₃  B₄  B₅ │ B₆  B₇  B₈ ]
                        ↑ split 1      ↑ split 2

Child:    [ A₀  A₁  A₂ │ B₃  B₄  B₅ │ A₆  A₇  A₈ ]
           ─── from A ─── ─ from B ── ─── from A ───
```

The split points are selected uniformly at random from `[1, DNA.length - 1)` using a Set to ensure uniqueness.

**Why multi-point crossover over uniform (50/50 per gene)?**

| Approach | Behavior | Problem |
|---|---|---|
| **Uniform crossover** | Each gene independently has 50% chance from either parent | Destroys sequential patterns. If Parent A has a good "turn left, then accelerate" sequence at frames 100–120, uniform crossover will interleave random genes from Parent B into this block, breaking the maneuver. |
| **Single-point crossover** | One split point; head from A, tail from B | Only two possible segment arrangements — limited recombination diversity |
| **Multi-point (2 splits)** | Three alternating segments | Preserves contiguous gene blocks (movement sequences stay intact) while still mixing material from both parents. Best balance of exploitation and exploration. |

### Mutation: Adaptive Rate with Gaussian Perturbation

Mutation introduces random variation to prevent the population from converging prematurely on a suboptimal solution. This implementation uses two key innovations: **adaptive decay** and **dual mutation modes**.

#### Adaptive Decay

The effective mutation rate decreases as generations progress:

```
effectiveRate = baseMutationRate × max(0.3, 1.0 − generation × 0.005)
```

| Generation | Multiplier | Effective rate (base = 2%) | Behavior |
|---|---|---|---|
| 1 | 1.000 | 2.00% | Maximum exploration |
| 20 | 0.900 | 1.80% | High exploration |
| 50 | 0.750 | 1.50% | Balanced |
| 100 | 0.500 | 1.00% | Shifting toward exploitation |
| 140+ | 0.300 | 0.60% | Fine-tuning (floor reached) |

The floor of `0.3×` ensures mutation never drops to zero — some exploration is always maintained to escape local optima.

#### Dual Mutation Modes

When a gene is selected for mutation (based on the adaptive rate), it undergoes one of two operations:

**Mode 1 — Gaussian Perturbation (60% chance):**

```
gene.x += random(-0.5, +0.5) × maxForce × 0.8
gene.y += random(-0.5, +0.5) × maxForce × 0.8
gene.x = clamp(gene.x, -maxForce, +maxForce)
gene.y = clamp(gene.y, -maxForce, +maxForce)
```

This *nudges* the existing gene value by a small random offset. The nudge magnitude is 80% of `maxForce`, meaning the perturbation can be significant but doesn't completely override the original value. This is useful for fine-tuning a trajectory that's already close to optimal — maybe the drone needs to turn slightly earlier, or accelerate a bit harder at a specific point.

**Mode 2 — Full Random Reset (40% chance):**

```
gene.x = random(-maxForce, +maxForce)
gene.y = random(-maxForce, +maxForce)
```

This completely replaces the gene with a new random value. This is a more drastic change that can help escape local optima by introducing entirely new movement patterns at specific frames.

**Why this 60/40 split?**

- In later generations, most of the DNA is already reasonably good. Gaussian perturbation lets the GA make small adjustments without destroying good solutions.
- The 40% full-reset component ensures the population doesn't lose the ability to make large jumps in the search space.

### Elitism: Top-N Preservation

After ranking all drones by fitness (descending), the **top N** (configurable, default 3) are copied unchanged into the next generation. Their DNA is **deep-copied** to prevent reference mutations.

```
sorted = population.sort(by fitness, descending)
for i in 0..eliteCount:
    newPopulation[i] = clone(sorted[i].dna)
```

**Effects of elitism:**

| Property | Impact |
|---|---|
| **Monotonic improvement** | Best fitness never decreases between generations |
| **Solution preservation** | A drone that finds the target is guaranteed to survive into the next generation |
| **Visual continuity** | The "best drone" (rendered in gold) shows the current best solution |
| **Risk of premature convergence** | High elite count can reduce diversity — balanced by mutation and the fitness floor |

The best drone in each generation is visually marked with a gold color and larger radius for easy identification.

---

## Configurable Parameters

All parameters can be adjusted in real-time via the sidebar sliders:

| Parameter | Range | Default | Effect | When Applied |
|---|---|---|---|---|
| **Population** | 10 – 200 | 60 | Number of drones per generation. Higher = more diverse search but slower rendering. | Next reset |
| **Mutation Rate** | 0.5% – 15% | 2% | Base probability of each gene mutating. Higher = more exploration, lower = more exploitation. | Next generation |
| **Lifespan** | 100 – 10,000 | 400 | Frames per generation (= DNA length). Higher = drones can travel farther but take longer per generation. | Next reset |
| **Max Force** | 0.05 – 1.0 | 0.30 | Maximum acceleration magnitude per frame. Higher = more agile drones, lower = smoother/slower movement. | Next generation |
| **Elite Count** | 1 – 10 | 3 | Number of top drones preserved unchanged into next generation. | Next generation |

**Speed Control:**

| Speed | Frames per render | Use case |
|---|---|---|
| 1× | 1 | Watch individual drone movements in detail |
| 2× | 2 | Slightly faster observation |
| 5× | 5 | Good balance of speed and visibility |
| 10× | 10 | Fast-forward through early chaotic generations |
| 20× | 20 | Rapid evolution observation |
| 100× | 100 | Skip to convergence quickly; rendering becomes a blur |

---

## Project Structure

```
DroneNavigation/
├── index.html              # App shell — sidebar layout, sliders, chart canvas, main canvas
├── styles/
│   └── style.css           # Dark glassmorphism theme — CSS custom properties, responsive layout
└── scripts/
    ├── drone.js            # Drone class — physics, collision detection, fitness, trail rendering
    ├── genetic.js          # GA engine — tournament selection, crossover, mutation, elitism
    ├── ui.js               # UI controller — slider bindings, chart drawing, stats, generation log
    └── main.js             # Simulation controller — animation loop, canvas rendering, mouse input
```

### Architecture

The codebase is organized into three singleton objects with no global state:

| Object | File | Responsibility |
|---|---|---|
| `SIM` | `main.js` | Owns the simulation state (drones, walls, config). Runs the animation loop. Handles canvas rendering (background, grid, walls, nodes, drones). Processes mouse input for placement tools. |
| `GA` | `genetic.js` | Pure, stateless functions for genetic operations. Receives the current population and config, returns a new population. No side effects, no DOM access. |
| `UI` | `ui.js` | Manages all DOM interactions. Binds slider inputs to `SIM.config`. Updates stat displays. Renders the fitness chart on a separate canvas. Maintains the generation log. |

**Data flow per generation:**

```
SIM.animate()                          ← requestAnimationFrame loop
  │
  ├─ SIM.step()                        ← called `speed` times per frame
  │    ├─ drone.update()               ← apply DNA force, physics, collision
  │    └─ UI.updateProgress()          ← progress bar
  │
  ├─ SIM.render()                      ← draw canvas (background, grid, walls, nodes, drones)
  │
  └─ SIM.evolve()                      ← triggered when frameCount >= lifespan
       │
       ├─ GA.nextGeneration(drones, config)
       │    ├─ drone.calculateFitness()       ← evaluate each drone
       │    ├─ sort by fitness (descending)   ← for elitism
       │    ├─ copy top-N elites              ← preserve best solutions
       │    └─ for each remaining slot:
       │         ├─ GA.tournamentSelect() → parentA
       │         ├─ GA.tournamentSelect() → parentB
       │         ├─ GA.crossover(A, B)    → childDNA
       │         └─ GA.mutate(childDNA)   → mutated childDNA
       │
       ├─ UI.updateStats(gen, best, avg, reached)
       ├─ UI.logGeneration(gen, best, reached)
       └─ UI.recordFitness(best, avg)         ← updates chart
```

---

## Controls

| Action | Description |
|---|---|
| 🧱 **Wall** tool | Click & drag on canvas to draw rectangular obstacles. Tiny accidental clicks (< 5px) are automatically filtered. |
| 🚀 **Start** tool | Click on canvas to reposition the drone spawn point. Triggers an automatic GA reset. |
| 🎯 **Target** tool | Click on canvas to reposition the goal. Triggers an automatic GA reset. |
| 🗑️ **Clear Walls** | Remove all obstacles from the environment (does not reset the GA). |
| 🔄 **Reset GA** | Restart evolution from generation 1 with fresh random drones. Clears the fitness chart and generation log. |
| ⏸️ **Pause / Play** | Pause or resume the simulation. |
| **Speed buttons** | Run the simulation at 1×, 2×, 5×, 10×, 20×, or 100× speed. |
| **Sliders** | Adjust GA parameters in real-time (see [Configurable Parameters](#configurable-parameters)). |

---

## Rendering & Visual Design

### Canvas Theme

- **Background:** Dark gradient (`#0a0e1a` → `#111827`) with a subtle 40px grid overlay for spatial reference
- **HiDPI:** Renders at `window.devicePixelRatio` for pixel-perfect output on Retina displays
- **Walls:** Translucent red fill (`rgba(239, 68, 68, 0.15)`) with a red border and soft glow shadow — gives obstacles a "danger zone" appearance
- **Start node:** Blue circle (`#3b82f6`) with animated pulsing glow rings that breathe in and out
- **Target node:** Amber circle (`#f59e0b`) with animated pulsing glow rings

### Drone Rendering

Each drone renders differently based on its state:

| State | Body Color | Radius | Shadow/Glow | Trail |
|---|---|---|---|---|
| **Active** | Indigo (`#6366f1`) | 3.5px | Indigo glow (blur 4px) | Faint indigo, last 80 positions |
| **Reached target** | Green (`#22c55e`) | 3.5px | Green glow (blur 6px) | Green trail |
| **Crashed** | Dim grey (`rgba(100, 116, 139, 0.35)`) | 3.5px | None | No trail |
| **Best of generation** | Gold (`#f59e0b`) | 5px | Bright gold glow (blur 10px) | Bold gold trail |

Trails are stored as circular buffers of the last 80 positions and rendered as polylines.

### Fitness Chart

A dual-line chart in the sidebar, plotting:

- **Green line** — best fitness per generation (with green gradient fill)
- **Indigo line** — average fitness per generation (with indigo gradient fill)

The chart auto-scales its Y-axis to the data range, retains the last 100 data points, and renders on a separate canvas with HiDPI support.

### UI Theme

- **Dark glassmorphism** — panels use `backdrop-filter: blur(24px) saturate(1.4)` with semi-transparent backgrounds
- **Typography:** Inter (weights 300–800) for UI, JetBrains Mono for numeric values and code
- **Color palette:** Indigo (`#6366f1`) primary, violet (`#8b5cf6`) secondary, green for success, amber for warnings, red for danger
- **Animations:** Fade-in on sidebar sections, hover transforms on buttons, pulsing glow on canvas nodes

---

## Evolution Behavior Timeline

### Early Generations (1–10)

- Drones move in random, chaotic patterns
- Most crash into walls or canvas boundaries within the first 50–100 frames
- Fitness values are very low (typically 50–500)
- No clear directional preference toward the target
- The fitness chart shows erratic, low values

### Mid Generations (10–50)

- Population begins to orient toward the target
- Some drones survive significantly longer (300+ frames)
- A few lucky drones may reach the target, causing a large fitness spike
- The "best drone" begins to show a recognizable path strategy
- Mutation explores variations of partially successful trajectories
- Average fitness climbs steadily on the chart

### Convergence Generations (50–150)

- Majority of drones navigate around obstacles consistently
- Paths become smooth, efficient, and physically graceful
- Population converges around 1–3 dominant path strategies
- Best fitness approaches or reaches the theoretical maximum (`10,000 + efficiency bonus`)
- Adaptive mutation rate has dropped to near its floor (0.6% at base 2%)
- The fitness chart plateaus — diminishing returns on further evolution

### Post-Convergence (150+)

- Nearly all drones reach the target
- Evolution fine-tunes for step efficiency (shorter paths)
- Very little visual diversity between drones — the population is highly converged
- Occasional mutations may discover marginally better paths
- Consider adding new obstacles to restart the evolutionary pressure

---

## Technologies

| Technology | Usage |
|---|---|
| **JavaScript (ES6+)** | Classes, arrow functions, destructuring, template literals, Set, spread operator |
| **HTML5 Canvas API** | 2D rendering context — arcs, gradients, shadows, polylines, custom drawing |
| **CSS3** | Custom properties (design tokens), `backdrop-filter`, CSS Grid, Flexbox, `@keyframes`, transitions |
| **Google Fonts** | Inter (UI typography), JetBrains Mono (numeric/code displays) |

**No external libraries or frameworks.** No React, no D3, no Chart.js. Zero build dependencies. Zero npm packages. Pure vanilla web — open `index.html` and it runs.

---

## How to Run

### Option 1 — Open Directly

Double-click `index.html` or drag it into any modern browser (Chrome, Firefox, Safari, Edge).

### Option 2 — Local Development Server

```bash
# Python (built-in)
python3 -m http.server 8080

# Node.js (one-liner)
npx serve .

# VS Code
# Install the "Live Server" extension → right-click index.html → "Open with Live Server"
```

Then navigate to `http://localhost:8080`.

### Option 3 — GitHub Pages

Push to a GitHub repository with Pages enabled, and the simulation will be accessible at `https://<username>.github.io/<repo>/`.

---

## License

This project is open for experimentation and educational purposes.