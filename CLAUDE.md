# CLAUDE.md - AI Assistant Guide for EvoLab

This document provides comprehensive guidance for AI assistants working on the EvoLab codebase.

## Project Overview

**EvoLab** is a browser-based evolutionary simulation where digital organisms compete for resources, evolve traits through natural selection, and adapt to a dynamic environment. The architecture cleanly separates a high-performance game engine (running outside React) from the React UI layer.

**Live Demo:** https://kenoir.github.io/evolab/

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.3 | React framework (App Router, static export) |
| React | 19.2.0 | UI components |
| TypeScript | 5.x | Type-safe language |
| Tailwind CSS | 4.x | Utility-first styling |
| Jest | 30.2.0 | Unit testing |
| Playwright | 1.56.1 | End-to-end testing |
| Node.js | 20.x | Runtime (see `.nvmrc`) |

## Directory Structure

```
evolab/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout with metadata
│   ├── page.tsx                   # Home page entry point
│   └── globals.css                # Global styles (Tailwind)
│
├── components/Game/               # React UI Components
│   ├── GameCanvas.tsx             # Main component, engine init, input handling
│   ├── StatsPanel.tsx             # Stats display, histograms
│   ├── ControlsPanel.tsx          # Configuration UI, pause/play, save/load
│   └── WelcomeModal.tsx           # Welcome/tutorial modal
│
├── lib/simulation/
│   └── GameEngine.ts              # Core simulation engine (1091 lines)
│
├── __tests__/                     # Jest unit tests
│   ├── GameEngine.test.ts         # Engine initialization, state export/import
│   └── App.test.tsx               # App entry point rendering
│
├── e2e/                           # Playwright E2E tests
│   └── controls.spec.ts           # UI control interactions
│
├── .github/workflows/             # CI/CD pipelines
│   ├── test.yml                   # Test runner on push/PR
│   └── deploy.yml                 # GitHub Pages deployment
│
└── public/                        # Static assets
```

## Architecture

### Performance-First Design

The simulation runs at 60 FPS with thousands of entities. Key architectural decisions:

1. **Game Engine Independence**: `GameEngine.ts` manages its own `requestAnimationFrame` loop outside React's render cycle
2. **Structure of Arrays (SoA)**: Organism data uses typed arrays (`Float32Array`, `Int32Array`) for cache-friendly access
3. **Spatial Hashing**: Grid-based collision detection for O(1) neighbor lookups
4. **Free Lists**: Entity allocation/deallocation without garbage collection
5. **Direct DOM Updates**: Stats (FPS, population) update via refs, bypassing React

### State Management

| State Type | Location | Update Frequency |
|------------|----------|------------------|
| Simulation State | `GameEngine` instance | Every frame |
| Configuration | `GameEngine.config` | User interaction |
| UI Visibility | React `useState` | User interaction |

### Component Communication

```
GameCanvas (useEffect)
  └─> creates GameEngine(canvas, minimap, statsRefs, onFollowChange)
       ├── Engine updates DOM elements directly via statsRefs
       └── Engine calls onFollowChange callback for follow mode state
```

## Key Files

### `lib/simulation/GameEngine.ts`
The core simulation engine. Handles:
- Physics and movement
- Collision detection (spatial grid)
- Genetic algorithms and mutation
- Energy economics
- Canvas rendering
- Save/load (JSON serialization)

**Public API:**
```typescript
// Lifecycle
start(): void              // Begin animation loop
stop(): void               // Pause simulation
init(): void               // Reset world

// Configuration (mutable)
config: GameConfig         // Simulation parameters
simSpeed: number           // Speed multiplier (1-10)
worldSize: number          // World dimension
debugMode: boolean         // Debug rendering
predationActive: boolean   // Enable predation
activeZones: boolean       // Enable radiation zones

// Camera
camera: { x, y, zoom }     // Camera state
clampCamera(): void        // Clamp to bounds
handleKeyDown(code): void  // Input handling
handleKeyUp(code): void

// Interaction
spawnAt(x, y): void        // Spawn food / select organism
toggleFollowMode(bool): void

// Persistence
exportState(): GameState   // Serialize for save
importState(state): void   // Load from save
resize(w, h): void         // Handle canvas resize
```

### `components/Game/GameCanvas.tsx`
Main React component that:
- Initializes the engine in `useEffect`
- Sets up event listeners (keyboard, mouse, touch)
- Manages UI state (pause, ambient mode, follow mode)
- Handles save/load operations

