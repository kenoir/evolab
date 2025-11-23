# Agent Instructions

This project is a Next.js migration of a biological simulation game (EvoLab).

## Architecture
- **Game Engine**: `lib/simulation/GameEngine.ts`
  - Encapsulates all simulation logic (physics, grid, rendering).
  - Uses **Structure of Arrays (SoA)** (`Float32Array`) for high performance.
  - Manages its own `requestAnimationFrame` loop.
  - Directly updates DOM elements for stats (FPS, Population) via refs to avoid React render overhead.

- **UI Components**: `components/Game/`
  - `GameCanvas.tsx`: Main entry point. Initializes `GameEngine` in a `useEffect`. Handles input events.
  - `StatsPanel.tsx`: Renders the stats card. Uses `forwardRef` or ref props to allow the engine to update values.
  - `ControlsPanel.tsx`: Renders the configuration controls. Calls methods on the engine instance.

## Development Guidelines
1.  **Performance First**: The simulation runs at 60 FPS. Avoid doing heavy work in React render cycles.
2.  **Direct DOM Updates**: For high-frequency data (FPS, entity counts), pass HTML refs to `GameEngine` and update `innerText`.
3.  **Canvas API**: All rendering happens in `GameEngine.draw()`.
4.  **Testing**: Use `npm test`. Tests mock the Canvas API to verify engine logic.

## Verification Strategy
To verify the application works correctly without a browser:
1.  **Run Tests**: `npm test` runs both unit tests (GameEngine logic) and integration tests (App rendering).
2.  **Local Development**:
    - The app uses a conditional `basePath` in `next.config.ts`.
    - **Development**: Served at `/` (e.g., `http://localhost:3000`).
    - **Production**: Served at `/evolab` (for GitHub Pages).
    - If you encounter 404s locally, ensure you are visiting the root `/` and not `/evolab`.

## State Management
- **Simulation State**: Held in `GameEngine` (positions, energy, etc.).
- **Configuration**: Held in `GameEngine.config`.
- **React State**: Only used for UI visibility (e.g., collapsing panels) or low-frequency updates.
