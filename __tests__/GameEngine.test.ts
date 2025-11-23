import { GameEngine, GameStatsRefs } from '@/lib/simulation/GameEngine';

describe('GameEngine', () => {
    let canvas: HTMLCanvasElement;
    let minimap: HTMLCanvasElement;
    let statsRefs: GameStatsRefs;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        minimap = document.createElement('canvas');
        statsRefs = {
            fps: document.createElement('div'),
            pop: document.createElement('span'),
            food: document.createElement('span'),
            zone: document.createElement('div'),
            histSpeed: document.createElement('canvas'),
            histSize: document.createElement('canvas'),
            histSense: document.createElement('canvas'),
            histStorage: document.createElement('canvas'),
            histMeta: document.createElement('canvas'),
            histDefense: document.createElement('canvas'),
        };

        // Mock getContext for histograms
        const mockCtx = {
            canvas: canvas,
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            save: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            strokeRect: jest.fn(),
            fill: jest.fn(),
            arc: jest.fn(),
            createRadialGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
        };

        canvas.getContext = jest.fn().mockReturnValue(mockCtx);
        minimap.getContext = jest.fn().mockReturnValue(mockCtx);
        
        // Mock histogram contexts
        [statsRefs.histSpeed, statsRefs.histSize, statsRefs.histSense, 
         statsRefs.histStorage, statsRefs.histMeta, statsRefs.histDefense].forEach(el => {
            if (el) el.getContext = jest.fn().mockReturnValue(mockCtx);
        });
    });

    it('should initialize correctly', () => {
        const engine = new GameEngine(canvas, minimap, statsRefs);
        expect(engine).toBeDefined();
        expect(engine.config.initialPop).toBe(50);
    });

    it('should start and stop animation', () => {
        const engine = new GameEngine(canvas, minimap, statsRefs);
        jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(123);
        
        engine.start();
        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(engine.paused).toBe(false);

        engine.stop();
        expect(engine.paused).toBe(true);
    });

    it('should handle resize', () => {
        const engine = new GameEngine(canvas, minimap, statsRefs);
        engine.resize(1000, 800);
        expect(canvas.width).toBe(1000);
        expect(canvas.height).toBe(800);
    });
});
