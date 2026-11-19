import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { LandingPageSectionEntry } from '../../models/landing-page-section.model';
import { FlashDeal } from '../../models/storefront-home';
import { SectionProductSourceService } from '../../services/section-product-source.service';
import { readSectionCommon } from '../models/section-common.model';
import { SectionRenderContext } from '../models/section-variant.model';
import { resolveSectionConfig } from '../section-config-defaults';
import { resolveSectionVariant } from '../section-variant-registry';

function parseConfigJson(json: string | null | undefined): unknown {
  if (!json || !json.trim()) {
    return {};
  }
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

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
        [class.section-text-size]="common().textFontSize !== null"
        [class.section-text-color]="common().textColor !== null"
        [attr.data-section-font]="common().fontFamily === 'default' ? null : common().fontFamily"
        [style.--section-title-size]="common().titleFontSize ? common().titleFontSize + 'px' : null"
        [style.--section-title-color]="common().titleColor"
        [style.--section-text-size]="common().textFontSize ? common().textFontSize + 'px' : null"
        [style.--section-text-color]="common().textColor"
        hamboxReveal
        [hamboxRevealThreshold]="0.08"
      >
        <ng-container *ngComponentOutlet="v.renderComponent; inputs: { context: effectiveContext(), config: config() }" />

        @if (hasCta()) {
          <div
            #cta
            class="section-common-cta"
            [attr.data-placement]="common().buttonPlacement"
            [attr.data-align]="common().buttonAlign ?? (common().buttonPlacement === 'text' ? 'start' : 'center')"
            [attr.data-size]="common().buttonSize"
            [attr.data-spacing]="common().buttonSpacing"
            [attr.data-style]="common().buttonStyle"
            [attr.data-shape]="common().buttonShape"
            [style.--cta-font-size]="common().buttonFontSize ? common().buttonFontSize + 'px' : null"
            [style.--cta-bg]="common().buttonColor"
            [style.--cta-fg]="common().buttonTextColor"
          >
            <div class="section-common-cta__stack">
              @if (common().buttonTextAbove; as above) {
                <p class="section-common-cta__text">{{ above }}</p>
              }
              @if (common().buttonLabel && common().buttonUrl) {
                @if (isInternalLink(common().buttonUrl!)) {
                  <a class="section-common-cta__button" [routerLink]="common().buttonUrl">{{ common().buttonLabel }}</a>
                } @else {
                  <a class="section-common-cta__button" [href]="common().buttonUrl" rel="noopener">{{ common().buttonLabel }}</a>
                }
              }
              @if (common().buttonTextBelow; as below) {
                <p class="section-common-cta__text">{{ below }}</p>
              }
            </div>
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

    // Under the section's heading text, inside the section (moved there by the renderer), like the hero button.
    .section-common-cta[data-placement='text'] {
      justify-content: flex-start;
      margin: 0 0 24px;
      padding: 0;
    }

    // The heading (or its subtitle) that now has the button right under it keeps only a small gap to it, instead of its
    // usual big gap to the content, so the button reads as part of the heading and not as part of the cards below.
    :host ::ng-deep h2:has(+ .section-common-cta[data-placement='text']),
    :host ::ng-deep p:has(+ .section-common-cta[data-placement='text']) {
      margin-bottom: 12px;
    }

    .section-common-cta[data-placement='text'][data-align='center'] {
      justify-content: center;
    }

    .section-common-cta[data-placement='text'][data-align='end'] {
      justify-content: flex-end;
    }

    // Tucked under the section's content instead of floating a full section-gap away from it.
    .section-common-cta[data-placement='bottom'][data-spacing='close'] {
      margin-top: calc(var(--sf-section-gap, 32px) * -0.5);
      padding-bottom: calc(var(--sf-section-gap, 32px) * 0.5);
    }

    // The button with the optional line of text above and below it, stacked and aligned together.
    .section-common-cta__stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      text-align: center;
    }

    .section-common-cta[data-align='start'] .section-common-cta__stack {
      align-items: flex-start;
      text-align: start;
    }

    .section-common-cta[data-align='end'] .section-common-cta__stack {
      align-items: flex-end;
      text-align: end;
    }

    .section-common-cta__text {
      margin: 0;
      color: var(--section-text-color, var(--color-text-secondary));
      font-size: var(--section-text-size, 14px);
      line-height: 1.5;
    }

    // Inside the section's own content (moved there by the renderer): no extra outer spacing of its own.
    .section-common-cta[data-placement='inside'] {
      margin: 24px 0 0;
      padding: 0;
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
      --_cta-default-bg: var(--cta-bg, linear-gradient(160deg, var(--color-cta-gradient-start), var(--color-cta-gradient-end)));
      --_cta-default-fg: var(--cta-fg, var(--color-primary-text-on, #fff));
      background: var(--_cta-default-bg);
      color: var(--_cta-default-fg);
      font-weight: 700;
      text-decoration: none;
      box-shadow: var(--color-shadow-md);
    }

    // The admin's own button colours and text size win over the style / size defaults below.
    .section-common-cta .section-common-cta__button {
      font-size: var(--cta-font-size, inherit);
    }

    .section-common-cta[data-size='small'] .section-common-cta__button {
      min-height: 38px;
      padding: 0 20px;
      font-size: 14px;
    }

    .section-common-cta[data-size='medium'] .section-common-cta__button {
      min-height: 48px;
      padding: 0 28px;
      font-size: 16px;
    }

    // Same size and shape as the big hero buttons.
    .section-common-cta[data-size='large'] .section-common-cta__button {
      min-height: 62px;
      padding: 0 40px;
      border-radius: var(--sf-radius-md, 12px);
      font-family: var(--sf-font-heading, inherit);
      font-size: 20px;
      font-weight: 600;
    }

    // How the button looks: filled (the default), an outline, or a soft tinted one - and its corner shape.
    .section-common-cta[data-style='outline'] .section-common-cta__button {
      border: 2px solid var(--cta-bg, var(--color-primary, #3cdc96));
      --_cta-default-bg: transparent;
      --_cta-default-fg: var(--cta-fg, var(--cta-bg, var(--color-primary, #3cdc96)));
      box-shadow: none;
    }

    .section-common-cta[data-style='soft'] .section-common-cta__button {
      border: 1px solid color-mix(in srgb, var(--cta-bg, var(--color-primary, #3cdc96)) 40%, transparent);
      --_cta-default-bg: color-mix(in srgb, var(--cta-bg, var(--color-primary, #3cdc96)) 16%, transparent);
      --_cta-default-fg: var(--cta-fg, var(--cta-bg, var(--color-primary, #3cdc96)));
      box-shadow: none;
    }

    .section-common-cta[data-shape='pill'] .section-common-cta__button {
      border-radius: 999px;
    }

    .section-common-cta[data-shape='rounded'] .section-common-cta__button {
      border-radius: var(--sf-radius-md, 12px);
    }

    .section-common-cta[data-shape='square'] .section-common-cta__button {
      border-radius: 4px;
    }

    @media (max-width: 767px) {
      .section-common-cta[data-size='large'] .section-common-cta__button {
        min-height: 54px;
        padding: 0 32px;
        font-size: 18px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionRendererComponent implements OnDestroy {
  private readonly productSource = inject(SectionProductSourceService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cta = viewChild<ElementRef<HTMLElement>>('cta');
  private placementObserver: MutationObserver | null = null;

  readonly entry = input.required<LandingPageSectionEntry>();
  readonly context = input.required<SectionRenderContext>();
  readonly isFirst = input(false);

  /** Products this section's own source resolved to; null = keep the page's default featured products. */
  private readonly productOverride = signal<readonly FlashDeal[] | null>(null);

  protected readonly variant = computed(() =>
    resolveSectionVariant(this.entry().category, this.entry().variantKey),
  );

  protected readonly config = computed<unknown>(() => {
    // Whatever is missing from the saved settings is filled in (see `resolveSectionConfig`), so a section added from the
    // library and never configured shows its starter content, and a half-filled one can never crash on a missing list.
    return resolveSectionConfig(parseConfigJson(this.entry().configJson), this.variant()?.previewConfig);
  });

  protected readonly common = computed(() => readSectionCommon(this.config()));

  /** The button block shows when there is a button, or just the lines of text the admin wrote around it. */
  protected readonly hasCta = computed(() => {
    const common = this.common();
    return !!(common.buttonLabel && common.buttonUrl) || !!common.buttonTextAbove || !!common.buttonTextBelow;
  });

  protected readonly effectiveContext = computed<SectionRenderContext>(() => {
    const override = this.productOverride();
    return override ? { ...this.context(), featuredProducts: override } : this.context();
  });

  constructor() {
    // Where the section button sits: right under the heading text, or after all the content.
    effect((onCleanup) => {
      const cta = this.cta()?.nativeElement;
      const placement = this.common().buttonPlacement;
      this.placementObserver?.disconnect();
      this.placementObserver = null;
      if (!cta) {
        return;
      }

      const wrapper = cta.closest('.section-transition') as HTMLElement | null;
      if (!wrapper) {
        return;
      }

      if (placement === 'bottom') {
        wrapper.appendChild(cta);
        return;
      }

      if (placement === 'inside') {
        // Inside the section itself: at the end of its content container (or of the section when it has none), so the
        // button sits within the section's background and padding instead of under it. Re-placed if the variant redraws.
        const placeInside = () => {
          const root = wrapper.firstElementChild?.firstElementChild ?? wrapper.firstElementChild;
          if (!(root instanceof HTMLElement) || root === cta) {
            return;
          }
          const inner = root.querySelector(':scope > [class*="container"], :scope > [class*="inner"], :scope > [class*="content"]');
          const target = inner instanceof HTMLElement ? inner : root;
          if (cta.parentElement !== target || target.lastElementChild !== cta) {
            target.appendChild(cta);
          }
        };
        placeInside();
        if (typeof MutationObserver !== 'undefined') {
          const observer = new MutationObserver(() => placeInside());
          observer.observe(wrapper, { childList: true, subtree: true });
          this.placementObserver = observer;
          onCleanup(() => observer.disconnect());
        }
        return;
      }

      // The variant fills in its own heading a moment after this component renders (and can redraw it later), so keep
      // watching: place the button under the heading as soon as it exists, and again if the redraw drops it.
      const place = () => {
        if (cta.isConnected && cta.parentElement !== wrapper) {
          return;
        }
        const heading = wrapper.querySelector('h2');
        if (!heading) {
          return;
        }
        const subtitle = heading.nextElementSibling;
        const anchor = subtitle instanceof HTMLParagraphElement ? subtitle : heading;
        anchor.after(cta);
      };

      place();
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
          if (!wrapper.contains(cta) || cta.parentElement === wrapper) {
            place();
          }
        });
        observer.observe(wrapper, { childList: true, subtree: true });
        this.placementObserver = observer;
        onCleanup(() => observer.disconnect());
      }
    });

    // Only Products sections consume `featuredProducts`; for them, resolve the admin's chosen source.
    effect((onCleanup) => {
      const products = this.common().products;
      // A Popular Categories section switched to "products" takes its items from the same source options.
      const isProductsSection =
        this.entry().category === 'Products' ||
        (this.entry().category === 'Categories' &&
          (this.config() as { contentType?: string }).contentType === 'products');
      const defaults = this.context().featuredProducts;

      if (!isProductsSection) {
        untracked(() => this.productOverride.set(null));
        return;
      }

      let cancelled = false;

      if (!products) {
        // No custom source: still honour the section's own "Maximum products" when the default set is smaller.
        const raw = this.config() as { maximumProducts?: number; sortMethod?: string };
        void this.productSource.resolveDefaultLimit(Number(raw.maximumProducts), raw.sortMethod, defaults).then((resolved) => {
          if (!cancelled) {
            this.productOverride.set(resolved);
          }
        });
        onCleanup(() => {
          cancelled = true;
        });
        return;
      }

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

  ngOnDestroy(): void {
    this.placementObserver?.disconnect();
  }

  protected isInternalLink(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }
}
