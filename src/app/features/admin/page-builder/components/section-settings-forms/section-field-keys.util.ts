/** Builds `ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.{section}.{path}` label/helper i18n key pairs — the
 * per-section-settings-form analog of `storefrontFieldKeys()` in `storefront-settings-editor.component.ts`. */
export function sectionFieldKeys(section: string, path: string): { labelKey: string; helperKey: string } {
  const base = `ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.${section}.${path}`;
  return { labelKey: `${base}.LABEL`, helperKey: `${base}.HELP` };
}
