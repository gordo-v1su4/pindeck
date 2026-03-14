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

function getSaturation(hex: string): number {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function mix(hexA: string, hexB: string, amount = 0.5): string {
  const a = parseInt(hexA.replace('#', ''), 16);
  const b = parseInt(hexB.replace('#', ''), 16);
  const channels = [16, 8, 0].map((shift) => {
    const start = (a >> shift) & 0xff;
    const end = (b >> shift) & 0xff;
    return clampChannel(Math.round(start + (end - start) * amount));
  });
  return rgbToHex(channels[0], channels[1], channels[2]);
}

function toPalette(partial: Omit<ColorPalette, 'dark' | 'light'>): ColorPalette {
  return {
    ...partial,
    dark: partial.background,
    light: partial.text,
  };
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

        const saturated = [...hexColors].sort(
          (a, b) => getSaturation(b) - getSaturation(a)
        );
        const primary = hexColors[0];
        const secondary = hexColors[1] || adjustBrightness(primary, 20);
        const accent = getMostVibrant(saturated);
        const tertiary = saturated[1] || mix(primary, accent, 0.5);
        const background = adjustBrightness(sortedByLuminance[0], -32);
        const surface = mix(background, sortedByLuminance[1] || primary, 0.22);
        const text = adjustBrightness(sortedByLuminance[sortedByLuminance.length - 1], 12);
        const muted = mix(text, tertiary, 0.35);
        const border = mix(accent, text, 0.35);

        resolve(
          toPalette({
            primary,
            secondary,
            accent,
            tertiary,
            background,
            surface,
            text,
            muted,
            border,
          })
        );
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
  primary: '#d2dc64',
  secondary: '#283228',
  accent: '#fff996',
  tertiary: '#b4be78',
  background: '#0a0a0b',
  surface: '#121214',
  text: '#f0f5dc',
  muted: '#cad2aa',
  border: '#6a7438',
  dark: '#0a0a0b',
  light: '#f0f5dc',
};
