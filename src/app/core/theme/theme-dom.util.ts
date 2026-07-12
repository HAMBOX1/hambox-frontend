/** Remove inline `--theme-*` overrides from `<html>` so SCSS `data-theme` tokens apply. */
export function stripInlineThemeTokenOverrides(root: HTMLElement): void {
  for (const name of Array.from(root.style)) {
    if (name.startsWith('--theme-')) {
      root.style.removeProperty(name);
    }
  }
}
