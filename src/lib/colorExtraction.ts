export type { PaletteOptions } from './colorPaletteCore';
import { extractDominantHexes, rgbToHex as coreRgbToHex } from './colorPaletteCore';

function extractHexesFromCanvasPixels(
  imageData: ImageData,
): string[] {
  const u8 = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );
  return extractDominantHexes(u8, 4, {
    topN: 5,
    quantizeLevels: 36,
    minShare: 0.01,
    minLabDelta: 19,
  });
}

/** Load image into canvas and read pixels. `crossOrigin` undefined = leave default (blob: / data: same-origin). */
function extractFromImageSrc(
  src: string,
  crossOrigin: 'anonymous' | undefined,
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve([]);
          return;
        }
        const maxDimension = 400;
        const scale = Math.min(
          1,
          maxDimension / Math.max(img.width, img.height),
        );
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(extractHexesFromCanvasPixels(imageData));
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = src;
  });
}

/**
 * Dominant colors from an image URL. Tries canvas read with CORS; if that yields
 * too few swatches (tainted canvas / bad CORS), fetches the URL as a blob and
 * re-samples from a blob: URL (same-origin to the page, no taint).
 */
export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  if (!imageUrl.trim()) {
    return [];
  }

  try {
    let hexes: string[] = [];

    if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
      hexes = await extractFromImageSrc(imageUrl, undefined);
      return hexes;
    }

    if (imageUrl.startsWith("http")) {
      hexes = await extractFromImageSrc(imageUrl, "anonymous");
      if (hexes.length >= 3) {
        return hexes;
      }

      try {
        const res = await fetch(imageUrl, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          try {
            hexes = await extractFromImageSrc(blobUrl, undefined);
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        }
      } catch {
        try {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            try {
              hexes = await extractFromImageSrc(blobUrl, undefined);
            } finally {
              URL.revokeObjectURL(blobUrl);
            }
          }
        } catch {
          /* noop */
        }
      }
      return hexes;
    }

    hexes = await extractFromImageSrc(imageUrl, undefined);
    return hexes;
  } catch (error) {
    console.error("Error extracting colors:", error);
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
