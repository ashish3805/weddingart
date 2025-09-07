
import React, { useRef } from 'react';
import { ImageState } from '../types';
import { formatBytes } from '../utils/imageUtils';

interface ImageUploaderProps {
    title: string;
    imageState: ImageState;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
    isHeadshot?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ title, imageState, onFileChange, id, isHeadshot = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleAreaClick = () => inputRef.current?.click();

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-[#E0D5C1] transition-shadow duration-300 hover:shadow-xl flex flex-col">
            {title && <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">{title}</h3>}
            <input type="file" id={id} ref={inputRef} onChange={onFileChange} className="hidden" accept="image/jpeg, image/png, image/webp" aria-label={`Upload ${title}`} />
            <div onClick={handleAreaClick} className="flex-grow flex items-center justify-center aspect-w-3 aspect-h-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#C19A6B] transition-colors cursor-pointer bg-gray-50 p-2" role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAreaClick()} >
                {imageState.originalBase64 ? (
                    <img src={imageState.originalBase64} alt={`${title} preview`} className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="mt-2">{title ? 'Click to upload image' : 'Upload invitation'}</p>
                    </div>
                )}
            </div>
            {isHeadshot && !imageState.originalSize && (
                <p className="text-xs text-center text-gray-500 mt-2"> Tip: Use a clear, forward-facing headshot for best results. </p>
            )}
            {imageState.originalSize && imageState.compressedSize && (
                <div className="text-center text-sm text-gray-600 mt-3 bg-gray-100 p-2 rounded-md">
                    <p>Original: <span className="font-medium">{formatBytes(imageState.originalSize)}</span> | Compressed: <span className="font-medium text-green-700">{formatBytes(imageState.compressedSize)}</span></p>
                </div>
            )}
        </div>
    );
};
