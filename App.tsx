
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateIllustration, combineIllustrations, createFinalInvitation, refineIllustration } from './services/geminiService';
import type { GenerateContentResponse } from '@google/genai';

// Import from new modules
import { ImageState, GeneratedImageState, GeneratedImageHistory, GenerationType, ChatHistoryItem, ChatState } from './types';
import { compressImage } from './utils/imageUtils';
import { CoupleIcon } from './components/CoupleIcon';
import { Loader } from './components/Loader';
import { Checkbox } from './components/Checkbox';
import { ImageUploader } from './components/ImageUploader';
import { OutputDisplay } from './components/OutputDisplay';
import { ChatModal } from './components/ChatModal';

const initialImageState: ImageState = {
  originalBase64: null,
  compressedBase64: null,
  originalSize: null,
  compressedSize: null,
};

type Workflow = 'generate' | 'refine';

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

  // State for the new "refine existing" feature
  const [refinementImage, setRefinementImage] = useState<ImageState>(initialImageState);
  const [refinementImageType, setRefinementImageType] = useState<GenerationType | null>(null);

  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    targetImageId: null,
    history: [],
    isSending: false,
    attachment: null,
  });
  
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow>('generate');


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
  }, [isBrideOptionAvailable, isGroomOptionAvailable, isCoupleOptionAvailable, isCouplePhotoAvailable]);


  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, imageType: 'bride' | 'groom' | 'card' | 'inviteBg' | 'couplePhoto' | 'refine') => {
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
        else if (imageType === 'refine') setRefinementImage(newState);
      } catch (err) {
        setError('Failed to compress image. Please try a different file.');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleStartRefining = useCallback(() => {
    if (!refinementImage.compressedBase64 || !refinementImageType) return;

    // Clear main generation inputs to reduce user confusion
    setBrideImage(initialImageState);
    setGroomImage(initialImageState);
    setCoupleImage(initialImageState);
    setCardImage(initialImageState);
    setSelectedOutputs({ bride: false, groom: false, couple: false });

    const titleMap: Record<GenerationType, string> = {
        bride: 'Bride Illustration',
        groom: 'Groom Illustration',
        couple: 'Couple Illustration',
    };

    const newImageState: GeneratedImageState = {
        originalBase64: refinementImage.originalBase64,
        compressedBase64: refinementImage.compressedBase64,
        originalSize: refinementImage.originalSize,
        compressedSize: refinementImage.compressedSize,
        title: titleMap[refinementImageType],
        compressionQuality: refinementImage.compressedBase64.startsWith('data:image/png') ? 1.0 : 0.9,
    };

    const newHistory: GeneratedImageHistory = {
        id: `refine-${Date.now()}`,
        title: titleMap[refinementImageType],
        versions: [newImageState],
        currentVersionIndex: 0,
    };

    // Prepend to the list so it appears at the top
    setGeneratedImages(prev => [newHistory, ...prev]);

    // Reset the refinement UI state
    setRefinementImage(initialImageState);
    setRefinementImageType(null);
  }, [refinementImage, refinementImageType]);

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
          <div className="mb-10 p-2 bg-white/60 rounded-full shadow-lg border-2 border-[#E0D5C1] max-w-lg mx-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveWorkflow('generate')}
              className={`px-4 py-3 text-lg font-bold rounded-full transition-all duration-300 ease-in-out ${activeWorkflow === 'generate' ? 'bg-gradient-to-r from-[#C19A6B] to-[#8D6E63] text-white shadow-md' : 'text-[#5D4037] hover:bg-white/80'}`}
              aria-pressed={activeWorkflow === 'generate'}
            >
              ✨ Generate New
            </button>
            <button
              onClick={() => setActiveWorkflow('refine')}
              className={`px-4 py-3 text-lg font-bold rounded-full transition-all duration-300 ease-in-out ${activeWorkflow === 'refine' ? 'bg-gradient-to-r from-[#C19A6B] to-[#8D6E63] text-white shadow-md' : 'text-[#5D4037] hover:bg-white/80'}`}
              aria-pressed={activeWorkflow === 'refine'}
            >
              🎨 Refine Existing
            </button>
          </div>

          {activeWorkflow === 'generate' && (
            <div className="animate-fade-in">
              <div className="mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
                <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 1: Upload Your Photos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ImageUploader title="Bride's Headshot" imageState={brideImage} onFileChange={(e) => handleFileChange(e, 'bride')} id="bride-upload" isHeadshot={true} />
                  <ImageUploader title="Groom's Headshot" imageState={groomImage} onFileChange={(e) => handleFileChange(e, 'groom')} id="groom-upload" isHeadshot={true} />
                  <ImageUploader title="Couple's Photo (Optional)" imageState={coupleImage} onFileChange={(e) => handleFileChange(e, 'couplePhoto')} id="couple-upload" />
                  <ImageUploader title="Invitation Style (Optional)" imageState={cardImage} onFileChange={(e) => handleFileChange(e, 'card')} id="card-upload" />
                </div>
              </div>

              <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
                  <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 2: Choose Options & Generate</h2>
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
            </div>
          )}

          {activeWorkflow === 'refine' && (
            <div className="animate-fade-in">
                <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
                <h2 className="text-2xl font-bold text-center mb-1 text-[#5D4037]">Refine an Existing Illustration</h2>
                <p className="text-gray-500 mb-6">Already have an illustration? Upload it here to start refining with our AI chat.</p>
                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <ImageUploader 
                        title="Upload Your Illustration" 
                        imageState={refinementImage} 
                        onFileChange={(e) => handleFileChange(e, 'refine')} 
                        id="refine-upload"
                    />
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="type-select" className="block text-lg font-medium text-[#5D4037] mb-2 text-left">1. Select Illustration Type</label>
                            <select
                                id="type-select"
                                value={refinementImageType || ''}
                                onChange={(e) => setRefinementImageType(e.target.value as GenerationType)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C19A6B] focus:border-[#C19A6B]"
                            >
                                <option value="" disabled>-- Please select --</option>
                                <option value="bride">Bride Illustration</option>
                                <option value="groom">Groom Illustration</option>
                                <option value="couple">Couple Illustration</option>
                            </select>
                        </div>
                        <button
                            onClick={handleStartRefining}
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
          )}
          
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
                      const isPng = !!currentVersion?.compressedBase64?.startsWith('data:image/png');
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

export default App;
