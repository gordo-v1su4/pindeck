export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  count: number;
  saturation: number;
  brightness: number;
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
  
  // Filter out near-black (brightness < 0.1) and near-white (brightness > 0.9)
  // Unless they have significant saturation (meaningful dark/light colors)
  if (brightness < 0.1 && saturation < 0.3) return false; // Too dark and not saturated
  if (brightness > 0.9 && saturation < 0.2) return false; // Too light and not saturated
  
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
          
          // Score colors: prioritize saturation and count
          // Higher saturation = more vibrant/meaningful
          // Higher count = more dominant in image
          const scoredColors = colors.map(color => ({
            ...color,
            score: color.count * (0.6 + color.saturation * 0.4), // Weight count more, but boost saturated colors
          }));
          
          // Sort by score and take top 5 most meaningful colors
          const topColors = scoredColors
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(color => color.hex);
          
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
