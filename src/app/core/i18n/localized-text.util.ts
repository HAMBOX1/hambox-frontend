import { SupportedLanguageId } from './locale.model';

/** Resolves a bilingual field for display: Arabic when active and non-empty, English otherwise. */
export function resolveLocalizedText(
  en: string,
  ar: string | null | undefined,
  lang: SupportedLanguageId,
): string {
  return lang === 'ar' && ar?.trim() ? ar : en;
}
