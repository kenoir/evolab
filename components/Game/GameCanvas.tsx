'use client';

import React, { useEffect, useRef } from 'react';
import { GameEngine } from '@/lib/simulation/GameEngine';
import { StatsPanel } from './StatsPanel';
import { ControlsPanel } from './ControlsPanel';

export default function GameCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const minimapRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);

    // Stats Refs
    const fpsRef = useRef<HTMLDivElement>(null);
    const popRef = useRef<HTMLSpanElement>(null);
    const foodRef = useRef<HTMLSpanElement>(null);
    const zoneRef = useRef<HTMLDivElement>(null);
    const histSpeedRef = useRef<HTMLCanvasElement>(null);
    const histSizeRef = useRef<HTMLCanvasElement>(null);
    const histSenseRef = useRef<HTMLCanvasElement>(null);
    const histStorageRef = useRef<HTMLCanvasElement>(null);
    const histMetaRef = useRef<HTMLCanvasElement>(null);
    const histDefenseRef = useRef<HTMLCanvasElement>(null);

    const [isPaused, setIsPaused] = React.useState(false);
    const [ambientMode, setAmbientMode] = React.useState(false);
    const [isFollowing, setIsFollowing] = React.useState(false);

    const togglePause = React.useCallback(() => {
        if (!engineRef.current) return;
        if (isPaused) {
            engineRef.current.start();
            setIsPaused(false);
        } else {
            engineRef.current.stop();
            setIsPaused(true);
        }
    }, [isPaused]);

    const toggleFollow = React.useCallback((enable: boolean) => {
        if (!engineRef.current) return;
        engineRef.current.toggleFollowMode(enable);
        // State update will happen via callback
    }, []);

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current || !minimapRef.current) return;

        const engine = new GameEngine(
            canvasRef.current,
            minimapRef.current,
            {
                fps: fpsRef.current,
                pop: popRef.current,
                food: foodRef.current,
                zone: zoneRef.current,
                histSpeed: histSpeedRef.current,
                histSize: histSizeRef.current,
                histSense: histSenseRef.current,
                histStorage: histStorageRef.current,
                histMeta: histMetaRef.current,
                histDefense: histDefenseRef.current,
            },
            (following) => setIsFollowing(following)
        );

        engineRef.current = engine;
        engine.start();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use contentRect for precise pixel size of the container
                const { width, height } = entry.contentRect;
                // Ensure we align with the pixel grid
                // For now, we stick to 1:1 CSS pixel mapping to avoid logic complexity,
                // but we ensure the canvas buffer matches the container's CSS size exactly.
                engine.resize(width, height);
            }
        });

        resizeObserver.observe(containerRef.current);

        // Keyboard listeners
        const handleKeyDown = (e: KeyboardEvent) => {
            engine.handleKeyDown(e.code);
        };
        const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e.code);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            engine.stop();
            resizeObserver.disconnect();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Separate effect for Space key to access current state/toggle function correctly
    useEffect(() => {
        const handleSpace = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                togglePause();
            }
            if (e.code === 'KeyH') {
                setAmbientMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleSpace);
        return () => window.removeEventListener('keydown', handleSpace);
    }, [togglePause]);

    // Input Handlers
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const dragDistance = useRef(0);
    const initialPinchDist = useRef(0);
    const initialZoom = useRef(1);

    const onMinimapClick = (e: React.MouseEvent) => {
        if (!engineRef.current || !minimapRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Minimap canvas width is fixed at 120 in the JSX below, but let's use the actual width
        const scale = minimapRef.current.width / engineRef.current.worldSize;
        const worldX = x / scale;
        const worldY = y / scale;
        
        // We need to access the canvas from the engine or ref
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewW = canvas.width / engineRef.current.camera.zoom;
        const viewH = canvas.height / engineRef.current.camera.zoom;
        
        engineRef.current.camera.x = worldX - viewW / 2;
        engineRef.current.camera.y = worldY - viewH / 2;
        engineRef.current.clampCamera();
    };

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragDistance.current = 0;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (isDragging.current && engineRef.current) {
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            dragDistance.current += Math.abs(dx) + Math.abs(dy);
            
            const cam = engineRef.current.camera;
            cam.x -= dx / cam.zoom;
            cam.y -= dy / cam.zoom;
            engineRef.current.clampCamera();
            
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };
    
    const onClick = (e: React.MouseEvent) => {
        if (dragDistance.current < 5 && engineRef.current) {
            engineRef.current.spawnAt(e.clientX, e.clientY);
        }
    };

    const onWheel = (e: React.WheelEvent) => {
        if (engineRef.current) {
            const cam = engineRef.current.camera;
            cam.zoom = Math.max(0.1, Math.min(3, cam.zoom - e.deltaY * 0.001 * cam.zoom));
            engineRef.current.clampCamera();
        }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            dragDistance.current = 0;
            lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2 && engineRef.current) {
            isDragging.current = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist.current = Math.hypot(dx, dy);
            initialZoom.current = engineRef.current.camera.zoom;
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging.current && engineRef.current) {
            const dx = e.touches[0].clientX - lastMouse.current.x;
            const dy = e.touches[0].clientY - lastMouse.current.y;
            dragDistance.current += Math.abs(dx) + Math.abs(dy);
            const cam = engineRef.current.camera;
            cam.x -= dx / cam.zoom;
            cam.y -= dy / cam.zoom;
            engineRef.current.clampCamera();
            lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2 && engineRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (initialPinchDist.current > 0) {
                engineRef.current.camera.zoom = Math.max(0.1, Math.min(3, initialZoom.current * (dist / initialPinchDist.current)));
                engineRef.current.clampCamera();
            }
        }
    };
    
    const onTouchEnd = (e: React.TouchEvent) => {
        isDragging.current = false;
        if (e.changedTouches.length > 0 && dragDistance.current < 10 && e.touches.length === 0 && engineRef.current) {
            engineRef.current.spawnAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-[#1a1a1a] text-[#e0e0e0] font-sans select-none">
            {/* UI Layer */}
            <div className={`absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4 z-20 transition-opacity duration-500 ${ambientMode ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <StatsPanel 
                        fpsRef={fpsRef} popRef={popRef} foodRef={foodRef} zoneRef={zoneRef}
                        histSpeedRef={histSpeedRef} histSizeRef={histSizeRef} histSenseRef={histSenseRef}
                        histStorageRef={histStorageRef} histMetaRef={histMetaRef} histDefenseRef={histDefenseRef}
                    />
                    <ControlsPanel 
                        onReset={() => engineRef.current?.init()}
                        onConfigChange={(k, v) => { if(engineRef.current) engineRef.current.config[k] = v; }}
                        onSimSpeedChange={(v) => { if(engineRef.current) engineRef.current.simSpeed = v; }}
                        onWorldSizeChange={(v) => { if(engineRef.current) { engineRef.current.worldSize = v; engineRef.current.init(); } }}
                        onTogglePredation={(v) => { if(engineRef.current) engineRef.current.predationActive = v; }}
                        onToggleZones={(v) => { if(engineRef.current) engineRef.current.activeZones = v; }}
                        onToggleDebug={(v) => { if(engineRef.current) engineRef.current.debugMode = v; }}
                        isPaused={isPaused}
                        onTogglePause={togglePause}
                        isFollowing={isFollowing}
                        onToggleFollow={toggleFollow}
                    />
                </div>
                
                <div className="absolute bottom-4 right-4 pointer-events-auto flex flex-col items-end gap-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Minimap</div>
                    <canvas 
                        ref={minimapRef} 
                        width="120" height="120" 
                        className="rounded shadow-lg bg-black/50 backdrop-blur-sm cursor-pointer"
                        onClick={onMinimapClick}
                    ></canvas>
                </div>
            </div>

            <canvas 
                ref={canvasRef}
                className="z-10 cursor-move block w-full h-full touch-none"
                style={{ width: '100%', height: '100%' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onClick={onClick}
                onWheel={onWheel}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            />
        </div>
    );
}
