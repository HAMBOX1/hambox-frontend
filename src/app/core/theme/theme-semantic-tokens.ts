/** Semantic design tokens exposed to admins. Values map to CSS custom properties at runtime. */
export const THEME_SEMANTIC_TOKENS = {
  Primary: 'primary',
  Secondary: 'secondary',
  Accent: 'accent',
  Success: 'success',
  Warning: 'warning',
  Danger: 'danger',
  Background: 'background',
  Surface: 'surface',
  SurfaceElevation: 'surfaceElevation',
  Card: 'card',
  Border: 'border',
  Divider: 'divider',
  Typography: 'typography',
  BorderRadius: 'borderRadius',
  Spacing: 'spacing',
  Shadow: 'shadow',
  AnimationSpeed: 'animationSpeed',
  ButtonRadius: 'buttonRadius',
  InputRadius: 'inputRadius',
  Navbar: 'navbar',
  Sidebar: 'sidebar',
  Footer: 'footer',
} as const;

export type ThemeSemanticTokenKey =
  (typeof THEME_SEMANTIC_TOKENS)[keyof typeof THEME_SEMANTIC_TOKENS];

export const REQUIRED_THEME_SEMANTIC_TOKENS: readonly ThemeSemanticTokenKey[] = [
  THEME_SEMANTIC_TOKENS.Primary,
  THEME_SEMANTIC_TOKENS.Background,
  THEME_SEMANTIC_TOKENS.Surface,
  THEME_SEMANTIC_TOKENS.Card,
  THEME_SEMANTIC_TOKENS.Border,
  THEME_SEMANTIC_TOKENS.Typography,
];

/** Maps semantic token keys to CSS custom property names (matches backend ThemeSemanticTokens.CssVariableMap). */
export const THEME_TOKEN_CSS_VAR_MAP: Readonly<Record<ThemeSemanticTokenKey, string>> = {
  [THEME_SEMANTIC_TOKENS.Primary]: '--theme-primary',
  [THEME_SEMANTIC_TOKENS.Secondary]: '--theme-info',
  [THEME_SEMANTIC_TOKENS.Accent]: '--theme-cta-gradient-start',
  [THEME_SEMANTIC_TOKENS.Success]: '--theme-success',
  [THEME_SEMANTIC_TOKENS.Warning]: '--theme-warning',
  [THEME_SEMANTIC_TOKENS.Danger]: '--theme-danger',
  [THEME_SEMANTIC_TOKENS.Background]: '--theme-background',
  [THEME_SEMANTIC_TOKENS.Surface]: '--theme-surface',
  [THEME_SEMANTIC_TOKENS.SurfaceElevation]: '--theme-elevated',
  [THEME_SEMANTIC_TOKENS.Card]: '--theme-card',
  [THEME_SEMANTIC_TOKENS.Border]: '--theme-border',
  [THEME_SEMANTIC_TOKENS.Divider]: '--theme-divider',
  [THEME_SEMANTIC_TOKENS.Typography]: '--hambox-font-family',
  [THEME_SEMANTIC_TOKENS.BorderRadius]: '--hambox-radius-md',
  [THEME_SEMANTIC_TOKENS.Spacing]: '--hambox-spacing-md',
  [THEME_SEMANTIC_TOKENS.Shadow]: '--theme-shadow-md',
  [THEME_SEMANTIC_TOKENS.AnimationSpeed]: '--hambox-transition-default',
  [THEME_SEMANTIC_TOKENS.ButtonRadius]: '--hambox-radius-sm',
  [THEME_SEMANTIC_TOKENS.InputRadius]: '--hambox-radius-sm',
  [THEME_SEMANTIC_TOKENS.Navbar]: '--theme-nav-bg',
  [THEME_SEMANTIC_TOKENS.Sidebar]: '--theme-sidebar',
  [THEME_SEMANTIC_TOKENS.Footer]: '--theme-footer-card',
};

export interface ThemeTokenSection {
  readonly id: string;
  readonly labelKey: string;
  readonly tokens: readonly ThemeSemanticTokenKey[];
}

export const THEME_TOKEN_SECTIONS: readonly ThemeTokenSection[] = [
  {
    id: 'brand',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.BRAND',
    tokens: [
      THEME_SEMANTIC_TOKENS.Primary,
      THEME_SEMANTIC_TOKENS.Secondary,
      THEME_SEMANTIC_TOKENS.Accent,
      THEME_SEMANTIC_TOKENS.Success,
      THEME_SEMANTIC_TOKENS.Warning,
      THEME_SEMANTIC_TOKENS.Danger,
    ],
  },
  {
    id: 'typography',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.TYPOGRAPHY',
    tokens: [THEME_SEMANTIC_TOKENS.Typography],
  },
  {
    id: 'surfaces',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.SURFACES',
    tokens: [
      THEME_SEMANTIC_TOKENS.Background,
      THEME_SEMANTIC_TOKENS.Surface,
      THEME_SEMANTIC_TOKENS.SurfaceElevation,
      THEME_SEMANTIC_TOKENS.Card,
      THEME_SEMANTIC_TOKENS.Border,
      THEME_SEMANTIC_TOKENS.Divider,
    ],
  },
  {
    id: 'layout',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.LAYOUT',
    tokens: [
      THEME_SEMANTIC_TOKENS.Navbar,
      THEME_SEMANTIC_TOKENS.Sidebar,
      THEME_SEMANTIC_TOKENS.Footer,
    ],
  },
  {
    id: 'buttons',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.BUTTONS',
    tokens: [THEME_SEMANTIC_TOKENS.ButtonRadius, THEME_SEMANTIC_TOKENS.InputRadius],
  },
  {
    id: 'effects',
    labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.EFFECTS',
    tokens: [
      THEME_SEMANTIC_TOKENS.BorderRadius,
      THEME_SEMANTIC_TOKENS.Spacing,
      THEME_SEMANTIC_TOKENS.Shadow,
      THEME_SEMANTIC_TOKENS.AnimationSpeed,
    ],
  },
];

export function tokenKeyToCssVar(tokenKey: string): string | null {
  const normalized = tokenKey as ThemeSemanticTokenKey;
  return THEME_TOKEN_CSS_VAR_MAP[normalized] ?? null;
}

export function tokenLabelKey(tokenKey: ThemeSemanticTokenKey): string {
  return `ADMIN.THEMES.TOKENS.LABELS.${tokenKey}`;
}
