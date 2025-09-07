
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateIllustration, combineIllustrations, createFinalInvitation, refineIllustration } from './services/geminiService';
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
  title: string;
  compressionQuality: number;
}

interface GeneratedImageHistory {
  id: string;
  title: string;
  versions: GeneratedImageState[];
  currentVersionIndex: number;
}

type GenerationType = 'bride' | 'groom' | 'couple';

interface ChatHistoryItem {
    role: 'user' | 'model';
    text: string;
    image?: string;
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

const compressImage = (base64Str: string, quality: number, outputFormat: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<{ compressedBase64: string, compressedSize: number }> => {
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
      const compressedBase64 = canvas.toDataURL(outputFormat, outputFormat === 'image/jpeg' ? quality : undefined);
      const stringLength = compressedBase64.length - `data:${outputFormat};base64,`.length;
      const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
      resolve({ compressedBase64, compressedSize: sizeInBytes });
    };
    img.onerror = (error) => reject(error);
  });
};


const App: React.FC = () => {
  const [brideImage, setBrideImage] = useState<ImageState>(initialImageState);
  const [groomImage, setGroomImage] = useState<ImageState>(initialImageState);
  const [coupleImage, setCoupleImage] = useState<ImageState>(initialImageState);
  const [cardImage, setCardImage] = useState<ImageState>(initialImageState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageHistory[]>([]);
  const [selectedOutputs, setSelectedOutputs] = useState<Record<GenerationType, boolean>>({
      bride: false,
      groom: false,
      couple: false,
  });

  const [weddingInviteBg, setWeddingInviteBg] = useState<ImageState>(initialImageState);
  const [generateInvite, setGenerateInvite] = useState<boolean>(false);
  const [finalInviteImage, setFinalInviteImage] = useState<GeneratedImageHistory | null>(null);

  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    targetImageId: string | null;
    history: ChatHistoryItem[];
    isSending: boolean;
    attachment: { data: string; name: string } | null;
  }>({
    isOpen: false,
    targetImageId: null,
    history: [],
    isSending: false,
    attachment: null,
  });

  const isBrideOptionAvailable = !!brideImage.compressedBase64;
  const isGroomOptionAvailable = !!groomImage.compressedBase64;
  const isCouplePhotoAvailable = !!coupleImage.compressedBase64;
  const isCoupleOptionAvailable = (isBrideOptionAvailable && isGroomOptionAvailable) || isCouplePhotoAvailable;

  const prevAvailabilityRef = useRef({
      bride: isBrideOptionAvailable,
      groom: isGroomOptionAvailable,
      couple: isCoupleOptionAvailable,
      couplePhoto: isCouplePhotoAvailable,
  });

  useEffect(() => {
    const prev = prevAvailabilityRef.current;
    let nextState = { ...selectedOutputs };
  
    if (!prev.bride && isBrideOptionAvailable) nextState.bride = true;
    if (!prev.groom && isGroomOptionAvailable) nextState.groom = true;
    if (!prev.couple && isCoupleOptionAvailable) nextState.couple = true;
    if (!prev.couplePhoto && isCouplePhotoAvailable) nextState.couple = true;
  
    if (!isBrideOptionAvailable && nextState.bride) nextState.bride = false;
    if (!isGroomOptionAvailable && nextState.groom) nextState.groom = false;
    if (!isCoupleOptionAvailable && nextState.couple) nextState.couple = false;
  
    setSelectedOutputs(nextState);
  
    prevAvailabilityRef.current = {
      bride: isBrideOptionAvailable,
      groom: isGroomOptionAvailable,
      couple: isCoupleOptionAvailable,
      couplePhoto: isCouplePhotoAvailable,
    };
  }, [isBrideOptionAvailable, isGroomOptionAvailable, isCoupleOptionAvailable, isCouplePhotoAvailable, selectedOutputs]);


  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, imageType: 'bride' | 'groom' | 'card' | 'inviteBg' | 'couplePhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalBase64 = event.target?.result as string;
      const originalSize = file.size;

      if (imageType === 'inviteBg') {
        const newState = {
          originalBase64,
          originalSize,
          compressedBase64: originalBase64,
          compressedSize: originalSize,
        };
        setWeddingInviteBg(newState);
        return;
      }
      
      try {
        const { compressedBase64, compressedSize } = await compressImage(originalBase64, 0.7);
        const newState = { originalBase64, originalSize, compressedBase64, compressedSize };
        if (imageType === 'bride') setBrideImage(newState);
        else if (imageType === 'groom') setGroomImage(newState);
        else if (imageType === 'couplePhoto') setCoupleImage(newState);
        else if (imageType === 'card') setCardImage(newState);
      } catch (err) {
        setError('Failed to compress image. Please try a different file.');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSelectionChange = (type: GenerationType) => {
    setSelectedOutputs(prev => ({...prev, [type]: !prev[type]}));
  };
  
    const processApiResponse = async (
        response: GenerateContentResponse,
        type: string,
        quality: number = 0.9
    ): Promise<{ state: GeneratedImageState, b64: string } | null> => {
        if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64Data: string = part.inlineData.data;
                    const apiMimeType = part.inlineData.mimeType || 'image/png';
                    const fullBase64 = `data:${apiMimeType};base64,${base64Data}`;
                    const originalSize = atob(base64Data).length;

                    const isIllustration = type.toLowerCase().includes('illustration');
                    const outputFormat = isIllustration ? 'image/png' : 'image/jpeg';
                    
                    const { compressedBase64, compressedSize } = await compressImage(fullBase64, quality, outputFormat);
                    
                    const state: GeneratedImageState = {
                        title: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
                        originalBase64: fullBase64,
                        compressedBase64,
                        originalSize,
                        compressedSize,
                        compressionQuality: quality,
                    };
                    return { state, b64: base64Data };
                }
            }
        }
        return null;
    };


  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setFinalInviteImage(null);

    const brideB64 = brideImage.compressedBase64?.split(',')[1];
    const groomB64 = groomImage.compressedBase64?.split(',')[1];
    const coupleB64 = coupleImage.compressedBase64?.split(',')[1];
    const cardB64 = cardImage.compressedBase64?.split(',')[1];

    const successfulResults: GeneratedImageHistory[] = [];
    const failedReasons: string[] = [];

    let generatedBrideB64: string | null = null;
    let generatedGroomB64: string | null = null;

    try {
        const needsBride = selectedOutputs.bride || (selectedOutputs.couple && brideB64 && groomB64);
        const needsGroom = selectedOutputs.groom || (selectedOutputs.couple && brideB64 && groomB64);
        
        const individualPromises = [];
        if (needsBride && brideB64) {
            individualPromises.push(generateIllustration('bride', { bride: brideB64, card: cardB64 }));
        }
        if (needsGroom && groomB64) {
            individualPromises.push(generateIllustration('groom', { groom: groomB64, card: cardB64 }));
        }
        
        const individualResults = await Promise.allSettled(individualPromises);

        let resultIndex = 0;
        if (needsBride && brideB64) {
            const brideResult = individualResults[resultIndex++];
            if (brideResult.status === 'fulfilled') {
                const processed = await processApiResponse(brideResult.value, 'Bride Illustration');
                if (processed) {
                    generatedBrideB64 = processed.b64;
                    if (selectedOutputs.bride) successfulResults.push({
                        id: `bride-${Date.now()}`,
                        title: 'Bride Illustration',
                        versions: [processed.state],
                        currentVersionIndex: 0,
                    });
                } else {
                    failedReasons.push('No image was generated for the Bride.');
                }
            } else {
                failedReasons.push(`Failed to generate Bride portrait: ${brideResult.reason?.message || 'Unknown reason'}`);
            }
        }

        if (needsGroom && groomB64) {
            const groomResult = individualResults[resultIndex++];
            if (groomResult.status === 'fulfilled') {
                const processed = await processApiResponse(groomResult.value, 'Groom Illustration');
                if (processed) {
                    generatedGroomB64 = processed.b64;
                    if (selectedOutputs.groom) successfulResults.push({
                      id: `groom-${Date.now()}`,
                      title: 'Groom Illustration',
                      versions: [processed.state],
                      currentVersionIndex: 0,
                    });
                } else {
                    failedReasons.push('No image was generated for the Groom.');
                }
            } else {
                failedReasons.push(`Failed to generate Groom portrait: ${groomResult.reason?.message || 'Unknown reason'}`);
            }
        }
        
        setGeneratedImages([...successfulResults]);

        if (selectedOutputs.couple) {
            if (generatedBrideB64 && generatedGroomB64) {
                try {
                    const response = await combineIllustrations(generatedBrideB64, generatedGroomB64, cardB64, coupleB64);
                    const processed = await processApiResponse(response, 'Couple Illustration');
                    if (processed) {
                        successfulResults.push({
                            id: `couple-${Date.now()}`,
                            title: 'Couple Illustration',
                            versions: [processed.state],
                            currentVersionIndex: 0,
                        });
                    } else {
                        failedReasons.push('Failed to generate Couple illustration from combined portraits.');
                    }
                } catch(e: any) {
                    failedReasons.push(`Failed to combine portraits: ${e.message}`);
                }
            } else if (coupleB64) {
                 try {
                    const response = await generateIllustration('couple', { couplePhoto: coupleB64, card: cardB64 });
                    const processed = await processApiResponse(response, 'Couple Illustration');
                    if (processed) {
                        successfulResults.push({
                            id: `couple-${Date.now()}`,
                            title: 'Couple Illustration',
                            versions: [processed.state],
                            currentVersionIndex: 0,
                        });
                    } else {
                        failedReasons.push('Failed to generate Couple illustration from the provided photo.');
                    }
                } catch(e: any) {
                    failedReasons.push(`Failed to generate from couple photo: ${e.message}`);
                }
            } else {
                failedReasons.push('Couple illustration could not be created. Please provide either a photo of the couple, or photos of both the bride and groom.');
            }
        }

        setGeneratedImages(successfulResults);

        if (generateInvite && weddingInviteBg.compressedBase64) {
            const coupleHistory = successfulResults.find(img => img.title.includes('Couple'));
            const brideHistory = successfulResults.find(img => img.title.includes('Bride'));
            const groomHistory = successfulResults.find(img => img.title.includes('Groom'));
            
            const getLatestVersion = (history?: GeneratedImageHistory) => history?.versions[history.currentVersionIndex];
            
            const illustrationToUse = getLatestVersion(coupleHistory) || getLatestVersion(brideHistory) || getLatestVersion(groomHistory);

            if (illustrationToUse && illustrationToUse.originalBase64) {
                try {
                    const illustrationB64 = illustrationToUse.originalBase64.split(',')[1];
                    const invitationCardB64 = weddingInviteBg.compressedBase64.split(',')[1];
                    
                    const response = await createFinalInvitation(illustrationB64, invitationCardB64);
                    
                    const processed = await processApiResponse(response, 'Final Wedding Invitation', 0.95);
                    if (processed) {
                        setFinalInviteImage({
                            id: `final-invite-${Date.now()}`,
                            title: 'Final Wedding Invitation',
                            versions: [processed.state],
                            currentVersionIndex: 0,
                        });
                    } else {
                        failedReasons.push("The AI failed to generate the final invitation image.");
                    }
                } catch (e: any) {
                    failedReasons.push(`Failed to create the final invitation: ${e.message}`);
                }
            } else if (successfulResults.length > 0) {
                 failedReasons.push('Could not create final invite because no illustration was successfully generated to place on it.');
            } else {
                failedReasons.push('Skipping invitation generation as no base illustrations were created.');
            }
        }


        if (failedReasons.length > 0) {
            setError(failedReasons.join('\n'));
        }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(e);
      setError(`Failed to generate illustrations. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [brideImage, groomImage, coupleImage, cardImage, selectedOutputs, generateInvite, weddingInviteBg.compressedBase64]);

    const handleOutputCompressionChange = useCallback(async (imageId: string, versionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuality = parseFloat(e.target.value);
        const findAndApply = (setter: React.Dispatch<React.SetStateAction<any>>, findLogic: (img: GeneratedImageHistory) => boolean) => {
            setter((prev: any) => {
                const update = (img: GeneratedImageHistory) => {
                    if (findLogic(img)) {
                        const originalImage = img.versions[versionIndex];
                        if (!originalImage || !originalImage.originalBase64) return img;

                        const updatedVersions = [...img.versions];
                        updatedVersions[versionIndex] = { ...originalImage, compressionQuality: newQuality };
                        
                        compressImage(originalImage.originalBase64, newQuality).then(({ compressedBase64, compressedSize }) => {
                            setter((prevAgain: any) => {
                                const updateAgain = (imgAgain: GeneratedImageHistory) => {
                                    if(findLogic(imgAgain)) {
                                        const finalVersions = [...imgAgain.versions];
                                        finalVersions[versionIndex] = { ...finalVersions[versionIndex], compressedBase64, compressedSize };
                                        return { ...imgAgain, versions: finalVersions };
                                    }
                                    return imgAgain;
                                }
                                return Array.isArray(prevAgain) ? prevAgain.map(updateAgain) : (prevAgain ? updateAgain(prevAgain) : null);
                            });
                        }).catch(error => {
                            console.error("Output compression failed:", error);
                            setError("Failed to re-compress the generated image.");
                        });
                        
                        return { ...img, versions: updatedVersions };
                    }
                    return img;
                }

                return Array.isArray(prev) ? prev.map(update) : (prev ? update(prev) : null);
            });
        };

        findAndApply(setGeneratedImages, img => img.id === imageId);
        findAndApply(setFinalInviteImage, img => img.id === imageId);
    }, []);

    const handleDownload = useCallback((imageId: string) => {
        const allImages = [...generatedImages, finalInviteImage].filter(Boolean) as GeneratedImageHistory[];
        const imageHistory = allImages.find(img => img.id === imageId);
        if (!imageHistory) return;
        
        const imageToDownload = imageHistory.versions[imageHistory.currentVersionIndex];
        if (!imageToDownload?.compressedBase64) return;

        const link = document.createElement('a');
        link.href = imageToDownload.compressedBase64;
        
        const isPng = imageToDownload.compressedBase64.startsWith('data:image/png');
        const extension = isPng ? 'png' : 'jpg';
        const fileName = `${imageToDownload.title.toLowerCase().replace(/ /g, '-')}-v${imageHistory.currentVersionIndex + 1}.${extension}`;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImages, finalInviteImage]);

    const getIsGenerateDisabled = () => {
        if (isLoading) return true;
        const { bride, groom, couple } = selectedOutputs;
        if (!bride && !groom && !couple) return true;

        if (bride && !brideImage.compressedBase64) return true;
        if (groom && !groomImage.compressedBase64) return true;
        if (couple && !isCoupleOptionAvailable) return true;
        if (generateInvite && !weddingInviteBg.compressedBase64) return true;
        
        return false;
    };
    const isGenerateDisabled = getIsGenerateDisabled();

    // --- Versioning and Chat ---
    const handleVersionChange = (imageId: string, direction: 'next' | 'prev') => {
        const findAndApply = (setter: React.Dispatch<React.SetStateAction<any>>, findLogic: (img: GeneratedImageHistory) => boolean) => {
             setter((prev: any) => {
                const update = (img: GeneratedImageHistory) => {
                    if (findLogic(img)) {
                        let newIndex = img.currentVersionIndex;
                        if (direction === 'next' && newIndex < img.versions.length - 1) newIndex++;
                        if (direction === 'prev' && newIndex > 0) newIndex--;
                        return { ...img, currentVersionIndex: newIndex };
                    }
                    return img;
                };
                return Array.isArray(prev) ? prev.map(update) : (prev ? update(prev) : null);
            });
        };
        findAndApply(setGeneratedImages, img => img.id === imageId);
        findAndApply(setFinalInviteImage, img => img.id === imageId);
    };

    const handleOpenChat = (imageId: string) => {
        setChatState({ isOpen: true, targetImageId: imageId, history: [], isSending: false, attachment: null });
    };

    const handleCloseChat = () => {
        setChatState({ isOpen: false, targetImageId: null, history: [], isSending: false, attachment: null });
    };

    const handleSendMessage = async (message: string) => {
      if (!chatState.targetImageId || (!message.trim() && !chatState.attachment) || chatState.isSending) return;
    
        const newHistoryEntry: ChatHistoryItem = {
            role: 'user',
            text: message,
        };
        if (chatState.attachment) {
            newHistoryEntry.image = chatState.attachment.data;
        }

        const newHistory = [...chatState.history, newHistoryEntry];
        setChatState(prev => ({ ...prev, isSending: true, history: newHistory, attachment: null }));
    
        try {
            const allImages = [...generatedImages, finalInviteImage].filter(Boolean) as GeneratedImageHistory[];
            const targetImageHistory = allImages.find(img => img.id === chatState.targetImageId);
            if (!targetImageHistory) throw new Error("Target image for refinement not found.");
    
            const currentVersion = targetImageHistory.versions[targetImageHistory.currentVersionIndex];
            const base64ToRefine = currentVersion.originalBase64?.split(',')[1];
            const mimeType = currentVersion.originalBase64?.match(/data:(.*);base64,/)?.[1] || 'image/png';
    
            if (!base64ToRefine) throw new Error("Could not get image data for refinement.");
    
            const response = await refineIllustration(base64ToRefine, mimeType, newHistory);
            const newTitle = `${targetImageHistory.title} V${targetImageHistory.versions.length + 1}`;
            const processed = await processApiResponse(response, newTitle);
    
            if (processed) {
                const findAndApply = (setter: React.Dispatch<React.SetStateAction<any>>, findLogic: (img: GeneratedImageHistory) => boolean) => {
                    setter((prev: any) => {
                        const update = (img: GeneratedImageHistory) => {
                            if (findLogic(img)) {
                                const newVersions = [...img.versions, processed.state];
                                return { ...img, versions: newVersions, currentVersionIndex: newVersions.length - 1 };
                            }
                            return img;
                        };
                        return Array.isArray(prev) ? prev.map(update) : (prev ? update(prev) : null);
                    });
                };
                findAndApply(setGeneratedImages, img => img.id === chatState.targetImageId);
                findAndApply(setFinalInviteImage, img => img.id === chatState.targetImageId);
    
                const textResponse = response.text;
                if (textResponse) {
                    setChatState(prev => ({ ...prev, history: [...prev.history, { role: 'model', text: textResponse }] }));
                }
            } else {
                throw new Error("The AI did not return a new image. Please try rephrasing your request.");
            }
    
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during refinement.";
            setChatState(prev => ({ ...prev, history: [...prev.history, { role: 'model', text: `Sorry, an error occurred: ${errorMessage}` }] }));
        } finally {
            setChatState(prev => ({ ...prev, isSending: false }));
        }
    };
    
    const handleChatAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('File is too large. Please select an image under 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setChatState(prev => ({
                ...prev,
                attachment: { data: base64, name: file.name }
            }));
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Allow selecting the same file again
    };
    
    const handleRemoveAttachment = () => {
        setChatState(prev => ({ ...prev, attachment: null }));
    };


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
            Create beautiful, hand-drawn style illustrations for your wedding invitations in just a few clicks.
          </p>
        </header>

        <main>
          <div className="mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
            <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 1: Upload Your Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ImageUploader title="Bride's Headshot" imageState={brideImage} onFileChange={(e) => handleFileChange(e, 'bride')} id="bride-upload" isHeadshot={true} />
              <ImageUploader title="Groom's Headshot" imageState={groomImage} onFileChange={(e) => handleFileChange(e, 'groom')} id="groom-upload" isHeadshot={true} />
              <ImageUploader title="Couple's Photo (Optional)" imageState={coupleImage} onFileChange={(e) => handleFileChange(e, 'couplePhoto')} id="couple-upload" />
              <ImageUploader title="Invitation Style (Optional)" imageState={cardImage} onFileChange={(e) => handleFileChange(e, 'card')} id="card-upload" />
            </div>
          </div>

           <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
              <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 2: Choose What to Create</h2>
              <fieldset className="max-w-3xl mx-auto mb-6 p-4 border-2 border-dashed border-[#C19A6B] rounded-xl">
                  <legend className="px-2 font-semibold text-lg text-[#5D4037]">Generation Options</legend>
                  <div className="flex justify-center items-center gap-4 sm:gap-8 flex-wrap mt-2">
                      <Checkbox id="bride-check" label="Bride Portrait" checked={selectedOutputs.bride} onChange={() => handleSelectionChange('bride')} disabled={!isBrideOptionAvailable} />
                      <Checkbox id="groom-check" label="Groom Portrait" checked={selectedOutputs.groom} onChange={() => handleSelectionChange('groom')} disabled={!isGroomOptionAvailable} />
                      <Checkbox id="couple-check" label="Couple Illustration" checked={selectedOutputs.couple} onChange={() => handleSelectionChange('couple')} disabled={!isCoupleOptionAvailable} />
                      <Checkbox id="invite-check" label="Final Invitation" checked={generateInvite} onChange={() => setGenerateInvite(prev => !prev)} />
                  </div>
              </fieldset>

              {generateInvite && (
                <div className="max-w-md mx-auto my-6 p-4 bg-white/50 rounded-xl border-2 border-[#E0D5C1] animate-fade-in">
                    <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">Upload Your Invitation</h3>
                    <ImageUploader title="" imageState={weddingInviteBg} onFileChange={(e) => handleFileChange(e, 'inviteBg')} id="invite-bg-upload" />
                </div>
              )}

            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className="relative inline-flex items-center justify-center px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-[#C19A6B] to-[#8D6E63] rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Generate wedding illustrations and invitation"
            >
              {isLoading ? ( <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Creating...</> ) : (generateInvite ? 'Generate All' : 'Generate Illustrations')}
            </button>
          </div>
          
          <ChatModal 
            chatState={chatState}
            onClose={handleCloseChat}
            onSendMessage={handleSendMessage}
            onAttachmentChange={handleChatAttachment}
            onRemoveAttachment={handleRemoveAttachment}
            targetImageTitle={
                [...generatedImages, finalInviteImage].filter(Boolean).find(img => img?.id === chatState.targetImageId)?.title || ''
            }
          />

          {isLoading && <Loader />}
          
          {error && !isLoading && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md max-w-3xl mx-auto my-4 whitespace-pre-wrap" role="alert"> <p className="font-bold">An Error Occurred</p> <p>{error}</p> </div> )}
          
          {(generatedImages.length > 0 || finalInviteImage) && (
            <div className="mt-12 animate-fade-in">
              <h2 className="text-3xl font-bold mb-6 text-center text-[#5D4037]">Your Custom Creations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {generatedImages.map((imageHistory) => {
                      const currentVersion = imageHistory.versions[imageHistory.currentVersionIndex];
                      const isPng = !!currentVersion.compressedBase64?.startsWith('data:image/png');
                      return (
                        <OutputDisplay 
                            key={imageHistory.id} 
                            generatedImageHistory={imageHistory} 
                            onCompressionChange={(e) => handleOutputCompressionChange(imageHistory.id, imageHistory.currentVersionIndex, e)} 
                            onDownload={() => handleDownload(imageHistory.id)} 
                            onRefine={() => handleOpenChat(imageHistory.id)}
                            onVersionChange={(dir) => handleVersionChange(imageHistory.id, dir)}
                            showTransparency={isPng}
                            isQualityAdjustable={!isPng}
                        />
                      );
                  })}
                  {finalInviteImage && (
                    <OutputDisplay
                        generatedImageHistory={finalInviteImage}
                        onCompressionChange={(e) => handleOutputCompressionChange(finalInviteImage.id, finalInviteImage.currentVersionIndex, e)}
                        onDownload={() => handleDownload(finalInviteImage.id)}
                        onRefine={() => handleOpenChat(finalInviteImage.id)}
                        onVersionChange={(dir) => handleVersionChange(finalInviteImage.id, dir)}
                        isQualityAdjustable={true}
                        showTransparency={false}
                    />
                  )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

interface ChatModalProps {
    chatState: {
        isOpen: boolean;
        history: ChatHistoryItem[];
        isSending: boolean;
        attachment: { data: string; name: string } | null;
    };
    onClose: () => void;
    onSendMessage: (msg: string) => void;
    onAttachmentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: () => void;
    targetImageTitle: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ chatState, onClose, onSendMessage, onAttachmentChange, onRemoveAttachment, targetImageTitle }) => {
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatState.history]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(message);
        setMessage('');
    };

    if (!chatState.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="chat-title">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col transform transition-all animate-fade-in-up">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 id="chat-title" className="text-xl font-bold text-[#5D4037]">Refine: <span className="text-[#C19A6B]">{targetImageTitle}</span></h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600" aria-label="Close chat">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatState.history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#8D6E63] text-white rounded-br-lg' : 'bg-gray-200 text-[#5D4037] rounded-bl-lg'}`}>
                                {msg.image && (
                                    <img src={msg.image} alt="User reference" className="mb-2 rounded-lg max-w-full h-auto" />
                                )}
                                {msg.text && <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.text}</p>}
                            </div>
                        </div>
                    ))}
                     {chatState.isSending && (
                        <div className="flex justify-start">
                            <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-gray-200 text-[#5D4037] rounded-bl-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="border-t bg-gray-50 rounded-b-2xl">
                    {chatState.attachment && (
                        <div className="p-2 border-b bg-gray-100 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <img src={chatState.attachment.data} className="w-10 h-10 rounded object-cover flex-shrink-0" alt="Attachment preview" />
                                <span className="truncate text-gray-600 font-medium">{chatState.attachment.name}</span>
                            </div>
                            <button onClick={onRemoveAttachment} type="button" className="p-1 rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-700" aria-label="Remove attachment">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                    <div className="p-4 flex items-center space-x-2">
                        <input type="file" ref={attachmentInputRef} onChange={onAttachmentChange} className="hidden" accept="image/jpeg, image/png, image/webp" />
                        <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={chatState.isSending} className="p-2 text-gray-500 hover:text-[#8D6E63] rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Attach image">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); e.preventDefault(); } }}
                            placeholder="e.g., 'Make her look more like this...'"
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C19A6B] focus:border-[#C19A6B] resize-none"
                            rows={2}
                            disabled={chatState.isSending}
                            aria-label="Your refinement request"
                        />
                        <button type="submit" disabled={(!message.trim() && !chatState.attachment) || chatState.isSending} className="p-3 bg-[#C19A6B] text-white rounded-full hover:bg-[#8D6E63] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" aria-label="Send message">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CheckboxProps { id: string; label: string; checked: boolean; onChange: () => void; disabled?: boolean; }
const Checkbox: React.FC<CheckboxProps> = ({ id, label, checked, onChange, disabled = false }) => ( <div className="flex items-center"> <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="h-5 w-5 rounded border-gray-300 text-[#C19A6B] focus:ring-[#8D6E63] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" /> <label htmlFor={id} className={`ml-2 text-md font-medium text-[#5D4037] ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}> {label} </label> </div> );

interface ImageUploaderProps { title: string; imageState: ImageState; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; id: string; isHeadshot?: boolean; }
const ImageUploader: React.FC<ImageUploaderProps> = ({ title, imageState, onFileChange, id, isHeadshot = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleAreaClick = () => inputRef.current?.click();

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-[#E0D5C1] transition-shadow duration-300 hover:shadow-xl flex flex-col">
            {title && <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">{title}</h3>}
            <input type="file" id={id} ref={inputRef} onChange={onFileChange} className="hidden" accept="image/jpeg, image/png, image/webp" aria-label={`Upload ${title}`} />
            <div onClick={handleAreaClick} className="flex-grow flex items-center justify-center aspect-w-3 aspect-h-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#C19A6B] transition-colors cursor-pointer bg-gray-50 p-2" role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAreaClick()} >
                {imageState.originalBase64 ? ( <img src={imageState.originalBase64} alt={`${title} preview`} className="max-h-full max-w-full object-contain rounded-md" /> ) : ( <div className="text-center text-gray-500"> <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> <p className="mt-2">{title ? 'Click to upload image' : 'Upload invitation'}</p> </div> )}
            </div>
             {isHeadshot && !imageState.originalSize && ( <p className="text-xs text-center text-gray-500 mt-2"> Tip: Use a clear, forward-facing headshot for best results. </p> )}
            {imageState.originalSize && imageState.compressedSize && ( <div className="text-center text-sm text-gray-600 mt-3 bg-gray-100 p-2 rounded-md"> <p>Original: <span className="font-medium">{formatBytes(imageState.originalSize)}</span> | Compressed: <span className="font-medium text-green-700">{formatBytes(imageState.compressedSize)}</span></p> </div> )}
        </div>
    );
};

interface OutputDisplayProps { generatedImageHistory: GeneratedImageHistory; onCompressionChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onDownload: () => void; onRefine: () => void; onVersionChange: (direction: 'next' | 'prev') => void; showTransparency?: boolean; isQualityAdjustable?: boolean; }
const OutputDisplay: React.FC<OutputDisplayProps> = ({ generatedImageHistory, onCompressionChange, onDownload, onRefine, onVersionChange, showTransparency = false, isQualityAdjustable = true }) => {
    const [showGrid, setShowGrid] = useState(showTransparency);
    const currentVersion = generatedImageHistory.versions[generatedImageHistory.currentVersionIndex];
    const hasMultipleVersions = generatedImageHistory.versions.length > 1;

    useEffect(() => {
        setShowGrid(showTransparency);
    }, [showTransparency]);

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
                     <Checkbox id={`grid-toggle-${currentVersion.title.replace(/\s+/g, '-')}`} label="Show Transparency Grid" checked={showGrid} onChange={() => setShowGrid(prev => !prev)} />
                </div>
            )}
            <div className="mb-4">
                <label htmlFor={`compression-${currentVersion.title}`} className="block text-md font-medium text-[#5D4037] mb-2">Adjust Image Quality</label>
                <div className="flex items-center gap-4">
                    <input id={`compression-${currentVersion.title}`} type="range" min="0.1" max="1" step="0.05" value={currentVersion.compressionQuality} onChange={onCompressionChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed" aria-label={`Adjust compression quality for ${currentVersion.title}`} disabled={!isQualityAdjustable} />
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

export default App;