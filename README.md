# Wedding Couple Illustrator AI

An AI-powered application that creates beautiful, hand-drawn style illustrations of wedding couples for their invitations. Users can upload photos, generate custom artwork, and refine the results through an interactive AI chat.

## ✨ Features

- **AI Illustration Generation**: Creates individual portraits of the bride and groom or a combined couple's illustration from user-provided photos.
- **Style Matching**: Optionally uses an image of a wedding invitation to influence the color palette and artistic style of the generated artwork.
- **Automatic Invitation Creation**: Places the final illustration onto an invitation background, intelligently avoiding text to create a complete, ready-to-use design.
- **Interactive AI Refinement**: A chat-based interface allows users to give feedback and make iterative changes to the illustrations (e.g., "Change the dress color," "Make them stand closer").
- **Visual References in Chat**: Users can upload additional reference photos directly in the chat to help the AI perfect the likeness of the couple.
- **Version History**: The app keeps track of all refinements, allowing users to easily navigate between different versions of their artwork.

## 🚀 How It Works

1.  **Step 1: Upload Images**
    -   Provide headshots of the bride and groom.
    -   Optionally, upload a photo of the couple together for better pose reference.
    -   Optionally, upload an image of your invitation card to guide the artistic style.

2.  **Step 2: Generate Creations**
    -   Select which illustrations you want to create (Bride, Groom, Couple).
    -   Choose to generate a final invitation by uploading your invitation background.
    -   Click "Generate" and let the AI work its magic.

3.  **Step 3: Review & Refine**
    -   Your custom illustrations will appear in the output section.
    -   Click the **"Refine with AI Chat"** button on any image to open the chat modal.
    -   Type instructions or upload new reference images to guide the AI in perfecting your illustration. A new version will be created with each request.

4.  **Step 4: Download**
    -   Once you are happy with the result, adjust the image quality and click the "Download" button to save your creation.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI**: Google Gemini API (`gemini-2.5-flash-image-preview`)

## ⚙️ Setup

To run this project, an API key for the Google Gemini API is required.

In this environment, the key is expected to be available as an environment variable:
`process.env.API_KEY`

The application will automatically pick up this key to initialize the Gemini client.
