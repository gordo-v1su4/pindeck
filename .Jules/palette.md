## 2025-05-23 - Accessibility Patterns for Radix Themes
**Learning:** Radix UI Themes components like `TextField.Root` and `Select.Trigger` accept `aria-label` which is correctly passed down to the underlying input elements. This is crucial for accessibility when visible labels are omitted in favor of placeholders or compact UI designs (like cards).
**Action:** When using Radix Themes components without explicit `<label>` elements or visible label text, always provide `aria-label` directly to the Root or Trigger component.
