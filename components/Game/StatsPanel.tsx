import React, { RefObject, useState } from 'react';

interface StatsPanelProps {
    fpsRef: RefObject<HTMLDivElement | null>;
    popRef: RefObject<HTMLSpanElement | null>;
    foodRef: RefObject<HTMLSpanElement | null>;
    zoneRef: RefObject<HTMLDivElement | null>;
    histSpeedRef: RefObject<HTMLCanvasElement | null>;
    histSizeRef: RefObject<HTMLCanvasElement | null>;
    histSenseRef: RefObject<HTMLCanvasElement | null>;
    histStorageRef: RefObject<HTMLCanvasElement | null>;
    histMetaRef: RefObject<HTMLCanvasElement | null>;
    histDefenseRef: RefObject<HTMLCanvasElement | null>;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
    fpsRef, popRef, foodRef, zoneRef,
    histSpeedRef, histSizeRef, histSenseRef, histStorageRef, histMetaRef, histDefenseRef
}) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div className={`pointer-events-auto stat-card p-3 rounded-lg shadow-xl w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-800 transition-all duration-300 ${collapsed ? 'h-auto' : ''}`}>
                <div 
                    className="flex justify-between items-center mb-2 cursor-pointer" 
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div>
                        <h1 className="text-lg font-bold text-green-400 leading-none">EvoLab <span className="text-[10px] text-gray-500 font-normal">v31.0 Next</span></h1>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xs text-gray-400">Pop:</span>
                            <span ref={popRef} className="font-mono font-bold text-white text-sm">0</span>
                            <span className="text-[10px] text-gray-500 ml-2">Food: <span ref={foodRef}>0</span></span>
                        </div>
                    </div>
                    <button className={`text-gray-400 hover:text-white p-1 transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`}>▼</button>
                </div>
                
                <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[600px]'}`}>
                    <div className="pt-2 border-t border-gray-700 space-y-2">
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-blue-400">Speed</span></div><canvas ref={histSpeedRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-red-400">Size</span></div><canvas ref={histSizeRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-green-400">Sense</span></div><canvas ref={histSenseRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-purple-400">Storage</span></div><canvas ref={histStorageRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-cyan-400">Metabolism</span></div><canvas ref={histMetaRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                        <div><div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-0.5"><span className="text-yellow-400">Defense</span></div><canvas ref={histDefenseRef} width="220" height="25" className="bg-gray-900 rounded border border-gray-700 block w-full"></canvas></div>
                    </div>
                </div>
            </div>

            {/* FPS & Status */}
            <div className="pointer-events-auto stat-card p-3 rounded-lg shadow-xl flex gap-6 items-center h-fit bg-gray-900/95 backdrop-blur-sm border border-gray-800">
                 <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase">Active Zones</div>
                    <div ref={zoneRef} className="text-lg font-bold text-purple-400">0</div>
                </div>
                <div className="h-8 w-px bg-gray-700"></div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase">FPS</div>
                    <div ref={fpsRef} className="text-lg font-bold text-gray-300">60</div>
                </div>
            </div>
        </div>
    );
};
