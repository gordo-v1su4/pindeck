import React from "react";
import {
  Search, LayoutGrid, LayoutTemplate, Table, Presentation, Upload, Zap, Sparkles,
  Heart, Eye, X, ChevronDown, ChevronRight, ChevronLeft, Pencil, MoreHorizontal,
  Filter, ArrowUpDown, TreePine, Plus, Check, Image, Film, Palette, GripVertical,
  Lock, Unlock, EyeOff, Play, Maximize, Download, Bolt
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  search: Search,
  grid: LayoutGrid,
  masonry: LayoutTemplate,
  table: Table,
  board: LayoutGrid,
  deck: Presentation,
  upload: Upload,
  bolt: Zap,
  "bolt-fill": Bolt,
  sparkle: Sparkles,
  heart: Heart,
  eye: Eye,
  "eye-off": EyeOff,
  close: X,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  edit: Pencil,
  more: MoreHorizontal,
  filter: Filter,
  sort: ArrowUpDown,
  tree: TreePine,
  plus: Plus,
  check: Check,
  image: Image,
  film: Film,
  palette: Palette,
  grip: GripVertical,
  lock: Lock,
  unlock: Unlock,
  play: Play,
  expand: Maximize,
  download: Download,

  dot: () => null,
};

interface PinIconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
}

export function PinIcon({ name, size = 14, stroke = 1.6, className = "" }: PinIconProps) {
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} strokeWidth={stroke} className={className} />;
}
