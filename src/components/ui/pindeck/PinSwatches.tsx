import React from "react";

interface PinSwatchesProps {
  colors?: string[];
  size?: number;
  gap?: number;
  className?: string;
}

export function PinSwatches({ colors = [], size = 10, gap = 0, className = "" }: PinSwatchesProps) {
  return (
    <span style={{ display: "inline-flex", gap }} className={className}>
      {colors.map((c, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            background: c,
            display: "inline-block",
            borderRadius: 1,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
          }}
        />
      ))}
    </span>
  );
}
