import React from "react";

interface PinHotkeyProps {
  k: string;
}

export function PinHotkey({ k }: PinHotkeyProps) {
  return (
    <span
      className="pd-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        fontSize: 10,
        color: "var(--pd-ink-mute)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--pd-line)",
        borderRadius: 3,
      }}
    >
      {k}
    </span>
  );
}
