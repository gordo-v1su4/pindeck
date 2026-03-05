import ColorThief from 'colorthief';
import type { ColorPalette } from '../types';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return rgbToHex(R, G, B);
}

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export async function extractColors(imageUrl: string): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 6);
        
        if (!palette || palette.length < 3) {
          throw new Error('Could not extract enough colors');
        }

        // Sort colors by luminance
        const hexColors = palette.map(([r, g, b]: number[]) => rgbToHex(r, g, b));
        const sortedByLuminance = [...hexColors].sort((a, b) => getLuminance(a) - getLuminance(b));

        // Pick most vibrant color for accent (highest saturation)
        const getMostVibrant = (colors: string[]): string => {
          let maxSaturation = 0;
          let vibrant = colors[0];
          
          colors.forEach(hex => {
            const rgb = parseInt(hex.replace('#', ''), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            
            if (saturation > maxSaturation) {
              maxSaturation = saturation;
              vibrant = hex;
            }
          });
          
          return vibrant;
        };

        const primary = hexColors[0];
        const secondary = hexColors[1] || adjustBrightness(primary, 20);
        const accent = getMostVibrant(hexColors);
        const dark = adjustBrightness(sortedByLuminance[0], -30);
        const light = sortedByLuminance[sortedByLuminance.length - 1];

        resolve({
          primary,
          secondary,
          accent,
          dark,
          light,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

export const defaultColors: ColorPalette = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  dark: '#0a0a0a',
  light: '#f5f5f5',
};
