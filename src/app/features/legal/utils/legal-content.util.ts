export interface LegalTocEntry {
  readonly id: string;
  readonly text: string;
  readonly level: 2 | 3;
}

export interface ProcessedLegalContent {
  readonly html: string;
  readonly toc: readonly LegalTocEntry[];
}

const WORDS_PER_MINUTE = 200;

/** Estimates reading time from rich-text HTML, stripping tags before counting words. */
export function estimateReadingTimeMinutes(html: string): number {
  const text = htmlToText(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/**
 * Assigns stable anchor ids to h2/h3 headings so a table of contents can smooth-scroll to them,
 * and returns the extracted TOC alongside the (still unsanitized) rewritten HTML.
 */
export function extractTableOfContents(html: string): ProcessedLegalContent {
  if (typeof DOMParser === 'undefined' || !html) {
    return { html, toc: [] };
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings = Array.from(doc.querySelectorAll('h2, h3'));
  const usedIds = new Set<string>();
  const toc: LegalTocEntry[] = [];

  for (const heading of headings) {
    const text = heading.textContent?.trim();
    if (!text) {
      continue;
    }

    const id = uniqueSlug(text, usedIds);
    heading.id = id;
    toc.push({ id, text, level: heading.tagName === 'H3' ? 3 : 2 });
  }

  return { html: doc.body.innerHTML, toc };
}

function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ');
  }

  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}

function uniqueSlug(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'section';

  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  used.add(candidate);
  return candidate;
}
