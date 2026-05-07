# Evolutionary Drone Navigation Simulation

An interactive browser-based simulation that demonstrates how autonomous agents can learn obstacle navigation using Genetic Algorithms and evolutionary optimization.

The project simulates a population of drones attempting to reach a target while avoiding user-created obstacles. Instead of being manually programmed with paths, the drones evolve their movement behavior over generations through mutation, crossover, fitness-based selection, and survival of the fittest.

As generations progress, successful movement strategies naturally emerge, allowing the drone population to discover increasingly efficient paths to the target.

---

## Demo Overview

The simulation begins with drones moving randomly across the environment.  
Most early drones crash into walls or fail to reach the target.

Over time:

- successful drones receive higher fitness scores
- effective movement patterns survive
- poor strategies disappear
- future generations inherit successful traits

Eventually, the population converges toward optimized navigation behavior.

This project visualizes core concepts from:

- Genetic Algorithms
- Evolutionary Computing
- Autonomous Navigation
- Agent-Based Simulation
- Artificial Intelligence
- Physics-Based Motion Systems

---

## Core Concepts

### Genetic Algorithm

Each drone contains a DNA sequence representing movement forces applied over time.

Instead of storing exact positions, the DNA stores acceleration vectors:

```js
[
  { x: forceX1, y: forceY1 },
  { x: forceX2, y: forceY2 },
  ...
]
```

At every frame:

1. A force vector is applied
2. Velocity changes according to acceleration
3. Position changes according to velocity

This creates smooth and physically consistent movement with momentum and inertia.

The simulation evolves these movement instructions using:

- Fitness-based selection
- Random mutation
- DNA crossover
- Elitism (best agent preservation)

---

## Features

- Real-time drone swarm simulation
- Interactive obstacle placement
- Start and target positioning
- Physics-inspired movement system
- Genetic algorithm evolution
- Dynamic fitness evaluation
- Selection and crossover mechanics
- Mutation-based exploration
- Elitism for preserving optimal solutions
- Visual generation statistics
- Responsive HTML5 Canvas rendering

---

## Simulation Mechanics

### Population

A population of drones is initialized with random DNA.

```js
NUM_DRONES = 50
```

Each drone attempts to reach the target during its lifetime.

---

### DNA and Motion

Drone DNA contains force vectors that influence acceleration.

Motion is computed using:

```text
Acceleration → Velocity → Position
```

This produces:

- smooth trajectories
- momentum
- realistic turning behavior
- non-linear movement patterns

---

### Fitness Function

Drones are rewarded for:

- reaching the target
- reaching quickly
- surviving longer
- getting closer to the goal

Drones are penalized for:

- crashing into obstacles
- leaving boundaries
- inefficient navigation

---

### Selection

After each generation:

1. Fitness scores are calculated
2. High-fitness drones gain higher reproduction probability
3. New drones are generated using crossover and mutation
4. The best drone survives unchanged into the next generation

This allows useful behaviors to accumulate over time.

---

## Interactive Environment

The simulation environment is fully interactive.

Users can:

- Draw walls and obstacles
- Change drone spawn position
- Move target position
- Pause/resume evolution
- Reset generations

The evolving population adapts dynamically to the modified environment.

---

## Project Structure

```text
Drone_navig/
│
├── index.html
│
├── styles/
│   └── style.css
│
└── scripts/
    ├── main.js
    ├── drone.js
    ├── genetic.js
    └── ui.js
```

---

## File Responsibilities

### `drone.js`

Handles:

- drone physics
- velocity and acceleration
- collision detection
- fitness calculation
- rendering logic

---

### `genetic.js`

Implements:

- population evolution
- selection
- crossover
- mutation
- elitism
- next-generation creation

---

### `main.js`

Controls:

- simulation loop
- canvas rendering
- environment state
- animation lifecycle
- user interactions

---

### `ui.js`

Handles:

- UI controls
- pause/play
- resetting
- obstacle tools

---

### `style.css`

Defines:

- visual styling
- responsive UI
- gradients
- control panels
- simulation appearance

---

## Technologies Used

- JavaScript
- HTML5 Canvas
- CSS3
- Genetic Algorithms
- Evolutionary Optimization
- Real-Time Rendering

---

## How to Run

### Option 1 — Open Directly

Simply open:

```text
index.html
```

in a browser.

---

### Option 2 — Using VS Code Live Server

Run a local development server for smoother performance and hot reload support.

---

## Controls

| Action | Description |
|---|---|
| Wall Tool | Draw obstacles |
| Start Tool | Set drone spawn position |
| Target Tool | Set destination |
| Clear Walls | Remove all obstacles |
| Reset GA | Restart evolution |
| Pause/Play | Pause or resume simulation |

---

## Motivation

This project was built to explore how evolutionary systems can produce intelligent-looking navigation behavior from simple local rules.

The goal was not only to implement a Genetic Algorithm, but also to better understand:

- emergent behavior
- optimization systems
- real-time simulation
- agent-based environments
- physics-driven movement
- interactive visualization systems

---

## Future Improvements

Potential extensions include:

- obstacle-aware mutation
- path memory
- multi-objective fitness
- dynamic obstacles
- neural-network-based agents
- reinforcement learning hybrids
- generation replay system
- path heatmaps
- adjustable simulation parameters

---

## Sample Evolution Behavior

Early generations:

- random movement
- heavy collisions
- poor target acquisition

Later generations:

- smoother trajectories
- obstacle avoidance
- converging optimal paths
- efficient navigation behavior

---

## License

This project is open for experimentation and educational purposes.