/**
 * Curated collection chip presets — never a free-form color/icon picker. Colors map to
 * existing semantic design tokens (never hardcoded hex) so chips stay correct in both
 * dark and light themes; icons are PrimeIcons already used elsewhere in the admin.
 */
export interface CollectionColorPreset {
  readonly key: string;
  readonly label: string;
}

export const COLLECTION_COLOR_PRESETS: readonly CollectionColorPreset[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'success', label: 'Green' },
  { key: 'warning', label: 'Amber' },
  { key: 'danger', label: 'Red' },
  { key: 'info', label: 'Blue' },
  { key: 'price-green', label: 'Mint' },
  { key: 'price-blue', label: 'Sky' },
  { key: 'price-peach', label: 'Peach' },
];

export const COLLECTION_ICON_PRESETS: readonly string[] = [
  'pi pi-folder',
  'pi pi-tag',
  'pi pi-star',
  'pi pi-bolt',
  'pi pi-truck',
  'pi pi-megaphone',
  'pi pi-eye-slash',
  'pi pi-language',
  'pi pi-flag',
  'pi pi-box',
];

/** Resolves a stored `color` keyword (see `COLLECTION_COLOR_PRESETS`) to the live CSS
 * variable that renders it — falls back to the neutral text-muted token for unknown/absent values. */
export function collectionColorVar(color: string | null | undefined): string {
  if (!color) {
    return 'var(--admin-text-muted)';
  }

  const known = COLLECTION_COLOR_PRESETS.some((preset) => preset.key === color);
  return known ? `var(--color-${color})` : 'var(--admin-text-muted)';
}
