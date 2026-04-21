// Shared action-button / label style tokens so Table, Modal, Grid and Edit
// surfaces all render identically. The TableView row action buttons are the
// design anchor: Radix Themes `variant="soft"`, `size="1"`, subtle opacity.
//
// Use by spreading into a Radix Themes <Button> / <IconButton>:
//   <Button {...ACTION_BTN} color="teal">Generate</Button>

export const ACTION_BTN = {
  size: "1" as const,
  variant: "soft" as const,
  style: { opacity: 0.9 },
};

export const ACTION_ICON_BTN = {
  size: "1" as const,
  variant: "soft" as const,
  style: { opacity: 0.9 },
};

// Uppercase micro-label used above modal sections and form inputs.
export const FIELD_LABEL_CLASS =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40";

export const SECTION_LABEL_CLASS = FIELD_LABEL_CLASS;

// Swatch styling (shared by ImageModal + TableView)
export const SWATCH_STYLE: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};
