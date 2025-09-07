import React, { useState, useCallback, useRef } from 'react';
import { generateIllustration } from './services/geminiService';
import { CoupleIcon } from './components/CoupleIcon';
import { Loader } from './components/Loader';
import type { GenerateContentResponse } from '@google/genai';

interface ImageState {
  originalBase64: string | null;
  compressedBase64: string | null;
  originalSize: number | null;
  compressedSize: number | null;
}

interface GeneratedImageState extends ImageState {
  compressionQuality: number;
}

const initialImageState: ImageState = {
  originalBase64: null,
  compressedBase64: null,
  originalSize: null,
  compressedSize: null,
};

// Helper functions
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const compressImage = (base64Str: string, quality: number): Promise<{ compressedBase64: string, compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      const stringLength = compressedBase64.length - 'data:image/jpeg;base64,'.length;
      const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
      resolve({ compressedBase64, compressedSize: sizeInBytes });
    };
    img.onerror = (error) => reject(error);
  });
};


const App: React.FC = () => {
  const [brideImage, setBrideImage] = useState<ImageState>(initialImageState);
  const [groomImage, setGroomImage] = useState<ImageState>(initialImageState);
  const [cardImage, setCardImage] = useState<ImageState>(initialImageState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageState | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, imageType: 'bride' | 'groom' | 'card') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalBase64 = event.target?.result as string;
      const originalSize = file.size;
      
      try {
        const { compressedBase64, compressedSize } = await compressImage(originalBase64, 0.7); // Default 70% quality
        const newState = { originalBase64, originalSize, compressedBase64, compressedSize };
        if (imageType === 'bride') {
          setBrideImage(newState);
        } else if (imageType === 'groom') {
            setGroomImage(newState);
        } else {
          setCardImage(newState);
        }
      } catch (err) {
        setError('Failed to compress image. Please try a different file.');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!brideImage.compressedBase64 || !groomImage.compressedBase64 || !cardImage.compressedBase64) {
      setError('Please upload a photo for the bride, groom, and invitation style.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
        const brideB64 = brideImage.compressedBase64.split(',')[1];
        const groomB64 = groomImage.compressedBase64.split(',')[1];
        const cardB64 = cardImage.compressedBase64.split(',')[1];
        
        const response: GenerateContentResponse = await generateIllustration(brideB64, groomB64, cardB64);
      
      let foundImage = false;
      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data: string = part.inlineData.data;
            const fullBase64 = `data:image/png;base64,${base64Data}`;
            const originalSize = atob(base64Data).length;

            const initialQuality = 0.9;
            const { compressedBase64, compressedSize } = await compressImage(fullBase64, initialQuality);
            
            setGeneratedImage({
                originalBase64: fullBase64,
                compressedBase64,
                originalSize,
                compressedSize,
                compressionQuality: initialQuality,
            });

            foundImage = true;
            break; 
          }
        }
      }

      if (!foundImage) {
        throw new Error('No image was generated. The model may have refused the request. Please try again.');
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(e);
      setError(`Failed to generate illustration. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [brideImage, groomImage, cardImage]);

    const handleOutputCompressionChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!generatedImage || !generatedImage.originalBase64) return;

        const newQuality = parseFloat(e.target.value);
        setGeneratedImage(prev => prev ? { ...prev, compressionQuality: newQuality } : null);

        try {
            const { compressedBase64, compressedSize } = await compressImage(generatedImage.originalBase64, newQuality);
            setGeneratedImage(prev => prev ? { ...prev, compressedBase64, compressedSize } : null);
        } catch (error) {
            console.error("Output compression failed:", error);
            setError("Failed to re-compress the generated image.");
        }
    }, [generatedImage]);

    const handleDownload = useCallback(() => {
        if (!generatedImage?.compressedBase64) return;
        const link = document.createElement('a');
        link.href = generatedImage.compressedBase64;
        link.download = 'wedding-illustration.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);


  return (
    <div className="min-h-screen bg-[#FDF6E8] text-[#5D4037] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-block p-4 bg-white/50 rounded-full shadow-lg mb-4">
            <CoupleIcon className="h-16 w-16 text-[#8D6E63]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8D6E63] to-[#C19A6B]">
            Wedding Couple Illustrator AI
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Upload separate headshots of the bride and groom along with your invitation to create a beautiful, hand-drawn wedding illustration.
          </p>
        </header>

        <main>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <ImageUploader title="Bride's Headshot" imageState={brideImage} onFileChange={(e) => handleFileChange(e, 'bride')} id="bride-upload" isHeadshot={true} />
            <ImageUploader title="Groom's Headshot" imageState={groomImage} onFileChange={(e) => handleFileChange(e, 'groom')} id="groom-upload" isHeadshot={true} />
            <ImageUploader title="Invitation Style Reference" imageState={cardImage} onFileChange={(e) => handleFileChange(e, 'card')} id="card-upload" />
          </div>

          <div className="text-center mb-10">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !brideImage.compressedBase64 || !groomImage.compressedBase64 || !cardImage.compressedBase64}
              className="relative inline-flex items-center justify-center px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-[#C19A6B] to-[#8D6E63] rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Generate wedding illustration"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Generate Wedding Illustration'
              )}
            </button>
          </div>

          {isLoading && <Loader />}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md max-w-3xl mx-auto my-4" role="alert">
              <p className="font-bold">An Error Occurred</p>
              <p>{error}</p>
            </div>
          )}

          {generatedImage && (
            <OutputDisplay 
              generatedImage={generatedImage}
              onCompressionChange={handleOutputCompressionChange}
              onDownload={handleDownload}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface ImageUploaderProps {
    title: string;
    imageState: ImageState;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
    isHeadshot?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, imageState, onFileChange, id, isHeadshot = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleAreaClick = () => inputRef.current?.click();

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-[#E0D5C1] transition-shadow duration-300 hover:shadow-xl flex flex-col">
            <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">{title}</h3>
            <input
                type="file"
                id={id}
                ref={inputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                aria-label={`Upload ${title}`}
            />
            <div
                onClick={handleAreaClick}
                className="flex-grow flex items-center justify-center aspect-w-3 aspect-h-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#C19A6B] transition-colors cursor-pointer bg-gray-50 p-2"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAreaClick()}
            >
                {imageState.originalBase64 ? (
                    <img src={imageState.originalBase64} alt={`${title} preview`} className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="mt-2">Click to upload image</p>
                    </div>
                )}
            </div>
             {isHeadshot && !imageState.originalSize && (
                <p className="text-xs text-center text-gray-500 mt-2">
                    Tip: Use a clear, forward-facing headshot for best results.
                </p>
            )}
            {imageState.originalSize && imageState.compressedSize && (
                <div className="text-center text-sm text-gray-600 mt-3 bg-gray-100 p-2 rounded-md">
                    <p>Original: <span className="font-medium">{formatBytes(imageState.originalSize)}</span> | Compressed: <span className="font-medium text-green-700">{formatBytes(imageState.compressedSize)}</span></p>
                </div>
            )}
        </div>
    );
};

interface OutputDisplayProps {
    generatedImage: GeneratedImageState;
    onCompressionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownload: () => void;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ generatedImage, onCompressionChange, onDownload }) => (
    <div className="mt-12 text-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-6 text-[#5D4037]">Your Custom Illustration</h2>
        <div className="max-w-2xl mx-auto bg-white p-4 rounded-2xl shadow-2xl border-4 border-double border-[#C19A6B]">
            {generatedImage.compressedBase64 ? (
              <img src={generatedImage.compressedBase64} alt="Generated wedding couple illustration" className="rounded-lg w-full" />
            ) : (
              <div className="w-full aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
            )}
        </div>
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-white/70 rounded-xl shadow-lg">
            <div className="mb-4">
                <label htmlFor="compression" className="block text-md font-medium text-[#5D4037] mb-2">Adjust Image Quality</label>
                <div className="flex items-center gap-4">
                    <input
                        id="compression"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={generatedImage.compressionQuality}
                        onChange={onCompressionChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        aria-label="Adjust image compression quality"
                    />
                    <span className="font-semibold text-lg text-[#8D6E63] w-16 text-right">{Math.round(generatedImage.compressionQuality * 100)}%</span>
                </div>
            </div>
            {generatedImage.originalSize && generatedImage.compressedSize && (
                <div className="text-center text-md text-gray-700 my-3 bg-gray-100 p-2 rounded-md">
                    <p>Est. Original Size: <span className="font-medium">{formatBytes(generatedImage.originalSize)}</span></p>
                    <p>New Compressed Size: <span className="font-medium text-green-700">{formatBytes(generatedImage.compressedSize)}</span></p>
                </div>
            )}
            <button
                onClick={onDownload}
                className="w-full mt-2 inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-700 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out"
                aria-label="Download generated illustration"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Illustration
            </button>
        </div>
    </div>
);

export default App;
