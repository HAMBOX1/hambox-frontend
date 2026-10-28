import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { LandingPageSectionEntry } from '../../models/landing-page-section.model';
import { FlashDeal } from '../../models/storefront-home';
import { SectionProductSourceService } from '../../services/section-product-source.service';
import { readSectionCommon } from '../models/section-common.model';
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
 *
 * It is equally the one place for options every section shares (`_common` in the config): heading size and
 * colour, a call-to-action button under the section, and — for Products sections — a hand-picked / category /
 * internal-category product source with a limit and rotation. See `section-common.model.ts`.
 */
@Component({
  selector: 'app-section-renderer',
  standalone: true,
  imports: [NgComponentOutlet, ScrollRevealDirective, RouterLink],
  template: `
    @if (variant(); as v) {
      <div
        class="section-transition motion-fade-up"
        [class.section-seam]="!isFirst()"
        [class.section-title-size]="common().titleFontSize !== null"
        [class.section-title-color]="common().titleColor !== null"
        [style.--section-title-size]="common().titleFontSize ? common().titleFontSize + 'px' : null"
        [style.--section-title-color]="common().titleColor"
        hamboxReveal
        [hamboxRevealThreshold]="0.08"
      >
        <ng-container *ngComponentOutlet="v.renderComponent; inputs: { context: effectiveContext(), config: config() }" />

        @if (common().buttonLabel && common().buttonUrl) {
          <div class="section-common-cta" [attr.data-align]="common().buttonAlign">
            @if (isInternalLink(common().buttonUrl!)) {
              <a class="section-common-cta__button" [routerLink]="common().buttonUrl">{{ common().buttonLabel }}</a>
            } @else {
              <a class="section-common-cta__button" [href]="common().buttonUrl" rel="noopener">{{ common().buttonLabel }}</a>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .section-common-cta {
      display: flex;
      justify-content: center;
      padding: 0 16px 32px;
    }

    .section-common-cta[data-align='start'] {
      justify-content: flex-start;
    }

    .section-common-cta[data-align='end'] {
      justify-content: flex-end;
    }

    .section-common-cta__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 28px;
      border-radius: var(--sf-radius-pill, 999px);
      background: linear-gradient(160deg, var(--color-cta-gradient-start), var(--color-cta-gradient-end));
      color: var(--color-primary-text-on, #fff);
      font-weight: 700;
      text-decoration: none;
      box-shadow: var(--color-shadow-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionRendererComponent {
  private readonly productSource = inject(SectionProductSourceService);

  readonly entry = input.required<LandingPageSectionEntry>();
  readonly context = input.required<SectionRenderContext>();
  readonly isFirst = input(false);

  /** Products this section's own source resolved to; null = keep the page's default featured products. */
  private readonly productOverride = signal<readonly FlashDeal[] | null>(null);

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

  protected readonly common = computed(() => readSectionCommon(this.config()));

  protected readonly effectiveContext = computed<SectionRenderContext>(() => {
    const override = this.productOverride();
    return override ? { ...this.context(), featuredProducts: override } : this.context();
  });

  constructor() {
    // Only Products sections consume `featuredProducts`; for them, resolve the admin's chosen source.
    effect((onCleanup) => {
      const products = this.common().products;
      const isProductsSection = this.entry().category === 'Products';
      const defaults = this.context().featuredProducts;

      if (!products || !isProductsSection) {
        untracked(() => this.productOverride.set(null));
        return;
      }

      let cancelled = false;
      void this.productSource.resolve(products, defaults).then((resolved) => {
        if (!cancelled) {
          this.productOverride.set(resolved);
        }
      });

      onCleanup(() => {
        cancelled = true;
      });
    });
  }

  protected isInternalLink(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }
}
