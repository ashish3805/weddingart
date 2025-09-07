import { GoogleGenAI, Modality, GenerateContentResponse, Part } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash-image-preview';

type GenerationType = 'bride' | 'groom' | 'couple';
interface ImageInputs {
    bride?: string;
    groom?: string;

    card?: string;
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

const getPrompts = (cardProvided: boolean): Record<GenerationType, string> => ({
  bride: `
    ${getBasePrompt(cardProvided)}
    **Primary Goal: Recognizable Likeness of the Bride**
    - Create a solo portrait of the Indian bride.
    - The most important requirement is to ensure the illustrated bride is clearly and accurately recognizable as the individual from the provided headshot photo.
    - Pay very close attention to her specific facial features. Capture her unique likeness, including face shape, eyes, nose, and smile.
    - Dress her in a graceful and beautiful traditional Indian lehenga with delicate, complementary jewelry. She should look happy and celebratory.
  `,
  groom: `
    ${getBasePrompt(cardProvided)}
    **Primary Goal: Recognizable Likeness of the Groom**
    - Create a solo portrait of the Indian groom.
    - The most important requirement is to ensure the illustrated groom is clearly and accurately recognizable as the individual from the provided headshot photo.
    - Pay very close attention to his specific facial features. Capture his unique likeness, including face shape, eyes, nose, and smile.
    - Dress him in a handsome and elegant traditional Indian sherwani. He should look happy and celebratory.
  `,
  couple: `
    ${getBasePrompt(cardProvided)}
    **Primary Goal: Recognizable Likeness of the Couple**
    - Create a portrait of the Indian wedding couple together.
    - The most important requirement is to ensure the illustrated couple is clearly and accurately recognizable as the individuals from their respective headshot photos.
    - Pay very close attention to the specific facial features of the bride from her image and the groom from his. Capture their unique likenesses.
    - **Attire:**
        - **Groom:** Dress him in a handsome and elegant traditional Indian sherwani.
        - **Bride:** Dress her in a graceful and beautiful traditional Indian lehenga with delicate, complementary jewelry.
    - **Composition:** They should be posed together, looking happy and celebratory.
  `,
});

export const generateIllustration = async (
  type: GenerationType,
  images: ImageInputs
): Promise<GenerateContentResponse> => {
  const cardProvided = !!images.card;
  const prompts = getPrompts(cardProvided);
  const prompt = prompts[type];
  const parts: Part[] = [{ text: prompt }];

  if ((type === 'bride' || type === 'couple') && images.bride) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.bride },
    });
  }

  if ((type === 'groom' || type === 'couple') && images.groom) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: images.groom },
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
  card?: string
): Promise<GenerateContentResponse> => {
  const cardProvided = !!card;
  
  const styleInstruction = cardProvided
    ? "The overall mood, color palette, and artistic elegance must blend seamlessly with the aesthetic of the provided wedding card image."
    : "The final image should have warm, celebratory, and elegant tones suitable for a wedding invitation.";

  const prompt = `
You are an expert digital artist specializing in combining portraits. Your task is to take the two provided illustrations—one of a bride and one of a groom—and merge them into a single, cohesive couple's portrait.

**Core Instructions:**
1.  **Preserve Style and Features:** It is crucial that you maintain the exact art style, facial features, colors, and attire from the individual illustrations. Do not redraw or reinterpret the characters.
2.  **Combine and Compose:** Arrange the bride and groom together in a natural, celebratory pose suitable for a wedding portrait. They should look like they are in the same scene.
3.  **Aesthetic Integration:** ${styleInstruction}
4.  **Output:** The output must be a single image file of the couple. The background **must be fully transparent**. Do not add text, borders, or any background color.
`;

  const parts: Part[] = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: brideIllustration } },
    { inlineData: { mimeType: 'image/jpeg', data: groomIllustration } }
  ];

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
      inlineData: { mimeType: 'image/jpeg', data: illustrationB64 },
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