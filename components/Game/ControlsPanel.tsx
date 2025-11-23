import React from 'react';
import { GameConfig } from '@/lib/simulation/GameEngine';

interface ControlsPanelProps {
    onReset: () => void;
    onConfigChange: (key: keyof GameConfig, value: number) => void;
    onSimSpeedChange: (value: number) => void;
    onWorldSizeChange: (value: number) => void;
    onTogglePredation: (value: boolean) => void;
    onToggleZones: (value: boolean) => void;
    onToggleDebug: (value: boolean) => void;
    isPaused: boolean;
    onTogglePause: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    onReset,
    onConfigChange,
    onSimSpeedChange,
    onWorldSizeChange,
    onTogglePredation,
    onToggleZones,
    onToggleDebug,
    isPaused,
    onTogglePause
}) => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div className={`pointer-events-auto stat-card p-3 rounded-lg shadow-xl text-xs hidden md:block scrollable-y w-48 bg-gray-900/95 backdrop-blur-sm border border-gray-800 overflow-y-auto transition-all duration-300 ${collapsed ? 'h-auto' : 'max-h-[calc(100vh-200px)]'}`}>
            <div 
                className="font-bold mb-2 text-gray-300 border-b border-gray-600 pb-1 flex justify-between items-center cursor-pointer"
                onClick={() => setCollapsed(!collapsed)}
            >
                <span>Configuration</span>
                <button className={`text-gray-400 hover:text-white p-1 transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`}>▼</button>
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                <div className="mb-3">
                    <button 
                        onClick={onTogglePause}
                        className={`w-full mb-2 px-3 py-1 rounded transition font-bold ${isPaused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}`}
                    >
                        {isPaused ? 'RESUME' : 'PAUSE'}
                    </button>

                    <label className="block text-[10px] uppercase text-gray-500 mb-1">World Size</label>
                <select 
                    onChange={(e) => onWorldSizeChange(parseInt(e.target.value))}
                    className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 w-full text-xs"
                    defaultValue="3000"
                >
                    <option value="3000">Medium (3k)</option>
                    <option value="6000">Large (6k)</option>
                    <option value="12000">Massive (12k)</option>
                    <option value="30000">Gigantic (30k)</option>
                    <option value="60000">Planetary (60k)</option>
                </select>
            </div>

            <div className="space-y-2 mb-3">
                <div className="font-bold text-gray-400 text-[10px] uppercase mt-2">Ecosystem</div>
                <div className="flex items-center">
                    <input 
                        type="checkbox" 
                        id="predation-toggle" 
                        className="w-4 h-4 accent-red-500 mr-2 cursor-pointer" 
                        defaultChecked 
                        onChange={(e) => onTogglePredation(e.target.checked)}
                    />
                    <label htmlFor="predation-toggle" className="text-red-400 font-bold cursor-pointer ml-1">Predation</label>
                </div>
                
                <div className="font-bold text-gray-400 text-[10px] uppercase mt-2">Hazards</div>
                <div className="flex items-center">
                    <input 
                        type="checkbox" 
                        id="zones-toggle" 
                        className="w-4 h-4 accent-purple-500 mr-2 cursor-pointer" 
                        defaultChecked 
                        onChange={(e) => onToggleZones(e.target.checked)}
                    />
                    <label htmlFor="zones-toggle" className="text-purple-400 font-bold cursor-pointer ml-1">Rad Zones</label>
                </div>
                <div className="mt-1">
                    <label className="block text-[9px] text-gray-500 uppercase">Density</label>
                    <input 
                        type="range" 
                        min="1" max="20" defaultValue="5" 
                        className="w-full accent-purple-500 h-1"
                        onChange={(e) => onConfigChange('zoneDensity', parseInt(e.target.value))}
                    />
                </div>
                <div className="mt-1">
                    <label className="block text-[9px] text-gray-500 uppercase">Size</label>
                    <input 
                        type="range" 
                        min="100" max="1000" defaultValue="350" 
                        className="w-full accent-purple-500 h-1"
                        onChange={(e) => onConfigChange('zoneSize', parseInt(e.target.value))}
                    />
                </div>
                <div className="mt-1">
                    <label className="block text-[9px] text-gray-500 uppercase">Drift</label>
                    <input 
                        type="range" 
                        min="0" max="50" defaultValue="3" 
                        className="w-full accent-purple-500 h-1"
                        onChange={(e) => onConfigChange('zoneDrift', parseFloat(e.target.value)/10)}
                    />
                </div>
                
                <div className="font-bold text-gray-400 text-[10px] uppercase mt-2">System</div>
                <div className="flex items-center">
                    <input 
                        type="checkbox" 
                        id="debug-toggle" 
                        className="w-4 h-4 accent-blue-500 mr-2 cursor-pointer" 
                        onChange={(e) => onToggleDebug(e.target.checked)}
                    />
                    <label htmlFor="debug-toggle" className="text-blue-400 font-bold cursor-pointer ml-1">Debug View</label>
                </div>
            </div>

            <div>
                <label className="block text-gray-500 text-[10px] uppercase">Time Scale</label>
                <input 
                    type="range" 
                    min="1" max="20" defaultValue="1" 
                    className="w-full accent-green-500"
                    onChange={(e) => onSimSpeedChange(parseInt(e.target.value))}
                />
            </div>
            <div className="mt-2">
                <label className="block text-gray-500 text-[10px] uppercase">Mutation Chance</label>
                <input 
                    type="range" 
                    min="0" max="100" defaultValue="90" 
                    className="w-full accent-pink-500"
                    onChange={(e) => onConfigChange('mutationChance', parseInt(e.target.value)/100)}
                />
            </div>
            <div className="mt-2">
                <label className="block text-gray-500 text-[10px] uppercase">Energy Burn Rate</label>
                <div className="flex justify-between text-[9px] text-gray-600"><span>Slow</span><span>Fast</span></div>
                <input 
                    type="range" 
                    min="1" max="200" defaultValue="20" 
                    className="w-full accent-teal-500"
                    onChange={(e) => onConfigChange('baseMetabolism', (parseInt(e.target.value)/100)*0.01)}
                />
            </div>
            <div className="mt-3 text-right">
                <button 
                    onClick={onReset}
                    className="bg-gray-700 hover:bg-red-800 text-white px-3 py-1 rounded transition w-full"
                >
                    Reset World
                </button>
            </div>
            </div>
        </div>
    );
};
