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
  - The background should be simple or transparent to allow for easy placement on a digital card.
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