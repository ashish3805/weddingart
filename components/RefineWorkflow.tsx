
import React from 'react';
import { ImageState, GenerationType } from '../types';
import { ImageUploader } from './ImageUploader';

interface RefineWorkflowProps {
  refinementImage: ImageState;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, imageType: 'refine') => void;
  refinementImageType: GenerationType | null;
  onTypeChange: (type: GenerationType | null) => void;
  onStartRefining: () => void;
}

export const RefineWorkflow: React.FC<RefineWorkflowProps> = ({
  refinementImage,
  onFileChange,
  refinementImageType,
  onTypeChange,
  onStartRefining
}) => {
  return (
    <div className="animate-fade-in">
        <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
        <h2 className="text-2xl font-bold text-center mb-1 text-[#5D4037]">Refine an Existing Illustration</h2>
        <p className="text-gray-500 mb-6">Already have an illustration? Upload it here to start refining with our AI chat.</p>
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <ImageUploader 
                title="Upload Your Illustration" 
                imageState={refinementImage} 
                onFileChange={(e) => onFileChange(e, 'refine')} 
                id="refine-upload"
            />
            <div className="space-y-4">
                <div>
                    <label htmlFor="type-select" className="block text-lg font-medium text-[#5D4037] mb-2 text-left">1. Select Illustration Type</label>
                    <select
                        id="type-select"
                        value={refinementImageType || ''}
                        onChange={(e) => onTypeChange(e.target.value as GenerationType)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C19A6B] focus:border-[#C19A6B]"
                    >
                        <option value="" disabled>-- Please select --</option>
                        <option value="bride">Bride Illustration</option>
                        <option value="groom">Groom Illustration</option>
                        <option value="couple">Couple Illustration</option>
                    </select>
                </div>
                <button
                    onClick={onStartRefining}
                    disabled={!refinementImage.compressedBase64 || !refinementImageType}
                    className="w-full inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Start refining uploaded illustration"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 18a1 1 0 01-1-1v-1h6v1a1 1 0 01-1 1H8z" /></svg>
                    Start Refining
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
