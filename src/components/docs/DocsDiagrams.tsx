import { DEdge, DNode, DZone, DiagramFrame } from "./DocsDiagram";

/** Fig. 01 — system architecture: where an image enters and where it lives. */
export function ArchitectureDiagram() {
  return (
    <DiagramFrame
      id="01"
      title="System architecture"
      caption="Every source ends in one Convex images table. The agent path (accent) is the only one that arrives fully described, so it skips AI analysis."
      width={880}
      height={332}
    >
      <DZone x={248} y={124} w={344} h={108} label="Convex · self-hosted" />
      <DZone x={624} y={28} w={232} h={292} label="Workers + storage" />
      {/* edges first, nodes on top */}
      <DEdge points={[[192, 68], [496, 68], [496, 148]]} label="MUTATION" />
      <DEdge points={[[192, 140], [220, 140], [220, 162], [264, 162]]} />
      <DEdge points={[[192, 212], [228, 212], [228, 176], [264, 176]]} />
      <DEdge points={[[192, 284], [236, 284], [236, 190], [264, 190]]} accent label="BEARER" labelAt={[214, 300]} />
      <DEdge points={[[408, 176], [424, 176]]} />
      <DEdge points={[[568, 166], [604, 166], [604, 88], [640, 88]]} label="DISPATCH" labelAt={[604, 124]} />
      <DEdge points={[[740, 116], [740, 148]]} label="PROCESS" />
      <DEdge points={[[740, 204], [740, 236]]} label="PUT" />

      <DNode x={24} y={40} w={168} kind="input" tag="Upload tab" name="Local upload" sub="browser · drag & drop" />
      <DNode x={24} y={112} w={168} kind="input" tag="Bot" name="Discord" sub="emoji reaction" />
      <DNode x={24} y={184} w={168} kind="input" tag="Sidecar" name="Pinterest" sub="boards · polling" />
      <DNode x={24} y={256} w={168} kind="input" tag="sourceType: agent" name="Agent" sub="pre-tagged batch" />
      <DNode x={264} y={148} w={144} tag="HTTP action" name="/ingestExternal" sub="Bearer INGEST_API_KEY" />
      <DNode x={424} y={148} w={144} kind="focal" tag="Database" name="images" sub="status · aiStatus" />
      <DNode x={640} y={60} w={200} kind="async" tag="Orchestration" name="Trigger.dev" sub="queues · retries · metadata" />
      <DNode x={640} y={148} w={200} tag="Media API" name="Media gateway" sub="/upload · /process-image" />
      <DNode x={640} y={236} w={200} kind="store" tag="Object storage" name="RustFS" sub="original · preview · w320–w1920" />
    </DiagramFrame>
  );
}

/** Fig. 02 — which status each upload source lands in. */
export function SourcesDiagram() {
  return (
    <DiagramFrame
      id="02"
      title="Upload sources and where they land"
      caption="Moderated sources wait in pending until you keep them; keeping one runs the VLM. Local uploads are analysed on upload. Agent rows arrive as finished drafts."
      width={880}
      height={384}
    >
      <DEdge points={[[200, 44], [440, 44]]} label="VLM ON UPLOAD" />
      <DEdge points={[[200, 124], [400, 124], [400, 64], [440, 64]]} accent label="NO VLM" labelAt={[300, 112]} />
      <DEdge points={[[200, 196], [360, 196], [360, 252], [440, 252]]} />
      <DEdge points={[[200, 268], [440, 268]]} />
      <DEdge points={[[200, 340], [372, 340], [372, 284], [440, 284]]} label="POLLING" labelAt={[286, 328]} />
      <DEdge points={[[520, 240], [520, 84]]} label="KEEP + VLM" />
      <DEdge points={[[616, 52], [680, 52]]} />

      <DNode x={24} y={24} w={176} kind="input" tag="Tab 1" name="Local Upload" sub="sourceType: upload" />
      <DNode x={24} y={96} w={176} kind="input" tag="Tab 5" name="Agent" sub="sourceType: agent" />
      <DNode x={24} y={168} w={176} kind="input" tag="Tab 2" name="Discord" sub="sourceType: discord" />
      <DNode x={24} y={240} w={176} kind="input" tag="Tab 3" name="Pinterest" sub="sourceType: pinterest" />
      <DNode x={24} y={312} w={176} kind="input" tag="Tab 4" name="Automation" sub="scheduled board poll" />
      <DNode x={440} y={24} w={176} kind="focal" tag="status: draft" name="Review & finalize" sub="metadata card · approve" />
      <DNode x={440} y={240} w={176} tag="status: pending" name="Review queue" sub="keep or discard" />
      <DNode x={680} y={24} w={176} kind="store" tag="status: active" name="Library" sub="gallery · table · boards" />
    </DiagramFrame>
  );
}

