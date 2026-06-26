/** Supported HAMBOX theme identifiers. Add future themes here without changing components. */
export type ThemeId = 'hambox-dark' | 'hambox-light';

export interface ThemeDefinition {
  readonly id: ThemeId;
  readonly label: string;
  readonly description: string;
}

export const THEME_STORAGE_KEY = 'hambox.theme';

export const AVAILABLE_THEMES: readonly ThemeDefinition[] = [
  {
    id: 'hambox-dark',
    label: 'Dark',
    description: 'Marketplace dark theme',
  },
  {
    id: 'hambox-light',
    label: 'Light',
    description: 'Dashboard light theme',
  },
] as const;

export const DEFAULT_THEME_ID: ThemeId = 'hambox-dark';

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return AVAILABLE_THEMES.some((theme) => theme.id === value);
}
