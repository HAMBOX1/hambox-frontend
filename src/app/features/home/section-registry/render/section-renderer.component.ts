import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
 */
@Component({
  selector: 'app-section-renderer',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @if (variant(); as v) {
      <ng-container *ngComponentOutlet="v.renderComponent; inputs: { context: context(), config: config() }" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionRendererComponent {
  readonly entry = input.required<LandingPageSectionEntry>();
  readonly context = input.required<SectionRenderContext>();

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
