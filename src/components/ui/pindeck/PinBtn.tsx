import React from "react";
import { PinIcon } from "./PinIcon";

interface PinBtnProps {
  children?: React.ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger" | "accent";
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function PinBtn({
  children,
  variant = "ghost",
  size = "sm",
  onClick,
  disabled,
  active,
  icon,
  className = "",
  style,
  title,
}: PinBtnProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 500,
    borderRadius: 5,
    transition: "all 140ms cubic-bezier(.2,.8,.2,1)",
    fontSize: size === "xs" ? 11 : 12,
    letterSpacing: "0.005em",
    padding: size === "xs" ? "3px 8px" : size === "md" ? "7px 12px" : "5px 10px",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--pd-accent)", color: "white", border: "1px solid rgba(255,255,255,0.08)" },
    ghost: { background: "transparent", color: "var(--pd-ink-dim)", border: "1px solid transparent" },
    outline: { background: "rgba(255,255,255,0.015)", color: "var(--pd-ink-dim)", border: "1px solid var(--pd-line-strong)" },
    danger: { background: "transparent", color: "var(--pd-red)", border: "1px solid rgba(239,67,67,0.3)" },
    accent: {
      background: "var(--pd-accent-soft)",
      color: "var(--pd-accent-ink)",
      border: "1px solid color-mix(in srgb, var(--pd-accent) 38%, transparent)",
    },
  };

  const activeStyle: React.CSSProperties = active
    ? { background: "rgba(255,255,255,0.06)", color: "var(--pd-ink)" }
    : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
      style={{ ...base, ...variants[variant], ...activeStyle, ...style }}
    >
      {icon && <PinIcon name={icon} size={size === "xs" ? 11 : 13} />}
      {children}
    </button>
  );
}
