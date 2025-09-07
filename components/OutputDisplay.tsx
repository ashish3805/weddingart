
import React, { useState, useEffect } from 'react';
import { GeneratedImageHistory } from '../types';
import { formatBytes } from '../utils/imageUtils';
import { Checkbox } from './Checkbox';

interface OutputDisplayProps {
    generatedImageHistory: GeneratedImageHistory;
    onCompressionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownload: () => void;
    onRefine: () => void;
    onVersionChange: (direction: 'next' | 'prev') => void;
    showTransparency?: boolean;
    isQualityAdjustable?: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ generatedImageHistory, onCompressionChange, onDownload, onRefine, onVersionChange, showTransparency = false, isQualityAdjustable = true }) => {
    const [showGrid, setShowGrid] = useState(showTransparency);
    const currentVersion = generatedImageHistory.versions[generatedImageHistory.currentVersionIndex];
    const hasMultipleVersions = generatedImageHistory.versions.length > 1;

    useEffect(() => {
        setShowGrid(showTransparency);
    }, [showTransparency]);
    
    if (!currentVersion) return null;

    return (
    <div className="text-center w-full">
        <h3 className="text-2xl font-bold mb-4 text-[#5D4037]">{generatedImageHistory.title}</h3>
        <div className={`relative p-3 rounded-2xl shadow-2xl border-4 border-double border-[#C19A6B] transition-colors duration-300 ${showTransparency && showGrid ? 'checkerboard' : 'bg-gray-100'}`}>
            {currentVersion.compressedBase64 ? ( <img src={currentVersion.compressedBase64} alt={`Generated ${currentVersion.title}`} className="rounded-lg w-full" /> ) : ( <div className="w-full aspect-square bg-gray-200 animate-pulse rounded-lg"></div> )}
            {hasMultipleVersions && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-4 text-sm">
                <button onClick={() => onVersionChange('prev')} disabled={generatedImageHistory.currentVersionIndex === 0} className="disabled:opacity-50">&lt;</button>
                <span>V{generatedImageHistory.currentVersionIndex + 1} / {generatedImageHistory.versions.length}</span>
                <button onClick={() => onVersionChange('next')} disabled={generatedImageHistory.currentVersionIndex === generatedImageHistory.versions.length - 1} className="disabled:opacity-50">&gt;</button>
              </div>
            )}
        </div>
        <div className="mt-6 p-4 bg-white/70 rounded-xl shadow-lg">
            {showTransparency && (
                <div className="flex justify-center mb-4">
                     <Checkbox id={`grid-toggle-${generatedImageHistory.id}`} label="Show Transparency Grid" checked={showGrid} onChange={() => setShowGrid(prev => !prev)} />
                </div>
            )}
            <div className="mb-4">
                <label htmlFor={`compression-${generatedImageHistory.id}`} className="block text-md font-medium text-[#5D4037] mb-2">Adjust Image Quality</label>
                <div className="flex items-center gap-4">
                    <input id={`compression-${generatedImageHistory.id}`} type="range" min="0.1" max="1" step="0.05" value={currentVersion.compressionQuality} onChange={onCompressionChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed" aria-label={`Adjust compression quality for ${currentVersion.title}`} disabled={!isQualityAdjustable} />
                    <span className="font-semibold text-lg text-[#8D6E63] w-16 text-right">{Math.round(currentVersion.compressionQuality * 100)}%</span>
                </div>
                 {!isQualityAdjustable && <p className="text-xs text-gray-500 mt-2">Quality adjustment is for JPEGs. This is a PNG to preserve transparency.</p>}
            </div>
            {currentVersion.originalSize && currentVersion.compressedSize && ( <div className="text-center text-md text-gray-700 my-3 bg-gray-100 p-2 rounded-md"> <p>Est. Original: <span className="font-medium">{formatBytes(currentVersion.originalSize)}</span></p> <p>Compressed: <span className="font-medium text-green-700">{formatBytes(currentVersion.compressedSize)}</span></p> </div> )}
             <button onClick={onRefine} className="w-full mb-2 inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out" aria-label={`Refine ${currentVersion.title} with AI chat`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 18a1 1 0 01-1-1v-1h6v1a1 1 0 01-1 1H8z" /></svg>
                Refine with AI Chat
            </button>
            <button onClick={onDownload} className="w-full mt-2 inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-700 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out" aria-label={`Download ${currentVersion.title}`} > <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download </button>
        </div>
    </div>
    );
};
