import React, { useState, useEffect } from 'react';

interface WelcomeModalProps {
    onStart: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const skip = localStorage.getItem('evolab_skip_welcome');
        if (skip === 'true') {
            setIsOpen(false);
            onStart();
        }
    }, [onStart]);

    const handleStart = () => {
        if (dontShowAgain) {
            localStorage.setItem('evolab_skip_welcome', 'true');
        }
        setIsOpen(false);
        onStart();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-gray-200">
                <div className="p-6">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">
                        EvoLab
                    </h1>
                    <p className="text-gray-400 text-lg mb-6">
                        An interactive evolutionary simulation where digital organisms compete, evolve, and survive.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-3 border-b border-gray-700 pb-1">
                                How it Works
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start">
                                    <span className="text-green-400 mr-2">●</span>
                                    <span><strong>Natural Selection:</strong> Organisms with better traits (speed, size, sense) survive longer and reproduce more.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-400 mr-2">●</span>
                                    <span><strong>Mutation:</strong> Offspring inherit traits with slight random variations, driving evolution.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-400 mr-2">●</span>
                                    <span><strong>Energy:</strong> Movement and existence cost energy. Eating food or other organisms replenishes it.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-white mb-3 border-b border-gray-700 pb-1">
                                Controls
                            </h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300">
                                <div className="flex justify-between">
                                    <span>Pan Camera</span>
                                    <span className="font-mono text-gray-500">WASD / Arrows</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Zoom</span>
                                    <span className="font-mono text-gray-500">Scroll / +/-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pause/Resume</span>
                                    <span className="font-mono text-gray-500">Space</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hide UI</span>
                                    <span className="font-mono text-gray-500">H</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Spawn</span>
                                    <span className="font-mono text-gray-500">Click</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Select</span>
                                    <span className="font-mono text-gray-500">Click Org</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700/50">
                        <h4 className="font-bold text-white mb-2">New Features</h4>
                        <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                            <li><strong>Save/Load:</strong> Save your unique ecosystem to a file or browser storage.</li>
                            <li><strong>Follow Mode:</strong> Track specific organisms or auto-follow the action.</li>
                            <li><strong>Ambient Mode:</strong> Press &apos;H&apos; to hide the UI for a cinematic view.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700">
                        <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                            />
                            <span>Don&apos;t show this again</span>
                        </label>
                        
                        <button 
                            onClick={handleStart}
                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            Start Simulation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
