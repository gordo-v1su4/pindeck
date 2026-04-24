/* Icons + small UI primitives for Pindeck */

const Icon = ({ name, size=14, stroke=1.6, className="" }) => {
  const s = size;
  const common = { width:s, height:s, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:stroke, strokeLinecap:"round", strokeLinejoin:"round", className };
  switch (name) {
    case "search": return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "masonry": return <svg {...common}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="3" y="15" width="7" height="6"/><rect x="14" y="11" width="7" height="10"/></svg>;
    case "table": return <svg {...common}><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
    case "board": return <svg {...common}><rect x="3" y="3" width="7" height="10"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="16" width="7" height="5"/><rect x="14" y="13" width="7" height="8"/></svg>;
    case "deck": return <svg {...common}><rect x="2" y="4" width="20" height="14" rx="1"/><path d="M7 20h10"/></svg>;
    case "upload": return <svg {...common}><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
    case "bolt": return <svg {...common}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>;
    case "sparkle": return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/></svg>;
    case "heart": return <svg {...common}><path d="M20.8 6.6a5 5 0 0 0-8.8-2.3 5 5 0 0 0-8.8 2.3c0 6.4 8.8 11.2 8.8 11.2s8.8-4.8 8.8-11.2z"/></svg>;
    case "eye": return <svg {...common}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "close": return <svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "chevron-down": return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-right": return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-left": return <svg {...common}><path d="m15 6-6 6 6 6"/></svg>;
    case "edit": return <svg {...common}><path d="M17 3l4 4L7 21H3v-4z"/></svg>;
    case "more": return <svg {...common}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "filter": return <svg {...common}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "sort": return <svg {...common}><path d="M8 3v18M4 7l4-4 4 4M16 21V3M12 17l4 4 4-4"/></svg>;
    case "tree": return <svg {...common}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8M12 14v2"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 5 5 9-12"/></svg>;
    case "discord": return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.6 5.5a18 18 0 0 0-4.5-1.4l-.2.4a17 17 0 0 0-5.8 0l-.2-.4a18 18 0 0 0-4.5 1.4A18.6 18.6 0 0 0 2 18.3a18 18 0 0 0 5.4 2.7l.4-.6a12 12 0 0 1-1.7-.8l.4-.3a13 13 0 0 0 11 0l.4.3a12 12 0 0 1-1.7.8l.4.6A18 18 0 0 0 22 18.3a18.6 18.6 0 0 0-2.4-12.8ZM9 15.4c-1 0-1.9-.9-1.9-2.1s.8-2.1 1.9-2.1 1.9.9 1.9 2.1c0 1.2-.8 2.1-1.9 2.1Zm6 0c-1 0-1.9-.9-1.9-2.1s.8-2.1 1.9-2.1 1.9.9 1.9 2.1c0 1.2-.8 2.1-1.9 2.1Z"/></svg>;
    case "dot": return <svg {...common}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case "bolt-fill": return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>;
    case "aspect": return <svg {...common}><rect x="2" y="6" width="20" height="12"/></svg>;
    case "film": return <svg {...common}><rect x="3" y="3" width="18" height="18"/><path d="M7 3v18M17 3v18M3 7h4M17 7h4M3 12h4M17 12h4M3 17h4M17 17h4"/></svg>;
    case "palette": return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="7" cy="14" r="1.2" fill="currentColor"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/></svg>;
    default: return null;
  }
};

/* Chip — the tag-pill pattern from EditImageModal */
const Chip = ({ children, color, variant="solid", mono=false, removable=false, onClick, onRemove, className="" }) => {
  const bg = color ? `${color}22` : undefined;
  const border = variant === "outline" ? (color || "rgba(255,255,255,0.14)") : "transparent";
  const text = color || "rgba(238,240,242,0.78)";
  return (
    <span
      className={`chip ${mono?"chip--mono":""} ${className}`}
      style={{
        background: variant === "outline" ? "transparent" : bg || "rgba(255,255,255,0.04)",
        borderColor: border,
        color: text,
        cursor: onClick || removable ? "pointer" : undefined
      }}
      onClick={onClick}
    >
      {children}
      {removable && (
        <span onClick={(e)=>{e.stopPropagation(); onRemove && onRemove();}} style={{opacity:0.6, marginLeft:2}}>×</span>
      )}
    </span>
  );
};

/* Button */
const Btn = ({ children, variant="ghost", size="sm", onClick, disabled, active, icon, className="", style }) => {
  const base = {
    display:"inline-flex", alignItems:"center", gap:6, fontWeight:500,
    borderRadius:5, transition:"all 140ms cubic-bezier(.2,.8,.2,1)",
    fontSize: size === "xs" ? 11 : 12, letterSpacing:"0.005em",
    padding: size === "xs" ? "3px 8px" : size === "md" ? "7px 12px" : "5px 10px",
    lineHeight:1.2, whiteSpace:"nowrap", cursor: disabled?"not-allowed":"pointer",
    opacity: disabled?0.45:1,
  };
  const variants = {
    primary: { background:"var(--accent)", color:"white", border:"1px solid rgba(255,255,255,0.08)" },
    ghost: { background:"transparent", color:"var(--ink-dim)", border:"1px solid transparent" },
    outline: { background:"rgba(255,255,255,0.015)", color:"var(--ink-dim)", border:"1px solid var(--line-strong)" },
    danger: { background:"transparent", color:"var(--red)", border:"1px solid rgba(239,67,67,0.3)" },
    accent: { background:"var(--accent-soft)", color:"var(--accent-ink)", border:"1px solid rgba(58,123,255,0.3)" },
  };
  const activeStyle = active ? { background:"rgba(255,255,255,0.06)", color:"var(--ink)" } : {};
  return (
    <button onClick={onClick} disabled={disabled} className={className}
      style={{...base, ...variants[variant], ...activeStyle, ...(style||{})}}>
      {icon && <Icon name={icon} size={size==="xs"?11:13} />}
      {children}
    </button>
  );
};

/* Swatch strip — palette inline */
const Swatches = ({ colors = [], size=10, gap=0, className="" }) => (
  <span style={{display:"inline-flex", gap}} className={className}>
    {colors.map((c,i)=>(
      <span key={i} style={{width:size, height:size, background:c, display:"inline-block", borderRadius:1, boxShadow:"inset 0 0 0 1px rgba(0,0,0,0.3)"}}/>
    ))}
  </span>
);

/* Section label */
const Label = ({ children, right, className="" }) => (
  <div className={`mono ${className}`} style={{
    fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase",
    color:"var(--ink-faint)", display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:8
  }}>
    <span>{children}</span>
    {right}
  </div>
);

/* KV row — key/value line */
const KV = ({ k, v, mono=true }) => (
  <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"5px 0", borderBottom:"1px dashed var(--line)", fontSize:11.5}}>
    <span className="mono" style={{color:"var(--ink-faint)", fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase"}}>{k}</span>
    <span className={mono?"mono":""} style={{color:"var(--ink)", maxWidth:"60%", textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{v}</span>
  </div>
);

/* Tooltip-ish label */
const Hotkey = ({ k }) => (
  <span className="mono" style={{
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    minWidth:16, height:16, padding:"0 4px", fontSize:10,
    color:"var(--ink-mute)", background:"rgba(255,255,255,0.04)",
    border:"1px solid var(--line)", borderRadius:3
  }}>{k}</span>
);

Object.assign(window, { Icon, Chip, Btn, Swatches, Label, KV, Hotkey });
