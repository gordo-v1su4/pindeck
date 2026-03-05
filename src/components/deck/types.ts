export interface BlockData {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  layout: 'A' | 'B';
  visible: boolean;
}

export type BlockType =
  | 'hero'
  | 'logline'
  | 'story'
  | 'world'
  | 'character'
  | 'tone'
  | 'motif'
  | 'theme'
  | 'stakes'
  | 'closing'
  | 'divider';

export type StyleVariant = 'cinematic' | 'bold' | 'minimal' | 'noir' | 'neon';

// Style-specific visual treatments
export interface StyleConfig {
  // Typography
  titleSize: 'sm' | 'md' | 'lg' | 'xl';
  titleWeight: 'light' | 'normal' | 'medium' | 'bold';
  titleTracking: 'tight' | 'normal' | 'wide' | 'wider';
  bodySize: 'sm' | 'md' | 'lg';

  // Spacing
  padding: 'compact' | 'normal' | 'spacious';

  // Visual treatment
  borders: 'none' | 'subtle' | 'bold' | 'accent';
  dividerStyle: 'gradient' | 'line' | 'block' | 'fade' | 'geometric';
  overlayIntensity: 'light' | 'medium' | 'heavy';

  // Decorations
  showSectionNumbers: boolean;
  showAccentLines: boolean;
  showCornerFrames: boolean;
  letterboxBars: boolean;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  light: string;
}

export interface PitchDeckState {
  projectTitle: string;
  referenceImages: string[];
  colors: ColorPalette;
  blocks: BlockData[];
}
