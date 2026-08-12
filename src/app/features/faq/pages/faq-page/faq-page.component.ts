import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, Title, Meta } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AccordionModule } from 'primeng/accordion';
import { InputTextModule } from 'primeng/inputtext';

import { FaqPublicService } from '../../../../core/faq/faq-public.service';
import { PublicFaqDto } from '../../../../core/faq/faq-public.model';
import { resolveLocalizedText } from '../../../../core/i18n/localized-text.util';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { STOREFRONT_NAV_LINKS } from '../../../home/services/storefront-home-data';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    AccordionModule,
    InputTextModule,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  templateUrl: './faq-page.component.html',
  styleUrl: './faq-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent {
  private readonly faqService = inject(FaqPublicService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  protected readonly translation = inject(TranslationService);

  protected readonly navLinks = STOREFRONT_NAV_LINKS;

  protected readonly faqs = signal<readonly PublicFaqDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerm = signal('');
  protected readonly activeCategoryId = signal<string | 'all'>('all');

  protected readonly categories = computed(() => {
    const seen = new Map<string, { id: string; nameEn: string; nameAr: string | null }>();
    for (const faq of this.faqs()) {
      if (!seen.has(faq.categoryId)) {
        seen.set(faq.categoryId, { id: faq.categoryId, nameEn: faq.categoryNameEn, nameAr: faq.categoryNameAr });
      }
    }
    return [...seen.values()];
  });

  protected readonly filteredFaqs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const categoryId = this.activeCategoryId();
    const lang = this.translation.language();

    return this.faqs()
      .filter((faq) => categoryId === 'all' || faq.categoryId === categoryId)
      .filter((faq) => {
        if (!term) {
          return true;
        }
        const question = resolveLocalizedText(faq.questionEn, faq.questionAr, lang).toLowerCase();
        const answer = this.stripHtml(resolveLocalizedText(faq.answerEn, faq.answerAr, lang)).toLowerCase();
        return question.includes(term) || answer.includes(term);
      });
  });

  constructor() {
    this.title.setTitle('Frequently Asked Questions · HAMBOX');
    this.meta.updateTag({
      name: 'description',
      content: 'Answers to common questions about orders, delivery, payments, and your account.',
    });

    void this.loadFaqs();
  }

  protected questionFor(faq: PublicFaqDto): string {
    return resolveLocalizedText(faq.questionEn, faq.questionAr, this.translation.language());
  }

  protected sanitizedAnswerFor(faq: PublicFaqDto) {
    const answer = resolveLocalizedText(faq.answerEn, faq.answerAr, this.translation.language());
    return this.sanitizer.bypassSecurityTrustHtml(answer);
  }

  protected categoryLabel(category: { nameEn: string; nameAr: string | null }): string {
    return resolveLocalizedText(category.nameEn, category.nameAr, this.translation.language());
  }

  protected selectCategory(categoryId: string | 'all'): void {
    this.activeCategoryId.set(categoryId);
  }

  private async loadFaqs(): Promise<void> {
    this.loading.set(true);
    const items = await this.faqService.getPublished('Global');
    this.faqs.set([...items].sort((a, b) => a.sortOrder - b.sortOrder));
    this.loading.set(false);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ');
  }
}
