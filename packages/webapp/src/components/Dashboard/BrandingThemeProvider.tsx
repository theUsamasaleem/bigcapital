// @ts-nocheck
import React from 'react';
import { darken, parseToRgb } from 'polished';
import { useCurrentOrganization } from '@/hooks/query';

const STYLE_ELEMENT_ID = 'finqora-branding-theme';

/**
 * Validates a CSS hex color (e.g. #fff or #4456b9).
 */
function isValidHex(color: unknown): color is string {
  return typeof color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
}

/**
 * Builds the runtime stylesheet that applies the organization primary color
 * across the app's brand surfaces (CSS variables + Blueprint primary intent).
 */
function buildBrandingCss(primary: string): string {
  // Derive hover/active shades; fall back to the base color if computation fails.
  let hover = primary;
  let active = primary;
  try {
    hover = darken(0.06, primary);
    active = darken(0.12, primary);
  } catch {
    // keep base color
  }

  return `
:root, body.bp4-dark {
  --brand-primary: ${primary} !important;
  --brand-primary-hover: ${hover} !important;
  --brand-primary-active: ${active} !important;
  --color-primary: ${primary} !important;
  --color-sidebar-background: ${primary} !important;
  --color-sidebar-menu-item-focus-background: ${active} !important;
}
.bp4-button.bp4-intent-primary {
  background-color: ${primary} !important;
}
.bp4-button.bp4-intent-primary:hover {
  background-color: ${hover} !important;
}
.bp4-button.bp4-intent-primary:active,
.bp4-button.bp4-intent-primary.bp4-active {
  background-color: ${active} !important;
}
`;
}

/**
 * Applies the current organization's branding primary color as the single
 * source of truth for the app theme. Injects a runtime stylesheet so the
 * color propagates to the sidebar, primary buttons and brand accents without
 * a rebuild, and updates immediately when the branding preference changes.
 *
 * The login and other pre-auth pages have no organization context yet, so the
 * branding color only applies once an organization is loaded.
 */
export function BrandingThemeProvider() {
  const { data: organization } = useCurrentOrganization();

  // Metadata is returned snake_case from the API (no camelCase transform on
  // the organization fetcher), so the brand color lives at `primary_color`.
  const primaryColor =
    organization?.metadata?.primary_color ??
    organization?.metadata?.primaryColor;

  React.useEffect(() => {
    const head = document.head;
    if (!head) {
      return;
    }
    let styleEl = document.getElementById(
      STYLE_ELEMENT_ID,
    ) as HTMLStyleElement | null;

    // No valid brand color: remove any previously injected overrides so the
    // default theme is restored.
    if (!isValidHex(primaryColor)) {
      if (styleEl) {
        styleEl.remove();
      }
      return;
    }
    // Guard against unparseable colors before writing the stylesheet.
    try {
      parseToRgb(primaryColor);
    } catch {
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      head.appendChild(styleEl);
    }
    styleEl.textContent = buildBrandingCss(primaryColor);
  }, [primaryColor]);

  return null;
}
