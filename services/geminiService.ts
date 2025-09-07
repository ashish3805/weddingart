import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash-image-preview';

export const generateIllustration = async (
  brideImageBase64: string,
  groomImageBase64: string,
  cardImageBase64: string
): Promise<GenerateContentResponse> => {
  const prompt = `
    You are an expert wedding invitation illustrator. Your task is to create a single, cohesive, hand-illustrated style artistic drawing of an Indian wedding couple. You will be given three images as input:
    1. A headshot of the bride.
    2. A headshot of the groom.
    3. An image of the wedding invitation card for style reference.

    **Primary Goal: Recognizable Likeness**
    - The most important requirement is to ensure the illustrated couple is clearly and accurately recognizable as the individuals from the provided headshot photos.
    - Pay very close attention to the specific facial features of the bride from the first image and the groom from the second image. Capture their unique likeness, including face shape, eyes, nose, and smile.

    **Artistic Requirements:**
    - **Style:** The final output must be a refined, elegant, hand-drawn illustration. It should look like a polished piece of digital art, not a photo or a simple filtered image.
    - **Attire:**
        - **Groom:** Dress him in a handsome and elegant traditional Indian sherwani.
        - **Bride:** Dress her in a graceful and beautiful traditional Indian lehenga with delicate, complementary jewelry.
    - **Aesthetic Integration:** The overall mood, color palette, and artistic elegance of your illustration must blend seamlessly with the aesthetic of the wedding card (the third image). Use warm, celebratory tones that match the invitation.
    - **Composition:** Create a portrait of the two individuals together as a couple. They should look happy and celebratory.

    **Output Specification:**
    - The output must be a single image file containing only the illustration of the couple.
    - Do not include any text, borders, or other elements from the invitation card in the final image.
    - The background should be simple or transparent to allow for easy placement on a digital card.
  `;

  const brideImagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: brideImageBase64,
    },
  };

  const groomImagePart = {
    inlineData: {
        mimeType: 'image/jpeg',
        data: groomImageBase64,
    },
  };

  const cardImagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: cardImageBase64,
    },
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt },
        brideImagePart,
        groomImagePart,
        cardImagePart,
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return response;
};
