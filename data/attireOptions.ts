
import { AttireOption } from '../types';
import * as attireImages from '../assets/images';

export const brideAttireOptions: AttireOption[] = [
  {
    id: 'classic-lehenga',
    name: 'Classic Lehenga',
    description: 'A traditional, ornate lehenga in rich colors like red or maroon with heavy embroidery.',
    prompt: 'a beautiful, traditional, and ornate Indian lehenga in rich, celebratory colors like deep red or maroon, featuring heavy, intricate embroidery and delicate, complementary jewelry',
    imageUrl: attireImages.classicLehengaImage,
    type: 'bride',
  },
  {
    id: 'modern-gown',
    name: 'Modern Gown',
    description: 'A contemporary, elegant gown with Indian motifs, often in pastel shades or ivory.',
    prompt: 'a contemporary and elegant fusion-style wedding gown that blends Indian motifs with a modern silhouette, in soft pastel shades or ivory, with tasteful, minimalist jewelry',
    imageUrl: attireImages.modernGownImage,
    type: 'bride',
  },
  {
    id: 'anarkali-suit',
    name: 'Anarkali Suit',
    description: 'A floor-length, flowing Anarkali suit that is both royal and graceful.',
    prompt: 'a royal and graceful floor-length, flowing Anarkali suit, designed for a wedding with rich fabric and elegant embellishments',
    imageUrl: attireImages.anarkaliSuitImage,
    type: 'bride',
  },
];

export const groomAttireOptions: AttireOption[] = [
  {
    id: 'classic-sherwani',
    name: 'Classic Sherwani',
    description: 'A timeless, elegant sherwani in cream, gold, or beige with detailed embroidery.',
    prompt: 'a timeless and elegant traditional Indian sherwani in classic colors like cream, gold, or beige, featuring detailed embroidery and a royal look',
    imageUrl: attireImages.classicSherwaniImage,
    type: 'groom',
  },
  {
    id: 'indo-western-suit',
    name: 'Indo-Western Suit',
    description: 'A stylish fusion of a modern suit jacket with a traditional Indian silhouette.',
    prompt: 'a stylish Indo-Western suit that fuses a modern tailored jacket with a traditional Indian silhouette, often in bold colors like royal blue or burgundy',
    imageUrl: attireImages.indoWesternSuitImage,
    type: 'groom',
  },
  {
    id: 'jodhpuri-suit',
    name: 'Jodhpuri Suit',
    description: 'A sharp, royal "bandhgala" suit that offers a sophisticated, princely look.',
    prompt: 'a sharp and royal Jodhpuri suit, also known as a "bandhgala", which has a closed-neck collar for a sophisticated and princely appearance',
    imageUrl: attireImages.jodhpuriSuitImage,
    type: 'groom',
  },
];
