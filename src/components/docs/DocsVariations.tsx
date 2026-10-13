import React from "react";
import { Card } from "@radix-ui/themes";
import { PinChip, PinKV, PinLabel } from "@/components/ui/pindeck";
import { Callout, Code, CodeBlock, DocsHeader, DocsSection, DocsTable, P } from "./DocsBlocks";
import { DEdge, DNode, DiagramFrame } from "./DocsDiagram";

/* ------------------------------------------------------------------ */
/* Placeholder thumbnail: a 16:9 frame with a schematic subject.       */
/* ------------------------------------------------------------------ */
type Subject = "person" | "none" | "object" | "person-moved" | "person-action";
function Thumb({
  x,
  y,
  w,
  scale = 1,
  subject = "person",
  horizon = 0.62,
  tilt = 0,
  accent,
  label,
  bg = "same",
}: {
  x: number;
  y: number;
  w: number;
  scale?: number;
  subject?: Subject;
  horizon?: number;
  tilt?: number;
  accent?: boolean;
  label?: string;
  bg?: "same" | "new";
}) {
  const h = Math.round((w * 9) / 16);
  const cx = x + w / 2;
  const hy = y + h * horizon;
  const id = React.useId().replace(/:/g, "");
  const stroke = accent ? "var(--pd-accent)" : "var(--pd-ink-dim)";
  const head = 7 * scale;
  const figX = subject === "person-moved" ? x + w * 0.3 : cx;
  const figBase = y + h * 0.5 + 22 * scale;
  return (
    <g>
      <clipPath id={`c${id}`}>
        <rect x={x} y={y} width={w} height={h} rx={3} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={3} style={{ fill: "var(--pd-bg-2)", stroke: accent ? "var(--pd-accent)" : "var(--pd-line-hi)" }} />
      <g clipPath={`url(#c${id})`} transform={tilt ? `rotate(${tilt} ${cx} ${y + h / 2})` : undefined}>
        {bg === "same" ? (
          <>
            <line x1={x - 20} y1={hy} x2={x + w + 20} y2={hy} style={{ stroke: "var(--pd-line-strong)" }} />
            <rect x={x + w * 0.72} y={hy - 22} width={12} height={22} style={{ fill: "var(--pd-line-hi)" }} />
          </>
        ) : (
          <>
            <path d={`M${x - 10},${hy} L${x + w * 0.3},${hy - 18} L${x + w * 0.55},${hy - 6} L${x + w * 0.8},${hy - 24} L${x + w + 10},${hy}`} style={{ fill: "none", stroke: "var(--pd-line-strong)" }} />
            <circle cx={x + w * 0.15} cy={y + h * 0.22} r={5} style={{ fill: "var(--pd-line-hi)" }} />
          </>
        )}
        {subject === "object" ? (
          <rect x={cx - 9 * scale} y={y + h / 2 - 6 * scale} width={18 * scale} height={12 * scale} rx={2} style={{ fill: "none", stroke, strokeWidth: 1.4 }} />
        ) : subject === "none" ? null : (
          <g style={{ stroke, strokeWidth: 1.4, fill: "none" }}>
            <circle cx={figX} cy={figBase - 22 * scale - head} r={head} />
            <line x1={figX} y1={figBase - 22 * scale} x2={figX} y2={figBase - 6 * scale} />
            {subject === "person-action" ? (
              <>
                <line x1={figX} y1={figBase - 18 * scale} x2={figX + 12 * scale} y2={figBase - 30 * scale} />
                <line x1={figX} y1={figBase - 18 * scale} x2={figX - 11 * scale} y2={figBase - 10 * scale} />
                <line x1={figX} y1={figBase - 6 * scale} x2={figX + 10 * scale} y2={figBase + 4 * scale} />
                <line x1={figX} y1={figBase - 6 * scale} x2={figX - 8 * scale} y2={figBase + 6 * scale} />
              </>
            ) : (
              <>
                <line x1={figX} y1={figBase - 18 * scale} x2={figX - 8 * scale} y2={figBase - 8 * scale} />
                <line x1={figX} y1={figBase - 18 * scale} x2={figX + 8 * scale} y2={figBase - 8 * scale} />
                <line x1={figX} y1={figBase - 6 * scale} x2={figX - 6 * scale} y2={figBase + 6 * scale} />
                <line x1={figX} y1={figBase - 6 * scale} x2={figX + 6 * scale} y2={figBase + 6 * scale} />
              </>
            )}
          </g>
        )}
      </g>
      {label ? (
        <text x={x} y={y + h + 13} style={{ fill: "var(--pd-ink-dim)", fontFamily: "var(--pd-font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

function OutCard({
  x,
  y,
  mode,
  name,
  keeps,
  changes,
  thumb,
  warn,
}: {
  x: number;
  y: number;
  mode: string;
  name: string;
  keeps: string;
  changes: string;
  thumb: Omit<React.ComponentProps<typeof Thumb>, "x" | "y" | "w">;
  warn?: string;
}) {
  const w = 210;
  return (
    <g>
      <rect x={x} y={y} width={w} height={194} rx={6} style={{ fill: "var(--pd-bg-2)", stroke: warn ? "var(--pd-amber, #f5a524)" : "var(--pd-line-hi)" }} />
      <text x={x + 10} y={y + 16} style={{ fill: "var(--pd-ink-faint)", fontFamily: "var(--pd-font-mono)", fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {mode}
      </text>
      <text x={x + 10} y={y + 32} style={{ fill: "var(--pd-ink)", fontFamily: "var(--pd-font-sans)", fontSize: 12.5, fontWeight: 600 }}>
        {name}
      </text>
      <Thumb x={x + 10} y={y + 40} w={w - 20} {...thumb} />
      <text x={x + 10} y={y + 170} style={{ fill: "var(--pd-green, #2ee6a6)", fontFamily: "var(--pd-font-mono)", fontSize: 9 }}>
        = {keeps}
      </text>
      <text x={x + 10} y={y + 184} style={{ fill: "var(--pd-accent-ink)", fontFamily: "var(--pd-font-mono)", fontSize: 9 }}>
        Δ {changes}
      </text>
      {warn ? (
        <text x={x + w - 10} y={y + 16} textAnchor="end" style={{ fill: "var(--pd-amber, #f5a524)", fontFamily: "var(--pd-font-mono)", fontSize: 8.5, letterSpacing: "0.06em" }}>
          {warn}
        </text>
      ) : null}
    </g>
  );
}

/** Fig. 07 — one source image fanning out to the six current modes. */
function VariationFanDiagram() {
  const L = 24;
  const R = 666;
  const rows = [24, 236, 448];
  return (
    <DiagramFrame
      id="07"
      title="One source, six modes (current behaviour)"
      caption="What each mode keeps (=) and changes (Δ), read from the prompt templates in convex/vision.ts. Amber outlines mark modes that overlap and often return the same kind of frame. Placeholders stand in for real outputs."
      width={900}
      height={666}
    >
      {/* edges */}
      <DEdge points={[[370, 312], [300, 312], [300, 121], [234, 121]]} />
      <DEdge points={[[370, 333], [234, 333]]} />
      <DEdge points={[[370, 354], [300, 354], [300, 545], [234, 545]]} />
      <DEdge points={[[530, 312], [600, 312], [600, 121], [666, 121]]} />
      <DEdge points={[[530, 333], [666, 333]]} accent label="NEW DAY" labelAt={[598, 323]} />
      <DEdge points={[[530, 354], [600, 354], [600, 545], [666, 545]]} />

      {/* source */}
      <rect x={370} y={262} width={160} height={140} rx={6} style={{ fill: "var(--pd-accent-soft)", stroke: "var(--pd-accent)" }} />
      <text x={380} y={278} style={{ fill: "var(--pd-accent-ink)", fontFamily: "var(--pd-font-mono)", fontSize: 8.5, letterSpacing: "0.08em" }}>
        SOURCE · image_urls[0]
      </text>
      <Thumb x={380} y={286} w={140} accent />
      <text x={380} y={383} style={{ fill: "var(--pd-accent-ink)", fontFamily: "var(--pd-font-sans)", fontSize: 12, fontWeight: 600 }}>
        Original still
      </text>
      <text x={380} y={396} style={{ fill: "var(--pd-ink-faint)", fontFamily: "var(--pd-font-mono)", fontSize: 9 }}>
        + sref · palette · style
      </text>

      <OutCard x={L} y={rows[0]} mode="shot-variation" name="Shot Variation" keeps="person · place · moment" changes="camera (cycles 12 shots)" thumb={{ scale: 1.9, label: "auto: close-up, ECU, profile…" }} warn="≈ SUBTLE" />
      <OutCard x={L} y={rows[1]} mode="subtle-variation" name="Subtle Variation" keeps="person · setting" changes="moment / pose, camera free" thumb={{ subject: "person-moved", label: "same frame, next beat" }} warn="≈ SHOT/ACTION" />
      <OutCard x={L} y={rows[2]} mode="action-shot" name="Action Shot" keeps="person (setting implied)" changes="dramatic action" thumb={{ subject: "person-action", label: "same guy, doing something" }} warn="≈ SUBTLE" />
      <OutCard x={R} y={rows[0]} mode="b-roll" name="B-Roll" keeps="location · lighting" changes="no people, establishing" thumb={{ subject: "none", label: "empty set, wide" }} warn="≈ COVERAGE" />
      <OutCard x={R} y={rows[1]} mode="style-variation" name="Style Variation" keeps="face · likeness" changes="outfit · location" thumb={{ bg: "new", label: "same person, new place" }} />
      <OutCard x={R} y={rows[2]} mode="coverage" name="Coverage" keeps="world · environment" changes="a detail / object, no people" thumb={{ subject: "object", scale: 1.6, label: "insert: prop or detail" }} warn="≈ B-ROLL" />
    </DiagramFrame>
  );
}

/** Fig. 08 — shot sizes and angles, mapped to what the app can actually send. */
const SHOTS: Array<{ name: string; scale: number; horizon?: number; tilt?: number; auto: string; chip: string }> = [
  { name: "Extreme CU", scale: 4.2, auto: "#2", chip: "—" },
  { name: "Close-up", scale: 3, auto: "#1", chip: "Close-up" },
  { name: "Medium CU", scale: 2.3, auto: "#4", chip: "—" },
  { name: "Medium", scale: 1.6, auto: "#9", chip: "Medium" },
  { name: "Wide", scale: 0.9, auto: "#10", chip: "Wide" },
  { name: "Extreme wide", scale: 0.45, auto: "#11", chip: "Extr. wide" },
  { name: "Low angle", scale: 1.5, horizon: 0.85, auto: "#12", chip: "Low angle" },
  { name: "High angle", scale: 1.1, horizon: 0.25, auto: "never", chip: "—" },
  { name: "Bird's eye", scale: 0.8, horizon: 0.05, auto: "never", chip: "Bird's eye" },
  { name: "Dutch", scale: 1.4, tilt: 14, auto: "never", chip: "Dutch" },
];
function ShotStripDiagram() {
  const w = 76;
  const gap = 10;
  return (
    <DiagramFrame
      id="08"
      title="Shot size and angle strip"
      caption="Auto = position in SHOT_TYPES when Shot Variation runs with no detail (count is capped at 12, the drawer offers at most 8). Chip = the Shot type chip in the drawer. High angle has no chip and is never reached automatically."
      width={900}
      height={150}
    >
      {SHOTS.map((s, i) => {
        const x = 22 + i * (w + gap + 2);
        return (
          <g key={s.name}>
            <Thumb x={x} y={20} w={w} scale={s.scale * 0.55} horizon={s.horizon} tilt={s.tilt} />
            <text x={x} y={istop(20, w) + 14} style={labelStyle}>{s.name}</text>
            <text x={x} y={istop(20, w) + 28} style={{ ...metaStyle, fill: s.auto.startsWith("never") ? "var(--pd-amber, #f5a524)" : "var(--pd-ink-faint)" }}>
              auto {s.auto}
            </text>
            <text x={x} y={istop(20, w) + 41} style={{ ...metaStyle, fill: s.chip === "—" ? "var(--pd-amber, #f5a524)" : "var(--pd-accent-ink)" }}>
              chip {s.chip}
            </text>
          </g>
        );
      })}
    </DiagramFrame>
  );
}
const istop = (y: number, w: number) => y + Math.round((w * 9) / 16);
const labelStyle: React.CSSProperties = { fill: "var(--pd-ink)", fontFamily: "var(--pd-font-sans)", fontSize: 10, fontWeight: 600 };
const metaStyle: React.CSSProperties = { fontFamily: "var(--pd-font-mono)", fontSize: 8.5 };

/** Fig. 09 — DRAFT restructure: three intent groups plus a shot modifier. */
function ProposalDiagram() {
  return (
    <DiagramFrame
      id="09"
      title="Draft: three intents + a shot modifier"
      caption="Proposal only. Pick what must stay the same first, then (optionally) a shot size or angle that is appended to every prompt instead of replacing it."
      width={880}
      height={250}
    >
      <DEdge points={[[176, 125], [236, 125], [236, 52], [296, 52]]} />
      <DEdge points={[[176, 125], [296, 125]]} />
      <DEdge points={[[176, 125], [236, 125], [236, 198], [296, 198]]} />
      <DEdge points={[[496, 52], [560, 52], [560, 112], [620, 112]]} dashed />
      <DEdge points={[[496, 125], [620, 125]]} dashed />
      <DEdge points={[[496, 198], [560, 198], [560, 138], [620, 138]]} dashed label="+ SHOT" labelAt={[560, 180]} />
      <DNode x={24} y={97} w={152} kind="focal" tag="source" name="Original still" sub="image + sref + palette" />
      <DNode x={296} y={24} w={200} tag="A · Look" name="Same style / look" sub="new subject & place, same grade" />
      <DNode x={296} y={97} w={200} tag="B · Continuity" name="Same person, new day" sub="new location · outfit · light" />
      <DNode x={296} y={170} w={200} tag="C · Coverage" name="Same scene, new beat" sub="action · reaction · insert · b-roll" />
      <DNode x={620} y={97} w={236} kind="async" tag="modifier · optional" name="Shot size + angle" sub="ECU … EWS · high · low · dutch · OTS" />
    </DiagramFrame>
  );
}

const SEND = `fal.subscribe("fal-ai/nano-banana-pro/edit", {
  input: {
    prompt,                 // one string from buildVariationPromptPlan()
    image_urls: [imageUrl], // the source still only (first reachable URL)
    num_images: 1,          // one FAL call per variation item
    aspect_ratio,           // "16:9" | "9:16" | "1:1" | "4:3" | "3:4"
    resolution: "2K",
    output_format: "png",
  },
});`;

const EXAMPLE = `mode: action-shot · group: Film · sref: 779163157 · detail: (none)

Later in the scene. Dramatic action or performing moment. Same person.
Preserve the Midjourney style reference --sref 779163157.
Keep the source color palette (#120806, #3b1408, #8a2e0c, #d9661c, #f6b14a).
Maintain its Cinematic visual style.
Change only what the variation request asks for; the result should still
feel like it belongs to the same SREF family.`;

export function Variations() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Image variations"
        lead="Generate turns one image into new frames with FAL Nano Banana Pro (edit). You pick a mode, an optional shot or detail, a count and an aspect. This page shows exactly what is sent today, where the modes overlap, and a draft for regrouping them."
      />
      <VariationFanDiagram />

      <DocsSection title="What gets sent" meta="src/trigger/variationGeneration.ts · convex/vision.ts">
        <Card style={{ padding: "12px 14px" }}>
          <PinKV k="Model" v="fal-ai/nano-banana-pro/edit" />
          <PinKV k="Key" v="FAL_KEY (Trigger env)" />
          <PinKV k="Images in" v="1 — the source still, no extra refs" />
          <PinKV k="Per item" v="1 FAL call, 1 image, 2K PNG, no seed" />
          <PinKV k="Count" v="drawer 1·2·4·8 · upload form up to 12 · capped at 12" />
          <PinKV k="Runs on" v="pindeck-generate-variations → pindeck-generate-variation-item" />
        </Card>
        <CodeBlock title="The FAL request, per item" lang="text" code={SEND} />
        <P>
          The prompt is built in three layers: the mode template, then group context (only Shot Variation and Action Shot, only for Film, TV Series, Web Series, Music Video and Commercial), then SREF context, which is appended only when the image has an SREF. You can preview the exact strings with the <Code>getVariationPromptsForImage</Code> query.
        </P>
        <CodeBlock title="Example: final prompt string" lang="text" code={EXAMPLE} />
      </DocsSection>

      <DocsSection title="Mode templates" meta="MODE_PROMPTS · {detail} = shot chip or custom detail">
        <DocsTable
          columns={["Mode", "No detail", "With detail", "Issues"]}
          rows={[
            [<Code>shot-variation</Code>, "Later in the scene. {SHOT_TYPES[i]} of the same subject. (a different shot per item)", "Later in the scene. {detail} of the same subject. (same for every item)", "Close to Subtle. With a detail, every item gets the identical prompt."],
            [<Code>subtle-variation</Code>, "Later in the same scene. Same story, different moment – same person, different action or position.", "Later in the scene: {detail}. Same person and setting.", "Overlaps Shot Variation and Action Shot. A shot chip turns it into Shot Variation."],
            [<Code>action-shot</Code>, "Dramatic action or performing moment. Same person.", "{detail}. Same person.", "A shot chip replaces the action: \"close-up. Same person.\" Location is never stated."],
            [<Code>b-roll</Code>, "Establishing shot of the environment. No people. Same location and lighting.", "{detail}. Same location/environment. No people visible.", "Overlaps Coverage; both are people-free frames of the same place."],
            [<Code>style-variation</Code>, "Same person, different scene. Different outfit, different location, same face and likeness.", "Same person at {detail}. Different outfit and location, same face.", "Name says style, does continuity. A shot chip reads \"Same person at close-up\". Style is kept only via SREF text."],
            [<Code>coverage</Code>, "Show something else in the same environment. A detail or object that could mean something – no people. Same world as the image.", "{detail}. Same environment, no people.", "With a detail it is near-identical to B-Roll."],
          ]}
        />
      </DocsSection>

      <ShotStripDiagram />

      <DocsSection title="Findings">
        <DocsTable
          columns={["#", "Finding", "Effect"]}
          rows={[
            ["1", "Shot chip and custom detail write the same field (variationDetail).", "Choosing a chip on Action, Style or Coverage replaces the mode's own idea instead of adding a camera note."],
            ["2", "Three modes mean \"same person, later in the scene\" (Shot, Subtle, Action).", "Results often look alike; only Shot Variation forces a camera change."],
            ["3", "B-Roll and Coverage both mean \"same place, no people\".", "Same kind of output; Coverage only leans to objects."],
            ["4", "There is no mode for \"same look, new subject\".", "Style reproduction exists only as SREF text, and only when the image has an SREF."],
            ["5", "Auto shot cycle stops at item 12.", "High angle, bird's eye, dutch and POV are never auto-picked; ECU and high angle have no chip."],
            ["6", "The 2.39 aspect chip sends 16:9.", "No true scope frame; crop afterwards."],
            ["7", "One source image, no seed, identical prompts with a detail.", "Repeat runs differ only by model randomness."],
          ]}
        />
      </DocsSection>

      <DocsSection title="Draft · proposed option groups" meta="DRAFT — not implemented, for review">
        <Callout tone="warn" title="Draft">
          Nothing below changes generation yet. It is a starting point for reworking the prompts together.
        </Callout>
        <ProposalDiagram />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          {[
            ["A · Same look", "Reproduce the style", "New subject or place, same grade, palette, lens and texture. Replaces nothing in the frame on purpose.", "Keep: palette, lighting, film stock, sref. Change: subject, setting."],
            ["B · Same person, new day", "Continuity", "Same face and build, new location, outfit, time of day. Today's Style Variation, renamed.", "Keep: likeness, look. Change: place, wardrobe, light."],
            ["C · Same scene, new beat", "Coverage", "Sub-options Action · Reaction · Insert (object) · B-roll (empty set). Merges Shot, Subtle, Action, Coverage, B-Roll.", "Keep: place, wardrobe, light. Change: what happens."],
          ].map(([tag, name, body, rule]) => (
            <Card key={tag} style={{ padding: "12px 14px" }}>
              <PinLabel right={<PinChip mono>draft</PinChip>}>{tag}</PinLabel>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)", marginBottom: 6 }}>{name}</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--pd-ink-dim)" }}>{body}</div>
              <div className="pd-mono" style={{ fontSize: 10, marginTop: 8, color: "var(--pd-ink-faint)" }}>{rule}</div>
            </Card>
          ))}
        </div>
        <P>
          Shot size and angle become a separate modifier (ECU, CU, MCU, medium, wide, EWS, high, low, dutch, OTS, bird's eye) that is appended as "Framing: …" to whichever intent is chosen, and the custom detail becomes its own free-text line. With no modifier, group C would cycle shots per item as Shot Variation does today.
        </P>
      </DocsSection>
    </>
  );
}
