import React from "react";
import { Card } from "@radix-ui/themes";
import { PinChip, PinKV, PinLabel, PinSwatches } from "@/components/ui/pindeck";
import { Callout, Code, CodeBlock, DocsHeader, DocsSection, DocsTable, P } from "./DocsBlocks";
import { Variations } from "./DocsVariations";
import {
  ArchitectureDiagram,
  IngestSequenceDiagram,
  LifecycleDiagram,
  MediaPipelineDiagram,
  SourcesDiagram,
  TriggerDiagram,
} from "./DocsDiagrams";

export const DOCS_PAGES = [
  { id: "overview", label: "Overview", icon: "film" },
  { id: "sources", label: "Upload sources", icon: "upload" },
  { id: "ingest-api", label: "Agent ingest API", icon: "bolt" },
  { id: "lifecycle", label: "Image lifecycle", icon: "tree" },
  { id: "storage", label: "Media storage", icon: "image" },
  { id: "trigger", label: "Trigger & Work", icon: "play" },
  { id: "projects", label: "Projects & SREF", icon: "palette" },
  { id: "variations", label: "Image variations", icon: "sparkle" },
  { id: "secrets", label: "Secrets", icon: "lock" },
] as const;

export type DocsPageId = (typeof DOCS_PAGES)[number]["id"];

export function sanitizeDocsPage(raw: string | null): DocsPageId {
  return (DOCS_PAGES.find((p) => p.id === raw)?.id ?? "overview") as DocsPageId;
}

function Overview() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Overview"
        lead="A private reference library for cinematic stills. Images come in from five upload sources, get described (by the VLM or by an agent), are stored in RustFS, and are browsed as a gallery, a table, boards and decks."
      />
      <ArchitectureDiagram />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {[
          ["Convex", "Database, auth, queries and HTTP actions. One images table holds every row."],
          ["Media gateway + RustFS", "Durable files: original, preview and w320/w1280/w1920 renditions."],
          ["Trigger.dev", "Long work with retries: persisting, analysis, variations. Visible in Work."],
          ["Vercel", "Hosts the app. A push to main builds the site and runs convex deploy."],
        ].map(([k, v]) => (
          <Card key={k} style={{ padding: "12px 14px" }}>
            <PinLabel>{k}</PinLabel>
            <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--pd-ink-dim)" }}>{v}</div>
          </Card>
        ))}
      </div>
      <DocsSection title="Views" meta="Keyboard: G · T · B · D · U · H">
        <DocsTable
          columns={["View", "What it is for"]}
          rows={[
            ["Gallery", "Random, Project Rows or SREF Rows. Project Rows groups by projectName."],
            ["Table", "Every field in columns, sortable; palette and SREF chips."],
            ["Boards", "Hand-picked collections."],
            ["Decks", "Composed storyboards and pitch decks."],
            ["Upload", "Local Upload, Discord, Pinterest, Automation and Agent tabs."],
            ["Docs", "These pages. They follow the Tweaks accent and typography."],
          ]}
        />
      </DocsSection>
      <DocsSection title="From gallery to deck" meta="Gallery → Board → Deck">
        <DocsTable
          columns={["Step", "Where", "Action"]}
          rows={[
            ["1 · Bookmark", "Gallery (G)", "Hover a tile → bookmark (Save to board). Pick a board or Create New Board. The bookmark turns blue once the image is on a board. Repeat for every image you want on slides."],
            ["2 · Open the board", "Boards (B)", "Double-click a board card (or focus it and press Enter). Shots lists the pins; Storyboard lays them out in Grid, Hero or Strip. Lock Board is optional."],
            ["3 · Convert", "Boards, or the board's Decks tab", "Convert to Deck → creates a deck whose slides come from the board's pins."],
            ["4 · Compose", "Decks (D)", "Open the deck in the composer; edits autosave. Present or export PDF."],
          ]}
        />
        <Callout title="Empty deck?">
          Decks only pull images from a board that already has pins. Bookmark from Gallery first, then convert. + BLANK in Decks starts an empty deck without a board.
        </Callout>
      </DocsSection>
    </>
  );
}

