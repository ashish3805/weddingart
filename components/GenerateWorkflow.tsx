
import React from 'react';
import { ImageState, GenerationType } from '../types';
import { ImageUploader } from './ImageUploader';
import { Checkbox } from './Checkbox';

interface GenerateWorkflowProps {
  imageStates: {
    bride: ImageState;
    groom: ImageState;
    couple: ImageState;
    card: ImageState;
    weddingInviteBg: ImageState;
  };
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, imageType: 'bride' | 'groom' | 'card' | 'inviteBg' | 'couplePhoto') => void;
  selectedOutputs: Record<GenerationType, boolean>;
  onSelectionChange: (type: GenerationType) => void;
  generateInvite: boolean;
  onGenerateInviteChange: (checked: boolean) => void;
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  isLoading: boolean;
  availability: {
    bride: boolean;
    groom: boolean;
    couple: boolean;
  }
}

export const GenerateWorkflow: React.FC<GenerateWorkflowProps> = ({
  imageStates,
  onFileChange,
  selectedOutputs,
  onSelectionChange,
  generateInvite,
  onGenerateInviteChange,
  onGenerate,
  isGenerateDisabled,
  isLoading,
  availability,
}) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
        <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 1: Upload Your Photos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageUploader title="Bride's Headshot" imageState={imageStates.bride} onFileChange={(e) => onFileChange(e, 'bride')} id="bride-upload" isHeadshot={true} />
          <ImageUploader title="Groom's Headshot" imageState={imageStates.groom} onFileChange={(e) => onFileChange(e, 'groom')} id="groom-upload" isHeadshot={true} />
          <ImageUploader title="Couple's Photo (Optional)" imageState={imageStates.couple} onFileChange={(e) => onFileChange(e, 'couplePhoto')} id="couple-upload" />
          <ImageUploader title="Invitation Style (Optional)" imageState={imageStates.card} onFileChange={(e) => onFileChange(e, 'card')} id="card-upload" />
        </div>
      </div>

      <div className="text-center mb-10 p-6 bg-white/60 rounded-2xl shadow-lg border-2 border-[#E0D5C1]">
          <h2 className="text-2xl font-bold text-center mb-4 text-[#5D4037]">Step 2: Choose Options & Generate</h2>
          <fieldset className="max-w-3xl mx-auto mb-6 p-4 border-2 border-dashed border-[#C19A6B] rounded-xl">
              <legend className="px-2 font-semibold text-lg text-[#5D4037]">Generation Options</legend>
              <div className="flex justify-center items-center gap-4 sm:gap-8 flex-wrap mt-2">
                  <Checkbox id="bride-check" label="Bride Portrait" checked={selectedOutputs.bride} onChange={() => onSelectionChange('bride')} disabled={!availability.bride} />
                  <Checkbox id="groom-check" label="Groom Portrait" checked={selectedOutputs.groom} onChange={() => onSelectionChange('groom')} disabled={!availability.groom} />
                  <Checkbox id="couple-check" label="Couple Illustration" checked={selectedOutputs.couple} onChange={() => onSelectionChange('couple')} disabled={!availability.couple} />
                  <Checkbox id="invite-check" label="Final Invitation" checked={generateInvite} onChange={() => onGenerateInviteChange(!generateInvite)} />
              </div>
          </fieldset>

          {generateInvite && (
            <div className="max-w-md mx-auto my-6 p-4 bg-white/50 rounded-xl border-2 border-[#E0D5C1] animate-fade-in">
                <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">Upload Your Invitation</h3>
                <ImageUploader title="" imageState={imageStates.weddingInviteBg} onFileChange={(e) => onFileChange(e, 'inviteBg')} id="invite-bg-upload" />
            </div>
          )}

        <button
          onClick={onGenerate}
          disabled={isGenerateDisabled}
          className="relative inline-flex items-center justify-center px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-[#C19A6B] to-[#8D6E63] rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          aria-label="Generate wedding illustrations and invitation"
        >
          {isLoading ? ( <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Creating...</> ) : (generateInvite ? 'Generate All' : 'Generate Illustrations')}
        </button>
      </div>
    </div>
  );
};