**Client Component**: Marked with `'use client'` directive.

## Development Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (outputs to /out)
npm start            # Start production server

# Testing
npm test             # Run Jest unit tests
npm run test:e2e     # Run Playwright E2E tests

# Linting
npm run lint         # Run ESLint
```

## Testing

### Unit Tests (Jest)
- Location: `__tests__/`
- Environment: jsdom
- Setup: `jest.setup.ts` imports `@testing-library/jest-dom`
- Canvas API is mocked

### E2E Tests (Playwright)
- Location: `e2e/`
- Browser: Chromium
- Auto-starts dev server on localhost:3000
- Tests pause/resume, minimap, UI interactions

### Running Tests
```bash
# Unit tests
npm test

# E2E tests (starts dev server automatically)
npm run test:e2e

# Watch mode for unit tests
npm test -- --watch
```

## Code Conventions

### Naming
- **Components**: PascalCase (`GameCanvas`, `StatsPanel`)
- **Interfaces/Types**: PascalCase (`GameConfig`, `GameState`)
- **Variables**: camelCase (`worldSize`, `activeCount`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_POP`, `HIST_BINS`)

### TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Extensive interface usage for data structures
- Typed arrays for performance-critical data

### React Patterns
- Functional components with hooks
- `useRef` for DOM elements and engine instance
- `useCallback` for memoized handlers
- `useEffect` for initialization and cleanup
- Direct DOM updates for high-frequency stats

### Styling
- Tailwind CSS utilities
- Dark theme: `bg-[#1a1a1a]`, `text-[#e0e0e0]`
- Color-coded stats (blue=speed, red=size, green=sense, purple=storage, cyan=metabolism, yellow=defense)
- Responsive: Controls hidden on mobile (`hidden md:block`)

## Organism Genetics

Each organism has these evolvable traits:
| Trait | Range | Effect |
|-------|-------|--------|
| Speed | 0.5-8 | Movement velocity |
| Size | 4-30 | Body size, affects predation |
| Sense | 20-300 | Detection radius |
| Reproduction | 100-2500 | Energy threshold to reproduce |
| Metabolism | 0.5-3 | Base energy consumption |
| Defense | 0-1 | Radiation resistance |
| Hue | 0-360 | Visual color |

## World Mechanics

- **Toroidal Topology**: World wraps at edges
- **Food Pellets**: Randomly spawn, biased toward radiation zones
- **Radiation Zones**: Circular areas that drift and damage organisms
- **Predation**: Larger organisms (1.2x size advantage) can hunt smaller ones
- **Energy Economics**: Movement costs energy; eating replenishes it
- **Mutation**: Random variations in offspring traits (configurable rate/chance)

## Common Tasks

### Adding a New Organism Trait
1. Add typed array in `GameEngine.ts` constructor
2. Initialize in `spawnOrganism()` with parent inheritance + mutation
3. Apply effect in `physicsStep()`
4. Add histogram in `updateHistograms()` and `GameStatsRefs`
5. Update `exportState()` and `importState()` for persistence
6. Add UI in `StatsPanel.tsx`

### Modifying Simulation Parameters
1. Add to `GameConfig` interface
2. Initialize default in `GameEngine.config`
3. Use in relevant simulation methods
4. Add control in `ControlsPanel.tsx`

### Adding a New UI Control
1. Add state/handler in `GameCanvas.tsx`
2. Pass to `ControlsPanel.tsx` via props
3. Call engine methods in handler

## Build & Deployment

- **Static Export**: Next.js configured with `output: 'export'`
- **Base Path**: `/evolab` in production, `/` in development
- **GitHub Pages**: Automatic deployment via `.github/workflows/deploy.yml`
- **Unoptimized Images**: Required for static export

## Important Notes

1. **Performance First**: Avoid heavy work in React render cycles
2. **Direct DOM Updates**: Use refs for high-frequency data (FPS, counts)
3. **Canvas API**: All rendering happens in `GameEngine.draw()`
4. **No SSR Components**: `GameCanvas` is a client component
5. **Local Development**: Visit `/` not `/evolab` when running locally
6. **Test Mocking**: Canvas API is mocked in Jest tests

## Verification Strategy

To verify the application works correctly without a browser:
1. `npm test` - Runs unit tests (engine logic) and integration tests
2. `npm run test:e2e` - Runs Playwright browser tests
3. `npm run build` - Validates production build succeeds
4. `npm run lint` - Checks for code quality issues
