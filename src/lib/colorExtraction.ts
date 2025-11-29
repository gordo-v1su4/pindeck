export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  count: number;
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
          
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Sample pixels (every 10th pixel for performance)
          const colorMap = new Map<string, number>();
          
          for (let i = 0; i < data.length; i += 40) { // Every 10th pixel (4 bytes per pixel)
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            // Convert to hex
            const hex = rgbToHex(r, g, b);
            
            // Count occurrences
            colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
          }
          
          // Convert to array and sort by count
          const colors: ExtractedColor[] = Array.from(colorMap.entries()).map(([hex, count]) => ({
            hex,
            rgb: hexToRgb(hex) || [0, 0, 0],
            count
          }));
          
          // Sort by count and take top 5
          const topColors = colors
            .sort((a, b) => b.count - a.count)
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
