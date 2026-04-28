export type { PaletteOptions } from './colorPaletteCore';
import { extractDominantHexes, rgbToHex as coreRgbToHex } from './colorPaletteCore';

export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve([]);
            return;
          }

          const maxDimension = 400;
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const u8 = new Uint8Array(
            imageData.data.buffer,
            imageData.data.byteOffset,
            imageData.data.byteLength
          );

          const hexes = extractDominantHexes(u8, 4, {
            topN: 5,
            quantizeLevels: 36,
            minShare: 0.01,
            minLabDelta: 19,
          });
          resolve(hexes);
        } catch (error) {
          console.error('Error processing image:', error);
          resolve([]);
        }
      };

      img.onerror = () => {
        console.error('Error loading image:', imageUrl);
        resolve([]);
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Error extracting colors:', error);
    return [];
  }
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return coreRgbToHex(r, g, b);
}

export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? '#000000' : '#FFFFFF';
}
