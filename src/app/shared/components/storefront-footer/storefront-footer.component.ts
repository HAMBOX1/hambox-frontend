import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { TranslationService } from '../../../core/i18n/translation.service';
import { StorefrontFooterContent } from '../../../features/home/models/storefront-content.model';
import { PublicLegalSectionSummaryDto } from '../../../features/legal/models/legal-section.model';
import { LegalService } from '../../../features/legal/services/legal.service';

@Component({
  selector: 'app-storefront-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './storefront-footer.component.html',
  styleUrl: './storefront-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontFooterComponent {
  private readonly legal = inject(LegalService);
  private readonly translation = inject(TranslationService);

  readonly footer = input<StorefrontFooterContent | null>(null);

  protected readonly legalLinks = computed(() =>
    [...this.legal.documents()].filter((d) => d.showInFooter).sort((a, b) => a.sortOrder - b.sortOrder),
  );

  constructor() {
    void this.legal.loadDocuments();
  }

  protected legalLinkTitle(item: PublicLegalSectionSummaryDto): string {
    return this.translation.language() === 'ar' && item.titleAr ? item.titleAr : item.titleEn;
  }

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly facebookIcon = 'assets/images/footer/facebook.svg';
  protected readonly telegramIcon = 'assets/images/footer/telegram.svg';

  protected readonly companyName = computed(() => this.footer()?.companyName || 'HAMBOX');
  protected readonly copyright = computed(
    () => this.footer()?.copyright || `© ${new Date().getFullYear()} HAMBOX. All rights reserved.`,
  );
  protected readonly supportEmail = computed(() => this.footer()?.supportEmail || '');
  protected readonly supportPhone = computed(() => this.footer()?.supportPhone || '');
  protected readonly address = computed(() => this.footer()?.address || '');
  protected readonly workingHours = computed(() => this.footer()?.workingHours || '');

  protected readonly socialLinks = computed(() => {
    const f = this.footer();
    if (!f) {
      return [];
    }

    return [
      { label: 'Facebook', url: f.facebookUrl, icon: this.facebookIcon },
      { label: 'Instagram', url: f.instagramUrl, icon: null },
      { label: 'X', url: f.xUrl, icon: null },
      { label: 'Discord', url: f.discordUrl, icon: null },
      { label: 'Telegram', url: f.telegramUrl, icon: this.telegramIcon },
      { label: 'YouTube', url: f.youTubeUrl, icon: null },
      { label: 'TikTok', url: f.tikTokUrl, icon: null },
    ].filter((link) => !!link.url);
  });

  protected readonly navigationLinks = [
    { label: 'Marketplace', route: '/products' },
    { label: 'Gift Cards', route: '/products' },
    { label: 'Subscriptions', route: '/products' },
  ] as const;
}
