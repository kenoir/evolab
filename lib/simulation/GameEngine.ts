import { RefObject } from 'react';

export interface GameConfig {
    initialPop: number;
    initialFood: number;
    mutationRate: number;
    mutationChance: number;
    baseMetabolism: number;
    startEnergy: number;
    predatorSizeAdvantage: number;
    foodValue: number;
    maxToxicity: number;
    zoneCount: number;
    zoneDensity: number;
    zoneDrift: number;
    zoneSize: number;
}

export interface GameStatsRefs {
    fps: HTMLElement | null;
    pop: HTMLElement | null;
    food: HTMLElement | null;
    zone: HTMLElement | null;
    histSpeed: HTMLCanvasElement | null;
    histSize: HTMLCanvasElement | null;
    histSense: HTMLCanvasElement | null;
    histStorage: HTMLCanvasElement | null;
    histMeta: HTMLCanvasElement | null;
    histDefense: HTMLCanvasElement | null;
}

export interface Vector {
    x: number;
    y: number;
}

export interface Zone {
    pos: Vector;
    radius: number;
    vel: Vector;
}

export interface GameState {
    meta: {
        version: string;
        date: string;
    };
    config: GameConfig;
    world: {
        size: number;
        simSpeed: number;
        flags: {
            predation: boolean;
            zones: boolean;
            debug: boolean;
        };
        camera: { x: number; y: number; zoom: number };
    };
    environment: {
        zones: Zone[];
    };
    entities: {
        organisms: number[][];
        food: number[][];
    };
}

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private minimap: HTMLCanvasElement;
    private miniCtx: CanvasRenderingContext2D;
    private statsRefs: GameStatsRefs;

    // Constants
    private readonly MAX_POP = 100000;
    private readonly MAX_FOOD = 50000;
    private readonly MAX_GRID_DIM = 500;
    private readonly HIST_BINS = 20;

    // State
    public worldSize = 3000;
    public cellSize = 320;
    public simSpeed = 1;
    public debugMode = false;
    public predationActive = true;
    public activeZones = true;
    public paused = false;
    
    private lastTime = 0;
    private frameCount = 0;
    private animationId: number | null = null;
    private onFollowChange: ((isFollowing: boolean) => void) | null = null;

    // Camera
    public camera = { x: 0, y: 0, zoom: 0.5 };
    public keys: { [key: string]: boolean } = {};
    private followedIndex: number = -1;
    
    // Config
    public config: GameConfig = {
        initialPop: 50,
        initialFood: 150,
        mutationRate: 0.5,
        mutationChance: 0.9,
        baseMetabolism: 0.002,
        startEnergy: 150,
        predatorSizeAdvantage: 1.2,
        foodValue: 25,
        maxToxicity: 0.9,
        zoneCount: 5,
        zoneDensity: 5,
        zoneDrift: 0.3,
        zoneSize: 350
    };

    private zones: Zone[] = [];

    // Memory (SoA)
    private oX: Float32Array;
    private oY: Float32Array;
    private oVX: Float32Array;
    private oVY: Float32Array;
    private oEnergy: Float32Array;

    private gSpeed: Float32Array;
    private gSize: Float32Array;
    private gSense: Float32Array;
    private gRepro: Float32Array;
    private gWander: Float32Array;
    private gDefense: Float32Array;
    private gMeta: Float32Array;
    private gHue: Float32Array;

    private oActive: Uint8Array;
    private oFree: Int32Array;
    private oFreePtr: number;
    private activeCount = 0;

    private fX: Float32Array;
    private fY: Float32Array;
    private fActive: Uint8Array;
    private fFree: Int32Array;
    private fFreePtr: number;
    private foodCount = 0;

    // Grid
    private gridHead: Int32Array;
    private gridNext: Int32Array;
    private foodGridHead: Int32Array;
    private foodGridNext: Int32Array;
    private gridCols = 0;
    private gridRows = 0;

    // Histograms
    private hSpeeds: Int32Array;
    private hSizes: Int32Array;
    private hSenses: Int32Array;
    private hStorage: Int32Array;
    private hMetas: Int32Array;
    private hDefense: Int32Array;
    private histContexts: { [key: string]: CanvasRenderingContext2D | null } = {};

    constructor(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement, statsRefs: GameStatsRefs, onFollowChange?: (isFollowing: boolean) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
        this.minimap = minimap;
        this.miniCtx = minimap.getContext('2d') as CanvasRenderingContext2D;
        this.statsRefs = statsRefs;
        this.onFollowChange = onFollowChange || null;

        // Initialize Arrays
        this.oX = new Float32Array(this.MAX_POP);
        this.oY = new Float32Array(this.MAX_POP);
        this.oVX = new Float32Array(this.MAX_POP);
        this.oVY = new Float32Array(this.MAX_POP);
        this.oEnergy = new Float32Array(this.MAX_POP);

        this.gSpeed = new Float32Array(this.MAX_POP);
        this.gSize = new Float32Array(this.MAX_POP);
        this.gSense = new Float32Array(this.MAX_POP);
        this.gRepro = new Float32Array(this.MAX_POP);
        this.gWander = new Float32Array(this.MAX_POP);
        this.gDefense = new Float32Array(this.MAX_POP);
        this.gMeta = new Float32Array(this.MAX_POP);
        this.gHue = new Float32Array(this.MAX_POP);

        this.oActive = new Uint8Array(this.MAX_POP);
        this.oFree = new Int32Array(this.MAX_POP);
        this.oFreePtr = this.MAX_POP - 1;

        this.fX = new Float32Array(this.MAX_FOOD);
        this.fY = new Float32Array(this.MAX_FOOD);
        this.fActive = new Uint8Array(this.MAX_FOOD);
        this.fFree = new Int32Array(this.MAX_FOOD);
        this.fFreePtr = this.MAX_FOOD - 1;

        const MAX_CELLS = this.MAX_GRID_DIM * this.MAX_GRID_DIM;
        this.gridHead = new Int32Array(MAX_CELLS);
        this.gridNext = new Int32Array(this.MAX_POP);
        this.foodGridHead = new Int32Array(MAX_CELLS);
        this.foodGridNext = new Int32Array(this.MAX_FOOD);

        this.hSpeeds = new Int32Array(this.HIST_BINS);
        this.hSizes = new Int32Array(this.HIST_BINS);
        this.hSenses = new Int32Array(this.HIST_BINS);
        this.hStorage = new Int32Array(this.HIST_BINS);
        this.hMetas = new Int32Array(this.HIST_BINS);
        this.hDefense = new Int32Array(this.HIST_BINS);

        // Initialize Free Lists
        for(let i=0; i<this.MAX_POP; i++) this.oFree[i] = this.MAX_POP - 1 - i;
        for(let i=0; i<this.MAX_FOOD; i++) this.fFree[i] = this.MAX_FOOD - 1 - i;

        // Initialize Histogram Contexts
        if (this.statsRefs.histSpeed) this.histContexts.speed = this.statsRefs.histSpeed.getContext('2d');
        if (this.statsRefs.histSize) this.histContexts.size = this.statsRefs.histSize.getContext('2d');
        if (this.statsRefs.histSense) this.histContexts.sense = this.statsRefs.histSense.getContext('2d');
        if (this.statsRefs.histStorage) this.histContexts.storage = this.statsRefs.histStorage.getContext('2d');
        if (this.statsRefs.histMeta) this.histContexts.meta = this.statsRefs.histMeta.getContext('2d');
        if (this.statsRefs.histDefense) this.histContexts.defense = this.statsRefs.histDefense.getContext('2d');

        this.init();
    }

    public init() {
        this.activeCount = 0; 
        this.foodCount = 0;
        this.oFreePtr = this.MAX_POP - 1; 
        for(let i=0; i<this.MAX_POP; i++) { this.oFree[i] = this.MAX_POP - 1 - i; this.oActive[i] = 0; }
        this.fFreePtr = this.MAX_FOOD - 1; 
        for(let i=0; i<this.MAX_FOOD; i++) { this.fFree[i] = this.MAX_FOOD - 1 - i; this.fActive[i] = 0; }
        
        this.zones = [];
        const targetZoneCount = Math.ceil(this.config.zoneDensity * (this.worldSize / 3000));
        for(let i=0; i<targetZoneCount; i++) {
            this.zones.push({
                pos: {x: Math.random() * this.worldSize, y: Math.random() * this.worldSize},
                radius: this.config.zoneSize,
                vel: {x: (Math.random()-0.5)*this.config.zoneDrift, y: (Math.random()-0.5)*this.config.zoneDrift}
            });
        }
    
        for(let i=0; i<this.config.initialPop; i++) this.spawnOrganism(Math.random()*this.worldSize, Math.random()*this.worldSize);
        this.spawnRandomFood(this.config.initialFood);
        
        if(this.canvas && this.ctx) {
            this.camera.x = this.worldSize/2 - (this.canvas.width / this.camera.zoom)/2;
            this.camera.y = this.worldSize/2 - (this.canvas.height / this.camera.zoom)/2;
            this.clampCamera();
        }
    }

    public start() {
        this.paused = false;
        if (!this.animationId) {
            this.lastTime = performance.now();
            this.animate(this.lastTime);
        }
    }

    public stop() {
        this.paused = true;
    }

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.clampCamera();
    }

    public handleKeyDown(code: string) {
        this.keys[code] = true;
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowDown' || code === 'KeyS' || 
            code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowRight' || code === 'KeyD') {
            this.followedIndex = -1;
        }
    }

    public handleKeyUp(code: string) {
        this.keys[code] = false;
    }

    private processInput() {
        const speed = 15 / this.camera.zoom;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) this.camera.y -= speed;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) this.camera.y += speed;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.camera.x -= speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.camera.x += speed;
        
        if (this.keys['Equal'] || this.keys['NumpadAdd']) this.camera.zoom = Math.min(3, this.camera.zoom * 1.02);
        if (this.keys['Minus'] || this.keys['NumpadSubtract']) this.camera.zoom = Math.max(0.1, this.camera.zoom * 0.98);
    
        if (this.followedIndex !== -1) {
            if (this.oActive[this.followedIndex]) {
                const viewW = this.canvas.width / this.camera.zoom;
                const viewH = this.canvas.height / this.camera.zoom;
                this.camera.x = this.oX[this.followedIndex] - viewW / 2;
                this.camera.y = this.oY[this.followedIndex] - viewH / 2;
            } else {
                this.followedIndex = -1;
            }
        }

        if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['ArrowDown'] || this.keys['KeyS'] || 
            this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['ArrowRight'] || this.keys['KeyD'] ||
            this.keys['Equal'] || this.keys['NumpadAdd'] || this.keys['Minus'] || this.keys['NumpadSubtract'] ||
            this.followedIndex !== -1) {
            this.clampCamera();
        }
    }

    private getWrappedVector(fromX: number, fromY: number, toX: number, toY: number) {
        let dx = toX - fromX; let dy = toY - fromY;
        if (dx > this.worldSize / 2) dx -= this.worldSize; else if (dx < -this.worldSize / 2) dx += this.worldSize;
        if (dy > this.worldSize / 2) dy -= this.worldSize; else if (dy < -this.worldSize / 2) dy += this.worldSize;
        return {x: dx, y: dy};
    }

    private getWrappedDistSq(x1: number, y1: number, x2: number, y2: number) {
        let dx = Math.abs(x1 - x2); let dy = Math.abs(y1 - y2);
        if (dx > this.worldSize / 2) dx = this.worldSize - dx; if (dy > this.worldSize / 2) dy = this.worldSize - dy;
        return dx * dx + dy * dy;
    }

    private getWrappedDist(x1: number, y1: number, x2: number, y2: number) { 
        return Math.sqrt(this.getWrappedDistSq(x1, y1, x2, y2)); 
    }

    private getBiasedSpawnPos() {
        if (this.activeZones && this.zones.length > 0 && Math.random() < 0.8) { 
            const zone = this.zones[Math.floor(Math.random() * this.zones.length)];
            const r = zone.radius * Math.sqrt(Math.random()); 
            const theta = Math.random() * 2 * Math.PI;
            let x = zone.pos.x + r * Math.cos(theta);
            let y = zone.pos.y + r * Math.sin(theta);
            if (x < 0) x += this.worldSize; if (x >= this.worldSize) x -= this.worldSize;
            if (y < 0) y += this.worldSize; if (y >= this.worldSize) y -= this.worldSize;
            return {x, y};
        }
        return {x: Math.random()*this.worldSize, y: Math.random()*this.worldSize};
    }

    private spawnOrganism(x: number, y: number, parentIdx = -1) {
        if (this.oFreePtr < 0) return -1;
        const idx = this.oFree[this.oFreePtr--];
        this.oActive[idx] = 1;
        this.activeCount++;
    
        this.oX[idx] = x; this.oY[idx] = y;
        this.oVX[idx] = (Math.random() - 0.5); this.oVY[idx] = (Math.random() - 0.5);
    
        if (parentIdx === -1) {
            this.gSpeed[idx] = Math.random() * 2 + 1.5;
            this.gSize[idx] = Math.random() * 8 + 5;
            this.gSense[idx] = Math.random() * 80 + 40;
            this.gRepro[idx] = Math.random() * 1900 + 100;
            this.gWander[idx] = Math.random() * 0.5 + 0.1;
            this.gDefense[idx] = Math.random() * 0.1;
            this.gMeta[idx] = 1.0;
            this.gHue[idx] = Math.random() * 360;
        } else {
            const chance = this.config.mutationChance;
            const rate = this.config.mutationRate;
            this.gSpeed[idx] = this.gSpeed[parentIdx]; this.gSize[idx] = this.gSize[parentIdx]; this.gSense[idx] = this.gSense[parentIdx];
            this.gRepro[idx] = this.gRepro[parentIdx]; this.gWander[idx] = this.gWander[parentIdx]; this.gDefense[idx] = this.gDefense[parentIdx];
            this.gMeta[idx] = this.gMeta[parentIdx]; this.gHue[idx] = this.gHue[parentIdx];
    
            if (Math.random() < chance) this.gSpeed[idx] += (Math.random() - 0.5) * rate * 2;
            if (Math.random() < chance) this.gSize[idx] += (Math.random() - 0.5) * rate * 6;
            if (Math.random() < chance) this.gSense[idx] += (Math.random() - 0.5) * rate * 30;
            if (Math.random() < chance) this.gRepro[idx] += (Math.random() - 0.5) * 400 * rate;
            if (Math.random() < chance) this.gWander[idx] += (Math.random() - 0.5) * 0.2;
            if (Math.random() < chance) this.gDefense[idx] += (Math.random() - 0.5) * 0.3;
            if (Math.random() < chance) this.gMeta[idx] += (Math.random() - 0.5) * rate * 0.5;
            if (Math.random() < chance) this.gHue[idx] += (Math.random() - 0.5) * 30;
    
            this.gSpeed[idx] = Math.max(0.5, Math.min(8, this.gSpeed[idx]));
            this.gSize[idx] = Math.max(4, Math.min(30, this.gSize[idx]));
            this.gSense[idx] = Math.max(20, Math.min(300, this.gSense[idx]));
            this.gRepro[idx] = Math.max(100, Math.min(2500, this.gRepro[idx]));
            this.gWander[idx] = Math.max(0.05, Math.min(2, this.gWander[idx]));
            this.gDefense[idx] = Math.max(0, Math.min(1, this.gDefense[idx]));
            this.gMeta[idx] = Math.max(0.5, Math.min(3.0, this.gMeta[idx]));
            this.gHue[idx] = (this.gHue[idx] + 360) % 360;
        }
        this.oEnergy[idx] = this.gRepro[idx] * 0.5;
        return idx;
    }

    private killOrganism(idx: number) {
        if (idx === this.followedIndex) {
            // Find nearest living organism
            let bestDist = Infinity;
            let bestIdx = -1;
            
            for(let i=0; i<this.MAX_POP; i++) {
                if (i !== idx && this.oActive[i]) {
                    const dSq = this.getWrappedDistSq(this.oX[idx], this.oY[idx], this.oX[i], this.oY[i]);
                    if (dSq < bestDist) {
                        bestDist = dSq;
                        bestIdx = i;
                    }
                }
            }
            
            this.followedIndex = bestIdx;
            if (this.onFollowChange) {
                this.onFollowChange(this.followedIndex !== -1);
            }
        }

        this.oActive[idx] = 0;
        this.oFree[++this.oFreePtr] = idx;
        this.activeCount--;
    }

    private spawnFood(x: number, y: number) {
        if (this.fFreePtr < 0) return -1;
        const idx = this.fFree[this.fFreePtr--];
        this.fActive[idx] = 1;
        this.fX[idx] = x; this.fY[idx] = y;
        this.foodCount++;
        return idx;
    }

    private killFood(idx: number) {
        this.fActive[idx] = 0;
        this.fFree[++this.fFreePtr] = idx;
        this.foodCount--;
    }

    private updateGrid() {
        this.gridCols = Math.ceil(this.worldSize / this.cellSize);
        this.gridRows = Math.ceil(this.worldSize / this.cellSize);
        this.gridHead.fill(-1, 0, this.gridCols * this.gridRows);
        this.foodGridHead.fill(-1, 0, this.gridCols * this.gridRows);
    
        for(let i=0; i<this.MAX_POP; i++) {
            if(this.oActive[i]) {
                let cx = Math.floor(this.oX[i] / this.cellSize);
                let cy = Math.floor(this.oY[i] / this.cellSize);
                if(cx < 0) cx += this.gridCols; if(cx >= this.gridCols) cx %= this.gridCols;
                if(cy < 0) cy += this.gridRows; if(cy >= this.gridRows) cy %= this.gridRows;
                const cellIdx = cy * this.gridCols + cx;
                this.gridNext[i] = this.gridHead[cellIdx];
                this.gridHead[cellIdx] = i;
            }
        }
    
        for(let i=0; i<this.MAX_FOOD; i++) {
            if(this.fActive[i]) {
                let cx = Math.floor(this.fX[i] / this.cellSize);
                let cy = Math.floor(this.fY[i] / this.cellSize);
                if(cx < 0) cx += this.gridCols; if(cx >= this.gridCols) cx %= this.gridCols;
                if(cy < 0) cy += this.gridRows; if(cy >= this.gridRows) cy %= this.gridRows;
                const cellIdx = cy * this.gridCols + cx;
                this.foodGridNext[i] = this.foodGridHead[cellIdx];
                this.foodGridHead[cellIdx] = i;
            }
        }
    }

    private physicsStep() {
        for(let i=0; i<this.MAX_POP; i++) {
            if(!this.oActive[i]) continue;
    
            const speedMag = Math.sqrt(this.oVX[i]*this.oVX[i] + this.oVY[i]*this.oVY[i]);
            const metabolicSpeedLimit = this.gMeta[i] * 4.0;
            if (speedMag > metabolicSpeedLimit) {
                const scale = metabolicSpeedLimit / speedMag;
                this.oVX[i] *= scale; this.oVY[i] *= scale;
            }
    
            const baseCost = this.config.baseMetabolism * this.gMeta[i];
            const speedCost = (speedMag ** 3) * 0.02;
            const sizeCost = (this.gSize[i] ** 3) * 0.0001;
            const senseCost = this.gSense[i] * 0.0001;
            const defenseCost = this.gDefense[i] * 0.08;
            this.oEnergy[i] -= (baseCost + speedCost + sizeCost + senseCost + defenseCost);
    
            if (this.activeZones) {
                for(let z of this.zones) {
                    const dist = this.getWrappedDist(this.oX[i], this.oY[i], z.pos.x, z.pos.y);
                    if (dist < z.radius) {
                        const intensity = 1.0 - (dist / z.radius);
                        const damage = Math.max(0, (intensity * this.config.maxToxicity) - this.gDefense[i]);
                        this.oEnergy[i] -= damage;
                    }
                }
            }
    
            if (this.oEnergy[i] <= 0) { this.killOrganism(i); continue; }
    
            let cx = Math.floor(this.oX[i] / this.cellSize);
            let cy = Math.floor(this.oY[i] / this.cellSize);
            let bestFood = -1; let bestFoodDist = Infinity;
            let bestPred = -1; let bestPredDist = Infinity;
            const senseSq = this.gSense[i] * this.gSense[i];
    
            for(let dy=-1; dy<=1; dy++) {
                for(let dx=-1; dx<=1; dx++) {
                    let nx = (cx + dx + this.gridCols) % this.gridCols;
                    let ny = (cy + dy + this.gridRows) % this.gridRows;
                    let cellIdx = ny * this.gridCols + nx;
    
                    let fIdx = this.foodGridHead[cellIdx];
                    while(fIdx !== -1) {
                        if (this.fActive[fIdx]) {
                            const dSq = this.getWrappedDistSq(this.oX[i], this.oY[i], this.fX[fIdx], this.fY[fIdx]);
                            if (dSq < senseSq && dSq < bestFoodDist) {
                                bestFoodDist = dSq; bestFood = fIdx;
                            }
                        }
                        fIdx = this.foodGridNext[fIdx];
                    }
                    if (this.predationActive) {
                        let oIdx = this.gridHead[cellIdx];
                        while(oIdx !== -1) {
                            if (oIdx !== i && this.oActive[oIdx]) {
                                const dSq = this.getWrappedDistSq(this.oX[i], this.oY[i], this.oX[oIdx], this.oY[oIdx]);
                                if (dSq < senseSq) {
                                    if (this.gSize[oIdx] > this.gSize[i] * this.config.predatorSizeAdvantage) {
                                        if (dSq < bestPredDist) { bestPredDist = dSq; bestPred = oIdx; }
                                    } else if (this.gSize[i] > this.gSize[oIdx] * this.config.predatorSizeAdvantage) {
                                        if (dSq < bestFoodDist) { bestFoodDist = dSq; bestFood = -2; } 
                                    }
                                }
                            }
                            oIdx = this.gridNext[oIdx];
                        }
                    }
                }
            }
    
            let accX = 0, accY = 0;
            if (bestPred !== -1) {
                let v = this.getWrappedVector(this.oX[bestPred], this.oY[bestPred], this.oX[i], this.oY[i]); 
                const dist = Math.sqrt(v.x*v.x + v.y*v.y);
                if (dist > 0) { accX = (v.x/dist) * 0.6; accY = (v.y/dist) * 0.6; }
                this.oEnergy[i] -= 0.1;
            } else if (bestFood !== -1) {
                let tx = (bestFood === -2) ? this.oX[i] : this.fX[bestFood]; 
                let ty = (bestFood === -2) ? this.oY[i] : this.fY[bestFood];
                if (bestFood >= 0) {
                    let v = this.getWrappedVector(this.oX[i], this.oY[i], tx, ty);
                    const dist = Math.sqrt(v.x*v.x + v.y*v.y);
                    if (dist > 0) { 
                        // Improved steering: proportional force + arrival braking
                        const steerForce = Math.max(0.25, this.gSpeed[i] * 0.2);
                        accX = (v.x/dist) * steerForce; 
                        accY = (v.y/dist) * steerForce;
                        
                        // Brake if we are close and moving fast to avoid orbiting
                        if (dist < this.gSize[i] * 2) {
                            this.oVX[i] *= 0.85;
                            this.oVY[i] *= 0.85;
                        }
                    }
                } else {
                    const ag = this.gWander[i];
                    accX = (Math.random()-0.5) * ag; accY = (Math.random()-0.5) * ag;
                }
            } else {
                const ag = this.gWander[i];
                accX = (Math.random()-0.5) * ag; accY = (Math.random()-0.5) * ag;
            }
    
            this.oVX[i] += accX; this.oVY[i] += accY;
            const velMag2 = Math.sqrt(this.oVX[i]*this.oVX[i] + this.oVY[i]*this.oVY[i]);
            if (velMag2 > this.gSpeed[i]) {
                const scale = this.gSpeed[i] / velMag2;
                this.oVX[i] *= scale; this.oVY[i] *= scale;
            }
            this.oX[i] += this.oVX[i]; this.oY[i] += this.oVY[i];
            
            if (this.oX[i] < 0) this.oX[i] += this.worldSize; if (this.oX[i] >= this.worldSize) this.oX[i] -= this.worldSize;
            if (this.oY[i] < 0) this.oY[i] += this.worldSize; if (this.oY[i] >= this.worldSize) this.oY[i] -= this.worldSize;
    
            cx = Math.floor(this.oX[i] / this.cellSize);
            cy = Math.floor(this.oY[i] / this.cellSize);
            if(cx < 0) cx += this.gridCols; if(cx >= this.gridCols) cx %= this.gridCols;
            if(cy < 0) cy += this.gridRows; if(cy >= this.gridRows) cy %= this.gridRows;
            const cellIdx = cy * this.gridCols + cx;
            const eatRadSq = (this.gSize[i] + 3)**2;
    
            let fIdx = this.foodGridHead[cellIdx];
            while(fIdx !== -1) {
                if (this.fActive[fIdx]) {
                    const dSq = this.getWrappedDistSq(this.oX[i], this.oY[i], this.fX[fIdx], this.fY[fIdx]);
                    if (dSq < eatRadSq) {
                        this.oEnergy[i] = Math.min(this.gRepro[i] * 1.2, this.oEnergy[i] + this.config.foodValue);
                        this.killFood(fIdx);
                    }
                }
                fIdx = this.foodGridNext[fIdx];
            }
    
            if (this.predationActive) {
                let other = this.gridHead[cellIdx];
                while(other !== -1) {
                    if (other !== i && this.oActive[other]) {
                        if (this.gSize[i] > this.gSize[other] * this.config.predatorSizeAdvantage) {
                            const dSq = this.getWrappedDistSq(this.oX[i], this.oY[i], this.oX[other], this.oY[other]);
                            if (dSq < this.gSize[i]*this.gSize[i]) {
                                const dmg = this.gDefense[other] * 30;
                                this.oEnergy[i] -= dmg;
                                this.oEnergy[i] = Math.min(this.gRepro[i] * 1.5, this.oEnergy[i] + this.oEnergy[other] + this.gSize[other]*5);
                                this.killOrganism(other);
                            }
                        }
                    }
                    other = this.gridNext[other];
                }
            }
    
            if (this.oEnergy[i] > this.gRepro[i]) {
                let costPerChild = 300;
                if (this.oEnergy[i] > 600) costPerChild = 280;
                if (this.oEnergy[i] > 1200) costPerChild = 260;
    
                let numOffspring = Math.floor(this.oEnergy[i] / costPerChild);
                if (numOffspring < 1) numOffspring = 1;
                if (numOffspring > 8) numOffspring = 8;
                
                let share = this.oEnergy[i] / (numOffspring + 1);
                this.oEnergy[i] = share;
                for(let k=0; k<numOffspring; k++) {
                    let childIdx = this.spawnOrganism(this.oX[i], this.oY[i], i);
                    if (childIdx !== -1) this.oEnergy[childIdx] = share;
                }
            }
        }
    }

    public clampCamera() {
        if(!this.ctx) return;
        const viewW = this.ctx.canvas.width / this.camera.zoom; const viewH = this.ctx.canvas.height / this.camera.zoom;
        if (viewW >= this.worldSize) this.camera.x = -(viewW - this.worldSize) / 2; else this.camera.x = Math.max(0, Math.min(this.camera.x, this.worldSize - viewW));
        if (viewH >= this.worldSize) this.camera.y = -(viewH - this.worldSize) / 2; else this.camera.y = Math.max(0, Math.min(this.camera.y, this.worldSize - viewH));
    }

    private updateEnvironment() {
        if (this.activeZones) {
            const targetZoneCount = Math.ceil(this.config.zoneDensity * (this.worldSize / 3000));
            if (this.zones.length < targetZoneCount) {
                this.zones.push({
                    pos: {x: Math.random() * this.worldSize, y: Math.random() * this.worldSize},
                    radius: this.config.zoneSize,
                    vel: {x: (Math.random()-0.5)*this.config.zoneDrift, y: (Math.random()-0.5)*this.config.zoneDrift}
                });
            }
            for (let z of this.zones) {
                z.pos.x += z.vel.x; z.pos.y += z.vel.y;
                if (z.pos.x < 0) z.pos.x += this.worldSize; if (z.pos.x >= this.worldSize) z.pos.x -= this.worldSize;
                if (z.pos.y < 0) z.pos.y += this.worldSize; if (z.pos.y >= this.worldSize) z.pos.y -= this.worldSize;
                if (Math.random() < 0.05) {
                    z.vel.x = Math.max(-this.config.zoneDrift, Math.min(this.config.zoneDrift, z.vel.x + (Math.random()-0.5)*0.1));
                    z.vel.y = Math.max(-this.config.zoneDrift, Math.min(this.config.zoneDrift, z.vel.y + (Math.random()-0.5)*0.1));
                }
            }
        } else {
            this.zones = [];
        }
    }

    private spawnRandomFood(amount: number) {
        for(let i=0; i<amount; i++) {
            let p = this.getBiasedSpawnPos();
            this.spawnFood(p.x, p.y);
        }
    }

    public spawnAt(clientX: number, clientY: number) {
        if(!this.ctx) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const worldX = (x / this.camera.zoom) + this.camera.x; 
        const worldY = (y / this.camera.zoom) + this.camera.y;
        let wx = worldX % this.worldSize; let wy = worldY % this.worldSize;
        if (wx < 0) wx += this.worldSize; if (wy < 0) wy += this.worldSize;

        // Check for organism click
        let clickedOrg = -1;
        let minDist = Infinity;
        const clickRadius = 20 / this.camera.zoom;

        // Simple linear search for click (could be optimized with grid but pop is manageable)
        // We need to check wrapped distance
        for(let i=0; i<this.MAX_POP; i++) {
            if(this.oActive[i]) {
                const d = this.getWrappedDist(wx, wy, this.oX[i], this.oY[i]);
                if (d < this.gSize[i] + clickRadius) {
                    if (d < minDist) {
                        minDist = d;
                        clickedOrg = i;
                    }
                }
            }
        }

        if (clickedOrg !== -1) {
            this.followedIndex = clickedOrg;
            if (this.onFollowChange) this.onFollowChange(true);
            this.draw(); // Force redraw to show selection immediately
            return;
        }

        this.followedIndex = -1;
        if (this.onFollowChange) this.onFollowChange(false);
        
        for(let i=0; i<3; i++) this.spawnFood(wx + (Math.random()-0.5)*50, wy + (Math.random()-0.5)*50);
        this.draw(); // Force redraw
    }

    public toggleFollowMode(enable: boolean) {
        if (enable) {
            if (this.followedIndex === -1) {
                // Find organism closest to center of screen
                const viewW = this.canvas.width / this.camera.zoom;
                const viewH = this.canvas.height / this.camera.zoom;
                const cx = this.camera.x + viewW/2;
                const cy = this.camera.y + viewH/2;
                
                let bestDist = Infinity;
                let bestIdx = -1;
                
                for(let i=0; i<this.MAX_POP; i++) {
                    if (this.oActive[i]) {
                        const dSq = this.getWrappedDistSq(cx, cy, this.oX[i], this.oY[i]);
                        if (dSq < bestDist) {
                            bestDist = dSq;
                            bestIdx = i;
                        }
                    }
                }
                this.followedIndex = bestIdx;
            }
        } else {
            this.followedIndex = -1;
        }
        
        if (this.onFollowChange) {
            this.onFollowChange(this.followedIndex !== -1);
        }
        this.draw();
    }

    public exportState(): GameState {
        const organisms: number[][] = [];
        for(let i=0; i<this.MAX_POP; i++) {
            if(this.oActive[i]) {
                organisms.push([
                    this.oX[i], this.oY[i], this.oVX[i], this.oVY[i], this.oEnergy[i],
                    this.gSpeed[i], this.gSize[i], this.gSense[i], this.gRepro[i],
                    this.gWander[i], this.gDefense[i], this.gMeta[i], this.gHue[i]
                ]);
            }
        }

        const food: number[][] = [];
        for(let i=0; i<this.MAX_FOOD; i++) {
            if(this.fActive[i]) {
                food.push([this.fX[i], this.fY[i]]);
            }
        }

        return {
            meta: {
                version: "1.0",
                date: new Date().toISOString()
            },
            config: { ...this.config },
            world: {
                size: this.worldSize,
                simSpeed: this.simSpeed,
                flags: {
                    predation: this.predationActive,
                    zones: this.activeZones,
                    debug: this.debugMode
                },
                camera: { ...this.camera }
            },
            environment: {
                zones: JSON.parse(JSON.stringify(this.zones))
            },
            entities: {
                organisms,
                food
            }
        };
    }

    public importState(state: GameState) {
        // Reset
        this.activeCount = 0;
        this.foodCount = 0;
        this.oFreePtr = this.MAX_POP - 1;
        for(let i=0; i<this.MAX_POP; i++) { this.oFree[i] = this.MAX_POP - 1 - i; this.oActive[i] = 0; }
        this.fFreePtr = this.MAX_FOOD - 1; 
        for(let i=0; i<this.MAX_FOOD; i++) { this.fFree[i] = this.MAX_FOOD - 1 - i; this.fActive[i] = 0; }
        
        // Load Config & World
        this.config = state.config;
        this.worldSize = state.world.size;
        this.simSpeed = state.world.simSpeed;
        this.predationActive = state.world.flags.predation;
        this.activeZones = state.world.flags.zones;
        this.debugMode = state.world.flags.debug;
        this.camera = state.world.camera;
        this.zones = state.environment.zones;

        // Load Organisms
        for(const org of state.entities.organisms) {
            if (this.oFreePtr < 0) break;
            const idx = this.oFree[this.oFreePtr--];
            this.oActive[idx] = 1;
            this.activeCount++;

            this.oX[idx] = org[0]; this.oY[idx] = org[1];
            this.oVX[idx] = org[2]; this.oVY[idx] = org[3];
            this.oEnergy[idx] = org[4];
            this.gSpeed[idx] = org[5];
            this.gSize[idx] = org[6];
            this.gSense[idx] = org[7];
            this.gRepro[idx] = org[8];
            this.gWander[idx] = org[9];
            this.gDefense[idx] = org[10];
            this.gMeta[idx] = org[11];
            this.gHue[idx] = org[12];
        }

        // Load Food
        for(const f of state.entities.food) {
            if (this.fFreePtr < 0) break;
            const idx = this.fFree[this.fFreePtr--];
            this.fActive[idx] = 1;
            this.fX[idx] = f[0]; this.fY[idx] = f[1];
            this.foodCount++;
        }

        this.resize(this.canvas.width, this.canvas.height); // Re-clamp camera
        this.draw();
    }

    private updateHistograms() {
        if (this.activeCount === 0) return;
    
        this.hSpeeds.fill(0); this.hSizes.fill(0); this.hSenses.fill(0); this.hStorage.fill(0); this.hMetas.fill(0); this.hDefense.fill(0);
        let maxSpeed = 0, maxSize = 0, maxSense = 0, maxStorage = 0, maxMeta = 0, maxDefense = 0;
    
        for(let i=0; i<this.MAX_POP; i++) {
            if (this.oActive[i]) {
                let b = Math.floor(((this.gSpeed[i] - 0.5) / 7.5) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hSpeeds[b]++; if(this.hSpeeds[b]>maxSpeed) maxSpeed=this.hSpeeds[b];
                b = Math.floor(((this.gSize[i] - 4.0) / 26.0) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hSizes[b]++; if(this.hSizes[b]>maxSize) maxSize=this.hSizes[b];
                b = Math.floor(((this.gSense[i] - 20.0) / 280.0) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hSenses[b]++; if(this.hSenses[b]>maxSense) maxSense=this.hSenses[b];
                b = Math.floor(((this.gRepro[i] - 150.0) / 2350.0) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hStorage[b]++; if(this.hStorage[b]>maxStorage) maxStorage=this.hStorage[b];
                b = Math.floor(((this.gMeta[i] - 0.5) / 2.5) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hMetas[b]++; if(this.hMetas[b]>maxMeta) maxMeta=this.hMetas[b];
                b = Math.floor((this.gDefense[i]) * this.HIST_BINS); if(b<0) b=0; if(b>=this.HIST_BINS) b=this.HIST_BINS-1; this.hDefense[b]++; if(this.hDefense[b]>maxDefense) maxDefense=this.hDefense[b];
            }
        }
    
        const drawBin = (ctx: CanvasRenderingContext2D | null, counts: Int32Array, max: number, color: string) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            const w = ctx.canvas.width / this.HIST_BINS;
            ctx.fillStyle = color;
            for(let i=0; i<this.HIST_BINS; i++) {
                const h = (counts[i] / max) * ctx.canvas.height * 0.9;
                ctx.fillRect(i * w, ctx.canvas.height - h, w - 1, h);
            }
        };
    
        drawBin(this.histContexts.speed, this.hSpeeds, maxSpeed, '#60a5fa');
        drawBin(this.histContexts.size, this.hSizes, maxSize, '#f87171');
        drawBin(this.histContexts.sense, this.hSenses, maxSense, '#4ade80');
        drawBin(this.histContexts.storage, this.hStorage, maxStorage, '#a78bfa');
        drawBin(this.histContexts.meta, this.hMetas, maxMeta, '#22d3ee');
        drawBin(this.histContexts.defense, this.hDefense, maxDefense, '#facc15');
    }

    private draw() {
        if(!this.ctx) return;
        this.ctx.fillStyle = '#111'; this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); 
        this.ctx.save(); this.ctx.scale(this.camera.zoom, this.camera.zoom); this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Grid
        this.ctx.strokeStyle = '#222'; this.ctx.lineWidth = 2; const gridSize = 320; 
        const viewW = this.ctx.canvas.width / this.camera.zoom; const viewH = this.ctx.canvas.height / this.camera.zoom;
        const camCX = this.camera.x + viewW/2; const camCY = this.camera.y + viewH/2;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize, startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = this.camera.x + viewW + gridSize, endY = this.camera.y + viewH + gridSize;
        this.ctx.beginPath();
        for (let x = startX; x < endX; x += gridSize) { this.ctx.moveTo(x, this.camera.y); this.ctx.lineTo(x, this.camera.y + viewH); }
        for (let y = startY; y < endY; y += gridSize) { this.ctx.moveTo(this.camera.x, y); this.ctx.lineTo(this.camera.x + viewW, y); }
        this.ctx.stroke(); this.ctx.strokeStyle = '#331111'; this.ctx.strokeRect(0, 0, this.worldSize, this.worldSize);
    
        if (this.activeZones) {
            for (let z of this.zones) {
                 let dx = Math.abs(z.pos.x - camCX); let dy = Math.abs(z.pos.y - camCY);
                 if (dx > this.worldSize/2) dx = this.worldSize - dx; if (dy > this.worldSize/2) dy = this.worldSize - dy;
                 if (dx > viewW/2 + z.radius && dy > viewH/2 + z.radius) continue;
                 const grad = this.ctx.createRadialGradient(z.pos.x, z.pos.y, 0, z.pos.x, z.pos.y, z.radius);
                 grad.addColorStop(0, 'rgba(147, 51, 234, 0.4)'); grad.addColorStop(1, 'rgba(74, 222, 128, 0.0)');
                 this.ctx.fillStyle = grad; this.ctx.beginPath(); this.ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI*2); this.ctx.fill();
                 if (z.pos.x < z.radius) { this.ctx.fillStyle = grad; this.ctx.beginPath(); this.ctx.arc(z.pos.x+this.worldSize, z.pos.y, z.radius, 0, Math.PI*2); this.ctx.fill(); }
                 if (z.pos.x > this.worldSize-z.radius) { this.ctx.fillStyle = grad; this.ctx.beginPath(); this.ctx.arc(z.pos.x-this.worldSize, z.pos.y, z.radius, 0, Math.PI*2); this.ctx.fill(); }
            }
        }
    
        this.ctx.fillStyle = '#4ade80'; this.ctx.beginPath();
        for (let i=0; i<this.MAX_FOOD; i++) {
            if (!this.fActive[i]) continue;
            let dx = Math.abs(this.fX[i] - camCX); let dy = Math.abs(this.fY[i] - camCY);
            if (dx > this.worldSize/2) dx = this.worldSize - dx; if (dy > this.worldSize/2) dy = this.worldSize - dy;
            if (dx > viewW/2 + 20 && dy > viewH/2 + 20) continue; 
            const drawF = (x: number, y: number) => { this.ctx.moveTo(x,y); this.ctx.arc(x, y, 3, 0, Math.PI*2); };
            drawF(this.fX[i], this.fY[i]);
            if (this.fX[i] < 10) drawF(this.fX[i]+this.worldSize, this.fY[i]); if (this.fX[i] > this.worldSize-10) drawF(this.fX[i]-this.worldSize, this.fY[i]);
            if (this.fY[i] < 10) drawF(this.fX[i], this.fY[i]+this.worldSize); if (this.fY[i] > this.worldSize-10) drawF(this.fX[i], this.fY[i]-this.worldSize);
        }
        this.ctx.fill();
    
        const lowDetail = this.camera.zoom < 0.4;
        const highDetail = this.camera.zoom > 1.5;

        for (let i=0; i<this.MAX_POP; i++) {
            if (!this.oActive[i]) continue;
            let dx = Math.abs(this.oX[i] - camCX); let dy = Math.abs(this.oY[i] - camCY);
            if (dx > this.worldSize/2) dx = this.worldSize - dx; if (dy > this.worldSize/2) dy = this.worldSize - dy;
            const buffer = this.gSize[i] + (this.debugMode ? this.gSense[i] : 0) + 50;
            if (dx > viewW/2 + buffer || dy > viewH/2 + buffer) continue;
    
            const drawO = (x: number, y: number) => {
                if (lowDetail) {
                    this.ctx.fillStyle = `hsl(${this.gHue[i]}, 70%, 50%)`;
                    this.ctx.fillRect(x - this.gSize[i], y - this.gSize[i], this.gSize[i]*2, this.gSize[i]*2);
                } else {
                    if (this.debugMode) {
                        this.ctx.beginPath(); this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        this.ctx.arc(x, y, this.gSense[i], 0, Math.PI*2); this.ctx.stroke();
                    }
                    
                    // Base Body
                    this.ctx.fillStyle = `hsl(${this.gHue[i]}, 70%, 50%)`;
                    
                    // Spikes / Defense
                    if (this.gDefense[i] > 0.2) {
                        this.ctx.beginPath();
                        const spikeLen = this.gDefense[i] * 6;
                        for(let j=0; j<5; j++) {
                            const ang = (j/5)*Math.PI*2;
                            this.ctx.lineTo(x + Math.cos(ang)*(this.gSize[i]+spikeLen), y + Math.sin(ang)*(this.gSize[i]+spikeLen));
                        }
                        this.ctx.fill();
                    }

                    // Main Body Circle
                    this.ctx.beginPath(); 
                    // Pulse effect for high metabolism
                    let pulse = 0;
                    if (highDetail) {
                        pulse = Math.sin(this.frameCount * 0.2 * this.gMeta[i]) * 1.5;
                    }
                    this.ctx.arc(x, y, this.gSize[i] + pulse, 0, Math.PI*2); 
                    this.ctx.fill();
                    
                    // High Detail Features
                    if (highDetail) {
                        // Eyes (Sense)
                        const eyeCount = Math.floor(this.gSense[i] / 60) + 1;
                        const eyeSize = Math.min(this.gSize[i] * 0.3, 4);
                        const eyeDist = this.gSize[i] * 0.6;
                        
                        // Calculate facing angle from velocity
                        const angle = Math.atan2(this.oVY[i], this.oVX[i]);
                        
                        this.ctx.fillStyle = 'white';
                        for(let e=0; e<eyeCount; e++) {
                            // Spread eyes around the front
                            const eyeAngle = angle + (e - (eyeCount-1)/2) * 0.5;
                            const ex = x + Math.cos(eyeAngle) * eyeDist;
                            const ey = y + Math.sin(eyeAngle) * eyeDist;
                            this.ctx.beginPath(); this.ctx.arc(ex, ey, eyeSize, 0, Math.PI*2); this.ctx.fill();
                            
                            // Pupil
                            this.ctx.fillStyle = 'black';
                            this.ctx.beginPath(); this.ctx.arc(ex + Math.cos(angle), ey + Math.sin(angle), eyeSize*0.4, 0, Math.PI*2); this.ctx.fill();
                            this.ctx.fillStyle = 'white';
                        }

                        // Tail (Speed)
                        if (this.gSpeed[i] > 2.0) {
                            this.ctx.strokeStyle = `hsl(${this.gHue[i]}, 70%, 40%)`;
                            this.ctx.lineWidth = Math.max(1, this.gSize[i] * 0.2);
                            this.ctx.beginPath();
                            this.ctx.moveTo(x - Math.cos(angle)*this.gSize[i], y - Math.sin(angle)*this.gSize[i]);
                            
                            const tailLen = this.gSpeed[i] * 3;
                            const wiggle = Math.sin(this.frameCount * 0.5) * 5;
                            const tx = x - Math.cos(angle)*(this.gSize[i] + tailLen) + Math.cos(angle + Math.PI/2) * wiggle;
                            const ty = y - Math.sin(angle)*(this.gSize[i] + tailLen) + Math.sin(angle + Math.PI/2) * wiggle;
                            
                            this.ctx.quadraticCurveTo(
                                x - Math.cos(angle)*(this.gSize[i] + tailLen/2), 
                                y - Math.sin(angle)*(this.gSize[i] + tailLen/2),
                                tx, ty
                            );
                            this.ctx.stroke();
                        }
                    }

                    // Selection Highlight
                    if (i === this.followedIndex) {
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, this.gSize[i] + 10, 0, Math.PI*2);
                        this.ctx.stroke();
                        
                        // Draw stats text
                        this.ctx.fillStyle = 'white';
                        this.ctx.font = '10px monospace';
                        this.ctx.fillText(`E:${Math.floor(this.oEnergy[i])}`, x + this.gSize[i] + 5, y - 10);
                        this.ctx.fillText(`S:${this.gSpeed[i].toFixed(1)}`, x + this.gSize[i] + 5, y);
                    }
                    
                    if (this.oEnergy[i] > this.gRepro[i] * 0.8) {
                        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)'; this.ctx.lineWidth = 2;
                        this.ctx.beginPath(); this.ctx.arc(x, y, this.gSize[i]+3, 0, Math.PI*2); this.ctx.stroke();
                    }
                }
            }
            drawO(this.oX[i], this.oY[i]);
            if (this.oX[i] < buffer) drawO(this.oX[i]+this.worldSize, this.oY[i]); if (this.oX[i] > this.worldSize-buffer) drawO(this.oX[i]-this.worldSize, this.oY[i]);
            if (this.oY[i] < buffer) drawO(this.oX[i], this.oY[i]+this.worldSize); if (this.oY[i] > this.worldSize-buffer) drawO(this.oX[i], this.oY[i]-this.worldSize);
        }
        this.ctx.restore();
    }

    private animate = (time: number) => {
        this.animationId = requestAnimationFrame(this.animate);
        const delta = time - this.lastTime; 
        this.lastTime = time;
        
        this.processInput();
        
        if (!this.paused) {
            this.updateEnvironment();
        
            for (let s = 0; s < this.simSpeed; s++) {
                this.updateGrid(); 
                if (Math.random() < 0.3) { let p = this.getBiasedSpawnPos(); this.spawnFood(p.x, p.y); }
                this.physicsStep();
            }
            
            if (this.activeCount === 0 && this.frameCount % 60 === 0) { 
                for(let i=0; i<10; i++) this.spawnOrganism(Math.random() * this.worldSize, Math.random() * this.worldSize);
                this.spawnRandomFood(50); 
            }
        }
    
        this.draw();
        
        this.frameCount++;
        if (this.frameCount % 20 === 0) {
            if(this.statsRefs.fps) this.statsRefs.fps.innerText = (Math.round(1000/delta) || 60).toString();
            
            if(this.miniCtx) {
                this.miniCtx.fillStyle = '#000'; this.miniCtx.fillRect(0, 0, this.miniCtx.canvas.width, this.miniCtx.canvas.height);
                const scale = this.miniCtx.canvas.width / this.worldSize; 
                for (let i=0; i<this.MAX_POP; i++) {
                    if(this.oActive[i]) {
                        this.miniCtx.fillStyle = `hsl(${this.gHue[i]}, 70%, 50%)`;
                        this.miniCtx.fillRect(this.oX[i] * scale, this.oY[i] * scale, 2, 2); 
                    }
                }
                this.miniCtx.strokeStyle = '#555'; this.miniCtx.lineWidth = 1; 
                let camX = this.camera.x % this.worldSize; if (camX < 0) camX += this.worldSize; let camY = this.camera.y % this.worldSize; if (camY < 0) camY += this.worldSize;
                this.miniCtx.strokeRect(camX * scale, camY * scale, (this.canvas.width/this.camera.zoom) * scale, (this.canvas.height/this.camera.zoom) * scale);
            }
    
            if(this.statsRefs.pop) this.statsRefs.pop.innerText = this.activeCount.toString();
            if(this.statsRefs.food) this.statsRefs.food.innerText = this.foodCount.toString();
            if(this.statsRefs.zone) this.statsRefs.zone.innerText = this.activeZones ? this.zones.length.toString() : "Off";
            this.updateHistograms();
        }
    }
}
