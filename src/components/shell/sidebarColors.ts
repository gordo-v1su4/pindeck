import { normalizeColorHex } from "@/lib/libraryFilters";

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeColorHex(hex);
  if (!normalized) return null;
  const h = normalized.slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHue([r255, g255, b255]: [number, number, number]) {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 361;
  const delta = max - min;
  let hue = 0;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return hue * 60;
}

function colorBrightness(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

export function buildSidebarColorRows(images: any[] | undefined): string[][] {
  const colors = new Map<
    string,
    { color: string; hue: number; lightness: number; count: number }
  >();
  for (const image of images ?? []) {
    for (const raw of image.colors ?? []) {
      const color = normalizeColorHex(raw);
      const rgb = color ? hexToRgb(color) : null;
      if (!color || !rgb) continue;
      const current = colors.get(color);
      if (current) current.count += 1;
      else
        colors.set(color, {
          color,
          hue: rgbToHue(rgb),
          lightness: colorBrightness(color),
          count: 1,
        });
    }
  }

  const sorted = Array.from(colors.values())
    .sort(
      (a, b) => a.hue - b.hue || a.lightness - b.lightness || b.count - a.count,
    )
    .slice(0, 80)
    .map((entry) => entry.color);

  const rows: string[][] = [];
  for (let index = 0; index < sorted.length; index += 5)
    rows.push(sorted.slice(index, index + 5));
  return rows;
}
