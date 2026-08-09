import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { LandingPageSectionEntry } from '../../models/landing-page-section.model';
import { SectionRenderContext } from '../models/section-variant.model';
import { resolveSectionVariant } from '../section-variant-registry';

/**
 * Renders one published landing-page section entry by looking up its registered variant
 * component and mounting it via NgComponentOutlet. Shared by the storefront home page and
 * the admin page-builder live preview — keep this component preview-agnostic.
 *
 * An entry whose category:variantKey isn't registered renders nothing (no throw). An entry whose
 * `configJson` fails to parse falls back to `{}` rather than throwing — a bad hand-edited JSON
 * blob (raw-JSON settings fallback) must never crash the storefront.
 *
 * This is also the single choke point every landing-page section passes through, so it's where
 * the shared cinematic transition system lives: a one-shot scroll-reveal (`hamboxReveal` +
 * `.motion-fade-up`, see shared/directives/scroll-reveal.directive.ts and styles/motion.scss)
 * plus a soft top-edge atmosphere blend (`.section-seam`) so sections feel like one continuous
 * journey rather than independently-animated blocks. Every section gets this for free — no
 * per-variant motion code needed. The Hero (first section) opts out of the seam since there's
 * nothing above it to blend from, and handles its own bottom transition instead.
 */
@Component({
  selector: 'app-section-renderer',
  standalone: true,
  imports: [NgComponentOutlet, ScrollRevealDirective],
  template: `
    @if (variant(); as v) {
      <div
        class="section-transition motion-fade-up"
        [class.section-seam]="!isFirst()"
        hamboxReveal
        [hamboxRevealThreshold]="0.08"
      >
        <ng-container *ngComponentOutlet="v.renderComponent; inputs: { context: context(), config: config() }" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionRendererComponent {
  readonly entry = input.required<LandingPageSectionEntry>();
  readonly context = input.required<SectionRenderContext>();
  readonly isFirst = input(false);

  protected readonly variant = computed(() =>
    resolveSectionVariant(this.entry().category, this.entry().variantKey),
  );

  protected readonly config = computed<unknown>(() => {
    const json = this.entry().configJson;
    if (!json || !json.trim()) {
      return {};
    }
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  });
}