function Sources() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Upload sources"
        lead="Each tab on the Upload page is a source. What differs is when the description is written and whether you review first."
      />
      <SourcesDiagram />
      <DocsTable
        columns={["Tab", "sourceType", "Lands as", "Who writes metadata", "On approve"]}
        rows={[
          ["Local Upload", <Code>upload</Code>, "draft", "Browser palette + VLM on upload", "finalizeUploads → active"],
          ["Discord", <Code>discord</Code>, "pending", "VLM after you keep it", "approveImage → draft, VLM runs"],
          ["Pinterest", <Code>pinterest</Code>, "pending", "VLM after you keep it", "approveImage → draft, VLM runs"],
          ["Automation", <Code>pinterest</Code>, "pending", "Scheduled board polling feeds the Pinterest queue", "same as Pinterest"],
          ["Agent", <Code>agent</Code>, "draft · aiStatus completed", "The agent: title, tags, colors, facets, sref", "finalizeUploads → active, nothing else runs"],
        ]}
      />
      <Callout title="Agent tab">
        Agent drafts render in the same metadata card as Local Upload, already filled in, with Discard and Approve. Approving only flips <Code>draft</Code> to <Code>active</Code>. No VLM, palette sampling or variations run, so it costs no OpenRouter credits.
      </Callout>
      <Callout tone="warn" title="Credits">
        Keeping a Discord or Pinterest item runs the VLM. With no OpenRouter credits, leave them pending or discard them.
      </Callout>
    </>
  );
}

const REQ = `curl -X POST "$PINDECK_CONVEX_SITE_URL/ingestExternal" \\
  -H "Authorization: Bearer $INGEST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`;

const BODY = `{
  "userId": "<convex users id>",
  "imageUrl": "https://s3.example.dev/storyception/agent-ingest/ember-ronin/0001.png",
  "title": "Samurai in burning wasteland",
  "description": "Lone ronin silhouetted against a wall of fire, ash in the air.",
  "projectName": "Ember Ronin",
  "category": "Film",
  "group": "Film",
  "genre": "Action",
  "style": "Cinematic",
  "shot": "Wide Shot",
  "tags": ["samurai", "fire", "silhouette", "amber", "midjourney"],
  "colors": ["#120806", "#3b1408", "#8a2e0c", "#d9661c", "#f6b14a"],
  "sref": "779163157 2227735029",
  "source": "midjourney",
  "sourceType": "agent",
  "externalId": "midjourney:3f2a9c1e:0:agent",
  "uniqueId": "midjourney:3f2a9c1e:0:agent"
}`;

const RES_QUEUED = `{
  "imageId": "k175nyc1mq0az38gzbg4p45h6d8g7p0z",
  "userId": "<convex users id>",
  "queued": true,
  "duplicate": false
}`;

const RES_DUP = `{
  "imageId": "k175nyc1mq0az38gzbg4p45h6d8g7p0z",
  "userId": "<convex users id>",
  "queued": false,
  "duplicate": true
}`;

