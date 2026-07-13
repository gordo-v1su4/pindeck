export type ClientVisionMetadata = {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  group?: string;
  genre?: string;
  style?: string;
  shot?: string;
  projectName?: string;
  moodboardName?: string;
};

export const LFM_PINDECK_METADATA_PROMPT = `Analyze this reference image and return one valid JSON object only.

Use this exact schema:
{"title":string,"description":string,"tags":string[],"category":string|null,"group":string|null,"genre":string|null,"shot":string|null,"style":string|null,"projectName":string|null,"moodboardName":string|null}

Rules:
- description is one detailed natural sentence grounded only in visible content.
- tags contains 5 to 10 concise visible concepts.
- group is one of Commercial, Film, Music Video, Editorial, Moodboard, TV Series, Web Series, or Video Game Cinematic when clear.
- genre is one of Noir, Sci-Fi, Drama, Horror, Romance, Action, or Doc when clear.
- shot is a concise cinematography framing label such as Wide Shot, Medium Shot, Close-Up, Low Angle, or Bird's Eye.
- style is the visible capture or medium, such as 35mm Film, Digital, CGI, VHS, Illustration, or Polaroid.
- Use null when a field is not visually supported. Do not invent a project name.
- The first character must be { and the last character must be }. Do not use markdown.`;

export function parseClientVisionMetadata(raw: string): ClientVisionMetadata {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) {
    const description = cleanString(raw);
    return description ? { description } : {};
  }

  try {
    const value = JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
    return {
      title: cleanString(value.title),
      description: cleanString(value.description ?? value.caption),
      tags: cleanStringArray(value.tags),
      category: cleanString(value.category),
      group: cleanString(value.group),
      genre: cleanString(value.genre),
      shot: cleanString(value.shot ?? value.shotType),
      style: cleanString(value.style ?? value.visual_style),
      projectName: cleanString(value.projectName ?? value.project_name),
      moodboardName: cleanString(value.moodboardName ?? value.moodboard_name),
    };
  } catch {
    const description = cleanString(raw);
    return description ? { description } : {};
  }
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").replace(/^[`"']+|[`"']+$/g, "").trim();
  return cleaned && !/^(null|none|unknown|n\/a)$/i.test(cleaned) ? cleaned : undefined;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value.map(cleanString).filter((item): item is string => Boolean(item));
  return cleaned.length ? cleaned.slice(0, 10) : undefined;
}
