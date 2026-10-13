/**
 * Pure prompt builder for image variations (no Convex imports, so the app UI,
 * the docs and scripts can use it too). The shot chip and the custom text travel
 * together in the single stored `variationDetail` string as "<shot>; <text>".
 */

/** Framing chips shown in the UI. `prompt` is the exact framing text sent. */
export const SHOT_CHIPS = [
  { id: "auto", label: "Auto", prompt: "" },
  { id: "extreme-close-up", label: "Extreme close-up", prompt: "extreme close-up" },
  { id: "close-up", label: "Close-up", prompt: "close-up" },
  { id: "medium-close-up", label: "Medium close-up", prompt: "medium close-up" },
  { id: "medium", label: "Medium", prompt: "medium shot" },
  { id: "wide", label: "Wide", prompt: "wide shot" },
  { id: "extreme-wide", label: "Extreme wide", prompt: "extreme wide shot" },
  { id: "ots", label: "OTS", prompt: "over-the-shoulder" },
  { id: "low-angle", label: "Low angle", prompt: "low angle shot" },
  { id: "high-angle", label: "High angle", prompt: "high angle shot" },
  { id: "birds-eye", label: "Bird's eye", prompt: "bird's eye view" },
  { id: "dutch", label: "Dutch", prompt: "dutch angle" },
] as const;

/**
 * Automatic framing sequence for Shot Variation when no chip is picked.
 * High angle is intentionally excluded: pick the High angle chip to get it.
 */
export const AUTO_SHOT_SEQUENCE = [
  "close-up",
  "wide shot",
  "medium shot",
  "extreme close-up",
  "over-the-shoulder",
  "low angle shot",
  "medium close-up",
  "extreme wide shot",
  "profile",
  "from behind",
  "macro of the hands",
  "point of view shot",
] as const;

/** Lens language added to every variation prompt. */
export const LENS_LINE =
  "Cinematic, anamorphic lens optics characteristics, shot on Arri Alexa.";

/** Rule appended to every prompt so no production gear shows up in frame. */
export const NO_CREW_LINE = "No cameras, film crew, director or production equipment in frame.";

/**
 * Mode instructions. Each one states what stays and the one thing that changes,
 * so modes do not overlap. Never replaced by the shot chip or the custom text.
 */
export const MODE_INSTRUCTIONS: Record<string, string> = {
  "shot-variation":
    "Same subject, same location, same moment, same wardrobe and light. Only the camera setup changes.",
  "subtle-variation":
    "Same subject, same location, same framing. A second later: a small change in expression, glance or posture only.",
  "action-shot":
    "Same person, same location, same outfit. They are now doing a clear, dynamic physical action, caught mid-motion.",
  "b-roll":
    "B-roll of the same location: the environment on its own, same lighting and time of day. No people in frame.",
  "b-roll-people":
    "B-roll of the same location with people: background figures or passers-by in the environment, same lighting. The main subject is not the focus.",
  "style-variation":
    "Same person, same face and build, on a different day: new location, new outfit, different time of day and light.",
  coverage:
    "Same scene, same people, same wardrobe and light. A new moment in the story: the next beat between the same characters.",
};

const SHOT_PROMPTS: string[] = SHOT_CHIPS.map((c) => c.prompt).filter(Boolean);

/** Split the stored variationDetail into the chip framing and the free text. */
export function parseVariationDetail(raw?: string): { shot?: string; text?: string } {
  const value = raw?.trim();
  if (!value) return {};
  const lower = value.toLowerCase();
  for (const shot of SHOT_PROMPTS) {
    if (lower === shot) return { shot };
    if (lower.startsWith(`${shot};`)) {
      const text = value.slice(shot.length + 1).trim();
      return { shot, text: text || undefined };
    }
  }
  return { text: value };
}

/** Join a chip framing and free text into the stored variationDetail string. */
export function composeVariationDetail(shot?: string, text?: string): string | undefined {
  const parts = [shot?.trim(), text?.trim()].filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
}

function groupPrefix(mode: string, group?: string) {
  if (!group || (mode !== "shot-variation" && mode !== "action-shot")) return "";
  if (group === "Music Video") return "Later in the music video. ";
  if (group === "Commercial") return "Later in the commercial. ";
  if ((group === "Film" || group === "TV Series" || group === "Web Series") && mode === "action-shot")
    return "Later in the scene. ";
  return "";
}

function formatPalette(colors?: string[]) {
  const palette = (colors ?? [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter((c) => /^#?[0-9a-f]{6}$/i.test(c))
    .map((c) => (c.startsWith("#") ? c : `#${c}`))
    .slice(0, 5);
  return palette.length ? palette.join(", ") : undefined;
}

function srefContext(sref?: string, colors?: string[], style?: string) {
  if (!sref?.trim()) return "";
  const clean = sref.trim().replace(/^--sref\s+/i, "");
  const palette = formatPalette(colors);
  const styleNote = style?.trim();
  return [
    `Preserve the Midjourney style reference --sref ${clean}.`,
    palette ? `Keep the source color palette (${palette}).` : "Keep the source image's color palette.",
    styleNote
      ? `Maintain its ${styleNote} visual style.`
      : "Maintain its lighting, texture, mood, composition language, and stylization.",
    "Change only what the variation request asks for; the result should still feel like it belongs to the same SREF family.",
  ].join(" ");
}

export type VariationPromptInput = {
  modificationMode: string;
  variationCount: number;
  variationDetail?: string;
  group?: string;
  sref?: string;
  colors?: string[];
  style?: string;
};

/**
 * Final prompt order:
 *   [group prefix] mode instruction · Framing: <shot>. · Direction: <text>. · lens line · [SREF context]
 */
export function buildVariationPromptPlan(input: VariationPromptInput): string[] {
  const count = Math.min(Math.max(input.variationCount ?? 0, 0), 12);
  if (count === 0) return [];
  const mode = MODE_INSTRUCTIONS[input.modificationMode] ? input.modificationMode : "shot-variation";
  const { shot, text } = parseVariationDetail(input.variationDetail);
  const prompts: string[] = [];
  for (let i = 0; i < count; i++) {
    const framing = shot ?? (mode === "shot-variation" ? AUTO_SHOT_SEQUENCE[i % AUTO_SHOT_SEQUENCE.length] : undefined);
    const parts = [
      `${groupPrefix(mode, input.group)}${MODE_INSTRUCTIONS[mode]}`,
      framing ? `Framing: ${framing}.` : "",
      text ? `Direction: ${text.replace(/\.+$/, "")}.` : "",
      LENS_LINE,
      NO_CREW_LINE,
      srefContext(input.sref, input.colors, input.style),
    ];
    prompts.push(parts.filter(Boolean).join(" "));
  }
  return prompts;
}
