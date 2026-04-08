export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  count: number;
  saturation: number;
  brightness: number;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Calculate saturation (0-1)
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max === 0) return 0;
  return delta / max;
}

// Calculate brightness (0-1)
function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

// Quantize color to reduce similar colors
function quantizeColor(r: number, g: number, b: number, levels: number = 8): [number, number, number] {
  return [
    Math.round((r / 255) * levels) * (255 / levels),
    Math.round((g / 255) * levels) * (255 / levels),
    Math.round((b / 255) * levels) * (255 / levels),
  ];
}

// Check if color is too dark or too light
function isMeaningfulColor(r: number, g: number, b: number): boolean {
  const brightness = getBrightness(r, g, b);
  const saturation = getSaturation(r, g, b);
  
  // Filter out muddy shadows and blown highlights unless they are genuinely colorful.
  if (brightness < 0.16 && saturation < 0.42) return false;
  if (brightness > 0.92 && saturation < 0.18) return false;
  if (saturation < 0.08) return false;
  
  return true;
}

export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  try {
    // Create an image element to load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve) => {
      img.onload = () => {
        try {
          // Create canvas to extract pixel data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve([]);
            return;
          }
          
          // Set canvas size to image size (limit to reasonable size for performance)
          const maxDimension = 400;
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Sample pixels and quantize colors for better grouping
          const colorMap = new Map<string, ExtractedColor>();
          
          // Sample every 5th pixel for better coverage
          for (let i = 0; i < data.length; i += 20) { // Every 5th pixel (4 bytes per pixel)
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            // Filter out non-meaningful colors (grays, near-black, near-white)
            if (!isMeaningfulColor(r, g, b)) continue;
            
            // Quantize color to group similar colors
            const [qr, qg, qb] = quantizeColor(r, g, b, 12);
            const hex = rgbToHex(Math.round(qr), Math.round(qg), Math.round(qb));
            
            // Calculate saturation and brightness for scoring
            const saturation = getSaturation(qr, qg, qb);
            const brightness = getBrightness(qr, qg, qb);
            
            // Update or create color entry
            const existing = colorMap.get(hex);
            if (existing) {
              existing.count += 1;
            } else {
              colorMap.set(hex, {
                hex,
                rgb: [Math.round(qr), Math.round(qg), Math.round(qb)],
                count: 1,
                saturation,
                brightness,
              });
            }
          }
          
          // Convert to array and score colors
          const colors: ExtractedColor[] = Array.from(colorMap.values());
          
          // Score colors: favor dominant, vivid colors, but avoid over-picking shadows.
          const scoredColors = colors.map(color => ({
            ...color,
            score:
              color.count *
              (0.32 + color.saturation * 0.9 + Math.max(0, color.brightness - 0.18) * 0.28),
          }));
          
          const ranked = scoredColors.sort((a, b) => b.score - a.score);
          const selected: ExtractedColor[] = [];

          for (const color of ranked) {
            if (selected.every((candidate) => colorDistance(candidate.rgb, color.rgb) >= 70)) {
              selected.push(color);
            }
            if (selected.length === 5) break;
          }

          const fallbackColors = ranked
            .filter((color) => !selected.some((candidate) => candidate.hex === color.hex))
            .slice(0, Math.max(0, 5 - selected.length));

          const topColors = [...selected, ...fallbackColors]
            .slice(0, 5)
            .map((color) => color.hex);
          
          resolve(topColors);
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
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
