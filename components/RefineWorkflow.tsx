
import React from 'react';
import { ImageState, GenerationType } from '../types';
import { ImageUploader } from './ImageUploader';

interface RefineWorkflowProps {
  refinementImage: ImageState;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, imageType: 'refine') => void;
  refinementImageType: GenerationType | null;
  onTypeChange: (type: GenerationType | null) => void;
  onAddToCreations: () => void;
}

export const RefineWorkflow: React.FC<RefineWorkflowProps> = ({
  refinementImage,
  onFileChange,
  refinementImageType,
  onTypeChange,
  onAddToCreations
}) => {
  return (
    <div className="animate-fade-in">
        <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
        <h2 className="text-2xl font-bold text-center mb-1 text-[#5D4037]">Refine an Existing Illustration</h2>
        <p className="text-gray-500 mb-6">Upload an illustration to add it to your creations below, then use the AI chat to refine it.</p>
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <ImageUploader 
                title="1. Upload Your Illustration" 
                imageState={refinementImage} 
                onFileChange={(e) => onFileChange(e, 'refine')} 
                id="refine-upload"
            />
            <div className="space-y-4">
                <div>
                    <label htmlFor="type-select" className="block text-lg font-medium text-[#5D4037] mb-2 text-left">2. Select Illustration Type</label>
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
                    onClick={onAddToCreations}
                    disabled={!refinementImage.compressedBase64 || !refinementImageType}
                    className="w-full inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Add uploaded illustration to my creations"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add to My Creations
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
