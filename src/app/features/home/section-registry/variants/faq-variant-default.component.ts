import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AccordionModule } from 'primeng/accordion';

import { PublicFaqDto } from '../../../../core/faq/faq-public.model';
import { resolveLocalizedText } from '../../../../core/i18n/localized-text.util';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { FaqSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

/** Renders nothing when the page has no FAQs for its scope — a Product/Category page with neither
 * its own FAQs nor any Global ones shouldn't show a big empty section (see CLAUDE.md's page-builder
 * requirement). Data always comes from `context().targetFaqs`, never from `config` — there is no
 * question/answer content stored in this section's JSON. */
@Component({
  selector: 'app-faq-variant-default',
  standalone: true,
  imports: [AccordionModule],
  template: `
    @if (context().targetFaqs; as faqs) {
      @if (faqs.length > 0) {
        <section class="faq-section" aria-label="Frequently asked questions">
          @if (config().sectionTitle) {
            <h2 class="faq-section__title">{{ config().sectionTitle }}</h2>
          }
          <p-accordion [multiple]="true" styleClass="faq-section__accordion">
            @for (faq of faqs; track faq.id) {
              <p-accordion-panel [value]="faq.id">
                <p-accordion-header>{{ questionFor(faq) }}</p-accordion-header>
                <p-accordion-content>
                  <div class="faq-section__answer" [innerHTML]="sanitizedAnswerFor(faq)"></div>
                </p-accordion-content>
              </p-accordion-panel>
            }
          </p-accordion>
        </section>
      }
    }
  `,
  styles: `
    .faq-section {
      padding: 0 16px 32px;
      max-width: 960px;
      margin: 0 auto;
    }
    .faq-section__title {
      margin: 0 0 16px;
      text-align: center;
    }
    .faq-section__answer {
      line-height: 1.6;
    }
    @media (prefers-reduced-motion: reduce) {
      :host ::ng-deep .p-accordioncontent,
      :host ::ng-deep .p-motion {
        transition: none !important;
        animation: none !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqVariantDefaultComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translation = inject(TranslationService);

  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<FaqSectionConfig>();

  protected questionFor(faq: PublicFaqDto): string {
    return resolveLocalizedText(faq.questionEn, faq.questionAr, this.translation.language());
  }

  protected sanitizedAnswerFor(faq: PublicFaqDto) {
    const answer = resolveLocalizedText(faq.answerEn, faq.answerAr, this.translation.language());
    return this.sanitizer.bypassSecurityTrustHtml(answer);
  }
}
