
import { GoogleGenAI, Modality, GenerateContentResponse, Part } from '@google/genai';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash-image-preview';

type GenerationType = 'bride' | 'groom' | 'couple';
interface ImageInputs {
    bride?: string;
    groom?: string;
    couplePhoto?: string;
    card?: string;
}

interface ChatHistoryItem {
    role: 'user' | 'model';
    text: string;
    image?: string;
}

const getBasePrompt = (cardProvided: boolean) => {
    const styleAndToneInstructions = cardProvided
        ? "The overall mood, color palette, and artistic elegance of your illustration must blend seamlessly with the aesthetic of the provided wedding card image. Use warm, celebratory tones that match the invitation."
        : "Use warm, celebratory, and elegant tones suitable for a wedding invitation.";

    return `
You are an expert wedding invitation illustrator. Your task is to create a single, cohesive, hand-illustrated style artistic drawing.

**Artistic Requirements:**
- **Style:** The final output must be a refined, elegant, hand-drawn illustration. It should look like a polished piece of digital art, not a photo or a simple filtered image.
- **Aesthetic Integration:** ${styleAndToneInstructions}
- **Output Specification:**
  - The output must be a single image file.
  - Do not include any text, borders, or other elements from the invitation card in the final image.
  - The background must be fully transparent. Do not add any color, texture, or objects to the background.
`;
};

const getPrompts = (
    cardProvided: boolean,
    couplePhotoProvided: boolean,
    attire?: { bride?: string; groom?: string }
): Record<GenerationType, string> => {
    const brideAttireInstruction = attire?.bride
        ? `Dress her in ${attire.bride}.`
        : 'Dress her in a graceful and beautiful traditional Indian lehenga with delicate, complementary jewelry.';
    const groomAttireInstruction = attire?.groom
        ? `Dress him in ${attire.groom}.`
        : 'Dress him in a handsome and elegant traditional Indian sherwani.';
    const coupleAttireInstruction = `
    - **Groom:** ${groomAttireInstruction}
    - **Bride:** ${brideAttireInstruction}
    `;

    return {
        bride: `
            ${getBasePrompt(cardProvided)}
            **Primary Goal: Recognizable Likeness of the Bride**
            - Create a solo portrait of the Indian bride.
            - The most important requirement is to ensure the illustrated bride is clearly and accurately recognizable as the individual from the provided headshot photo.
            - Pay very close attention to her specific facial features. Capture her unique likeness, including face shape, eyes, nose, and smile.
            - ${brideAttireInstruction} She should look happy and celebratory.
        `,
        groom: `
            ${getBasePrompt(cardProvided)}
            **Primary Goal: Recognizable Likeness of the Groom**
            - Create a solo portrait of the Indian groom.
            - The most important requirement is to ensure the illustrated groom is clearly and accurately recognizable as the individual from the provided headshot photo.
            - Pay very close attention to his specific facial features. Capture his unique likeness, including face shape, eyes, nose, and smile.
            - ${groomAttireInstruction} He should look happy and celebratory.
        `,
        couple: `
            ${getBasePrompt(cardProvided)}
            **Primary Goal: Recognizable Likeness of the Couple**
            - Create a portrait of the Indian wedding couple together.
            - The most important requirement is to ensure the illustrated couple is clearly and accurately recognizable as the individuals from their respective photos.
            ${couplePhotoProvided ? "- A photo of the couple together has been provided. Use this as the primary reference for their likeness, pose, interaction, and relative heights." : "- Pay very close attention to the specific facial features of the bride from her image and the groom from his. Capture their unique likenesses."}
            - **Attire:**${coupleAttireInstruction}
            - **Composition:** They should be posed together, looking happy and celebratory.
        `,
    };
};

export const generateIllustration = async (
  type: GenerationType,
  images: ImageInputs,
  attire?: { bride?: string; groom?: string }
): Promise<GenerateContentResponse> => {
  const cardProvided = !!images.card;
  const couplePhotoProvided = !!images.couplePhoto;
  const prompts = getPrompts(cardProvided, couplePhotoProvided, attire);
  const prompt = prompts[type];
  const parts: Part[] = [{ text: prompt }];

  if ((type === 'bride' || (type === 'couple' && !images.couplePhoto)) && images.bride) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.bride },
    });
  }

  if ((type === 'groom' || (type === 'couple' && !images.couplePhoto)) && images.groom) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.groom },
    });
  }
  
  if (type === 'couple' && images.couplePhoto) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.couplePhoto },
    });
  }

  if (cardProvided && images.card) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.card },
    });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return response;
};