/** Fig. 03 — agent ingest as a sequence. */
export function IngestSequenceDiagram() {
  const lanes = [
    { x: 90, name: "Agent", sub: "script / bot" },
    { x: 260, name: "Media gateway", sub: "MEDIA_GATEWAY_URL" },
    { x: 430, name: "/ingestExternal", sub: "Convex HTTP" },
    { x: 600, name: "images", sub: "Convex table" },
    { x: 770, name: "Trigger.dev", sub: "pindeck-media" },
  ];
  const msgs: Array<{ from: number; to: number; label: string; dashed?: boolean; accent?: boolean }> = [
    { from: 0, to: 1, label: "POST /upload" },
    { from: 1, to: 0, label: "publicUrl", dashed: true },
    { from: 0, to: 2, label: "POST + BEARER", accent: true },
    { from: 2, to: 3, label: "INSERT DRAFT" },
    { from: 2, to: 4, label: "DISPATCH" },
    { from: 2, to: 0, label: "200 · queued", dashed: true },
    { from: 4, to: 2, label: "CALLBACK", dashed: true },
    { from: 2, to: 3, label: "PERSISTED" },
  ];
  const top = 92;
  const step = 40;
  const height = top + msgs.length * step + 28;
  return (
    <DiagramFrame
      id="03"
      title="Agent ingest, one image"
      caption="Host first, then post. The response returns as soon as the row exists; Trigger copies the file into RustFS and writes thumbnails after."
      width={860}
      height={height}
    >
      {lanes.map((l) => (
        <line
          key={`ll-${l.x}`}
          x1={l.x}
          y1={76}
          x2={l.x}
          y2={height - 16}
          strokeDasharray="2,4"
          style={{ stroke: "var(--pd-line-hi)" }}
        />
      ))}
      {msgs.map((m, i) => {
        const y = top + i * step;
        const x1 = lanes[m.from].x;
        const x2 = lanes[m.to].x;
        const dir = Math.sign(x2 - x1);
        // per-message skip over intermediate lifelines is fine: they are hairlines, not boxes
        return (
          <DEdge
            key={`m-${i}`}
            points={[
              [x1 + dir * 4, y],
              [x2 - dir * 4, y],
            ]}
            dashed={m.dashed}
            accent={m.accent}
            label={m.label}
            labelAt={[(x1 + x2) / 2, y - 10]}
          />
        );
      })}
      {lanes.map((l, i) => (
        <DNode
          key={`n-${l.x}`}
          x={l.x - 72}
          y={20}
          w={144}
          h={52}
          kind={i === 2 ? "focal" : i === 4 ? "async" : i === 0 ? "input" : "service"}
          name={l.name}
          sub={l.sub}
        />
      ))}
    </DiagramFrame>
  );
}

/** Fig. 04 — image lifecycle state machine. */
export function LifecycleDiagram() {
  return (
    <DiagramFrame
      id="04"
      title="Image lifecycle"
      caption="Two fields move together: status (pending → draft → active) and aiStatus (queued → processing → completed). Agent rows are born draft + completed."
      width={720}
      height={292}
    >
      <DEdge points={[[192, 136], [212, 136], [212, 68], [240, 68]]} label="MODERATED" labelAt={[150, 96]} />
      <DEdge points={[[192, 160], [220, 160], [220, 228], [240, 228]]} label="UPLOAD · AGENT" labelAt={[150, 204]} />
      <DEdge points={[[324, 96], [324, 200]]} label="KEEP + VLM" />
      <DEdge points={[[408, 68], [520, 68]]} dashed label="DISCARD" />
      <DEdge points={[[408, 228], [520, 228]]} accent label="FINALIZE" />

      <DNode x={24} y={120} w={168} kind="input" tag="Entry" name="Ingest / upload" sub="row created" />
      <DNode x={240} y={40} w={168} tag="status" name="pending" sub="aiStatus: queued" />
      <DNode x={240} y={200} w={168} kind="focal" tag="status" name="draft" sub="aiStatus: completed" />
      <DNode x={520} y={40} w={168} kind="async" tag="terminal" name="discarded" sub="rejectImage" />
      <DNode x={520} y={200} w={168} kind="store" tag="status" name="active" sub="finalizeUploads" />
    </DiagramFrame>
  );
}

