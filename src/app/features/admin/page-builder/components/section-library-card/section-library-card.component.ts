import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminStatusBadgeComponent } from '../../../../../shared/components/admin';
import { placeholderImage } from '../../../../home/section-registry/preview/section-preview-data';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';

/** Desktop viewport the live thumbnail iframe renders at, scaled down with CSS `transform` to fit the
 * card — matches the 16:9 `.section-library-card__thumb` aspect ratio exactly (720/1280 = 9/16), so
 * the scaled iframe fills the thumb with no cropping. */
const THUMB_BASE_WIDTH = 1280;
const THUMB_BASE_HEIGHT = 720;

/**
 * Fast-preview card for the Section Library grid. The thumbnail is the REAL section component,
 * rendered live in a scaled-down `<iframe>` pointed at the same `/page-builder/preview-section` route
 * the full-preview dialog uses — not a generic placeholder image, so the grid never shows something
 * that doesn't match what actually gets inserted. Lazy-mounted via `IntersectionObserver` (only cards
 * scrolled into view load their iframe) since mounting ~20 live Angular app instances upfront would be
 * wasteful; once mounted a card's iframe stays mounted rather than tearing down on scroll-out, since
 * the library is small enough that re-fetching on every re-entry isn't worth the added complexity.
 * Hover reveals a Quick Add button; double-click (or Quick Add) inserts immediately, a plain click
 * opens the full preview dialog.
 *
 * Structural note: the "open preview" affordance, the favorite toggle, and Quick Add are three
 * sibling `<button>`s (see the template) rather than buttons nested inside a `role="button"`
 * container — nested interactive controls are invalid ARIA and cause native `keydown` events on an
 * inner button to bubble into an outer click/keydown handler, double-firing both actions. Keeping
 * them as siblings, layered purely with CSS (`pointer-events`/absolute positioning), means each
 * button's native Enter/Space handling only ever triggers that one button's own output.
 */
@Component({
  selector: 'app-section-library-card',
  standalone: true,
  imports: [TranslatePipe, AdminStatusBadgeComponent],
  templateUrl: './section-library-card.component.html',
  styleUrl: './section-library-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionLibraryCardComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly variant = input.required<SectionVariantDefinition>();
  readonly favorited = input(false);

  readonly preview = output<void>();
  readonly quickAdd = output<void>();
  readonly favoriteToggle = output<void>();

  protected readonly thumb = viewChild.required<ElementRef<HTMLElement>>('thumb');

  protected readonly thumbWidth = THUMB_BASE_WIDTH;
  protected readonly thumbHeight = THUMB_BASE_HEIGHT;
  protected readonly scale = signal(0);
  protected readonly inView = signal(false);
  protected readonly iframeLoaded = signal(false);

  /** Shown underneath the iframe until it loads (and forever, if the iframe never mounts because the
   * card is never scrolled into view) — still per-variant-name deterministic, not a generic image. */
  protected readonly fallbackThumbnail = computed(
    () => this.variant().previewImage ?? placeholderImage(this.variant().displayName),
  );

  protected readonly previewUrl = computed<SafeResourceUrl>(() => {
    const variant = this.variant();
    const query = new URLSearchParams({ category: variant.category, variant: variant.variantKey }).toString();
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/page-builder/preview-section?${query}`);
  });

  constructor() {
    afterNextRender(() => {
      const element = this.thumb().nativeElement;

      const resizeObserver = new ResizeObserver(([entry]) =>
        this.scale.set(entry.contentRect.width / THUMB_BASE_WIDTH),
      );
      resizeObserver.observe(element);

      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.inView.set(true);
            intersectionObserver.disconnect();
          }
        },
        { rootMargin: '200px' },
      );
      intersectionObserver.observe(element);

      this.destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
      });
    });
  }

  protected onIframeLoad(): void {
    this.iframeLoaded.set(true);
  }
}