function IngestApi() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Agent ingest API"
        lead="One HTTP endpoint on the Convex site. Host the file first, then post its public URL with everything you already know about the image."
      />
      <Card style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="pd-chip pd-chip--mono" style={{ background: "var(--pd-accent-soft)", color: "var(--pd-accent-ink)" }}>
            POST
          </span>
          <span className="pd-mono" style={{ fontSize: 12.5, color: "var(--pd-ink)" }}>
            {"{PINDECK_CONVEX_SITE_URL}"}/ingestExternal
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <PinKV k="Auth" v="Authorization: Bearer <INGEST_API_KEY>" />
          <PinKV k="Body" v="application/json" />
          <PinKV k="Required" v="imageUrl, userId" />
          <PinKV k="Idempotent on" v="externalId, then imageUrl" />
        </div>
      </Card>
      <IngestSequenceDiagram />
      <DocsSection title="Request" meta="curl · json">
        <CodeBlock title="Post one image" lang="bash" method="POST" code={REQ} />
        <CodeBlock title="payload.json · sourceType agent" lang="json" code={BODY} />
      </DocsSection>
      <DocsSection title="Fields" meta="convex/images/ingest.ts">
        <DocsTable
          columns={["Field", "Type", "Notes"]}
          rows={[
            [<Code>imageUrl</Code>, "string · required", "Public URL. With Trigger on, the row is created first and the file is copied to RustFS by pindeck-external-ingest."],
            [<Code>userId</Code>, "Id<users> · required", "Owner. Must be a bare Convex id; stray backticks give a 500 validator error."],
            [<Code>title</Code>, "string", "Per-image name. Default \"External Import\"."],
            [<Code>description</Code>, "string", "One line."],
            [<Code>tags</Code>, "string[]", "Subject, setting, mood, palette words. \"original\" is added. Never hex codes, never sref-N."],
            [<Code>category</Code>, "string", "Default \"General\". Agent batches use \"Film\"."],
            [<Code>source</Code>, "string", "Free text, e.g. midjourney."],
            [<Code>sref</Code>, "string", "Numeric codes only, space-separated. Omit when there are none."],
            [<Code>sourceType</Code>, "upload | discord | pinterest | agent | ai", "Decides status and what runs. See below."],
            [<Code>externalId</Code>, "string", "Dedupe key. An existing row with this id is returned, whatever its sourceType."],
            [<Code>sourceUrl</Code>, "string", "Defaults to imageUrl."],
            [<Code>importBatchId</Code>, "Id<importBatches>", "Optional batch grouping."],
            [<Code>colors</Code>, "#rrggbb[] · agent only", "Five swatches, dark to light. Stored as the palette, not as tags."],
            ...["group", "genre", "style", "shot"].map((field) => [
              <Code key={field}>{field}</Code>,
              "string · agent only",
              "Facet shown on the card. Trimmed to 120 chars.",
            ]),
            [<Code>projectName</Code>, "string · agent only", "One per look. Falls back to title."],
            [<Code>uniqueId</Code>, "string · agent only", "Defaults to externalId for agent rows."],
          ]}
        />
      </DocsSection>
      <DocsSection title="sourceType behaviour">
        <DocsTable
          columns={["sourceType", "status", "aiStatus", "Runs now", "Runs on approve"]}
          rows={[
            [<Code>agent</Code>, "draft", "completed", "Media persist only", "Nothing (publish)"],
            [<Code>pinterest · discord</Code>, "pending", "queued", "Media persist (+ Discord notice)", "VLM + palette"],
            [<Code>upload · ai · omitted</Code>, "active", "processing", "Media persist + VLM", "—"],
          ]}
        />
      </DocsSection>
      <DocsSection title="Responses">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          <CodeBlock title="New row, persisting in Trigger" lang="json" status="200" code={RES_QUEUED} />
          <CodeBlock title="Repost of the same externalId" lang="json" status="200" code={RES_DUP} />
        </div>
        <DocsTable
          columns={["Status", "Meaning"]}
          rows={[
            [<PinChip mono color="#ef4343">401</PinChip>, "Missing or wrong Bearer token."],
            [<PinChip mono color="#ef4343">400</PinChip>, "Missing imageUrl or userId."],
            [<PinChip mono color="#ef4343">405</PinChip>, "Not a POST."],
            [<PinChip mono color="#ef4343">502</PinChip>, "Legacy path only: fetch or RustFS persist failed. Retry with backoff."],
          ]}
        />
      </DocsSection>
      <Callout title="Order of operations">
        1 · upload to <Code>{"{MEDIA_GATEWAY_URL}"}/upload</Code> (multipart userId, folder <Code>agent-ingest/&lt;project-slug&gt;</Code>, file) · 2 · check the publicUrl returns 200 · 3 · post one item and look at it in Upload → Agent · 4 · post the rest.
      </Callout>
    </>
  );
}

function Lifecycle() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Image lifecycle"
        lead="A row is created once and then only moves forward. Status says where it shows up; aiStatus says whether its description is done."
      />
      <LifecycleDiagram />
      <DocsTable
        columns={["status", "Shows in", "Next"]}
        rows={[
          [<Code>pending</Code>, "Upload → Discord / Pinterest queue", "Keep (approveImage) or discard (rejectImage)"],
          [<Code>draft</Code>, "Upload → Review & finalize, or Agent tab", "Approve (finalizeUploads) or discard"],
          [<Code>active</Code>, "Gallery, Table, Boards, Decks", "Edit, refresh metadata, generate variations"],
        ]}
      />
      <DocsTable
        columns={["Field", "Values"]}
        rows={[
          [<Code>aiStatus</Code>, "queued · processing · completed · failed"],
          [<Code>storagePersistStatus</Code>, "pending · succeeded · failed"],
          [<Code>orchestrationRunId</Code>, "Trigger run currently owning the row"],
        ]}
      />
    </>
  );
}