/** Fig. 05 — media storage pipeline. */
export function MediaPipelineDiagram() {
  return (
    <DiagramFrame
      id="05"
      title="Media storage pipeline"
      caption="The gateway fetches the source once and writes four renditions. Agent uploads keep their own palette; the gateway colors are only used when none were sent."
      width={720}
      height={340}
    >
      <DZone x={464} y={8} w={240} h={300} label="RustFS · media-uploads/" />
      <DEdge points={[[192, 148], [232, 148]]} />
      <DEdge points={[[408, 132], [436, 132], [436, 52], [480, 52]]} />
      <DEdge points={[[408, 144], [448, 144], [448, 120], [480, 120]]} />
      <DEdge points={[[408, 156], [448, 156], [448, 192], [480, 192]]} />
      <DEdge points={[[408, 168], [436, 168], [436, 264], [480, 264]]} />
      <DEdge points={[[320, 176], [320, 260]]} label="COLORS + URLS" />

      <DNode x={24} y={120} w={168} kind="input" tag="Input" name="Source URL" sub="gateway publicUrl" />
      <DNode x={232} y={120} w={176} kind="focal" tag="Media API" name="/process-image" sub="fetch · resize · palette" />
      <DNode x={480} y={28} w={208} h={48} kind="store" name="original" sub="YYYY/MM_DD/original/" />
      <DNode x={480} y={96} w={208} h={48} kind="store" name="preview" sub="…/preview/<file>-preview" />
      <DNode x={480} y={168} w={208} h={48} kind="store" name="low" sub="…/low/<file>-w320" />
      <DNode x={480} y={240} w={208} h={48} kind="store" name="high" sub="…/high/-w1280 · -w1920" />
      <DNode x={232} y={260} w={176} tag="Convex" name="images row" sub="storagePersistStatus" />
    </DiagramFrame>
  );
}

/** Fig. 06 — Trigger.dev queues and the Work panel. */
export function TriggerDiagram() {
  return (
    <DiagramFrame
      id="06"
      title="Trigger.dev queues"
      caption="Convex dispatches; Trigger runs the long work and calls a protected Convex endpoint back. The Work button in the top bar reads the same runs live."
      width={760}
      height={340}
    >
      <DEdge points={[[192, 148], [232, 148]]} label="TASK" labelAt={[212, 136]} />
      <DEdge points={[[408, 132], [436, 132], [436, 52], [480, 52]]} accent />
      <DEdge points={[[408, 144], [448, 144], [448, 120], [480, 120]]} />
      <DEdge points={[[408, 156], [448, 156], [448, 192], [480, 192]]} />
      <DEdge points={[[408, 168], [436, 168], [436, 264], [480, 264]]} />
      <DEdge points={[[320, 176], [320, 260]]} dashed label="REALTIME" />

      <DNode x={24} y={120} w={168} tag="Convex" name="triggerDispatch" sub="1h dedupe · lease" />
      <DNode x={232} y={120} w={176} kind="async" tag="Self-hosted" name="Trigger.dev" sub="trigger.v1su4.dev" />
      <DNode x={480} y={28} w={256} h={48} kind="focal" name="pindeck-media · 2" sub="finalize · external-ingest · repair" />
      <DNode x={480} y={96} w={256} h={48} name="pindeck-analysis · 2" sub="image-refresh (VLM + palette)" />
      <DNode x={480} y={168} w={256} h={48} name="generation-orchestration · 2" sub="generate-variations (parent)" />
      <DNode x={480} y={240} w={256} h={48} name="pindeck-generation · 1" sub="variation-item (one FAL call)" />
      <DNode x={232} y={260} w={176} kind="input" tag="Top bar" name="Work panel" sub="stage · stageLabel · %" />
    </DiagramFrame>
  );
}
