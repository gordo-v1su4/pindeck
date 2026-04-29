// Shared action-button / label style tokens so Table, Modal, Grid and Edit
// surfaces all render identically. The TableView row action buttons are the
// design anchor: Radix Themes `variant="soft"`, `size="1"`, subtle opacity.
//
// Use by spreading into a Radix Themes <Button> / <IconButton>:
//   <Button {...ACTION_BTN} color="gray" className={ACCENT_BUTTON_CLASS}>Generate</Button>

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

export const MODAL_CONTENT_CLASS =
  "pd-glass-dialog creative-modal max-h-[88vh] overflow-y-auto text-zinc-100";

export const MODAL_TITLE_CLASS =
  "creative-modal-title text-[13px] font-semibold tracking-[-0.01em] text-zinc-100";

export const MODAL_DESCRIPTION_CLASS =
  "creative-modal-description mt-0.5 text-[10.5px] leading-[14px] text-zinc-500";

// Uppercase micro-label used above modal sections and form inputs.
export const FIELD_LABEL_CLASS =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500";

export const SECTION_LABEL_CLASS = FIELD_LABEL_CLASS;

export const FIELD_CLASS = "creative-field";
export const TEXTAREA_CLASS = "creative-textarea";
export const SELECT_CLASS = "creative-select";

export const PRIMARY_BUTTON_CLASS = "creative-action-primary";
export const SECONDARY_BUTTON_CLASS = "creative-action-secondary";
export const TERTIARY_BUTTON_CLASS = "creative-action-tertiary";
export const ACCENT_BUTTON_CLASS = "creative-action-accent";
export const ICON_BUTTON_CLASS = "creative-icon-button";
export const ICON_BUTTON_ACTIVE_CLASS = "creative-icon-button creative-icon-button--active";
export const PILL_BUTTON_CLASS = "creative-pill-button";
export const PILL_BUTTON_ACTIVE_CLASS =
  "creative-pill-button creative-pill-button--active";
export const PAGE_BUTTON_CLASS = "creative-page-button";

export const NEUTRAL_BADGE_CLASS = "creative-neutral-badge";
export const ACCENT_BADGE_CLASS = "creative-accent-badge";
export const CODE_BADGE_CLASS = "creative-code-badge";
export const PROGRESS_COPY_CLASS = "creative-progress-copy";

// Swatch styling (shared by ImageModal + TableView)
export const SWATCH_STYLE: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};
