import React from "react";

interface PinKVProps {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
}

export function PinKV({ k, v, mono = true }: PinKVProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "5px 0",
        borderBottom: "1px dashed var(--pd-line)",
        fontSize: 11.5,
      }}
    >
      <span
        className="pd-mono"
        style={{
          color: "var(--pd-ink-faint)",
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {k}
      </span>
      <span
        className={mono ? "pd-mono" : ""}
        style={{
          color: "var(--pd-ink)",
          maxWidth: "60%",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {v}
      </span>
    </div>
  );
}