function Storage() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Media storage"
        lead="Convex never keeps the image bytes long term. The media gateway writes them to RustFS and Convex stores the URLs."
      />
      <MediaPipelineDiagram />
      <CodeBlock
        title="Object layout · bucket pindeck"
        lang="text"
        code={`media-uploads/YYYY/MM_DD/original/<file>
media-uploads/YYYY/MM_DD/preview/<file>-preview.<ext>
media-uploads/YYYY/MM_DD/low/<file>-w320.<ext>
media-uploads/YYYY/MM_DD/high/<file>-w1280.<ext>
media-uploads/YYYY/MM_DD/high/<file>-w1920.<ext>`}
      />
      <DocsTable
        columns={["Step", "Detail"]}
        rows={[
          ["Agent hosting", "POST {MEDIA_GATEWAY_URL}/upload. The gateway default bucket is storyception; agent files sit under agent-ingest/<project-slug>/."],
          ["Persist", "pindeck-external-ingest copies the source into the pindeck bucket via /process-image and stores derivativeUrls."],
          ["Palette", "Five sampled colors. Local uploads sample in the browser; server jobs use sharp, then RustFS /palette. Agent colors are never overwritten."],
          ["Thumbnails", "preview + w320 for grids, w1280/w1920 for the drawer and lightbox."],
        ]}
      />
    </>
  );
}

function TriggerPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Trigger & Work"
        lead="Anything slow runs as a Trigger.dev task on the self-hosted control plane. The Work button in the top bar is a live window onto those runs."
      />
      <TriggerDiagram />
      <DocsTable
        columns={["Task", "Queue", "Started by"]}
        rows={[
          [<Code>pindeck-finalize-upload</Code>, "pindeck-media", "Browser and deck uploads, retry"],
          [<Code>pindeck-external-ingest</Code>, "pindeck-media", "/ingestExternal (Discord, Pinterest, agent)"],
          [<Code>pindeck-media-repair</Code>, "pindeck-media", "Single and bulk regeneration"],
          [<Code>pindeck-image-refresh</Code>, "pindeck-analysis", "Refresh, moderation approval, generated children"],
          [<Code>pindeck-generate-variations</Code>, "generation-orchestration", "Variation requests"],
          [<Code>pindeck-generate-variation-item</Code>, "pindeck-generation", "One FAL render per run, one attempt"],
        ]}
      />
      <DocsSection title="Reading the Work panel">
        <P>
          Each row shows the task, the image, a stage label and a percent. During an agent ingest you will see <Code>ingesting · Copying external image to Pindeck</Code>, then <Code>completed · External image imported</Code>. When a row fails, open the run in the Trigger.dev dashboard; the error and the step it stopped on are there.
        </P>
        <P>
          <Code>PINDECK_TRIGGER_ORCHESTRATION_ENABLED</Code> picks the path: true sends work to Trigger, false falls back to the Convex scheduler. Dispatches dedupe for one hour and hold a 15-minute lease per image.
        </P>
      </DocsSection>
    </>
  );
}

