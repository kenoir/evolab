# EvoLab

An evolution game (barely) ...

**Live Demo:** [https://kenoir.github.io/evolab/](https://kenoir.github.io/evolab/)

## Features
- **Evolutionary Simulation**: Organisms evolve traits (speed, size, sense) over generations.
- **High Performance**: Uses Structure of Arrays (SoA) and spatial hashing for efficient collision detection.
- **Interactive**: Zoom, pan, and spawn creatures with touch/mouse.
- **Next.js Integration**: Wrapped in a modern React application structure.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Run Tests**:
    ```bash
    npm test
    ```

## Architecture
The project separates the high-performance game loop from the React UI.
- `lib/simulation/GameEngine.ts`: The core simulation logic.
- `components/Game/`: React UI components.

See `AGENT_INSTRUCTIONS.md` for more details on the codebase structure.

## Deployment
This project is configured for static export to GitHub Pages.


## CI/CD
- **Tests**: Runs on every push and pull request via GitHub Actions.
- **Deployment**: Automatically deploys to GitHub Pages on push to `main`.