export const combineIllustrations = async (
  brideIllustration: string,
  groomIllustration: string,
  card?: string,
  couplePhoto?: string,
): Promise<GenerateContentResponse> => {
  const cardProvided = !!card;
  const couplePhotoProvided = !!couplePhoto;
  
  const styleInstruction = cardProvided
    ? "The overall mood, color palette, and artistic elegance must blend seamlessly with the aesthetic of the provided wedding card image."
    : "The final image should have warm, celebratory, and elegant tones suitable for a wedding invitation.";

    const poseInstruction = couplePhotoProvided
    ? "A photo of the couple has also been provided. Use this photo as a strong reference for their pose, interaction, and overall composition."
    : "Arrange the bride and groom together in a natural, celebratory pose suitable for a wedding portrait.";

  const prompt = `
You are an expert digital artist specializing in combining portraits. Your task is to take the two provided illustrations—one of a bride and one of a groom—and merge them into a single, cohesive couple's portrait.

**Core Instructions:**
1.  **Preserve Style and Features:** It is crucial that you maintain the exact art style, facial features, colors, and attire from the individual illustrations. Do not redraw or reinterpret the characters.
2.  **Combine and Compose:** ${poseInstruction} They should look like they are in the same scene.
3.  **Aesthetic Integration:** ${styleInstruction}
4.  **Output:** The output must be a single image file of the couple. The background **must be fully transparent**. Do not add text, borders, or any background color.
`;

  const parts: Part[] = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: brideIllustration } },
    { inlineData: { mimeType: 'image/png', data: groomIllustration } }
  ];

  if (couplePhotoProvided && couplePhoto) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: couplePhoto } });
  }

  if (cardProvided && card) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: card },
    });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return response;
};

export const createFinalInvitation = async (
  illustrationB64: string,
  invitationCardB64: string
): Promise<GenerateContentResponse> => {
  const prompt = `
    You are an expert image editor specializing in graphic design. Your task is to place a couple's illustration (second image) onto a wedding invitation background (first image).

    **THE GOLDEN RULE: DO NOT COVER ANY TEXT.**
    This is the most critical instruction. The final image must have ALL original text from the invitation perfectly preserved and 100% readable. No text should be covered, overlapped, or made difficult to read. Violating this rule is a complete failure.

    **Your process must be:**
    1.  **Analyze the Invitation Layout:** First, carefully examine the invitation card (first image) and identify all text elements (names, dates, venue, RSVP, etc.). Mentally map out the "no-go" zones where text exists.
    2.  **Find the Safe Zone:** Locate the largest empty or "safe" area on the invitation where the illustration can be placed without violating the Golden Rule.
    3.  **Scale to Fit:** You MUST scale down the illustration to fit entirely within the safe zone you identified. It is better for the illustration to be smaller than for it to cover any text. This is a mandatory step.
    4.  **Place and Blend:** Place the scaled illustration into the safe zone. Blend the bottom edge of the illustration with a soft, transparent fade to seamlessly integrate it with the background.
    5.  **Final Check:** Before outputting, do a final check. Is ANY text from the original card obscured? If yes, you have failed. You must scale the image down more and place it again.

    **What NOT to do:**
    *   **DO NOT** move, redraw, or alter the text on the invitation. The text layout must remain exactly as it is in the original image.
    *   **DO NOT** change the background of the invitation card.

    **Final Output:**
    *   A single, high-quality image of the final invitation with the illustration placed correctly.
    *   The output dimensions must exactly match the original invitation card.
    *   The result should look like the illustration was professionally added to the original, unchanged invitation card.
  `;

  const parts: Part[] = [
    { text: prompt },
    { 
      inlineData: { mimeType: 'image/jpeg', data: invitationCardB64 },
    },
    { 
      inlineData: { mimeType: 'image/png', data: illustrationB64 },
    }
  ];

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return response;
};

export const refineIllustration = async (
  base64ImageToRefine: string,
  imageMimeType: string,
  chatHistory: ChatHistoryItem[]
): Promise<GenerateContentResponse> => {
  const formattedHistory = chatHistory
    .map(turn => {
        const imageMarker = turn.image ? ' [Reference Image Attached]' : '';
        return `${turn.role === 'user' ? 'User' : 'Artist'}: ${turn.text}${imageMarker}`;
    })
    .join('\n');

  const refinePrompt = `
You are an expert digital artist and image editor. You are in a conversation with a user to refine an illustration. You have been given the current version of the illustration, the full conversation history, and any reference images the user provided in the chat.

**Your Task:**
1.  **Analyze Everything:** Read the entire conversation history and look at all provided images (the original illustration and any user-attached references) to understand the full context and the user's complete vision. The latest message is the most important, but previous messages and images provide crucial context.
2.  **Modify the Image:** Apply the modifications requested in the latest user message. Use any reference images provided by the user to guide your changes, especially for improving a person's likeness.
3.  **Preserve Core Identity:** It is absolutely critical to maintain the person's recognizable facial features and the overall artistic style of the original illustration. Do not start from scratch.
4.  **Transparent Background:** The final output image MUST have a fully transparent background, unless the user specifically asks for a background.
5.  **Respond in Chat (Optional):** If appropriate, you can provide a short, conversational text response confirming the change. For example: "Here it is with the red lehenga!" or "I've made them stand closer together, how does this look?".

**Conversation History:**
${formattedHistory}

Based on this conversation and all provided images, modify the illustration and return the new version.
`;

  const parts: Part[] = [
    { text: refinePrompt },
    {
      inlineData: {
        mimeType: imageMimeType,
        data: base64ImageToRefine,
      },
    },
  ];

  for (const turn of chatHistory) {
      if (turn.role === 'user' && turn.image) {
          const [header, base64Data] = turn.image.split(',');
          const mimeTypeMatch = header.match(/data:(.*);base64/);
          if (base64Data && mimeTypeMatch) {
              parts.push({
                  inlineData: {
                      mimeType: mimeTypeMatch[1],
                      data: base64Data
                  }
              });
          }
      }
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return response;
};
