import React from "react";

interface PinLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function PinLabel({ children, right, className = "" }: PinLabelProps) {
  return (
    <div
      className={`pd-mono ${className}`}
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--pd-ink-faint)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <span>{children}</span>
      {right}
    </div>
  );
}
