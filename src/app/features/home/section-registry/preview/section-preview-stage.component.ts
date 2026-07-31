import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminEmptyStateComponent } from '../../../../shared/components/admin';
import { LandingPageSectionEntry } from '../../models/landing-page-section.model';
import { SectionRendererComponent } from '../render/section-renderer.component';
import { resolveSectionVariant } from '../section-variant-registry';
import { SECTION_PREVIEW_CONTEXT } from './section-preview-data';

/**
 * Bare, layout-free page that renders exactly one registered section variant with its
 * `previewConfig` and the shared offline demo `SectionRenderContext`. Reached only via
 * `/page-builder/preview-section?category=...&variant=...`, loaded inside an `<iframe>` by
 * `SectionFullPreviewDialogComponent` so the section renders under a real, independent browser
 * viewport — the only way its `@media (max-width: ...)` breakpoints fire correctly, since they
 * check actual viewport width rather than container width. No admin chrome, no auth, no API calls.
 */
@Component({
  selector: 'app-section-preview-stage',
  standalone: true,
  imports: [SectionRendererComponent, AdminEmptyStateComponent, TranslatePipe],
  template: `
    <main class="section-preview-stage">
      @if (entry(); as e) {
        <app-section-renderer [entry]="e" [context]="context" />
      } @else {
        <div class="section-preview-stage__empty">
          <app-admin-empty-state
            icon="pi pi-exclamation-triangle"
            [title]="'ADMIN.PAGE_BUILDER.LIBRARY.PREVIEW_UNAVAILABLE_TITLE' | translate"
            [description]="'ADMIN.PAGE_BUILDER.LIBRARY.PREVIEW_UNAVAILABLE_DESCRIPTION' | translate"
          />
        </div>
      }
    </main>
  `,
  styles: `
    .section-preview-stage {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--color-background, #0b0b12);
    }

    .section-preview-stage__empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPreviewStageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: false });

  protected readonly context = SECTION_PREVIEW_CONTEXT;

  protected readonly entry = computed<LandingPageSectionEntry | null>(() => {
    const params = this.queryParams();
    const category = params?.get('category');
    const variantKey = params?.get('variant');
    if (!category || !variantKey) {
      return null;
    }

    const variant = resolveSectionVariant(category, variantKey);
    if (!variant) {
      return null;
    }

    return {
      instanceId: 'preview',
      category,
      variantKey,
      sortOrder: 0,
      isVisible: true,
      configJson: JSON.stringify(variant.previewConfig ?? {}),
    };
  });
}
