/**
 * A section added from the Page Builder library used to be stored with an empty config (`{}`), and most section
 * templates read lists and texts straight from their config: a missing list threw an error that stopped every section
 * below it from drawing, and a section with nothing filled in showed up blank. This fills the gaps:
 *
 * - A section that was never configured (no settings at all) shows the variant's starter content, the same thing its
 *   card in the library shows, so adding a section immediately gives something to edit.
 * - A section that has some settings but is missing others gets the missing lists as empty lists and the missing
 *   texts as empty text (never the starter's sample content mixed into what the admin wrote), plus the starter's plain
 *   numbers/switches, so nothing can crash on a missing field.
 *
 * The shared options under `_common` (heading style, button, products source) are never touched.
 */
export function resolveSectionConfig(parsed: unknown, starter: unknown): unknown {
  const config = isRecord(parsed) ? parsed : {};
  if (!isRecord(starter)) {
    return config;
  }

  const hasOwnSettings = Object.keys(config).some((key) => key !== '_common');
  if (!hasOwnSettings) {
    return { ...starter, ...config };
  }

  const result: Record<string, unknown> = { ...config };
  for (const [key, value] of Object.entries(starter)) {
    if (key === '_common' || result[key] !== undefined) {
      continue;
    }
    result[key] = Array.isArray(value) ? [] : typeof value === 'string' ? '' : isRecord(value) ? {} : value;
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
