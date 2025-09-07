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
    You are an expert wedding invitation designer with an exceptional eye for layout and typography. Your task is to merge the provided character illustration (second image) onto the wedding invitation card (first image) to create a single, harmonious, and professional-looking final invitation.

    **CRITICAL RULE: DO NOT OBSCURE ANY TEXT.** The readability of all text on the invitation (names, dates, venue, etc.) is the absolute highest priority.

    **Your process must be as follows:**

    1.  **Text and Layout Analysis (Priority #1):**
        *   First, meticulously identify ALL text elements on the invitation card (first image).
        *   Map out the "safe zones" (areas with no text) and "no-go zones" (areas with text).
        *   Analyze the invitation's layout, hierarchy, and existing design elements (borders, floral patterns, etc.) to understand the intended structure.

    2.  **Artistic Style Integration:**
        *   Deeply analyze the invitation's artistic style: its color palette, lighting, textures, and overall mood.
        *   Modify the provided character illustration (second image) to seamlessly match this style. Adjust colors, lighting, and line work to make it look like it belongs on the card.
        *   **Crucially:** While adapting the style, you must perfectly preserve the facial features and recognizable likeness of the couple.

    3.  **Intelligent and Safe Placement:**
        *   Based on your layout analysis, place the style-matched illustration into the most aesthetically pleasing **safe zone**.
        *   The illustration must integrate with the design without disrupting the flow or covering **any text or critical information**.
        *   **If there is limited empty space:**
            *   Prioritize scaling the illustration down to fit into a smaller safe area.
            *   Consider placing it creatively, perhaps integrated with a corner, a border, or alongside non-essential decorative graphics.
            *   A smaller, well-placed illustration is infinitely better than a large one that covers text.
        *   **Under NO circumstances should you move, alter, or regenerate the text from the original invitation.** You are a layout artist, not a copy editor. Your job is to place the art around the existing, unchangeable text.

    4.  **Final Output:**
        *   Produce a single, high-quality image that is the final, merged invitation.
        *   The output dimensions must exactly match the original invitation card.
        *   The result must look like a professionally designed invitation where the art and text were planned together from the start.
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