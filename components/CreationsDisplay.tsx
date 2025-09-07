
import React from 'react';
import { GeneratedImageHistory } from '../types';
import { OutputDisplay } from './OutputDisplay';

interface CreationsDisplayProps {
    generatedImages: GeneratedImageHistory[];
    finalInviteImage: GeneratedImageHistory | null;
    handlers: {
      onCompressionChange: (imageId: string, versionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
      onDownload: (imageId: string) => void;
      onRefine: (imageId: string) => void;
      onVersionChange: (imageId: string, direction: 'next' | 'prev') => void;
    }
}

export const CreationsDisplay: React.FC<CreationsDisplayProps> = ({ generatedImages, finalInviteImage, handlers }) => {
    if (generatedImages.length === 0 && !finalInviteImage) {
        return null;
    }

    return (
        <div className="mt-12 animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-center text-[#5D4037]">Your Custom Creations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {generatedImages.map((imageHistory) => {
                  const currentVersion = imageHistory.versions[imageHistory.currentVersionIndex];
                  const isPng = !!currentVersion?.compressedBase64?.startsWith('data:image/png');
                  return (
                    <OutputDisplay 
                        key={imageHistory.id} 
                        generatedImageHistory={imageHistory} 
                        onCompressionChange={(e) => handlers.onCompressionChange(imageHistory.id, imageHistory.currentVersionIndex, e)} 
                        onDownload={() => handlers.onDownload(imageHistory.id)} 
                        onRefine={() => handlers.onRefine(imageHistory.id)}
                        onVersionChange={(dir) => handlers.onVersionChange(imageHistory.id, dir)}
                        showTransparency={isPng}
                        isQualityAdjustable={!isPng}
                    />
                  );
              })}
              {finalInviteImage && (
                <OutputDisplay
                    generatedImageHistory={finalInviteImage}
                    onCompressionChange={(e) => handlers.onCompressionChange(finalInviteImage.id, finalInviteImage.currentVersionIndex, e)}
                    onDownload={() => handlers.onDownload(finalInviteImage.id)}
                    onRefine={() => handlers.onRefine(finalInviteImage.id)}
                    onVersionChange={(dir) => handlers.onVersionChange(finalInviteImage.id, dir)}
                    isQualityAdjustable={true}
                    showTransparency={false}
                />
              )}
          </div>
        </div>
    );
};
