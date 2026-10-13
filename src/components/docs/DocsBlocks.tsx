import React, { useState } from "react";
import { Card, Heading, Text } from "@radix-ui/themes";
import { PinBtn, PinChip, PinLabel } from "@/components/ui/pindeck";

/** Page header: mono eyebrow + Radix heading, same as the Upload page cards. */
export function DocsHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}) {
  return (
    <div style={{ paddingTop: 8 }}>
      <PinLabel>{eyebrow}</PinLabel>
      <Heading size="6" style={{ letterSpacing: "-0.02em", color: "var(--pd-ink)" }}>
        {title}
      </Heading>
      <Text as="p" size="2" color="gray" style={{ marginTop: 8, maxWidth: 680, lineHeight: 1.6 }}>
        {lead}
      </Text>
    </div>
  );
}

export function DocsSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="pd-gallery-section-title" style={{ color: "var(--pd-ink)" }}>
          {title}
        </div>
        {meta ? <div className="pd-board-section-meta">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: "var(--pd-ink-dim)", maxWidth: 720 }}>
      {children}
    </p>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="pd-mono"
      style={{
        fontSize: 11,
        padding: "1px 5px",
        borderRadius: 3,
        background: "rgba(255,255,255,0.05)",
        color: "var(--pd-ink)",
      }}
    >
      {children}
    </code>
  );
}

/** Two-column field table in the Table view's style. */
export function DocsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div
      className="pd-scroll"
      style={{
        border: "1px solid var(--pd-line-strong)",
        borderRadius: "var(--pd-radius)",
        overflowX: "auto",
        background: "var(--pd-bg-1)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="pd-mono"
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--pd-ink-faint)",
                  borderBottom: "1px solid var(--pd-line-strong)",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "8px 12px",
                    verticalAlign: "top",
                    borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--pd-line)",
                    color: j === 0 ? "var(--pd-ink)" : "var(--pd-ink-dim)",
                    lineHeight: 1.5,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Light syntax pass: keys, strings, numbers, flags. Colours are theme vars only. */
function highlight(line: string, lang: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re =
    lang === "json"
      ? /("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g
      : /(\s-{1,2}[A-Za-z-]+)|("(?:[^"\\]|\\.)*"|'[^']*')|(\$[A-Z_]+|\{[A-Z_]+\})|(#.*$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    let color = "var(--pd-ink)";
    if (lang === "json") {
      if (m[1]) color = "var(--pd-accent-ink)";
      else if (m[2]) color = "var(--pd-ink)";
      else color = "var(--pd-amber)";
    } else {
      if (m[1]) color = "var(--pd-accent-ink)";
      else if (m[2]) color = "var(--pd-ink)";
      else if (m[3]) color = "var(--pd-amber)";
      else color = "var(--pd-ink-faint)";
    }
    out.push(
      <span key={k++} style={{ color }}>
        {t}
      </span>,
    );
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeBlock({
  title,
  lang,
  method,
  status,
  code,
}: {
  title: string;
  lang: "json" | "bash" | "text";
  method?: string;
  status?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div
      style={{
        border: "1px solid var(--pd-line-strong)",
        borderRadius: "var(--pd-radius)",
        background: "var(--pd-panel)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px 6px 12px",
          borderBottom: "1px solid var(--pd-line)",
          background: "var(--pd-bg-1)",
        }}
      >
        {method ? (
          <span
            className="pd-chip pd-chip--mono"
            style={{ background: "var(--pd-accent-soft)", color: "var(--pd-accent-ink)" }}
          >
            {method}
          </span>
        ) : null}
        {status ? (
          <PinChip mono color={status.startsWith("2") ? "#2ee6a6" : "#ef4343"}>
            {status}
          </PinChip>
        ) : null}
        <span className="pd-mono" style={{ fontSize: 10.5, color: "var(--pd-ink-dim)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <PinChip mono variant="outline">
          {lang}
        </PinChip>
        <PinBtn
          size="xs"
          variant="ghost"
          icon={copied ? "check" : "docs"}
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </PinBtn>
      </div>
      <pre
        className="pd-scroll pd-mono"
        style={{ margin: 0, padding: "10px 0", overflowX: "auto", fontSize: 11, lineHeight: 1.7 }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", padding: "0 12px 0 0" }}>
            <span
              aria-hidden="true"
              style={{
                width: 36,
                flexShrink: 0,
                textAlign: "right",
                paddingRight: 12,
                color: "var(--pd-ink-faint)",
                opacity: 0.6,
                userSelect: "none",
              }}
            >
              {i + 1}
            </span>
            <span style={{ color: "var(--pd-ink-dim)", whiteSpace: "pre" }}>
              {lang === "text" ? line : highlight(line, lang)}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/** Callout in the glass-card idiom: left accent rule, no shadow. */
export function Callout({
  tone = "accent",
  title,
  children,
}: {
  tone?: "accent" | "warn";
  title: string;
  children: React.ReactNode;
}) {
  const rule = tone === "warn" ? "var(--pd-amber)" : "var(--pd-accent)";
  return (
    <Card
      style={{
        borderLeft: `2px solid ${rule}`,
        padding: "12px 14px",
      }}
    >
      <div
        className="pd-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: tone === "warn" ? "var(--pd-amber)" : "var(--pd-accent-ink)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--pd-ink-dim)" }}>{children}</div>
    </Card>
  );
}
