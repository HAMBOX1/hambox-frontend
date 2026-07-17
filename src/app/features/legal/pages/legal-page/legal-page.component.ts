import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { HamboxBottomSheetComponent } from '../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { STOREFRONT_NAV_LINKS } from '../../../home/services/storefront-home-data';
import { PublicLegalSectionSummaryDto } from '../../models/legal-section.model';
import { LegalService } from '../../services/legal.service';
import { estimateReadingTimeMinutes, extractTableOfContents, LegalTocEntry } from '../../utils/legal-content.util';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    HamboxBottomSheetComponent,
  ],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly legal = inject(LegalService);
  protected readonly translation = inject(TranslationService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_NAV_LINKS;
  protected readonly navItems = computed(() =>
    [...this.legal.documents()].filter((d) => d.showInNavigation).sort((a, b) => a.sortOrder - b.sortOrder),
  );
  protected readonly activeSlug = signal<string | null>(null);
  protected readonly activeItem = computed(() =>
    this.legal.documents().find((d) => d.slug === this.activeSlug()) ?? null,
  );
  protected readonly notFound = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly readingProgress = signal(0);

  protected readonly document = this.legal.activeDocument;
  protected readonly loading = this.legal.activeLoading;
  protected readonly error = this.legal.activeError;

  protected readonly docTitle = computed(() => {
    const doc = this.document();
    if (!doc) {
      return '';
    }
    return this.translation.language() === 'ar' && doc.titleAr ? doc.titleAr : doc.titleEn;
  });

  private readonly rawContent = computed(() => {
    const doc = this.document();
    if (!doc) {
      return '';
    }
    return this.translation.language() === 'ar' && doc.contentAr ? doc.contentAr : doc.contentEn;
  });

  private readonly processedContent = computed(() => extractTableOfContents(this.rawContent()));

  protected readonly toc = computed<readonly LegalTocEntry[]>(() => this.processedContent().toc);

  protected readonly sanitizedContent = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.processedContent().html),
  );

  protected readonly readingMinutes = computed(() => {
    const content = this.rawContent();
    return content ? estimateReadingTimeMinutes(content) : 0;
  });

  constructor() {
    // Component instance is reused across /legal/:slug sibling navigations — react to param changes.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');

      if (!slug) {
        this.notFound.set(true);
        this.activeSlug.set(null);
        this.applyNotFoundSeo();
        return;
      }

      this.notFound.set(false);
      this.activeSlug.set(slug);
      this.readingProgress.set(0);
      void this.legal.loadDocument(slug).then(() => {
        if (!this.legal.activeDocument()) {
          this.notFound.set(true);
          this.applyNotFoundSeo();
        } else {
          this.applySeo();
        }
      });
    });

    void this.legal.loadDocuments();
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    this.readingProgress.set(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0);
  }

  protected navLabel(item: PublicLegalSectionSummaryDto): string {
    return this.translation.language() === 'ar' && item.titleAr ? item.titleAr : item.titleEn;
  }

  protected isActive(item: PublicLegalSectionSummaryDto): boolean {
    return this.activeSlug() === item.slug;
  }

  protected scrollToHeading(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected navigateTo(item: PublicLegalSectionSummaryDto): void {
    this.closeMobileNav();
    void this.router.navigate(['/legal', item.slug]);
  }

  protected goToLandingPage(): void {
    void this.router.navigate(['/legal']);
  }

  private applySeo(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }

    const pageTitle = `${doc.seoTitle || this.docTitle()} · HAMBOX`;
    const description = doc.seoDescription || this.summarize(this.rawContent());

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: this.docTitle() });
    this.meta.updateTag({ property: 'og:description', content: description });
    if (typeof window !== 'undefined') {
      this.meta.updateTag({ rel: 'canonical', href: window.location.href });
    }
  }

  private applyNotFoundSeo(): void {
    this.title.setTitle(`${this.translate.instant('LEGAL.NOT_FOUND_TITLE')} · HAMBOX`);
  }

  private summarize(html: string): string {
    const text =
      (typeof DOMParser !== 'undefined'
        ? new DOMParser().parseFromString(html, 'text/html').body.textContent
        : html) ?? '';
    const trimmed = text.replace(/\s+/g, ' ').trim();
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
  }
}
