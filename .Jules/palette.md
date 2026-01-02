## 2026-01-02 - Radix UI TextField Accessibility
**Learning:** Radix UI Themes `TextField.Root` does not render a visible label by default and propagates `aria-label` to the underlying input.
**Action:** Always add `aria-label` to `TextField.Root` if a visible `<label>` is not present.
