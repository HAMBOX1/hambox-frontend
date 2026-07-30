import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiError } from '../../../../../core/models/api-error.model';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
} from '../../../../../shared/components/admin';
import { Home } from '../../../../home/services/home';
import { SectionRenderContext } from '../../../../home/section-registry/models/section-variant.model';
import { SectionRendererComponent } from '../../../../home/section-registry/render/section-renderer.component';
import { LandingPageSectionEntry } from '../../models/page-builder.model';
import { PreviewDevice } from '../device-preview-toggle/device-preview-toggle.component';

/**
 * Live preview of the draft landing page: renders the same real storefront category/product/
 * trending/trust data (via the `Home` service, root-provided — shared with the actual storefront
 * home page, not duplicated here) through `app-section-renderer`, the same renderer the storefront
 * home page uses. Data is fetched once on init; the preview is read-only and not reactive to the
 * live storefront, only to local draft edits (`sections` input).
 */
@Component({
  selector: 'app-builder-preview-pane',
  standalone: true,
  imports: [TranslatePipe, AdminEmptyStateComponent, AdminErrorAlertComponent, AdminLoadingSkeletonComponent, SectionRendererComponent],
  templateUrl: './builder-preview-pane.component.html',
  styleUrl: './builder-preview-pane.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderPreviewPaneComponent implements OnInit {
  private readonly home = inject(Home);

  readonly sections = input.required<readonly LandingPageSectionEntry[]>();
  readonly device = input<PreviewDevice>('desktop');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly context = signal<SectionRenderContext | null>(null);

  protected readonly visibleSections = computed(() =>
    [...this.sections()].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.home.loadHomeData();
      this.context.set({
        content: data.content,
        categories: data.categories,
        featuredProducts: data.featuredProducts,
        featuredHighlight: data.featuredHighlight,
        trendingRanks: data.trendingRanks,
        trendingValue: data.trendingValue,
        trustFeatures: data.trustFeatures,
        flashCountdownSeconds: data.content.flashDeals.countdownSeconds ?? 0,
      });
    } catch (error) {
      this.context.set(null);
      this.error.set(
        error instanceof ApiError ? error.message : 'Failed to load preview data.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