function Projects() {
  const good = ["#120806", "#3b1408", "#8a2e0c", "#d9661c", "#f6b14a"];
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Projects & SREF"
        lead="Project Rows groups by projectName, and the SREF field is filterable on its own. Keep each value in exactly one place."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          <Card style={{ padding: "12px 14px" }}>
          <PinLabel right={<PinChip mono color="#2ee6a6">right</PinChip>}>Agent card</PinLabel>
          <PinKV k="Title" v="Samurai in burning wasteland" mono={false} />
          <PinKV k="Project" v="Ember Ronin" mono={false} />
          <PinKV k="SREF" v="779163157 2227735029" />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
            {["samurai", "fire", "silhouette", "amber"].map((t) => (
              <PinChip key={t}>{t}</PinChip>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <PinSwatches colors={good} size={18} />
          </div>
        </Card>
          <Card style={{ padding: "12px 14px" }}>
          <PinLabel right={<PinChip mono color="#ef4343">wrong</PinChip>}>Old format</PinLabel>
          <PinKV k="Title" v="Ember Ronin - sref 779163157" mono={false} />
          <PinKV k="Project" v="Ember Ronin - sref 779163157" mono={false} />
          <PinKV k="SREF" v="779163157, 2227735029::2 --p" />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
            {["sref-779163157", "#d9661c", "samurai"].map((t) => (
              <PinChip key={t}>{t}</PinChip>
            ))}
          </div>
        </Card>
      </div>
      <DocsTable
        columns={["Rule", "Detail"]}
        rows={[
          ["One project per idea", "All images of one look share a projectName so they form one row. One sref used for two different ideas is two projects; one idea across srefs can share one."],
          ["Short names", "\"Ember Ronin\", \"Night Drive\". No sref, no numbers."],
          ["Title per image", "Made up from the picture."],
          ["SREF field only", "Never in titles, project names or tags."],
          ["Numbers, spaces", "779163157 2227735029 — no commas, no ::weights, no URLs, no image refs."],
          ["No sref? leave blank", "Image-reference-only prompts get an empty SREF."],
          ["uniqueId", "midjourney:<jobId>:<index>:agent, same as externalId."],
        ]}
      />
    </>
  );
}

function Secrets() {
  return (
    <>
      <DocsHeader
        eyebrow="Docs"
        title="Secrets"
        lead="Values live in Bitwarden Secrets Manager (BWS) or the repo's own .env / .env.local, and are read at runtime. They are never written into code, docs, payload files, PRs or skills."
      />
      <DocsTable
        columns={["Name", "Used for", "Where"]}
        rows={[
          [<Code>PROXMOX_HOME_HOSTINGER_DISCORD_BOT_PRIVATE_INGEST_API_KEY</Code>, "Bearer token for /ingestExternal", "BWS (fallback INGEST_API_KEY in .env.local)"],
          [<Code>INGEST_API_KEY</Code>, "Server-side check of that token", "Convex env"],
          [<Code>PROXMOX_HOME_PINDECK_PRIMARY_DISCORD_INGEST_OWNER_CONVEX_USER_ID</Code>, "userId for agent posts (trim backticks)", "BWS"],
          [<Code>PINDECK_CONVEX_SITE_URL</Code>, "Base URL of the HTTP actions", ".env"],
          [<Code>MEDIA_GATEWAY_URL · MEDIA_GATEWAY_TOKEN</Code>, "Hosting and RustFS writes", ".env · Convex env"],
          [<Code>MEDIA_GATEWAY_BUCKET · _USER_ID · _UPLOAD_PREFIX</Code>, "pindeck · pindeck · media-uploads", "Convex env"],
          [<Code>TRIGGER_API_URL · TRIGGER_PROJECT_REF</Code>, "Self-hosted Trigger.dev", ".env"],
          [<Code>PINDECK_TRIGGER_ORCHESTRATION_ENABLED</Code>, "Trigger vs scheduler path", "Convex env"],
        ]}
      />
      <Callout tone="warn" title="Rule">
        Refer to secrets by name. Scripts read them on the machine that runs them and keep them in memory only.
      </Callout>
    </>
  );
}

const PAGE_COMPONENTS: Record<DocsPageId, () => React.ReactElement> = {
  overview: Overview,
  sources: Sources,
  "ingest-api": IngestApi,
  lifecycle: Lifecycle,
  storage: Storage,
  trigger: TriggerPage,
  projects: Projects,
  variations: Variations,
  secrets: Secrets,
};

export function DocsView({ page, onPage }: { page: DocsPageId; onPage: (p: DocsPageId) => void }) {
  const Page = PAGE_COMPONENTS[page];
  const idx = DOCS_PAGES.findIndex((p) => p.id === page);
  const current = DOCS_PAGES[idx];
  const prev = DOCS_PAGES[idx - 1];
  const next = DOCS_PAGES[idx + 1];
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);
  return (
    <div
      ref={scrollRef}
      className="pd-scroll pd-fade-in"
      onScroll={(e) => setStuck(e.currentTarget.scrollTop > 90)}
      style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 40 }}
    >
      <label className="pd-docs-page-picker">
        <span className="pd-mono">Docs page</span>
        <select value={page} onChange={(event) => onPage(sanitizeDocsPage(event.target.value))}>
          {DOCS_PAGES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <div
        className="pd-docs-sticky"
        aria-hidden={!stuck}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          height: 0,
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "8px 20px",
            background: "var(--pd-bg-1)",
            borderBottom: "1px solid var(--pd-line)",
            opacity: stuck ? 1 : 0,
            transform: stuck ? "translateY(0)" : "translateY(-6px)",
            transition: "opacity 160ms ease, transform 160ms ease",
            pointerEvents: stuck ? "auto" : "none",
          }}
        >
          <span className="pd-mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pd-accent-ink)" }}>
            Docs
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)" }}>{current.label}</span>
        </div>
      </div>
      <div
        key={page}
        className="max-w-4xl mx-auto w-full"
        style={{ display: "flex", flexDirection: "column", gap: 24, padding: "16px 20px 32px" }}
      >
        <Page />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--pd-line)", paddingTop: 16 }}>
          {prev ? (
            <button type="button" className="pd-mono" onClick={() => onPage(prev.id)} style={navLink}>
              ← {prev.label}
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button type="button" className="pd-mono" onClick={() => onPage(next.id)} style={navLink}>
              {next.label} →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const navLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--pd-ink-dim)",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
