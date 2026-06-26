/**
 * Future admin theme management can inject overrides on :root without touching components.
 *
 * Example:
 * document.documentElement.style.setProperty('--theme-primary', adminPrimaryColor);
 * document.documentElement.style.setProperty('--theme-background', adminBackgroundColor);
 *
 * Components consume semantic tokens (--color-*) which always reference --theme-* values.
 */
export interface ThemeCustomizationPayload {
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly backgroundColor?: string;
  readonly surfaceColor?: string;
  readonly typographyFamily?: string;
  readonly radiusMd?: string;
  readonly shadowMd?: string;
}

export const THEME_CUSTOMIZATION_KEYS = [
  '--theme-primary',
  '--theme-primary-hover',
  '--theme-background',
  '--theme-surface',
  '--theme-card',
  '--hambox-font-family',
  '--sf-radius-md',
  '--theme-shadow-md',
] as const;
