import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { STOREFRONT_NAV_LINKS } from '../../../home/services/storefront-home-data';
import { PublicLegalSectionSummaryDto } from '../../models/legal-section.model';
import { LegalService } from '../../services/legal.service';

interface LegalCategoryGroup {
  readonly category: string;
  readonly items: readonly PublicLegalSectionSummaryDto[];
}

const UNCATEGORIZED = 'LEGAL.LANDING.UNCATEGORIZED';

@Component({
  selector: 'app-legal-landing-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    LoadingSkeletonComponent,
  ],
  templateUrl: './legal-landing-page.component.html',
  styleUrl: './legal-landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLandingPageComponent implements OnInit {
  protected readonly legal = inject(LegalService);
  protected readonly translation = inject(TranslationService);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_NAV_LINKS;
  protected readonly loading = this.legal.documentsLoading;

  protected readonly groups = computed<readonly LegalCategoryGroup[]>(() => {
    const sorted = [...this.legal.documents()].sort((a, b) => a.sortOrder - b.sortOrder);
    const byCategory = new Map<string, PublicLegalSectionSummaryDto[]>();

    for (const item of sorted) {
      const key = item.category || UNCATEGORIZED;
      const bucket = byCategory.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        byCategory.set(key, [item]);
      }
    }

    return [...byCategory.entries()].map(([category, items]) => ({ category, items }));
  });

  async ngOnInit(): Promise<void> {
    await this.legal.loadDocuments();
    this.applySeo();
  }

  protected itemTitle(item: PublicLegalSectionSummaryDto): string {
    return this.translation.language() === 'ar' && item.titleAr ? item.titleAr : item.titleEn;
  }

  private applySeo(): void {
    const pageTitle = this.translate.instant('LEGAL.LANDING.TITLE');
    const description = this.translate.instant('LEGAL.LANDING.SUBTITLE');

    this.title.setTitle(`${pageTitle} · HAMBOX`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    if (typeof window !== 'undefined') {
      this.meta.updateTag({ rel: 'canonical', href: window.location.href });
    }
  }
}
