
export interface ImageState {
  originalBase64: string | null;
  compressedBase64: string | null;
  originalSize: number | null;
  compressedSize: number | null;
}

export interface GeneratedImageState extends ImageState {
  title: string;
  compressionQuality: number;
}

export interface GeneratedImageHistory {
  id: string;
  title: string;
  versions: GeneratedImageState[];
  currentVersionIndex: number;
}

export type GenerationType = 'bride' | 'groom' | 'couple';

export interface ChatHistoryItem {
    role: 'user' | 'model';
    text: string;
    image?: string;
}

export interface ChatState {
    isOpen: boolean;
    targetImageId: string | null;
    history: ChatHistoryItem[];
    isSending: boolean;
    attachment: { data: string; name: string } | null;
}
