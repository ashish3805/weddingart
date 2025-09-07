# Gemini API Integration Guide

This document details how the Google Gemini API is utilized within the Wedding Couple Illustrator AI application to perform advanced image generation and refinement tasks.

## 1. Core Model

The application exclusively uses the **`gemini-2.5-flash-image-preview`** model. This model is chosen for its powerful multi-modal capabilities, allowing it to process a combination of text instructions and multiple image inputs to generate a new, edited image output.

## 2. Key AI Functions

The `services/geminiService.ts` file orchestrates all interactions with the Gemini API through several key functions:

### `generateIllustration`
- **Purpose**: Creates the initial solo (bride/groom) or couple illustrations.
- **Inputs**: Text prompt, one or more JPEGs (headshots, couple photo, wedding card for style).
- **Prompt Strategy**:
  - **Role-Playing**: The prompt begins with "You are an expert wedding invitation illustrator" to set the AI's context.
  - **Primary Goal**: Emphasizes that "Recognizable Likeness" is the most critical requirement, directing the AI to focus on capturing the person's facial features accurately.
  - **Style Matching**: If a wedding card is provided, the prompt instructs the AI to use it as a style reference for color palette and mood.
  - **Strict Output Rules**: Explicitly commands the AI to produce a single image with a **fully transparent background** and no text or borders.

### `combineIllustrations`
- **Purpose**: Merges the individually generated bride and groom illustrations into a single, cohesive couple's portrait.
- **Inputs**: Text prompt, two PNGs (bride and groom illustrations), and optionally a JPEG (wedding card for style) and a JPEG (couple photo for pose reference).
- **Prompt Strategy**:
  - **Preservation**: The core instruction is to maintain the exact art style and features of the input illustrations, preventing the AI from redrawing the characters.
  - **Compositional Guidance**: Instructs the AI to arrange the couple in a natural, celebratory pose. If a couple's photo is provided, it's used as a strong reference for their interaction and composition.

### `createFinalInvitation`
- **Purpose**: Places the final illustration onto a wedding invitation background provided by the user.
- **Inputs**: Text prompt, one JPEG (invitation background), one PNG (the couple's illustration).
- **Prompt Strategy**:
  - **The Golden Rule**: The prompt is dominated by a strict, non-negotiable rule: **"DO NOT COVER ANY TEXT."** This instruction is repeated and heavily emphasized to ensure the final output is usable.
  - **Process-Oriented**: The prompt outlines a specific step-by-step process for the AI to follow: analyze the layout, find a "safe zone," scale the illustration to fit, and place it. This structured thinking improves reliability.

### `refineIllustration`
- **Purpose**: Powers the interactive chat feature for iterative image refinement.
- **Inputs**: Text prompt, the current PNG illustration to be edited, and the full chat history (including any reference images uploaded by the user).
- **Prompt Strategy**:
  - **Full Context**: The prompt includes the entire conversation history, formatted for clarity. This allows the AI to understand follow-up requests (e.g., "make it a bit closer") in the context of previous edits.
  - **Multi-Modal Refinement**: The AI is explicitly told to use any user-attached reference images to guide its changes, which is particularly useful for perfecting a person's likeness.
  - **Incremental Changes**: The prompt reinforces the need to modify the *existing* image rather than starting from scratch, ensuring stylistic consistency is maintained.

## 3. API Configuration

All calls to the Gemini API use the `ai.models.generateContent` method with the following key configuration:

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: { parts: [...] }, // An array of text and image parts
  config: {
    responseModalities: [Modality.IMAGE, Modality.TEXT],
  },
});
```
- **`responseModalities`**: This parameter is crucial. It tells the `gemini-2.5-flash-image-preview` model that we expect both an **image** and **text** in the response. This enables the model to generate the refined illustration while also providing a conversational text reply.
- **Image Data Handling**: The generated image data is extracted from the `inlineData.data` field within the `response.candidates[0].content.parts` array.
