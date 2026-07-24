import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  signal,
  viewChild,
} from '@angular/core';

interface TocEntry {
  readonly id: string;
  readonly level: number;
  readonly text: string;
}

/**
 * Renders admin-authored rich HTML (product instructions, legal content, etc.) as a documentation
 * page: sticky table of contents, smooth-scroll anchors, copy-code buttons, an image lightbox, and
 * a reading-progress bar. Used by both the admin editor's Preview dialog and the customer-facing
 * instructions page — the one new shared component in this feature, justified by that immediate
 * dual use rather than speculative reuse.
 */
@Component({
  selector: 'app-rich-content-viewer',
  standalone: true,
  templateUrl: './rich-content-viewer.component.html',
  styleUrl: './rich-content-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichContentViewerComponent {
  readonly html = input<string>('');
  /** Set false in tight spaces (e.g. the admin Preview dialog) where a side TOC doesn't fit. */
  readonly showToc = input(true);

  private readonly contentRef = viewChild<ElementRef<HTMLElement>>('content');

  protected readonly toc = signal<readonly TocEntry[]>([]);
  protected readonly tocOpen = signal(true);
  protected readonly readingProgress = signal(0);
  protected readonly lightboxSrc = signal<string | null>(null);

  private cleanupContentListeners: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.html();
      // The effect fires as soon as `html()` changes, but [innerHTML] hasn't repainted the DOM
      // yet at that point — queue a microtask so this always runs after the binding updates.
      queueMicrotask(() => this.processContent());
    });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    const el = this.contentRef()?.nativeElement;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) {
      this.readingProgress.set(100);
      return;
    }

    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    this.readingProgress.set(Math.round((scrolled / total) * 100));
  }

  protected toggleToc(): void {
    this.tocOpen.update((open) => !open);
  }

  protected scrollToHeading(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected closeLightbox(): void {
    this.lightboxSrc.set(null);
  }

  private processContent(): void {
    const el = this.contentRef()?.nativeElement;
    this.cleanupContentListeners?.();
    this.cleanupContentListeners = null;

    if (!el) {
      this.toc.set([]);
      return;
    }

    this.buildToc(el);
    this.cleanupContentListeners = this.attachContentListeners(el);
    this.onWindowScroll();
  }

  private buildToc(el: HTMLElement): void {
    const headings = Array.from(el.querySelectorAll<HTMLElement>('h1, h2, h3, h4'));
    const seenIds = new Set<string>();

    const entries = headings.map((heading, index): TocEntry => {
      const text = heading.textContent?.trim() ?? '';
      let id = heading.id || this.slugify(text) || `section-${index}`;
      while (seenIds.has(id)) {
        id = `${id}-${index}`;
      }
      seenIds.add(id);
      heading.id = id;

      return { id, level: Number(heading.tagName.charAt(1)), text };
    });

    this.toc.set(entries);
  }

  /** Wires copy-code buttons and the image lightbox; returns a cleanup function for the next re-render. */
  private attachContentListeners(el: HTMLElement): () => void {
    const removers: (() => void)[] = [];

    for (const pre of Array.from(el.querySelectorAll('pre'))) {
      if (pre.querySelector('.rcv-copy-button')) {
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rcv-copy-button';
      button.textContent = 'Copy';
      const onClick = () => {
        void navigator.clipboard.writeText(pre.textContent ?? '').then(() => {
          button.textContent = 'Copied!';
          setTimeout(() => (button.textContent = 'Copy'), 1500);
        });
      };
      button.addEventListener('click', onClick);
      pre.style.position = 'relative';
      pre.appendChild(button);
      removers.push(() => button.removeEventListener('click', onClick));
    }

    for (const img of Array.from(el.querySelectorAll('img'))) {
      const onClick = () => this.lightboxSrc.set(img.src);
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', onClick);
      removers.push(() => img.removeEventListener('click', onClick));
    }

    return () => removers.forEach((remove) => remove());
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
